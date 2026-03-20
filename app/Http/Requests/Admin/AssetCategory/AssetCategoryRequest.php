<?php

namespace App\Http\Requests\Admin\AssetCategory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssetCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->isMethod('POST')
            ? $this->user()?->can('asset_categories.create')
            : $this->user()?->can('asset_categories.update');
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $category = $this->route('asset_category');

        return [
            'name' => ['required', 'string', 'max:150'],
            'code' => [
                'required',
                'string',
                'max:30',
                Rule::unique('asset_categories', 'code')->ignore($category?->id),
            ],
            'type' => ['required', 'string', 'in:technology,vehicle,furniture,building,machinery,other,fixed_asset,minor_asset,service_maintenance'],
            'gl_account_id' => ['nullable', 'uuid', 'exists:gl_accounts,id'],
            'gl_depreciation_account_id' => ['nullable', 'uuid', 'exists:gl_accounts,id'],
            'icon' => ['nullable', 'string', 'max:50'],
            'default_useful_life_years' => ['nullable', 'integer', 'min:0', 'max:100'],
            'default_depreciation_method' => ['nullable', 'string', 'in:straight_line,sum_of_years'],
            'default_residual_value_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'requires_insurance' => ['required', 'boolean'],
            'requires_soat' => ['required', 'boolean'],
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
            'type' => 'tipo',
            'gl_account_id' => 'cuenta contable',
            'gl_depreciation_account_id' => 'cuenta depreciación',
            'icon' => 'icono',
            'default_useful_life_years' => 'vida útil por defecto',
            'default_depreciation_method' => 'método de depreciación por defecto',
            'default_residual_value_pct' => 'valor residual % por defecto',
            'requires_insurance' => 'requiere seguro',
            'requires_soat' => 'requiere SOAT',
            'is_active' => 'activo',
        ];
    }
}
