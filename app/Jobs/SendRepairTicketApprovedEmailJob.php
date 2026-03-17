<?php

namespace App\Jobs;

use App\Mail\RepairTicketApprovedMail;
use App\Models\RepairTicket;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendRepairTicketApprovedEmailJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $ticketId
    ) {
    }

    public function handle(): void
    {
        $ticket = RepairTicket::query()
            ->with([
                'asset.category:id,name,code',
                'asset.model.brand:id,name',
                'asset.warehouse.office.zonal',
                'component.type:id,name,code',
                'component.brand:id,name',
                'component.warehouse.office.zonal',
                'warehouse.office.zonal',
                'repairShop:id,name',
                'openedByUser:id,name,last_name,usuario,email',
                'technician:id,name,last_name,usuario,email',
                'approvedByUser:id,name,last_name,usuario,email',
            ])
            ->find($this->ticketId);

        if (! $ticket || $ticket->status !== 'approved') {
            return;
        }

        $recipients = collect([
            $ticket->openedByUser?->email,
            $ticket->technician?->email,
            $ticket->approvedByUser?->email,
        ])
            ->filter(function ($email) {
                if (! is_string($email)) {
                    return false;
                }

                $email = trim($email);

                if ($email === '' || ! str_contains($email, '@')) {
                    return false;
                }

                if (str_ends_with($email, '.local')) {
                    return false;
                }

                return true;
            })
            ->unique()
            ->values()
            ->all();

        if ($recipients === []) {
            return;
        }

        Mail::to(config('mail.from.address'))
            ->bcc($recipients)
            ->send(
                new RepairTicketApprovedMail(
                    $ticket,
                    route('admin.repair-tickets.config', ['repair_ticket' => $ticket->id, 'tab' => 'general'])
                )
            );
    }
}

