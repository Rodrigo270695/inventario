**SUPLEMENTO AL DOCUMENTO ERP v4.0**

**MÓDULO 16**

**ACTIVOS FIJOS NO TECNOLÓGICOS**

Mobiliario · Vehículos · Equipos de Oficina · Instalaciones · Maquinaria · Herramientas

Este documento amplía el ERP Parque Informático para cubrir el ciclo de vida completo

de cualquier activo físico de la empresa — no solo los tecnológicos.

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Tablas nuevas</strong></p>
<p><strong>7 (total: 59)</strong></p></td>
<td><p><strong>Módulo</strong></p>
<p><strong>M16</strong></p></td>
<td><p><strong>Integra con</strong></p>
<p><strong>M04 M05 M10 M11 M13</strong></p></td>
<td><p><strong>Rol nuevo</strong></p>
<p><strong>admin_activos_fijos</strong></p></td>
</tr>
</tbody>
</table>

> **16. MÓDULO DE ACTIVOS FIJOS NO TECNOLÓGICOS**
>
> ★ NUEVO MÓDULO Módulo agregado para gestionar el ciclo de vida completo de mobiliario, equipos de oficina, vehículos, instalaciones y cualquier activo físico que no sea de naturaleza tecnológica/informática.
>
> **16.1 Diferencias Clave vs Activos Tecnológicos**

|                          |                                          |                                                          |
|--------------------------|------------------------------------------|----------------------------------------------------------|
| **Característica**       | **Activos TI (módulos 1–15)**            | **Activos Fijos No TI (módulo 16)**                      |
| Agente de hardware       | Sí — PowerShell/Python en la PC          | No aplica — sin software instalable                      |
| Componentes instalables  | Sí — RAM, SSD, GPU, etc.                 | No aplica — no tienen componentes intercambiables        |
| Detección de software    | Sí — agente detecta instalaciones        | No aplica                                                |
| Reparación técnica       | Ticket técnico con diagnóstico HW        | Orden de servicio genérica (taller, plomero, carpintero) |
| Depreciación             | Métodos acelerados (tecnología obsoleta) | Línea recta principalmente (mobiliario: 10 años)         |
| Seguimiento de ubicación | IP + hostname + agente                   | Solo registro manual de oficina/almacén                  |
| Licencias de software    | Sí — Windows, Office, etc.               | No aplica                                                |
| Código QR / etiqueta     | QR con datos técnicos                    | QR con código interno + descripción básica               |
| Inventario físico        | Agente automático + conteo físico        | Solo conteo físico periódico                             |

> **16.2 Categorías de Activos No Tecnológicos**

|                                   |                                                                       |                      |                               |
|-----------------------------------|-----------------------------------------------------------------------|----------------------|-------------------------------|
| **Categoría**                     | **Ejemplos**                                                          | **Vida útil típica** | **Método depreciación**       |
| Mobiliario de oficina             | Escritorios, sillas, estantes, archivadores, mesas de reunión         | 10 años              | Línea recta                   |
| Equipos de oficina                | Fotocopiadoras, destructoras, dispensadores, cafeteras                | 5 años               | Línea recta                   |
| Vehículos                         | Autos, camionetas, motocicletas de mensajería                         | 5 años               | Línea recta o Suma de dígitos |
| Instalaciones y mejoras           | Divisiones de drywall, cielos rasos, pisos flotantes, pintura         | 10 años              | Línea recta                   |
| Maquinaria y equipos              | Generadores, UPS industriales, aires acondicionados, planta eléctrica | 8 años               | Línea recta                   |
| Equipos de seguridad              | Cámaras CCTV, controles de acceso, alarmas, cercas eléctricas         | 5 años               | Línea recta                   |
| Equipos médicos/primeros auxilios | Botiquines industriales, camillas, desfibriladores                    | Según norma          | Línea recta                   |
| Herramientas y útiles             | Taladros, martillos, escaleras, carretillas                           | 3 años               | Línea recta                   |

> **16.3 Tablas de Base de Datos — DDL Completo**

**▸ fixed_asset_categories — Categorías configurables**

