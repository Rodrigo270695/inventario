<?php

namespace App\Jobs;

use App\Mail\PurchaseOrderNotificationMail;
use App\Models\PurchaseOrder;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendPurchaseOrderMinorResultEmailJob implements ShouldQueue
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
                'minorRejectedByUser:id,name,last_name,usuario,email',
                'minorObservedByUser:id,name,last_name,usuario,email',
            ])
            ->find($this->purchaseOrderId);

        if (! $order || ! $order->requestedByUser?->email) {
            return;
        }

        $actorUser = match ($this->action) {
            'approved' => $order->minorApprovedByUser,
            'rejected' => $order->minorRejectedByUser,
            'observed' => $order->minorObservedByUser,
            default => null,
        };

        $notes = match ($this->action) {
            'observed' => $order->minor_observation_notes,
            default => $order->observation_notes,
        };

        $subject = match ($this->action) {
            'approved' => 'MACGA | OC '.($order->code ?? '').' | Aprobada en zonal',
            'rejected' => 'MACGA | OC '.($order->code ?? '').' | Rechazada en zonal',
            'observed' => 'MACGA | OC '.($order->code ?? '').' | Observación zonal',
            default => 'MACGA | OC '.($order->code ?? '').' | Actualización zonal',
        };

        $mailable = new PurchaseOrderNotificationMail(
            $order,
            'emails.purchase-order-minor-result',
            $subject,
            [
                'detailUrl' => route('admin.purchase-orders.show', $order),
                'action' => $this->action,
                'actorUser' => $actorUser,
                'notes' => $notes ?? '',
            ]
        );

        Mail::to($order->requestedByUser->email)->send($mailable);
    }
}
