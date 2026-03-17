<?php

namespace App\Http\Requests\Admin\Role;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->isMethod('POST')
            ? ($this->user()?->can('roles.create') ?? true)
            : ($this->user()?->can('roles.update') ?? true);
    }

    /**
     * Reglas para crear y editar. Unique por guard_name.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $role = $this->route('role');
        $guard = $role?->guard_name ?? config('auth.defaults.guard');

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('roles', 'name')
                    ->where('guard_name', $guard)
                    ->ignore($role?->id),
            ],
            'guard_name' => ['nullable', 'string', 'in:web,api'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['name' => 'nombre del rol'];
    }
}
