<?php

namespace App\Http\Controllers\Admin;

use App\Exports\PurchaseOrdersExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PurchaseOrder\PurchaseOrderRequest;
use App\Models\AssetCategory;
use App\Models\Office;
use App\Models\PurchaseOrder;
use App\Models\PurchaseQuote;
use App\Models\Supplier;
use App\Models\AssetSubcategory;
use App\Models\AssetBrand;
use App\Models\Zonal;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PurchaseOrderController extends Controller
{
    private const VALID_SORT = ['code', 'created_at', 'total_amount', 'status'];

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
        $supplierId = $request->input('supplier_id', '');
        $supplierId = ($supplierId === null || $supplierId === 'null') ? '' : trim((string) $supplierId);
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
        $canApprove = $user?->can('purchase_orders.approve') ?? false;
        $canViewDetail = $user?->can('purchase_orders.view_detail') ?? false;

        $query = PurchaseOrder::query()->with([
            'supplier:id,name,ruc',
            'office:id,zonal_id,name,code',
            'office.zonal:id,name,code',
            'requestedByUser:id,name,last_name,usuario',
            'approvedByUser:id,name,last_name,usuario',
            'rejectedByUser:id,name,last_name,usuario',
            'observedByUser:id,name,last_name,usuario',
        ]);

        if ($q !== '') {
            $term = '%'.mb_strtolower($q).'%';
            $query->where(function ($qb) use ($term) {
                $qb->whereRaw('LOWER(COALESCE(code, \'\')) LIKE ?', [$term])
                    ->orWhereHas('supplier', function ($s) use ($term) {
                        $s->whereRaw('LOWER(name) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(ruc, \'\')) LIKE ?', [$term]);
                    })
                    ->orWhereHas('office.zonal', function ($z) use ($term) {
                        $z->whereRaw('LOWER(COALESCE(name, \'\')) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(code, \'\')) LIKE ?', [$term]);
                    })
                    ->orWhereHas('office', function ($o) use ($term) {
                        $o->whereRaw('LOWER(COALESCE(name, \'\')) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(code, \'\')) LIKE ?', [$term]);
                    })
                    ->orWhereHas('requestedByUser', function ($u) use ($term) {
                        $u->whereRaw('LOWER(COALESCE(name, \'\')) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(last_name, \'\')) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(usuario, \'\')) LIKE ?', [$term]);
                    });
            });
        }

        if ($status !== '') {
            $query->where('status', $status);
        }

        if ($supplierId !== '') {
            $query->where('supplier_id', $supplierId);
        }

        $from = \Carbon\Carbon::parse($dateFrom)->startOfDay();
        $to = \Carbon\Carbon::parse($dateTo)->endOfDay();
        $query->where('created_at', '>=', $from)->where('created_at', '<=', $to);

        $query->orderBy($sortBy === 'code' ? DB::raw('code IS NULL, code') : $sortBy, $sortOrder);

        $orders = $query->paginate($perPage)->withQueryString();

        $suppliersForFilter = Supplier::orderBy('name')->get(['id', 'name']);

        $baseQuery = PurchaseOrder::query()
            ->where('created_at', '>=', $from)
            ->where('created_at', '<=', $to);
        $totalCount = (clone $baseQuery)->count();
        $pendingCount = (clone $baseQuery)->where('status', 'pending')->count();
        $approvedCount = (clone $baseQuery)->where('status', 'approved')->count();

        return Inertia::render('admin/purchase-orders/index', [
            'purchaseOrders' => $orders,
            'suppliersForFilter' => $suppliersForFilter,
            'canApprove' => $canApprove,
            'canViewDetail' => $canViewDetail,
            'filters' => [
                'q' => $q,
                'status' => $status,
                'supplier_id' => $supplierId,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => $totalCount,
                'pending' => $pendingCount,
                'approved' => $approvedCount,
            ],
        ]);
    }

    public function export(Request $request): BinaryFileResponse
    {
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $q = $request->input('q', '');
        $q = ($q === null || $q === 'null') ? '' : trim((string) $q);
        $status = $request->input('status', '');
        $status = ($status === null || $status === 'null') ? '' : trim((string) $status);
        $supplierId = $request->input('supplier_id', '');
        $supplierId = ($supplierId === null || $supplierId === 'null') ? '' : trim((string) $supplierId);
        $dateFrom = $request->input('date_from', '');
        $dateFrom = ($dateFrom === null || $dateFrom === 'null') ? '' : trim((string) $dateFrom);
        $dateTo = $request->input('date_to', '');
        $dateTo = ($dateTo === null || $dateTo === 'null') ? '' : trim((string) $dateTo);

        if (! in_array($sortBy, self::VALID_SORT, true)) {
            $sortBy = 'created_at';
        }
        if (! in_array($sortOrder, self::VALID_ORDER, true)) {
            $sortOrder = 'desc';
        }

        $query = PurchaseOrder::query()->with([
            'supplier:id,name,ruc',
            'office:id,zonal_id,name,code',
            'office.zonal:id,name,code',
            'requestedByUser:id,name,last_name,usuario',
            'approvedByUser:id,name,last_name,usuario',
            'rejectedByUser:id,name,last_name,usuario',
            'observedByUser:id,name,last_name,usuario',
        ]);

        if ($q !== '') {
            $term = '%'.mb_strtolower($q).'%';
            $query->where(function ($qb) use ($term) {
                $qb->whereRaw('LOWER(COALESCE(code, \'\')) LIKE ?', [$term])
                    ->orWhereHas('supplier', function ($s) use ($term) {
                        $s->whereRaw('LOWER(name) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(ruc, \'\')) LIKE ?', [$term]);
                    })
                    ->orWhereHas('office.zonal', function ($z) use ($term) {
                        $z->whereRaw('LOWER(COALESCE(name, \'\')) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(code, \'\')) LIKE ?', [$term]);
                    })
                    ->orWhereHas('office', function ($o) use ($term) {
                        $o->whereRaw('LOWER(COALESCE(name, \'\')) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(code, \'\')) LIKE ?', [$term]);
                    })
                    ->orWhereHas('requestedByUser', function ($u) use ($term) {
                        $u->whereRaw('LOWER(COALESCE(name, \'\')) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(last_name, \'\')) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(usuario, \'\')) LIKE ?', [$term]);
                    });
            });
        }

        if ($status !== '') {
            $query->where('status', $status);
        }

        if ($supplierId !== '') {
            $query->where('supplier_id', $supplierId);
        }

        if ($dateFrom !== '') {
            $from = \Carbon\Carbon::parse($dateFrom)->startOfDay();
            $query->where('created_at', '>=', $from);
        }
        if ($dateTo !== '') {
            $to = \Carbon\Carbon::parse($dateTo)->endOfDay();
            $query->where('created_at', '<=', $to);
        }

        $query->orderBy($sortBy === 'code' ? DB::raw('code IS NULL, code') : $sortBy, $sortOrder);

        $orders = $query->get();

        $filename = 'ordenes-de-compra-'.now()->format('Y-m-d-His').'.xlsx';

        return Excel::download(new PurchaseOrdersExport($orders), $filename, \Maatwebsite\Excel\Excel::XLSX);
    }

    public function show(Request $request, PurchaseOrder $purchaseOrder): Response
    {
        $user = $request->user();
        $canApprove = $user?->can('purchase_orders.approve') ?? false;
        $canObserve = $user?->can('purchase_orders.observe') ?? false;
        $canSelectQuote = $user?->can('purchase_quotes.select') ?? false;

        if (! $user?->can('purchase_orders.view_detail')) {
            abort(403, 'No tiene permiso para ver el detalle de órdenes de compra.');
        }

        $purchaseOrder->load([
            'supplier:id,name,ruc',
            'office:id,zonal_id,name,code',
            'office.zonal:id,name,code',
            'requestedByUser:id,name,last_name,usuario',
            'approvedByUser:id,name,last_name,usuario',
            'rejectedByUser:id,name,last_name,usuario',
            'observedByUser:id,name,last_name,usuario',
            'items' => fn ($q) => $q->with('assetCategory:id,name,code'),
            'quotes',
        ]);

        return Inertia::render('admin/purchase-orders/show', [
            'purchaseOrder' => $purchaseOrder,
            'canApprove' => $canApprove,
            'canObserve' => $canObserve,
            'canSelectQuote' => $canSelectQuote,
        ]);
    }

    public function selectQuote(Request $request, PurchaseOrder $purchaseOrder, PurchaseQuote $purchaseQuote): RedirectResponse
    {
        abort_unless($request->user()?->can('purchase_quotes.select'), 403);

        if ($purchaseQuote->purchase_order_id !== $purchaseOrder->id) {
            abort(404);
        }

        if ($purchaseOrder->status !== 'pending') {
            abort(422, 'Solo se puede elegir cotización ganadora cuando la orden está Pendiente.');
        }

        // Desmarcar todas y marcar solo la seleccionada
        $purchaseOrder->quotes()->update(['is_selected' => false]);
        $purchaseQuote->update(['is_selected' => true]);
        $purchaseOrder->update(['selected_quote_id' => $purchaseQuote->id]);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Cotización ganadora actualizada.']);
    }

    public function create(Request $request): Response
    {
        $suppliers = Supplier::where('is_active', true)->orderBy('name')->get(['id', 'name', 'ruc']);
        $assetCategories = AssetCategory::where('is_active', true)
            ->orderBy('type')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'type']);
        $assetSubcategories = AssetSubcategory::where('is_active', true)->orderBy('name')->get(['id', 'asset_category_id', 'name']);
        $assetBrands = AssetBrand::orderBy('name')->get(['id', 'name']);
        $zonals = Zonal::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);
        $offices = Office::where('is_active', true)->orderBy('name')->get(['id', 'zonal_id', 'name', 'code']);

        return Inertia::render('admin/purchase-orders/create', [
            'suppliers' => $suppliers,
            'assetCategories' => $assetCategories,
            'assetSubcategories' => $assetSubcategories,
            'assetBrands' => $assetBrands,
            'zonals' => $zonals,
            'offices' => $offices,
        ]);
    }

    public function store(PurchaseOrderRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $canSelectQuote = $request->user()?->can('purchase_quotes.select') ?? false;

        $items = $validated['items'];
        unset($validated['items']);
        unset($validated['code']);

        // Forzar estado inicial pendiente
        $validated['status'] = 'pending';

        $validated['code'] = $this->nextPurchaseOrderCode();

        $total = 0;
        foreach ($items as $row) {
            $qty = (int) ($row['quantity'] ?? 0);
            $unit = (float) ($row['unit_price'] ?? 0);
            $rowTotal = isset($row['total_price']) && $row['total_price'] !== '' && $row['total_price'] !== null
                ? (float) $row['total_price']
                : $qty * $unit;
            $total += $rowTotal;
        }

        $validated['total_amount'] = round($total, 2);
        $validated['requested_by'] = $request->user()?->id;

        $order = PurchaseOrder::create($validated);

        foreach ($items as $row) {
            $qty = (int) ($row['quantity'] ?? 0);
            $unit = (float) ($row['unit_price'] ?? 0);
            $rowTotal = isset($row['total_price']) && $row['total_price'] !== '' && $row['total_price'] !== null
                ? (float) $row['total_price']
                : $qty * $unit;
            $order->items()->create([
                'description' => $row['description'],
                'quantity' => $qty,
                'unit_price' => $unit > 0 ? $unit : null,
                'total_price' => round($rowTotal, 2),
                'asset_category_id' => isset($row['category_id']) && $row['category_id'] !== '' && $row['category_id'] !== null
                    ? $row['category_id']
                    : null,
                'asset_subcategory_id' => isset($row['asset_subcategory_id']) && $row['asset_subcategory_id'] !== '' && $row['asset_subcategory_id'] !== null
                    ? $row['asset_subcategory_id']
                    : null,
                'asset_brand_id' => isset($row['asset_brand_id']) && $row['asset_brand_id'] !== '' && $row['asset_brand_id'] !== null
                    ? $row['asset_brand_id']
                    : null,
            ]);
        }

        $selectedQuoteId = null;
        $quotesInput = $request->input('quotes', []);
        if (is_array($quotesInput)) {
            foreach ($quotesInput as $i => $quoteInput) {
                $file = $request->file("quotes.{$i}.pdf");
                if (! $file) {
                    continue;
                }
                $path = $file->store('purchase_quotes', 'public');
                $description = is_array($quoteInput) ? ($quoteInput['description'] ?? '') : '';
                $isSelectedRaw = filter_var(
                    is_array($quoteInput) ? ($quoteInput['is_selected'] ?? false) : false,
                    FILTER_VALIDATE_BOOLEAN
                );
                $isSelected = $canSelectQuote && $isSelectedRaw;
                $quote = $order->quotes()->create([
                    'pdf_path' => $path,
                    'description' => $description !== '' ? $description : null,
                    'is_selected' => $isSelected,
                ]);
                if ($isSelected && $canSelectQuote) {
                    $selectedQuoteId = $quote->id;
                }
            }
            if ($selectedQuoteId && $canSelectQuote) {
                $order->update(['selected_quote_id' => $selectedQuoteId]);
            }
        }

        return redirect()->route('admin.purchase-orders.index')
            ->with('toast', ['type' => 'success', 'message' => 'Orden de compra creada correctamente.']);
    }

    public function edit(Request $request, PurchaseOrder $purchaseOrder): Response
    {
        if (! in_array($purchaseOrder->status, ['pending', 'observed'], true)) {
            abort(403, 'Solo se pueden editar órdenes en estado Pendiente u Observado.');
        }

        $purchaseOrder->load([
            'supplier:id,name,ruc',
            'office:id,zonal_id,name,code',
            'office.zonal:id,name,code',
            'items.assetCategory:id,name,code',
            'quotes',
        ]);
        $suppliers = Supplier::where('is_active', true)->orderBy('name')->get(['id', 'name', 'ruc']);
        $assetCategories = AssetCategory::where('is_active', true)
            ->orderBy('type')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'type']);
        $assetSubcategories = AssetSubcategory::where('is_active', true)->orderBy('name')->get(['id', 'asset_category_id', 'name']);
        $assetBrands = AssetBrand::orderBy('name')->get(['id', 'name']);
        $zonals = Zonal::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);
        $offices = Office::where('is_active', true)->orderBy('name')->get(['id', 'zonal_id', 'name', 'code']);

        return Inertia::render('admin/purchase-orders/edit', [
            'purchaseOrder' => $purchaseOrder,
            'suppliers' => $suppliers,
            'assetCategories' => $assetCategories,
            'assetSubcategories' => $assetSubcategories,
            'assetBrands' => $assetBrands,
            'zonals' => $zonals,
            'offices' => $offices,
        ]);
    }

    public function update(PurchaseOrderRequest $request, PurchaseOrder $purchaseOrder): RedirectResponse
    {
        if (! in_array($purchaseOrder->status, ['pending', 'observed'], true)) {
            abort(403, 'Solo se pueden modificar órdenes en estado Pendiente u Observado.');
        }

        $validated = $request->validated();
        $canSelectQuote = $request->user()?->can('purchase_quotes.select') ?? false;

        $items = $validated['items'];
        unset($validated['items']);
        unset($validated['code']);

        $total = 0;
        foreach ($items as $row) {
            $qty = (int) ($row['quantity'] ?? 0);
            $unit = (float) ($row['unit_price'] ?? 0);
            $rowTotal = isset($row['total_price']) && $row['total_price'] !== '' && $row['total_price'] !== null
                ? (float) $row['total_price']
                : $qty * $unit;
            $total += $rowTotal;
        }

        $validated['total_amount'] = round($total, 2);
        // Siempre que se edita (desde pendiente u observado) la orden vuelve a estado Pendiente
        $validated['status'] = 'pending';

        $purchaseOrder->update($validated);

        $purchaseOrder->items()->delete();
        foreach ($items as $row) {
            $qty = (int) ($row['quantity'] ?? 0);
            $unit = (float) ($row['unit_price'] ?? 0);
            $rowTotal = isset($row['total_price']) && $row['total_price'] !== '' && $row['total_price'] !== null
                ? (float) $row['total_price']
                : $qty * $unit;
            $purchaseOrder->items()->create([
                'description' => $row['description'],
                'quantity' => $qty,
                'unit_price' => $unit > 0 ? $unit : null,
                'total_price' => round($rowTotal, 2),
                'asset_category_id' => isset($row['category_id']) && $row['category_id'] !== '' && $row['category_id'] !== null
                    ? $row['category_id']
                    : null,
                'asset_subcategory_id' => isset($row['asset_subcategory_id']) && $row['asset_subcategory_id'] !== '' && $row['asset_subcategory_id'] !== null
                    ? $row['asset_subcategory_id']
                    : null,
                'asset_brand_id' => isset($row['asset_brand_id']) && $row['asset_brand_id'] !== '' && $row['asset_brand_id'] !== null
                    ? $row['asset_brand_id']
                    : null,
            ]);
        }

        $quotesInput = $request->input('quotes', []);
        $existingQuoteIds = $purchaseOrder->quotes()->pluck('id')->all();
        $requestQuoteIds = [];
        $selectedQuoteId = $canSelectQuote ? null : $purchaseOrder->selected_quote_id;

        if (is_array($quotesInput)) {
            foreach ($quotesInput as $i => $quoteInput) {
                $quoteId = is_array($quoteInput) && ! empty($quoteInput['id']) ? $quoteInput['id'] : null;
                $description = is_array($quoteInput) ? ($quoteInput['description'] ?? '') : '';
                $isSelectedRaw = filter_var(
                    is_array($quoteInput) ? ($quoteInput['is_selected'] ?? false) : false,
                    FILTER_VALIDATE_BOOLEAN
                );
                $isSelected = $canSelectQuote && $isSelectedRaw;
                $file = $request->file("quotes.{$i}.pdf");

                if ($quoteId && in_array($quoteId, $existingQuoteIds, true)) {
                    $requestQuoteIds[] = $quoteId;
                    $quote = $purchaseOrder->quotes()->find($quoteId);
                    if ($quote) {
                        $updateData = [
                            'description' => $description !== '' ? $description : null,
                            'is_selected' => $isSelected,
                        ];
                        if ($file) {
                            if ($quote->pdf_path && Storage::disk('public')->exists($quote->pdf_path)) {
                                Storage::disk('public')->delete($quote->pdf_path);
                            }
                            $updateData['pdf_path'] = $file->store('purchase_quotes', 'public');
                        }
                        $quote->update($updateData);
                        if ($isSelected && $canSelectQuote) {
                            $selectedQuoteId = $quote->id;
                        }
                    }
                } else {
                    if (! $file) {
                        continue;
                    }
                    $path = $file->store('purchase_quotes', 'public');
                    $quote = $purchaseOrder->quotes()->create([
                        'pdf_path' => $path,
                        'description' => $description !== '' ? $description : null,
                        'is_selected' => $isSelected,
                    ]);
                    $requestQuoteIds[] = $quote->id;
                    if ($isSelected && $canSelectQuote) {
                        $selectedQuoteId = $quote->id;
                    }
                }
            }

            foreach ($existingQuoteIds as $id) {
                if (! in_array($id, $requestQuoteIds, true)) {
                    $quote = $purchaseOrder->quotes()->find($id);
                    if ($quote) {
                        if ($quote->pdf_path && Storage::disk('public')->exists($quote->pdf_path)) {
                            Storage::disk('public')->delete($quote->pdf_path);
                        }
                        $quote->delete();
                    }
                }
            }

            if ($canSelectQuote) {
                $purchaseOrder->update(['selected_quote_id' => $selectedQuoteId]);
            }
        }

        return redirect()->route('admin.purchase-orders.index')
            ->with('toast', ['type' => 'success', 'message' => 'Orden de compra actualizada correctamente.']);
    }

    public function destroy(PurchaseOrder $purchaseOrder): RedirectResponse
    {
        if ($purchaseOrder->status !== 'pending') {
            abort(403, 'Solo se pueden eliminar órdenes en estado Pendiente.');
        }

        foreach ($purchaseOrder->quotes as $quote) {
            if ($quote->pdf_path && Storage::disk('public')->exists($quote->pdf_path)) {
                Storage::disk('public')->delete($quote->pdf_path);
            }
        }

        $purchaseOrder->items()->delete();
        $purchaseOrder->delete();

        return redirect()->route('admin.purchase-orders.index')
            ->with('toast', ['type' => 'success', 'message' => 'Orden de compra eliminada correctamente.']);
    }

    public function approve(Request $request, PurchaseOrder $purchaseOrder): RedirectResponse
    {
        if ($purchaseOrder->status !== 'pending') {
            abort(422, 'Solo se puede aprobar una orden en estado Pendiente.');
        }

        $observationNotes = $request->input('observation_notes', '');
        $purchaseOrder->update([
            'status' => 'approved',
            'approved_by' => $request->user()?->id,
            'approved_at' => now(),
            'rejected_by' => null,
            'rejected_at' => null,
            'observed_by' => null,
            'observed_at' => null,
            'observation_notes' => $observationNotes !== '' ? $observationNotes : null,
        ]);

        return redirect()->route('admin.purchase-orders.index')
            ->with('toast', ['type' => 'success', 'message' => 'Orden aprobada correctamente.']);
    }

    public function reject(Request $request, PurchaseOrder $purchaseOrder): RedirectResponse
    {
        if ($purchaseOrder->status !== 'pending') {
            abort(422, 'Solo se puede rechazar una orden en estado Pendiente.');
        }

        $observationNotes = $request->input('observation_notes', '');
        $purchaseOrder->update([
            'status' => 'rejected',
            'approved_by' => null,
            'approved_at' => null,
            'rejected_by' => $request->user()?->id,
            'rejected_at' => now(),
            'observed_by' => null,
            'observed_at' => null,
            'observation_notes' => $observationNotes !== '' ? $observationNotes : null,
        ]);

        return redirect()->route('admin.purchase-orders.index')
            ->with('toast', ['type' => 'success', 'message' => 'Orden rechazada.']);
    }

    public function observe(Request $request, PurchaseOrder $purchaseOrder): RedirectResponse
    {
        if ($purchaseOrder->status !== 'pending') {
            abort(422, 'Solo se puede poner en observación una orden en estado Pendiente.');
        }

        $observationNotes = $request->input('observation_notes', '');
        $purchaseOrder->update([
            'status' => 'observed',
            'approved_by' => null,
            'approved_at' => null,
            'rejected_by' => null,
            'rejected_at' => null,
            'observed_by' => $request->user()?->id,
            'observed_at' => now(),
            'observation_notes' => $observationNotes !== '' ? $observationNotes : null,
        ]);

        return redirect()->route('admin.purchase-orders.index')
            ->with('toast', ['type' => 'success', 'message' => 'Orden puesta en observación.']);
    }

    private function nextPurchaseOrderCode(): string
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            $maxCode = PurchaseOrder::query()
                ->whereNotNull('code')
                ->whereRaw('code ~ ?', ['^[0-9]+$'])
                ->orderByRaw('CAST(code AS BIGINT) DESC')
                ->value('code');
        } else {
            $maxCode = PurchaseOrder::query()
                ->whereNotNull('code')
                ->whereRaw('code REGEXP ?', ['^[0-9]+$'])
                ->orderByRaw('CAST(code AS UNSIGNED) DESC')
                ->value('code');
        }

        if ($maxCode === null) {
            return '0000001';
        }

        $next = (int) $maxCode + 1;

        return str_pad((string) $next, 7, '0', STR_PAD_LEFT);
    }

}
