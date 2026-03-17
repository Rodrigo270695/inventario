<?php

namespace App\Http\Requests\Admin\Asset;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->isMethod('POST')
            ? $this->user()?->can('assets.create')
            : $this->user()?->can('assets.update');
    }

    protected function prepareForValidation(): void
    {
        $modelId = $this->input('model_id');
        if ($modelId === '' || $modelId === null) {
            $this->merge(['model_id' => null]);
        }
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $asset = $this->route('asset');

        return [
            'code' => [
                $asset ? 'required' : 'nullable',
                'string',
                'max:60',
                Rule::unique('assets', 'code')->whereNull('deleted_at')->ignore($asset?->id),
            ],
            'serial_number' => [
                'nullable',
                'string',
                'max:200',
                Rule::unique('assets', 'serial_number')->whereNull('deleted_at')->ignore($asset?->id),
            ],
            'model_id' => ['nullable', 'uuid', 'exists:asset_models,id'],
            'category_id' => ['required', 'uuid', 'exists:asset_categories,id'],
            'status' => ['required', 'string', 'in:active,stored,in_repair,in_transit,disposed,sold'],
            'condition' => ['required', 'string', 'in:new,good,regular,damaged,obsolete,broken,in_repair,pending_disposal'],
            'warehouse_id' => ['required', 'uuid', 'exists:warehouses,id'],
            'acquisition_value' => ['nullable', 'numeric', 'min:0'],
            'current_value' => ['nullable', 'numeric', 'min:0'],
            'depreciation_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'warranty_until' => ['nullable', 'date'],
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
            'model_id' => 'modelo',
            'category_id' => 'categoría',
            'status' => 'estado',
            'condition' => 'condición',
            'warehouse_id' => 'almacén',
            'acquisition_value' => 'valor de adquisición',
            'current_value' => 'valor actual',
            'depreciation_rate' => 'tasa depreciación',
            'warranty_until' => 'garantía hasta',
            'notes' => 'notas',
        ];
    }
}