> CREATE TABLE fixed_asset_categories (
>
> id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
>
> name VARCHAR(150) NOT NULL, -- 'Mobiliario de Oficina'
>
> code VARCHAR(30) NOT NULL UNIQUE, -- 'MOB', 'VEH', 'INST'
>
> icon VARCHAR(50), -- nombre del ícono en Lucide React
>
> default_useful_life_years INTEGER DEFAULT 10,
>
> default_depreciation_method VARCHAR(30) DEFAULT 'straight_line'
>
> CHECK (default_depreciation_method IN ('straight_line','sum_of_years')),
>
> default_residual_value_pct NUMERIC(5,2) DEFAULT 10.00,
>
> requires_insurance BOOLEAN DEFAULT FALSE,
>
> requires_soat BOOLEAN DEFAULT FALSE, -- solo para vehículos
>
> is_active BOOLEAN DEFAULT TRUE,
>
> created_at TIMESTAMPTZ DEFAULT NOW(),
>
> updated_at TIMESTAMPTZ DEFAULT NOW()
>
> );

**▸ fixed_assets — Tabla principal**

> CREATE TABLE fixed_assets (
>
> id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
>
> code VARCHAR(80) NOT NULL UNIQUE, -- AF-LIM-MOB-0042
>
> name VARCHAR(200) NOT NULL, -- 'Escritorio ejecutivo madera'
>
> description TEXT,
>
> category_id UUID NOT NULL REFERENCES fixed_asset_categories(id),
>
> brand VARCHAR(100), -- sin tabla separada: demasiado variado
>
> model VARCHAR(150),
>
> serial_number VARCHAR(200) UNIQUE, -- si lo tiene
>
> color VARCHAR(60),
>
> dimensions VARCHAR(100), -- '180cm x 80cm x 75cm'
>
> material VARCHAR(100), -- 'Madera MDF + vidrio'
>
> zonal_id UUID NOT NULL REFERENCES zonals(id),
>
> -- FK explícitas de ubicación (mismo patrón que assets tecnológicos)
>
> warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT,
>
> office_id UUID REFERENCES offices(id) ON DELETE RESTRICT,
>
> location_type VARCHAR(30), -- 'office'\|'warehouse'\|'user'\|'external'
>
> location_note VARCHAR(200), -- 'Piso 3, cubículo 12-B'
>
> CONSTRAINT chk_fa_location CHECK (
>
> (location_type='warehouse' AND warehouse_id IS NOT NULL AND office_id IS NULL) OR
>
> (location_type='office' AND office_id IS NOT NULL AND warehouse_id IS NULL) OR
>
> (location_type IN ('user','external') AND warehouse_id IS NULL AND office_id IS NULL) OR
>
> (location_type IS NULL)
>
> ),
>
> status VARCHAR(30) NOT NULL DEFAULT 'stored'
>
> CHECK (status IN ('active','stored','in_repair','in_transit','disposed','sold')),
>
> condition VARCHAR(30) NOT NULL DEFAULT 'new'
>
> CHECK (condition IN ('new','good','regular','damaged','obsolete')),
>
> acquisition_date DATE,
>
> acquisition_value NUMERIC(14,2),
>
> current_value NUMERIC(14,2),
>
> residual_value NUMERIC(14,2) DEFAULT 0,
>
> useful_life_years INTEGER,
>
> depreciation_method VARCHAR(30) DEFAULT 'straight_line',
>
> -- Documentos adjuntos
>
> purchase_item_id UUID REFERENCES purchase_items(id), -- vinculado a OC
>
> insurance_policy VARCHAR(150),
>
> insurance_expiry DATE,
>
> soat_expiry DATE, -- solo vehículos
>
> technical_review_expiry DATE, -- revisión técnica vehículos
>
> specs JSONB, -- atributos específicos de la categoría
>
> notes TEXT,
>
> photos JSONB, -- \[{url, caption, taken_at}\]
>
> created_at TIMESTAMPTZ DEFAULT NOW(),
>
> updated_at TIMESTAMPTZ DEFAULT NOW(),
>
> deleted_at TIMESTAMPTZ NULL
>
> );
>
> CREATE INDEX idx_fa_zonal_status ON fixed_assets(zonal_id, status) WHERE deleted_at IS NULL;
>
> CREATE INDEX idx_fa_category ON fixed_assets(category_id) WHERE deleted_at IS NULL;
>
> CREATE INDEX idx_fa_insurance ON fixed_assets(insurance_expiry) WHERE insurance_expiry IS NOT NULL;
>
> CREATE INDEX idx_fa_soat ON fixed_assets(soat_expiry) WHERE soat_expiry IS NOT NULL;
>
> CREATE INDEX idx_fa_fts ON fixed_assets USING GIN(
>
> to_tsvector('spanish', coalesce(code,'') \|\| ' ' \|\| coalesce(name,'') \|\| ' ' \|\| coalesce(serial_number,'')));

