<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class EloquentModelAuditor
{
    private static bool $registered = false;

    /** @var list<string> */
    private const SKIP_MODELS = [
        AuditLog::class,
    ];

    /** @var list<string> */
    private const SENSITIVE_KEYS = [
        'password',
        'password_confirmation',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'token_hash',
    ];

    public static function register(): void
    {
        if (self::$registered) {
            return;
        }
        self::$registered = true;

        foreach (self::discoverModelClasses() as $class) {
            /** @var class-string<Model> $class */
            $class::created(function (Model $model) use ($class): void {
                if (! $model instanceof $class) {
                    return;
                }
                if (self::shouldSkip($model)) {
                    return;
                }
                DB::afterCommit(function () use ($model): void {
                    self::writeLog('created', $model, null, self::sanitizeAttributes($model->getAttributes()));
                });
            });

            $class::updated(function (Model $model) use ($class): void {
                if (! $model instanceof $class) {
                    return;
                }
                if (self::shouldSkip($model)) {
                    return;
                }
                $changes = $model->getChanges();
                unset($changes['updated_at'], $changes['password']);
                if ($changes === []) {
                    return;
                }
                $keys = array_keys($changes);
                $old = Arr::only($model->getOriginal(), $keys);
                $new = Arr::only($model->getAttributes(), $keys);
                $old = self::sanitizeAttributes($old);
                $new = self::sanitizeAttributes($new);
                DB::afterCommit(function () use ($model, $old, $new): void {
                    self::writeLog('updated', $model, $old, $new);
                });
            });

            $class::deleted(function (Model $model) use ($class): void {
                if (! $model instanceof $class) {
                    return;
                }
                if (self::shouldSkip($model)) {
                    return;
                }
                $snapshot = self::sanitizeAttributes($model->getAttributes());
                DB::afterCommit(function () use ($model, $snapshot): void {
                    self::writeLog('deleted', $model, $snapshot, null);
                });
            });

            if (in_array(SoftDeletes::class, class_uses_recursive($class), true)) {
                $class::restored(function (Model $model) use ($class): void {
                    if (! $model instanceof $class) {
                        return;
                    }
                    if (self::shouldSkip($model)) {
                        return;
                    }
                    DB::afterCommit(function () use ($model): void {
                        self::writeLog('restored', $model, null, self::sanitizeAttributes($model->getAttributes()));
                    });
                });
            }
        }
    }

    /**
     * @return list<class-string<Model>>
     */
    private static function discoverModelClasses(): array
    {
        $dir = app_path('Models');
        if (! is_dir($dir)) {
            return [];
        }

        $classes = [];
        foreach (glob($dir.'/*.php') ?: [] as $file) {
            $base = basename($file, '.php');
            $class = 'App\\Models\\'.$base;
            if (! class_exists($class)) {
                continue;
            }
            if (! is_subclass_of($class, Model::class)) {
                continue;
            }
            if (in_array($class, self::SKIP_MODELS, true)) {
                continue;
            }
            $classes[] = $class;
        }

        return $classes;
    }

    private static function shouldSkip(Model $model): bool
    {
        return in_array($model::class, self::SKIP_MODELS, true);
    }

    /**
     * @param  array<string, mixed>|null  $oldValues
     * @param  array<string, mixed>|null  $newValues
     */
    private static function writeLog(string $action, Model $model, ?array $oldValues, ?array $newValues): void
    {
        try {
            $request = request();
            $requestId = $request?->attributes->get('request_id');
            if (! is_string($requestId) || $requestId === '') {
                $requestId = null;
            }

            $userId = Auth::check() ? Auth::id() : null;

            AuditLog::withoutEvents(function () use ($action, $model, $oldValues, $newValues, $request, $requestId, $userId): void {
                AuditLog::query()->create([
                    'user_id' => $userId,
                    'action' => mb_substr($action, 0, 50),
                    'model_type' => $model::class,
                    'model_id' => (string) $model->getKey(),
                    'old_values' => $oldValues,
                    'new_values' => $newValues,
                    'ip_address' => $request?->ip(),
                    'request_id' => $requestId,
                ]);
            });
        } catch (\Throwable) {
            // No romper la petición si falla la auditoría.
        }
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private static function sanitizeAttributes(array $attributes): array
    {
        $out = [];
        foreach ($attributes as $key => $value) {
            if (! is_string($key)) {
                continue;
            }
            if (in_array(mb_strtolower($key), self::SENSITIVE_KEYS, true)) {
                continue;
            }
            $out[$key] = self::sanitizeValue($value, 0);
        }

        return $out;
    }

    private static function sanitizeValue(mixed $value, int $depth): mixed
    {
        if ($depth > 4) {
            return '[profundidad máxima]';
        }
        if (is_array($value)) {
            $slice = array_slice($value, 0, 80, true);
            $result = [];
            foreach ($slice as $k => $v) {
                if (is_string($k) && in_array(mb_strtolower($k), self::SENSITIVE_KEYS, true)) {
                    continue;
                }
                $result[$k] = self::sanitizeValue($v, $depth + 1);
            }

            return $result;
        }
        if (is_string($value) && mb_strlen($value) > 4000) {
            return mb_substr($value, 0, 4000).'…';
        }

        return $value;
    }
}
