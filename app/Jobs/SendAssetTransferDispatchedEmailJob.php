<?php

namespace App\Jobs;

use App\Mail\AssetTransferDispatchedMail;
use App\Models\AssetTransfer;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendAssetTransferDispatchedEmailJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $transferId
    ) {
    }

    public function handle(): void
    {
        $transfer = AssetTransfer::query()
            ->with([
                'originWarehouse.office.zonal',
                'destinationWarehouse.office.zonal',
                'sentByUser:id,name,last_name,usuario,email',
                'receivedByUser:id,name,last_name,usuario,email',
                'approvedByUser:id,name,last_name,usuario,email',
                'items.asset.model.brand:id,name',
                'items.asset.category:id,name,code',
                'items.component.type:id,name,code',
                'items.component.brand:id,name',
            ])
            ->find($this->transferId);

        if (! $transfer || $transfer->status !== 'in_transit') {
            return;
        }

        $recipients = collect([
            $transfer->receivedByUser?->email,
            $transfer->approvedByUser?->email,
        ])
            ->filter(fn ($email) => is_string($email) && trim($email) !== '')
            ->unique()
            ->values()
            ->all();

        if ($recipients === []) {
            return;
        }

        Mail::to(config('mail.from.address'))
            ->bcc($recipients)
            ->send(
            new AssetTransferDispatchedMail(
                $transfer,
                route('admin.asset-transfers.show', $transfer)
            )
        );
    }
}
