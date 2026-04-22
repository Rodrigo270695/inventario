<?php

namespace App\Http\Requests\Admin\License;

use Illuminate\Foundation\Http\FormRequest;

class LicenseAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('licenses.assign') ?? false;
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('assigned_at') === '') {
            $this->merge(['assigned_at' => null]);
        }
        if ($this->input('valid_until') === '') {
            $this->merge(['valid_until' => null]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'software_license_id' => ['required', 'uuid', 'exists:software_licenses,id'],
            'asset_id' => ['required', 'uuid', 'exists:assets,id'],
            'assigned_at' => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date'],
        ];
    }
}
