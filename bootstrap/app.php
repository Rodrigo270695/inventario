<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'filter.zonals.by.user' => \App\Http\Middleware\FilterZonalsByUser::class,
        ]);

        $middleware->appendToGroup('auth', [
            \App\Http\Middleware\EnsureUserIsActive::class,
            \App\Http\Middleware\PreventSuperadminAssignment::class,
        ]);

        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->report(function (\Throwable $e): void {
            if (app()->runningInConsole()) {
                return;
            }
            if ($e instanceof ValidationException) {
                return;
            }
            if (! auth()->check()) {
                return;
            }

            try {
                $u = auth()->user();
                Log::channel('inertia_auth')->error('Excepción con sesión activa', [
                    'exception' => $e::class,
                    'message' => $e->getMessage(),
                    'user_id' => $u?->getAuthIdentifier(),
                    'usuario' => $u instanceof \App\Models\User ? $u->usuario : null,
                    'url' => request()->fullUrl(),
                    'method' => request()->method(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ]);
            } catch (\Throwable) {
                // Evitar fallos secundarios al registrar.
            }
        });

        $exceptions->render(function (\Throwable $e, Request $request) {
            // ValidationException no implementa HttpExceptionInterface; si no se excluye,
            // se clasifica como 500 y se muestra la vista errors/500 en lugar del redirect con errores (modal).
            if ($e instanceof ValidationException) {
                return null;
            }

            if (! $request->expectsJson()) {
                $status = $e instanceof HttpExceptionInterface ? $e->getStatusCode() : Response::HTTP_INTERNAL_SERVER_ERROR;
                $handledStatuses = [Response::HTTP_FORBIDDEN, Response::HTTP_NOT_FOUND, Response::HTTP_INTERNAL_SERVER_ERROR];

                if (in_array($status, $handledStatuses, true)) {
                    return Inertia::render("errors/{$status}")
                        ->toResponse($request)
                        ->setStatusCode($status);
                }
            }

            return null;
        });
    })->create();
