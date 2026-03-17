<?php

namespace App\Http\Controllers\Admin;

use App\Exports\AssetTransfersExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AssetTransfer\AssetTransferRequest;
use App\Jobs\SendAssetTransferApprovalEmailJob;
use App\Jobs\SendAssetTransferCancelledEmailJob;
use App\Jobs\SendAssetTransferDispatchedEmailJob;
use App\Jobs\SendAssetTransferPendingApprovalEmailJob;
use App\Jobs\SendAssetTransferReceivedEmailJob;
use App\Models\Asset;
use App\Models\AssetTransfer;
use App\Models\Component;
use App\Models\Office;
use App\Models\Scopes\AllowedZonalsScope;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\Zonal;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AssetTransferController extends Controller
{
    private const VALID_SORT = ['code', 'created_at', 'status', 'ship_date', 'received_at'];

    private const VALID_ORDER = ['asc', 'desc'];

    private const PER_PAGE_OPTIONS = [5, 10, 15, 25, 50, 100];

    public function index(Request $request): Response
    {
        $isSuperadmin = $request->user()?->hasRole('superadmin') ?? false;
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $perPage = (int) $request->input('per_page', 25);
        $q = $this->cleanString($request->input('q', ''));
        $status = $this->cleanString($request->input('status', ''));
        $originWarehouseId = $this->cleanString($request->input('origin_warehouse_id', ''));
        $destinationWarehouseId = $this->cleanString($request->input('destination_warehouse_id', ''));
        $dateFrom = $this->cleanString($request->input('date_from', ''));
        $dateTo = $this->cleanString($request->input('date_to', ''));

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

        $query = AssetTransfer::query()->with([
            ...$this->transferWarehouseRelations(),
            'sentByUser:id,name,last_name,usuario',
            'receivedByUser:id,name,last_name,usuario',
            'approvedByUser:id,name,last_name,usuario',
            'cancelledByUser:id,name,last_name,usuario',
            ...$this->transferItemRelations(),
        ])->withCount('items');

        $this->applyTransferVisibilityScope($query, $request);

        $this->applyTransferFilters($query, [
            'q' => $q,
            'status' => $status,
            'origin_warehouse_id' => $originWarehouseId,
            'destination_warehouse_id' => $destinationWarehouseId,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
        ]);

        $query->orderBy($sortBy, $sortOrder);

        $transfers = $query->paginate($perPage)->withQueryString();

        $warehousesForFilter = Warehouse::query()
            ->where('is_active', true)
            ->with('office:id,zonal_id,name,code', 'office.zonal:id,name,code')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'office_id']);

        $statsBase = AssetTransfer::query();
        $this->applyTransferVisibilityScope($statsBase, $request);
        $this->applyTransferFilters($statsBase, [
            'q' => '',
            'status' => '',
            'origin_warehouse_id' => '',
            'destination_warehouse_id' => '',
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
        ]);

        return Inertia::render('admin/asset-transfers/index', [
            'assetTransfers' => $transfers,
            'warehousesForFilter' => $warehousesForFilter,
            'canViewDetail' => $request->user()?->can('asset_transfers.view_detail') ?? false,
            'isSuperadmin' => $isSuperadmin,
            'currentUserId' => $request->user()?->id,
            'filters' => [
                'q' => $q,
                'status' => $status,
                'origin_warehouse_id' => $originWarehouseId,
                'destination_warehouse_id' => $destinationWarehouseId,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => (clone $statsBase)->count(),
                'pending_approval' => (clone $statsBase)->where('status', 'pending_approval')->count(),
                'approved' => (clone $statsBase)->where('status', 'approved')->count(),
                'in_transit' => (clone $statsBase)->where('status', 'in_transit')->count(),
                'received' => (clone $statsBase)->where('status', 'received')->count(),
            ],
        ]);
    }

    public function export(Request $request): BinaryFileResponse
    {
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $q = $this->cleanString($request->input('q', ''));
        $status = $this->cleanString($request->input('status', ''));
        $originWarehouseId = $this->cleanString($request->input('origin_warehouse_id', ''));
        $destinationWarehouseId = $this->cleanString($request->input('destination_warehouse_id', ''));
        $dateFrom = $this->cleanString($request->input('date_from', ''));
        $dateTo = $this->cleanString($request->input('date_to', ''));

        if (! in_array($sortBy, self::VALID_SORT, true)) {
            $sortBy = 'created_at';
        }
        if (! in_array($sortOrder, self::VALID_ORDER, true)) {
            $sortOrder = 'desc';
        }

        $query = AssetTransfer::query()->with([
            ...$this->transferWarehouseRelations(),
            'sentByUser:id,name,last_name,usuario',
            'receivedByUser:id,name,last_name,usuario',
            'approvedByUser:id,name,last_name,usuario',
        ])->withCount('items');

        $this->applyTransferVisibilityScope($query, $request);

        $this->applyTransferFilters($query, [
            'q' => $q,
            'status' => $status,
            'origin_warehouse_id' => $originWarehouseId,
            'destination_warehouse_id' => $destinationWarehouseId,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
        ]);

        $query->orderBy($sortBy, $sortOrder);

        $filename = 'traslados-activos-'.now()->format('Y-m-d-His').'.xlsx';

        return Excel::download(
            new AssetTransfersExport($query->get()),
            $filename,
            \Maatwebsite\Excel\Excel::XLSX
        );
    }

    public function create(Request $request): Response
    {
        return Inertia::render('admin/asset-transfers/create', $this->transferFormPayload($request));
    }

    public function store(AssetTransferRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $transfer = DB::transaction(function () use ($request, $validated) {
            $transfer = AssetTransfer::create(
                $this->normalizeTransferPayload($validated, null, $request->user()?->id)
            );
            $transfer->update($this->storeTransferDocuments($request, $transfer));
            $this->syncTransferItems($transfer, $validated['items']);
            return $transfer;
        });

        if ($transfer->status === 'pending_approval') {
            SendAssetTransferPendingApprovalEmailJob::dispatch($transfer->id);
        }

        return redirect()
            ->route('admin.asset-transfers.index')
            ->with('toast', ['type' => 'success', 'message' => 'Traslado creado correctamente.']);
    }

    public function show(Request $request, AssetTransfer $assetTransfer): Response
    {
        abort_unless($request->user()?->can('asset_transfers.view_detail'), 403);
        abort_unless($this->canAccessTransfer($request, $assetTransfer), 403);

        $assetTransfer->load(array_merge(
            $this->transferWarehouseRelations(),
            $this->transferDetailRelations()
        ));

        return Inertia::render('admin/asset-transfers/show', [
            'assetTransfer' => $assetTransfer,
            'isSuperadmin' => $request->user()?->hasRole('superadmin') ?? false,
            'currentUserId' => $request->user()?->id,
        ]);
    }

    public function edit(Request $request, AssetTransfer $assetTransfer): Response
    {
        abort_unless($this->canAccessTransfer($request, $assetTransfer), 403);
        abort_unless($this->canEditTransfer($request, $assetTransfer), 403);

        $assetTransfer->load(array_merge(
            $this->transferWarehouseRelations(),
            $this->transferDetailRelations()
        ));

        return Inertia::render('admin/asset-transfers/edit', array_merge(
            $this->transferFormPayload($request),
            ['assetTransfer' => $assetTransfer]
        ));
    }

    public function update(AssetTransferRequest $request, AssetTransfer $assetTransfer): RedirectResponse
    {
        abort_unless($this->canAccessTransfer($request, $assetTransfer), 403);
        abort_unless($this->canEditTransfer($request, $assetTransfer), 403);

        $validated = $request->validated();
        $lockApprovedStructure = $assetTransfer->status === 'approved';

        DB::transaction(function () use ($request, $validated, $assetTransfer, $lockApprovedStructure) {
            $assetTransfer->update(array_merge(
                $this->normalizeTransferPayload($validated, $assetTransfer, $request->user()?->id),
                $this->storeTransferDocuments($request, $assetTransfer)
            ));
            if (! $lockApprovedStructure) {
                $this->syncTransferItems($assetTransfer, $validated['items']);
            }
        });

        return redirect()
            ->route('admin.asset-transfers.index')
            ->with('toast', ['type' => 'success', 'message' => 'Traslado actualizado correctamente.']);
    }

    public function approve(Request $request, AssetTransfer $assetTransfer): RedirectResponse
    {
        abort_unless($request->user()?->can('asset_transfers.approve'), 403);
        abort_unless($this->canAccessTransfer($request, $assetTransfer), 403);

        if ($assetTransfer->status !== 'pending_approval') {
            abort(422, 'Solo se puede aprobar un traslado pendiente por aprobar.');
        }

        $assetTransfer->update([
            'status' => 'approved',
            'approved_by' => $request->user()?->id,
            'approved_at' => now(),
            'cancelled_by' => null,
            'cancelled_at' => null,
            'cancellation_reason' => null,
        ]);

        SendAssetTransferApprovalEmailJob::dispatch($assetTransfer->id);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Traslado aprobado correctamente.']);
    }

    public function cancel(Request $request, AssetTransfer $assetTransfer): RedirectResponse
    {
        abort_unless($request->user()?->can('asset_transfers.cancel'), 403);
        abort_unless($this->canAccessTransfer($request, $assetTransfer), 403);

        if (in_array($assetTransfer->status, ['received', 'cancelled'], true)) {
            abort(422, 'Este traslado ya no puede cancelarse.');
        }

        $cancellationReason = $this->cleanString($request->input('cancellation_reason', ''));
        if ($cancellationReason === '') {
            abort(422, 'Debe indicar el motivo de cancelación.');
        }

        $assetTransfer->update([
            'status' => 'cancelled',
            'cancelled_by' => $request->user()?->id,
            'cancelled_at' => now(),
            'cancellation_reason' => $cancellationReason,
        ]);

        SendAssetTransferCancelledEmailJob::dispatch($assetTransfer->id);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Traslado cancelado correctamente.']);
    }

    public function dispatch(Request $request, AssetTransfer $assetTransfer): RedirectResponse
    {
        abort_unless($request->user()?->can('asset_transfers.dispatch'), 403);
        abort_unless($this->canAccessTransfer($request, $assetTransfer), 403);
        abort_unless($this->canOperateTransfer($request, $assetTransfer), 403);

        if ($assetTransfer->status !== 'approved') {
            abort(422, 'Solo se puede despachar un traslado aprobado.');
        }

        if (empty($assetTransfer->received_by)) {
            abort(422, 'Debe indicar quién recibe antes de despachar el traslado.');
        }

        DB::transaction(function () use ($request, $assetTransfer) {
            $assetTransfer->update([
                'status' => 'in_transit',
                'sent_by' => $assetTransfer->sent_by ?: $request->user()?->id,
                'ship_date' => $assetTransfer->ship_date ?: now(),
            ]);

            foreach ($assetTransfer->items as $item) {
                if ($item->asset) {
                    $item->asset->update(['status' => 'in_transit']);
                }
                if ($item->component) {
                    $item->component->update(['status' => 'in_transit']);
                }
            }
        });

        SendAssetTransferDispatchedEmailJob::dispatch($assetTransfer->id);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Traslado despachado correctamente.']);
    }

    public function receive(Request $request, AssetTransfer $assetTransfer): RedirectResponse
    {
        abort_unless($request->user()?->can('asset_transfers.receive'), 403);
        abort_unless($this->canAccessTransfer($request, $assetTransfer), 403);
        abort_unless($this->canReceiveTransfer($request, $assetTransfer), 403);

        if ($assetTransfer->status !== 'in_transit') {
            abort(422, 'Solo se puede recibir un traslado en tránsito.');
        }

        $receiptNotes = $this->cleanString($request->input('receipt_notes', ''));
        if ($receiptNotes === '') {
            abort(422, 'Debe registrar el comentario de recepción.');
        }

        $conditionInByItemId = collect($request->input('items', []))
            ->filter(fn ($item) => is_array($item) && ! empty($item['id']))
            ->mapWithKeys(fn ($item) => [
                (string) $item['id'] => $this->cleanString($item['condition_in'] ?? ''),
            ]);

        DB::transaction(function () use ($request, $assetTransfer, $receiptNotes, $conditionInByItemId) {
            $assetTransfer->loadMissing('items.asset', 'items.component');

            foreach ($assetTransfer->items as $item) {
                $conditionIn = $conditionInByItemId->get((string) $item->id, '');
                if (! in_array($conditionIn, ['new', 'good', 'regular', 'damaged', 'obsolete'], true)) {
                    abort(422, 'Debe indicar la condición de llegada para todos los ítems.');
                }
            }

            $assetTransfer->update([
                'status' => 'received',
                'received_by' => $assetTransfer->received_by ?: $request->user()?->id,
                'received_at' => $assetTransfer->received_at ?: now(),
                'receipt_notes' => $receiptNotes,
            ]);

            foreach ($assetTransfer->items as $item) {
                $conditionIn = $conditionInByItemId->get((string) $item->id);
                $item->update([
                    'condition_in' => $conditionIn,
                ]);

                if ($item->asset) {
                    $item->asset->update([
                        'warehouse_id' => $assetTransfer->destination_warehouse_id,
                        'status' => 'stored',
                        'condition' => $conditionIn ?: $item->asset->condition,
                    ]);
                }
                if ($item->component) {
                    $item->component->update([
                        'warehouse_id' => $assetTransfer->destination_warehouse_id,
                        'status' => 'stored',
                        'condition' => $conditionIn ?: $item->component->condition,
                    ]);
                }
            }
        });

        SendAssetTransferReceivedEmailJob::dispatch($assetTransfer->id);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Traslado recibido correctamente.']);
    }

    public function showCompanyGuide(AssetTransfer $assetTransfer): BinaryFileResponse
    {
        abort_unless($this->canAccessTransfer(request(), $assetTransfer), 403);
        abort_if(empty($assetTransfer->company_guide_path), 404);
        abort_unless(Storage::disk('public')->exists($assetTransfer->company_guide_path), 404);
        $filePath = Storage::disk('public')->path($assetTransfer->company_guide_path);
        $mimeType = mime_content_type($filePath) ?: 'application/octet-stream';

        return response()->file(
            $filePath,
            [
                'Content-Type' => $mimeType,
                'Content-Disposition' => 'inline; filename="'.basename($assetTransfer->company_guide_path).'"',
            ]
        );
    }

    public function showCarrierVoucher(AssetTransfer $assetTransfer): BinaryFileResponse
    {
        abort_unless($this->canAccessTransfer(request(), $assetTransfer), 403);
        abort_if(empty($assetTransfer->carrier_voucher_path), 404);
        abort_unless(Storage::disk('public')->exists($assetTransfer->carrier_voucher_path), 404);
        $filePath = Storage::disk('public')->path($assetTransfer->carrier_voucher_path);
        $mimeType = mime_content_type($filePath) ?: 'application/octet-stream';

        return response()->file(
            $filePath,
            [
                'Content-Type' => $mimeType,
                'Content-Disposition' => 'inline; filename="'.basename($assetTransfer->carrier_voucher_path).'"',
            ]
        );
    }

    public function destroy(AssetTransfer $assetTransfer): RedirectResponse
    {
        abort_unless($this->canAccessTransfer(request(), $assetTransfer), 403);
        abort_unless(request()->user()?->hasRole('superadmin') && $assetTransfer->status === 'pending_approval', 403);

        if ($assetTransfer->company_guide_path) {
            Storage::disk('public')->delete($assetTransfer->company_guide_path);
        }
        if ($assetTransfer->carrier_voucher_path) {
            Storage::disk('public')->delete($assetTransfer->carrier_voucher_path);
        }

        $assetTransfer->delete();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Traslado eliminado correctamente.']);
    }

    private function transferFormPayload(Request $request): array
    {
        $originWarehouses = Warehouse::query()
            ->where('is_active', true)
            ->with('office:id,zonal_id,name,code', 'office.zonal:id,name,code')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'office_id']);

        $destinationWarehouses = Warehouse::query()
            ->withoutGlobalScope(AllowedZonalsScope::class)
            ->where('is_active', true)
            ->with([
                'office' => fn ($query) => $query
                    ->withoutGlobalScope(AllowedZonalsScope::class)
                    ->select(['id', 'zonal_id', 'name', 'code']),
                'office.zonal' => fn ($query) => $query
                    ->withoutGlobalScope(AllowedZonalsScope::class)
                    ->select(['id', 'name', 'code']),
            ])
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'office_id']);

        $assets = Asset::query()
            ->with([
                'model:id,name,brand_id',
                'model.brand:id,name',
                'category:id,name,code',
            ])
            ->whereIn('status', ['stored', 'active'])
            ->orderBy('code')
            ->get(['id', 'code', 'serial_number', 'model_id', 'category_id', 'warehouse_id', 'condition', 'status']);

        $components = Component::query()
            ->with([
                'type:id,name,code',
                'brand:id,name',
            ])
            ->whereIn('status', ['stored', 'active'])
            ->orderBy('code');

        $this->applyAllowedZonalsToComponentsQuery($request, $components);

        $users = User::query()
            ->where('is_active', true)
            ->assignable()
            ->with([
                'zonals' => fn ($query) => $query
                    ->withoutGlobalScope(AllowedZonalsScope::class)
                    ->select(['zonals.id']),
            ])
            ->orderBy('name')
            ->get(['id', 'name', 'last_name', 'usuario'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'last_name' => $user->last_name,
                'usuario' => $user->usuario,
                'zonal_ids' => $user->zonals->pluck('id')->values()->all(),
            ])
            ->values();

        return [
            'originWarehouses' => $originWarehouses,
            'destinationWarehouses' => $destinationWarehouses,
            'assets' => $assets,
            'components' => $components->get(['id', 'code', 'serial_number', 'type_id', 'brand_id', 'model', 'warehouse_id', 'condition', 'status']),
            'users' => $users,
        ];
    }

    private function normalizeTransferPayload(array $validated, ?AssetTransfer $current, ?string $userId): array
    {
        $lockApprovedStructure = $current?->status === 'approved';

        return [
            'code' => $current?->code ?? $this->nextTransferCode(),
            'origin_warehouse_id' => $lockApprovedStructure ? $current?->origin_warehouse_id : $validated['origin_warehouse_id'],
            'destination_warehouse_id' => $lockApprovedStructure ? $current?->destination_warehouse_id : $validated['destination_warehouse_id'],
            'status' => $current?->status ?? $validated['status'] ?? 'pending_approval',
            'sent_by' => ($validated['sent_by'] ?? null) ?: $current?->sent_by ?: $userId,
            'received_by' => ($validated['received_by'] ?? null) ?: null,
            'carrier_name' => ($validated['carrier_name'] ?? null) ?: null,
            'tracking_number' => ($validated['tracking_number'] ?? null) ?: null,
            'carrier_reference' => ($validated['carrier_reference'] ?? null) ?: null,
            'company_guide_number' => ($validated['company_guide_number'] ?? null) ?: null,
            'carrier_voucher_number' => ($validated['carrier_voucher_number'] ?? null) ?: null,
            'ship_date' => ! empty($validated['ship_date'] ?? null) ? $validated['ship_date'] : null,
            'received_at' => ! empty($validated['received_at'] ?? null) ? $validated['received_at'] : null,
            'dispatch_notes' => ($validated['dispatch_notes'] ?? null) ?: null,
            'receipt_notes' => ($validated['receipt_notes'] ?? null) ?: null,
            'cancellation_reason' => ($validated['cancellation_reason'] ?? null) ?: null,
        ];
    }

    private function storeTransferDocuments(Request $request, AssetTransfer $transfer): array
    {
        $payload = [];

        if ($file = $request->file('company_guide_file')) {
            if ($transfer->company_guide_path) {
                Storage::disk('public')->delete($transfer->company_guide_path);
            }
            $payload['company_guide_path'] = $file->store('asset_transfers/'.$transfer->id.'/documents', 'public');
        }

        if ($file = $request->file('carrier_voucher_file')) {
            if ($transfer->carrier_voucher_path) {
                Storage::disk('public')->delete($transfer->carrier_voucher_path);
            }
            $payload['carrier_voucher_path'] = $file->store('asset_transfers/'.$transfer->id.'/documents', 'public');
        }

        return $payload;
    }

    private function syncTransferItems(AssetTransfer $transfer, array $items): void
    {
        $transfer->items()->delete();

        foreach ($items as $item) {
            $transfer->items()->create([
                'asset_id' => ($item['item_type'] ?? null) === 'asset' ? (($item['asset_id'] ?? null) ?: null) : null,
                'component_id' => ($item['item_type'] ?? null) === 'component' ? (($item['component_id'] ?? null) ?: null) : null,
                'condition_out' => ($item['condition_out'] ?? null) ?: null,
                'condition_in' => ($item['condition_in'] ?? null) ?: null,
            ]);
        }
    }

    private function nextTransferCode(): string
    {
        $prefix = 'TRF-';
        $lastCode = AssetTransfer::query()
            ->where('code', 'like', $prefix.'%')
            ->max('code');

        $next = 1;
        if ($lastCode !== null) {
            $parts = explode('-', $lastCode);
            $num = (int) end($parts);
            $next = $num + 1;
        }

        return $prefix.str_pad((string) $next, 5, '0', STR_PAD_LEFT);
    }

    private function transferDetailRelations(): array
    {
        return [
            'sentByUser:id,name,last_name,usuario',
            'receivedByUser:id,name,last_name,usuario',
            'approvedByUser:id,name,last_name,usuario',
            'cancelledByUser:id,name,last_name,usuario',
            ...$this->transferItemRelations(),
        ];
    }

    private function transferItemRelations(): array
    {
        return [
            'items.asset' => fn ($query) => $query
                ->withoutGlobalScope(AllowedZonalsScope::class)
                ->with([
                    'model:id,name,brand_id',
                    'model.brand:id,name',
                    'category:id,name,code',
                ]),
            'items.component.type:id,name,code',
            'items.component.brand:id,name',
        ];
    }

    private function transferWarehouseRelations(): array
    {
        return [
            'originWarehouse' => fn ($query) => $query
                ->withoutGlobalScope(AllowedZonalsScope::class)
                ->select(['id', 'name', 'code', 'office_id']),
            'originWarehouse.office' => fn ($query) => $query
                ->withoutGlobalScope(AllowedZonalsScope::class)
                ->select(['id', 'zonal_id', 'name', 'code']),
            'originWarehouse.office.zonal' => fn ($query) => $query
                ->withoutGlobalScope(AllowedZonalsScope::class)
                ->select(['id', 'name', 'code']),
            'destinationWarehouse' => fn ($query) => $query
                ->withoutGlobalScope(AllowedZonalsScope::class)
                ->select(['id', 'name', 'code', 'office_id']),
            'destinationWarehouse.office' => fn ($query) => $query
                ->withoutGlobalScope(AllowedZonalsScope::class)
                ->select(['id', 'zonal_id', 'name', 'code']),
            'destinationWarehouse.office.zonal' => fn ($query) => $query
                ->withoutGlobalScope(AllowedZonalsScope::class)
                ->select(['id', 'name', 'code']),
        ];
    }

    private function applyTransferFilters(Builder $query, array $filters): void
    {
        if ($filters['q'] !== '') {
            $term = '%'.mb_strtolower($filters['q']).'%';
            $query->where(function ($qb) use ($term) {
                $qb->whereRaw('LOWER(code) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(carrier_name, \'\')) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(tracking_number, \'\')) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(carrier_reference, \'\')) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(company_guide_number, \'\')) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(carrier_voucher_number, \'\')) LIKE ?', [$term])
                    ->orWhereHas('originWarehouse', fn ($warehouse) => $warehouse
                        ->whereRaw('LOWER(COALESCE(name, \'\')) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(COALESCE(code, \'\')) LIKE ?', [$term]))
                    ->orWhereHas('destinationWarehouse', fn ($warehouse) => $warehouse
                        ->whereRaw('LOWER(COALESCE(name, \'\')) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(COALESCE(code, \'\')) LIKE ?', [$term]))
                    ->orWhereHas('sentByUser', fn ($user) => $user
                        ->whereRaw('LOWER(COALESCE(name, \'\')) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(COALESCE(last_name, \'\')) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(COALESCE(usuario, \'\')) LIKE ?', [$term]));
            });
        }

        if ($filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }

        if ($filters['origin_warehouse_id'] !== '') {
            $query->where('origin_warehouse_id', $filters['origin_warehouse_id']);
        }

        if ($filters['destination_warehouse_id'] !== '') {
            $query->where('destination_warehouse_id', $filters['destination_warehouse_id']);
        }

        if ($filters['date_from'] !== '') {
            $query->where('created_at', '>=', \Carbon\Carbon::parse($filters['date_from'])->startOfDay());
        }

        if ($filters['date_to'] !== '') {
            $query->where('created_at', '<=', \Carbon\Carbon::parse($filters['date_to'])->endOfDay());
        }
    }

    private function applyAllowedZonalsToComponentsQuery(Request $request, $query): void
    {
        $allowedZonalIds = $request->attributes->get('allowed_zonal_ids');

        if ($allowedZonalIds === null) {
            return;
        }

        if ($allowedZonalIds === []) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->whereHas('warehouse.office', fn ($officeQuery) => $officeQuery->whereIn('zonal_id', $allowedZonalIds));
    }

    private function cleanString(mixed $value): string
    {
        return ($value === null || $value === 'null') ? '' : trim((string) $value);
    }

    private function canEditTransfer(Request $request, AssetTransfer $assetTransfer): bool
    {
        $user = $request->user();
        if (! $user || ! $user->can('asset_transfers.update')) {
            return false;
        }

        if ($assetTransfer->status === 'cancelled') {
            return false;
        }

        if ($user->hasRole('superadmin')) {
            return $assetTransfer->status !== 'received';
        }

        return $assetTransfer->status === 'approved'
            && $this->canOperateTransfer($request, $assetTransfer);
    }

    private function applyTransferVisibilityScope(Builder $query, Request $request): void
    {
        $user = $request->user();

        if (! $user) {
            $query->whereRaw('1 = 0');

            return;
        }

        if ($this->canViewAllTransfers($request)) {
            return;
        }

        $query->where(function (Builder $builder) use ($user) {
            $builder
                ->where('sent_by', $user->id)
                ->orWhere('received_by', $user->id);
        });
    }

    private function canAccessTransfer(Request $request, AssetTransfer $assetTransfer): bool
    {
        $user = $request->user();

        if (! $user) {
            return false;
        }

        if ($this->canViewAllTransfers($request)) {
            return true;
        }

        return $assetTransfer->sent_by === $user->id || $assetTransfer->received_by === $user->id;
    }

    private function canViewAllTransfers(Request $request): bool
    {
        $user = $request->user();

        if (! $user) {
            return false;
        }

        return $user->hasRole('superadmin')
            || $user->can('asset_transfers.approve')
            || $user->can('asset_transfers.cancel');
    }

    private function canOperateTransfer(Request $request, AssetTransfer $assetTransfer): bool
    {
        $user = $request->user();

        if (! $user) {
            return false;
        }

        if ($user->hasRole('superadmin')) {
            return true;
        }

        return $assetTransfer->sent_by === $user->id;
    }

    private function canReceiveTransfer(Request $request, AssetTransfer $assetTransfer): bool
    {
        $user = $request->user();

        if (! $user) {
            return false;
        }

        if ($user->hasRole('superadmin')) {
            return true;
        }

        return $assetTransfer->received_by === $user->id;
    }
}
