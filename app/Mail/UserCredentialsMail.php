<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class UserCredentialsMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $temporaryPassword,
        public string $loginUrl
    ) {}

    public function envelope(): Envelope
    {
        $app = config('app.name', 'Sistema');

        return new Envelope(
            subject: $app.' | Tus credenciales de acceso',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.user-credentials',
        );
    }
}
