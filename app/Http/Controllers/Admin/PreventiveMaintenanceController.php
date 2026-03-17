<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\AssetSubcategory;
use App\Models\Component;
use App\Models\ComponentType;
use App\Models\Office;
use App\Models\PreventivePlan;
use App\Models\PreventiveTask;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PreventiveMaintenanceController extends Controller
{
    private const PLANS_PER_PAGE = 15;
    private const TASKS_PER_PAGE = 15;

    public function index(Request $request): Response
    {
        $tab = $request->input('tab', 'plans');
        if (! in_array($tab, ['plans', 'tasks'], true)) {
            $tab = 'plans';
        }

        $plansPage = (int) $request->input('plans_page', 1);
        $tasksPage = (int) $request->input('tasks_page', 1);

        $plans = PreventivePlan::query()
            ->with(['subcategory:id,name,code', 'componentType:id,name,code', 'warehouse:id,name,code,office_id', 'warehouse.office:id,name,code,zonal_id'])
            ->orderBy('name')
            ->paginate(self::PLANS_PER_PAGE, ['*'], 'plans_page', $plansPage);

        $tasks = PreventiveTask::query()
            ->with([
                'plan:id,name,frequency_type,frequency_days',
                'asset:id,code,category_id,model_id',
                'asset.category:id,name',
                'asset.model:id,name,brand_id',
                'asset.model.brand:id,name',
                'component:id,code,type_id,brand_id',
                'component.type:id,name',
                'component.brand:id,name',
                'technician:id,name,last_name,usuario',
            ])
            ->orderBy('scheduled_date', 'desc')
            ->paginate(self::TASKS_PER_PAGE, ['*'], 'tasks_page', $tasksPage);

        $payload = $this->formPayload();

        return Inertia::render('admin/preventive-maintenance/index', [
            'tab' => $tab,
            'plans' => $plans,
            'tasks' => $tasks,
            ...$payload,
        ]);
    }

    public function storePlan(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:200'],
            'target_type' => ['required', 'string', 'in:asset,component'],
            'subcategory_id' => ['nullable', 'uuid', 'exists:asset_subcategories,id'],
            'component_type_id' => ['nullable', 'uuid', 'exists:component_types,id'],
            'warehouse_id' => ['nullable', 'uuid', 'exists:warehouses,id'],
            'frequency_type' => ['required', 'string', 'in:monthly,quarterly,biannual,annual,custom'],
            'frequency_days' => ['nullable', 'integer', 'min:1', 'required_if:frequency_type,custom'],
            'checklist' => ['nullable', 'array'],
            'checklist.*' => ['nullable', 'string'],
            'default_priority' => ['nullable', 'string', 'in:low,medium,high'],
            'estimated_cost' => ['nullable', 'numeric', 'min:0'],
            'assigned_role' => ['nullable', 'string', 'max:60'],
            'is_active' => ['boolean'],
            'description' => ['nullable', 'string'],
        ]);

        PreventivePlan::create([
            'name' => $request->input('name'),
            'target_type' => $request->input('target_type'),
            'subcategory_id' => $request->input('subcategory_id'),
            'component_type_id' => $request->input('component_type_id'),
            'warehouse_id' => $request->input('warehouse_id'),
            'frequency_type' => $request->input('frequency_type'),
            'frequency_days' => $request->input('frequency_type') === 'custom' ? $request->input('frequency_days') : null,
            'checklist' => $request->input('checklist'),
            'default_priority' => $request->input('default_priority', 'medium'),
            'estimated_cost' => $request->input('estimated_cost'),
            'assigned_role' => $request->input('assigned_role', 'tecnico'),
            'is_active' => $request->boolean('is_active', true),
            'description' => $request->input('description'),
        ]);

        return redirect()->route('admin.preventive-maintenance.index', ['tab' => 'plans'])
            ->with('toast', ['type' => 'success', 'message' => 'Plan creado correctamente.']);
    }

    public function updatePlan(Request $request, PreventivePlan $preventive_plan): RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:200'],
            'target_type' => ['required', 'string', 'in:asset,component'],
            'subcategory_id' => ['nullable', 'uuid', 'exists:asset_subcategories,id'],
            'component_type_id' => ['nullable', 'uuid', 'exists:component_types,id'],
            'warehouse_id' => ['nullable', 'uuid', 'exists:warehouses,id'],
            'frequency_type' => ['required', 'string', 'in:monthly,quarterly,biannual,annual,custom'],
            'frequency_days' => ['nullable', 'integer', 'min:1', 'required_if:frequency_type,custom'],
            'checklist' => ['nullable', 'array'],
            'checklist.*' => ['nullable', 'string'],
            'default_priority' => ['nullable', 'string', 'in:low,medium,high'],
            'estimated_cost' => ['nullable', 'numeric', 'min:0'],
            'assigned_role' => ['nullable', 'string', 'max:60'],
            'is_active' => ['boolean'],
            'description' => ['nullable', 'string'],
        ]);

        $preventive_plan->update([
            'name' => $request->input('name'),
            'target_type' => $request->input('target_type'),
            'subcategory_id' => $request->input('subcategory_id'),
            'component_type_id' => $request->input('component_type_id'),
            'warehouse_id' => $request->input('warehouse_id'),
            'frequency_type' => $request->input('frequency_type'),
            'frequency_days' => $request->input('frequency_type') === 'custom' ? $request->input('frequency_days') : null,
            'checklist' => $request->input('checklist'),
            'default_priority' => $request->input('default_priority', 'medium'),
            'estimated_cost' => $request->input('estimated_cost'),
            'assigned_role' => $request->input('assigned_role', 'tecnico'),
            'is_active' => $request->boolean('is_active', true),
            'description' => $request->input('description'),
        ]);

        return redirect()->back()->with('toast', ['type' => 'success', 'message' => 'Plan actualizado correctamente.']);
    }

    public function destroyPlan(PreventivePlan $preventive_plan): RedirectResponse
    {
        if ($preventive_plan->tasks()->exists()) {
            return redirect()->back()->with('toast', ['type' => 'error', 'message' => 'No se puede eliminar un plan con tareas asociadas.']);
        }

        $preventive_plan->delete();

        return redirect()->back()->with('toast', ['type' => 'success', 'message' => 'Plan eliminado correctamente.']);
    }

    public function storeTask(Request $request): RedirectResponse
    {
        $request->validate([
            'plan_id' => ['required', 'uuid', 'exists:preventive_plans,id'],
            'asset_id' => ['nullable', 'uuid', 'exists:assets,id'],
            'component_id' => ['nullable', 'uuid', 'exists:components,id'],
            'scheduled_date' => ['required', 'date'],
            'priority' => ['nullable', 'string', 'in:low,medium,high'],
            'technician_id' => ['nullable', 'uuid', 'exists:users,id'],
        ]);

        $assetId = $request->input('asset_id');
        $componentId = $request->input('component_id');
        if (($assetId && $componentId) || (! $assetId && ! $componentId)) {
            return redirect()->back()->withErrors(['asset_id' => 'Debe seleccionar un activo o un componente, pero no ambos.'])->withInput();
        }

        PreventiveTask::create([
            'plan_id' => $request->input('plan_id'),
            'asset_id' => $assetId,
            'component_id' => $componentId,
            'status' => 'scheduled',
            'priority' => $request->input('priority', 'medium'),
            'scheduled_date' => $request->input('scheduled_date'),
            'technician_id' => $request->input('technician_id'),
        ]);

        return redirect()->route('admin.preventive-maintenance.index', ['tab' => 'tasks'])
            ->with('toast', ['type' => 'success', 'message' => 'Tarea creada correctamente.']);
    }

    public function updateTask(Request $request, PreventiveTask $preventive_task): RedirectResponse
    {
        $request->validate([
            'scheduled_date' => ['sometimes', 'date'],
            'priority' => ['nullable', 'string', 'in:low,medium,high'],
            'technician_id' => ['nullable', 'uuid', 'exists:users,id'],
            'status' => ['sometimes', 'string', 'in:scheduled,in_progress,completed,skipped,overdue,cancelled'],
            'findings' => ['nullable', 'string'],
            'action_taken' => ['nullable', 'string'],
            'condition_after' => ['nullable', 'string', 'in:new,good,regular,damaged,obsolete'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'next_due_date' => ['nullable', 'date'],
        ]);

        $data = array_filter([
            'scheduled_date' => $request->input('scheduled_date'),
            'priority' => $request->input('priority'),
            'technician_id' => $request->input('technician_id'),
            'status' => $request->input('status'),
            'findings' => $request->input('findings'),
            'action_taken' => $request->input('action_taken'),
            'condition_after' => $request->input('condition_after'),
            'cost' => $request->input('cost'),
            'next_due_date' => $request->input('next_due_date'),
        ], fn ($v) => $v !== null && $v !== '');

        if ($request->has('started_at')) {
            $data['started_at'] = $request->boolean('started_at') ? now() : null;
        }
        if ($request->has('completed_at')) {
            $data['completed_at'] = $request->boolean('completed_at') ? now() : null;
        }

        $preventive_task->update($data);

        return redirect()->back()->with('toast', ['type' => 'success', 'message' => 'Tarea actualizada correctamente.']);
    }

    public function destroyTask(PreventiveTask $preventive_task): RedirectResponse
    {
        $preventive_task->delete();

        return redirect()->back()->with('toast', ['type' => 'success', 'message' => 'Tarea eliminada correctamente.']);
    }

    private function formPayload(): array
    {
        $subcategoriesForSelect = AssetSubcategory::query()
            ->with('category:id,name,code,type')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'asset_category_id']);

        $componentTypesForSelect = ComponentType::query()
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        $officesForSelect = Office::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'zonal_id']);

        $warehousesForSelect = Warehouse::query()
            ->where('is_active', true)
            ->with(['office:id,name,code,zonal_id', 'office.zonal:id,name,code'])
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'office_id']);

        $plansForSelect = PreventivePlan::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'target_type']);

        $assetsForSelect = Asset::query()
            ->with(['category:id,name', 'model:id,name,brand_id', 'model.brand:id,name'])
            ->whereNotIn('status', ['disposed', 'sold'])
            ->orderBy('code')
            ->get(['id', 'code', 'serial_number', 'category_id', 'model_id']);

        $componentsForSelect = Component::query()
            ->with(['type:id,name', 'brand:id,name'])
            ->where('status', '<>', 'disposed')
            ->orderBy('code')
            ->get(['id', 'code', 'serial_number', 'type_id', 'brand_id', 'model']);

        $usersForSelect = User::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'last_name', 'usuario']);

        return [
            'subcategoriesForSelect' => $subcategoriesForSelect,
            'componentTypesForSelect' => $componentTypesForSelect,
            'officesForSelect' => $officesForSelect,
            'warehousesForSelect' => $warehousesForSelect,
            'plansForSelect' => $plansForSelect,
            'assetsForSelect' => $assetsForSelect,
            'componentsForSelect' => $componentsForSelect,
            'usersForSelect' => $usersForSelect,
        ];
    }
}
