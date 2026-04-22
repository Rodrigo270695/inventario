<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ApiKeyLog;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ApiKeyLogController extends Controller
{
    public function index(Request $request): Response
    {
        $q = trim((string) $request->input('q', ''));
        $statusGroup = trim((string) $request->input('status_group', ''));
        $defaultFrom = CarbonImmutable::now()->startOfMonth()->toDateString();
        $defaultTo = CarbonImmutable::now()->endOfMonth()->toDateString();
        $dateFrom = trim((string) $request->input('date_from', $defaultFrom));
        $dateTo = trim((string) $request->input('date_to', $defaultTo));
        $perPage = (int) $request->input('per_page', 50);
        if (! in_array($perPage, [10, 15, 25, 50], true)) {
            $perPage = 50;
        }

        $allowedSort = ['created_at', 'status_code', 'endpoint', 'ip_address'];
        $sortBy = (string) $request->input('sort_by', 'created_at');
        if (! in_array($sortBy, $allowedSort, true)) {
            $sortBy = 'created_at';
        }
        $sortOrder = strtolower((string) $request->input('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

        $query = ApiKeyLog::query()->with('token:id,name');
        $driver = DB::connection()->getDriverName();

        if ($q !== '') {
            $term = '%'.mb_strtolower($q).'%';
            $query->where(function ($sub) use ($term, $driver): void {
                $ipCast = $driver === 'pgsql' ? 'CAST(ip_address AS TEXT)' : 'CAST(ip_address AS CHAR)';
                $idCast = $driver === 'pgsql' ? 'CAST(id AS TEXT)' : 'CAST(id AS CHAR)';
                $sub->whereRaw('LOWER(COALESCE(endpoint, \'\')) LIKE ?', [$term])
                    ->orWhereRaw("LOWER(COALESCE({$ipCast}, '')) LIKE ?", [$term])
                    ->orWhereRaw('CAST(status_code AS TEXT) LIKE ?', [str_replace('%', '', $term)])
                    ->orWhereHas('token', function ($tq) use ($term, $idCast): void {
                        $tq->whereRaw('LOWER(COALESCE(name, \'\')) LIKE ?', [$term])
                            ->orWhereRaw("LOWER({$idCast}) LIKE ?", [$term]);
                    });
            });
        }

        if ($statusGroup === 'success') {
            $query->whereBetween('status_code', [200, 299]);
        } elseif ($statusGroup === 'unauthorized') {
            $query->whereIn('status_code', [401, 403]);
        } elseif ($statusGroup === 'client_error') {
            $query->whereBetween('status_code', [400, 499]);
        } elseif ($statusGroup === 'server_error') {
            $query->whereBetween('status_code', [500, 599]);
        }

        if ($dateFrom !== '') {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo !== '') {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        $query->orderBy($sortBy, $sortOrder);

        $apiLogs = $query
            ->paginate($perPage)
            ->withQueryString()
            ->through(static fn (ApiKeyLog $row): array => [
                'id' => $row->id,
                'token_id' => $row->token_id,
                'token_name' => $row->token?->name,
                'endpoint' => $row->endpoint,
                'ip_address' => $row->ip_address,
                'status_code' => $row->status_code,
                'created_at' => $row->created_at?->toIso8601String(),
            ]);

        $baseStats = ApiKeyLog::query()
            ->when($dateFrom !== '', fn ($q) => $q->whereDate('created_at', '>=', $dateFrom))
            ->when($dateTo !== '', fn ($q) => $q->whereDate('created_at', '<=', $dateTo));

        return Inertia::render('admin/security/api-logs/index', [
            'apiLogs' => $apiLogs,
            'filters' => [
                'q' => $q,
                'status_group' => $statusGroup,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => (clone $baseStats)->count(),
                'success' => (clone $baseStats)->whereBetween('status_code', [200, 299])->count(),
                'unauthorized' => (clone $baseStats)->whereIn('status_code', [401, 403])->count(),
                'errors' => (clone $baseStats)->where('status_code', '>=', 400)->count(),
            ],
        ]);
    }
}