**▸ fixed_asset_assignments — Asignaciones a usuarios o áreas**

> CREATE TABLE fixed_asset_assignments (
>
> id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
>
> fixed_asset_id UUID NOT NULL REFERENCES fixed_assets(id),
>
> -- Asignado a usuario O a departamento (nunca ambos)
>
> user_id UUID REFERENCES users(id),
>
> department_id UUID REFERENCES departments(id),
>
> CONSTRAINT chk_faa_assignee CHECK (
>
> (user_id IS NOT NULL AND department_id IS NULL) OR
>
> (department_id IS NOT NULL AND user_id IS NULL)
>
> ),
>
> assigned_by UUID NOT NULL REFERENCES users(id),
>
> assigned_at TIMESTAMPTZ DEFAULT NOW(),
>
> returned_at TIMESTAMPTZ,
>
> return_reason VARCHAR(300),
>
> condition_out VARCHAR(30), -- condición al asignar
>
> condition_in VARCHAR(30), -- condición al devolver
>
> notes TEXT
>
> );
>
> CREATE INDEX idx_faa_active ON fixed_asset_assignments(fixed_asset_id)
>
> WHERE returned_at IS NULL;

**▸ fixed_asset_service_orders — Órdenes de servicio (reparación/mantenimiento)**

> -- Reemplaza el concepto de 'repair_ticket' para activos no TI
>
> CREATE TABLE fixed_asset_service_orders (
>
> id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
>
> code VARCHAR(80) NOT NULL UNIQUE, -- OS-LIM-2025-0021
>
> fixed_asset_id UUID NOT NULL REFERENCES fixed_assets(id),
>
> type VARCHAR(30) NOT NULL
>
> CHECK (type IN ('corrective','preventive','installation','inspection')),
>
> status VARCHAR(30) NOT NULL DEFAULT 'open'
>
> CHECK (status IN ('open','in_progress','waiting_parts','completed','cancelled')),
>
> description TEXT NOT NULL,
>
> -- Proveedor externo (carpintero, técnico AC, mecánico, etc.)
>
> provider_name VARCHAR(200),
>
> provider_contact VARCHAR(100),
>
> provider_ruc VARCHAR(20),
>
> -- Costos
>
> estimated_cost NUMERIC(12,2),
>
> actual_cost NUMERIC(12,2),
>
> -- Fechas
>
> scheduled_date DATE,
>
> started_at TIMESTAMPTZ,
>
> completed_at TIMESTAMPTZ,
>
> -- Responsables
>
> requested_by UUID NOT NULL REFERENCES users(id),
>
> approved_by UUID REFERENCES users(id),
>
> -- Resultado
>
> findings TEXT,
>
> solution TEXT,
>
> invoice_number VARCHAR(100),
>
> invoice_pdf_url TEXT,
>
> created_at TIMESTAMPTZ DEFAULT NOW(),
>
> updated_at TIMESTAMPTZ DEFAULT NOW(),
>
> deleted_at TIMESTAMPTZ NULL
>
> );

**▸ fixed_asset_depreciation_entries — Depreciación mensual**

> CREATE TABLE fixed_asset_depreciation_entries (
>
> id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
>
> fixed_asset_id UUID NOT NULL REFERENCES fixed_assets(id),
>
> period CHAR(7) NOT NULL, -- '2025-06'
>
> method VARCHAR(30) NOT NULL,
>
> amount NUMERIC(14,2) NOT NULL,
>
> book_value_before NUMERIC(14,2) NOT NULL,
>
> book_value_after NUMERIC(14,2) NOT NULL,
>
> calculated_at TIMESTAMPTZ DEFAULT NOW(),
>
> approved_by UUID REFERENCES users(id),
>
> UNIQUE (fixed_asset_id, period)
>
> );
>
> **16.4 Resumen de Tablas del Módulo**

