<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\User\UserRequest;
use App\Mail\UserCredentialsMail;
use App\Mail\UserCredentialsSentConfirmationMail;
use App\Models\User;
use App\Models\Zonal;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Throwable;

class UserController extends Controller
{
    private const VALID_SORT = ['name', 'usuario', 'email', 'created_at', 'updated_at'];

    private const VALID_ORDER = ['asc', 'desc'];

    private const PER_PAGE_OPTIONS = [5, 10, 15, 25, 50, 100];

    public function index(Request $request): Response
    {
        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');
        $perPage = (int) $request->input('per_page', 25);
        $q = $request->input('q', '');
        $q = ($q === null || $q === 'null') ? '' : trim((string) $q);
        $isActive = $request->input('is_active');
        if ($isActive !== null && $isActive !== '' && $isActive !== 'null') {
            $isActive = $isActive === '1' || $isActive === true ? '1' : '0';
        } else {
            $isActive = '';
        }
        $trashed = $request->input('trashed', '0');
        if ($trashed !== '0' && $trashed !== '1') {
            $trashed = '0';
        }

        $roleIdParam = $request->input('role_id', '');
        $roleIdParam = ($roleIdParam === null || $roleIdParam === 'null') ? '' : trim((string) $roleIdParam);
        $roleIdFilter = '';
        if ($roleIdParam !== '') {
            $rid = (int) $roleIdParam;
            if ($rid > 0 && Role::query()->where('guard_name', 'web')->whereKey($rid)->exists()) {
                $roleIdFilter = (string) $rid;
            }
        }

        if (! in_array($sortBy, self::VALID_SORT, true)) {
            $sortBy = 'name';
        }
        if (! in_array($sortOrder, self::VALID_ORDER, true)) {
            $sortOrder = 'asc';
        }
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = 25;
        }

        $viewerIsSuperadmin = $request->user()?->hasRole('superadmin', 'web');

        $query = User::query()->with([
            'roles:id,name',
            'creator:id,name,last_name',
            'updater:id,name,last_name',
            'zonals' => fn ($q) => $q->select('zonals.id', 'zonals.name', 'zonals.code')->orderBy('zonals.name'),
            'managedZonals' => fn ($q) => $q->select('zonals.id', 'zonals.name', 'zonals.code', 'zonals.manager_id')->orderBy('zonals.name'),
        ]);

        if ($trashed === '1') {
            $query->onlyTrashed();
        }

        if (! $viewerIsSuperadmin) {
            $query->whereRaw('LOWER(COALESCE(usuario, \'\')) <> ?', ['superadmin'])
                ->whereDoesntHave('roles', fn ($rq) => $rq->where('name', 'superadmin')->where('guard_name', 'web'));
        }

        if ($q !== '') {
            $term = '%'.mb_strtolower($q).'%';
            $query->where(function ($qb) use ($term) {
                $qb->whereRaw('LOWER(name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(last_name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(usuario) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(email) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(document_number, \'\')) LIKE ?', [$term]);
            });
        }

        if ($isActive === '1') {
            $query->where('is_active', true);
        } elseif ($isActive === '0') {
            $query->where('is_active', false);
        }

        if ($roleIdFilter !== '') {
            $rid = (int) $roleIdFilter;
            $query->whereHas('roles', fn ($rq) => $rq->where('roles.id', $rid));
        }

        $query->orderBy($sortBy, $sortOrder);

        $users = $query->paginate($perPage)->withQueryString();

        $users->through(function (User $user) {
            $merged = $user->zonals
                ->concat($user->managedZonals)
                ->unique('id')
                ->sortBy('name')
                ->values();
            $first = $merged->first();
            $user->setAttribute('zonal_summary', [
                'first' => $first?->name,
                'rest_count' => max(0, $merged->count() - 1),
            ]);
            $user->makeHidden(['zonals', 'managedZonals']);

            return $user;
        });

        $statsQuery = User::query();
        $trashedStatsQuery = User::onlyTrashed();
        if (! $viewerIsSuperadmin) {
            $statsQuery->whereRaw('LOWER(COALESCE(usuario, \'\')) <> ?', ['superadmin'])
                ->whereDoesntHave('roles', fn ($rq) => $rq->where('name', 'superadmin')->where('guard_name', 'web'));
            $trashedStatsQuery->whereRaw('LOWER(COALESCE(usuario, \'\')) <> ?', ['superadmin'])
                ->whereDoesntHave('roles', fn ($rq) => $rq->where('name', 'superadmin')->where('guard_name', 'web'));
        }

        $totalActive = (clone $statsQuery)->where('is_active', true)->count();
        $totalTrashed = $trashedStatsQuery->count();

