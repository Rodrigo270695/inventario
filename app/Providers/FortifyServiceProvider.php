<?php

namespace App\Providers;

use App\Models\LoginAttempt;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureViews();
        $this->configureRateLimiting();
        $this->configureAuthentication();
    }

    /**
     * Rechazar login si el usuario está desactivado o eliminado (soft delete).
     */
    private function configureAuthentication(): void
    {
        Fortify::authenticateUsing(function (Request $request) {
            $username = $request->input(Fortify::username());
            if (config('fortify.lowercase_usernames')) {
                $username = Str::lower($username);
            }

            $user = User::withTrashed()
                ->where(Fortify::username(), $username)
                ->first();

            if (! $user || ! Hash::check($request->password, $user->password)) {
                $this->logLoginAttempt($request, false, 'invalid_password');

                return null;
            }

            if ($user->trashed()) {
                $this->logLoginAttempt($request, false, 'account_deleted');
                throw ValidationException::withMessages([
                    Fortify::username() => ['Tu cuenta ha sido dada de baja. Contacta al administrador.'],
                ]);
            }

            if (! $user->is_active) {
                $this->logLoginAttempt($request, false, 'account_inactive');
                throw ValidationException::withMessages([
                    Fortify::username() => ['Tu cuenta está desactivada. Contacta al administrador.'],
                ]);
            }

            $this->logLoginAttempt($request, true, null);

            return $user;
        });
    }

    private function logLoginAttempt(Request $request, bool $success, ?string $reason): void
    {
        try {
            $identifier = (string) $request->input(Fortify::username(), '');
            if (config('fortify.lowercase_usernames')) {
                $identifier = Str::lower($identifier);
            }

            LoginAttempt::query()->create([
                'email' => mb_substr(trim($identifier), 0, 255),
                'ip_address' => $request->ip() ?? '0.0.0.0',
                'user_agent' => $request->userAgent(),
                'success' => $success,
                'failure_reason' => $reason,
            ]);

            if (! $success) {
                $this->notifyIfFailedAttemptsThresholdReached($identifier, $request->ip() ?? '0.0.0.0');
            }
        } catch (\Throwable) {
            // No bloquear login por fallo en bitácora.
        }
    }

    private function notifyIfFailedAttemptsThresholdReached(string $identifier, string $ip): void
    {
        $identifier = trim($identifier);
        if ($identifier === '') {
            return;
        }

        $failedAttempts = LoginAttempt::query()
            ->where('email', $identifier)
            ->where('success', false)
            ->where('created_at', '>=', now()->subMinutes(30))
            ->count();

        if ($failedAttempts !== 3) {
            return;
        }

        $superadmins = User::query()
            ->role('superadmin')
            ->where('is_active', true)
            ->get(['id', 'email', 'name', 'last_name', 'usuario']);

        if ($superadmins->isEmpty()) {
            return;
        }

        $href = '/admin/security/login-attempts?success=0&q='.urlencode($identifier);
        $title = 'Alerta de seguridad: 3 intentos fallidos';
        $message = "Se detectaron 3 intentos fallidos para '{$identifier}' desde IP {$ip} en los últimos 30 minutos.";

        foreach ($superadmins as $superadmin) {
            Notification::query()->create([
                'user_id' => $superadmin->id,
                'type' => 'security.login_attempts.threshold',
                'data' => [
                    'title' => $title,
                    'message' => $message,
                    'href' => $href,
                    'identifier' => $identifier,
                    'ip_address' => $ip,
                ],
                'read_at' => null,
            ]);
        }

        $emails = $superadmins
            ->pluck('email')
            ->filter(fn ($email) => is_string($email) && $email !== '')
            ->unique()
            ->values()
            ->all();

        foreach ($emails as $email) {
            Mail::raw(
                $message."\n\nRevise el detalle en: ".url($href),
                static function ($mail) use ($email, $title): void {
                    $mail->to($email)->subject('Inventario TI | '.$title);
                }
            );
        }
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => redirect()->route('home'));

        Fortify::twoFactorChallengeView(fn () => Inertia::render('auth/two-factor-challenge'));

        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });
    }
}
