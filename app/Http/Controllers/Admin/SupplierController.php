<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Supplier\SupplierRequest;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    private const VALID_SORT = ['name', 'created_at'];

    private const VALID_ORDER = ['asc', 'desc'];

    private const PER_PAGE_OPTIONS = [5, 10, 15, 25];

    public function index(Request $request): Response
    {
        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');
        $perPage = (int) $request->input('per_page', 10);
        $q = $request->input('q', '');
        $q = ($q === null || $q === 'null') ? '' : trim((string) $q);
        $isActive = $request->input('is_active');
        if ($isActive !== null && $isActive !== '' && $isActive !== 'null') {
            $isActive = $isActive === '1' || $isActive === true ? '1' : '0';
        } else {
            $isActive = '';
        }

        if (! in_array($sortBy, self::VALID_SORT, true)) {
            $sortBy = 'name';
        }
        if (! in_array($sortOrder, self::VALID_ORDER, true)) {
            $sortOrder = 'asc';
        }
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = 10;
        }

        $query = Supplier::query();

        if ($q !== '') {
            $term = '%'.mb_strtolower($q).'%';
            $query->where(function ($qb) use ($term) {
                $qb->whereRaw('LOWER(name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(ruc, \'\')) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(contact_name, \'\')) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(contact_email, \'\')) LIKE ?', [$term]);
            });
        }

        if ($isActive === '1') {
            $query->where('is_active', true);
        } elseif ($isActive === '0') {
            $query->where('is_active', false);
        }

        $query->orderBy($sortBy, $sortOrder);

        $suppliers = $query->paginate($perPage)->withQueryString();

        $totalActive = Supplier::where('is_active', true)->count();

        return Inertia::render('admin/suppliers/index', [
            'suppliers' => $suppliers,
            'filters' => [
                'q' => $q,
                'is_active' => $isActive,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => Supplier::count(),
                'total_active' => $totalActive,
            ],
        ]);
    }

    public function store(SupplierRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $trashed = Supplier::onlyTrashed()
            ->where('name', $validated['name'])
            ->when(
                ! empty($validated['ruc'] ?? ''),
                fn ($q) => $q->where('ruc', $validated['ruc']),
                fn ($q) => $q->whereNull('ruc')
            )
            ->first();

        if ($trashed) {
            return redirect()->back()
                ->with('restore_candidate', [
                    'type' => 'supplier',
                    'id' => $trashed->id,
                    'name' => $trashed->name,
                ])
                ->with('restore_payload', $validated);
        }

        Supplier::create($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Proveedor creado correctamente.']);
    }

    public function update(SupplierRequest $request, Supplier $supplier): RedirectResponse
    {
        $supplier->update($request->validated());

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Proveedor actualizado correctamente.']);
    }

    public function destroy(Supplier $supplier): RedirectResponse
    {
        $supplier->delete();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Proveedor eliminado correctamente.']);
    }

    public function restore(Request $request): RedirectResponse
    {
        abort_if(! $request->user()?->can('suppliers.create'), 403);
        $request->validate(['id' => ['required', 'uuid']]);
        $supplier = Supplier::withTrashed()->findOrFail($request->input('id'));
        $supplier->restore();
        $data = $request->only([
            'name', 'ruc', 'contact_name', 'contact_email', 'contact_phone',
            'address', 'payment_conditions', 'is_active',
        ]);
        if (isset($data['is_active'])) {
            $data['is_active'] = (bool) $data['is_active'];
        }
        $supplier->update($data);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Proveedor restaurado correctamente.']);
    }
}
