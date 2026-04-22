<?php

namespace App\Http\Requests\Admin\License;

use Illuminate\Foundation\Http\FormRequest;

class SoftwareProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->isMethod('POST')
            ? $this->user()?->can('licenses.create')
            : $this->user()?->can('licenses.update');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'vendor_id' => ['required', 'uuid', 'exists:software_vendors,id'],
            'name' => ['required', 'string', 'max:200'],
            'is_tracked' => ['nullable', 'boolean'],
        ];
    }
}
