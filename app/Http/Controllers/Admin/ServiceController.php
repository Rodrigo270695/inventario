<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AssetCategory;
use App\Models\AssetSubcategory;
use App\Models\Office;
use App\Models\PurchaseItem;
use App\Models\Service;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\Zonal;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ServiceController extends Controller
{
    private const PER_PAGE = 25;

    private const VALID_SORT = ['name', 'type', 'status', 'start_date', 'end_date', 'created_at', 'remaining_days', 'supplier', 'warehouse'];

    private const VALID_ORDER = ['asc', 'desc'];

    public function index(Request $request): Response
    {
        $q = $this->cleanString($request->input('q', ''));
        $status = $this->cleanString($request->input('status', ''));
        $type = $this->cleanString($request->input('type', ''));
        $warehouseId = $this->cleanString($request->input('warehouse_id', ''));
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $perPage = (int) $request->input('per_page', self::PER_PAGE);

        if (! in_array($sortBy, self::VALID_SORT, true)) {
            $sortBy = 'created_at';
        }
        if (! in_array($sortOrder, self::VALID_ORDER, true)) {
            $sortOrder = 'desc';
        }

        /** @var \App\Models\User|null $authUser */
        $authUser = $request->user();
        $allowedZonalIds = [];
        if ($authUser && ! $authUser->hasRole('superadmin', 'web')) {
            $allowedZonalIds = $authUser->zonals()->pluck('zonals.id')->all();
        }

        $query = Service::query()
            ->with([
                'purchaseItem:id,purchase_order_id,description,total_price',
                'purchaseItem.purchaseOrder:id,code,supplier_id',
                'purchaseItem.purchaseOrder.supplier:id,name',
                'supplier:id,name',
                'warehouse:id,name,code,office_id',
                'warehouse.office:id,name,code,zonal_id',
                'warehouse.office.zonal:id,name,code',
                'assetSubcategory:id,name',
                'requestedByUser:id,name,last_name,usuario',
            ]);

        if (! empty($allowedZonalIds)) {
            $query->whereHas('warehouse.office', function (Builder $q) use ($allowedZonalIds) {
                $q->whereIn('zonal_id', $allowedZonalIds);
            });
        }

        if ($q !== '') {
            $query->where(function (Builder $qry) use ($q) {
                $qry->where('services.name', 'ilike', '%' . $q . '%')
                    ->orWhere('services.type', 'ilike', '%' . $q . '%')
                    ->orWhereHas('purchaseItem.purchaseOrder.supplier', function (Builder $s) use ($q) {
                        $s->where('name', 'ilike', '%' . $q . '%');
                    });
            });
        }
        if ($status !== '') {
            $query->where('services.status', $status);
        }
        if ($type !== '') {
            $query->where('services.type', $type);
        }
        if ($warehouseId !== '') {
            $query->where('services.warehouse_id', $warehouseId);
        }

        if ($sortBy === 'remaining_days') {
            // Ordenar por fecha fin (más próximos primero). NULLS LAST para que sin fecha queden al final.
            $services = $query
                ->orderByRaw('services.end_date ' . $sortOrder . ' NULLS LAST')
                ->paginate($perPage, ['services.*'], 'page')
                ->withQueryString();
        } elseif ($sortBy === 'supplier') {
            // Ordenar por nombre de proveedor (ya sea directo o vía OC, pero usamos columna suppliers.name)
            $services = $query
                ->leftJoin('suppliers', 'services.supplier_id', '=', 'suppliers.id')
                ->orderBy('suppliers.name', $sortOrder)
                ->orderBy('services.name', $sortOrder)
                ->paginate($perPage, ['services.*'], 'page')
                ->withQueryString();
        } elseif ($sortBy === 'warehouse') {
            // Ordenar por nombre de almacén
            $services = $query
                ->leftJoin('warehouses', 'services.warehouse_id', '=', 'warehouses.id')
                ->orderBy('warehouses.name', $sortOrder)
                ->orderBy('services.name', $sortOrder)
                ->paginate($perPage, ['services.*'], 'page')
                ->withQueryString();
        } else {
            $services = $query
                ->orderBy('services.' . $sortBy, $sortOrder)
                ->paginate($perPage, ['services.*'], 'page')
                ->withQueryString();
        }

        $warehousesForFilter = Warehouse::query()
            ->where('is_active', true)
            ->with('office:id,zonal_id,name,code', 'office.zonal:id,name,code')
            ->get(['id', 'name', 'code', 'office_id'])
            ->sortBy(function (Warehouse $w) {
                $zonalName = $w->office?->zonal?->name ?? $w->office?->zonal?->code ?? '';
                return sprintf('%s %s', mb_strtolower($zonalName), mb_strtolower($w->name));
            })
            ->values();

        $baseQuery = Service::query()
            ->when(! empty($allowedZonalIds), function (Builder $q) use ($allowedZonalIds) {
                $q->whereHas('warehouse.office', fn (Builder $o) => $o->whereIn('zonal_id', $allowedZonalIds));
            });
        $stats = [
            'total' => (clone $baseQuery)->count(),
            'active' => (clone $baseQuery)->where('status', 'active')->count(),
            'expired' => (clone $baseQuery)->where('status', 'expired')->count(),
            'draft' => (clone $baseQuery)->where('status', 'draft')->count(),
        ];

        return Inertia::render('admin/services/index', array_merge([
            'services' => $services,
            'filters' => [
                'q' => $q,
                'status' => $status,
                'type' => $type,
                'warehouse_id' => $warehouseId,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
                'per_page' => $perPage,
            ],
            'stats' => $stats,
            'warehousesForFilter' => $warehousesForFilter,
            'canCreate' => $authUser?->can('services.create') ?? false,
            'canUpdate' => $authUser?->can('services.update') ?? false,
            'canDelete' => $authUser?->can('services.delete') ?? false,
        ], $this->formPayload($allowedZonalIds)));
    }

    public function create(Request $request): Response
    {
        $authUser = $request->user();
        $allowedZonalIds = [];
        if ($authUser && ! $authUser->hasRole('superadmin', 'web')) {
            $allowedZonalIds = $authUser->zonals()->pluck('zonals.id')->all();
        }

        return Inertia::render('admin/services/create', $this->formPayload($allowedZonalIds));
    }

    public function store(Request $request): RedirectResponse
    {
        $request->merge(array_map(fn ($v) => $v === '' ? null : $v, $request->only([
            'asset_subcategory_id', 'requested_by', 'start_date', 'end_date', 'renewal', 'amount', 'notes',
        ])));

        $validated = $request->validate([
            'purchase_item_id' => 'nullable|uuid|exists:purchase_items,id',
            'asset_subcategory_id' => 'nullable|uuid|exists:asset_subcategories,id',
            'warehouse_id' => 'required|uuid|exists:warehouses,id',
            'name' => 'required|string|max:200',
            'type' => 'required|string|max:60',
            'requested_by' => 'nullable|uuid|exists:users,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'renewal' => 'nullable|string|max:30|in:monthly,bimonthly,quarterly,semiannual,annual,none',
            'amount' => 'nullable|numeric|min:0',
            'status' => 'required|string|max:30|in:active,about_to_expire,expired,cancelled',
            'supplier_id' => 'nullable|uuid|exists:suppliers,id',
            'notes' => 'nullable|string',
        ]);

        $authUser = $request->user();
        $allowedZonalIds = [];
        if ($authUser && ! $authUser->hasRole('superadmin', 'web')) {
            $allowedZonalIds = $authUser->zonals()->pluck('zonals.id')->all();
        }
        if (! empty($allowedZonalIds)) {
            Warehouse::query()
                ->where('id', $validated['warehouse_id'])
                ->whereHas('office', fn (Builder $o) => $o->whereIn('zonal_id', $allowedZonalIds))
                ->firstOrFail();
        }

        // Si viene de OC y no se envió supplier_id, tomarlo de la OC
        if (! empty($validated['purchase_item_id']) && empty($validated['supplier_id'])) {
            $pi = PurchaseItem::query()
                ->with('purchaseOrder:id,supplier_id')
                ->find($validated['purchase_item_id']);

            if ($pi && $pi->purchaseOrder?->supplier_id) {
                $validated['supplier_id'] = $pi->purchaseOrder->supplier_id;
            }
        }

        // Si NO hay OC, el proveedor es obligatorio
        if (empty($validated['purchase_item_id']) && empty($validated['supplier_id'])) {
            return back()
                ->withErrors(['supplier_id' => 'Debe seleccionar un proveedor para este servicio.'])
                ->withInput();
        }

        Service::create($validated);

        return redirect()->route('admin.services.index')->with('toast', ['type' => 'success', 'message' => 'Servicio creado correctamente.']);
    }

    public function edit(Request $request, Service $service): Response
    {
        $authUser = $request->user();
        $allowedZonalIds = [];
        if ($authUser && ! $authUser->hasRole('superadmin', 'web')) {
            $allowedZonalIds = $authUser->zonals()->pluck('zonals.id')->all();
        }
        if (! empty($allowedZonalIds)) {
            $service->load('warehouse.office');
            if (! in_array($service->warehouse->office->zonal_id ?? null, $allowedZonalIds, true)) {
                abort(403);
            }
        }

        $service->load([
            'purchaseItem:id,purchase_order_id,description,total_price',
            'purchaseItem.purchaseOrder:id,code,supplier_id',
            'purchaseItem.purchaseOrder.supplier:id,name',
            'warehouse:id,name,code',
            'assetSubcategory:id,name',
            'requestedByUser:id,name,last_name,usuario',
        ]);

        return Inertia::render('admin/services/edit', array_merge([
            'service' => $service,
        ], $this->formPayload($allowedZonalIds)));
    }

    public function update(Request $request, Service $service): RedirectResponse
    {
        $request->merge(array_map(fn ($v) => $v === '' ? null : $v, $request->only([
            'asset_subcategory_id', 'requested_by', 'start_date', 'end_date', 'renewal', 'amount', 'notes',
        ])));

        $authUser = $request->user();
        $allowedZonalIds = [];
        if ($authUser && ! $authUser->hasRole('superadmin', 'web')) {
            $allowedZonalIds = $authUser->zonals()->pluck('zonals.id')->all();
        }
        if (! empty($allowedZonalIds)) {
            $service->load('warehouse.office');
            if (! in_array($service->warehouse->office->zonal_id ?? null, $allowedZonalIds, true)) {
                abort(403);
            }
        }

        $validated = $request->validate([
            'asset_subcategory_id' => 'nullable|uuid|exists:asset_subcategories,id',
            'warehouse_id' => 'required|uuid|exists:warehouses,id',
            'name' => 'required|string|max:200',
            'type' => 'required|string|max:60',
            'requested_by' => 'nullable|uuid|exists:users,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'renewal' => 'nullable|string|max:30|in:monthly,bimonthly,quarterly,semiannual,annual,none',
            'amount' => 'nullable|numeric|min:0',
            'status' => 'required|string|max:30|in:active,about_to_expire,expired,cancelled',
            'supplier_id' => 'nullable|uuid|exists:suppliers,id',
            'notes' => 'nullable|string',
        ]);

        $service->update($validated);

        return redirect()->route('admin.services.index')->with('toast', ['type' => 'success', 'message' => 'Servicio actualizado correctamente.']);
    }

    public function destroy(Request $request, Service $service): RedirectResponse
    {
        $authUser = $request->user();
        $allowedZonalIds = [];
        if ($authUser && ! $authUser->hasRole('superadmin', 'web')) {
            $allowedZonalIds = $authUser->zonals()->pluck('zonals.id')->all();
        }
        if (! empty($allowedZonalIds)) {
            $service->load('warehouse.office');
            if (! in_array($service->warehouse->office->zonal_id ?? null, $allowedZonalIds, true)) {
                abort(403);
            }
        }

        $service->delete();

        return redirect()->route('admin.services.index')->with('toast', ['type' => 'success', 'message' => 'Servicio eliminado.']);
    }

    private function formPayload(array $allowedZonalIds): array
    {
        $warehousesQuery = Warehouse::query()->where('is_active', true)->with('office:id,zonal_id,name,code', 'office.zonal:id,name,code')->orderBy('name');
        if (! empty($allowedZonalIds)) {
            $warehousesQuery->whereHas('office', fn (Builder $o) => $o->whereIn('zonal_id', $allowedZonalIds));
        }
        $warehousesForSelect = $warehousesQuery->get(['id', 'name', 'code', 'office_id']);

        $assetCategories = AssetCategory::query()
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'type']);

        $assetSubcategories = AssetSubcategory::query()
            ->orderBy('name')
            ->get(['id', 'name', 'asset_category_id as category_id']);

        $zonalsForSelect = Zonal::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        $officesForSelect = Office::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'zonal_id']);

        $usersForSelect = User::query()->orderBy('name')->get(['id', 'name', 'last_name', 'usuario']);

        $suppliersForSelect = Supplier::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'ruc']);

        return [
            'warehousesForSelect' => $warehousesForSelect,
            'assetCategoriesForSelect' => $assetCategories,
            'assetSubcategoriesForSelect' => $assetSubcategories,
            'zonalsForSelect' => $zonalsForSelect,
            'officesForSelect' => $officesForSelect,
            'usersForSelect' => $usersForSelect,
            'suppliersForSelect' => $suppliersForSelect,
        ];
    }

    private function cleanString(mixed $value): string
    {
        if ($value === null || $value === 'null') {
            return '';
        }

        return trim((string) $value);
    }
}
