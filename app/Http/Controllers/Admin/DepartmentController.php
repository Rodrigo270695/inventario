<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Department\DepartmentRequest;
use App\Models\Department;
use App\Models\Zonal;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DepartmentController extends Controller
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

        $query = Department::query()->with(['zonal:id,name,code', 'parent:id,name']);

        if ($q !== '') {
            $term = '%'.mb_strtolower($q).'%';
            $query->where(function ($qb) use ($term) {
                $qb->whereRaw('LOWER(name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(code, \'\')) LIKE ?', [$term])
                    ->orWhereHas('zonal', function ($zq) use ($term) {
                        $zq->whereRaw('LOWER(name) LIKE ?', [$term]);
                    });
            });
        }

        if ($isActive === '1') {
            $query->where('is_active', true);
        } elseif ($isActive === '0') {
            $query->where('is_active', false);
        }

        $query->orderBy($sortBy, $sortOrder);

        $departments = $query->paginate($perPage)->withQueryString();

        $totalActive = Department::where('is_active', true)->count();

        $zonals = Zonal::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);

        $departmentsForSelect = Department::query()->orderBy('name')->get(['id', 'zonal_id', 'name', 'code']);

        return Inertia::render('admin/departments/index', [
            'departments' => $departments,
            'zonals' => $zonals,
            'departmentsForSelect' => $departmentsForSelect,
            'filters' => [
                'q' => $q,
                'is_active' => $isActive,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => Department::count(),
                'total_active' => $totalActive,
            ],
        ]);
    }

    public function store(DepartmentRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $validated['parent_id'] = ($validated['parent_id'] ?? '') !== '' ? $validated['parent_id'] : null;

        $trashed = Department::onlyTrashed()
            ->where('name', $validated['name'])
            ->where('zonal_id', $validated['zonal_id'])
            ->where(function ($q) use ($validated) {
                $pid = $validated['parent_id'] ?? null;
                if ($pid !== null) {
                    $q->where('parent_id', $pid);
                } else {
                    $q->whereNull('parent_id');
                }
            })
            ->first();

        if ($trashed) {
            return redirect()->back()
                ->with('restore_candidate', [
                    'type' => 'department',
                    'id' => $trashed->id,
                    'name' => $trashed->name,
                ])
                ->with('restore_payload', $validated);
        }

        Department::create($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Departamento creado correctamente.']);
    }

    public function update(DepartmentRequest $request, Department $department): RedirectResponse
    {
        $validated = $request->validated();
        $validated['parent_id'] = ($validated['parent_id'] ?? '') !== '' ? $validated['parent_id'] : null;

        $department->update($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Departamento actualizado correctamente.']);
    }

    public function destroy(Department $department): RedirectResponse
    {
        $department->delete();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Departamento eliminado correctamente.']);
    }

    public function restore(Request $request): RedirectResponse
    {
        abort_if(! $request->user()?->can('departments.create'), 403);
        $request->validate(['id' => ['required', 'uuid']]);
        $department = Department::withTrashed()->findOrFail($request->input('id'));
        $department->restore();
        $data = $request->only(['zonal_id', 'name', 'code', 'parent_id', 'is_active']);
        $data['parent_id'] = ($data['parent_id'] ?? '') !== '' ? $data['parent_id'] : null;
        $department->update($data);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Departamento restaurado correctamente.']);
    }
}
