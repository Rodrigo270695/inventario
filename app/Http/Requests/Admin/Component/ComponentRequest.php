<?php

namespace App\Http\Requests\Admin\Component;

use App\Models\RepairShop;
use App\Models\Warehouse;
use App\Support\UserGeographicAccess;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            $user = $this->user();
            [$officeIds, $zonalIds] = UserGeographicAccess::forUser($user);
            if ($officeIds === null && $zonalIds === null) {
                return;
            }
            if ($officeIds === [] || $zonalIds === []) {
                $v->errors()->add('warehouse_id', 'Tu usuario no tiene oficinas asignadas para registrar componentes.');

                return;
            }

            $warehouseId = $this->input('warehouse_id');
            $repairShopId = $this->input('repair_shop_id');

            if (! empty($warehouseId)) {
                $ok = Warehouse::query()
                    ->whereKey($warehouseId)
                    ->whereIn('office_id', $officeIds)
                    ->exists();
                if (! $ok) {
                    $v->errors()->add('warehouse_id', 'El almacén seleccionado no está permitido para tu usuario.');
                }
            }

            if (! empty($repairShopId)) {
                $ok = RepairShop::query()
                    ->whereKey($repairShopId)
                    ->whereIn('zonal_id', $zonalIds)
                    ->exists();
                if (! $ok) {
                    $v->errors()->add('repair_shop_id', 'El taller seleccionado no está permitido para tu usuario.');
                }
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
