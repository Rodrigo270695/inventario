<?php

namespace App\Http\Requests\Admin\License;

use Illuminate\Foundation\Http\FormRequest;

class SoftwareLicenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->isMethod('POST')
            ? $this->user()?->can('licenses.create')
            : $this->user()?->can('licenses.update');
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('license_type') === '') {
            $this->merge(['license_type' => null]);
        }
        if ($this->input('valid_until') === '') {
            $this->merge(['valid_until' => null]);
        }
        if ($this->input('cost') === '') {
            $this->merge(['cost' => null]);
        }
        if ($this->input('notes') === '') {
            $this->merge(['notes' => null]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'product_id' => ['required', 'uuid', 'exists:software_products,id'],
            'license_type' => ['nullable', 'string', 'in:oem,retail,volume,subscription'],
            'seats_total' => ['required', 'integer', 'min:1'],
            'seats_used' => ['nullable', 'integer', 'min:0'],
            'valid_until' => ['nullable', 'date'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $seatsTotal = (int) $this->input('seats_total', 0);
            $seatsUsed = (int) $this->input('seats_used', 0);

            if ($seatsUsed > $seatsTotal) {
                $validator->errors()->add('seats_used', 'Los asientos usados no pueden exceder los asientos totales.');
            }
        });
    }
}
