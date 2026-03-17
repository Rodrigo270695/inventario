<?php

namespace App\Jobs;

use App\Mail\AssetTransferPendingApprovalMail;
use App\Models\AssetTransfer;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendAssetTransferPendingApprovalEmailJob implements ShouldQueue
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
                'items.asset.model.brand:id,name',
                'items.asset.category:id,name,code',
                'items.component.type:id,name,code',
                'items.component.brand:id,name',
            ])
            ->find($this->transferId);

        if (! $transfer || $transfer->status !== 'pending_approval') {
            return;
        }

        $recipients = User::query()
            ->where('is_active', true)
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->get(['id', 'name', 'last_name', 'usuario', 'email'])
            ->filter(fn (User $user) => $user->hasPermissionTo('asset_transfers.approve') || $user->hasPermissionTo('asset_transfers.cancel'))
            ->pluck('email')
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($recipients === []) {
            return;
        }

        Mail::to(config('mail.from.address'))
            ->bcc($recipients)
            ->send(
            new AssetTransferPendingApprovalMail(
                $transfer,
                route('admin.asset-transfers.show', $transfer)
            )
        );
    }
}
