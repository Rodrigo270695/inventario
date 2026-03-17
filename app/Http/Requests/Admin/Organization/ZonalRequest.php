<?php

namespace App\Http\Requests\Admin\Organization;

use App\Models\Zonal;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ZonalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->isMethod('POST')
            ? $this->user()?->can('zonals.create')
            : $this->user()?->can('zonals.update');
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $zonal = $this->route('zonal');

        return [
            'name' => ['required', 'string', 'max:100'],
            'code' => [
                'required',
                'string',
                'max:20',
                Rule::unique('zonals', 'code')->whereNull('deleted_at')->ignore($zonal?->id),
            ],
            'region' => ['nullable', 'string', 'max:100'],
            'manager_id' => ['nullable', 'uuid', 'exists:users,id'],
            'timezone' => ['nullable', 'string', 'max:60'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nombre',
            'code' => 'código',
            'region' => 'región',
            'manager_id' => 'responsable',
            'timezone' => 'zona horaria',
            'is_active' => 'activo',
        ];
    }
}
