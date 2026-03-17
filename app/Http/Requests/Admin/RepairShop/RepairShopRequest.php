<?php

namespace App\Http\Requests\Admin\RepairShop;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RepairShopRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->isMethod('POST')
            ? $this->user()?->can('repair_shops.create')
            : $this->user()?->can('repair_shops.update');
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $repairShop = $this->route('repair_shop');

        return [
            'name' => [
                'required',
                'string',
                'max:200',
                Rule::unique('repair_shops', 'name')
                    ->whereNull('deleted_at')
                    ->where(function ($query) {
                        $zonalId = $this->input('zonal_id');
                        if ($zonalId !== null && $zonalId !== '') {
                            $query->where('zonal_id', $zonalId);
                        } else {
                            $query->whereNull('zonal_id');
                        }
                    })
                    ->ignore($repairShop?->id),
            ],
            'ruc' => ['required', 'string', 'max:20'],
            'contact_name' => ['nullable', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string'],
            'zonal_id' => ['nullable', 'uuid', 'exists:zonals,id'],
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
            'ruc' => 'RUC',
            'contact_name' => 'contacto',
            'phone' => 'teléfono',
            'address' => 'dirección',
            'zonal_id' => 'zonal',
            'is_active' => 'activo',
        ];
    }
}
