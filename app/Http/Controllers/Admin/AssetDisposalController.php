<?php

namespace App\Http\Controllers\Admin;

use App\Exports\AssetDisposalsAndSalesExport;
use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\AssetDisposal;
use App\Models\AssetSale;
use App\Models\Component;
use App\Models\Office;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\Zonal;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Maatwebsite\Excel\Facades\Excel;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AssetDisposalController extends Controller
{
    private const PER_PAGE = 25;

    public function index(Request $request): Response
    {
        $tab = $request->input('tab', 'disposals');
        if (! in_array($tab, ['disposals', 'sales'], true)) {
            $tab = 'disposals';
        }

        $status = $this->cleanString($request->input('status', ''));
        $type = $this->cleanString($request->input('type', '')); // asset|component
        $dateFrom = $this->cleanString($request->input('date_from', ''));
        $dateTo = $this->cleanString($request->input('date_to', ''));
        $zonalId = $this->cleanString($request->input('zonal_id', ''));
        $officeId = $this->cleanString($request->input('office_id', ''));
        $warehouseId = $this->cleanString($request->input('warehouse_id', ''));

        if ($dateFrom === '' && $dateTo === '') {
            $dateFrom = now()->startOfMonth()->format('Y-m-d');
            $dateTo = now()->endOfMonth()->format('Y-m-d');
        }

        /** @var \App\Models\User|null $authUser */
        $authUser = $request->user();
        $allowedZonalIds = [];
        if ($authUser && ! $authUser->hasRole('superadmin', 'web')) {
            $allowedZonalIds = $authUser->zonals()->pluck('zonals.id')->all();
        }

        $disposalsQuery = AssetDisposal::query()
            ->with([
                'asset:id,code,serial_number,category_id,model_id,warehouse_id',
                'asset.category:id,name,code,type',
                'asset.model:id,name,brand_id',
                'asset.model.brand:id,name',
                'component:id,code,serial_number,type_id,brand_id,model,warehouse_id',
                'component.type:id,name,code',
                'component.brand:id,name',
                'warehouse:id,name,code,office_id',
                'warehouse.office:id,name,code,zonal_id',
                'warehouse.office.zonal:id,name,code',
                'approvedByUser:id,name,last_name,usuario',
                'createdByUser:id,name,last_name,usuario',
                'sale',
            ]);

        if (! empty($allowedZonalIds)) {
            $disposalsQuery->whereHas('warehouse.office', function (Builder $q) use ($allowedZonalIds) {
                $q->whereIn('zonal_id', $allowedZonalIds);
            });
        }

        $this->applyDisposalFilters($disposalsQuery, $status, $type, $dateFrom, $dateTo, $zonalId, $officeId, $warehouseId);

        $disposals = $disposalsQuery
            ->orderByDesc('created_at')
            ->paginate(self::PER_PAGE, ['*'], 'disposals_page')
            ->withQueryString();

        $sales = AssetSale::query()
            ->with([
                'disposal:id,asset_id,component_id,warehouse_id,status,reason',
                'disposal.asset:id,code,serial_number',
                'disposal.component:id,code,serial_number',
                'disposal.warehouse:id,name,code,office_id',
                'disposal.warehouse.office:id,name,code,zonal_id',
                'disposal.warehouse.office.zonal:id,name,code',
                'createdBy:id,name,last_name,usuario',
                'approvedBy:id,name,last_name,usuario',
            ])
            ->when(! empty($allowedZonalIds), function (Builder $q) use ($allowedZonalIds) {
                $q->whereHas('disposal.warehouse.office', function (Builder $officeQuery) use ($allowedZonalIds) {
                    $officeQuery->whereIn('zonal_id', $allowedZonalIds);
                });
            })
            ->tap(function (Builder $query) use ($status, $dateFrom, $dateTo, $zonalId, $officeId, $warehouseId): void {
                if ($status !== '') {
                    $query->where('status', $status);
                }

                if ($dateFrom !== '') {
                    $query->whereDate('sold_at', '>=', $dateFrom);
                }

                if ($dateTo !== '') {
                    $query->whereDate('sold_at', '<=', $dateTo);
                }

                if ($warehouseId !== '') {
                    $query->whereHas('disposal', fn (Builder $d) => $d->where('warehouse_id', $warehouseId));
                } elseif ($officeId !== '') {
                    $query->whereHas('disposal.warehouse.office', function (Builder $officeQuery) use ($officeId) {
                        $officeQuery->where('id', $officeId);
                    });
                } elseif ($zonalId !== '') {
                    $query->whereHas('disposal.warehouse.office', function (Builder $officeQuery) use ($zonalId) {
                        $officeQuery->where('zonal_id', $zonalId);
                    });
                }
            })
            ->orderByDesc('sold_at')
            ->orderByDesc('created_at')
            ->paginate(self::PER_PAGE, ['*'], 'sales_page')
            ->withQueryString();

        return Inertia::render('admin/asset-disposals/index', array_merge(
            [
                'tab' => $tab,
                'disposals' => $disposals,
                'sales' => $sales,
                'filters' => [
                    'status' => $status,
                    'type' => $type,
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                    'zonal_id' => $zonalId,
                    'office_id' => $officeId,
                    'warehouse_id' => $warehouseId,
                ],
            ],
            $this->formPayload($allowedZonalIds)
        ));
    }

    public function export(Request $request): BinaryFileResponse
    {
        $status = $this->cleanString($request->input('status', ''));
        $type = $this->cleanString($request->input('type', '')); // asset|component
        $dateFrom = $this->cleanString($request->input('date_from', ''));
        $dateTo = $this->cleanString($request->input('date_to', ''));
        $zonalId = $this->cleanString($request->input('zonal_id', ''));
        $officeId = $this->cleanString($request->input('office_id', ''));
        $warehouseId = $this->cleanString($request->input('warehouse_id', ''));

        if ($dateFrom === '' && $dateTo === '') {
            $dateFrom = now()->startOfMonth()->format('Y-m-d');
            $dateTo = now()->endOfMonth()->format('Y-m-d');
        }

        /** @var \App\Models\User|null $authUser */
        $authUser = $request->user();
        $allowedZonalIds = [];
        if ($authUser && ! $authUser->hasRole('superadmin', 'web')) {
            $allowedZonalIds = $authUser->zonals()->pluck('zonals.id')->all();
        }

        $disposalsQuery = AssetDisposal::query()
            ->with([
                'asset:id,code,serial_number,category_id,model_id,warehouse_id',
                'asset.category:id,name,code,type',
                'asset.model:id,name,brand_id',
                'asset.model.brand:id,name',
                'component:id,code,serial_number,type_id,brand_id,model,warehouse_id',
                'component.type:id,name,code',
                'component.brand:id,name',
                'warehouse:id,name,code,office_id',
                'warehouse.office:id,name,code,zonal_id',
                'warehouse.office.zonal:id,name,code',
                'approvedByUser:id,name,last_name,usuario',
                'createdByUser:id,name,last_name,usuario',
            ]);

        if (! empty($allowedZonalIds)) {
            $disposalsQuery->whereHas('warehouse.office', function (Builder $q) use ($allowedZonalIds) {
                $q->whereIn('zonal_id', $allowedZonalIds);
            });
        }

        $this->applyDisposalFilters($disposalsQuery, $status, $type, $dateFrom, $dateTo, $zonalId, $officeId, $warehouseId);
        $disposals = $disposalsQuery->orderByDesc('created_at')->get();

        $salesQuery = AssetSale::query()
            ->with([
                'disposal:id,asset_id,component_id,warehouse_id,status,reason',
                'disposal.asset:id,code,serial_number,category_id,model_id,warehouse_id',
                'disposal.asset.category:id,name,code,type',
                'disposal.asset.model:id,name,brand_id',
                'disposal.asset.model.brand:id,name',
                'disposal.component:id,code,serial_number,type_id,brand_id,model,warehouse_id',
                'disposal.component.type:id,name,code',
                'disposal.component.brand:id,name',
                'disposal.warehouse:id,name,code,office_id',
                'disposal.warehouse.office:id,name,code,zonal_id',
                'disposal.warehouse.office.zonal:id,name,code',
                'createdBy:id,name,last_name,usuario',
                'approvedBy:id,name,last_name,usuario',
            ])
            ->when(! empty($allowedZonalIds), function (Builder $q) use ($allowedZonalIds) {
                $q->whereHas('disposal.warehouse.office', function (Builder $officeQuery) use ($allowedZonalIds) {
                    $officeQuery->whereIn('zonal_id', $allowedZonalIds);
                });
            })
            ->tap(function (Builder $query) use ($status, $dateFrom, $dateTo, $zonalId, $officeId, $warehouseId): void {
                if ($status !== '') {
                    $query->where('status', $status);
                }

                if ($dateFrom !== '') {
                    $query->whereDate('sold_at', '>=', $dateFrom);
                }

                if ($dateTo !== '') {
                    $query->whereDate('sold_at', '<=', $dateTo);
                }

                if ($warehouseId !== '') {
                    $query->whereHas('disposal', fn (Builder $d) => $d->where('warehouse_id', $warehouseId));
                } elseif ($officeId !== '') {
                    $query->whereHas('disposal.warehouse.office', function (Builder $officeQuery) use ($officeId) {
                        $officeQuery->where('id', $officeId);
                    });
                } elseif ($zonalId !== '') {
                    $query->whereHas('disposal.warehouse.office', function (Builder $officeQuery) use ($zonalId) {
                        $officeQuery->where('zonal_id', $zonalId);
                    });
                }
            });

        $sales = $salesQuery
            ->orderByDesc('sold_at')
            ->orderByDesc('created_at')
            ->get();

        $filename = 'bajas-y-ventas-'.now()->format('Y-m-d-His').'.xlsx';

        return Excel::download(new AssetDisposalsAndSalesExport($disposals, $sales), $filename, \Maatwebsite\Excel\Excel::XLSX);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'item_type' => ['required', 'string', 'in:asset,component'],
            'asset_id' => ['nullable', 'uuid', 'exists:assets,id'],
            'component_id' => ['nullable', 'uuid', 'exists:components,id'],
            'reason' => ['required', 'string'],
        ]);

        $assetId = $data['item_type'] === 'asset' ? $data['asset_id'] : null;
        $componentId = $data['item_type'] === 'component' ? $data['component_id'] : null;

        if (! $assetId && ! $componentId) {
            return redirect()->back()->withErrors([
                'asset_id' => 'Debe seleccionar un activo o un componente.',
            ])->withInput();
        }

        $warehouseId = null;
        if ($assetId) {
            $asset = Asset::query()->select(['id', 'warehouse_id'])->find($assetId);
            $warehouseId = $asset?->warehouse_id;
        } elseif ($componentId) {
            $component = Component::query()->select(['id', 'warehouse_id'])->find($componentId);
            $warehouseId = $component?->warehouse_id;
        }

        $disposal = AssetDisposal::create([
            'asset_id' => $assetId,
            'component_id' => $componentId,
            'warehouse_id' => $warehouseId,
            'status' => 'requested',
            'reason' => $this->cleanString($data['reason']),
            'created_by' => $request->user()?->id,
        ]);

        $this->notifyApproversOnNewDisposal($request->user(), $disposal);

        return redirect()->route('admin.asset-disposals.index', ['tab' => 'disposals'])
            ->with('toast', ['type' => 'success', 'message' => 'Solicitud de baja registrada.']);
    }

    public function approve(Request $request, AssetDisposal $asset_disposal): RedirectResponse
    {
        if ($asset_disposal->status !== 'requested') {
            abort(422, 'Solo se puede aprobar una baja en estado solicitado.');
        }

        $asset_disposal->update([
            'status' => 'approved',
            'approved_by' => $request->user()?->id,
            'approved_at' => now(),
        ]);

        $asset_disposal->loadMissing('asset', 'component', 'warehouse.office.zonal', 'createdByUser', 'approvedByUser');

        if ($asset_disposal->asset) {
            $asset_disposal->asset->update(['status' => 'disposed']);
        } elseif ($asset_disposal->component) {
            $asset_disposal->component->update(['status' => 'disposed']);
        }

        $this->notifyCreatorOnApprovedDisposal($asset_disposal);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Baja aprobada correctamente.',
        ]);
    }

    public function reject(Request $request, AssetDisposal $asset_disposal): RedirectResponse
    {
        if ($asset_disposal->status !== 'requested') {
            abort(422, 'Solo se puede rechazar una baja en estado solicitado.');
        }

        $reason = $this->cleanString($request->input('reason', ''));
        if ($reason === '') {
            return redirect()->back()->withErrors(['reason' => 'Debe indicar el motivo de rechazo.']);
        }

        $asset_disposal->update([
            'status' => 'rejected',
        ]);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Baja rechazada correctamente.',
        ]);
    }

    public function destroy(AssetDisposal $asset_disposal): RedirectResponse
    {
        if ($asset_disposal->status !== 'requested') {
            abort(422, 'Solo se puede eliminar una baja en estado solicitado.');
        }

        $asset_disposal->delete();

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Solicitud de baja eliminada.',
        ]);
    }

    public function storeSale(Request $request, AssetDisposal $asset_disposal): RedirectResponse
    {
        if ($asset_disposal->status !== 'approved') {
            abort(422, 'Solo se puede registrar una venta para una baja aprobada.');
        }

        $data = $request->validate([
            'buyer_name' => ['required', 'string', 'max:200'],
            'buyer_dni' => ['nullable', 'string', 'max:20'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['nullable', 'string', 'max:60'],
            'sold_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $existingSale = $asset_disposal->sale;
        if ($existingSale && $existingSale->status === 'approved') {
            abort(422, 'No se puede modificar una venta que ya fue aprobada.');
        }

        $sale = AssetSale::firstOrNew(['asset_disposal_id' => $asset_disposal->id]);
        if (! $sale->exists) {
            $sale->created_by = $request->user()?->id;
        }

        $sale->buyer_name = $this->cleanString($data['buyer_name']);
        $sale->buyer_dni = $this->nullableString($data['buyer_dni'] ?? null);
        $sale->amount = $data['amount'] ?? null;
        $sale->payment_method = $this->nullableString($data['payment_method'] ?? null);
        $sale->sold_at = $data['sold_at'] ?? now();
        $sale->notes = $this->nullableString($data['notes'] ?? null);
        $sale->status = 'pending_approval';
        $sale->approved_by = null;
        $sale->approved_at = null;
        $sale->approval_notes = null;
        $sale->save();

        $this->notifyApproversOnNewSale($sale);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Venta registrada y pendiente de aprobación.',
        ]);
    }

    public function destroySale(AssetDisposal $asset_disposal, AssetSale $asset_sale): RedirectResponse
    {
        abort_unless($asset_sale->asset_disposal_id === $asset_disposal->id, 404);

        if ($asset_sale->status === 'approved') {
            abort(422, 'No se puede eliminar una venta aprobada.');
        }

        $asset_sale->delete();

        if ($asset_disposal->status === 'approved') {
            $asset_disposal->loadMissing('asset', 'component');
            if ($asset_disposal->asset) {
                $asset_disposal->asset->update(['status' => 'disposed']);
            } elseif ($asset_disposal->component) {
                $asset_disposal->component->update(['status' => 'disposed']);
            }
        }

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Venta eliminada correctamente.',
        ]);
    }

    public function approveSale(Request $request, AssetDisposal $asset_disposal, AssetSale $asset_sale): RedirectResponse
    {
        abort_unless($asset_sale->asset_disposal_id === $asset_disposal->id, 404);

        if ($asset_sale->status !== 'pending_approval') {
            abort(422, 'Solo se puede aprobar una venta en estado pendiente de aprobación.');
        }

        $data = $request->validate([
            'approval_notes' => ['required', 'string'],
        ]);

        $asset_sale->status = 'approved';
        $asset_sale->approved_by = $request->user()?->id;
        $asset_sale->approved_at = now();
        $asset_sale->approval_notes = $this->cleanString($data['approval_notes']);
        $asset_sale->save();

        $asset_disposal->loadMissing('asset', 'component');
        if ($asset_disposal->asset) {
            $asset_disposal->asset->update(['status' => 'sold']);
        } elseif ($asset_disposal->component) {
            $asset_disposal->component->update(['status' => 'sold']);
        }

        $this->notifyCreatorOnApprovedSale($asset_sale);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Venta aprobada correctamente.',
        ]);
    }

    private function applyDisposalFilters(
        Builder $query,
        string $status,
        string $type,
        string $dateFrom,
        string $dateTo,
        string $zonalId,
        string $officeId,
        string $warehouseId
    ): void {
        if ($status !== '') {
            $query->where('status', $status);
        }

        if ($type === 'asset') {
            $query->whereNotNull('asset_id');
        } elseif ($type === 'component') {
            $query->whereNotNull('component_id');
        }

        if ($dateFrom !== '') {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo !== '') {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        if ($warehouseId !== '') {
            $query->where('warehouse_id', $warehouseId);
        } elseif ($officeId !== '') {
            $query->whereHas('warehouse.office', function (Builder $officeQuery) use ($officeId) {
                $officeQuery->where('id', $officeId);
            });
        } elseif ($zonalId !== '') {
            $query->whereHas('warehouse.office', function (Builder $officeQuery) use ($zonalId) {
                $officeQuery->where('zonal_id', $zonalId);
            });
        }
    }

    private function formPayload(array $allowedZonalIds = []): array
    {
        $zonalsForSelect = Zonal::query()
            ->where('is_active', true)
            ->when(! empty($allowedZonalIds), fn (Builder $q) => $q->whereIn('id', $allowedZonalIds))
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        $officesForSelect = Office::query()
            ->where('is_active', true)
            ->when(! empty($allowedZonalIds), fn (Builder $q) => $q->whereIn('zonal_id', $allowedZonalIds))
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'zonal_id']);

        $warehousesForSelect = Warehouse::query()
            ->where('is_active', true)
            ->when(! empty($allowedZonalIds), function (Builder $q) use ($allowedZonalIds) {
                $q->whereHas('office', fn (Builder $o) => $o->whereIn('zonal_id', $allowedZonalIds));
            })
            ->with('office:id,name,code,zonal_id')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'office_id']);

        $assetsForSelect = Asset::query()
            ->with(['category:id,name,code,type', 'model:id,name,brand_id', 'model.brand:id,name', 'warehouse.office:zonal_id,id,name,code'])
            ->whereNotIn('status', ['disposed', 'sold'])
            ->when(! empty($allowedZonalIds), function (Builder $q) use ($allowedZonalIds) {
                $q->whereHas('warehouse.office', fn (Builder $o) => $o->whereIn('zonal_id', $allowedZonalIds));
            })
            ->orderBy('code')
            ->get(['id', 'code', 'serial_number', 'category_id', 'model_id', 'warehouse_id']);

        $componentsForSelect = Component::query()
            ->with(['type:id,name,code', 'brand:id,name', 'warehouse.office:zonal_id,id,name,code'])
            ->where('status', '<>', 'disposed')
            ->when(! empty($allowedZonalIds), function (Builder $q) use ($allowedZonalIds) {
                $q->whereHas('warehouse.office', fn (Builder $o) => $o->whereIn('zonal_id', $allowedZonalIds));
            })
            ->orderBy('code')
            ->get(['id', 'code', 'serial_number', 'type_id', 'brand_id', 'model', 'warehouse_id']);

        $usersForSelect = User::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'last_name', 'usuario']);

        return [
            'zonalsForSelect' => $zonalsForSelect,
            'officesForSelect' => $officesForSelect,
            'warehousesForSelect' => $warehousesForSelect,
            'assetsForSelect' => $assetsForSelect,
            'componentsForSelect' => $componentsForSelect,
            'usersForSelect' => $usersForSelect,
        ];
    }

    private function notifyApproversOnNewDisposal(?Authenticatable $creator, AssetDisposal $disposal): void
    {
        $disposal->loadMissing('asset.category', 'asset.model.brand', 'component.type', 'component.brand', 'warehouse.office.zonal', 'createdByUser');

        $approvers = User::query()
            ->permission('asset_disposals.approve')
            ->where('is_active', true)
            ->get();

        if ($approvers->isEmpty()) {
            return;
        }

        $detailUrl = route('admin.asset-disposals.index', ['tab' => 'disposals']);

        $mailFailed = false;

        foreach ($approvers as $user) {
            if (! $user->email) {
                continue;
            }

            try {
                Mail::send(
                    'emails.asset-disposal-requested',
                    ['disposal' => $disposal, 'detailUrl' => $detailUrl, 'recipient' => $user],
                    static function ($message) use ($user): void {
                        $message->to($user->email, $user->name ?: $user->usuario ?: null)
                            ->subject('Nueva solicitud de baja registrada');
                    }
                );
            } catch (\Throwable $e) {
                report($e);
                $mailFailed = true;
            }
        }

        if ($mailFailed) {
            session()->flash('toast', [
                'type' => 'error',
                'message' => 'La solicitud se registró, pero hubo un problema al enviar las notificaciones por correo. Verifique los correos configurados.',
            ]);
        }
    }

    private function notifyCreatorOnApprovedDisposal(AssetDisposal $disposal): void
    {
        $disposal->loadMissing('asset.category', 'asset.model.brand', 'component.type', 'component.brand', 'warehouse.office.zonal', 'createdByUser', 'approvedByUser');

        $creator = $disposal->createdByUser;

        if (! $creator || ! $creator->email) {
            return;
        }

        $detailUrl = route('admin.asset-disposals.index', ['tab' => 'disposals']);

        try {
            Mail::send(
                'emails.asset-disposal-approved',
                ['disposal' => $disposal, 'detailUrl' => $detailUrl, 'recipient' => $creator],
                static function ($message) use ($creator): void {
                    $message->to($creator->email, $creator->name ?: $creator->usuario ?: null)
                        ->subject('Solicitud de baja aprobada');
                }
            );
        } catch (\Throwable $e) {
            report($e);
            session()->flash('toast', [
                'type' => 'error',
                'message' => 'La baja fue aprobada, pero hubo un problema al enviar el correo de notificación. Verifique el correo configurado.',
            ]);
        }
    }

    private function notifyApproversOnNewSale(AssetSale $sale): void
    {
        $sale->loadMissing('disposal.warehouse.office.zonal', 'disposal.asset.category', 'disposal.asset.model.brand', 'disposal.component.type', 'disposal.component.brand', 'createdBy');

        $approvers = User::query()
            ->permission('asset_disposals.sale.approve')
            ->where('is_active', true)
            ->get();

        if ($approvers->isEmpty()) {
            return;
        }

        $detailUrl = route('admin.asset-disposals.index', ['tab' => 'sales']);
        $mailFailed = false;

        foreach ($approvers as $user) {
            if (! $user->email) {
                continue;
            }

            try {
                Mail::send(
                    'emails.asset-sale-requested',
                    ['sale' => $sale, 'detailUrl' => $detailUrl, 'recipient' => $user],
                    static function ($message) use ($user): void {
                        $message->to($user->email, $user->name ?: $user->usuario ?: null)
                            ->subject('Nueva venta registrada (pendiente de aprobación)');
                    }
                );
            } catch (\Throwable $e) {
                report($e);
                $mailFailed = true;
            }
        }

        if ($mailFailed) {
            session()->flash('toast', [
                'type' => 'error',
                'message' => 'La venta se registró, pero hubo un problema al enviar las notificaciones por correo. Verifique los correos configurados.',
            ]);
        }
    }

    private function notifyCreatorOnApprovedSale(AssetSale $sale): void
    {
        $sale->loadMissing('disposal.warehouse.office.zonal', 'disposal.asset.category', 'disposal.asset.model.brand', 'disposal.component.type', 'disposal.component.brand', 'createdBy', 'approvedBy');

        $creator = $sale->createdBy;

        if (! $creator || ! $creator->email) {
            return;
        }

        $detailUrl = route('admin.asset-disposals.index', ['tab' => 'sales']);

        try {
            Mail::send(
                'emails.asset-sale-approved',
                ['sale' => $sale, 'detailUrl' => $detailUrl, 'recipient' => $creator],
                static function ($message) use ($creator): void {
                    $message->to($creator->email, $creator->name ?: $creator->usuario ?: null)
                        ->subject('Venta aprobada');
                }
            );
        } catch (\Throwable $e) {
            report($e);
            session()->flash('toast', [
                'type' => 'error',
                'message' => 'La venta fue aprobada, pero hubo un problema al enviar el correo de notificación. Verifique el correo configurado.',
            ]);
        }
    }

    private function cleanString(mixed $value): string
    {
        if ($value === null || $value === 'null') {
            return '';
        }

        return trim((string) $value);
    }

    private function nullableString(mixed $value): ?string
    {
        $clean = $this->cleanString($value);

        return $clean === '' ? null : $clean;
    }
}

