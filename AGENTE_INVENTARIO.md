# Agente de inventario de PCs

Documento de diseño y uso del **agente de captura de hardware**.  
Complementa [ERP_Tablas_Campos_BD.md](./ERP_Tablas_Campos_BD.md) y [README.md](./README.md).

---

## 1. Objetivo

Tener un **programa/script instalable en cada PC o laptop** que:

1. Lea datos reales del equipo (MAC, discos, hostname, serial BIOS, IP, RAM, CPU, etc.).
2. Los envíe al ERP por API.
3. Queden guardados como **historial** (`agent_reports`) y actualicen la **ficha actual** del activo (`asset_computers`).

Así el inventario tecnológico deja de depender solo de carga manual y se acerca a la realidad del parque de equipos.

---

## 2. Idea en una frase

> El agente corre en la PC → captura hardware → autentica con token → `POST /api/agent/reports` → el ERP guarda el snapshot y actualiza datos del activo.

---

## 3. Qué ya existe en el sistema (hoy)

| Pieza | Estado | Dónde |
|-------|--------|--------|
| Tabla `agent_reports` | Lista | Migración + modelo `AgentReport` |
| Tabla `agent_tokens` | Lista | Migración + modelo `AgentToken` |
| Tabla `api_key_logs` | Lista | Log de cada llamada del agente |
| Tabla `asset_computers` | Lista | hostname, MAC, IP, BIOS, `last_seen_at` |
| API `POST /api/agent/reports` | Lista | `routes/agent.php` |
| Auth por token | Lista | Middleware `AuthenticateAgentToken` |
| UI Auditoría (reportes + tokens) | Lista | `/admin/audit` |
| Script/programa del agente | **No existe** | Hay que crearlo |
| Actualizar `asset_computers` al recibir reporte | **No existe** | Hay que implementarlo en el backend |
| Alertas `no_agent_report` / `hw_discrepancy` | Solo esquema | Documentadas; lógica pendiente |
| Software detectado (`software_installations`) | Solo esquema | Fase posterior |

**Conclusión:** el ERP ya puede **recibir** reportes. Falta el **cliente** (agente) y el **procesamiento** que vuelque el payload a `asset_computers` (y luego alertas/software).

---

## 4. Arquitectura

```
┌─────────────────────┐         HTTPS + Token          ┌──────────────────────────┐
│  PC / Laptop        │ ─────────────────────────────► │  Laravel ERP             │
│  (Agente)           │   POST /api/agent/reports      │                          │
│                     │                                │  1. Valida token         │
│  - Lee WMI/CIM      │                                │  2. Guarda agent_reports │
│  - Arma JSON        │                                │  3. Upsert asset_computers│
│  - Envía payload    │                                │  4. (futuro) alertas     │
└─────────────────────┘                                └──────────────────────────┘
         │                                                        │
         │ config local                                           │
         ▼                                                        ▼
  agent.config.json                                      Auditoría → ver reportes
  (url, token, asset_id)                                 Activo → ficha PC actualizada
```

### Roles

| Componente | Responsabilidad |
|------------|-----------------|
| **Agente** | Solo captura y envía. No crea activos. No decide inventario contable. |
| **ERP** | Autentica, valida, guarda historial, actualiza ficha del activo, alerta. |
| **Admin TI** | Crea token, asocia PC ↔ `asset_id`, despliega agente, revisa reportes. |

---

## 5. Tecnología del agente (decisión)

### Elección principal: **Python 3**

Código del agente (fuera de Laravel):

`D:\Programacion\Python\inventario-agente`

| Criterio | Por qué Python |
|----------|----------------|
| JSON | Nativo y claro para armar el `payload` |
| HTTP | `urllib` (stdlib; sin dependencias obligatorias) |
| Windows | PowerShell/CIM vía `subprocess` |
| Empaquetado | `PyInstaller` → `.exe` sin instalar Python en cada PC |
| Mantenimiento | Un solo código legible para el equipo |

### Alternativa válida: **PowerShell**

