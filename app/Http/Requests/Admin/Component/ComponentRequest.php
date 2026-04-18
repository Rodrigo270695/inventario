<?php

namespace App\Http\Requests\Admin\Component;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ComponentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->isMethod('POST')
            ? $this->user()?->can('components.create')
            : $this->user()?->can('components.update');
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $component = $this->route('component');

        return [
            'code' => [
                $this->isMethod('POST') ? 'nullable' : 'required',
                'string',
                'max:60',
                Rule::unique('components', 'code')->whereNull('deleted_at')->ignore($component?->id),
            ],
            'serial_number' => ['nullable', 'string', 'max:200'],
            'type_id' => ['required', 'uuid', 'exists:component_types,id'],
            'brand_id' => ['nullable', 'uuid', 'exists:asset_brands,id'],
            'subcategory_id' => ['nullable', 'uuid', 'exists:asset_subcategories,id'],
            'model' => ['nullable', 'string', 'max:150'],
            'warehouse_id' => ['nullable', 'uuid', 'exists:warehouses,id'],
            'repair_shop_id' => ['nullable', 'uuid', 'exists:repair_shops,id'],
            'status' => ['required', 'string', 'in:active,stored,in_repair,in_transit,disposed'],
            'condition' => ['required', 'string', 'in:new,good,regular,damaged,obsolete,broken,in_repair,pending_disposal'],
            'acquisition_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'code' => 'código',
            'serial_number' => 'número de serie',
            'type_id' => 'tipo',
            'brand_id' => 'marca',
            'subcategory_id' => 'subcategoría',
            'model' => 'modelo',
            'warehouse_id' => 'almacén',
            'repair_shop_id' => 'taller',
            'status' => 'estado',
            'condition' => 'condición',
            'acquisition_date' => 'fecha de adquisición',
            'notes' => 'notas',
        ];
    }
}
