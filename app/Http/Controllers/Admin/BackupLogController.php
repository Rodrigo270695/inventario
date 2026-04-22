<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BackupLog;
use App\Services\BackupRunner;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BackupLogController extends Controller
{
    public function index(Request $request): Response
    {
        $q = trim((string) $request->input('q', ''));
        $status = trim((string) $request->input('status', ''));
        $defaultFrom = CarbonImmutable::now()->startOfMonth()->toDateString();
        $defaultTo = CarbonImmutable::now()->endOfMonth()->toDateString();
        $dateFrom = trim((string) $request->input('date_from', $defaultFrom));
        $dateTo = trim((string) $request->input('date_to', $defaultTo));
        $perPage = (int) $request->input('per_page', 50);
        if (! in_array($perPage, [10, 15, 25, 50], true)) {
            $perPage = 50;
        }

        $allowedSort = ['started_at', 'status', 'type', 'created_at'];
        $sortBy = (string) $request->input('sort_by', 'started_at');
        if (! in_array($sortBy, $allowedSort, true)) {
            $sortBy = 'started_at';
        }
        $sortOrder = strtolower((string) $request->input('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

        $query = BackupLog::query();

        if ($q !== '') {
            $term = '%'.mb_strtolower($q).'%';
            $query->where(function ($sub) use ($term): void {
                $sub->whereRaw('LOWER(type) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(status) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(path_or_ref, \'\')) LIKE ?', [$term]);
            });
        }

        if ($status !== '') {
            $query->where('status', $status);
        }

        if ($dateFrom !== '') {
            $query->whereDate('started_at', '>=', $dateFrom);
        }
        if ($dateTo !== '') {
            $query->whereDate('started_at', '<=', $dateTo);
        }

        $query->orderBy($sortBy, $sortOrder);

        $backupLogs = $query
            ->paginate($perPage)
            ->withQueryString();

        $baseStats = BackupLog::query()
            ->when($dateFrom !== '', fn ($q) => $q->whereDate('started_at', '>=', $dateFrom))
            ->when($dateTo !== '', fn ($q) => $q->whereDate('started_at', '<=', $dateTo));

        return Inertia::render('admin/security/backups/index', [
            'backupLogs' => $backupLogs,
            'filters' => [
                'q' => $q,
                'status' => $status,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => (clone $baseStats)->count(),
                'completed' => (clone $baseStats)->where('status', 'completed')->count(),
                'failed' => (clone $baseStats)->where('status', 'failed')->count(),
                'verified' => (clone $baseStats)->whereNotNull('verified_at')->count(),
            ],
        ]);
    }

    public function store(Request $request, BackupRunner $runner): RedirectResponse
    {
        abort_unless($request->user()?->can('security.backups.create'), 403);

        $hasRunningBackup = BackupLog::query()
            ->where('status', 'started')
            ->where('started_at', '>=', now()->subMinutes(10))
            ->exists();

        if ($hasRunningBackup) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Ya hay un backup en proceso. Espere unos segundos e intente nuevamente.',
            ]);
        }

        $log = BackupLog::query()->create([
            'type' => 'full',
            'status' => 'started',
            'started_at' => now(),
            'path_or_ref' => null,
        ]);

        $runner->runFullBackup($log);

        return back()->with('toast', [
            'type' => $log->fresh()?->status === 'completed' ? 'success' : 'error',
            'message' => $log->fresh()?->status === 'completed'
                ? 'Backup generado correctamente.'
                : 'El backup falló. Revise el historial para ver el detalle.',
        ]);
    }

    public function verify(Request $request, BackupLog $backupLog): RedirectResponse
    {
        abort_unless($request->user()?->can('security.backups.verify'), 403);

        if ($backupLog->status !== 'completed') {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Solo se puede verificar backups completados.',
            ]);
        }

        $backupLog->forceFill(['verified_at' => now()])->save();

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Backup marcado como verificado.',
        ]);
    }
}