|        |                                  |                                                                                           |
|--------|----------------------------------|-------------------------------------------------------------------------------------------|
| **\#** | **Tabla**                        | **Descripción**                                                                           |
| 53     | fixed_asset_categories           | Categorías configurables: mobiliario, vehículos, equipos, instalaciones, herramientas     |
| 54     | fixed_assets                     | Activo fijo no tecnológico con ubicación (FK explícitas), estado, condición, depreciación |
| 55     | fixed_asset_assignments          | Historial de asignaciones a usuarios o departamentos con condición de entrada/salida      |
| 56     | fixed_asset_service_orders       | Órdenes de servicio: reparaciones y mantenimientos con proveedor externo y costos         |
| 57     | fixed_asset_depreciation_entries | Registro mensual de depreciación con flujo de aprobación del contador                     |
| 58     | fixed_asset_inventory_counts     | Conteos físicos periódicos de activos fijos                                               |
| 59     | fixed_asset_inventory_items      | Ítems verificados en el conteo con diferencias detectadas                                 |

> ℹ Las tablas 53–59 se suman a las 52 del sistema tecnológico, llevando el total a 59 tablas. El módulo reutiliza las tablas zonals, offices, warehouses, departments, users, purchase_items y audit_logs del sistema base.
>
> **16.5 Alertas Automáticas del Módulo**

|                                  |                                                                                   |                                         |                                      |
|----------------------------------|-----------------------------------------------------------------------------------|-----------------------------------------|--------------------------------------|
| **Tipo de Alerta**               | **Trigger**                                                                       | **Destinatario**                        | **Prioridad**                        |
| Seguro por vencer                | Cron diario: insurance_expiry \<= hoy + 30 días                                   | Jefe Administrativo / Jefe TI del zonal | Alta — sin seguro = riesgo legal     |
| SOAT por vencer                  | Cron diario: soat_expiry \<= hoy + 30 días                                        | Responsable de flota / Admin Zonal      | Alta — multa de tránsito             |
| Revisión técnica vencida         | Cron diario: technical_review_expiry \< hoy                                       | Responsable de flota                    | Crítica — prohibición de circulación |
| Activo sin asignación            | Semanal: fixed_assets con status=active Y sin registro en fixed_asset_assignments | Jefe TI / Admin Zonal                   | Media — posible pérdida              |
| Mantenimiento preventivo vencido | Cron diario: service_orders scheduled_date vencidas                               | Responsable del activo                  | Media                                |
| Garantía por vencer              | Cron diario: specs-\>\>'warranty_until' \<= hoy + 60 días (si aplica)             | Jefe Administrativo                     | Baja                                 |

> **16.6 Flujo Completo — Ciclo de Vida de un Activo Fijo**

|                   |                                                                                        |                                                               |
|-------------------|----------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **Fase**          | **Acción**                                                                             | **Sistema**                                                   |
| 1\. Compra        | Jefe Adm. crea OC en el módulo de Compras (reutiliza M04) con los ítems de mobiliario  | OC vinculada a la misma tabla purchase_orders del sistema     |
| 2\. Recepción     | Almacenero recibe el activo, registra condición, genera código AF-{ZONAL}-{CAT}-{SEQ}  | Sistema genera UUID, código interno y QR imprimible           |
| 3\. Asignación    | Jefe Adm. asigna el activo a un usuario o departamento con office/piso/cubículo        | Crea fixed_asset_assignment, actualiza location_type='office' |
| 4\. Mantenimiento | Cuando requiere reparación: crear service_order con proveedor, costo estimado, fecha   | Flujo: open → in_progress → completed. Registra en audit_log  |
| 5\. Traslado      | Reutiliza M05 (traslados). Los activos fijos se pueden incluir en un transfer_items    | transfer_items acepta fixed_asset_id además de asset_id       |
| 6\. Depreciación  | Job mensual calcula la depreciación según método y vida útil. Contador aprueba.        | Actualiza current_value. Exporta a Excel para contabilidad    |
| 7\. Baja          | Jefe Adm. solicita baja con motivo. Aprueba. Si hay venta: registrar comprador y monto | Mismo flujo que M10. Revoca asignaciones activas              |
| 8\. Inventario    | Conteo físico periódico (anual o semestral). Reconciliación de diferencias             | Módulo de inventario físico con QR scanner opcional           |

