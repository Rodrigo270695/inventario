# Guia completa: Supervisor + Cron en tu VPS (Laravel)

Objetivo: dejar tu servidor automatizado para que **no ejecutes comandos manualmente**.

Esta guia configura:

- Worker de cola permanente con `Supervisor` (`queue:work`).
- Scheduler de Laravel con `cron` (`schedule:run` cada minuto).
- Ejecucion automatica de tus comandos ya programados en `routes/console.php`:
  - `app:run-depreciation`
  - `app:check-service-alerts`
  - `app:check-depreciation-alerts`

## 0) Lo validado en tu proyecto

Ya revisado en tu codigo:

- `QUEUE_CONNECTION=database` en `.env`.
- Existen tablas/migracion para `jobs`, `job_batches`, `failed_jobs`.
- Tus tareas ya tienen horario en scheduler:
  - `app:run-depreciation` -> mensual (`monthlyOn(1, '00:30')`)
  - `app:check-service-alerts` -> diario (`dailyAt('01:00')`)
  - `app:check-depreciation-alerts` -> diario (`dailyAt('02:00')`)

Conclusion: **Supervisor** para colas + **cron** para scheduler es exactamente lo correcto.

---

## 1) Regla importante sobre la ruta del proyecto

- Para `php artisan ...`, si no usas ruta absoluta, debes estar en la carpeta del proyecto.
- En esta guia evitamos errores de ruta con:
  - `cd /ruta/proyecto && php artisan ...`, o
  - `php /ruta/proyecto/artisan ...`

---

## 2) Variables base (ajusta solo una vez)

Ejecuta esto como `root` en tu VPS:

```bash
APP_DIR="/var/www/inventario"
APP_USER="www-data"
PHP_BIN="$(which php)"
```

Validacion rapida:

```bash
echo "$APP_DIR"
echo "$APP_USER"
echo "$PHP_BIN"
ls -la "$APP_DIR"
```

Si el comando anterior falla en `ls`, corrige `APP_DIR` antes de seguir.

---

## 3) Instalar y levantar Supervisor

```bash
sudo apt update
sudo apt install -y supervisor
sudo systemctl enable supervisor
sudo systemctl start supervisor
sudo systemctl status supervisor
```

Nota: el comando correcto es `systemctl enable supervisor`, no `enable supervisor`.

---

## 4) Preparar Laravel para colas (database)

Ejecuta:

```bash
cd "$APP_DIR"
$PHP_BIN artisan migrate --force
$PHP_BIN artisan optimize
```

Si quieres probar colas manualmente (solo test rapido):

```bash
$PHP_BIN artisan queue:work database --once
```

---

## 5) Crear archivo de Supervisor (worker)

### Opcion recomendada (copiar/pegar con `tee`)

```bash
sudo tee /etc/supervisor/conf.d/laravel-worker.conf > /dev/null <<EOF
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=$PHP_BIN $APP_DIR/artisan queue:work database --queue=default --sleep=3 --tries=3 --timeout=90 --max-time=3600 --memory=256
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=$APP_USER
numprocs=2
redirect_stderr=true
stdout_logfile=$APP_DIR/storage/logs/worker.log
stopwaitsecs=3600
directory=$APP_DIR
EOF
```

### Opcion alternativa (editor manual)

```bash
sudo nano /etc/supervisor/conf.d/laravel-worker.conf
```

Pega el mismo contenido, guarda con `Ctrl + O`, Enter, y sal con `Ctrl + X`.

---

## 6) Activar el worker en Supervisor

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start laravel-worker:*
sudo supervisorctl status
```

Debe aparecer algo como `laravel-worker:laravel-worker_00 RUNNING`.

Logs del worker:

```bash
tail -f "$APP_DIR/storage/logs/worker.log"
```

---

## 7) Crear cron para el scheduler de Laravel

El scheduler debe correr cada minuto:

```bash
* * * * * cd /var/www/inventario && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
```

### Crear/editar crontab del usuario web

```bash
sudo crontab -u www-data -e
```

Pega la linea (ajusta ruta/PHP si cambia), guarda y cierra.

### Verificar que se guardo

```bash
sudo crontab -u www-data -l
```

---

## 8) Verificar que TODO quedo automatizado

### Ver tareas detectadas por Laravel

```bash
cd "$APP_DIR"
$PHP_BIN artisan schedule:list
```

### Ejecutar scheduler una vez (prueba manual)

```bash
$PHP_BIN artisan schedule:run -v
```

### Revisar logs

```bash
tail -f "$APP_DIR/storage/logs/laravel.log"
```

### Revisar estado del supervisor

```bash
sudo supervisorctl status
```

---

## 9) Operacion diaria (post deploy)

Cuando publiques cambios:

```bash
cd "$APP_DIR"
$PHP_BIN artisan migrate --force
$PHP_BIN artisan optimize
$PHP_BIN artisan queue:restart
sudo supervisorctl restart laravel-worker:*
```

Comandos utiles:

```bash
sudo supervisorctl status
sudo supervisorctl stop laravel-worker:*
sudo supervisorctl start laravel-worker:*
sudo supervisorctl restart laravel-worker:*
sudo supervisorctl reread
sudo supervisorctl update
```

---

## 10) Solo si quieres ejecutar manualmente tus comandos

Normalmente no hace falta porque ya estan en scheduler. Manual seria:

```bash
cd "$APP_DIR"
$PHP_BIN artisan app:run-depreciation --period=2026-03
$PHP_BIN artisan app:check-depreciation-alerts
$PHP_BIN artisan app:check-service-alerts
```

---

## 11) Checklist final rapido

- `supervisor` activo: `sudo systemctl status supervisor`
- Worker arriba: `sudo supervisorctl status`
- Cron cargado: `sudo crontab -u www-data -l`
- Scheduler detecta tareas: `php artisan schedule:list`
- Logs sin errores criticos: `storage/logs/laravel.log`

Si estos 5 puntos estan ok, ya quedas automatizado y no dependes de ejecucion manual.

---

## 12) Monitoreo en vivo de cron (para usar en el futuro)

Si quieres ver en tiempo real cuando `cron` ejecuta tareas:

```bash
sudo journalctl -u cron -f
```

- `-u cron`: filtra solo logs del servicio cron.
- `-f`: modo seguimiento en vivo.
- Salir: `Ctrl + C`.

Si quieres ver solo ejecuciones del usuario `www-data`:

```bash
sudo journalctl -u cron -f | grep www-data
```

Y en otra terminal puedes revisar salida de tus comandos de alertas:

```bash
tail -f /var/www/inventario/storage/logs/cron-alerts.log
```

Con ambas terminales abiertas confirmas:

- que cron si dispara el comando (`CMD` en journal),
- y que el comando realmente se ejecuta (salida en `cron-alerts.log`).

