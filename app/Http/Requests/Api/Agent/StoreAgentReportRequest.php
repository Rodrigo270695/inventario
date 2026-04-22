<?php

namespace App\Http\Requests\Api\Agent;

use Illuminate\Foundation\Http\FormRequest;

class StoreAgentReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->attributes->get('agent_token') !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'asset_id' => ['required', 'uuid', 'exists:assets,id'],
            'payload' => ['required', 'array', 'max:2000'],
            'reported_at' => ['nullable', 'date'],
            'is_full_snapshot' => ['sometimes', 'boolean'],
        ];
    }
}
