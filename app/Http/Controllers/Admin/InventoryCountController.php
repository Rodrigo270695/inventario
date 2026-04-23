<?php

namespace App\Http\Controllers\Admin;

use App\Exports\InventoryCountExport;
use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Component;
use App\Models\InventoryCount;
use App\Models\InventoryCountItem;
use App\Models\Office;
use App\Models\Warehouse;
use App\Models\Zonal;
use App\Support\UserGeographicAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class InventoryCountController extends Controller
{
    private const PER_PAGE = 25;

    public function index(Request $request): Response
    {
        $status = $this->cleanString($request->input('status', ''));
        $dateFrom = $this->cleanString($request->input('date_from', ''));
        $dateTo = $this->cleanString($request->input('date_to', ''));

        if ($dateFrom === '' && $dateTo === '') {
            $dateFrom = now()->startOfMonth()->format('Y-m-d');
            $dateTo = now()->endOfMonth()->format('Y-m-d');
        }

        $zonalId = $this->cleanString($request->input('zonal_id', ''));
        $officeId = $this->cleanString($request->input('office_id', ''));
        $warehouseId = $this->cleanString($request->input('warehouse_id', ''));

        /** @var \App\Models\User|null $authUser */
        $authUser = $request->user();
        [$allowedOfficeIds, $allowedZonalIds] = UserGeographicAccess::forUser($authUser);
        if ($authUser?->hasRole('superadmin', 'web')) {
            $allowedOfficeIds = [];
            $allowedZonalIds = [];
        }

        $query = InventoryCount::query()
            ->withCount('items')
            ->with([
                'warehouse:id,name,code,office_id',
                'warehouse.office:id,name,code,zonal_id',
                'warehouse.office.zonal:id,name,code',
                'reconciledBy:id,name,last_name,usuario',
            ]);

        if (! empty($allowedOfficeIds)) {
            $query->whereHas('warehouse', fn (Builder $q) => $q->whereIn('office_id', $allowedOfficeIds));
        } elseif (! empty($allowedZonalIds)) {
            $query->whereHas('warehouse.office', function (Builder $q) use ($allowedZonalIds) {
                $q->whereIn('zonal_id', $allowedZonalIds);
            });
        }

        if ($status !== '') {
            $query->where('status', $status);
        }
        if ($dateFrom !== '') {
            $query->whereDate('count_date', '>=', $dateFrom);
        }
        if ($dateTo !== '') {
            $query->whereDate('count_date', '<=', $dateTo);
        }
        if ($warehouseId !== '') {
            $query->where('warehouse_id', $warehouseId);
        } elseif ($officeId !== '') {
            $query->whereHas('warehouse', fn (Builder $w) => $w->where('office_id', $officeId));
        } elseif ($zonalId !== '') {
            $query->whereHas('warehouse.office', fn (Builder $o) => $o->where('zonal_id', $zonalId));
        }

        $counts = $query
            ->orderByDesc('count_date')
            ->orderByDesc('created_at')
            ->paginate(self::PER_PAGE, ['*'], 'page')
            ->withQueryString();

        $baseQuery = InventoryCount::query()
            ->when(! empty($allowedOfficeIds), function (Builder $q) use ($allowedOfficeIds) {
                $q->whereHas('warehouse', fn (Builder $wq) => $wq->whereIn('office_id', $allowedOfficeIds));
            })
            ->when(empty($allowedOfficeIds) && ! empty($allowedZonalIds), function (Builder $q) use ($allowedZonalIds) {
                $q->whereHas('warehouse.office', fn (Builder $o) => $o->whereIn('zonal_id', $allowedZonalIds));
            });
        $stats = [
            'total' => (clone $baseQuery)->count(),
            'in_progress' => (clone $baseQuery)->where('status', 'in_progress')->count(),
            'reconciled' => (clone $baseQuery)->where('status', 'reconciled')->count(),
            'closed' => (clone $baseQuery)->where('status', 'closed')->count(),
        ];

        return Inertia::render('admin/inventory-counts/index', array_merge(
            [
                'counts' => $counts,
                'filters' => [
                    'status' => $status,
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                    'zonal_id' => $zonalId,
                    'office_id' => $officeId,
                    'warehouse_id' => $warehouseId,
                ],
                'stats' => $stats,
            ],
            $this->formPayload($allowedZonalIds, $allowedOfficeIds)
        ));
    }

    public function show(Request $request, InventoryCount $inventory_count): Response
    {
        /** @var \App\Models\User|null $authUser */
        $authUser = $request->user();

        if ($authUser && ! $authUser->hasRole('superadmin', 'web')) {
            [$allowedOfficeIds, $allowedZonalIds] = UserGeographicAccess::forUser($authUser);
            $inventory_count->loadMissing('warehouse.office');
            $officeId = $inventory_count->warehouse?->office_id;

            if (! empty($allowedOfficeIds)) {
                if (! $officeId || ! in_array($officeId, $allowedOfficeIds, true)) {
                    abort(403);
                }
            } elseif (! empty($allowedZonalIds)) {
                $zonalId = $inventory_count->warehouse?->office?->zonal_id;
                if (! $zonalId || ! in_array($zonalId, $allowedZonalIds, true)) {
                    abort(403);
                }
            } else {
                abort(403);
            }
        }

        $inventory_count->loadMissing([
            'warehouse:id,name,code,office_id',
            'warehouse.office:id,name,code,zonal_id',
            'warehouse.office.zonal:id,name,code',
            'reconciledBy:id,name,last_name,usuario',
            'items',
            // Incluir siempre el campo status para poder mostrar el estado de inventario
            'items.asset:id,code,serial_number,category_id,model_id,warehouse_id,condition,status',
            'items.asset.category:id,name,code',
            'items.asset.model:id,name,brand_id',
            'items.asset.model.brand:id,name',
            'items.component:id,code,serial_number,type_id,brand_id,model,warehouse_id,condition,status',
            'items.component.type:id,name,code',
            'items.component.brand:id,name',
        ]);

        $warehouseId = $inventory_count->warehouse_id;

        if ($inventory_count->status === 'in_progress' && $warehouseId) {
            $existingAssetIds = $inventory_count->items->pluck('asset_id')->filter()->values()->all();
            $existingComponentIds = $inventory_count->items->pluck('component_id')->filter()->values()->all();

            $missingAssets = Asset::query()
                ->where('warehouse_id', $warehouseId)
                ->when(count($existingAssetIds) > 0, fn (Builder $q) => $q->whereNotIn('id', $existingAssetIds))
                ->get(['id', 'condition']);

            $missingComponents = Component::query()
                ->where('warehouse_id', $warehouseId)
                ->when(count($existingComponentIds) > 0, fn (Builder $q) => $q->whereNotIn('id', $existingComponentIds))
                ->get(['id', 'condition']);

            foreach ($missingAssets as $asset) {
                InventoryCountItem::create([
                    'inventory_count_id' => $inventory_count->id,
                    'asset_id' => $asset->id,
                    'component_id' => null,
                    'expected_quantity' => 1,
                    'counted_quantity' => 0,
                    'difference' => 0,
                    'condition_at_count' => $asset->condition,
                ]);
            }

            foreach ($missingComponents as $component) {
                InventoryCountItem::create([
                    'inventory_count_id' => $inventory_count->id,
                    'asset_id' => null,
                    'component_id' => $component->id,
                    'expected_quantity' => 1,
                    'counted_quantity' => 0,
                    'difference' => 0,
                    'condition_at_count' => $component->condition,
                ]);
            }

            if ($missingAssets->isNotEmpty() || $missingComponents->isNotEmpty()) {
                $inventory_count->load([
                    'items.asset:id,code,serial_number,category_id,model_id,warehouse_id,condition,status',
                    'items.asset.category:id,name,code',
                    'items.asset.model:id,name,brand_id',
                    'items.asset.model.brand:id,name',
                    'items.component:id,code,serial_number,type_id,brand_id,model,warehouse_id,condition,status',
                    'items.component.type:id,name,code',
                    'items.component.brand:id,name',
                ]);
            }
        }

        // Asegurar SIEMPRE (cualquier estado del conteo) que los ítems tienen status/condición del bien
        $inventory_count->loadMissing([
            'items.asset:id,code,serial_number,category_id,model_id,warehouse_id,condition,status',
            'items.asset.category:id,name,code',
            'items.asset.model:id,name,brand_id',
            'items.asset.model.brand:id,name',
            'items.component:id,code,serial_number,type_id,brand_id,model,warehouse_id,condition,status',
            'items.component.type:id,name,code',
            'items.component.brand:id,name',
        ]);

        $items = $inventory_count->items->map(function (InventoryCountItem $item) {
            $asset = $item->asset;
            $component = $item->component;

            $labelParts = [];
            if ($asset) {
                $labelParts[] = $asset->code;
                $labelParts[] = $asset->category?->name;
                $labelParts[] = $asset->model?->brand?->name;
                $labelParts[] = $asset->model?->name;
                $labelParts[] = $asset->serial_number;
            } elseif ($component) {
                $labelParts[] = $component->code;
                $labelParts[] = $component->type?->name;
                $labelParts[] = $component->brand?->name;
                $labelParts[] = $component->model;
                $labelParts[] = $component->serial_number;
            }
            $label = implode(' · ', array_filter($labelParts)) ?: '—';

            $status = 'pending';
            if ($item->counted_quantity > 0) {
                $status = $item->difference === 0 ? 'counted' : 'difference';
            }

            $conditionOriginal = $asset?->condition ?? $component?->condition;

            $lifecycleStatus = $asset?->status ?? $component?->status ?? null;
            $lifecycleStatusLabel = match ($lifecycleStatus) {
                'stored' => 'Almacenado',
                'active' => 'En uso',
                'in_repair' => 'En reparación',
                'in_transit' => 'En tránsito',
                'disposed' => 'Dado de baja',
                'sold' => 'Vendido',
                null, '' => '—',
                default => $lifecycleStatus,
            };

            return [
                'id' => $item->id,
                'label' => $label,
                'expected_quantity' => $item->expected_quantity,
                'counted_quantity' => $item->counted_quantity,
                'difference' => $item->difference,
                'status' => $status,
                'lifecycle_status' => $lifecycleStatusLabel,
                'notes' => $item->notes,
                'condition_original' => $conditionOriginal,
                'condition_at_count' => $item->condition_at_count,
                'condition' => $item->condition_at_count ?? $conditionOriginal,
            ];
        });

        $summary = [
            'total_items' => $items->count(),
            'counted_items' => $items->where('counted_quantity', '>', 0)->count(),
            'with_difference' => $items->where('difference', '!=', 0)->count(),
            'pending_items' => $items->where('counted_quantity', '=', 0)->count(),
        ];

        return Inertia::render('admin/inventory-counts/show', [
            'count' => [
                'id' => $inventory_count->id,
                'count_date' => $inventory_count->count_date,
                'status' => $inventory_count->status,
                'warehouse' => $inventory_count->warehouse,
                'reconciled_at' => $inventory_count->reconciled_at,
                'reconciled_by' => $inventory_count->reconciledBy,
            ],
            'items' => $items,
            'summary' => $summary,
            'scannedItemId' => session('scanned_item_id'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'warehouse_id' => ['required', 'uuid', 'exists:warehouses,id'],
            'count_date' => ['required', 'date'],
        ]);

        /** @var \App\Models\User|null $user */
        $user = $request->user();
        [$allowedOfficeIds, $allowedZonalIds] = UserGeographicAccess::forUser($user);
        if ($user?->hasRole('superadmin', 'web')) {
            $allowedOfficeIds = [];
            $allowedZonalIds = [];
        }

        if (! empty($allowedOfficeIds)) {
            Warehouse::query()
                ->where('id', $data['warehouse_id'])
                ->whereIn('office_id', $allowedOfficeIds)
                ->firstOrFail();
        } elseif (! empty($allowedZonalIds)) {
            Warehouse::query()
                ->where('id', $data['warehouse_id'])
                ->whereHas('office', fn (Builder $o) => $o->whereIn('zonal_id', $allowedZonalIds))
                ->firstOrFail();
        }

        $inventoryCount = InventoryCount::create([
            'warehouse_id' => $data['warehouse_id'],
            'count_date' => $data['count_date'],
            'status' => 'in_progress',
        ]);

        $warehouseId = $inventoryCount->warehouse_id;

        $assets = Asset::query()
            ->where('warehouse_id', $warehouseId)
            ->get(['id', 'condition']);

        foreach ($assets as $asset) {
            InventoryCountItem::create([
                'inventory_count_id' => $inventoryCount->id,
                'asset_id' => $asset->id,
                'component_id' => null,
                'expected_quantity' => 1,
                'counted_quantity' => 0,
                'difference' => 0,
                'condition_at_count' => $asset->condition,
            ]);
        }

        $components = Component::query()
            ->where('warehouse_id', $warehouseId)
            ->get(['id', 'condition']);

        foreach ($components as $component) {
            InventoryCountItem::create([
                'inventory_count_id' => $inventoryCount->id,
                'asset_id' => null,
                'component_id' => $component->id,
                'expected_quantity' => 1,
                'counted_quantity' => 0,
                'difference' => 0,
                'condition_at_count' => $component->condition,
            ]);
        }

        return redirect()->route('admin.inventory-counts.index')
            ->with('toast', [
                'type' => 'success',
                'message' => 'Conteo creado correctamente. Se cargaron '.($assets->count() + $components->count()).' ítems del almacén.',
            ]);
    }

    public function scan(Request $request, InventoryCount $inventory_count): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:100'],
        ]);

        $code = $this->cleanString($data['code']);

        $inventory_count->loadMissing('warehouse:id');
        $warehouseId = $inventory_count->warehouse_id;

        $asset = Asset::query()
            ->where('warehouse_id', $warehouseId)
            ->where(function (Builder $q) use ($code) {
                $q->where('code', $code)->orWhere('serial_number', $code);
            })
            ->first();

        $component = null;
        if (! $asset) {
            $component = Component::query()
                ->where('warehouse_id', $warehouseId)
                ->where(function (Builder $q) use ($code) {
                    $q->where('code', $code)->orWhere('serial_number', $code);
                })
                ->first();
        }

        if (! $asset && ! $component) {
            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => 'No se encontró ningún activo o componente con este código en el almacén del conteo.',
            ]);
        }

        $item = InventoryCountItem::query()->firstOrNew([
            'inventory_count_id' => $inventory_count->id,
            'asset_id' => $asset?->id,
            'component_id' => $component?->id,
        ]);

        if (! $item->exists) {
            $item->expected_quantity = 1;
            $item->counted_quantity = 0;
            $item->difference = 0;
            $item->condition_at_count = $asset?->condition ?? $component?->condition;
            $item->save();
        } elseif ($item->expected_quantity !== null && $item->counted_quantity >= $item->expected_quantity) {
            return redirect()
                ->route('admin.inventory-counts.show', $inventory_count)
                ->with('toast', [
                    'type' => 'error',
                    'message' => 'Ya se alcanzó la cantidad esperada para este bien en el conteo.',
                ]);
        }

        return redirect()
            ->route('admin.inventory-counts.show', $inventory_count)
            ->with('toast', [
                'type' => 'info',
                'message' => 'Bien encontrado. Revisa y confirma el conteo en el detalle.',
            ])
            ->with('scanned_item_id', $item->id);
    }

    public function updateItem(Request $request, InventoryCount $inventory_count, InventoryCountItem $inventory_count_item): RedirectResponse
    {
        abort_unless($inventory_count_item->inventory_count_id === $inventory_count->id, 404);

        $data = $request->validate([
            'counted_quantity' => ['required', 'integer', 'min:0'],
            'notes' => ['nullable', 'string'],
            'condition_at_count' => ['nullable', 'string', 'max:40'],
        ]);

        if ($data['counted_quantity'] > $inventory_count_item->expected_quantity) {
            return redirect()
                ->route('admin.inventory-counts.show', $inventory_count)
                ->withErrors([
                    'counted_quantity' => 'La cantidad contada no puede ser mayor que la cantidad esperada ('.$inventory_count_item->expected_quantity.').',
                ]);
        }

        $inventory_count_item->counted_quantity = $data['counted_quantity'];
        $inventory_count_item->difference = $inventory_count_item->counted_quantity - (int) $inventory_count_item->expected_quantity;
        $inventory_count_item->notes = $this->cleanString($data['notes'] ?? '');
        if ($inventory_count_item->notes === '') {
            $inventory_count_item->notes = null;
        }
        $inventory_count_item->condition_at_count = $this->cleanString($data['condition_at_count'] ?? '');
        if ($inventory_count_item->condition_at_count === '') {
            $inventory_count_item->condition_at_count = null;
        }
        $inventory_count_item->save();

        return redirect()
            ->route('admin.inventory-counts.show', $inventory_count)
            ->with('toast', [
                'type' => 'success',
                'message' => 'Ítem de conteo actualizado.',
            ]);
    }

    public function reconcile(Request $request, InventoryCount $inventory_count): RedirectResponse
    {
        if ($inventory_count->status !== 'in_progress') {
            return redirect()
                ->route('admin.inventory-counts.index')
                ->with('toast', [
                    'type' => 'info',
                    'message' => $inventory_count->status === 'reconciled'
                        ? 'El conteo ya está reconciliado.'
                        : 'Solo se puede reconciliar un conteo en progreso.',
                ]);
        }

        if ($inventory_count->items()->count() === 0) {
            abort(422, 'No se puede reconciliar un conteo sin ítems.');
        }

        $inventory_count->status = 'reconciled';
        $inventory_count->reconciled_at = now();
        $inventory_count->reconciled_by = $request->user()?->id;
        $inventory_count->save();

        return redirect()
            ->route('admin.inventory-counts.index')
            ->with('toast', [
                'type' => 'success',
                'message' => 'Conteo reconciliado correctamente.',
            ]);
    }

    public function close(InventoryCount $inventory_count): RedirectResponse
    {
        if ($inventory_count->status !== 'reconciled') {
            return redirect()
                ->route('admin.inventory-counts.index')
                ->with('toast', [
                    'type' => 'info',
                    'message' => $inventory_count->status === 'closed'
                        ? 'El conteo ya está cerrado.'
                        : 'Solo se puede cerrar un conteo reconciliado.',
                ]);
        }

        $inventory_count->status = 'closed';
        $inventory_count->save();

        return redirect()
            ->route('admin.inventory-counts.index')
            ->with('toast', [
                'type' => 'success',
                'message' => 'Conteo cerrado correctamente.',
            ]);
    }

    public function export(Request $request, InventoryCount $inventory_count): BinaryFileResponse
    {
        /** @var \App\Models\User|null $authUser */
        $authUser = $request->user();
        if ($authUser && ! $authUser->hasRole('superadmin', 'web')) {
            [$allowedOfficeIds, $allowedZonalIds] = UserGeographicAccess::forUser($authUser);
            $inventory_count->loadMissing('warehouse.office');
            $officeId = $inventory_count->warehouse?->office_id;

            if (! empty($allowedOfficeIds)) {
                if (! $officeId || ! in_array($officeId, $allowedOfficeIds, true)) {
                    abort(403);
                }
            } elseif (! empty($allowedZonalIds)) {
                $zonalId = $inventory_count->warehouse?->office?->zonal_id;
                if (! $zonalId || ! in_array($zonalId, $allowedZonalIds, true)) {
                    abort(403);
                }
            } else {
                abort(403);
            }
        }

        $slug = $inventory_count->count_date?->format('Y-m-d') ?? $inventory_count->id;
        $filename = 'inventario-fisico-'.$slug.'.xlsx';

        return Excel::download(
            new InventoryCountExport($inventory_count),
            $filename,
            \Maatwebsite\Excel\Excel::XLSX
        );
    }

    public function destroy(InventoryCount $inventory_count): RedirectResponse
    {
        if ($inventory_count->status !== 'in_progress') {
            abort(422, 'Solo se puede eliminar un conteo en estado en progreso.');
        }

        $inventory_count->delete();

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Conteo eliminado.',
        ]);
    }

    private function formPayload(array $allowedZonalIds = [], array $allowedOfficeIds = []): array
    {
        $zonalsForSelect = Zonal::query()
            ->where('is_active', true)
            ->when(! empty($allowedZonalIds), fn (Builder $q) => $q->whereIn('id', $allowedZonalIds))
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        $officesForSelect = Office::query()
            ->where('is_active', true)
            ->when(! empty($allowedOfficeIds), fn (Builder $q) => $q->whereIn('id', $allowedOfficeIds))
            ->when(empty($allowedOfficeIds) && ! empty($allowedZonalIds), fn (Builder $q) => $q->whereIn('zonal_id', $allowedZonalIds))
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'zonal_id']);

        $warehousesForSelect = Warehouse::query()
            ->where('is_active', true)
            ->when(! empty($allowedOfficeIds), fn (Builder $q) => $q->whereIn('office_id', $allowedOfficeIds))
            ->when(empty($allowedOfficeIds) && ! empty($allowedZonalIds), function (Builder $q) use ($allowedZonalIds) {
                $q->whereHas('office', fn (Builder $o) => $o->whereIn('zonal_id', $allowedZonalIds));
            })
            ->with('office:id,name,code,zonal_id', 'office.zonal:id,name,code')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'office_id']);

        return [
            'zonalsForSelect' => $zonalsForSelect,
            'officesForSelect' => $officesForSelect,
            'warehousesForSelect' => $warehousesForSelect,
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