Útil si el 100 % del parque es Windows y se quiere **cero dependencias** (solo Task Scheduler + script `.ps1`).  
Se puede usar como **v1 rápida** o como backend interno que Python invoca.

### Recomendación de fases

1. **Fase A:** script Python + config JSON (desarrollo / prueba manual).
2. **Fase B:** empaquetar a `InventarioAgente.exe` + Task Scheduler (producción Windows).
3. **Fase C (opcional):** variante PowerShell pura o soporte Linux/macOS.

**No** se recomienda un servicio web en la PC ni un agente con GUI compleja al inicio: debe ser ligero, silencioso y programable.

---

## 6. Identificación PC ↔ activo

El agente **debe conocer** el `asset_id` (UUID del activo en el ERP).

### Opción recomendada (v1)

Archivo de configuración local en la PC:

```json
{
  "api_base_url": "https://inventario.tudominio.com",
  "token": "UUID-DEL-TOKEN|secreto-en-claro",
  "asset_id": "uuid-del-activo",
  "report_interval_hours": 24,
  "is_full_snapshot": true
}
```

Flujo operativo:

1. En el ERP se crea/registra el activo (código, marca, modelo, etc.).
2. En ficha del activo (o al desplegar) se copia el `asset_id`.
3. Se instala el agente con ese `asset_id` y un token válido.
4. El agente siempre reporta contra ese activo.

### Opciones futuras (no v1)

| Método | Idea | Complejidad |
|--------|------|-------------|
| Auto-registro por `bios_serial` / MAC | El agente manda serial; el ERP busca o crea vínculo | Media-alta |
| Código de activo en config | El agente manda `TEX-00000055` y el ERP resuelve UUID | Baja-media |
| QR / enrollment web | TI escanea y genera config | Media |

Para empezar: **config con `asset_id` explícito** (simple y seguro).

---

## 7. API (contrato actual)

### Endpoint

```http
POST /api/agent/reports
Content-Type: application/json
Authorization: Bearer {token_id}|{secreto}
```

También acepta cabecera: `X-Agent-Token: {token_id}|{secreto}`

Prefijo real: `/api/agent` (ver `bootstrap/app.php` + `routes/agent.php`).

### Body (validación actual)

| Campo | Obligatorio | Tipo | Notas |
|-------|-------------|------|--------|
| `asset_id` | Sí | UUID | Debe existir en `assets` |
| `payload` | Sí | objeto JSON | Máx. ~2000 claves (validación Laravel) |
| `reported_at` | No | datetime | Si no va, usa `now()` en servidor |
| `is_full_snapshot` | No | boolean | Default `true` |

### Respuesta esperada

- `201` → reporte creado (`id`, mensaje).
- `401` → token ausente, inválido o caducado.
- `403` → IP no está en whitelist del token.
- `422` → validación (`asset_id` / `payload`).
- Throttle: **120 req/min** por IP (middleware actual).

### Ejemplo mínimo

```http
POST /api/agent/reports
Authorization: Bearer 11111111-1111-1111-1111-111111111111|mi-secreto-largo
Content-Type: application/json

{
  "asset_id": "22222222-2222-2222-2222-222222222222",
  "is_full_snapshot": true,
  "payload": {
    "agent_version": "1.0.0",
    "hostname": "PC-OFICINA-12",
    "bios_serial": "PF3XXXXX",
    "ip_address": "192.168.10.45",
    "mac_address": "A4:C3:F0:12:34:56",
    "collected_at": "2026-08-03T15:00:00-05:00"
  }
}
```

---

## 8. Estructura del `payload` (estándar propuesto)

Hoy el backend acepta **cualquier objeto** en `payload`.  
Para que el ERP pueda actualizar `asset_computers` y mostrar datos útiles, **fijamos este esquema**.

### 8.1 Campos de identidad (obligatorios en práctica)

Estos deben mapearse a `asset_computers`:

