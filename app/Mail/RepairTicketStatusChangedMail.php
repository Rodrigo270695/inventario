<?php

namespace App\Mail;

use App\Models\RepairTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RepairTicketStatusChangedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public RepairTicket $ticket,
        public string $status,
        public ?string $comment,
        public string $detailUrl
    ) {
    }

    public function envelope(): Envelope
    {
        $statusLabels = [
            'rejected' => 'Rechazado',
            'cancelled' => 'Cancelado',
            'diagnosed' => 'Diagnosticado',
            'in_progress' => 'En proceso',
            'completed' => 'Completado',
        ];

        $label = $statusLabels[$this->status] ?? $this->status;

        return new Envelope(
            subject: 'MACGA | Ticket '.$this->ticket->code.' | '.$label
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.repair-ticket-status-changed'
        );
    }
}

