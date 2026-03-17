<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\ApiPeruService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ApiPeruRucController extends Controller
{
    public function __construct(private ApiPeruService $apiPeru) {}

    public function basic(Request $request)
    {
        $ruc = $request->input('ruc');
        $request->merge(['ruc' => $ruc]);

        $data = $request->validate([
            'ruc' => ['required', 'string', 'size:11'],
        ]);

        try {
            $result = $this->apiPeru->ruc($data['ruc']);

            return response()->json([
                'ok' => true,
                'data' => $result,
            ]);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'ok' => false,
                'message' => 'No se pudo consultar el RUC. Verifique el número o intente más tarde.',
            ], 422);
        }
    }

    public function showInfo(Request $request): Response
    {
        $data = $request->validate([
            'ruc' => ['required', 'string', 'size:11'],
        ]);

        $basic = null;
        $extra = null;
        $error = null;

        try {
            $basic = $this->apiPeru->ruc($data['ruc']);
        } catch (\Throwable $e) {
            report($e);
            $error = 'No se pudo obtener la información desde ApiPeru. Intente nuevamente más tarde.';
        }

        if ($error === null) {
            try {
                $extra = $this->apiPeru->rucAdditional($data['ruc']);
            } catch (\Throwable $e) {
                report($e);
                // Si falla la info adicional, mostramos al menos los datos generales.
                $extra = null;
            }
        }

        return Inertia::render('admin/suppliers/ruc-info', [
            'ruc' => $data['ruc'],
            'basic' => $basic,
            'extra' => $extra,
            'error' => $error,
        ]);
    }
}

