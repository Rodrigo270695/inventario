<?php

namespace App\Jobs;

use App\Mail\PurchaseOrderNotificationMail;
use App\Models\PurchaseOrder;
use App\Services\PurchaseOrderFlowNotifier;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendPurchaseOrderMinorPendingEmailJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $purchaseOrderId
    ) {}

    public function handle(): void
    {
        $order = PurchaseOrder::query()
            ->with([
                'supplier:id,name,ruc',
                'office.zonal:id,name,code',
                'requestedByUser:id,name,last_name,usuario,email',
                'items' => fn ($q) => $q->orderBy('id')->with([
                    'assetCategory:id,name,code',
                    'assetSubcategory:id,name',
                    'assetBrand:id,name',
                ]),
            ])
            ->find($this->purchaseOrderId);

        if (! $order || $order->status !== 'pending_minor') {
            return;
        }

        // No notificar al solicitante (requested_by): no recibe este correo ni la notificación in-app de pendiente zonal.
        $recipients = PurchaseOrderFlowNotifier::filterDeliverableEmails(
            PurchaseOrderFlowNotifier::recipientsForZonal('purchase_orders.minor_approve', $order)
                ->filter(fn ($u) => $u->id !== $order->requested_by && $u->email)
                ->pluck('email')
                ->all()
        );

        if ($recipients === []) {
            return;
        }

        $subject = 'MACGA | OC '.($order->code ?? '').' | Pendiente aprobación zonal';
        $templateData = ['detailUrl' => route('admin.purchase-orders.show', $order)];

        // Un envío por destinatario (TO): varios SMTP descartan o no entregan bien BCC masivo.
        foreach ($recipients as $email) {
            Mail::to($email)->send(
                new PurchaseOrderNotificationMail(
                    $order,
                    'emails.purchase-order-pending-minor',
                    $subject,
                    $templateData
                )
            );
        }
    }
}