| Clave payload | Destino | Ejemplo |
|---------------|---------|---------|
| `hostname` | `asset_computers.hostname` | `PC-OFICINA-12` |
| `bios_serial` | `asset_computers.bios_serial` | `PF3XXXXX` |
| `ip_address` | `asset_computers.ip_address` | `192.168.10.45` |
| `mac_address` | `asset_computers.mac_address` | `A4:C3:F0:12:34:56` |

Al procesar el reporte, el servidor debe setear `last_seen_at = reported_at` (o `now()`).

### 8.2 Esquema completo sugerido (v1)

```json
{
  "agent_version": "1.0.0",
  "os": {
    "name": "Windows",
    "version": "10.0.26100",
    "build": "26100",
    "architecture": "x64"
  },
  "hostname": "PC-OFICINA-12",
  "bios_serial": "PF3XXXXX",
  "manufacturer": "LENOVO",
  "model": "ThinkPad T14",
  "ip_address": "192.168.10.45",
  "mac_address": "A4:C3:F0:12:34:56",
  "network_adapters": [
    {
      "name": "Ethernet",
      "mac": "A4:C3:F0:12:34:56",
      "ips": ["192.168.10.45"],
      "is_primary": true
    }
  ],
  "cpu": {
    "name": "Intel(R) Core(TM) i5-1135G7",
    "cores": 4,
    "logical_processors": 8
  },
  "memory": {
    "total_gb": 16,
    "modules": [
      { "capacity_gb": 8, "speed_mhz": 3200, "manufacturer": "Samsung" }
    ]
  },
  "disks": [
    {
      "model": "Samsung SSD 980 512GB",
      "serial": "S64NXXXX",
      "interface": "NVMe",
      "size_gb": 512,
      "media_type": "SSD"
    }
  ],
  "volumes": [
    {
      "letter": "C:",
      "filesystem": "NTFS",
      "size_gb": 475,
      "free_gb": 120
    }
  ],
  "collected_at": "2026-08-03T15:00:00-05:00"
}
```

### 8.3 Qué captura el agente en Windows (fuentes)

| Dato | Fuente típica |
|------|----------------|
| Hostname | `hostname` / `COMPUTERNAME` |
| Serial BIOS / System | WMI `Win32_BIOS.SerialNumber` / `Win32_ComputerSystemProduct` |
| Fabricante / modelo | `Win32_ComputerSystem` |
| MAC / IP | adaptadores activos (excluir virtuales cuando se pueda) |
| CPU | `Win32_Processor` |
| RAM | `Win32_PhysicalMemory` + total |
| Discos | `Win32_DiskDrive` |
| Volúmenes | `Win32_LogicalDisk` |
| SO | `Win32_OperatingSystem` |

Reglas de captura:

- Preferir la **MAC e IP del adaptador físico principal** (cableado o Wi‑Fi en uso), no adapters Docker/Hyper-V.
- Normalizar MAC a mayúsculas con `:` (`AA:BB:CC:DD:EE:FF`).
- No enviar contraseñas, usuarios locales, historial de navegación ni archivos.
- No escanear contenido de discos; solo metadatos de hardware/volumen.

### 8.4 Fase posterior: software

Cuando se active `software_installations`:

```json
{
  "software": [
    { "name": "Microsoft Office", "version": "16.0", "publisher": "Microsoft" },
    { "name": "Google Chrome", "version": "126.0", "publisher": "Google" }
  ]
}
```

Eso no es v1 del agente.

---

## 9. Tokens: cómo se usan

### Crear token

1. Ir a **Auditoría** en el panel (`/admin/audit`, pestaña Tokens).
2. Crear token (nombre, caducidad opcional, whitelist de IP opcional).
3. Copiar el valor **una sola vez**: `{id}|{secreto}`.
4. Guardarlo en `agent.config.json` o en variable de entorno del agente (**no** en git).

### Seguridad

