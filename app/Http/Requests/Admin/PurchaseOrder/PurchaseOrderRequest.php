<?php

namespace App\Http\Requests\Admin\PurchaseOrder;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->isMethod('POST')
            ? $this->user()?->can('purchase_orders.create')
            : $this->user()?->can('purchase_orders.update');
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'supplier_id' => ['required', 'uuid', 'exists:suppliers,id'],
            'office_id' => ['required', 'uuid', 'exists:offices,id'],
            'code' => ['nullable', 'string', 'max:60'], // Ignorado en store; se genera automáticamente
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.description' => ['required', 'string'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.total_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.category_id' => ['required', 'uuid', 'exists:asset_categories,id,is_active,1'],
            'items.*.asset_subcategory_id' => ['nullable', 'uuid', 'exists:asset_subcategories,id,is_active,1'],
            'items.*.asset_brand_id' => ['nullable', 'uuid', 'exists:asset_brands,id'],
        ];

        if ($this->isMethod('POST')) {
            $rules['status'] = ['required', 'string', 'max:30', Rule::in(['pending', 'observed', 'approved', 'rejected'])];
            $rules['quotes'] = ['nullable', 'array'];
            $rules['quotes.*.description'] = ['nullable', 'string', 'max:500'];
            $rules['quotes.*.is_selected'] = ['nullable', 'boolean'];
            $rules['quotes.*.pdf'] = ['nullable', 'file', 'mimes:pdf', 'max:10240'];
        }

        if ($this->isMethod('PUT') || $this->isMethod('PATCH')) {
            $order = $this->route('purchase_order');
            $rules['quotes'] = ['nullable', 'array'];
            $rules['quotes.*.id'] = [
                'nullable',
                'uuid',
                Rule::exists('purchase_quotes', 'id')->where('purchase_order_id', $order->id),
            ];
            $rules['quotes.*.description'] = ['nullable', 'string', 'max:500'];
            $rules['quotes.*.is_selected'] = ['nullable', 'boolean'];
            $rules['quotes.*.pdf'] = ['nullable', 'file', 'mimes:pdf', 'max:10240'];
        }

        return $rules;
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'supplier_id' => 'proveedor',
            'office_id' => 'oficina',
            'code' => 'código',
            'status' => 'estado',
            'notes' => 'notas',
            'items' => 'ítems',
            'items.*.description' => 'descripción',
            'items.*.quantity' => 'cantidad',
            'items.*.unit_price' => 'precio unitario',
            'items.*.total_price' => 'total ítem',
            'items.*.category_id' => 'categoría',
            'items.*.asset_subcategory_id' => 'subcategoría',
            'items.*.asset_brand_id' => 'marca',
            'quotes.*.description' => 'descripción cotización',
            'quotes.*.pdf' => 'archivo PDF',
        ];
    }
}
