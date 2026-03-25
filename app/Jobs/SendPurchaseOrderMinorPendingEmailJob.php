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
            ])
            ->find($this->purchaseOrderId);

        if (! $order || $order->status !== 'pending_minor') {
            return;
        }

        $recipients = PurchaseOrderFlowNotifier::recipientsForZonal('purchase_orders.minor_approve', $order)
            ->filter(fn ($u) => $u->id !== $order->requested_by && $u->email)
            ->pluck('email')
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($recipients === []) {
            return;
        }

        $mailable = new PurchaseOrderNotificationMail(
            $order,
            'emails.purchase-order-pending-minor',
            'MACGA | OC '.($order->code ?? '').' | Pendiente aprobación zonal',
            ['detailUrl' => route('admin.purchase-orders.show', $order)]
        );

        Mail::to(config('mail.from.address'))
            ->bcc($recipients)
            ->send($mailable);
    }
}
