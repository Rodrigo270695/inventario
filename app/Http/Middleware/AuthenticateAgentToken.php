<?php

namespace App\Http\Middleware;

use App\Models\AgentToken;
use App\Models\ApiKeyLog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateAgentToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $raw = $request->bearerToken()
            ?? $request->header('X-Agent-Token');

        if (! is_string($raw) || trim($raw) === '') {
            return response()->json(['message' => 'Token de agente requerido (Authorization: Bearer o X-Agent-Token).'], 401);
        }

        $parts = explode('|', trim($raw), 2);
        if (count($parts) !== 2 || $parts[0] === '' || $parts[1] === '') {
            return response()->json(['message' => 'Formato de token inválido. Use: {id_del_token}|{secreto}'], 401);
        }

        [$tokenId, $secret] = $parts;

        $token = AgentToken::query()->find($tokenId);
        if (! $token instanceof AgentToken) {
            return response()->json(['message' => 'Token no válido.'], 401);
        }

        if ($token->isExpired()) {
            $this->writeLog($token, $request, 401);

            return response()->json(['message' => 'Token caducado.'], 401);
        }

        if (! Hash::check($secret, $token->token_hash)) {
            $this->writeLog($token, $request, 401);

            return response()->json(['message' => 'Token no válido.'], 401);
        }

        if (! $token->ipAllowed($request->ip())) {
            $this->writeLog($token, $request, 403);

            return response()->json(['message' => 'IP no permitida para este token.'], 403);
        }

        $token->forceFill(['last_used_at' => now()])->saveQuietly();

        $request->attributes->set('agent_token', $token);

        $response = $next($request);
        $this->writeLog($token, $request, $response->getStatusCode());

        return $response;
    }

    private function writeLog(AgentToken $token, Request $request, ?int $statusCode): void
    {
        try {
            $endpoint = trim($request->method().' '.$request->path());
            ApiKeyLog::query()->create([
                'token_id' => $token->id,
                'endpoint' => mb_substr($endpoint, 0, 200),
                'ip_address' => $request->ip(),
                'status_code' => $statusCode,
            ]);
        } catch (\Throwable) {
            // No bloquear la API del agente por fallo de log.
        }
    }
}
