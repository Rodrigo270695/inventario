<?php

namespace App\Http\Requests\Admin\Audit;

use Illuminate\Foundation\Http\FormRequest;

class StoreAgentTokenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('audit.tokens.manage') ?? false;
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('expires_at') === '') {
            $this->merge(['expires_at' => null]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:100'],
            'expires_at' => ['nullable', 'date'],
            'ip_whitelist' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
