<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, HasUuids, Notifiable, SoftDeletes, TwoFactorAuthenticatable;

    use HasRoles {
        HasRoles::hasPermissionTo as spatieHasPermissionTo;
    }

    /**
     * Permisos revocados solo para este usuario (el rol no se modifica).
     */
    public function revokedPermissions(): BelongsToMany
    {
        return $this->belongsToMany(
            \Spatie\Permission\Models\Permission::class,
            'user_revoked_permissions',
            'user_id',
            'permission_id'
        );
    }

    /**
     * Si el permiso está revocado para este usuario, no lo tiene (aunque lo tenga por rol o directo).
     */
    public function hasPermissionTo($permission, ?string $guardName = null): bool
    {
        $has = $this->spatieHasPermissionTo($permission, $guardName);
        if (! $has) {
            return false;
        }
        try {
            $permissionModel = $this->filterPermission($permission, $guardName);
            $revoked = $this->revokedPermissions()->where('permission_id', $permissionModel->id)->exists();

            return ! $revoked;
        } catch (\Throwable) {
            return true;
        }
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'last_name',
        'usuario',
        'email',
        'password',
        'document_type',
        'document_number',
        'phone',
        'is_active',
        'created_by',
        'updated_by',
        'credentials_email_sent_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'credentials_email_sent_at' => 'datetime',
        ];
    }

    /**
     * Guardar usuario siempre en minúsculas (Fortify lowercase_usernames).
     */
    public function setUsuarioAttribute(?string $value): void
    {
        $this->attributes['usuario'] = $value !== null ? strtolower($value) : null;
    }

    /**
     * Guardar nombre siempre en mayúsculas.
     */
    public function setNameAttribute(?string $value): void
    {
        $this->attributes['name'] = $value !== null ? mb_strtoupper($value, 'UTF-8') : null;
    }

    /**
     * Guardar apellido siempre en mayúsculas.
     */
    public function setLast_nameAttribute(?string $value): void
    {
        $this->attributes['last_name'] = $value !== null ? mb_strtoupper($value, 'UTF-8') : null;
    }

    /**
     * Usuarios que pueden ser asignados (responsable, asignatario, etc.). Excluye superadmin.
     */
    public function scopeAssignable(Builder $query): Builder
    {
        return $query->whereDoesntHave('roles', fn ($q) => $q->where('name', 'superadmin')->where('guard_name', 'web'));
    }

    public function zonals(): BelongsToMany
    {
        return $this->belongsToMany(Zonal::class, 'user_zonals');
    }

    /** Zonales donde este usuario es gestor (además de los asignados en user_zonals). */
    public function managedZonals(): HasMany
    {
        return $this->hasMany(Zonal::class, 'manager_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class, 'user_id');
    }
}
