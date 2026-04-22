<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\License\LicenseAssignmentRequest;
use App\Http\Requests\Admin\License\SoftwareInstallationRequest;
use App\Http\Requests\Admin\License\SoftwareLicenseRequest;
use App\Http\Requests\Admin\License\SoftwareProductRequest;
use App\Http\Requests\Admin\License\SoftwareVendorRequest;
use App\Models\Asset;
use App\Models\LicenseAssignment;
use App\Models\SoftwareInstallation;
use App\Models\SoftwareLicense;
use App\Models\SoftwareProduct;
use App\Models\SoftwareVendor;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class LicenseController extends Controller
{
    public function index(Request $request): Response
    {
        $tab = (string) $request->input('tab', 'vendors');
        if (! in_array($tab, ['vendors', 'products', 'licenses', 'assignments', 'installations'], true)) {
            $tab = 'vendors';
        }

        $q = trim((string) $request->input('q', ''));
        $vendorId = trim((string) $request->input('vendor_id', ''));
        $productId = trim((string) $request->input('product_id', ''));
        $assetId = trim((string) $request->input('asset_id', ''));

        [$vSortBy, $vSortOrder] = $this->listSort($request, 'vendors', ['name', 'created_at'], 'name', 'asc');
        $vendorsQuery = SoftwareVendor::query();
        if ($q !== '') {
            $term = '%'.mb_strtolower($q).'%';
            $vendorsQuery->whereRaw('LOWER(name) LIKE ?', [$term]);
        }
        $vendorsQuery->orderBy($vSortBy, $vSortOrder);
        $vendors = $vendorsQuery->paginate(10, ['*'], 'vendors_page')->withQueryString();

        [$pSortBy, $pSortOrder] = $this->listSort($request, 'products', ['name', 'created_at', 'is_tracked', 'vendor'], 'name', 'asc');
        $productsQuery = SoftwareProduct::query()->with('vendor:id,name');
        if ($q !== '') {
            $term = '%'.mb_strtolower($q).'%';
            $productsQuery->whereRaw('LOWER(software_products.name) LIKE ?', [$term]);
        }
        if ($vendorId !== '') {
            $productsQuery->where('software_products.vendor_id', $vendorId);
        }
        if ($pSortBy === 'vendor') {
            $productsQuery
                ->leftJoin('software_vendors as products_vendor_sort', 'software_products.vendor_id', '=', 'products_vendor_sort.id')
                ->orderBy('products_vendor_sort.name', $pSortOrder)
                ->select('software_products.*');
        } else {
            $productsQuery->orderBy('software_products.'.$pSortBy, $pSortOrder);
        }
        $products = $productsQuery->paginate(10, ['*'], 'products_page')->withQueryString();

        [$licSortBy, $licSortOrder] = $this->listSort(
            $request,
            'licenses',
            ['product', 'vendor', 'license_type', 'seats_total', 'seats_used', 'valid_until', 'cost', 'created_at'],
            'created_at',
            'desc'
        );
        $licensesQuery = SoftwareLicense::query()
            ->with('product:id,vendor_id,name', 'product.vendor:id,name');
        if ($productId !== '') {
            $licensesQuery->where('software_licenses.product_id', $productId);
        } elseif ($vendorId !== '') {
            $licensesQuery->whereHas('product', fn ($q) => $q->where('vendor_id', $vendorId));
        }
        match ($licSortBy) {
            'product' => $licensesQuery
                ->leftJoin('software_products as lic_prod_sort', 'software_licenses.product_id', '=', 'lic_prod_sort.id')
                ->orderBy('lic_prod_sort.name', $licSortOrder)
                ->select('software_licenses.*'),
            'vendor' => $licensesQuery
                ->leftJoin('software_products as lic_prod_sort', 'software_licenses.product_id', '=', 'lic_prod_sort.id')
                ->leftJoin('software_vendors as lic_vend_sort', 'lic_prod_sort.vendor_id', '=', 'lic_vend_sort.id')
                ->orderBy('lic_vend_sort.name', $licSortOrder)
                ->select('software_licenses.*'),
            default => $licensesQuery->orderBy('software_licenses.'.$licSortBy, $licSortOrder),
        };
        $licenses = $licensesQuery->paginate(10, ['*'], 'licenses_page')->withQueryString();

        [$aSortBy, $aSortOrder] = $this->listSort(
            $request,
            'assignments',
            ['assigned_at', 'revoked_at', 'valid_until', 'created_at', 'asset', 'product'],
            'assigned_at',
            'desc'
        );
        $assignmentsQuery = LicenseAssignment::query()
            ->with([
                'softwareLicense:id,product_id,license_type,seats_total,seats_used,valid_until',
                'softwareLicense.product:id,vendor_id,name',
                'softwareLicense.product.vendor:id,name',
                'asset:id,code,serial_number,model_id',
                'asset.model:id,name,brand_id',
                'asset.model.brand:id,name',
            ]);
        if ($productId !== '') {
            $assignmentsQuery->whereHas('softwareLicense', fn ($q) => $q->where('product_id', $productId));
        } elseif ($vendorId !== '') {
            $assignmentsQuery->whereHas('softwareLicense.product', fn ($q) => $q->where('vendor_id', $vendorId));
        }
        if ($assetId !== '') {
            $assignmentsQuery->where('license_assignments.asset_id', $assetId);
        }
        match ($aSortBy) {
            'asset' => $assignmentsQuery
                ->leftJoin('assets as asn_asset_sort', 'license_assignments.asset_id', '=', 'asn_asset_sort.id')
                ->orderBy('asn_asset_sort.code', $aSortOrder)
                ->select('license_assignments.*'),
            'product' => $assignmentsQuery
                ->leftJoin('software_licenses as asn_sl_sort', 'license_assignments.software_license_id', '=', 'asn_sl_sort.id')
                ->leftJoin('software_products as asn_sp_sort', 'asn_sl_sort.product_id', '=', 'asn_sp_sort.id')
                ->orderBy('asn_sp_sort.name', $aSortOrder)
                ->select('license_assignments.*'),
            default => $assignmentsQuery->orderBy('license_assignments.'.$aSortBy, $aSortOrder),
        };
        $assignments = $assignmentsQuery->paginate(10, ['*'], 'assignments_page')->withQueryString();

        [$iSortBy, $iSortOrder] = $this->listSort(
            $request,
            'installations',
            ['version', 'detected_at', 'is_authorized', 'created_at', 'asset', 'product'],
            'detected_at',
            'desc'
        );
        $installationsQuery = SoftwareInstallation::query()
            ->with([
                'product:id,vendor_id,name,is_tracked',
                'product.vendor:id,name',
                'asset:id,code,serial_number,model_id',
                'asset.model:id,name,brand_id',
                'asset.model.brand:id,name',
            ]);
        if ($productId !== '') {
            $installationsQuery->where('software_installations.product_id', $productId);
        } elseif ($vendorId !== '') {
            $installationsQuery->whereHas('product', fn ($q) => $q->where('vendor_id', $vendorId));
        }
        if ($assetId !== '') {
            $installationsQuery->where('software_installations.asset_id', $assetId);
        }
        match ($iSortBy) {
            'asset' => $installationsQuery
                ->leftJoin('assets as ins_asset_sort', 'software_installations.asset_id', '=', 'ins_asset_sort.id')
                ->orderBy('ins_asset_sort.code', $iSortOrder)
                ->select('software_installations.*'),
            'product' => $installationsQuery
                ->leftJoin('software_products as ins_sp_sort', 'software_installations.product_id', '=', 'ins_sp_sort.id')
                ->orderBy('ins_sp_sort.name', $iSortOrder)
                ->select('software_installations.*'),
            default => $installationsQuery->orderBy('software_installations.'.$iSortBy, $iSortOrder),
        };
        $installations = $installationsQuery->paginate(10, ['*'], 'installations_page')->withQueryString();

        $vendorsForSelect = SoftwareVendor::query()
            ->orderBy('name')
            ->get(['id', 'name']);
        $productsForSelect = SoftwareProduct::query()
            ->with('vendor:id,name')
            ->orderBy('name')
            ->get(['id', 'vendor_id', 'name', 'is_tracked']);
        $licensesForSelect = SoftwareLicense::query()
            ->with('product:id,name,vendor_id', 'product.vendor:id,name')
            ->orderByDesc('created_at')
            ->get(['id', 'product_id', 'license_type', 'seats_total', 'seats_used', 'valid_until']);
        $assetsForSelect = Asset::query()
            ->with('model:id,name,brand_id', 'model.brand:id,name')
            ->orderBy('code')
            ->get(['id', 'code', 'serial_number', 'model_id']);

        return Inertia::render('admin/licenses/index', [
            'tab' => $tab,
            'filters' => [
                'q' => $q,
                'vendor_id' => $vendorId,
                'product_id' => $productId,
                'asset_id' => $assetId,
                'vendors_sort_by' => $vSortBy,
                'vendors_sort_order' => $vSortOrder,
                'products_sort_by' => $pSortBy,
                'products_sort_order' => $pSortOrder,
                'licenses_sort_by' => $licSortBy,
                'licenses_sort_order' => $licSortOrder,
                'assignments_sort_by' => $aSortBy,
                'assignments_sort_order' => $aSortOrder,
                'installations_sort_by' => $iSortBy,
                'installations_sort_order' => $iSortOrder,
            ],
            'vendors' => $vendors,
            'products' => $products,
            'licenses' => $licenses,
            'assignments' => $assignments,
            'installations' => $installations,
            'vendorsForSelect' => $vendorsForSelect,
            'productsForSelect' => $productsForSelect,
            'licensesForSelect' => $licensesForSelect,
            'assetsForSelect' => $assetsForSelect,
        ]);
    }

    public function storeVendor(SoftwareVendorRequest $request): RedirectResponse
    {
        SoftwareVendor::create($request->validated());

        return back()->with('toast', ['type' => 'success', 'message' => 'Fabricante creado correctamente.']);
    }

    public function updateVendor(SoftwareVendorRequest $request, SoftwareVendor $softwareVendor): RedirectResponse
    {
        $softwareVendor->update($request->validated());

        return back()->with('toast', ['type' => 'success', 'message' => 'Fabricante actualizado correctamente.']);
    }

    public function destroyVendor(SoftwareVendor $softwareVendor): RedirectResponse
    {
        abort_unless(request()->user()?->can('licenses.delete'), 403);

        try {
            $softwareVendor->delete();
        } catch (QueryException) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No se puede eliminar el fabricante porque tiene productos asociados.',
            ]);
        }

        return back()->with('toast', ['type' => 'success', 'message' => 'Fabricante eliminado correctamente.']);
    }

    public function storeProduct(SoftwareProductRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['is_tracked'] = (bool) ($data['is_tracked'] ?? true);
        SoftwareProduct::create($data);

        return back()->with('toast', ['type' => 'success', 'message' => 'Producto creado correctamente.']);
    }

    public function updateProduct(SoftwareProductRequest $request, SoftwareProduct $softwareProduct): RedirectResponse
    {
        $data = $request->validated();
        $data['is_tracked'] = (bool) ($data['is_tracked'] ?? true);
        $softwareProduct->update($data);

        return back()->with('toast', ['type' => 'success', 'message' => 'Producto actualizado correctamente.']);
    }

    public function destroyProduct(SoftwareProduct $softwareProduct): RedirectResponse
    {
        abort_unless(request()->user()?->can('licenses.delete'), 403);

        try {
            $softwareProduct->delete();
        } catch (QueryException) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No se puede eliminar el producto porque tiene licencias o instalaciones asociadas.',
            ]);
        }

        return back()->with('toast', ['type' => 'success', 'message' => 'Producto eliminado correctamente.']);
    }

    public function storeLicense(SoftwareLicenseRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['seats_used'] = (int) ($data['seats_used'] ?? 0);
        SoftwareLicense::create($data);

        return back()->with('toast', ['type' => 'success', 'message' => 'Licencia creada correctamente.']);
    }

    public function updateLicense(SoftwareLicenseRequest $request, SoftwareLicense $softwareLicense): RedirectResponse
    {
        $data = $request->validated();
        $data['seats_used'] = (int) ($data['seats_used'] ?? $softwareLicense->seats_used);

        if ($data['seats_used'] > $data['seats_total']) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Asientos usados no puede exceder asientos totales.',
            ]);
        }

        $softwareLicense->update($data);

        return back()->with('toast', ['type' => 'success', 'message' => 'Licencia actualizada correctamente.']);
    }

    public function destroyLicense(SoftwareLicense $softwareLicense): RedirectResponse
    {
        abort_unless(request()->user()?->can('licenses.delete'), 403);

        try {
            $softwareLicense->delete();
        } catch (QueryException) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No se puede eliminar la licencia porque tiene asignaciones asociadas.',
            ]);
        }

        return back()->with('toast', ['type' => 'success', 'message' => 'Licencia eliminada correctamente.']);
    }

    public function storeAssignment(LicenseAssignmentRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $assignedAt = $data['assigned_at'] ?? now();

        return DB::transaction(function () use ($data, $assignedAt) {
            $license = SoftwareLicense::query()
                ->lockForUpdate()
                ->findOrFail($data['software_license_id']);

            $alreadyAssigned = LicenseAssignment::query()
                ->where('software_license_id', $license->id)
                ->where('asset_id', $data['asset_id'])
                ->whereNull('revoked_at')
                ->exists();

            if ($alreadyAssigned) {
                return back()->with('toast', [
                    'type' => 'error',
                    'message' => 'Ese activo ya tiene una asignación activa para esta licencia.',
                ]);
            }

            if ($license->seats_used >= $license->seats_total) {
                return back()->with('toast', [
                    'type' => 'error',
                    'message' => 'No hay asientos disponibles para esta licencia.',
                ]);
            }

            LicenseAssignment::create([
                'software_license_id' => $license->id,
                'asset_id' => $data['asset_id'],
                'assigned_at' => $assignedAt,
                'valid_until' => $data['valid_until'] ?? null,
            ]);

            $license->increment('seats_used');

            return back()->with('toast', ['type' => 'success', 'message' => 'Asignación registrada correctamente.']);
        });
    }

    public function revokeAssignment(Request $request, LicenseAssignment $licenseAssignment): RedirectResponse
    {
        abort_unless($request->user()?->can('licenses.revoke'), 403);

        $data = $request->validate([
            'revoked_at' => ['nullable', 'date'],
        ]);

        if ($licenseAssignment->revoked_at !== null) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'La asignación ya fue revocada.',
            ]);
        }

        return DB::transaction(function () use ($licenseAssignment, $data) {
            $license = SoftwareLicense::query()->lockForUpdate()->findOrFail($licenseAssignment->software_license_id);

            $licenseAssignment->update([
                'revoked_at' => $data['revoked_at'] ?? now(),
            ]);

            if ($license->seats_used > 0) {
                $license->decrement('seats_used');
            }

            return back()->with('toast', ['type' => 'success', 'message' => 'Asignación revocada correctamente.']);
        });
    }

    public function destroyAssignment(Request $request, LicenseAssignment $licenseAssignment): RedirectResponse
    {
        abort_unless($request->user()?->can('licenses.delete'), 403);

        return DB::transaction(function () use ($licenseAssignment) {
            $license = SoftwareLicense::query()->lockForUpdate()->findOrFail($licenseAssignment->software_license_id);
            $wasActive = $licenseAssignment->revoked_at === null;
            $licenseAssignment->delete();

            if ($wasActive && $license->seats_used > 0) {
                $license->decrement('seats_used');
            }

            return back()->with('toast', ['type' => 'success', 'message' => 'Asignación eliminada correctamente.']);
        });
    }

    public function storeInstallation(SoftwareInstallationRequest $request): RedirectResponse
    {
        $data = $request->validated();

        SoftwareInstallation::create([
            'asset_id' => $data['asset_id'],
            'product_id' => $data['product_id'],
            'version' => $data['version'] ?? null,
            'detected_at' => $data['detected_at'] ?? now(),
            'is_authorized' => (bool) ($data['is_authorized'] ?? false),
        ]);

        return back()->with('toast', ['type' => 'success', 'message' => 'Instalación registrada correctamente.']);
    }

    public function updateInstallation(SoftwareInstallationRequest $request, SoftwareInstallation $softwareInstallation): RedirectResponse
    {
        $data = $request->validated();

        $softwareInstallation->update([
            'asset_id' => $data['asset_id'],
            'product_id' => $data['product_id'],
            'version' => $data['version'] ?? null,
            'detected_at' => $data['detected_at'] ?? now(),
            'is_authorized' => (bool) ($data['is_authorized'] ?? false),
        ]);

        return back()->with('toast', ['type' => 'success', 'message' => 'Instalación actualizada correctamente.']);
    }

    public function destroyInstallation(Request $request, SoftwareInstallation $softwareInstallation): RedirectResponse
    {
        abort_unless($request->user()?->can('licenses.delete'), 403);

        $softwareInstallation->delete();

        return back()->with('toast', ['type' => 'success', 'message' => 'Instalación eliminada correctamente.']);
    }

    /**
     * @param  array<int, string>  $allowed
     * @return array{0: string, 1: string}
     */
    private function listSort(Request $request, string $listKey, array $allowed, string $defaultColumn, string $defaultOrder): array
    {
        $by = (string) $request->input("{$listKey}_sort_by", $defaultColumn);
        if (! in_array($by, $allowed, true)) {
            $by = $defaultColumn;
        }
        $orderInput = (string) $request->input("{$listKey}_sort_order", $defaultOrder);
        $order = strtolower($orderInput) === 'desc' ? 'desc' : 'asc';

        return [$by, $order];
    }
}