        $rolesQuery = Role::query()->where('guard_name', 'web')->orderBy('name');
        if (! $viewerIsSuperadmin) {
            $rolesQuery->where('name', '!=', 'superadmin');
        }
        $roles = $rolesQuery->get(['id', 'name']);

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'roles' => $roles,
            'filters' => [
                'q' => $q,
                'is_active' => $isActive,
                'trashed' => $trashed,
                'role_id' => $roleIdFilter,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => (clone $statsQuery)->count(),
                'total_active' => $totalActive,
                'total_trashed' => $totalTrashed,
            ],
        ]);
    }

    public function store(UserRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $deleted = User::onlyTrashed()
            ->where('document_type', $validated['document_type'])
            ->where('document_number', $validated['document_number'])
            ->first();

        if ($deleted) {
            return redirect()->back()
                ->withInput()
                ->with('restore_user', [
                    'id' => $deleted->id,
                    'name' => $deleted->name,
                    'last_name' => $deleted->last_name,
                    'usuario' => $deleted->usuario,
                ]);
        }

        $roleId = (int) $validated['role_id'];
        unset($validated['role_id'], $validated['password_confirmation']);
        $validated['password'] = Hash::make($validated['password']);
        $validated['created_by'] = $request->user()?->id;
        $validated['updated_by'] = $request->user()?->id;

        $user = User::create($validated);
        $role = Role::findById($roleId, 'web');
        if ($role) {
            $this->assertCanAssignSuperadminRole($request->user(), $role);
            $user->syncRoles([$role->name]);
        }

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Usuario creado correctamente.']);
    }

    public function update(UserRequest $request, User $user): RedirectResponse
    {
        $this->denyUnlessSuperadminViewer($request->user(), $user);

        $validated = $request->validated();
        $roleId = (int) $validated['role_id'];
        unset($validated['role_id'], $validated['password_confirmation']);
        if (isset($validated['password']) && $validated['password'] !== '') {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }
        $validated['updated_by'] = $request->user()?->id;

        $user->update($validated);
        $role = Role::findById($roleId, 'web');
        if ($role) {
            $this->assertCanAssignSuperadminRole($request->user(), $role);
            $user->syncRoles([$role->name]);
        }

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Usuario actualizado correctamente.']);
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $this->denyUnlessSuperadminViewer($request->user(), $user);

        if ($user->id === $request->user()?->id) {
            return redirect()->back()
                ->with('toast', ['type' => 'error', 'message' => 'No puedes eliminar tu propio usuario.']);
        }

        $user->delete();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Usuario eliminado correctamente.']);
    }

    public function sendCredentials(Request $request, User $user): RedirectResponse
    {
        $this->denyUnlessSuperadminViewer($request->user(), $user);

        $auth = $request->user();
        if (! $auth instanceof User) {
            abort(403);
        }

        if ($user->id === $auth->id) {
            return redirect()->back()
                ->with('toast', ['type' => 'error', 'message' => 'No puedes enviarte credenciales a ti mismo desde aquí.']);
        }

        if (! $user->is_active) {
            return redirect()->back()
                ->with('toast', ['type' => 'error', 'message' => 'El usuario está inactivo; no se envían credenciales.']);
        }

        $email = trim((string) $user->email);
        if ($email === '') {
            return redirect()->back()
                ->with('toast', ['type' => 'error', 'message' => 'El usuario no tiene correo corporativo configurado.']);
        }

        $plainPassword = Str::password(14, symbols: false);
        $loginUrl = route('home');

        $previousHash = $user->password;

        $user->update([
            'password' => Hash::make($plainPassword),
            'updated_by' => $auth->id,
        ]);

        try {
            Mail::to($email)->send(new UserCredentialsMail($user->fresh(), $plainPassword, $loginUrl));
        } catch (Throwable $e) {
            report($e);
            $user->update([
                'password' => $previousHash,
                'updated_by' => $auth->id,
            ]);

            return redirect()->back()
                ->with('toast', ['type' => 'error', 'message' => 'No se pudo enviar el correo al usuario. La contraseña no se modificó. Revisa SMTP o el correo del destinatario.']);
        }

        $actorEmail = trim((string) $auth->email);
        if ($actorEmail !== '') {
            try {
                Mail::to($actorEmail)->send(new UserCredentialsSentConfirmationMail(
                    $auth,
                    $user->fresh(),
                    $email
                ));
            } catch (Throwable $e) {
                report($e);

                return redirect()->back()
                    ->with('toast', ['type' => 'success', 'message' => 'Credenciales enviadas al usuario, pero no se pudo enviar el correo de confirmación a tu bandeja.']);
            }
        }

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Credenciales enviadas al correo del usuario.'.($actorEmail === '' ? ' No se envió confirmación: tu usuario no tiene email configurado.' : '')]);
    }

    public function restore(Request $request, string $id): RedirectResponse
    {
        $user = User::onlyTrashed()->findOrFail($id);

        $this->denyUnlessSuperadminViewer($request->user(), $user);

        $exists = User::where('document_type', $user->document_type)
            ->where('document_number', $user->document_number)
            ->whereNull('deleted_at')
            ->exists();

        if ($exists) {
            return redirect()->back()
                ->with('toast', ['type' => 'error', 'message' => 'Ya existe un usuario activo con ese tipo y número de documento. No se puede restaurar.']);
        }

        $user->restore();
        $user->update(['updated_by' => $request->user()?->id]);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Usuario restaurado correctamente.']);
    }

    public function configure(Request $request, User $user): Response
    {
        $this->denyUnlessSuperadminViewer($request->user(), $user);

        $user->load('zonals:id,name,code');
        $zonals = Zonal::query()->orderBy('name')->get(['id', 'name', 'code']);
        $userZonalIds = $user->zonals->pluck('id')->all();

        $allPermissions = Permission::where('guard_name', 'web')->orderBy('name')->get(['id', 'name']);
        $rolePermissionIds = $user->getPermissionsViaRoles()->pluck('id')->all();
        $directPermissionIds = $user->getDirectPermissions()->pluck('id')->all();
        $revokedPermissionIds = $user->revokedPermissions()->pluck('id')->all();

        return Inertia::render('admin/users/configure', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'last_name' => $user->last_name,
                'usuario' => $user->usuario,
            ],
            'zonals' => $zonals,
            'userZonalIds' => $userZonalIds,
            'permissions' => $allPermissions->map(fn ($p) => ['id' => $p->id, 'name' => $p->name]),
            'rolePermissionIds' => array_map('intval', $rolePermissionIds),
            'directPermissionIds' => array_map('intval', $directPermissionIds),
            'revokedPermissionIds' => array_map('intval', $revokedPermissionIds),
        ]);
    }

    public function updateZonals(Request $request, User $user): RedirectResponse
    {
        $this->denyUnlessSuperadminViewer($request->user(), $user);

        $validated = $request->validate([
            'zonal_ids' => ['array'],
            'zonal_ids.*' => ['uuid', Rule::exists('zonals', 'id')],
        ], [
            'zonal_ids.array' => 'Los zonales deben ser una lista.',
            'zonal_ids.*.exists' => 'Uno o más zonales no son válidos.',
        ]);

        $zonalIds = $validated['zonal_ids'] ?? [];
        $user->zonals()->sync($zonalIds);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Zonales actualizados correctamente.']);
    }

    /**
     * Actualizar permisos por usuario. permission_ids = todos los que este usuario debe tener.
     * Se calcula: directos = permission_ids - rol, revocados = rol - permission_ids. El rol no se modifica.
     */
    public function updatePermissions(Request $request, User $user): RedirectResponse
    {
        $this->denyUnlessSuperadminViewer($request->user(), $user);

        $validated = $request->validate([
            'permission_ids' => ['array'],
            'permission_ids.*' => ['integer', Rule::exists('permissions', 'id')],
        ], [
            'permission_ids.array' => 'Los permisos deben ser una lista.',
            'permission_ids.*.exists' => 'Uno o más permisos no son válidos.',
        ]);

        $selectedIds = array_map('intval', $validated['permission_ids'] ?? []);
        $roleIds = $user->getPermissionsViaRoles()->pluck('id')->all();

        $directIds = array_values(array_diff($selectedIds, $roleIds));
        $revokedIds = array_values(array_diff($roleIds, $selectedIds));

        $user->syncPermissions($directIds);
        $user->revokedPermissions()->sync($revokedIds);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Permisos del usuario actualizados correctamente.']);
    }

    private function viewerIsSuperadmin(?User $auth): bool
    {
        return $auth !== null && $auth->hasRole('superadmin', 'web');
    }

    /**
     * Usuario con login superadmin o rol superadmin: solo otro superadmin puede verlo o mutarlo.
     */
    private function isProtectedSuperadminUser(User $user): bool
    {
        return strtolower((string) $user->usuario) === 'superadmin'
            || $user->hasRole('superadmin', 'web');
    }

    private function denyUnlessSuperadminViewer(?User $auth, User $target): void
    {
        if ($this->isProtectedSuperadminUser($target) && ! $this->viewerIsSuperadmin($auth)) {
            abort(403, 'No autorizado a gestionar este usuario.');
        }
    }

    private function assertCanAssignSuperadminRole(?User $auth, Role $role): void
    {
        if ($role->name !== 'superadmin' || $role->guard_name !== 'web') {
            return;
        }
        if (! $this->viewerIsSuperadmin($auth)) {
            abort(403, 'Solo un superadmin puede asignar el rol superadmin.');
        }
    }
}
