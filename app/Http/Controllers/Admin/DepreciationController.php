<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AssetCategory;
use App\Models\DepreciationEntry;
use App\Models\DepreciationSchedule;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DepreciationController extends Controller
{
    private const ENTRIES_PER_PAGE_OPTIONS = [25, 50, 100];

    public function index(Request $request): Response
    {
        $schedules = DepreciationSchedule::query()
            ->with('category:id,name,code')
            ->orderBy('category_id')
            ->get(['id', 'category_id', 'method', 'useful_life_years', 'residual_value_pct']);

        $period = $request->input('period', '');
        $period = ($period === null || $period === 'null') ? '' : trim((string) $period);
        $perPage = (int) $request->input('per_page', 50);
        if (! in_array($perPage, self::ENTRIES_PER_PAGE_OPTIONS, true)) {
            $perPage = 50;
        }

        $entriesQuery = DepreciationEntry::query()
            ->with('asset:id,code,category_id')
            ->orderByDesc('period')
            ->orderByDesc('created_at')
            ->select(['id', 'asset_id', 'period', 'method', 'amount', 'book_value_before', 'book_value_after', 'status', 'created_at']);

        if ($period !== '' && $period !== 'all') {
            $entriesQuery->where('period', $period);
        }

        $entriesPaginator = $entriesQuery->paginate($perPage)->withQueryString();

        $recentEntries = $entriesPaginator->getCollection()->all();

        $availablePeriods = DepreciationEntry::query()
            ->distinct()
            ->orderByDesc('period')
            ->pluck('period');

        $categories = AssetCategory::query()
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'code',
                'type',
                'default_useful_life_years',
                'default_depreciation_method',
                'default_residual_value_pct',
            ]);

        return Inertia::render('admin/depreciation/index', [
            'schedules' => $schedules,
            'recentEntries' => $recentEntries,
            'entriesPaginator' => [
                'from' => $entriesPaginator->firstItem(),
                'to' => $entriesPaginator->lastItem(),
                'total' => $entriesPaginator->total(),
                'current_page' => $entriesPaginator->currentPage(),
                'last_page' => $entriesPaginator->lastPage(),
                'per_page' => $entriesPaginator->perPage(),
                'links' => $entriesPaginator->linkCollection()->toArray(),
            ],
            'availablePeriods' => $availablePeriods,
            'entriesFilters' => [
                'period' => $period === '' ? 'all' : $period,
                'per_page' => $perPage,
            ],
            'categories' => $categories,
            'canCreateSchedule' => $request->user()?->can('depreciation.create') ?? false,
            'canUpdateSchedule' => $request->user()?->can('depreciation.update') ?? false,
            'canDeleteSchedule' => $request->user()?->can('depreciation.delete') ?? false,
            'canApproveEntries' => $request->user()?->can('depreciation.approve') ?? false,
        ]);
    }

    public function storeSchedule(Request $request)
    {
        $data = $request->validate([
            'category_id' => ['required', 'uuid', 'exists:asset_categories,id'],
            'method' => ['required', 'string', 'in:straight_line,double_declining,sum_of_years'],
            'useful_life_years' => ['required', 'integer', 'min:1'],
            'residual_value_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        DepreciationSchedule::query()->updateOrCreate(
            ['category_id' => $data['category_id']],
            [
                'method' => $data['method'],
                'useful_life_years' => $data['useful_life_years'],
                'residual_value_pct' => $data['residual_value_pct'] ?? 0,
            ]
        );

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Regla de depreciación guardada correctamente.',
        ]);
    }

    public function updateSchedule(Request $request, DepreciationSchedule $depreciation_schedule)
    {
        $data = $request->validate([
            'method' => ['required', 'string', 'in:straight_line,double_declining,sum_of_years'],
            'useful_life_years' => ['required', 'integer', 'min:1'],
            'residual_value_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $depreciation_schedule->update([
            'method' => $data['method'],
            'useful_life_years' => $data['useful_life_years'],
            'residual_value_pct' => $data['residual_value_pct'] ?? 0,
        ]);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Regla de depreciación actualizada correctamente.',
        ]);
    }

    public function destroySchedule(DepreciationSchedule $depreciation_schedule)
    {
        $depreciation_schedule->delete();

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Regla de depreciación eliminada correctamente.',
        ]);
    }

    public function approveEntry(Request $request, DepreciationEntry $depreciation_entry)
    {
        if (! $request->user()?->can('depreciation.approve')) {
            abort(403);
        }

        if ($depreciation_entry->status === 'approved') {
            return redirect()->back();
        }

        $depreciation_entry->update([
            'status' => 'approved',
            'approved_by' => $request->user()?->id,
        ]);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Movimiento de depreciación aprobado correctamente.',
        ]);
    }

    public function bulkApproveEntries(Request $request)
    {
        if (! $request->user()?->can('depreciation.approve')) {
            abort(403);
        }

        $data = $request->validate([
            'entry_ids' => ['required', 'array'],
            'entry_ids.*' => ['uuid', 'exists:depreciation_entries,id'],
        ]);

        $entries = DepreciationEntry::query()
            ->whereIn('id', $data['entry_ids'])
            ->where('status', 'draft')
            ->get();

        $userId = $request->user()?->id;
        $count = 0;
        /** @var DepreciationEntry $entry */
        foreach ($entries as $entry) {
            $entry->update([
                'status' => 'approved',
                'approved_by' => $userId,
            ]);
            $count++;
        }

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => $count === 1
                ? '1 movimiento aprobado correctamente.'
                : "{$count} movimientos aprobados correctamente.",
        ]);
    }
}