| Medida | Detalle |
|--------|---------|
| Hash | En BD solo se guarda `token_hash` (nunca el secreto en claro). |
| Whitelist IP | Si se define, solo esas IPs pueden reportar. |
| Caducidad | Opcional; al vencer → 401. |
| Rotación | Revocar token viejo y crear uno nuevo al rotar. |
| Scope | Un token puede usarse en muchas PCs; o crear uno por oficina/zonal. |
| Logs | Cada llamada queda en `api_key_logs`. |

**Recomendación operativa:** un token por **oficina o despliegue**, no un token global eterno sin whitelist si el ERP es público en Internet.

---

## 10. Cómo lo vamos a usar (día a día)

### Alta de un equipo nuevo

1. Registrar el activo en el ERP (compra/ingreso/carga de inventario).
2. Abrir ficha del activo y copiar `asset_id` (UUID).
3. Generar o reutilizar un token de agente.
4. Instalar el agente en la PC con `api_base_url`, `token`, `asset_id`.
5. Ejecutar una vez a mano y verificar en **Auditoría → Reportes**.
6. Verificar que `asset_computers` tenga hostname/MAC/IP/`last_seen_at`.

### Operación continua

- Task Scheduler (Windows) ejecuta el agente cada **24 h** (o al inicio de sesión + diario).
- Si la PC no reporta en N días → alerta `no_agent_report` (cuando se implemente).
- Si cambia disco/RAM/MAC respecto al último snapshot → alerta `hw_discrepancy` (cuando se implemente).

### Revisión

| Dónde | Qué mirar |
|-------|-----------|
| Auditoría → Reportes | Historial de snapshots (`payload` resumido) |
| Ficha del activo → datos PC | Último hostname, MAC, IP, visto |
| Logs de API key | Errores 401/403, abuso |

---

## 11. Qué hay que implementar (plan de trabajo)

### Fase 1 — Backend: procesar reporte (ERP)

Al guardar en `AgentReportController@store` (o un Action/Service):

1. Crear `agent_reports` (ya se hace).
2. `updateOrCreate` en `asset_computers` con:
   - `hostname`, `bios_serial`, `ip_address`, `mac_address` desde `payload`
   - `last_seen_at` = `reported_at`
3. Validar/normalizar claves conocidas del payload (sin romper payloads parciales).
4. (Opcional) endpoint de health: `GET /api/agent/ping` autenticado.

### Fase 2 — Agente Python v1

Proyecto en `D:\Programacion\Python\inventario-agente` (fuera de Laravel):

```text
inventario-agente/
  README.md
  inventario_agente.py      (entrypoint)
  collector_windows.py      (captura WMI/CIM)
  api_client.py             (POST con token)
  agent.config.example.json
  requirements.txt
  build_exe.ps1             (PyInstaller)
```

Comportamiento:

1. Leer config.
2. Capturar hardware.
3. Armar payload estándar.
4. POST al ERP.
5. Log local simple (`agent.log`) con éxito/error (sin imprimir el token completo).
6. Exit code 0/1 para Task Scheduler.

### Fase 3 — Empaquetado e instalación

- Generar `InventarioAgente.exe`.
- Instalar en `C:\Program Files\InventarioAgente\` (o carpeta TI).
- Config en `C:\ProgramData\InventarioAgente\agent.config.json`.
- Tarea programada: diario, usuario SYSTEM o cuenta de servicio, con red.

### Fase 4 — Alertas y software (después)

- Job: activos con `asset_computers.last_seen_at` viejo → `no_agent_report`.
- Comparar último vs penúltimo payload → `hw_discrepancy`.
- Inventario de software instalado → `software_installations` + `license_violation`.

---

## 12. Cómo lo voy a hacer (enfoque técnico concreto)

Cuando se autorice la implementación, el orden será:

1. **Definir y documentar** el esquema de payload (este archivo es la fuente).
2. **Backend:** servicio `ProcessAgentReport` que, tras crear el reporte, actualice `asset_computers`.
3. **Tests Feature:** reporte con payload completo actualiza ficha PC; payload parcial no borra datos previos (solo pisa claves presentes).
4. **Agente Python:** colector Windows + cliente HTTP + config de ejemplo.
5. **Prueba manual** contra entorno local (`php artisan serve` o URL real).
6. **Empaquetado** a `.exe` y guía de Task Scheduler.
7. Solo después: alertas y software.

Principios:

- El agente **no escribe en BD** directo; solo API.
- El agente **no crea activos**.
- Fallos de red no deben romper la PC; reintento simple (1–2 veces) y log.
- Cambios de esquema del payload serán versionados con `agent_version`.

---

## 13. Ejemplo de uso del agente (operador)

```bash
# 1) Copiar config
copy agent.config.example.json agent.config.json
# Editar url, token, asset_id

