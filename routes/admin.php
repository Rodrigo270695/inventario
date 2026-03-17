<?php

use App\Http\Controllers\Admin\ApiPeruRucController;
use App\Http\Controllers\Admin\AlertController;
use App\Http\Controllers\Admin\AssetCatalogController;
use App\Http\Controllers\Admin\AssetController;
use App\Http\Controllers\Admin\AssetDisposalController;
use App\Http\Controllers\Admin\AssetTransferController;
use App\Http\Controllers\Admin\ComponentController;
use App\Http\Controllers\Admin\DepartmentController;
use App\Http\Controllers\Admin\GlAccountController;
use App\Http\Controllers\Admin\DepreciationController;
use App\Http\Controllers\Admin\InventoryCountController;
use App\Http\Controllers\Admin\InvoiceController;
use App\Http\Controllers\Admin\AssetCategoryController;
use App\Http\Controllers\Admin\OrganizationController;
use App\Http\Controllers\Admin\PurchaseOrderController;
use App\Http\Controllers\Admin\StockEntryController;
use App\Http\Controllers\Admin\SupplierController;
use App\Http\Controllers\Admin\RepairShopController;
use App\Http\Controllers\Admin\RepairTicketController;
use App\Http\Controllers\Admin\PreventiveMaintenanceController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\ServiceController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\WarehouseLocationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->prefix('admin')->name('admin.')->group(function () {
    // ApiPeru (RUC)
    Route::get('api-peru/ruc', [ApiPeruRucController::class, 'basic'])
        ->middleware('role_or_permission:suppliers.create|repair_shops.create')
        ->name('api-peru.ruc');
    Route::get('api-peru/ruc-info', [ApiPeruRucController::class, 'showInfo'])
        ->middleware('role_or_permission:suppliers.create|repair_shops.create')
        ->name('api-peru.ruc-info');
    Route::get('alerts', [AlertController::class, 'index'])
        ->middleware('permission:alerts.view')
        ->name('alerts.index');
    Route::get('depreciation', [DepreciationController::class, 'index'])
        ->middleware('permission:depreciation.view')
        ->name('depreciation.index');
    Route::post('depreciation/schedules', [DepreciationController::class, 'storeSchedule'])
        ->middleware('permission:depreciation.create')
        ->name('depreciation.schedules.store');
    Route::put('depreciation/schedules/{depreciation_schedule}', [DepreciationController::class, 'updateSchedule'])
        ->middleware('permission:depreciation.update')
        ->name('depreciation.schedules.update');
    Route::delete('depreciation/schedules/{depreciation_schedule}', [DepreciationController::class, 'destroySchedule'])
        ->middleware('permission:depreciation.delete')
        ->name('depreciation.schedules.destroy');
    Route::post('depreciation/entries/{depreciation_entry}/approve', [DepreciationController::class, 'approveEntry'])
        ->middleware('permission:depreciation.approve')
        ->name('depreciation.entries.approve');
    Route::post('depreciation/entries/bulk-approve', [DepreciationController::class, 'bulkApproveEntries'])
        ->middleware('permission:depreciation.approve')
        ->name('depreciation.entries.bulk-approve');
    Route::get('asset-catalog', [AssetCatalogController::class, 'index'])->middleware('permission:asset_subcategories.view')->name('asset-catalog.index');
    Route::post('asset-catalog/subcategories', [AssetCatalogController::class, 'storeSubcategory'])->middleware('permission:asset_subcategories.create')->name('asset-catalog.subcategories.store');
    Route::put('asset-catalog/subcategories/{asset_subcategory}', [AssetCatalogController::class, 'updateSubcategory'])->middleware('permission:asset_subcategories.update')->name('asset-catalog.subcategories.update');
    Route::delete('asset-catalog/subcategories/{asset_subcategory}', [AssetCatalogController::class, 'destroySubcategory'])->middleware('permission:asset_subcategories.delete')->name('asset-catalog.subcategories.destroy');
    Route::post('asset-catalog/brands', [AssetCatalogController::class, 'storeBrand'])->middleware('permission:asset_brands.create')->name('asset-catalog.brands.store');
    Route::put('asset-catalog/brands/{asset_brand}', [AssetCatalogController::class, 'updateBrand'])->middleware('permission:asset_brands.update')->name('asset-catalog.brands.update');
    Route::delete('asset-catalog/brands/{asset_brand}', [AssetCatalogController::class, 'destroyBrand'])->middleware('permission:asset_brands.delete')->name('asset-catalog.brands.destroy');
    Route::post('asset-catalog/models', [AssetCatalogController::class, 'storeModel'])->middleware('permission:asset_models.create')->name('asset-catalog.models.store');
    Route::put('asset-catalog/models/{asset_model}', [AssetCatalogController::class, 'updateModel'])->middleware('permission:asset_models.update')->name('asset-catalog.models.update');
    Route::delete('asset-catalog/models/{asset_model}', [AssetCatalogController::class, 'destroyModel'])->middleware('permission:asset_models.delete')->name('asset-catalog.models.destroy');
    Route::post('asset-catalog/models/restore', [AssetCatalogController::class, 'restoreModel'])->middleware('permission:asset_models.create')->name('asset-catalog.models.restore');
    Route::post('asset-catalog/component-types', [AssetCatalogController::class, 'storeComponentType'])->middleware('permission:component_types.create')->name('asset-catalog.component-types.store');
    Route::put('asset-catalog/component-types/{component_type}', [AssetCatalogController::class, 'updateComponentType'])->middleware('permission:component_types.update')->name('asset-catalog.component-types.update');
    Route::delete('asset-catalog/component-types/{component_type}', [AssetCatalogController::class, 'destroyComponentType'])->middleware('permission:component_types.delete')->name('asset-catalog.component-types.destroy');

    Route::get('zonals', [OrganizationController::class, 'index'])->middleware('permission:zonals.view')->name('zonals.index');
    Route::post('zonals', [OrganizationController::class, 'storeZonal'])->middleware('permission:zonals.create')->name('zonals.store');
    Route::post('zonals/restore', [OrganizationController::class, 'restoreZonal'])->middleware('permission:zonals.create')->name('zonals.restore');
    Route::put('zonals/{zonal}', [OrganizationController::class, 'updateZonal'])->middleware('permission:zonals.update')->name('zonals.update');
    Route::delete('zonals/{zonal}', [OrganizationController::class, 'destroyZonal'])->middleware('permission:zonals.delete')->name('zonals.destroy');
    Route::post('offices', [OrganizationController::class, 'storeOffice'])->middleware('permission:offices.create')->name('offices.store');
    Route::post('offices/restore', [OrganizationController::class, 'restoreOffice'])->middleware('permission:offices.create')->name('offices.restore');
    Route::put('offices/{office}', [OrganizationController::class, 'updateOffice'])->middleware('permission:offices.update')->name('offices.update');
    Route::delete('offices/{office}', [OrganizationController::class, 'destroyOffice'])->middleware('permission:offices.delete')->name('offices.destroy');
    Route::post('warehouses', [OrganizationController::class, 'storeWarehouse'])->middleware('permission:warehouses.create')->name('warehouses.store');
    Route::post('warehouses/restore', [OrganizationController::class, 'restoreWarehouse'])->middleware('permission:warehouses.create')->name('warehouses.restore');
    Route::put('warehouses/{warehouse}', [OrganizationController::class, 'updateWarehouse'])->middleware('permission:warehouses.update')->name('warehouses.update');
    Route::delete('warehouses/{warehouse}', [OrganizationController::class, 'destroyWarehouse'])->middleware('permission:warehouses.delete')->name('warehouses.destroy');

    Route::get('warehouse-locations', [WarehouseLocationController::class, 'index'])
        ->middleware(['permission:warehouse_locations.view', 'filter.zonals.by.user'])
        ->name('warehouse-locations.index');
    Route::post('warehouse-locations', [WarehouseLocationController::class, 'store'])->middleware('permission:warehouse_locations.create')->name('warehouse-locations.store');
    Route::put('warehouse-locations/{warehouse_location}', [WarehouseLocationController::class, 'update'])->middleware('permission:warehouse_locations.update')->name('warehouse-locations.update');
    Route::delete('warehouse-locations/{warehouse_location}', [WarehouseLocationController::class, 'destroy'])->middleware('permission:warehouse_locations.delete')->name('warehouse-locations.destroy');

    Route::get('repair-shops', [RepairShopController::class, 'index'])
        ->middleware(['permission:repair_shops.view', 'filter.zonals.by.user'])
        ->name('repair-shops.index');
    Route::post('repair-shops', [RepairShopController::class, 'store'])->middleware('permission:repair_shops.create')->name('repair-shops.store');
    Route::post('repair-shops/restore', [RepairShopController::class, 'restore'])->middleware('permission:repair_shops.create')->name('repair-shops.restore');
    Route::put('repair-shops/{repair_shop}', [RepairShopController::class, 'update'])->middleware('permission:repair_shops.update')->name('repair-shops.update');
    Route::delete('repair-shops/{repair_shop}', [RepairShopController::class, 'destroy'])->middleware('permission:repair_shops.delete')->name('repair-shops.destroy');

    Route::get('repair-tickets', [RepairTicketController::class, 'index'])
        ->middleware(['role_or_permission:repair_tickets.view|repair_tickets.create|repair_tickets.update|repair_tickets.delete|repair_tickets.approve|repair_tickets.cancel|repair_tickets.configure', 'filter.zonals.by.user'])
        ->name('repair-tickets.index');
    Route::get('repair-tickets/export', [RepairTicketController::class, 'export'])
        ->middleware(['permission:repair_tickets.export', 'filter.zonals.by.user'])
        ->name('repair-tickets.export');
    Route::get('repair-tickets/create', [RepairTicketController::class, 'create'])
        ->middleware(['permission:repair_tickets.create', 'filter.zonals.by.user'])
        ->name('repair-tickets.create');
    Route::post('repair-tickets', [RepairTicketController::class, 'store'])
        ->middleware(['permission:repair_tickets.create', 'filter.zonals.by.user'])
        ->name('repair-tickets.store');
    Route::get('repair-tickets/{repair_ticket}/edit', [RepairTicketController::class, 'edit'])
        ->middleware(['permission:repair_tickets.update', 'filter.zonals.by.user'])
        ->name('repair-tickets.edit');
    Route::get('repair-tickets/{repair_ticket}/config', [RepairTicketController::class, 'config'])
        ->middleware(['permission:repair_tickets.configure', 'filter.zonals.by.user'])
        ->name('repair-tickets.config');
    Route::put('repair-tickets/{repair_ticket}', [RepairTicketController::class, 'update'])
        ->middleware(['role_or_permission:repair_tickets.update|repair_tickets.configure', 'filter.zonals.by.user'])
        ->name('repair-tickets.update');
    Route::post('repair-tickets/{repair_ticket}/parts', [RepairTicketController::class, 'storePart'])
        ->middleware(['role_or_permission:repair_tickets.update|repair_tickets.configure', 'filter.zonals.by.user'])
        ->name('repair-tickets.parts.store');
    Route::delete('repair-tickets/{repair_ticket}/parts/{repair_part}', [RepairTicketController::class, 'destroyPart'])
        ->middleware(['role_or_permission:repair_tickets.update|repair_tickets.configure', 'filter.zonals.by.user'])
        ->name('repair-tickets.parts.destroy');
    Route::post('repair-tickets/{repair_ticket}/costs', [RepairTicketController::class, 'storeCost'])
        ->middleware(['role_or_permission:repair_tickets.update|repair_tickets.configure', 'filter.zonals.by.user'])
        ->name('repair-tickets.costs.store');
    Route::delete('repair-tickets/{repair_ticket}/costs/{repair_cost}', [RepairTicketController::class, 'destroyCost'])
        ->middleware(['role_or_permission:repair_tickets.update|repair_tickets.configure', 'filter.zonals.by.user'])
        ->name('repair-tickets.costs.destroy');
    Route::post('repair-tickets/{repair_ticket}/documents', [RepairTicketController::class, 'storeDocument'])
        ->middleware(['role_or_permission:repair_tickets.update|repair_tickets.configure', 'filter.zonals.by.user'])
        ->name('repair-tickets.documents.store');
    Route::delete('repair-tickets/{repair_ticket}/documents/{maintenance_document}', [RepairTicketController::class, 'destroyDocument'])
        ->middleware(['role_or_permission:repair_tickets.update|repair_tickets.configure', 'filter.zonals.by.user'])
        ->name('repair-tickets.documents.destroy');
    Route::post('repair-tickets/{repair_ticket}/approve', [RepairTicketController::class, 'approve'])
        ->middleware(['permission:repair_tickets.approve', 'filter.zonals.by.user'])
        ->name('repair-tickets.approve');
    Route::post('repair-tickets/{repair_ticket}/cancel', [RepairTicketController::class, 'cancel'])
        ->middleware(['permission:repair_tickets.cancel', 'filter.zonals.by.user'])
        ->name('repair-tickets.cancel');
    Route::post('repair-tickets/{repair_ticket}/diagnosed', [RepairTicketController::class, 'markDiagnosed'])
        ->middleware(['role_or_permission:repair_tickets.update|repair_tickets.configure', 'filter.zonals.by.user'])
        ->name('repair-tickets.diagnosed');
    Route::post('repair-tickets/{repair_ticket}/in-progress', [RepairTicketController::class, 'markInProgress'])
        ->middleware(['role_or_permission:repair_tickets.update|repair_tickets.configure', 'filter.zonals.by.user'])
        ->name('repair-tickets.in-progress');
    Route::post('repair-tickets/{repair_ticket}/completed', [RepairTicketController::class, 'markCompleted'])
        ->middleware(['role_or_permission:repair_tickets.update|repair_tickets.configure', 'filter.zonals.by.user'])
        ->name('repair-tickets.completed');
    Route::delete('repair-tickets/{repair_ticket}', [RepairTicketController::class, 'destroy'])
        ->middleware(['permission:repair_tickets.delete', 'filter.zonals.by.user'])
        ->name('repair-tickets.destroy');

    Route::get('preventive-maintenance', [PreventiveMaintenanceController::class, 'index'])
        ->middleware(['role_or_permission:preventive_plans.view|preventive_plans.create|preventive_plans.update|preventive_plans.delete|preventive_tasks.view|preventive_tasks.create|preventive_tasks.update|preventive_tasks.delete'])
        ->name('preventive-maintenance.index');
    Route::post('preventive-maintenance/plans', [PreventiveMaintenanceController::class, 'storePlan'])
        ->middleware('permission:preventive_plans.create')
        ->name('preventive-maintenance.plans.store');
    Route::put('preventive-maintenance/plans/{preventive_plan}', [PreventiveMaintenanceController::class, 'updatePlan'])
        ->middleware('permission:preventive_plans.update')
        ->name('preventive-maintenance.plans.update');
    Route::delete('preventive-maintenance/plans/{preventive_plan}', [PreventiveMaintenanceController::class, 'destroyPlan'])
        ->middleware('permission:preventive_plans.delete')
        ->name('preventive-maintenance.plans.destroy');
    Route::post('preventive-maintenance/tasks', [PreventiveMaintenanceController::class, 'storeTask'])
        ->middleware('permission:preventive_tasks.create')
        ->name('preventive-maintenance.tasks.store');
    Route::put('preventive-maintenance/tasks/{preventive_task}', [PreventiveMaintenanceController::class, 'updateTask'])
        ->middleware('permission:preventive_tasks.update')
        ->name('preventive-maintenance.tasks.update');
    Route::delete('preventive-maintenance/tasks/{preventive_task}', [PreventiveMaintenanceController::class, 'destroyTask'])
        ->middleware('permission:preventive_tasks.delete')
        ->name('preventive-maintenance.tasks.destroy');

    Route::get('assets', [AssetController::class, 'index'])
        ->middleware(['permission:assets.view', 'filter.zonals.by.user'])
        ->name('assets.index');
    Route::post('assets', [AssetController::class, 'store'])->middleware('permission:assets.create')->name('assets.store');
    Route::post('assets/restore', [AssetController::class, 'restore'])->middleware('permission:assets.create')->name('assets.restore');
    Route::put('assets/{asset}', [AssetController::class, 'update'])->middleware('permission:assets.update')->name('assets.update');
    Route::delete('assets/{asset}', [AssetController::class, 'destroy'])->middleware('permission:assets.delete')->name('assets.destroy');
    Route::put('assets/{asset}/specs', [AssetController::class, 'updateSpecs'])->middleware('permission:assets.update')->name('assets.specs.update');
    Route::put('assets/{asset}/computer', [AssetController::class, 'updateComputer'])->middleware('permission:assets.update')->name('assets.computer.update');
    Route::post('assets/{asset}/assignments', [AssetController::class, 'storeAssignment'])->middleware('permission:assets.update')->name('assets.assignments.store');
    Route::put('assets/{asset}/assignments/{assignment}/return', [AssetController::class, 'returnAssignment'])->middleware('permission:assets.update')->name('assets.assignments.return');
    Route::post('assets/{asset}/photos', [AssetController::class, 'storePhoto'])->middleware('permission:assets.update')->name('assets.photos.store');
    Route::delete('assets/{asset}/photos/{photo}', [AssetController::class, 'destroyPhoto'])->middleware('permission:assets.update')->name('assets.photos.destroy');
    Route::post('assets/{asset}/computer-components', [AssetController::class, 'storeComputerComponent'])->middleware('permission:assets.update')->name('assets.computer-components.store');
    Route::put('assets/{asset}/computer-components/{computerComponent}/retire', [AssetController::class, 'retireComputerComponent'])->middleware('permission:assets.update')->name('assets.computer-components.retire');
    Route::get('assets/{asset}/config', [AssetController::class, 'config'])
        ->middleware(['permission:assets.configure', 'filter.zonals.by.user'])
        ->name('assets.config');
    Route::get('assets/export', [AssetController::class, 'export'])
        ->middleware(['permission:assets.export', 'filter.zonals.by.user'])
        ->name('assets.export');
    Route::get('assets/barcodes/preview', [AssetController::class, 'barcodesPreview'])
        ->middleware(['permission:assets.barcodes.bulk', 'filter.zonals.by.user'])
        ->name('assets.barcodes.preview');
    Route::get('assets/barcodes/pdf', [AssetController::class, 'barcodesPdf'])
        ->middleware(['permission:assets.barcodes.bulk', 'filter.zonals.by.user'])
        ->name('assets.barcodes.pdf');
    Route::get('assets/{asset}/barcode/preview', [AssetController::class, 'barcodePreview'])
        ->middleware(['permission:assets.barcodes.view', 'filter.zonals.by.user'])
        ->name('assets.barcode.preview');
    Route::get('assets/{asset}/barcode/pdf', [AssetController::class, 'barcodePdf'])
        ->middleware(['permission:assets.barcodes.view', 'filter.zonals.by.user'])
        ->name('assets.barcode.pdf');

    Route::get('components', [ComponentController::class, 'index'])->middleware('permission:components.view')->name('components.index');
    Route::post('components', [ComponentController::class, 'store'])->middleware('permission:components.create')->name('components.store');
    Route::put('components/{component}', [ComponentController::class, 'update'])->middleware('permission:components.update')->name('components.update');
    Route::delete('components/{component}', [ComponentController::class, 'destroy'])->middleware('permission:components.delete')->name('components.destroy');
    Route::put('components/{component}/specs', [ComponentController::class, 'updateSpecs'])->middleware('permission:components.update')->name('components.specs.update');
    Route::get('components/{component}/config', [ComponentController::class, 'config'])->middleware('permission:components.configure')->name('components.config');
    Route::get('components/export', [ComponentController::class, 'export'])->middleware('permission:components.export')->name('components.export');
    Route::get('components/barcodes/pdf', [ComponentController::class, 'barcodesPdf'])->middleware('permission:components.barcodes.bulk')->name('components.barcodes.pdf');
    Route::get('components/{component}/barcode/pdf', [ComponentController::class, 'barcodePdf'])->middleware('permission:components.barcodes.view')->name('components.barcode.pdf');

    Route::get('asset-transfers', [AssetTransferController::class, 'index'])
        ->middleware(['role_or_permission:asset_transfers.view|asset_transfers.view_detail|asset_transfers.create|asset_transfers.update|asset_transfers.delete|asset_transfers.approve|asset_transfers.cancel|asset_transfers.dispatch|asset_transfers.receive|asset_transfers.export', 'filter.zonals.by.user'])
        ->name('asset-transfers.index');
    Route::get('asset-transfers/export', [AssetTransferController::class, 'export'])
        ->middleware(['permission:asset_transfers.export', 'filter.zonals.by.user'])
        ->name('asset-transfers.export');
    Route::get('asset-transfers/create', [AssetTransferController::class, 'create'])
        ->middleware(['permission:asset_transfers.create', 'filter.zonals.by.user'])
        ->name('asset-transfers.create');
    Route::post('asset-transfers', [AssetTransferController::class, 'store'])
        ->middleware(['permission:asset_transfers.create', 'filter.zonals.by.user'])
        ->name('asset-transfers.store');
    Route::get('asset-transfers/{asset_transfer}', [AssetTransferController::class, 'show'])
        ->middleware(['permission:asset_transfers.view_detail', 'filter.zonals.by.user'])
        ->name('asset-transfers.show');
    Route::post('asset-transfers/{asset_transfer}/approve', [AssetTransferController::class, 'approve'])
        ->middleware(['permission:asset_transfers.approve', 'filter.zonals.by.user'])
        ->name('asset-transfers.approve');
    Route::post('asset-transfers/{asset_transfer}/cancel', [AssetTransferController::class, 'cancel'])
        ->middleware(['permission:asset_transfers.cancel', 'filter.zonals.by.user'])
        ->name('asset-transfers.cancel');
    Route::post('asset-transfers/{asset_transfer}/dispatch', [AssetTransferController::class, 'dispatch'])
        ->middleware(['permission:asset_transfers.dispatch', 'filter.zonals.by.user'])
        ->name('asset-transfers.dispatch');
    Route::post('asset-transfers/{asset_transfer}/receive', [AssetTransferController::class, 'receive'])
        ->middleware(['permission:asset_transfers.receive', 'filter.zonals.by.user'])
        ->name('asset-transfers.receive');
    Route::get('asset-transfers/{asset_transfer}/edit', [AssetTransferController::class, 'edit'])
        ->middleware(['permission:asset_transfers.update', 'filter.zonals.by.user'])
        ->name('asset-transfers.edit');
    Route::get('asset-transfers/{asset_transfer}/company-guide', [AssetTransferController::class, 'showCompanyGuide'])
        ->middleware(['permission:asset_transfers.view_detail', 'filter.zonals.by.user'])
        ->name('asset-transfers.company-guide');
    Route::get('asset-transfers/{asset_transfer}/carrier-voucher', [AssetTransferController::class, 'showCarrierVoucher'])
        ->middleware(['permission:asset_transfers.view_detail', 'filter.zonals.by.user'])
        ->name('asset-transfers.carrier-voucher');
    Route::put('asset-transfers/{asset_transfer}', [AssetTransferController::class, 'update'])
        ->middleware(['permission:asset_transfers.update', 'filter.zonals.by.user'])
        ->name('asset-transfers.update');
    Route::delete('asset-transfers/{asset_transfer}', [AssetTransferController::class, 'destroy'])
        ->middleware(['permission:asset_transfers.delete', 'filter.zonals.by.user'])
        ->name('asset-transfers.destroy');

    Route::get('asset-disposals', [AssetDisposalController::class, 'index'])
        ->middleware(['role_or_permission:asset_disposals.view|asset_disposals.create|asset_disposals.approve|asset_disposals.reject|asset_disposals.delete', 'filter.zonals.by.user'])
        ->name('asset-disposals.index');
    Route::get('asset-disposals/export', [AssetDisposalController::class, 'export'])
        ->middleware(['permission:asset_disposals.export', 'filter.zonals.by.user'])
        ->name('asset-disposals.export');
    Route::post('asset-disposals', [AssetDisposalController::class, 'store'])
        ->middleware(['permission:asset_disposals.create', 'filter.zonals.by.user'])
        ->name('asset-disposals.store');
    Route::post('asset-disposals/{asset_disposal}/approve', [AssetDisposalController::class, 'approve'])
        ->middleware(['permission:asset_disposals.approve', 'filter.zonals.by.user'])
        ->name('asset-disposals.approve');
    Route::post('asset-disposals/{asset_disposal}/reject', [AssetDisposalController::class, 'reject'])
        ->middleware(['permission:asset_disposals.reject', 'filter.zonals.by.user'])
        ->name('asset-disposals.reject');
    Route::delete('asset-disposals/{asset_disposal}', [AssetDisposalController::class, 'destroy'])
        ->middleware(['permission:asset_disposals.delete', 'filter.zonals.by.user'])
        ->name('asset-disposals.destroy');
    Route::post('asset-disposals/{asset_disposal}/sale', [AssetDisposalController::class, 'storeSale'])
        ->middleware(['permission:asset_disposals.sale', 'filter.zonals.by.user'])
        ->name('asset-disposals.sale.store');
    Route::delete('asset-disposals/{asset_disposal}/sale/{asset_sale}', [AssetDisposalController::class, 'destroySale'])
        ->middleware(['permission:asset_disposals.sale.delete', 'filter.zonals.by.user'])
        ->name('asset-disposals.sale.destroy');
    Route::post('asset-disposals/{asset_disposal}/sale/{asset_sale}/approve', [AssetDisposalController::class, 'approveSale'])
        ->middleware(['permission:asset_disposals.sale.approve', 'filter.zonals.by.user'])
        ->name('asset-disposals.sale.approve');

    Route::get('inventory-counts', [InventoryCountController::class, 'index'])
        ->middleware(['role_or_permission:inventory_counts.view|inventory_counts.create|inventory_counts.update|inventory_counts.delete', 'filter.zonals.by.user'])
        ->name('inventory-counts.index');
    Route::get('inventory-counts/{inventory_count}', [InventoryCountController::class, 'show'])
        ->middleware(['permission:inventory_counts.view_items', 'filter.zonals.by.user'])
        ->name('inventory-counts.show');
    Route::get('inventory-counts/{inventory_count}/export', [InventoryCountController::class, 'export'])
        ->middleware(['permission:inventory_counts.export', 'filter.zonals.by.user'])
        ->name('inventory-counts.export');
    Route::post('inventory-counts', [InventoryCountController::class, 'store'])
        ->middleware(['permission:inventory_counts.create', 'filter.zonals.by.user'])
        ->name('inventory-counts.store');
    Route::post('inventory-counts/{inventory_count}/scan', [InventoryCountController::class, 'scan'])
        ->middleware(['permission:inventory_counts.scan', 'filter.zonals.by.user'])
        ->name('inventory-counts.scan');
    Route::put('inventory-counts/{inventory_count}/items/{inventory_count_item}', [InventoryCountController::class, 'updateItem'])
        ->middleware(['permission:inventory_counts.scan', 'filter.zonals.by.user'])
        ->name('inventory-counts.items.update');
    Route::post('inventory-counts/{inventory_count}/reconcile', [InventoryCountController::class, 'reconcile'])
        ->middleware(['permission:inventory_counts.reconcile', 'filter.zonals.by.user'])
        ->name('inventory-counts.reconcile');
    Route::post('inventory-counts/{inventory_count}/close', [InventoryCountController::class, 'close'])
        ->middleware(['permission:inventory_counts.close', 'filter.zonals.by.user'])
        ->name('inventory-counts.close');
    Route::delete('inventory-counts/{inventory_count}', [InventoryCountController::class, 'destroy'])
        ->middleware(['permission:inventory_counts.delete', 'filter.zonals.by.user'])
        ->name('inventory-counts.destroy');

    Route::get('services', [ServiceController::class, 'index'])
        ->middleware(['role_or_permission:services.view|services.create|services.update|services.delete', 'filter.zonals.by.user'])
        ->name('services.index');
    Route::get('services/create', [ServiceController::class, 'create'])
        ->middleware(['permission:services.create', 'filter.zonals.by.user'])
        ->name('services.create');
    Route::post('services', [ServiceController::class, 'store'])
        ->middleware(['permission:services.create', 'filter.zonals.by.user'])
        ->name('services.store');
    Route::get('services/{service}/edit', [ServiceController::class, 'edit'])
        ->middleware(['permission:services.update', 'filter.zonals.by.user'])
        ->name('services.edit');
    Route::put('services/{service}', [ServiceController::class, 'update'])
        ->middleware(['permission:services.update', 'filter.zonals.by.user'])
        ->name('services.update');
    Route::delete('services/{service}', [ServiceController::class, 'destroy'])
        ->middleware(['permission:services.delete', 'filter.zonals.by.user'])
        ->name('services.destroy');

    Route::get('departments', [DepartmentController::class, 'index'])
        ->middleware(['permission:departments.view', 'filter.zonals.by.user'])
        ->name('departments.index');
    Route::post('departments', [DepartmentController::class, 'store'])->middleware('permission:departments.create')->name('departments.store');
    Route::post('departments/restore', [DepartmentController::class, 'restore'])->middleware('permission:departments.create')->name('departments.restore');
    Route::put('departments/{department}', [DepartmentController::class, 'update'])->middleware('permission:departments.update')->name('departments.update');
    Route::delete('departments/{department}', [DepartmentController::class, 'destroy'])->middleware('permission:departments.delete')->name('departments.destroy');

    Route::get('gl-accounts', [GlAccountController::class, 'index'])
        ->middleware('permission:gl_accounts.view')
        ->name('gl-accounts.index');
    Route::post('gl-accounts', [GlAccountController::class, 'store'])->middleware('permission:gl_accounts.create')->name('gl-accounts.store');
    Route::put('gl-accounts/{gl_account}', [GlAccountController::class, 'update'])->middleware('permission:gl_accounts.update')->name('gl-accounts.update');
    Route::delete('gl-accounts/{gl_account}', [GlAccountController::class, 'destroy'])->middleware('permission:gl_accounts.delete')->name('gl-accounts.destroy');

    Route::get('suppliers', [SupplierController::class, 'index'])->middleware('permission:suppliers.view')->name('suppliers.index');
    Route::post('suppliers', [SupplierController::class, 'store'])->middleware('permission:suppliers.create')->name('suppliers.store');
    Route::post('suppliers/restore', [SupplierController::class, 'restore'])->middleware('permission:suppliers.create')->name('suppliers.restore');
    Route::put('suppliers/{supplier}', [SupplierController::class, 'update'])->middleware('permission:suppliers.update')->name('suppliers.update');
    Route::delete('suppliers/{supplier}', [SupplierController::class, 'destroy'])->middleware('permission:suppliers.delete')->name('suppliers.destroy');

    Route::get('asset-categories', [AssetCategoryController::class, 'index'])
        ->middleware('permission:asset_categories.view')
        ->name('asset-categories.index');
    Route::post('asset-categories', [AssetCategoryController::class, 'store'])
        ->middleware('permission:asset_categories.create')
        ->name('asset-categories.store');
    Route::put('asset-categories/{asset_category}', [AssetCategoryController::class, 'update'])
        ->middleware('permission:asset_categories.update')
        ->name('asset-categories.update');
    Route::delete('asset-categories/{asset_category}', [AssetCategoryController::class, 'destroy'])
        ->middleware('permission:asset_categories.delete')
        ->name('asset-categories.destroy');

    Route::get('invoices', [InvoiceController::class, 'index'])
        ->middleware(['permission:invoices.view', 'filter.zonals.by.user'])
        ->name('invoices.index');
    Route::get('invoices/{invoice}/document', [InvoiceController::class, 'showDocument'])
        ->middleware(['permission:invoices.view', 'filter.zonals.by.user'])
        ->name('invoices.document');
    Route::get('invoices/{invoice}/remission-guide', [InvoiceController::class, 'showRemissionGuide'])
        ->middleware(['permission:invoices.view', 'filter.zonals.by.user'])
        ->name('invoices.remission-guide');
    Route::post('invoices', [InvoiceController::class, 'store'])
        ->middleware(['permission:invoices.create', 'filter.zonals.by.user'])
        ->name('invoices.store');
    Route::put('invoices/{invoice}', [InvoiceController::class, 'update'])
        ->middleware(['permission:invoices.update', 'filter.zonals.by.user'])
        ->name('invoices.update');
    Route::post('invoices/{invoice}/close', [InvoiceController::class, 'close'])
        ->middleware(['permission:invoices.status', 'filter.zonals.by.user'])
        ->name('invoices.close');
    Route::post('invoices/{invoice}/open', [InvoiceController::class, 'open'])
        ->middleware(['permission:invoices.status', 'filter.zonals.by.user'])
        ->name('invoices.open');
    Route::delete('invoices/{invoice}', [InvoiceController::class, 'destroy'])
        ->middleware(['permission:invoices.delete', 'filter.zonals.by.user'])
        ->name('invoices.destroy');

    Route::get('stock-entries', [StockEntryController::class, 'index'])
        ->middleware(['role_or_permission:stock_entries.view|stock_entries.items.create|stock_entries.items.update|stock_entries.items.delete|stock_entries.save', 'filter.zonals.by.user'])
        ->name('stock-entries.index');
    Route::get('stock-entries/{stock_entry}/items', [StockEntryController::class, 'items'])
        ->middleware(['role_or_permission:stock_entries.view|stock_entries.items.create|stock_entries.items.update|stock_entries.items.delete|stock_entries.save', 'filter.zonals.by.user'])
        ->name('stock-entries.items');
    Route::post('stock-entries/{stock_entry}/items', [StockEntryController::class, 'storeItem'])
        ->middleware(['permission:stock_entries.items.create', 'filter.zonals.by.user'])
        ->name('stock-entries.items.store');
    Route::put('stock-entries/{stock_entry}/items/{draft_item_id}', [StockEntryController::class, 'updateItem'])
        ->middleware(['permission:stock_entries.items.update', 'filter.zonals.by.user'])
        ->name('stock-entries.items.update');
    Route::delete('stock-entries/{stock_entry}/items/{draft_item_id}', [StockEntryController::class, 'destroyItem'])
        ->middleware(['permission:stock_entries.items.delete', 'filter.zonals.by.user'])
        ->name('stock-entries.items.destroy');
    Route::post('stock-entries', [StockEntryController::class, 'store'])
        ->middleware(['permission:stock_entries.create', 'filter.zonals.by.user'])
        ->name('stock-entries.store');
    Route::post('stock-entries/{stock_entry}/save', [StockEntryController::class, 'save'])
        ->middleware(['permission:stock_entries.save', 'filter.zonals.by.user'])
        ->name('stock-entries.save');
    Route::delete('stock-entries/{stock_entry}', [StockEntryController::class, 'destroy'])
        ->middleware(['permission:stock_entries.delete', 'filter.zonals.by.user'])
        ->name('stock-entries.destroy');
    Route::get('purchase-orders', [PurchaseOrderController::class, 'index'])
        ->middleware(['permission:purchase_orders.view', 'filter.zonals.by.user'])
        ->name('purchase-orders.index');
    Route::get('purchase-orders/create', [PurchaseOrderController::class, 'create'])
        ->middleware(['permission:purchase_orders.create', 'filter.zonals.by.user'])
        ->name('purchase-orders.create');
    Route::get('purchase-orders/export', [PurchaseOrderController::class, 'export'])
        ->middleware(['permission:purchase_orders.export', 'filter.zonals.by.user'])
        ->name('purchase-orders.export');
    Route::get('purchase-orders/{purchase_order}', [PurchaseOrderController::class, 'show'])
        ->middleware('filter.zonals.by.user')
        ->name('purchase-orders.show');
    Route::post('purchase-orders', [PurchaseOrderController::class, 'store'])->middleware('permission:purchase_orders.create')->name('purchase-orders.store');
    Route::get('purchase-orders/{purchase_order}/edit', [PurchaseOrderController::class, 'edit'])
        ->middleware(['permission:purchase_orders.update', 'filter.zonals.by.user'])
        ->name('purchase-orders.edit');
    Route::put('purchase-orders/{purchase_order}', [PurchaseOrderController::class, 'update'])->middleware('permission:purchase_orders.update')->name('purchase-orders.update');
    Route::delete('purchase-orders/{purchase_order}', [PurchaseOrderController::class, 'destroy'])->middleware('permission:purchase_orders.delete')->name('purchase-orders.destroy');
    Route::post('purchase-orders/{purchase_order}/approve', [PurchaseOrderController::class, 'approve'])->middleware('permission:purchase_orders.approve')->name('purchase-orders.approve');
    Route::post('purchase-orders/{purchase_order}/reject', [PurchaseOrderController::class, 'reject'])->middleware('permission:purchase_orders.approve')->name('purchase-orders.reject');
    Route::post('purchase-orders/{purchase_order}/observe', [PurchaseOrderController::class, 'observe'])->middleware('permission:purchase_orders.observe')->name('purchase-orders.observe');
    Route::post('purchase-orders/{purchase_order}/quotes/{purchase_quote}/select', [PurchaseOrderController::class, 'selectQuote'])->middleware('permission:purchase_quotes.select')->name('purchase-orders.quotes.select');

    Route::get('users', [UserController::class, 'index'])->middleware('permission:users.view')->name('users.index');
    Route::post('users', [UserController::class, 'store'])->middleware('permission:users.create')->name('users.store');
    Route::put('users/{user}', [UserController::class, 'update'])->middleware('permission:users.update')->name('users.update');
    Route::delete('users/{user}', [UserController::class, 'destroy'])->middleware('permission:users.delete')->name('users.destroy');
    Route::post('users/restore/{id}', [UserController::class, 'restore'])->middleware('permission:users.restore')->name('users.restore');
    Route::get('users/{user}/configure', [UserController::class, 'configure'])->middleware('permission:users.configure')->name('users.configure');
    Route::put('users/{user}/zonals', [UserController::class, 'updateZonals'])->middleware('permission:users.configure')->name('users.zonals.update');
    Route::put('users/{user}/permissions', [UserController::class, 'updatePermissions'])->middleware('permission:users.configure')->name('users.permissions.update');

    Route::get('roles', [RoleController::class, 'index'])->middleware('permission:roles.view')->name('roles.index');
    Route::post('roles', [RoleController::class, 'store'])->middleware('permission:roles.create')->name('roles.store');
    Route::put('roles/{role}', [RoleController::class, 'update'])->middleware('permission:roles.update')->name('roles.update');
    Route::delete('roles/{role}', [RoleController::class, 'destroy'])->middleware('permission:roles.delete')->name('roles.destroy');
    Route::get('roles/{role}/permissions', [RoleController::class, 'permissions'])
        ->middleware('permission:permissions.view')
        ->name('roles.permissions');
    Route::put('roles/{role}/permissions', [RoleController::class, 'updatePermissions'])
        ->middleware('permission:permissions.view')
        ->name('roles.permissions.update');
});
