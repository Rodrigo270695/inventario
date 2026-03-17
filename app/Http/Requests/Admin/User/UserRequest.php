<?php

namespace App\Http\Requests\Admin\User;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->isMethod('POST')
            ? $this->user()?->can('users.create')
            : $this->user()?->can('users.update');
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $user = $this->route('user');

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'usuario' => [
                'required',
                'string',
                'max:255',
                Rule::unique('users', 'usuario')->ignore($user?->id)->whereNull('deleted_at'),
            ],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user?->id)->whereNull('deleted_at'),
            ],
            'document_type' => ['required', 'string', 'in:dni,ce,passport,ruc'],
            'document_number' => [
                'required',
                'string',
                'max:20',
                function (string $attribute, mixed $value, \Closure $fail) use ($user): void {
                    $query = User::query()
                        ->whereNull('deleted_at')
                        ->where('document_type', $this->input('document_type'))
                        ->where('document_number', $value);
                    if ($user !== null) {
                        $query->where('id', '!=', $user->id);
                    }
                    if ($query->exists()) {
                        $fail('Ya existe un usuario activo con este tipo y número de documento.');
                    }
                },
            ],
            'phone' => ['nullable', 'string', 'max:9', 'regex:/^[0-9]{9}$/'],
            'is_active' => ['required', 'boolean'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
        ];

        if ($this->isMethod('POST')) {
            $rules['password'] = ['required', 'string', 'min:8', 'confirmed'];
        } else {
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
        ];
    }
}
