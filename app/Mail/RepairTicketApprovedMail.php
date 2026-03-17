<?php

namespace App\Mail;

use App\Models\RepairTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RepairTicketApprovedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public RepairTicket $ticket,
        public string $detailUrl
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'MACGA | Ticket '.$this->ticket->code.' | Aprobado'
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.repair-ticket-approved'
        );
    }
}