> **16.7 Frontend — Módulos React**

|                     |                               |                                                                                                                                                  |
|---------------------|-------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| **Módulo**          | **Página Inertia**            | **Funcionalidades**                                                                                                                              |
| Catálogo AF         | FixedAssets/Index             | Tabla virtualizada, filtros por categoría/zonal/estado/condición, búsqueda por nombre/código/serial. Importación CSV.                            |
| Ficha de activo     | FixedAssets/Show              | Tabs: Datos generales / Fotos / Historial asignaciones / Órdenes de servicio / Depreciación / QR. Mapa de ubicación (piso + cubículo).           |
| Asignación          | FixedAssets/Assign            | Buscar usuario o departamento. Registrar condición de entrega. Firma digital opcional (canvas HTML5).                                            |
| Órdenes de servicio | ServiceOrders/Index + Show    | Kanban por estado, registro de proveedor y costos, adjunto de factura PDF.                                                                       |
| Depreciación AF     | FixedAssetDepreciation/Report | Tabla de valor actual por activo con % depreciado. Filtro por categoría y período. Exportar Excel.                                               |
| Reportes AF         | FixedAssetReports/\*          | Inventario por categoría/zonal/estado, activos asignados por usuario/área, próximos vencimientos (seguro/SOAT/revisión técnica), TCO por activo. |

> **16.8 Integración con el Sistema Tecnológico**

|                              |                                                                                                                                               |
|------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **Punto de integración**     | **Descripción**                                                                                                                               |
| Módulo de Compras (M04)      | Los activos fijos se compran a través del mismo flujo de OC → Factura → Stock Entry. Solo cambia el tipo de activo que se genera al ingresar. |
| Módulo de Traslados (M05)    | La tabla transfer_items acepta fixed_asset_id (nullable) además de asset_id. Un traslado puede incluir activos TI y no TI en el mismo acta.   |
| Módulo de Bajas (M10)        | El mismo flujo de aprobación de baja aplica para activos fijos. La lógica difiere en que no hay licencias que revocar.                        |
| Módulo de Alertas (M11)      | Las reglas de alerta de seguro/SOAT/revisión técnica se configuran en la misma tabla alert_rules con tipos nuevos.                            |
| Módulo de Depreciación (M13) | Comparte el mismo Job mensual y flujo de aprobación del Contador. Las entradas van a fixed_asset_depreciation_entries.                        |
| Auditoría                    | El AuditObserver se registra también para FixedAsset, FixedAssetAssignment, FixedAssetServiceOrder. Todo queda en audit_logs.                 |
| Roles y permisos             | Se agrega el rol 'admin_activos_fijos' con permisos sobre el módulo. Los roles existentes (super_admin, auditor, contador) también acceden.   |

> **16.9 Rol Adicional: Administrador de Activos Fijos**

|                         |                         |                 |              |             |
|-------------------------|-------------------------|-----------------|--------------|-------------|
| **Permiso**             | **admin_activos_fijos** | **super_admin** | **contador** | **auditor** |
| Ver activos fijos       | ✓ su zonal              | ✓ global        | ✓ global     | ✓ global    |
| Crear / editar AF       | ✓ su zonal              | ✓               | ✗            | ✗           |
| Asignar AF              | ✓ su zonal              | ✓               | ✗            | ✗           |
| Dar de baja AF          | ✓ su zonal              | ✓               | ✗            | ✗           |
| Gestionar órd. servicio | ✓ su zonal              | ✓               | ✗            | ✗           |
| Ver depreciación AF     | ✓ su zonal              | ✓               | ✓ global     | ✓ global    |
| Aprobar depreciación AF | ✗                       | ✓               | ✓ global     | ✗           |
| Exportar reportes AF    | ✓ su zonal              | ✓               | ✓ global     | ✓ global    |

**FIN DE LA SECCIÓN 16 — ACTIVOS FIJOS NO TECNOLÓGICOS**

Este módulo eleva el total a 59 tablas de BD y cubre el 100% del ciclo de vida de cualquier activo físico de la empresa.
