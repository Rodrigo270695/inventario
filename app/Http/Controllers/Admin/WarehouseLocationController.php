<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\WarehouseLocationRequest;
use App\Models\Office;
use App\Models\Warehouse;
use App\Models\WarehouseLocation;
use App\Models\Zonal;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WarehouseLocationController extends Controller
{
    public function index(Request $request): Response
    {
        $zonals = Zonal::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code', 'is_active']);
        $offices = Office::query()->orderBy('name')->get(['id', 'zonal_id', 'name', 'code', 'is_active']);
        $warehouses = Warehouse::query()
            ->withCount('locations')
            ->orderBy('name')
            ->get();
        $locations = WarehouseLocation::query()
            ->with('warehouse:id,name,code')
            ->orderBy('code')
            ->get();
        $zonalsTrashedCount = Zonal::onlyTrashed()->count();
        $officesTrashedCount = Office::onlyTrashed()->count();
        $warehousesTrashedCount = Warehouse::onlyTrashed()->count();

        return Inertia::render('admin/warehouse-locations/index', [
            'zonals' => $zonals,
            'offices' => $offices,
            'warehouses' => $warehouses,
            'locations' => $locations,
            'zonals_trashed_count' => $zonalsTrashedCount,
            'offices_trashed_count' => $officesTrashedCount,
            'warehouses_trashed_count' => $warehousesTrashedCount,
            'can' => [
                'create' => $request->user()?->can('warehouse_locations.create'),
                'update' => $request->user()?->can('warehouse_locations.update'),
                'delete' => $request->user()?->can('warehouse_locations.delete'),
            ],
        ]);
    }

    public function store(WarehouseLocationRequest $request): RedirectResponse
    {
        WarehouseLocation::create($request->validated());

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Ubicación creada correctamente.']);
    }

    public function update(WarehouseLocationRequest $request, WarehouseLocation $warehouse_location): RedirectResponse
    {
        $warehouse_location->update($request->validated());

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Ubicación actualizada correctamente.']);
    }

    public function destroy(WarehouseLocation $warehouse_location): RedirectResponse
    {
        $warehouse_location->delete();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Ubicación eliminada correctamente.']);
    }
}
