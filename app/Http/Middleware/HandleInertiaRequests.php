<?php

namespace App\Http\Middleware;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Middleware;
use Throwable;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        try {
            $parentShare = parent::share($request);
        } catch (Throwable $e) {
            $this->logInertiaAuthFailure($request, $e, 'parent::share');
            $parentShare = [];
        }

        try {
            $user = $request->user();

            $permissions = [];
            if ($user instanceof User) {
                try {
                    $permissions = $user->getAllPermissions()->pluck('name')->values()->all();
                } catch (Throwable $e) {
                    $this->logInertiaAuthFailure($request, $e, 'getAllPermissions');
                    report($e);
                }
            }

            $isSuperadmin = false;
            if ($user instanceof User) {
                try {
                    $isSuperadmin = $user->hasRole('superadmin', 'web');
                } catch (Throwable $e) {
                    $this->logInertiaAuthFailure($request, $e, 'hasRole superadmin');
                    report($e);
                }
            }

            $notificationsUnreadCount = 0;
            if ($user instanceof User && in_array('alerts.view', $permissions, true)) {
                try {
                    $notificationsUnreadCount = Notification::query()
                        ->where('user_id', $user->id)
                        ->whereNull('read_at')
                        ->count();
                } catch (Throwable $e) {
                    $this->logInertiaAuthFailure($request, $e, 'notifications count');
                    report($e);
                }
            }

            return [
                ...$parentShare,
                'name' => config('app.name'),
                'allowedZonalIds' => $request->attributes->has('allowed_zonal_ids')
                    ? $request->attributes->get('allowed_zonal_ids')
                    : null,
                'auth' => [
                    'user' => $user instanceof User ? $this->sharedAuthUserPayload($user) : null,
                    'permissions' => $permissions,
                    'is_superadmin' => $isSuperadmin,
                ],
                'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
                'flash' => [
                    'toast' => $request->session()->get('toast'),
                    'restore_candidate' => $request->session()->get('restore_candidate'),
                    'restore_payload' => $request->session()->get('restore_payload'),
                    'restore_user' => $request->session()->get('restore_user'),
                    'created_agent_token' => $request->session()->get('created_agent_token'),
                ],
                'stockEntriesPendingConfirmCount' => 0,
                'notificationsUnreadCount' => $notificationsUnreadCount,
            ];
        } catch (Throwable $e) {
            $this->logInertiaAuthFailure($request, $e, 'share payload');

            return [
                ...$parentShare,
                'name' => config('app.name'),
                'allowedZonalIds' => null,
                'auth' => [
                    'user' => null,
                    'permissions' => [],
                    'is_superadmin' => false,
                ],
                'sidebarOpen' => true,
                'flash' => $this->safeFlashFromSession($request),
                'stockEntriesPendingConfirmCount' => 0,
                'notificationsUnreadCount' => 0,
            ];
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function safeFlashFromSession(Request $request): array
    {
        try {
            return [
                'toast' => $request->session()->get('toast'),
                'restore_candidate' => $request->session()->get('restore_candidate'),
                'restore_payload' => $request->session()->get('restore_payload'),
                'restore_user' => $request->session()->get('restore_user'),
                'created_agent_token' => $request->session()->get('created_agent_token'),
            ];
        } catch (Throwable) {
            return [
                'toast' => null,
                'restore_candidate' => null,
                'restore_payload' => null,
                'restore_user' => null,
                'created_agent_token' => null,
            ];
        }
    }

    private function logInertiaAuthFailure(Request $request, Throwable $e, string $phase): void
    {
        try {
            $u = $request->user();
            Log::channel('inertia_auth')->error("HandleInertiaRequests: {$phase}", [
                'exception' => $e::class,
                'message' => $e->getMessage(),
                'user_id' => $u?->getAuthIdentifier(),
                'usuario' => $u instanceof User ? $u->usuario : null,
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
        } catch (Throwable) {
            // Evitar fallos secundarios al registrar.
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function sharedAuthUserPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'last_name' => $user->last_name,
            'usuario' => $user->usuario,
            'email' => $user->email,
            'avatar' => null,
            'email_verified_at' => $user->email_verified_at,
            'two_factor_enabled' => $user->two_factor_confirmed_at !== null,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
        ];
    }
}
