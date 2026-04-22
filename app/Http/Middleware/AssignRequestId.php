<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AssignRequestId
{
    public function handle(Request $request, Closure $next): Response
    {
        $rid = $request->headers->get('X-Request-Id');
        if (! is_string($rid) || trim($rid) === '') {
            $rid = (string) Str::uuid();
        }
        $rid = mb_substr(trim($rid), 0, 100);
        $request->attributes->set('request_id', $rid);

        return $next($request);
    }
}
