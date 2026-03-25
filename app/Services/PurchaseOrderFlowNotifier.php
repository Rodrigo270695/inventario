<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\PurchaseOrder;
use App\Models\User;
use App\Models\Zonal;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PurchaseOrderFlowNotifier
{
    public const TYPE_MINOR_PENDING = 'purchase_order_minor_pending';

    public const TYPE_MAJOR_PENDING = 'purchase_order_major_pending';

    public const TYPE_MINOR_OBSERVATION = 'purchase_order_minor_observation';

    public const TYPE_MINOR_PASSED = 'purchase_order_minor_passed';

    public const TYPE_MINOR_REJECTED = 'purchase_order_minor_rejected';

    public const TYPE_MAJOR_OUTCOME = 'purchase_order_major_outcome';

    public static function userCanActOnZonal(User $user, string $zonalId): bool
    {
        if ($user->hasRole('superadmin', 'web')) {
            return true;
        }

        if ($user->zonals()->where('zonals.id', $zonalId)->exists()) {
            return true;
        }

        return Zonal::query()->whereKey($zonalId)->where('manager_id', $user->id)->exists();
    }

    /**
     * Usuarios activos con el permiso indicado y el zonal de la oficina de la OC asignado en user_zonals.
     *
     * @return Collection<int, User>
     */
    public static function recipientsForZonal(string $permission, PurchaseOrder $purchaseOrder): Collection
    {
        $zonalId = $purchaseOrder->office?->zonal_id;
        if (! $zonalId) {
            return collect();
        }

        return User::query()
            ->where('is_active', true)
            ->whereHas('zonals', fn ($q) => $q->where('zonals.id', $zonalId))
            ->get()
            ->filter(fn (User $u) => $u->hasPermissionTo($permission))
            ->values();
    }

    public static function deleteNotificationsForPurchaseOrder(string $purchaseOrderId, array $types): void
    {
        Notification::query()
            ->whereIn('type', $types)
            ->where('data->purchase_order_id', $purchaseOrderId)
            ->delete();
    }

    public static function notifyMinorPending(PurchaseOrder $purchaseOrder): void
    {
        $purchaseOrder->loadMissing(['office.zonal', 'supplier', 'requestedByUser']);

        self::deleteNotificationsForPurchaseOrder($purchaseOrder->id, [
            self::TYPE_MINOR_PENDING,
            self::TYPE_MAJOR_PENDING,
            self::TYPE_MINOR_OBSERVATION,
            self::TYPE_MINOR_PASSED,
            self::TYPE_MINOR_REJECTED,
            self::TYPE_MAJOR_OUTCOME,
        ]);

        $recipients = self::recipientsForZonal('purchase_orders.minor_approve', $purchaseOrder);
        $detailUrl = route('admin.purchase-orders.show', $purchaseOrder);

        foreach ($recipients as $user) {
            if ($user->id === $purchaseOrder->requested_by) {
                continue;
            }
            Notification::create([
                'user_id' => $user->id,
                'type' => self::TYPE_MINOR_PENDING,
                'data' => [
                    'title' => 'OC pendiente (aprobación zonal)',
                    'message' => sprintf(
                        'La orden %s requiere su aprobación zonal.',
                        $purchaseOrder->code ? '#'.$purchaseOrder->code : 'de compra'
                    ),
                    'purchase_order_id' => $purchaseOrder->id,
                    'purchase_order_code' => $purchaseOrder->code,
                    'href' => $detailUrl,
                ],
                'read_at' => null,
            ]);
        }
    }

    public static function onMinorApproved(PurchaseOrder $purchaseOrder): void
    {
        $purchaseOrder->loadMissing([
            'office.zonal',
            'supplier',
            'requestedByUser',
            'minorApprovedByUser',
        ]);

        self::deleteNotificationsForPurchaseOrder($purchaseOrder->id, [
            self::TYPE_MINOR_PENDING,
            self::TYPE_MINOR_OBSERVATION,
        ]);

        $detailUrl = route('admin.purchase-orders.show', $purchaseOrder);

        $creator = $purchaseOrder->requestedByUser;
        if ($creator) {
            Notification::create([
                'user_id' => $creator->id,
                'type' => self::TYPE_MINOR_PASSED,
                'data' => [
                    'title' => 'OC aprobada en zonal',
                    'message' => sprintf(
                        'Su orden %s fue aprobada en nivel zonal y está en espera de aprobación general.',
                        $purchaseOrder->code ? '#'.$purchaseOrder->code : 'de compra'
                    ),
                    'purchase_order_id' => $purchaseOrder->id,
                    'purchase_order_code' => $purchaseOrder->code,
                    'href' => $detailUrl,
                ],
                'read_at' => null,
            ]);
        }

        $majorRecipients = self::recipientsForZonal('purchase_orders.approve', $purchaseOrder);
        foreach ($majorRecipients as $user) {
            if ($user->id === $purchaseOrder->requested_by) {
                continue;
            }
            Notification::create([
                'user_id' => $user->id,
                'type' => self::TYPE_MAJOR_PENDING,
                'data' => [
                    'title' => 'OC pendiente (aprobación general)',
                    'message' => sprintf(
                        'La orden %s fue aprobada en zonal y requiere aprobación general.',
                        $purchaseOrder->code ? '#'.$purchaseOrder->code : 'de compra'
                    ),
                    'purchase_order_id' => $purchaseOrder->id,
                    'purchase_order_code' => $purchaseOrder->code,
                    'href' => $detailUrl,
                ],
                'read_at' => null,
            ]);
        }
    }

    public static function onMinorRejected(PurchaseOrder $purchaseOrder): void
    {
        self::deleteNotificationsForPurchaseOrder($purchaseOrder->id, [
            self::TYPE_MINOR_PENDING,
            self::TYPE_MAJOR_PENDING,
            self::TYPE_MINOR_OBSERVATION,
        ]);

        $purchaseOrder->loadMissing(['requestedByUser']);
        $creator = $purchaseOrder->requestedByUser;
        if (! $creator) {
            return;
        }

        Notification::create([
            'user_id' => $creator->id,
            'type' => self::TYPE_MINOR_REJECTED,
            'data' => [
                'title' => 'OC rechazada en zonal',
                'message' => sprintf(
                    'Su orden %s fue rechazada en nivel zonal.',
                    $purchaseOrder->code ? '#'.$purchaseOrder->code : 'de compra'
                ),
                'purchase_order_id' => $purchaseOrder->id,
                'purchase_order_code' => $purchaseOrder->code,
                'href' => route('admin.purchase-orders.show', $purchaseOrder),
            ],
            'read_at' => null,
        ]);
    }

    public static function onMinorObserved(PurchaseOrder $purchaseOrder): void
    {
        self::deleteNotificationsForPurchaseOrder($purchaseOrder->id, [
            self::TYPE_MINOR_PENDING,
            self::TYPE_MAJOR_PENDING,
        ]);

        $purchaseOrder->loadMissing(['requestedByUser']);
        $creator = $purchaseOrder->requestedByUser;
        if (! $creator) {
            return;
        }

        Notification::create([
            'user_id' => $creator->id,
            'type' => self::TYPE_MINOR_OBSERVATION,
            'data' => [
                'title' => 'OC con observación (zonal)',
                'message' => sprintf(
                    'La orden %s tiene observaciones en nivel zonal.',
                    $purchaseOrder->code ? '#'.$purchaseOrder->code : 'de compra'
                ),
                'purchase_order_id' => $purchaseOrder->id,
                'purchase_order_code' => $purchaseOrder->code,
                'href' => route('admin.purchase-orders.show', $purchaseOrder),
            ],
            'read_at' => null,
        ]);
    }

    public static function onMajorResolved(PurchaseOrder $purchaseOrder): void
    {
        self::deleteNotificationsForPurchaseOrder($purchaseOrder->id, [
            self::TYPE_MAJOR_PENDING,
        ]);
    }

    /**
     * Notificación in-app tras aprobación / rechazo / observación general (para creador y quien aprobó en zonal).
     */
    public static function notifyMajorOutcome(PurchaseOrder $purchaseOrder, string $statusLabel): void
    {
        self::onMajorResolved($purchaseOrder);

        $purchaseOrder->loadMissing(['requestedByUser', 'minorApprovedByUser', 'approvedByUser', 'rejectedByUser', 'observedByUser']);

        $detailUrl = route('admin.purchase-orders.show', $purchaseOrder);
        $message = sprintf(
            'La orden %s tiene un nuevo estado: %s.',
            $purchaseOrder->code ? '#'.$purchaseOrder->code : 'de compra',
            $statusLabel
        );

        $recipientIds = array_filter(array_unique(array_filter([
            $purchaseOrder->requested_by,
            $purchaseOrder->minor_approved_by,
        ])));

        foreach ($recipientIds as $uid) {
            Notification::create([
                'user_id' => $uid,
                'type' => self::TYPE_MAJOR_OUTCOME,
                'data' => [
                    'title' => 'OC — resolución general',
                    'message' => $message,
                    'purchase_order_id' => $purchaseOrder->id,
                    'purchase_order_code' => $purchaseOrder->code,
                    'href' => $detailUrl,
                ],
                'read_at' => null,
            ]);
        }
    }

    /**
     * Después de commit de BD: correos en cola.
     */
    public static function dispatchMinorPendingEmails(string $purchaseOrderId): void
    {
        DB::afterCommit(fn () => \App\Jobs\SendPurchaseOrderMinorPendingEmailJob::dispatch($purchaseOrderId));
    }

    public static function dispatchMinorResultEmails(string $purchaseOrderId, string $action): void
    {
        DB::afterCommit(fn () => \App\Jobs\SendPurchaseOrderMinorResultEmailJob::dispatch($purchaseOrderId, $action));
    }

    public static function dispatchMajorPendingEmails(string $purchaseOrderId): void
    {
        DB::afterCommit(fn () => \App\Jobs\SendPurchaseOrderMajorPendingEmailJob::dispatch($purchaseOrderId));
    }

    public static function dispatchMajorResultEmails(string $purchaseOrderId, string $action): void
    {
        DB::afterCommit(fn () => \App\Jobs\SendPurchaseOrderMajorResultEmailJob::dispatch($purchaseOrderId, $action));
    }
}
