<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AssetCategory;
use App\Models\Asset;
use App\Models\DepreciationEntry;
use App\Models\DepreciationSchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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

    public function runManual(Request $request)
    {
        if (! $request->user()?->can('depreciation.create')) {
            abort(403);
        }

        $data = $request->validate([
            'period' => ['required', 'date_format:Y-m'],
        ]);

        $period = $data['period'];

        $schedules = DepreciationSchedule::query()
            ->with([
                'category:id,name,code,gl_account_id,gl_depreciation_account_id',
                'assets:id,category_id,acquisition_value,current_value',
            ])
            ->get();

        if ($schedules->isEmpty()) {
            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => 'No hay reglas de depreciación configuradas.',
            ]);
        }

        $categoriesWithoutAccounts = [];

        foreach ($schedules as $schedule) {
            $category = $schedule->category;
            if (! $category) {
                continue;
            }

            if (! $category->gl_account_id || ! $category->gl_depreciation_account_id) {
                $categoriesWithoutAccounts[] = $category->code ?: $category->name;
            }
        }

        if ($categoriesWithoutAccounts !== []) {
            $categoriesWithoutAccounts = array_values(array_unique($categoriesWithoutAccounts));

            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => 'No se puede ejecutar: faltan cuentas contables en categorías: '.implode(', ', $categoriesWithoutAccounts).'.',
            ]);
        }

        $created = $this->createEntriesForPeriod($period, $schedules);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Depreciación ejecutada para {$period}. Movimientos creados: {$created}.",
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

    /**
     * @param \Illuminate\Support\Collection<int, DepreciationSchedule>|null $schedules
     */
    private function createEntriesForPeriod(string $period, $schedules = null): int
    {
        $validPeriod = Carbon::createFromFormat('Y-m', $period);
        if (! $validPeriod || $validPeriod->format('Y-m') !== $period) {
            return 0;
        }

        $schedules ??= DepreciationSchedule::query()
            ->with('assets:id,category_id,acquisition_value,current_value')
            ->get();

        $created = 0;

        foreach ($schedules as $schedule) {
            /** @var DepreciationSchedule $schedule */
            foreach ($schedule->assets as $asset) {
                /** @var Asset $asset */
                if ($asset->acquisition_value === null) {
                    continue;
                }

                $alreadyExists = DepreciationEntry::query()
                    ->where('asset_id', $asset->id)
                    ->where('period', $period)
                    ->exists();
                if ($alreadyExists) {
                    continue;
                }

                $acquisition = (float) $asset->acquisition_value;
                $residualPct = (float) $schedule->residual_value_pct;
                $usefulYears = max(1, (int) $schedule->useful_life_years);

                $residualValue = $acquisition * ($residualPct / 100);
                $depreciableBase = max(0.0, $acquisition - $residualValue);
                $annualDepreciation = $depreciableBase / $usefulYears;
                $monthlyDepreciation = round($annualDepreciation / 12, 2);

                $lastApproved = DepreciationEntry::query()
                    ->where('asset_id', $asset->id)
                    ->where('status', 'approved')
                    ->orderByDesc('period')
                    ->orderByDesc('created_at')
                    ->first();

                $bookBefore = $lastApproved
                    ? (float) $lastApproved->book_value_after
                    : $acquisition;

                $bookAfter = max($residualValue, $bookBefore - $monthlyDepreciation);

                DepreciationEntry::create([
                    'asset_id' => $asset->id,
                    'period' => $period,
                    'method' => $schedule->method,
                    'amount' => $monthlyDepreciation,
                    'book_value_before' => $bookBefore,
                    'book_value_after' => $bookAfter,
                    'calculated_at' => now(),
                    'status' => 'draft',
                ]);

                $created++;
            }
        }

        return $created;
    }
}
