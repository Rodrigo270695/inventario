<?php

namespace App\Jobs;

use App\Mail\RepairTicketPendingApprovalMail;
use App\Models\RepairTicket;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendRepairTicketPendingApprovalEmailJob implements ShouldQueue
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
                'repairShop:id,name',
                'openedByUser:id,name,last_name,usuario,email',
                'technician:id,name,last_name,usuario,email',
            ])
            ->find($this->ticketId);

        if (! $ticket || $ticket->status !== 'pending_approval') {
            return;
        }

        $recipients = User::query()
            ->where('is_active', true)
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->get(['id', 'name', 'last_name', 'usuario', 'email'])
            ->filter(fn (User $user) => $user->hasPermissionTo('repair_tickets.approve'))
            ->pluck('email')
            ->merge([$ticket->technician?->email])
            ->filter(function ($email) {
                if (! is_string($email)) {
                    return false;
                }

                $email = trim($email);

                if ($email === '' || ! str_contains($email, '@')) {
                    return false;
                }

                // Ignorar correos de dominios ficticios/locales que rompen el SMTP
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
                new RepairTicketPendingApprovalMail(
                    $ticket,
                    route('admin.repair-tickets.config', ['repair_ticket' => $ticket->id, 'tab' => 'general'])
                )
            );
    }
}

