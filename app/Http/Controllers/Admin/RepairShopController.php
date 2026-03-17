<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RepairShop\RepairShopRequest;
use App\Models\RepairShop;
use App\Models\Zonal;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RepairShopController extends Controller
{
    private const VALID_SORT = ['name', 'created_at'];

    private const VALID_ORDER = ['asc', 'desc'];

    private const PER_PAGE_OPTIONS = [5, 10, 15, 25];

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

        if (! in_array($sortBy, self::VALID_SORT, true)) {
            $sortBy = 'name';
        }
        if (! in_array($sortOrder, self::VALID_ORDER, true)) {
            $sortOrder = 'asc';
        }
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = 10;
        }

        $query = RepairShop::query()->with('zonal:id,name,code');

        if ($q !== '') {
            $term = '%'.mb_strtolower($q).'%';
            $query->where(function ($qb) use ($term) {
                $qb->whereRaw('LOWER(name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(ruc, \'\')) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(contact_name, \'\')) LIKE ?', [$term]);
            });
        }

        if ($isActive === '1') {
            $query->where('is_active', true);
        } elseif ($isActive === '0') {
            $query->where('is_active', false);
        }

        $query->orderBy($sortBy, $sortOrder);

        $repairShops = $query->paginate($perPage)->withQueryString();

        $totalActive = RepairShop::where('is_active', true)->count();

        $zonals = Zonal::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);

        return Inertia::render('admin/repair-shops/index', [
            'repairShops' => $repairShops,
            'zonals' => $zonals,
            'filters' => [
                'q' => $q,
                'is_active' => $isActive,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => RepairShop::count(),
                'total_active' => $totalActive,
            ],
        ]);
    }

    public function store(RepairShopRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $validated['zonal_id'] = $validated['zonal_id'] ?? null;

        $trashed = RepairShop::onlyTrashed()
            ->where('name', $validated['name'])
            ->where(function ($q) use ($validated) {
                $zonalId = $validated['zonal_id'] ?? null;
                if ($zonalId !== null) {
                    $q->where('zonal_id', $zonalId);
                } else {
                    $q->whereNull('zonal_id');
                }
            })
            ->first();

        if ($trashed) {
            return redirect()->back()
                ->with('restore_candidate', [
                    'type' => 'repair_shop',
                    'id' => $trashed->id,
                    'name' => $trashed->name,
                ])
                ->with('restore_payload', $validated);
        }

        RepairShop::create($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Taller externo creado correctamente.']);
    }

    public function update(RepairShopRequest $request, RepairShop $repair_shop): RedirectResponse
    {
        $validated = $request->validated();
        $validated['zonal_id'] = $validated['zonal_id'] ?? null;

        $repair_shop->update($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Taller externo actualizado correctamente.']);
    }

    public function destroy(RepairShop $repair_shop): RedirectResponse
    {
        $repair_shop->delete();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Taller externo eliminado correctamente.']);
    }

    public function restore(Request $request): RedirectResponse
    {
        abort_if(! $request->user()?->can('repair_shops.create'), 403);
        $request->validate(['id' => ['required', 'uuid']]);
        $repairShop = RepairShop::withTrashed()->findOrFail($request->input('id'));
        $repairShop->restore();
        $data = $request->only([
            'name', 'ruc', 'contact_name', 'phone', 'address', 'zonal_id', 'is_active',
        ]);
        $data['zonal_id'] = ($data['zonal_id'] ?? '') !== '' ? $data['zonal_id'] : null;
        $repairShop->update($data);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Taller externo restaurado correctamente.']);
    }
}
