<?php

use App\Models\AlertEvent;
use App\Models\AlertRule;
use App\Models\Notification;
use App\Models\Service;
use Spatie\Permission\Models\Role;
use App\Models\DepreciationEntry;
use App\Models\DepreciationSchedule;
use App\Models\Asset;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('app:check-service-alerts', function () {
    $today = Carbon::today();

    $rule = AlertRule::query()->firstOrCreate(
        ['type' => 'service_expiry'],
        [
            'name' => 'Vencimiento de servicio',
            'channels' => ['in_app' => true],
            'notify_roles' => null,
            'threshold_config' => [
                'amber_min_days' => 16,
                'amber_max_days' => 30,
                'red_min_days' => 0,
                'red_max_days' => 15,
            ],
            'is_active' => true,
        ]
    );

    Service::query()
        ->whereNot('status', 'cancelled')
        ->whereNotNull('end_date')
        ->chunkById(100, function ($services) use ($today, $rule) {
            foreach ($services as $service) {
                /** @var \App\Models\Service $service */
                $endDate = $service->end_date instanceof \Carbon\Carbon
                    ? $service->end_date
                    : Carbon::parse($service->end_date);
                if (! $endDate) {
                    continue;
                }

                $days = $today->diffInDays($endDate, false);

                // Mapear a estado
                if ($days > 30) {
                    $newStatus = 'active';
                } elseif ($days >= 0 && $days <= 30) {
                    $newStatus = 'about_to_expire';
                } else {
                    $newStatus = 'expired';
                }

                $oldStatus = $service->status;
                if ($oldStatus !== $newStatus) {
                    $service->status = $newStatus;
                    $service->save();
                }

                // Determinar si debe haber alerta y severidad
                $needsAlert = $newStatus === 'about_to_expire' || $newStatus === 'expired';

                if (! $needsAlert) {
                    // Cerrar alerta abierta (si existe)
                    AlertEvent::query()
                        ->where('alert_rule_id', $rule->id)
                        ->where('model_type', Service::class)
                        ->where('model_id', $service->id)
                        ->whereNull('resolved_at')
                        ->update(['resolved_at' => now()]);

                    continue;
                }

                $severity = 'medium';
                if ($days <= 15) {
                    $severity = $days < 0 ? 'critical' : 'high';
                }

                $payload = [
                    'service_id' => $service->id,
                    'service_name' => $service->name,
                    'status' => $newStatus,
                    'days_remaining' => $days,
                    'end_date' => $endDate->toDateString(),
                ];

                $event = AlertEvent::query()
                    ->where('alert_rule_id', $rule->id)
                    ->where('model_type', Service::class)
                    ->where('model_id', $service->id)
                    ->whereNull('resolved_at')
                    ->first();

                if ($event) {
                    $event->update([
                        'severity' => $severity,
                        'payload' => $payload,
                    ]);
                } else {
                    AlertEvent::create([
                        'alert_rule_id' => $rule->id,
                        'severity' => $severity,
                        'model_type' => Service::class,
                        'model_id' => $service->id,
                        'payload' => $payload,
                    ]);
                }

                // Notificación in-app:
                // - Si hay solicitante, se notifica a requested_by
                // - Si no, se notifica al primer superadmin (para que siempre haya receptor)
                $targetUserId = $service->requested_by;
                if (! $targetUserId) {
                    $superadminRole = Role::query()
                        ->where('name', 'superadmin')
                        ->where('guard_name', 'web')
                        ->first();
                    $targetUserId = $superadminRole?->users()->value('id');
                }

                if ($targetUserId) {
                    Notification::create([
                        'user_id' => $targetUserId,
                        'type' => 'service_expiry',
                        'data' => [
                            'title' => $newStatus === 'expired'
                                ? 'Servicio vencido'
                                : 'Servicio por vencer',
                            'message' => sprintf(
                                'El servicio "%s" %s.',
                                $service->name,
                                $newStatus === 'expired'
                                    ? 'ya se encuentra vencido'
                                    : 'se encuentra próximo a vencer'
                            ),
                            'service_id' => $service->id,
                            'status' => $newStatus,
                            'days_remaining' => $days,
                            'end_date' => $endDate->toDateString(),
                        ],
                        'read_at' => null,
                    ]);
                }
            }
        });
})->purpose('Actualizar estados de servicios y generar alertas')->dailyAt('01:00');

