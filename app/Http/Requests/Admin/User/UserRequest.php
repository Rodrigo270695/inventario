<?php

namespace App\Http\Requests\Admin\User;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        if ($this->isMethod('POST')) {
            if ($this->filled('duplicate_from_user_id')) {
                return $this->user()?->can('users.create') && $this->user()?->can('users.duplicate');
            }

            return $this->user()?->can('users.create');
        }

        return $this->user()?->can('users.update');
    }

    protected function prepareForValidation(): void
    {
        $email = $this->input('email');
        if (is_string($email)) {
            $this->merge([
                'email' => Str::lower(trim($email)),
            ]);
        }
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var User|null $routeUser */
        $routeUser = $this->route('user');
        $routeUser = $routeUser instanceof User ? $routeUser : null;

        $usuarioUnique = Rule::unique('users', 'usuario');
        $emailUnique = Rule::unique('users', 'email');
        if ($routeUser !== null) {
            $usuarioUnique->ignore($routeUser);
            $emailUnique->ignore($routeUser);
        }

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'usuario' => [
                'required',
                'string',
                'max:255',
                $usuarioUnique,
            ],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                $emailUnique,
            ],
            'document_type' => ['required', 'string', 'in:dni,ce,passport,ruc'],
            'document_number' => [
                'required',
                'string',
                'max:20',
                function (string $attribute, mixed $value, \Closure $fail) use ($routeUser): void {
                    $query = User::query()
                        ->whereNull('deleted_at')
                        ->where('document_type', $this->input('document_type'))
                        ->where('document_number', $value);
                    if ($routeUser !== null) {
                        $query->where('id', '!=', $routeUser->id);
                    }
                    if ($query->exists()) {
                        $fail('Ya existe un usuario activo con este tipo y número de documento.');
                    }
                },
            ],
            'phone' => ['nullable', 'string', 'max:9', 'regex:/^[0-9]{9}$/'],
            'is_active' => ['required', 'boolean'],
        ];

        if ($this->isMethod('POST')) {
            $rules['role_id'] = [
                Rule::requiredIf(fn () => ! $this->filled('duplicate_from_user_id')),
                'nullable',
                'integer',
                Rule::exists('roles', 'id'),
            ];
            $rules['duplicate_from_user_id'] = ['nullable', 'uuid', Rule::exists('users', 'id')];
        } else {
            $rules['role_id'] = ['required', 'integer', Rule::exists('roles', 'id')];
            $rules['password'] = ['nullable', 'string', 'min:8', 'confirmed'];
        }

        return $rules;
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nombre',
            'last_name' => 'apellido',
            'usuario' => 'usuario',
            'email' => 'correo electrónico',
            'document_type' => 'tipo de documento',
            'document_number' => 'número de documento',
            'phone' => 'teléfono',
            'is_active' => 'activo',
            'role_id' => 'rol',
            'duplicate_from_user_id' => 'usuario de referencia',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.unique' => 'Este correo electrónico ya está registrado (puede estar asociado a un usuario eliminado).',
            'usuario.unique' => 'Este usuario (login) ya está en uso.',
        ];
    }
}
