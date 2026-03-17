<?php

namespace App\Http\Requests\Admin\Organization;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OfficeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->isMethod('POST')
            ? $this->user()?->can('offices.create')
            : $this->user()?->can('offices.update');
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $zonalId = $this->input('zonal_id');
        $office = $this->route('office');
        $uniqueInZonal = fn (string $column) => Rule::unique('offices', $column)
            ->where('zonal_id', $zonalId)
            ->whereNull('deleted_at')
            ->ignore($office?->id);

        return [
            'zonal_id' => ['required', 'uuid', 'exists:zonals,id'],
            'name' => ['required', 'string', 'max:150', $uniqueInZonal('name')],
            'code' => ['nullable', 'string', 'max:30', Rule::when($this->filled('code'), [$uniqueInZonal('code')])],
            'address' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'zonal_id' => 'zonal',
            'name' => 'nombre',
            'code' => 'código',
            'address' => 'dirección',
            'is_active' => 'activo',
        ];
    }
}
