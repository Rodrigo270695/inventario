<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class UserCredentialsSentConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $actor,
        public User $targetUser,
        public string $sentToEmail,
        public bool $isNewUser = false
    ) {}

    public function envelope(): Envelope
    {
        $app = config('app.name', 'Sistema');

        return new Envelope(
            subject: $app.' | Confirmación: credenciales enviadas',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.user-credentials-sent-confirmation',
        );
    }
}
