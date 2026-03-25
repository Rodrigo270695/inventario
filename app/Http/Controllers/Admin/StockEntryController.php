<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\AssetBrand;
use App\Models\AssetCategory;
use App\Models\AssetModel;
use App\Models\AssetSubcategory;
use App\Models\Component;
use App\Models\ComponentType;
use App\Models\Invoice;
use App\Models\PurchaseItem;
use App\Models\StockEntry;
use App\Models\StockEntryItem;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\Zonal;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class StockEntryController extends Controller
{
    private const VALID_SORT = ['entry_date', 'status', 'created_at'];

    private const VALID_ORDER = ['asc', 'desc'];

    private const PER_PAGE_OPTIONS = [5, 10, 15, 25, 50, 100];

    public function index(Request $request): Response
    {
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $perPage = (int) $request->input('per_page', 25);
        $q = $request->input('q', '');
        $q = ($q === null || $q === 'null') ? '' : trim((string) $q);
        $status = $request->input('status', '');
        $status = ($status === null || $status === 'null') ? '' : trim((string) $status);
        $warehouseId = $request->input('warehouse_id', '');
        $warehouseId = ($warehouseId === null || $warehouseId === 'null') ? '' : trim((string) $warehouseId);
        $dateFrom = $request->input('date_from', '');
        $dateFrom = ($dateFrom === null || $dateFrom === 'null') ? '' : trim((string) $dateFrom);
        $dateTo = $request->input('date_to', '');
        $dateTo = ($dateTo === null || $dateTo === 'null') ? '' : trim((string) $dateTo);

        if ($dateFrom === '' && $dateTo === '') {
            $dateFrom = now()->startOfMonth()->format('Y-m-d');
            $dateTo = now()->endOfMonth()->format('Y-m-d');
        }

        if (! in_array($sortBy, self::VALID_SORT, true)) {
            $sortBy = 'created_at';
        }
        if (! in_array($sortOrder, self::VALID_ORDER, true)) {
            $sortOrder = 'desc';
        }
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = 25;
        }

        $user = $request->user();
        $canView = $user?->can('stock_entries.view') ?? false;
        $canItemCreate = $user?->can('stock_entries.items.create') ?? false;
        $canItemUpdate = $user?->can('stock_entries.items.update') ?? false;
        $canItemDelete = $user?->can('stock_entries.items.delete') ?? false;
        $canSave = $user?->can('stock_entries.save') ?? false;
        if (! $canView && ! $canItemCreate && ! $canItemUpdate && ! $canItemDelete && ! $canSave) {
            abort(403);
        }

        $query = StockEntry::query()
            ->withCount('items')
            ->with([
                'invoice:id,invoice_number,purchase_order_id',
                'invoice.purchaseOrder:id,code',
                'warehouse:id,office_id,name,code',
                'warehouse.office:id,zonal_id,name,code',
                'warehouse.office.zonal:id,name,code',
                'receivedByUser:id,name,last_name,usuario',
                'registeredByUser:id,name,last_name,usuario',
            ]);

        if ($q !== '') {
            $term = '%'.mb_strtolower($q).'%';
            $query->where(function ($qb) use ($term) {
                $qb->whereHas('invoice', function ($inv) use ($term) {
                    $inv->whereRaw('LOWER(COALESCE(invoice_number, \'\')) LIKE ?', [$term]);
                })
                    ->orWhereHas('warehouse', function ($w) use ($term) {
                        $w->whereRaw('LOWER(COALESCE(name, \'\')) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(code, \'\')) LIKE ?', [$term]);
                    })
                    ->orWhereHas('warehouse.office', function ($o) use ($term) {
                        $o->whereRaw('LOWER(COALESCE(name, \'\')) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(code, \'\')) LIKE ?', [$term]);
                    })
                    ->orWhereHas('warehouse.office.zonal', function ($z) use ($term) {
                        $z->whereRaw('LOWER(COALESCE(name, \'\')) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(code, \'\')) LIKE ?', [$term]);
                    })
                    ->orWhereHas('receivedByUser', function ($u) use ($term) {
                        $u->whereRaw('LOWER(COALESCE(name, \'\')) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(last_name, \'\')) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(usuario, \'\')) LIKE ?', [$term]);
                    })
                    ->orWhereHas('registeredByUser', function ($u) use ($term) {
                        $u->whereRaw('LOWER(COALESCE(name, \'\')) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(last_name, \'\')) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(usuario, \'\')) LIKE ?', [$term]);
                    });
            });
        }

        if ($status !== '') {
            $query->where('status', $status);
        }

        if ($warehouseId !== '') {
            $query->where('warehouse_id', $warehouseId);
        }

        $from = \Carbon\Carbon::parse($dateFrom)->startOfDay();
        $to = \Carbon\Carbon::parse($dateTo)->endOfDay();
        $query->where('entry_date', '>=', $from->toDateString())->where('entry_date', '<=', $to->toDateString());

        $query->orderBy($sortBy, $sortOrder);

        $entries = $query->paginate($perPage)->withQueryString();

        $baseQuery = StockEntry::query()
            ->where('entry_date', '>=', $from->toDateString())
            ->where('entry_date', '<=', $to->toDateString());
        if ($status !== '') {
            $baseQuery->where('status', $status);
        }
        if ($warehouseId !== '') {
            $baseQuery->where('warehouse_id', $warehouseId);
        }
        $totalCount = (clone $baseQuery)->count();
        $draftCount = (clone $baseQuery)->where('status', 'draft')->count();

        $warehousesForFilter = Warehouse::query()
            ->with('office:id,zonal_id,name,code', 'office.zonal:id,name,code')
            ->orderBy('name')
            ->select(['id', 'office_id', 'name', 'code'])
            ->get();

        $payload = [
            'stockEntries' => $entries,
            'warehousesForFilter' => $warehousesForFilter,
            'canView' => $canView,
            'canCreate' => $user?->can('stock_entries.create') ?? false,
            'canItemCreate' => $canItemCreate,
            'canItemUpdate' => $canItemUpdate,
            'canItemDelete' => $canItemDelete,
            'canSave' => $canSave,
            'canDelete' => $user?->can('stock_entries.delete') ?? false,
            'filters' => [
                'q' => $q,
                'status' => $status,
                'warehouse_id' => $warehouseId,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => $totalCount,
                'draft' => $draftCount,
            ],
        ];

        if ($payload['canCreate']) {
            $invoicesQuery = Invoice::query()
                ->with([
                    'purchaseOrder:id,code,office_id',
                    'purchaseOrder.office:id,zonal_id,name,code',
                    'purchaseOrder.office.zonal:id,name,code',
                ])
                ->whereNotNull('purchase_order_id')
                ->whereNotIn('id', StockEntry::query()->whereNotNull('invoice_id')->pluck('invoice_id'))
                ->orderByDesc('created_at');
            $payload['invoicesForCreate'] = $invoicesQuery->get(['id', 'invoice_number', 'purchase_order_id']);
            $users = User::query()
                ->assignable()
                ->with('zonals:id')
                ->orderBy('name')
                ->get(['id', 'name', 'last_name', 'usuario']);
            $managerZonalIds = Zonal::query()->whereIn('manager_id', $users->pluck('id'))->get(['id', 'manager_id']);
            $payload['usersForCreate'] = $users->map(function ($u) use ($managerZonalIds) {
                $fromPivot = $u->zonals->pluck('id')->all();
                $fromManager = $managerZonalIds->where('manager_id', $u->id)->pluck('id')->all();
                $zonalIds = array_values(array_unique(array_merge($fromPivot, $fromManager)));

                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'last_name' => $u->last_name,
                    'usuario' => $u->usuario,
                    'zonal_ids' => $zonalIds,
                ];
            })->all();
        }

        return Inertia::render('admin/stock-entries/index', $payload);
    }

    public function items(Request $request, StockEntry $stock_entry): Response
    {
        $user = $request->user();
        $canView = $user?->can('stock_entries.view') ?? false;
        $canItemCreate = $user?->can('stock_entries.items.create') ?? false;
        $canItemUpdate = $user?->can('stock_entries.items.update') ?? false;
        $canItemDelete = $user?->can('stock_entries.items.delete') ?? false;
        $canSave = $user?->can('stock_entries.save') ?? false;
        if (! $canView && ! $canItemCreate && ! $canItemUpdate && ! $canItemDelete && ! $canSave) {
            abort(403);
        }
        $stock_entry->load([
            'warehouse:id,office_id,name,code',
            'warehouse.office:id,zonal_id,name,code',
            'warehouse.office.zonal:id,name,code',
            'invoice:id,invoice_number,purchase_order_id',
            'invoice.purchaseOrder:id,code',
            'items' => fn ($q) => $q->with([
                'purchaseItem:id,purchase_order_id,description,quantity,asset_category_id,asset_subcategory_id,asset_brand_id',
                'purchaseItem.assetCategory:id,name,code,type',
                'purchaseItem.assetSubcategory:id,asset_category_id,name,code',
                'purchaseItem.assetBrand:id,name',
                'asset:id,code,serial_number,category_id,model_id,warehouse_id,status,condition',
                'asset.category:id,name,code,type',
                'asset.model:id,name,subcategory_id,brand_id',
                'asset.model.brand:id,name',
                'component:id,code,serial_number,type_id,brand_id,subcategory_id,model,warehouse_id,status,condition',
                'component.type:id,name,code',
                'component.brand:id,name',
                'component.subcategory:id,asset_category_id,name,code',
            ]),
            'receivedByUser:id,name,last_name,usuario',
            'registeredByUser:id,name,last_name,usuario',
        ]);
        $draftItems = $stock_entry->status === 'draft'
            ? $this->getDraftItemsFromSession($request, $stock_entry)
            : [];
        $entryArray = $stock_entry->toArray();
        $entryArray['received_by_user'] = $stock_entry->receivedByUser?->only(['id', 'name', 'last_name', 'usuario']);
        $entryArray['registered_by_user'] = $stock_entry->registeredByUser?->only(['id', 'name', 'last_name', 'usuario']);

        $purchaseOrderItems = [];
        if ($stock_entry->invoice?->purchase_order_id) {
            $purchaseItemsCollection = PurchaseItem::query()
                ->with('assetCategory:id,name,code,type')
                ->with('assetSubcategory:id,asset_category_id,name,code')
                ->with('assetBrand:id,name')
                ->where('purchase_order_id', $stock_entry->invoice->purchase_order_id)
                ->orderBy('id')
                ->get(['id', 'purchase_order_id', 'description', 'quantity', 'unit_price', 'total_price', 'asset_category_id', 'asset_subcategory_id', 'asset_brand_id']);

            $draftCountByPurchaseItem = collect($draftItems)
                ->groupBy('purchase_item_id')
                ->map(fn ($rows) => count($rows));

            $purchaseOrderItems = $purchaseItemsCollection
                ->map(function (PurchaseItem $item) use ($stock_entry, $draftCountByPurchaseItem) {
                    $registeredQuantity = (int) $stock_entry->items
                        ->where('purchase_item_id', $item->id)
                        ->sum('quantity') + (int) ($draftCountByPurchaseItem->get($item->id) ?? 0);
                    $remainingQuantity = max(((int) $item->quantity) - $registeredQuantity, 0);

                    return [
                        'id' => $item->id,
                        'purchase_order_id' => $item->purchase_order_id,
                        'description' => $item->description,
                        'quantity' => (int) $item->quantity,
                        'unit_price' => $item->unit_price,
                        'total_price' => $item->total_price,
                        'asset_category_id' => $item->asset_category_id,
                        'asset_subcategory_id' => $item->asset_subcategory_id,
                        'asset_brand_id' => $item->asset_brand_id,
                        'asset_category' => $item->assetCategory?->only(['id', 'name', 'code', 'type']),
                        'asset_subcategory' => $item->assetSubcategory?->only(['id', 'asset_category_id', 'name', 'code']),
                        'asset_brand' => $item->assetBrand?->only(['id', 'name']),
                        'registered_quantity' => $registeredQuantity,
                        'remaining_quantity' => $remainingQuantity,
                    ];
                })
                ->filter(fn (array $item) => $item['remaining_quantity'] > 0)
                ->values()
                ->all();

            $purchaseItemsById = $purchaseItemsCollection->keyBy('id');
            $draftRows = collect($draftItems)->map(function (array $draftItem) use ($purchaseItemsById, $stock_entry) {
                /** @var PurchaseItem|null $purchaseItem */
                $purchaseItem = $purchaseItemsById->get($draftItem['purchase_item_id']);

                return [
                    'id' => $draftItem['id'],
                    'stock_entry_id' => $stock_entry->id,
                    'purchase_item_id' => $draftItem['purchase_item_id'],
                    'quantity' => 1,
                    'condition' => $draftItem['condition'],
                    'is_draft' => true,
                    'draft_payload' => $draftItem,
                    'purchase_item' => $purchaseItem ? [
                        'id' => $purchaseItem->id,
                        'description' => $purchaseItem->description,
                        'quantity' => (int) $purchaseItem->quantity,
                        'asset_category' => $purchaseItem->assetCategory?->only(['id', 'name', 'code']),
                        'asset_subcategory' => $purchaseItem->assetSubcategory?->only(['id', 'asset_category_id', 'name', 'code']),
                        'asset_brand' => $purchaseItem->assetBrand?->only(['id', 'name']),
                    ] : null,
                ];
            })->all();

            $persistedRows = collect($stock_entry->items)->map(function (StockEntryItem $item) {
                $row = $item->toArray();
                $row['is_draft'] = false;

                return $row;
            })->all();

            $entryArray['items'] = array_values(array_merge($draftRows, $persistedRows));
        }

        return Inertia::render('admin/stock-entries/items', [
            'stockEntry' => $entryArray,
            'purchaseOrderItems' => $purchaseOrderItems,
            'brandsForSelect' => AssetBrand::query()->orderBy('name')->get(['id', 'name']),
            'subcategoriesForSelect' => AssetSubcategory::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'asset_category_id', 'name', 'code']),
            'modelsForSelect' => AssetModel::query()
                ->where('is_active', true)
                ->with('brand:id,name')
                ->orderBy('name')
                ->get(['id', 'subcategory_id', 'name', 'brand_id']),
            'canItemCreate' => $canItemCreate,
            'canItemUpdate' => $canItemUpdate,
            'canItemDelete' => $canItemDelete,
            'canSave' => $canSave && $stock_entry->status === 'draft',
            'usersForConfirm' => [],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        if (! $request->user()?->can('stock_entries.create')) {
            abort(403);
        }
        $validated = $request->validate([
            'invoice_id' => ['required', 'uuid', 'exists:invoices,id'],
            'warehouse_id' => ['required', 'uuid', 'exists:warehouses,id'],
            'entry_date' => ['required', 'date'],
            'received_by' => ['nullable', 'uuid', 'exists:users,id'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ], [
            'invoice_id.required' => 'La factura es obligatoria.',
            'warehouse_id.required' => 'El almacén es obligatorio.',
            'entry_date.required' => 'La fecha de ingreso es obligatoria.',
        ], [
            'invoice_id' => 'factura',
            'warehouse_id' => 'almacén',
            'entry_date' => 'fecha de ingreso',
            'received_by' => 'recibido por',
            'notes' => 'notas',
        ]);

        $invoice = Invoice::query()
            ->withoutGlobalScopes()
            ->with(['purchaseOrder' => fn ($q) => $q->withoutGlobalScopes()])
            ->find($validated['invoice_id']);

        if (! $invoice) {
            throw ValidationException::withMessages(['invoice_id' => 'La factura no existe o no tiene permiso para usarla.']);
        }

        if (! $invoice->purchase_order_id) {
            throw ValidationException::withMessages(['invoice_id' => 'La factura no tiene orden de compra asociada.']);
        }

        if (StockEntry::query()->where('invoice_id', $validated['invoice_id'])->exists()) {
            throw ValidationException::withMessages(['invoice_id' => 'Esta factura ya tiene un ingreso registrado.']);
        }

        StockEntry::create([
            'warehouse_id' => $validated['warehouse_id'],
            'entry_date' => $validated['entry_date'],
            'invoice_id' => $validated['invoice_id'],
            'received_by' => $validated['received_by'] ?? null,
            'registered_by' => $request->user()?->id,
            'notes' => $validated['notes'] ?? null,
            'status' => 'draft',
        ]);

        return redirect()->route('admin.stock-entries.index')->with('toast', ['type' => 'success', 'message' => 'Ingreso creado correctamente.']);
    }

    public function destroy(Request $request, StockEntry $stock_entry): RedirectResponse
    {
        if (! $request->user()?->can('stock_entries.delete')) {
            abort(403);
        }
        if ($stock_entry->status !== 'draft') {
            abort(403, 'Solo se pueden eliminar ingresos en estado borrador.');
        }
        $stock_entry->delete();

        return redirect()->route('admin.stock-entries.index')->with('toast', ['type' => 'success', 'message' => 'Ingreso eliminado.']);
    }

    public function storeItem(Request $request, StockEntry $stock_entry): RedirectResponse
    {
        if (! $request->user()?->can('stock_entries.items.create')) {
            abort(403);
        }
        if ($stock_entry->status !== 'draft') {
            abort(403, 'Solo se pueden agregar ítems a ingresos en borrador.');
        }
        $validated = $this->validateDraftItem($request);
        $purchaseItem = $this->resolveDraftPurchaseItem($stock_entry, $validated['purchase_item_id']);
        $draftItems = $this->getDraftItemsFromSession($request, $stock_entry);

        $this->ensureDraftCapacity($stock_entry, $purchaseItem, $draftItems);

        $draftItems[] = $this->buildDraftItemPayload($validated);
        $this->putDraftItemsInSession($request, $stock_entry, $draftItems);

        return redirect()->route('admin.stock-entries.items', $stock_entry)->with('toast', ['type' => 'success', 'message' => 'Ítem agregado al borrador del ingreso.']);
    }

    public function updateItem(Request $request, StockEntry $stock_entry, string $draft_item_id): RedirectResponse
    {
        if (! $request->user()?->can('stock_entries.items.update')) {
            abort(403);
        }
        if ($stock_entry->status !== 'draft') {
            abort(403, 'Solo se pueden editar ítems de ingresos en borrador.');
        }

        $draftItems = $this->getDraftItemsFromSession($request, $stock_entry);
        $draftIndex = $this->findDraftItemIndex($draftItems, $draft_item_id);
        if ($draftIndex === null) {
            abort(404, 'El ítem temporal no existe.');
        }

        $validated = $this->validateDraftItem($request);
        $purchaseItem = $this->resolveDraftPurchaseItem($stock_entry, $validated['purchase_item_id']);
        $this->ensureDraftCapacity($stock_entry, $purchaseItem, $draftItems, $draft_item_id);

        $draftItems[$draftIndex] = $this->buildDraftItemPayload($validated, $draft_item_id);
        $this->putDraftItemsInSession($request, $stock_entry, $draftItems);

        return redirect()->route('admin.stock-entries.items', $stock_entry)->with('toast', ['type' => 'success', 'message' => 'Ítem del borrador actualizado.']);
    }

    public function save(Request $request, StockEntry $stock_entry): RedirectResponse
    {
        if (! $request->user()?->can('stock_entries.save')) {
            abort(403);
        }
        if ($stock_entry->status !== 'draft') {
            abort(403, 'Solo se puede guardar un ingreso en borrador.');
        }

        $draftItems = $this->getDraftItemsFromSession($request, $stock_entry);
        $hasPersistedItems = StockEntryItem::query()->where('stock_entry_id', $stock_entry->id)->exists();
        if ($draftItems === [] && ! $hasPersistedItems) {
            throw ValidationException::withMessages([
                'items' => 'Debe registrar al menos un ítem antes de guardar el ingreso.',
            ]);
        }

        if ($draftItems !== []) {
            $stock_entry->load('invoice');
            $poId = $stock_entry->invoice?->purchase_order_id;
            $purchaseItems = PurchaseItem::query()
                ->with([
                    'assetCategory:id,name,code,type',
                    'assetSubcategory:id,asset_category_id,name,code',
                    'assetBrand:id,name',
                ])
                ->whereIn('id', collect($draftItems)->pluck('purchase_item_id')->unique()->values())
                ->get()
                ->keyBy('id');

            DB::transaction(function () use ($request, $stock_entry, $draftItems, $purchaseItems, $poId) {
                foreach ($draftItems as $draftItem) {
                    /** @var PurchaseItem|null $purchaseItem */
                    $purchaseItem = $purchaseItems->get($draftItem['purchase_item_id']);

                    if (! $purchaseItem || $purchaseItem->purchase_order_id !== $poId) {
                        throw ValidationException::withMessages([
                            'items' => 'Uno de los ítems temporales ya no pertenece a la orden de compra del ingreso.',
                        ]);
                    }

                    $asset = $this->createAssetFromStockEntry($request, $stock_entry, $purchaseItem, $draftItem);

                    StockEntryItem::create([
                        'stock_entry_id' => $stock_entry->id,
                        'purchase_item_id' => $purchaseItem->id,
                        'asset_id' => $asset->id,
                        'quantity' => 1,
                        'condition' => $draftItem['condition'],
                    ]);
                }

                $stock_entry->update(['status' => 'completed']);
            });

            $request->session()->forget($this->draftItemsSessionKey($stock_entry));
        } else {
            $stock_entry->update(['status' => 'completed']);
        }

        return redirect()->route('admin.stock-entries.index')->with('toast', ['type' => 'success', 'message' => 'Ingreso guardado y completado correctamente.']);
    }

    public function destroyItem(Request $request, StockEntry $stock_entry, string $draft_item_id): RedirectResponse
    {
        if (! $request->user()?->can('stock_entries.items.delete')) {
            abort(403);
        }
        if ($stock_entry->status !== 'draft') {
            abort(403, 'Solo se pueden eliminar ítems de ingresos en borrador.');
        }

        $draftItems = $this->getDraftItemsFromSession($request, $stock_entry);
        $draftIndex = $this->findDraftItemIndex($draftItems, $draft_item_id);
        if ($draftIndex === null) {
            abort(404, 'El ítem temporal no existe.');
        }

        array_splice($draftItems, $draftIndex, 1);
        $this->putDraftItemsInSession($request, $stock_entry, $draftItems);

        return redirect()->route('admin.stock-entries.items', $stock_entry)->with('toast', ['type' => 'success', 'message' => 'Ítem eliminado del borrador.']);
    }

    private function validateDraftItem(Request $request): array
    {
        return $request->validate([
            'purchase_item_id' => ['required', 'uuid', 'exists:purchase_items,id'],
            'is_technological' => ['nullable', 'boolean'],
            'condition' => ['required', 'string', 'in:new,good,regular,damaged,obsolete'],
            'registration_kind' => ['nullable', 'string', 'in:asset,component'],
            'serial_number' => ['nullable', 'string', 'max:200'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'model_id' => ['nullable', 'uuid', 'exists:asset_models,id'],
            'brand_id' => ['nullable', 'uuid', 'exists:asset_brands,id'],
            'new_brand_name' => ['nullable', 'string', 'max:100'],
            'model_name' => ['nullable', 'string', 'max:200'],
            'subcategory_id' => ['nullable', 'uuid', 'exists:asset_subcategories,id'],
            'component_type_id' => ['nullable', 'uuid', 'exists:component_types,id'],
            'warranty_until' => ['nullable', 'date'],
            'acquisition_value' => ['nullable', 'numeric', 'min:0'],
            'current_value' => ['nullable', 'numeric', 'min:0'],
            'depreciation_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'specs' => ['nullable', 'array'],
        ], [], [
            'purchase_item_id' => 'ítem',
            'is_technological' => 'indicador tecnológico',
            'condition' => 'condición',
            'registration_kind' => 'tipo de registro',
            'serial_number' => 'número de serie',
            'notes' => 'notas',
            'model_id' => 'modelo',
            'brand_id' => 'marca',
            'new_brand_name' => 'nueva marca',
            'model_name' => 'nombre del modelo',
            'subcategory_id' => 'subcategoría',
            'component_type_id' => 'tipo de componente',
            'warranty_until' => 'garantía hasta',
            'acquisition_value' => 'valor de adquisición',
            'current_value' => 'valor actual',
            'depreciation_rate' => 'tasa de depreciación',
            'specs' => 'especificaciones',
        ]);
    }

    private function resolveDraftPurchaseItem(StockEntry $stockEntry, string $purchaseItemId): PurchaseItem
    {
        $stockEntry->loadMissing('invoice');
        $poId = $stockEntry->invoice?->purchase_order_id;
        $purchaseItem = PurchaseItem::query()
            ->with([
                'assetCategory:id,name,code,type',
                'assetSubcategory:id,asset_category_id,name,code',
                'assetBrand:id,name',
            ])
            ->find($purchaseItemId);

        if (! $purchaseItem || $purchaseItem->purchase_order_id !== $poId) {
            abort(422, 'El ítem no pertenece a la orden de compra de la factura de este ingreso.');
        }

        return $purchaseItem;
    }

    private function ensureDraftCapacity(StockEntry $stockEntry, PurchaseItem $purchaseItem, array $draftItems, ?string $ignoreDraftItemId = null): void
    {
        $persistedQuantity = (int) StockEntryItem::query()
            ->where('stock_entry_id', $stockEntry->id)
            ->where('purchase_item_id', $purchaseItem->id)
            ->sum('quantity');

        $draftQuantity = collect($draftItems)
            ->filter(fn (array $item) => $item['purchase_item_id'] === $purchaseItem->id)
            ->reject(fn (array $item) => $ignoreDraftItemId !== null && $item['id'] === $ignoreDraftItemId)
            ->count();

        $remainingQuantity = max(((int) $purchaseItem->quantity) - $persistedQuantity - $draftQuantity, 0);
        if ($remainingQuantity < 1) {
            throw ValidationException::withMessages([
                'purchase_item_id' => 'Este ítem de la orden de compra ya fue registrado por completo en el ingreso.',
            ]);
        }
    }

    private function buildDraftItemPayload(array $validated, ?string $id = null): array
    {
        return [
            'id' => $id ?? (string) Str::uuid(),
            'purchase_item_id' => $validated['purchase_item_id'],
            'is_technological' => (bool) ($validated['is_technological'] ?? false),
            'condition' => $validated['condition'],
            'registration_kind' => $validated['registration_kind'] ?? 'asset',
            'serial_number' => $this->nullableTrimmed($validated['serial_number'] ?? null),
            'notes' => $this->nullableTrimmed($validated['notes'] ?? null),
            'model_id' => $validated['model_id'] ?? null,
            'brand_id' => $validated['brand_id'] ?? null,
            'new_brand_name' => $this->nullableTrimmed($validated['new_brand_name'] ?? null),
            'model_name' => $this->nullableTrimmed($validated['model_name'] ?? null),
            'subcategory_id' => $validated['subcategory_id'] ?? null,
            'component_type_id' => $validated['component_type_id'] ?? null,
            'warranty_until' => $validated['warranty_until'] ?? null,
            'acquisition_value' => $validated['acquisition_value'] ?? null,
            'current_value' => $validated['current_value'] ?? null,
            'depreciation_rate' => $validated['depreciation_rate'] ?? null,
            'specs' => $this->normalizeSpecs($validated['specs'] ?? null),
        ];
    }

    private function draftItemsSessionKey(StockEntry $stockEntry): string
    {
        return 'stock_entries.drafts.'.$stockEntry->id.'.items';
    }

    private function getDraftItemsFromSession(Request $request, StockEntry $stockEntry): array
    {
        $items = $request->session()->get($this->draftItemsSessionKey($stockEntry), []);

        return is_array($items) ? array_values($items) : [];
    }

    private function putDraftItemsInSession(Request $request, StockEntry $stockEntry, array $items): void
    {
        $request->session()->put($this->draftItemsSessionKey($stockEntry), array_values($items));
    }

    private function findDraftItemIndex(array $draftItems, string $draftItemId): ?int
    {
        foreach ($draftItems as $index => $item) {
            if (($item['id'] ?? null) === $draftItemId) {
                return $index;
            }
        }

        return null;
    }

    private function createAssetFromStockEntry(Request $request, StockEntry $stockEntry, PurchaseItem $purchaseItem, array $validated): Asset
    {
        $category = $purchaseItem->assetCategory;
        if (! $category) {
            throw ValidationException::withMessages([
                'purchase_item_id' => 'El ítem de compra no tiene categoría definida para registrar un activo.',
            ]);
        }

        $isTechnological = array_key_exists('is_technological', $validated)
            ? (bool) $validated['is_technological']
            : $this->isTechnologicalPurchaseItem($purchaseItem);

        $modelId = null;
        if ($isTechnological) {
            $subcategoryId = $purchaseItem->asset_subcategory_id ?: ($validated['subcategory_id'] ?? null);
            if (! $subcategoryId) {
                throw ValidationException::withMessages([
                    'subcategory_id' => 'La subcategoría es obligatoria para activos tecnológicos.',
                ]);
            }

            $modelId = $validated['model_id'] ?? null;
            if (! $modelId) {
                $modelName = trim((string) ($validated['model_name'] ?? ''));
                if ($modelName === '') {
                    throw ValidationException::withMessages([
                        'model_name' => 'Seleccione un modelo existente o indique el nombre del nuevo modelo.',
                    ]);
                }

                $brandId = $this->resolveBrandId($purchaseItem->asset_brand_id, $validated);
                $modelId = $this->resolveAssetModelId($brandId, $subcategoryId, $modelName);
            }
        }

        $modelRow = $modelId ? AssetModel::query()->find($modelId) : null;

        return Asset::create([
            'code' => $this->generateAssetCode($purchaseItem->asset_category_id),
            'serial_number' => $this->nullableTrimmed($validated['serial_number'] ?? null),
            'model_id' => $modelId,
            'brand_id' => $modelRow?->brand_id,
            'category_id' => $purchaseItem->asset_category_id,
            'purchase_item_id' => $purchaseItem->id,
            'status' => 'stored',
            'condition' => $validated['condition'],
            'warehouse_id' => $stockEntry->warehouse_id,
            'acquisition_value' => array_key_exists('acquisition_value', $validated)
                ? $validated['acquisition_value']
                : $this->resolveUnitValue($purchaseItem),
            'current_value' => array_key_exists('current_value', $validated)
                ? $validated['current_value']
                : $this->resolveUnitValue($purchaseItem),
            'depreciation_rate' => $validated['depreciation_rate'] ?? null,
            'warranty_until' => $validated['warranty_until'] ?? null,
            'specs' => $this->normalizeSpecs($validated['specs'] ?? null),
            'notes' => $this->nullableTrimmed($validated['notes'] ?? null),
            'registered_by_id' => $request->user()?->id,
            'updated_by_id' => $request->user()?->id,
        ]);
    }

    private function createComponentFromStockEntry(StockEntry $stockEntry, PurchaseItem $purchaseItem, array $validated): Component
    {
        $typeId = $validated['component_type_id'] ?? null;
        if (! $typeId) {
            throw ValidationException::withMessages([
                'component_type_id' => 'Debe seleccionar el tipo de componente.',
            ]);
        }

        $modelName = $this->nullableTrimmed($validated['model_name'] ?? null);
        $brandId = $this->resolveBrandId($purchaseItem->asset_brand_id, $validated, false);

        return Component::create([
            'code' => $this->generateComponentCode($typeId),
            'serial_number' => $this->nullableTrimmed($validated['serial_number'] ?? null),
            'type_id' => $typeId,
            'brand_id' => $brandId,
            'subcategory_id' => $purchaseItem->asset_subcategory_id ?: ($validated['subcategory_id'] ?? null),
            'model' => $modelName,
            'warehouse_id' => $stockEntry->warehouse_id,
            'status' => 'stored',
            'condition' => $validated['condition'],
            'purchase_item_id' => $purchaseItem->id,
            'notes' => $this->nullableTrimmed($validated['notes'] ?? null),
        ]);
    }

    private function resolveBrandId(?string $purchaseItemBrandId, array $validated, bool $requireBrandForNewModel = true): ?string
    {
        if ($purchaseItemBrandId) {
            return $purchaseItemBrandId;
        }

        $brandId = $validated['brand_id'] ?? null;
        if ($brandId) {
            return $brandId;
        }

        $newBrandName = trim((string) ($validated['new_brand_name'] ?? ''));
        if ($newBrandName !== '') {
            $existing = AssetBrand::query()
                ->whereRaw('LOWER(name) = ?', [mb_strtolower($newBrandName)])
                ->first();

            return $existing?->id ?? AssetBrand::create(['name' => $newBrandName])->id;
        }

        if ($requireBrandForNewModel) {
            throw ValidationException::withMessages([
                'brand_id' => 'Debe seleccionar o registrar una marca para crear un nuevo modelo.',
            ]);
        }

        return null;
    }

    private function resolveAssetModelId(string $brandId, string $subcategoryId, string $modelName): string
    {
        $existing = AssetModel::withTrashed()
            ->where('brand_id', $brandId)
            ->where('subcategory_id', $subcategoryId)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($modelName)])
            ->first();

        if ($existing) {
            if ($existing->trashed()) {
                $existing->restore();
            }
            if (! $existing->is_active) {
                $existing->update(['is_active' => true]);
            }

            return $existing->id;
        }

        return AssetModel::create([
            'brand_id' => $brandId,
            'subcategory_id' => $subcategoryId,
            'name' => $modelName,
            'is_active' => true,
        ])->id;
    }

    private function resolveUnitValue(PurchaseItem $purchaseItem): ?float
    {
        if ($purchaseItem->unit_price !== null) {
            return (float) $purchaseItem->unit_price;
        }

        if ($purchaseItem->total_price !== null && (int) $purchaseItem->quantity > 0) {
            return round(((float) $purchaseItem->total_price) / (int) $purchaseItem->quantity, 2);
        }

        return null;
    }

    private function normalizeSpecs(mixed $specs): ?array
    {
        if (! is_array($specs)) {
            return null;
        }

        $normalized = [];
        foreach ($specs as $key => $value) {
            $cleanKey = trim((string) $key);
            if ($cleanKey === '') {
                continue;
            }

            $normalized[$cleanKey] = trim((string) ($value ?? ''));
        }

        return $normalized === [] ? null : $normalized;
    }

    private function isTechnologicalPurchaseItem(PurchaseItem $purchaseItem): bool
    {
        $categoryCode = strtoupper((string) ($purchaseItem->assetCategory?->code ?? ''));

        return str_contains($categoryCode, 'COMP')
            || $purchaseItem->asset_brand_id !== null;
    }

    private function nullableTrimmed(mixed $value): ?string
    {
        $trimmed = trim((string) ($value ?? ''));

        return $trimmed === '' ? null : $trimmed;
    }

    private function generateAssetCode(?string $categoryId): string
    {
        $category = $categoryId ? AssetCategory::query()->find($categoryId, ['id', 'code']) : null;
        if (! $category || ! $category->code) {
            return 'AST-'.str_pad((string) (Asset::withTrashed()->count() + 1), 5, '0', STR_PAD_LEFT);
        }

        $prefix = $category->code.'-';
        $lastCode = Asset::withTrashed()->where('code', 'like', $prefix.'%')->max('code');
        $next = 1;
        if ($lastCode !== null) {
            $parts = explode('-', $lastCode);
            $num = (int) end($parts);
            $next = $num > 0 ? $num + 1 : 1;
        }

        return $prefix.str_pad((string) $next, 5, '0', STR_PAD_LEFT);
    }

    private function generateComponentCode(?string $typeId): string
    {
        $prefix = 'COMP';

        if ($typeId) {
            $type = ComponentType::query()->find($typeId);
            if ($type && $type->code) {
                $prefix = 'COMP-'.strtoupper($type->code);
            }
        }

        $last = Component::withTrashed()
            ->where('code', 'LIKE', $prefix.'-%')
            ->orderByDesc('code')
            ->value('code');

        $nextNumber = 1;
        if ($last) {
            $parts = explode('-', $last);
            $lastNum = (int) end($parts);
            if ($lastNum > 0) {
                $nextNumber = $lastNum + 1;
            }
        }

        return sprintf('%s-%03d', $prefix, $nextNumber);
    }
}