Artisan::command('app:run-depreciation {--period=} ', function () {
    $inputPeriod = $this->option('period');
    $today = Carbon::today();
    $period = $inputPeriod ?: $today->format('Y-m'); // YYYY-MM

    // Evitar recalcular si ya hay entradas para el periodo (se controla por activo)
    $schedules = DepreciationSchedule::query()
        ->with('category:id,name,code', 'assets:id,category_id,acquisition_value,current_value')
        ->get();

    $created = 0;

    foreach ($schedules as $schedule) {
        /** @var DepreciationSchedule $schedule */
        foreach ($schedule->assets as $asset) {
            /** @var Asset $asset */
            if ($asset->acquisition_value === null) {
                continue;
            }

            // Evitar duplicados por activo+periodo
            $alreadyExists = DepreciationEntry::query()
                ->where('asset_id', $asset->id)
                ->where('period', $period)
                ->exists();
            if ($alreadyExists) {
                continue;
            }

            $acquisition = (float) $asset->acquisition_value;
            $residualPct = (float) $schedule->residual_value_pct;
            $usefulYears = max(1, (int) $schedule->useful_life_years);

            $residualValue = $acquisition * ($residualPct / 100);
            $depreciableBase = max(0.0, $acquisition - $residualValue);

            // Monto anual según método (por ahora sólo línea recta; otros métodos usan misma base simple)
            $annualDepreciation = $depreciableBase / $usefulYears;
            $monthlyDepreciation = round($annualDepreciation / 12, 2);

            // book_value_before: valor después de la última depreciación aprobada, o adquisición si no hay
            $lastApproved = DepreciationEntry::query()
                ->where('asset_id', $asset->id)
                ->where('status', 'approved')
                ->orderByDesc('period')
                ->orderByDesc('created_at')
                ->first();

            $bookBefore = $lastApproved
                ? (float) $lastApproved->book_value_after
                : $acquisition;

            $bookAfter = max($residualValue, $bookBefore - $monthlyDepreciation);

            DepreciationEntry::create([
                'asset_id' => $asset->id,
                'period' => $period,
                'method' => $schedule->method,
                'amount' => $monthlyDepreciation,
                'book_value_before' => $bookBefore,
                'book_value_after' => $bookAfter,
                'calculated_at' => now(),
                'status' => 'draft',
            ]);

            $created++;
        }
    }

    $this->info("Entradas de depreciación creadas para el periodo {$period}: {$created}");
})->purpose('Calcular depreciación mensual para activos tecnológicos')->monthlyOn(1, '00:30');

Artisan::command('app:check-depreciation-alerts', function () {
    $today = Carbon::today();
    $currentPeriod = $today->format('Y-m');

    $rule = AlertRule::query()->firstOrCreate(
        ['type' => 'depreciation_pending_approval'],
        [
            'name' => 'Depreciación pendiente de aprobación',
            'channels' => ['in_app' => true],
            'notify_roles' => null,
            'threshold_config' => null,
            'is_active' => true,
        ]
    );

    $pendingEntries = DepreciationEntry::query()
        ->where('status', 'draft')
        ->where('period', '<', $currentPeriod)
        ->get();

    $pendingIds = $pendingEntries->pluck('id')->all();

    foreach ($pendingEntries as $entry) {
        $monthsLate = max(0, ($today->year * 12 + $today->month) - (intval(substr($entry->period, 0, 4)) * 12 + intval(substr($entry->period, 5, 2))));

        $severity = 'medium';
        if ($monthsLate >= 3 && $monthsLate < 6) {
            $severity = 'high';
        } elseif ($monthsLate >= 6) {
            $severity = 'critical';
        }

        $payload = [
            'depreciation_entry_id' => $entry->id,
            'asset_id' => $entry->asset_id,
            'period' => $entry->period,
            'amount' => $entry->amount,
            'book_value_before' => $entry->book_value_before,
            'book_value_after' => $entry->book_value_after,
            'months_late' => $monthsLate,
        ];

        $event = AlertEvent::query()
            ->where('alert_rule_id', $rule->id)
            ->where('model_type', DepreciationEntry::class)
            ->where('model_id', $entry->id)
            ->whereNull('resolved_at')
            ->first();

        if ($event) {
            $event->update([
                'severity' => $severity,
                'payload' => $payload,
            ]);
        } else {
            AlertEvent::create([
                'alert_rule_id' => $rule->id,
                'severity' => $severity,
                'model_type' => DepreciationEntry::class,
                'model_id' => $entry->id,
                'payload' => $payload,
            ]);
        }
    }

    // Cerrar alertas de entradas que ya no están pendientes
    AlertEvent::query()
        ->where('alert_rule_id', $rule->id)
        ->where('model_type', DepreciationEntry::class)
        ->whereNull('resolved_at')
        ->when($pendingIds !== [], function ($q) use ($pendingIds) {
            $q->whereNotIn('model_id', $pendingIds);
        })
        ->update(['resolved_at' => now()]);
})->purpose('Generar alertas para depreciaciones pendientes de aprobación')->dailyAt('02:00');

