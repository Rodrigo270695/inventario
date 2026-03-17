<?php

namespace App\Http\Requests\Admin\AssetTransfer;

use App\Models\Asset;
use App\Models\Component;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssetTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->isMethod('POST')
            ? $this->user()?->can('asset_transfers.create')
            : $this->user()?->can('asset_transfers.update');
    }

    public function rules(): array
    {
        return [
            'origin_warehouse_id' => ['required', 'uuid', 'exists:warehouses,id', 'different:destination_warehouse_id'],
            'destination_warehouse_id' => ['required', 'uuid', 'exists:warehouses,id', 'different:origin_warehouse_id'],
            'status' => ['required', 'string', 'max:30', Rule::in(['pending_approval', 'approved', 'in_transit', 'received', 'cancelled'])],
            'sent_by' => ['nullable', 'uuid', 'exists:users,id'],
            'received_by' => ['nullable', 'uuid', 'exists:users,id'],
            'carrier_name' => ['nullable', 'string', 'max:200'],
            'tracking_number' => ['nullable', 'string', 'max:100'],
            'carrier_reference' => ['nullable', 'string', 'max:150'],
            'company_guide_number' => ['nullable', 'string', 'max:100'],
            'company_guide_file' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:10240'],
            'carrier_voucher_number' => ['nullable', 'string', 'max:100'],
            'carrier_voucher_file' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:10240'],
            'ship_date' => ['nullable', 'date'],
            'received_at' => ['nullable', 'date'],
            'dispatch_notes' => ['nullable', 'string', 'max:3000'],
            'receipt_notes' => ['nullable', 'string', 'max:3000'],
            'cancellation_reason' => ['nullable', 'string', 'max:3000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_type' => ['required', 'string', Rule::in(['asset', 'component'])],
            'items.*.asset_id' => ['nullable', 'uuid', 'exists:assets,id'],
            'items.*.component_id' => ['nullable', 'uuid', 'exists:components,id'],
            'items.*.condition_out' => ['nullable', 'string', Rule::in(['new', 'good', 'regular', 'damaged', 'obsolete'])],
            'items.*.condition_in' => ['nullable', 'string', Rule::in(['new', 'good', 'regular', 'damaged', 'obsolete'])],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $items = $this->input('items', []);
            $originWarehouseId = $this->input('origin_warehouse_id');
            $destinationWarehouseId = $this->input('destination_warehouse_id');

            foreach ($items as $index => $item) {
                $itemType = $item['item_type'] ?? null;
                $assetId = $item['asset_id'] ?? null;
                $componentId = $item['component_id'] ?? null;

                if ($itemType === 'asset' && empty($assetId)) {
                    $validator->errors()->add("items.$index.asset_id", 'Debe seleccionar un activo.');
                }

                if ($itemType === 'component' && empty($componentId)) {
                    $validator->errors()->add("items.$index.component_id", 'Debe seleccionar un componente.');
                }

                if ($itemType === 'asset' && ! empty($assetId) && ! empty($originWarehouseId)) {
                    $asset = Asset::query()->select(['id', 'warehouse_id'])->find($assetId);
                    if (! $asset || $asset->warehouse_id !== $originWarehouseId) {
                        $validator->errors()->add("items.$index.asset_id", 'El activo seleccionado no pertenece al almacén origen.');
                    }
                }

                if ($itemType === 'component' && ! empty($componentId) && ! empty($originWarehouseId)) {
                    $component = Component::query()->select(['id', 'warehouse_id'])->find($componentId);
                    if (! $component || $component->warehouse_id !== $originWarehouseId) {
                        $validator->errors()->add("items.$index.component_id", 'El componente seleccionado no pertenece al almacén origen.');
                    }
                }
            }

            $status = $this->input('status');
            if ($status === 'in_transit' && empty($this->input('sent_by'))) {
                $validator->errors()->add('sent_by', 'Debe indicar quién despacha cuando el traslado está en tránsito.');
            }
            if ($status === 'received' && empty($this->input('received_by'))) {
                $validator->errors()->add('received_by', 'Debe indicar quién recibe cuando el traslado está recibido.');
            }

            $receivedBy = $this->input('received_by');
            if (! empty($receivedBy) && ! empty($destinationWarehouseId)) {
                $destinationWarehouse = Warehouse::query()
                    ->with('office:id,zonal_id')
                    ->select(['id', 'office_id'])
                    ->find($destinationWarehouseId);

                $destinationZonalId = $destinationWarehouse?->office?->zonal_id;

                if ($destinationZonalId) {
                    $isValidReceiver = User::query()
                        ->where('id', $receivedBy)
                        ->where('is_active', true)
                        ->whereHas('zonals', fn ($query) => $query->where('zonals.id', $destinationZonalId))
                        ->exists();

                    if (! $isValidReceiver) {
                        $validator->errors()->add('received_by', 'El usuario receptor debe pertenecer al zonal de destino.');
                    }
                }
            }
        });
    }

    public function attributes(): array
    {
        return [
            'origin_warehouse_id' => 'almacén origen',
            'destination_warehouse_id' => 'almacén destino',
            'status' => 'estado',
            'sent_by' => 'quien despacha',
            'received_by' => 'quien recibe',
            'carrier_name' => 'transportista',
            'tracking_number' => 'número de seguimiento',
            'carrier_reference' => 'referencia del courier',
            'company_guide_number' => 'número de guía de la empresa',
            'company_guide_file' => 'archivo de guía de la empresa',
            'carrier_voucher_number' => 'número de voucher del courier',
            'carrier_voucher_file' => 'archivo del voucher del courier',
            'ship_date' => 'fecha de envío',
            'received_at' => 'fecha de recepción',
            'dispatch_notes' => 'observaciones de despacho',
            'receipt_notes' => 'observaciones de recepción',
            'cancellation_reason' => 'motivo de cancelación',
            'items' => 'ítems',
            'items.*.item_type' => 'tipo de ítem',
            'items.*.asset_id' => 'activo',
            'items.*.component_id' => 'componente',
            'items.*.condition_out' => 'condición de salida',
            'items.*.condition_in' => 'condición de llegada',
        ];
    }
}
