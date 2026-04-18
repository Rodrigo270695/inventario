<?php

namespace App\Http\Requests\Admin\Asset;

use App\Models\AssetModel;
use App\Models\AssetSubcategory;
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
        if ($modelId === '__other__' || $modelId === '' || $modelId === null) {
            $this->merge(['model_id' => null]);
        }
        $brandId = $this->input('brand_id');
        if ($brandId === '' || $brandId === null) {
            $this->merge(['brand_id' => null]);
        }
        $newModelName = trim((string) ($this->input('new_model_name') ?? ''));
        $this->merge(['new_model_name' => $newModelName === '' ? null : $newModelName]);
        $subcategoryId = $this->input('subcategory_id');
        if ($subcategoryId === '' || $subcategoryId === null) {
            $this->merge(['subcategory_id' => null]);
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
            'brand_id' => ['nullable', 'uuid', 'exists:asset_brands,id'],
            'subcategory_id' => ['nullable', 'uuid', 'exists:asset_subcategories,id'],
            'new_model_name' => ['nullable', 'string', 'max:200'],
            'category_id' => ['required', 'uuid', 'exists:asset_categories,id'],
            'status' => ['required', 'string', 'in:active,stored,in_repair,in_transit,disposed,sold'],
            'condition' => ['required', 'string', 'in:new,good,regular,damaged,obsolete,broken,in_repair,pending_disposal'],
            'warehouse_id' => ['required', 'uuid', 'exists:warehouses,id'],
            'acquisition_value' => ['nullable', 'numeric', 'min:0'],
            'acquisition_date' => ['nullable', 'date'],
            'current_value' => ['nullable', 'numeric', 'min:0'],
            'depreciation_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'warranty_until' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $newModelName = trim((string) ($this->input('new_model_name') ?? ''));
            $modelId = $this->input('model_id');
            $categoryId = $this->input('category_id');

            if ($newModelName !== '') {
                if ($modelId) {
                    $validator->errors()->add('new_model_name', 'No puede indicar un modelo nuevo si ya seleccionó un modelo existente.');
                }
                $subcategoryId = $this->input('subcategory_id');
                $brandId = $this->input('brand_id');
                if (! $subcategoryId) {
                    $validator->errors()->add('subcategory_id', 'La subcategoría es obligatoria para registrar un modelo nuevo.');
                }
                if (! $brandId) {
                    $validator->errors()->add('brand_id', 'La marca es obligatoria para registrar un modelo nuevo.');
                }
                if ($subcategoryId && $categoryId) {
                    $sub = AssetSubcategory::query()->find($subcategoryId);
                    if (! $sub || (string) $sub->asset_category_id !== (string) $categoryId) {
                        $validator->errors()->add('subcategory_id', 'La subcategoría no corresponde a la categoría del activo.');
                    }
                }

                return;
            }

            $brandId = $this->input('brand_id');
            if (! $modelId || ! $brandId) {
                return;
            }
            $model = AssetModel::query()->find($modelId);
            if ($model && (string) $model->brand_id !== (string) $brandId) {
                $validator->errors()->add('brand_id', 'La marca no coincide con el modelo seleccionado.');
            }
        });
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
            'brand_id' => 'marca',
            'subcategory_id' => 'subcategoría',
            'new_model_name' => 'nombre del modelo',
            'category_id' => 'categoría',
            'status' => 'estado',
            'condition' => 'condición',
            'warehouse_id' => 'almacén',
            'acquisition_value' => 'valor de adquisición',
            'acquisition_date' => 'fecha de adquisición',
            'current_value' => 'valor actual',
            'depreciation_rate' => 'tasa depreciación',
            'warranty_until' => 'garantía hasta',
            'notes' => 'notas',
        ];
    }
}
