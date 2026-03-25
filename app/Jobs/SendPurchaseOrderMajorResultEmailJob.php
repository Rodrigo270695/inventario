<?php

namespace App\Jobs;

use App\Mail\PurchaseOrderNotificationMail;
use App\Models\PurchaseOrder;
use App\Services\PurchaseOrderFlowNotifier;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendPurchaseOrderMajorResultEmailJob implements ShouldQueue
{
    use Queueable;

    /**
     * @param  'approved'|'rejected'|'observed'  $action
     */
    public function __construct(
        public string $purchaseOrderId,
        public string $action
    ) {}

    public function handle(): void
    {
        $order = PurchaseOrder::query()
            ->with([
                'supplier:id,name,ruc',
                'office.zonal:id,name,code',
                'requestedByUser:id,name,last_name,usuario,email',
                'minorApprovedByUser:id,name,last_name,usuario,email',
                'approvedByUser:id,name,last_name,usuario,email',
                'rejectedByUser:id,name,last_name,usuario,email',
                'observedByUser:id,name,last_name,usuario,email',
                'items' => fn ($q) => $q->orderBy('id')->with([
                    'assetCategory:id,name,code',
                    'assetSubcategory:id,name',
                    'assetBrand:id,name',
                ]),
            ])
            ->find($this->purchaseOrderId);

        if (! $order) {
            return;
        }

        $actorUser = match ($this->action) {
            'approved' => $order->approvedByUser,
            'rejected' => $order->rejectedByUser,
            'observed' => $order->observedByUser,
            default => null,
        };

        $notes = $order->observation_notes;

        $subject = match ($this->action) {
            'approved' => 'MACGA | OC '.($order->code ?? '').' | Aprobada (general)',
            'rejected' => 'MACGA | OC '.($order->code ?? '').' | Rechazada (general)',
            'observed' => 'MACGA | OC '.($order->code ?? '').' | Observación general',
            default => 'MACGA | OC '.($order->code ?? '').' | Actualización general',
        };

        $emails = PurchaseOrderFlowNotifier::filterDeliverableEmails(
            collect([
                $order->requestedByUser?->email,
                $order->minor_approved_by ? $order->minorApprovedByUser?->email : null,
            ])->all()
        );

        foreach ($emails as $email) {
            Mail::to($email)->send(
                new PurchaseOrderNotificationMail(
                    $order,
                    'emails.purchase-order-major-result',
                    $subject,
                    [
                        'detailUrl' => route('admin.purchase-orders.show', $order),
                        'action' => $this->action,
                        'actorUser' => $actorUser,
                        'notes' => $notes ?? '',
                    ]
                )
            );
        }
    }
}
