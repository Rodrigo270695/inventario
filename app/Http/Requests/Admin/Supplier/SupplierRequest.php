<?php

namespace App\Http\Requests\Admin\Supplier;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->isMethod('POST')
            ? $this->user()?->can('suppliers.create')
            : $this->user()?->can('suppliers.update');
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $supplier = $this->route('supplier');

        return [
            'name' => ['required', 'string', 'max:200'],
            'ruc' => ['required', 'string', 'max:20'],
            'contact_name' => ['nullable', 'string', 'max:150'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string'],
            'payment_conditions' => ['nullable', 'string'],
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
            'contact_email' => 'email',
            'contact_phone' => 'teléfono',
            'address' => 'dirección',
            'payment_conditions' => 'condiciones de pago',
            'is_active' => 'activo',
        ];
    }
}
