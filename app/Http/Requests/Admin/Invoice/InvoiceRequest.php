<?php

namespace App\Http\Requests\Admin\Invoice;

use Illuminate\Foundation\Http\FormRequest;

class InvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('invoices.create') ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'purchase_order_id' => ['required', 'uuid', 'exists:purchase_orders,id'],
            'invoice_number' => ['required', 'string', 'max:100'],
            'invoice_date' => ['nullable', 'date'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'remission_guide' => ['nullable', 'string', 'max:100'],
            'remission_guide_file' => ['nullable', 'file', 'mimes:pdf', 'max:5120'],
            'document' => ['nullable', 'file', 'mimes:pdf,doc,docx', 'max:5120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'purchase_order_id' => 'orden de compra',
            'invoice_number' => 'número de factura',
            'invoice_date' => 'fecha de factura',
            'amount' => 'monto',
            'remission_guide' => 'guía de remisión',
            'remission_guide_file' => 'archivo de guía de remisión',
            'document' => 'documento (PDF o Word)',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'document.mimes' => 'El documento debe ser PDF o Word (.doc, .docx).',
            'document.max' => 'El documento no debe superar 5 MB.',
            'remission_guide_file.mimes' => 'La guía de remisión debe ser un archivo PDF.',
            'remission_guide_file.max' => 'La guía de remisión no debe superar 5 MB.',
        ];
    }
}
