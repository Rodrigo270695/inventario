<?php

namespace App\Http\Requests\Admin\Department;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->isMethod('POST')
            ? $this->user()?->can('departments.create')
            : $this->user()?->can('departments.update');
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $department = $this->route('department');
        $parentId = $this->input('parent_id');
        $parentId = ($parentId !== null && $parentId !== '') ? $parentId : null;

        return [
            'zonal_id' => ['required', 'uuid', 'exists:zonals,id'],
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('departments', 'name')
                    ->whereNull('deleted_at')
                    ->where('zonal_id', $this->input('zonal_id'))
                    ->where('parent_id', $parentId)
                    ->ignore($department?->id),
            ],
            'code' => ['nullable', 'string', 'max:30'],
            'parent_id' => ['nullable', 'uuid', 'exists:departments,id'],
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
            'parent_id' => 'departamento padre',
            'is_active' => 'activo',
        ];
    }
}
