<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Credenciales</title>
</head>
<body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.5; color: #1e293b; max-width: 560px; margin: 0 auto; padding: 24px;">
    <p>Hola <strong>{{ $user->name }} {{ $user->last_name }}</strong>,</p>
    <p>Se han generado credenciales de acceso para el sistema <strong>{{ config('app.name') }}</strong>.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px;">
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><strong>Usuario (login)</strong></td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-family: ui-monospace, monospace;">{{ $user->usuario }}</td>
        </tr>
        <tr>
            <td style="padding: 12px 16px;"><strong>Contraseña temporal</strong></td>
            <td style="padding: 12px 16px; font-family: ui-monospace, monospace; word-break: break-all;">{{ $temporaryPassword }}</td>
        </tr>
    </table>
    <p>
        <a href="{{ $loginUrl }}" style="display: inline-block; background: #0f172a; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600;">Iniciar sesión</a>
    </p>
    <p style="font-size: 13px; color: #64748b;">Por seguridad, cambia tu contraseña después del primer acceso (si la opción está disponible en tu perfil).</p>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 32px;">Este mensaje es automático; no respondas a este correo.</p>
</body>
</html>
