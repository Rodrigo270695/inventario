<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AssetCategory\AssetCategoryRequest;
use App\Models\AssetCategory;
use App\Models\GlAccount;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AssetCategoryController extends Controller
{
    private const VALID_SORT = ['name', 'code', 'created_at'];

    private const VALID_ORDER = ['asc', 'desc'];

    private const PER_PAGE_OPTIONS = [5, 10, 15, 25];
    private const DEFAULT_USEFUL_LIFE_YEARS = 0;
    private const DEFAULT_DEPRECIATION_METHOD = 'straight_line';
    private const DEFAULT_RESIDUAL_VALUE_PCT = 0.0;

    public function index(Request $request): Response
    {
        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');
        $perPage = (int) $request->input('per_page', 10);
        $q = $request->input('q', '');
        $q = ($q === null || $q === 'null') ? '' : trim((string) $q);
        $isActive = $request->input('is_active');
        if ($isActive !== null && $isActive !== '' && $isActive !== 'null') {
            $isActive = $isActive === '1' || $isActive === true ? '1' : '0';
        } else {
            $isActive = '';
        }
        $type = $request->input('type', '');
        $type = ($type === null || $type === 'null') ? '' : trim((string) $type);
        $glAccountId = $request->input('gl_account_id', '');
        $glAccountId = ($glAccountId === null || $glAccountId === 'null') ? '' : trim((string) $glAccountId);

        if (! in_array($sortBy, self::VALID_SORT, true)) {
            $sortBy = 'name';
        }
        if (! in_array($sortOrder, self::VALID_ORDER, true)) {
            $sortOrder = 'asc';
        }
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = 10;
        }

        $query = AssetCategory::query()->with(['glAccount:id,code,name', 'glDepreciationAccount:id,code,name']);

        if ($q !== '') {
            $term = '%'.mb_strtolower($q).'%';
            $query->where(function ($qb) use ($term) {
                $qb->whereRaw('LOWER(name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(code) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(type) LIKE ?', [$term])
                    ->orWhereHas('glAccount', function ($qAccount) use ($term) {
                        $qAccount->whereRaw('LOWER(code) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(name) LIKE ?', [$term]);
                    })
                    ->orWhereHas('glDepreciationAccount', function ($qDep) use ($term) {
                        $qDep->whereRaw('LOWER(code) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(name) LIKE ?', [$term]);
                    });
            });
        }

        if ($type !== '') {
            $query->where('type', $type);
        }

        if ($glAccountId !== '') {
            $query->where('gl_account_id', $glAccountId);
        }

        if ($isActive === '1') {
            $query->where('is_active', true);
        } elseif ($isActive === '0') {
            $query->where('is_active', false);
        }

        $query->orderBy($sortBy, $sortOrder);

        $categories = $query->paginate($perPage)->withQueryString();

        $totalActive = AssetCategory::where('is_active', true)->count();

        $glAccountsForSelect = GlAccount::query()->orderBy('code')->get(['id', 'code', 'name']);

        return Inertia::render('admin/asset-categories/index', [
            'categories' => $categories,
            'filters' => [
                'q' => $q,
                'is_active' => $isActive,
                'type' => $type,
                'gl_account_id' => $glAccountId,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => AssetCategory::count(),
                'total_active' => $totalActive,
            ],
            'glAccountsForSelect' => $glAccountsForSelect,
        ]);
    }

    public function store(AssetCategoryRequest $request): RedirectResponse
    {
        $validated = $this->normalizePayload($request->validated());

        AssetCategory::create($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Categoría de activos creada correctamente.']);
    }

    public function update(AssetCategoryRequest $request, AssetCategory $asset_category): RedirectResponse
    {
        $validated = $this->normalizePayload($request->validated());

        $asset_category->update($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Categoría de activos actualizada correctamente.']);
    }

    public function destroy(AssetCategory $asset_category): RedirectResponse
    {
        $asset_category->delete();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Categoría de activos eliminada correctamente.']);
    }

    /**
     * @param array<string, mixed> $validated
     * @return array<string, mixed>
     */
    private function normalizePayload(array $validated): array
    {
        $validated['gl_account_id'] = $validated['gl_account_id'] ?? null;
        $validated['gl_depreciation_account_id'] = $validated['gl_depreciation_account_id'] ?? null;
        $validated['icon'] = ($validated['icon'] ?? null) === '' ? null : ($validated['icon'] ?? null);

        // Estas columnas son NOT NULL en BD: si llegan vacías desde el formulario, aplicamos defaults.
        $validated['default_useful_life_years'] = $validated['default_useful_life_years'] ?? self::DEFAULT_USEFUL_LIFE_YEARS;
        $validated['default_depreciation_method'] = $validated['default_depreciation_method'] ?? self::DEFAULT_DEPRECIATION_METHOD;
        $validated['default_residual_value_pct'] = $validated['default_residual_value_pct'] ?? self::DEFAULT_RESIDUAL_VALUE_PCT;

        return $validated;
    }
}
