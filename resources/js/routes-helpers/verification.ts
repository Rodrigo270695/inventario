export function send(): string {
  // Ruta POST para reenviar el correo de verificación (Fortify: verification.send)
  return '/email/verification-notification';
}

