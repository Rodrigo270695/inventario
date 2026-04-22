<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LoginAttempt;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class LoginAttemptController extends Controller
{
    public function index(Request $request): Response
    {
        $q = trim((string) $request->input('q', ''));
        $success = trim((string) $request->input('success', ''));
        $defaultFrom = CarbonImmutable::now()->startOfMonth()->toDateString();
        $defaultTo = CarbonImmutable::now()->endOfMonth()->toDateString();
        $dateFrom = trim((string) $request->input('date_from', $defaultFrom));
        $dateTo = trim((string) $request->input('date_to', $defaultTo));
        $perPage = (int) $request->input('per_page', 50);
        if (! in_array($perPage, [10, 15, 25, 50], true)) {
            $perPage = 50;
        }

        $allowedSort = ['created_at', 'email', 'ip_address', 'success'];
        $sortBy = (string) $request->input('sort_by', 'created_at');
        if (! in_array($sortBy, $allowedSort, true)) {
            $sortBy = 'created_at';
        }
        $sortOrder = strtolower((string) $request->input('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

        $query = LoginAttempt::query();
        $driver = DB::connection()->getDriverName();

        if ($q !== '') {
            $term = '%'.mb_strtolower($q).'%';
            $query->where(function ($sub) use ($term, $driver): void {
                $ipCast = $driver === 'pgsql' ? 'CAST(ip_address AS TEXT)' : 'CAST(ip_address AS CHAR)';
                $sub->whereRaw('LOWER(email) LIKE ?', [$term])
                    ->orWhereRaw("LOWER({$ipCast}) LIKE ?", [$term])
                    ->orWhereRaw('LOWER(COALESCE(failure_reason, \'\')) LIKE ?', [$term]);
            });
        }

        if ($success === '1') {
            $query->where('success', true);
        } elseif ($success === '0') {
            $query->where('success', false);
        }

        if ($dateFrom !== '') {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo !== '') {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        $query->orderBy($sortBy, $sortOrder);

        $loginAttempts = $query
            ->paginate($perPage)
            ->withQueryString();

        $total = LoginAttempt::query()->count();
        $successful = LoginAttempt::query()->where('success', true)->count();
        $failed = LoginAttempt::query()->where('success', false)->count();

        return Inertia::render('admin/security/login-attempts/index', [
            'loginAttempts' => $loginAttempts,
            'filters' => [
                'q' => $q,
                'success' => $success,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => $total,
                'successful' => $successful,
                'failed' => $failed,
            ],
        ]);
    }
}
