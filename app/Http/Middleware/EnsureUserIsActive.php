<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    /**
     * No permitir acceso si el usuario está desactivado o eliminado (soft delete).
     */
    public function handle(Request $request, \Closure $next): Response
    {
        /** @var \App\Models\User|null $user */
        $user = Auth::user();

        if (! $user) {
            return $next($request);
        }

        if ($user->deleted_at !== null) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('home')
                ->with('status', 'Tu cuenta ha sido dada de baja. Contacta al administrador.');
        }

        if (! $user->is_active) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('home')
                ->with('status', 'Tu cuenta está desactivada. Contacta al administrador.');
        }

        return $next($request);
    }
}
