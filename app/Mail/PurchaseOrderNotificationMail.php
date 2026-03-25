<?php

namespace App\Mail;

use App\Models\PurchaseOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PurchaseOrderNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Datos extra para la vista (no usar el nombre $viewData: reservado en {@see Mailable}).
     *
     * @param  array<string, mixed>  $templateData
     */
    public function __construct(
        public PurchaseOrder $purchaseOrder,
        public string $bladeView,
        public string $subjectLine,
        public array $templateData = []
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->subjectLine
        );
    }

    public function content(): Content
    {
        return new Content(
            view: $this->bladeView,
            with: array_merge([
                'order' => $this->purchaseOrder,
                'detailUrl' => $this->templateData['detailUrl'] ?? route('admin.purchase-orders.show', $this->purchaseOrder),
            ], $this->templateData)
        );
    }
}
