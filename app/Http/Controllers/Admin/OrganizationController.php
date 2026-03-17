<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Organization\OfficeRequest;
use App\Http\Requests\Admin\Organization\WarehouseRequest;
use App\Http\Requests\Admin\Organization\ZonalRequest;
use App\Models\Office;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\Zonal;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationController extends Controller
{
    public function index(Request $request): Response
    {
        $zonals = Zonal::query()->with('manager:id,name')->orderBy('name')->get();
        $offices = Office::query()->with('zonal:id,name,code')->orderBy('name')->get();
        $warehouses = Warehouse::query()->with(['office:id,name,code,zonal_id', 'manager:id,name'])->orderBy('name')->get();
        $users = User::query()
            ->assignable()
            ->orderBy('name')
            ->get(['id', 'name', 'last_name', 'document_number']);

        return Inertia::render('admin/organization/index', [
            'zonals' => $zonals,
            'offices' => $offices,
            'warehouses' => $warehouses,
            'users' => $users,
            'can' => [
                'create_zonal' => $request->user()?->can('zonals.create'),
                'update_zonal' => $request->user()?->can('zonals.update'),
                'delete_zonal' => $request->user()?->can('zonals.delete'),
                'create_office' => $request->user()?->can('offices.create'),
                'update_office' => $request->user()?->can('offices.update'),
                'delete_office' => $request->user()?->can('offices.delete'),
                'create_warehouse' => $request->user()?->can('warehouses.create'),
                'update_warehouse' => $request->user()?->can('warehouses.update'),
                'delete_warehouse' => $request->user()?->can('warehouses.delete'),
            ],
        ]);
    }

    public function storeZonal(ZonalRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $trashed = Zonal::onlyTrashed()
            ->where('name', $validated['name'])
            ->where('code', $validated['code'])
            ->first();

        if ($trashed) {
            return redirect()->back()
                ->with('restore_candidate', ['type' => 'zonal', 'id' => $trashed->id, 'name' => $trashed->name])
                ->with('restore_payload', $validated);
        }

        Zonal::create($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Zonal creado correctamente.']);
    }

    public function updateZonal(ZonalRequest $request, Zonal $zonal): RedirectResponse
    {
        $zonal->update($request->validated());

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Zonal actualizado correctamente.']);
    }

    public function destroyZonal(Zonal $zonal): RedirectResponse
    {
        $zonal->delete();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Zonal eliminado correctamente.']);
    }

    public function restoreZonal(Request $request): RedirectResponse
    {
        abort_if(! $request->user()?->can('zonals.create'), 403);
        $request->validate(['id' => ['required', 'uuid']]);
        $zonal = Zonal::withTrashed()->findOrFail($request->input('id'));
        $zonal->restore();
        $zonal->update($request->only(['name', 'code', 'region', 'manager_id', 'timezone', 'is_active']));

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Zonal restaurado correctamente.']);
    }

    public function storeOffice(OfficeRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $query = Office::onlyTrashed()
            ->where('zonal_id', $validated['zonal_id'])
            ->where('name', $validated['name']);
        $query = isset($validated['code']) && $validated['code'] !== ''
            ? $query->where('code', $validated['code'])
            : $query->where(function ($q) {
                $q->whereNull('code')->orWhere('code', '');
            });
        $trashed = $query->first();

        if ($trashed) {
            return redirect()->back()
                ->with('restore_candidate', ['type' => 'office', 'id' => $trashed->id, 'name' => $trashed->name])
                ->with('restore_payload', $validated);
        }

        Office::create($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Oficina creada correctamente.']);
    }

    public function updateOffice(OfficeRequest $request, Office $office): RedirectResponse
    {
        $office->update($request->validated());

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Oficina actualizada correctamente.']);
    }

    public function destroyOffice(Office $office): RedirectResponse
    {
        $office->delete();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Oficina eliminada correctamente.']);
    }

    public function restoreOffice(Request $request): RedirectResponse
    {
        abort_if(! $request->user()?->can('offices.create'), 403);
        $request->validate(['id' => ['required', 'uuid']]);
        $office = Office::withTrashed()->findOrFail($request->input('id'));
        $office->restore();
        $office->update($request->only(['zonal_id', 'name', 'code', 'address', 'is_active']));

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Oficina restaurada correctamente.']);
    }

    public function storeWarehouse(WarehouseRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $query = Warehouse::onlyTrashed()
            ->where('office_id', $validated['office_id'])
            ->where('name', $validated['name']);
        $query = isset($validated['code']) && $validated['code'] !== ''
            ? $query->where('code', $validated['code'])
            : $query->where(function ($q) {
                $q->whereNull('code')->orWhere('code', '');
            });
        $trashed = $query->first();

        if ($trashed) {
            return redirect()->back()
                ->with('restore_candidate', ['type' => 'warehouse', 'id' => $trashed->id, 'name' => $trashed->name])
                ->with('restore_payload', $validated);
        }

        Warehouse::create($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Almacén creado correctamente.']);
    }

    public function updateWarehouse(WarehouseRequest $request, Warehouse $warehouse): RedirectResponse
    {
        $warehouse->update($request->validated());

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Almacén actualizado correctamente.']);
    }

    public function destroyWarehouse(Warehouse $warehouse): RedirectResponse
    {
        $warehouse->delete();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Almacén eliminado correctamente.']);
    }

    public function restoreWarehouse(Request $request): RedirectResponse
    {
        abort_if(! $request->user()?->can('warehouses.create'), 403);
        $request->validate(['id' => ['required', 'uuid']]);
        $warehouse = Warehouse::withTrashed()->findOrFail($request->input('id'));
        $warehouse->restore();
        $warehouse->update($request->only(['office_id', 'name', 'code', 'capacity', 'manager_id', 'is_active']));

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Almacén restaurado correctamente.']);
    }
}
