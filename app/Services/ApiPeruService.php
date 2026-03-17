<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class ApiPeruService
{
    public function ruc(string $ruc): array
    {
        return $this->post('/ruc', ['ruc' => $ruc]);
    }

    public function rucAdditional(string $ruc): array
    {
        return [
            'deuda_coactiva' => $this->post('/ruc-deuda-coactiva', ['ruc' => $ruc]),
            'representantes' => $this->post('/ruc-representantes', ['ruc' => $ruc]),
            'establecimientos' => $this->post('/ruc-establecimientos-anexos', ['ruc' => $ruc]),
            'domicilio_fiscal' => $this->post('/ruc-domicilio-fiscal', ['ruc' => $ruc]),
        ];
    }

    private function post(string $path, array $payload): array
    {
        $baseUrl = rtrim(config('services.apiperu.base_url', ''), '/');
        $token = config('services.apiperu.token');

        if ($baseUrl === '' || ! $token) {
            throw new \RuntimeException('ApiPeru no está configurado. Defina APIPERU_BASE_URL y APIPERU_TOKEN en .env');
        }

        $response = Http::withToken($token)
            ->acceptJson()
            ->post($baseUrl.$path, $payload);

        if (! $response->successful()) {
            throw new \RuntimeException('Error al consultar ApiPeru: '.$response->body());
        }

        return $response->json();
    }
}

