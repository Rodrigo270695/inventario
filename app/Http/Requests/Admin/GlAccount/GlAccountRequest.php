<?php

namespace App\Http\Requests\Admin\GlAccount;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GlAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->isMethod('POST')
            ? $this->user()?->can('gl_accounts.create')
            : $this->user()?->can('gl_accounts.update');
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $glAccount = $this->route('gl_account');

        return [
            'code' => [
                'required',
                'string',
                'max:20',
                Rule::unique('gl_accounts', 'code')->ignore($glAccount?->id),
            ],
            'name' => ['required', 'string', 'max:200'],
            'account_type' => ['nullable', 'string', 'max:30'],
            'parent_id' => ['nullable', 'uuid', 'exists:gl_accounts,id'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'code' => 'código',
            'name' => 'nombre',
            'account_type' => 'tipo de cuenta',
            'parent_id' => 'cuenta padre',
            'is_active' => 'activo',
        ];
    }
}
