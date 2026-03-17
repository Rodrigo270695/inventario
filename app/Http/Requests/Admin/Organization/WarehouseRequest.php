<?php

namespace App\Http\Requests\Admin\Organization;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class WarehouseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->isMethod('POST')
            ? $this->user()?->can('warehouses.create')
            : $this->user()?->can('warehouses.update');
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $officeId = $this->input('office_id');
        $warehouse = $this->route('warehouse');
        $uniqueInOffice = fn (string $column) => Rule::unique('warehouses', $column)
            ->where('office_id', $officeId)
            ->whereNull('deleted_at')
            ->ignore($warehouse?->id);

        return [
            'office_id' => ['required', 'uuid', 'exists:offices,id'],
            'name' => ['required', 'string', 'max:150', $uniqueInOffice('name')],
            'code' => ['nullable', 'string', 'max:30', Rule::when($this->filled('code'), [$uniqueInOffice('code')])],
            'capacity' => ['nullable', 'integer', 'min:0'],
            'manager_id' => ['nullable', 'uuid', 'exists:users,id'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'office_id' => 'oficina',
            'name' => 'nombre',
            'code' => 'código',
            'capacity' => 'capacidad',
            'manager_id' => 'responsable',
            'is_active' => 'activo',
        ];
    }
}
