<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class WarehouseLocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->isMethod('POST')
            ? $this->user()?->can('warehouse_locations.create')
            : $this->user()?->can('warehouse_locations.update');
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $warehouseId = $this->input('warehouse_id');
        $location = $this->route('warehouse_location');

        $uniqueInWarehouse = Rule::unique('warehouse_locations', 'code')
            ->where('warehouse_id', $warehouseId)
            ->ignore($location?->id);

        return [
            'warehouse_id' => ['required', 'uuid', 'exists:warehouses,id'],
            'code' => ['required', 'string', 'max:60', $uniqueInWarehouse],
            'aisle' => ['nullable', 'string', 'max:30'],
            'row' => ['nullable', 'string', 'max:30'],
            'bin' => ['nullable', 'string', 'max:30'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'warehouse_id' => 'almacén',
            'code' => 'código',
            'aisle' => 'pasillo',
            'row' => 'fila',
            'bin' => 'columna',
            'is_active' => 'activo',
        ];
    }
}
