<?php

namespace App\Http\Requests\Admin\RepairTicket;

use Illuminate\Foundation\Http\FormRequest;

class RepairTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->isMethod('POST')
            ? $this->user()?->can('repair_tickets.create')
            : ($this->user()?->can('repair_tickets.update') || $this->user()?->can('repair_tickets.configure'));
    }

    protected function prepareForValidation(): void
    {
        foreach ([
            'asset_id',
            'component_id',
            'failure_type',
            'technician_id',
            'repair_shop_id',
            'estimated_cost',
            'approved_budget',
            'diagnosis',
            'solution',
            'condition_in',
            'condition_out',
            'external_reference',
            'notes',
        ] as $field) {
            if ($this->input($field) === '') {
                $this->merge([$field => null]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'asset_id' => ['nullable', 'uuid', 'exists:assets,id'],
            'component_id' => ['nullable', 'uuid', 'exists:components,id'],
            'warehouse_id' => ['nullable', 'uuid', 'exists:warehouses,id'],
            'priority' => ['required', 'string', 'in:low,medium,high,critical'],
            'failure_type' => ['nullable', 'string', 'in:hardware,electrical,physical,cosmetic,connectivity,other'],
            'maintenance_mode' => ['required', 'string', 'in:internal,external,warranty'],
            'issue_description' => ['required', 'string', 'max:5000'],
            'technician_id' => ['nullable', 'uuid', 'exists:users,id'],
            'repair_shop_id' => ['nullable', 'uuid', 'exists:repair_shops,id'],
            'estimated_cost' => ['nullable', 'numeric', 'min:0'],
            'approved_budget' => ['nullable', 'numeric', 'min:0'],
            'diagnosis' => ['nullable', 'string', 'max:5000'],
            'solution' => ['nullable', 'string', 'max:5000'],
            'condition_in' => ['nullable', 'string', 'in:new,good,regular,damaged,obsolete'],
            'condition_out' => ['nullable', 'string', 'in:new,good,regular,damaged,obsolete'],
            'external_reference' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    public function after(): array
    {
        return [
            function ($validator) {
                $assetId = $this->input('asset_id');
                $componentId = $this->input('component_id');

                if (($assetId && $componentId) || (! $assetId && ! $componentId)) {
                    $validator->errors()->add('asset_id', 'Debe seleccionar un activo o un componente, pero no ambos.');
                }
            },
        ];
    }
}
