<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Role\RoleRequest;
use App\Models\Role;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;

class RoleController extends Controller
{
    private const VALID_SORT = ['name', 'created_at', 'permissions_count'];
    private const VALID_ORDER = ['asc', 'desc'];
    private const PER_PAGE_OPTIONS = [5, 10, 15, 25];

    /**
     * Listado de roles: búsqueda, orden, paginación y estadísticas.
     */
    public function index(Request $request): Response
    {
        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');
        $perPage = (int) $request->input('per_page', 10);
        $q = $request->input('q', '');
        $q = ($q === null || $q === 'null') ? '' : trim((string) $q);

        if (! in_array($sortBy, self::VALID_SORT, true)) {
            $sortBy = 'name';
        }
        if (! in_array($sortOrder, self::VALID_ORDER, true)) {
            $sortOrder = 'asc';
        }
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = 10;
        }

        $query = Role::query()->withCount('permissions');

        if ($q !== '') {
            $term = '%'.mb_strtolower($q).'%';
            $query->whereRaw('LOWER(name) LIKE ?', [$term]);
        }

        $query->orderBy($sortBy, $sortOrder);

        $roles = $query->paginate($perPage)->withQueryString();

        $rolesWithoutPermissions = Role::whereDoesntHave('permissions')->count();
        $lastUpdated = Role::query()->latest('updated_at')->value('updated_at');
        $lastUpdatedFormatted = $lastUpdated ? Carbon::parse($lastUpdated)->diffForHumans() : null;

        return Inertia::render('admin/roles/index', [
            'roles' => $roles,
            'filters' => [
                'q' => $q,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total_roles' => Role::count(),
                'total_permissions' => Permission::count(),
                'roles_without_permissions' => $rolesWithoutPermissions,
                'last_updated' => $lastUpdatedFormatted,
            ],
        ]);
    }

    /**
     * Crear rol. guard_name por defecto 'web'.
     */
    public function store(RoleRequest $request): RedirectResponse
    {
        Role::create([
            'name' => $request->validated('name'),
            'guard_name' => $request->validated('guard_name', 'web'),
        ]);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Rol creado correctamente.']);
    }

    /**
     * Actualizar rol (solo nombre). No se permite editar el rol superadmin.
     * Redirige a la misma página/filtros/paginación.
     */
    public function update(RoleRequest $request, Role $role): RedirectResponse
    {
        if ($role->name === 'superadmin') {
            return redirect()->back()
                ->with('toast', ['type' => 'error', 'message' => 'No se puede editar el rol superadmin.']);
        }

        $role->update(['name' => $request->validated('name')]);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Rol actualizado correctamente.']);
    }

    /**
     * Eliminar rol. No se permite eliminar el rol superadmin.
     * Redirige a la misma página/filtros/paginación.
     */
    public function destroy(Role $role): RedirectResponse
    {
        if ($role->name === 'superadmin') {
            return redirect()->back()
                ->with('toast', ['type' => 'error', 'message' => 'No se puede eliminar el rol superadmin.']);
        }

        $role->delete();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Rol eliminado correctamente.']);
    }

    /**
     * Listado de todos los permisos y los asignados al rol (para el modal).
     */
    public function permissions(Role $role): JsonResponse
    {
        $all = Permission::where('guard_name', $role->guard_name)->orderBy('name')->get(['id', 'name']);
        $rolePermissionIds = $role->permissions()->pluck('id')->all();

        return response()->json([
            'permissions' => $all->map(fn ($p) => ['id' => $p->id, 'name' => $p->name]),
            'role_permission_ids' => $rolePermissionIds,
        ]);
    }

    /**
     * Sincronizar permisos del rol.
     * Temporalmente se permite modificar superadmin para validar permisos.
     * Para desactivar: descomentar el bloque if (superadmin) y rechazar con 403.
     */
    public function updatePermissions(Request $request, Role $role): RedirectResponse|JsonResponse
    {
        // if ($role->name === 'superadmin') {
        //     if ($request->wantsJson()) {
        //         return response()->json(['message' => 'No se puede modificar permisos del rol superadmin.'], 403);
        //     }
        //     return redirect()->back()
        //         ->with('toast', ['type' => 'error', 'message' => 'No se puede modificar permisos del rol superadmin.']);
        // }

        $ids = $request->input('permission_ids', []);
        if (! is_array($ids)) {
            $ids = [];
        }
        $ids = array_map('intval', array_filter($ids));

        $role->syncPermissions($ids);

        if ($request->wantsJson()) {
            return response()->json(['ok' => true]);
        }
        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Permisos actualizados correctamente.']);
    }
}