# 2) Probar
python inventario_agente.py

# 3) Ver resultado en el ERP
# Auditoría → Reportes
```

Ejemplo de tarea programada (conceptual):

```text
Programa: C:\Program Files\InventarioAgente\InventarioAgente.exe
Argumentos: --config "C:\ProgramData\InventarioAgente\agent.config.json"
Desencadenador: Diario 08:00
```

---

## 14. Relación con el modelo de datos ERP

| Tabla | Uso con el agente |
|-------|-------------------|
| `assets` | Activo al que pertenece la PC (`asset_id`) |
| `asset_computers` | Estado actual de red/identidad + `hardware_snapshot` (detalle para Datos de PC) |
| `agent_reports` | Historial de snapshots (JSON completo) |
| `agent_tokens` | Credenciales del agente |
| `api_key_logs` | Auditoría de llamadas API |
| `software_installations` | Futuro: software detectado |
| `alert_rules` / `alert_events` | Futuro: `no_agent_report`, `hw_discrepancy` |
| `computer_components` | No lo llena el agente automáticamente en v1 (componentes de inventario siguen siendo gestión manual/ERP) |

Nota: el agente **documenta** hardware detectado en el payload; no reemplaza el módulo de **componentes** inventariados (`components` / `computer_components`) salvo que más adelante se defina un flujo de conciliación.

---

## 15. Límites y no-objetivos (v1)

El agente v1 **no**:

- Instala ni desinstala software.
- Toma control remoto de la PC.
- Reemplaza antivirus / MDM / Active Directory.
- Hace conteo físico de almacén.
- Deprecia activos ni toca contabilidad.
- Envía capturas de pantalla ni archivos de usuario.

Solo: **inventario técnico de hardware (+ identidad de red) reportado al ERP**.

---

## 16. Checklist de aceptación

- [ ] Token creado desde Auditoría y usado en Bearer.
- [ ] `POST /api/agent/reports` responde 201 con payload de prueba.
- [ ] Aparece fila en `agent_reports` y en UI de Auditoría.
- [ ] Se actualiza `asset_computers` (hostname, MAC, IP, BIOS, `last_seen_at`).
- [ ] Agente Python captura datos reales en una PC Windows de prueba.
- [ ] Ejecución programada diaria sin intervención.
- [ ] Token no aparece en logs ni en repositorio.
- [ ] Documentación de instalación para TI lista (en `agent/README.md` cuando exista el código).

---

## 17. Resumen ejecutivo

| Pregunta | Respuesta |
|----------|-----------|
| ¿Qué es? | Programa en la PC que reporta hardware al ERP |
| ¿Para qué? | Mantener inventario tecnológico actualizado (MAC, discos, etc.) |
| ¿Qué usamos? | Python 3 (+ WMI/CIM), API Laravel ya existente, tokens en Auditoría |
| ¿Cómo se usa? | Config con `asset_id` + token → Task Scheduler diario → revisar en Auditoría / ficha del activo |
| ¿Qué falta? | Cliente agente + procesamiento que actualice `asset_computers` (+ alertas luego) |
| ¿Qué ya hay? | API, tablas, tokens, UI de reportes |

Cuando se decida implementar, este documento es la guía de trabajo: **mismo contrato de API**, **mismo esquema de payload**, **mismo flujo de tokens**.
`)
