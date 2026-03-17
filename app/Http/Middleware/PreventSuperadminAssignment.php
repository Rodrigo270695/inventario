<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Impide que se asigne el rol superadmin (o usuarios con ese rol) en ninguna parte del sistema.
 * Revisa el body de POST/PUT/PATCH en busca de claves de "asignación" (user_id, manager_id, etc.)
 * y devuelve 403 si el valor es un ID de usuario superadmin.
 */
class PreventSuperadminAssignment
{
    /** Claves del request que representan "asignar a un usuario". Si el valor es ID de superadmin, se rechaza. */
    private const ASSIGNEE_KEYS = [
        'user_id',
        'manager_id',
        'received_by',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()) {
            return $next($request);
        }

        $method = $request->method();
        if (! in_array($method, ['POST', 'PUT', 'PATCH'], true)) {
            return $next($request);
        }

        $superadminIds = $this->superadminUserIds();
        if ($superadminIds->isEmpty()) {
            return $next($request);
        }

        $input = $request->all();
        foreach (self::ASSIGNEE_KEYS as $key) {
            $value = $input[$key] ?? null;
            if ($value === null || $value === '') {
                continue;
            }
            $value = is_string($value) ? trim($value) : $value;
            if ($value !== '' && $superadminIds->contains($value)) {
                abort(403, 'No se puede asignar al usuario superadmin.');
            }
        }

        return $next($request);
    }

    /** @return \Illuminate\Support\Collection<int, string> */
    private function superadminUserIds(): \Illuminate\Support\Collection
    {
        return User::query()
            ->role('superadmin', 'web')
            ->pluck('id');
    }
}
