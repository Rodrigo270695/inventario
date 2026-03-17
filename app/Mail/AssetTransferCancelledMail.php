<?php

namespace App\Mail;

use App\Models\AssetTransfer;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AssetTransferCancelledMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public AssetTransfer $transfer,
        public string $detailUrl
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'MACGA | Traslado '.$this->transfer->code.' | Cancelado'
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.asset-transfer-cancelled'
        );
    }
}
