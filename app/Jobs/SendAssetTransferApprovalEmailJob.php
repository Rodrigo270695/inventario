<?php

namespace App\Jobs;

use App\Mail\AssetTransferApprovedMail;
use App\Models\AssetTransfer;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendAssetTransferApprovalEmailJob implements ShouldQueue
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
                'approvedByUser:id,name,last_name,usuario,email',
                'items.asset.model.brand:id,name',
                'items.asset.category:id,name,code',
                'items.component.type:id,name,code',
                'items.component.brand:id,name',
            ])
            ->find($this->transferId);

        if (! $transfer || $transfer->status !== 'approved') {
            return;
        }

        $recipient = $transfer->sentByUser?->email;

        if (! is_string($recipient) || trim($recipient) === '') {
            return;
        }

        Mail::to($recipient)->send(
            new AssetTransferApprovedMail(
                $transfer,
                route('admin.asset-transfers.show', $transfer)
            )
        );
    }
}
