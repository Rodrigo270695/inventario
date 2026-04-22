<?php

namespace App\Http\Requests\Admin\License;

use Illuminate\Foundation\Http\FormRequest;

class SoftwareInstallationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->isMethod('POST')
            ? $this->user()?->can('licenses.create')
            : $this->user()?->can('licenses.update');
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('version') === '') {
            $this->merge(['version' => null]);
        }
        if ($this->input('detected_at') === '') {
            $this->merge(['detected_at' => null]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'asset_id' => ['required', 'uuid', 'exists:assets,id'],
            'product_id' => ['required', 'uuid', 'exists:software_products,id'],
            'version' => ['nullable', 'string', 'max:100'],
            'detected_at' => ['nullable', 'date'],
            'is_authorized' => ['nullable', 'boolean'],
        ];
    }
}
