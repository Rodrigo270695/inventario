<?php

use App\Http\Controllers\Admin\PurchaseOrderController;
use App\Models\PurchaseOrder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (Auth::check()) {
        return redirect()->route('dashboard');
    }

    return Inertia::render('auth/login', [
        'status' => session('status'),
    ]);
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
require __DIR__.'/admin.php';

/*
| Rutas sin prefijo /admin (compatibilidad): si el cliente POSTea a /purchase-orders/{id}/minor-approve
| en lugar de /admin/purchase-orders/.../minor-approve, Laravel devolvía 404.
*/
Route::middleware(['auth', 'filter.zonals.by.user'])->group(function (): void {
    Route::get('purchase-orders/{purchase_order}/minor-approve', function (PurchaseOrder $purchaseOrder) {
        return redirect()->route('admin.purchase-orders.show', $purchaseOrder);
    });
    Route::get('purchase-orders/{purchase_order}/minor-reject', function (PurchaseOrder $purchaseOrder) {
        return redirect()->route('admin.purchase-orders.show', $purchaseOrder);
    });
    Route::get('purchase-orders/{purchase_order}/minor-observe', function (PurchaseOrder $purchaseOrder) {
        return redirect()->route('admin.purchase-orders.show', $purchaseOrder);
    });

    Route::post('purchase-orders/{purchase_order}/minor-approve', [PurchaseOrderController::class, 'minorApprove'])
        ->middleware('permission:purchase_orders.minor_approve');
    Route::post('purchase-orders/{purchase_order}/minor-reject', [PurchaseOrderController::class, 'minorReject'])
        ->middleware('permission:purchase_orders.minor_approve');
    Route::post('purchase-orders/{purchase_order}/minor-observe', [PurchaseOrderController::class, 'minorObserve'])
        ->middleware('permission:purchase_orders.minor_observe');
});
