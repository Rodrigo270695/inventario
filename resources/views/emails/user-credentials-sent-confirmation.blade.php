<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Confirmación de envío</title>
</head>
<body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.5; color: #1e293b; max-width: 560px; margin: 0 auto; padding: 24px;">
    <p>Hola <strong>{{ $actor->name }} {{ $actor->last_name }}</strong>,</p>
    <p>Confirmamos que se enviaron credenciales de acceso desde el panel de administración de <strong>{{ config('app.name') }}</strong>.</p>
    <ul style="padding-left: 1.25rem; margin: 16px 0;">
        <li><strong>Usuario afectado:</strong> {{ $targetUser->name }} {{ $targetUser->last_name }} (<code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">{{ $targetUser->usuario }}</code>)</li>
        <li><strong>Correo destino:</strong> {{ $sentToEmail }}</li>
        <li><strong>Fecha (servidor):</strong> {{ now()->timezone(config('app.timezone'))->format('d/m/Y H:i') }}</li>
    </ul>
    <p style="font-size: 13px; color: #64748b;">La contraseña temporal solo fue enviada al correo del usuario, no se incluye en este mensaje.</p>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 32px;">Mensaje automático de confirmación.</p>
</body>
</html>
