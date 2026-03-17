<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AssetBrand;
use App\Models\AssetCategory;
use App\Models\AssetModel;
use App\Models\AssetSubcategory;
use App\Models\ComponentType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AssetCatalogController extends Controller
{
    public function index(Request $request): Response
    {
        $categories = AssetCategory::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code', 'type', 'is_active']);
        $subcategories = AssetSubcategory::query()
            ->with('assetCategory:id,name,code,is_active')
            ->orderBy('name')
            ->get(['id', 'asset_category_id', 'name', 'code', 'is_active']);
        $brands = AssetBrand::query()->orderBy('name')->get(['id', 'name']);
        $models = AssetModel::query()
            ->with(['brand:id,name', 'subcategory:id,name,asset_category_id', 'subcategory.assetCategory:id,name'])
            ->orderBy('name')
            ->get(['id', 'brand_id', 'subcategory_id', 'name', 'specs', 'is_active']);
        $componentTypes = ComponentType::query()->orderBy('name')->get(['id', 'name', 'code']);

        return Inertia::render('admin/asset-catalog/index', [
            'categories' => $categories,
            'subcategories' => $subcategories,
            'brands' => $brands,
            'models' => $models,
            'componentTypes' => $componentTypes,
            'can' => [
                'create_subcategory' => $request->user()?->can('asset_subcategories.create'),
                'update_subcategory' => $request->user()?->can('asset_subcategories.update'),
                'delete_subcategory' => $request->user()?->can('asset_subcategories.delete'),
                'create_brand' => $request->user()?->can('asset_brands.create'),
                'update_brand' => $request->user()?->can('asset_brands.update'),
                'delete_brand' => $request->user()?->can('asset_brands.delete'),
                'create_model' => $request->user()?->can('asset_models.create'),
                'update_model' => $request->user()?->can('asset_models.update'),
                'delete_model' => $request->user()?->can('asset_models.delete'),
                'create_component_type' => $request->user()?->can('component_types.create'),
                'update_component_type' => $request->user()?->can('component_types.update'),
                'delete_component_type' => $request->user()?->can('component_types.delete'),
            ],
        ]);
    }

    public function storeSubcategory(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'asset_category_id' => ['required', 'uuid', 'exists:asset_categories,id'],
            'name' => ['required', 'string', 'max:100'],
            'code' => ['nullable', 'string', 'max:30'],
            'is_active' => ['boolean'],
        ]);
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['name'] = mb_strtoupper($validated['name']);
        if (! empty($validated['code'])) {
            $validated['code'] = mb_strtoupper($validated['code']);
        }
        AssetSubcategory::create($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Subcategoría creada correctamente.']);
    }

    public function updateSubcategory(Request $request, AssetSubcategory $asset_subcategory): RedirectResponse
    {
        $validated = $request->validate([
            'asset_category_id' => ['required', 'uuid', 'exists:asset_categories,id'],
            'name' => ['required', 'string', 'max:100'],
            'code' => ['nullable', 'string', 'max:30'],
            'is_active' => ['boolean'],
        ]);
        $validated['name'] = mb_strtoupper($validated['name']);
        if (! empty($validated['code'])) {
            $validated['code'] = mb_strtoupper($validated['code']);
        }
        $asset_subcategory->update($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Subcategoría actualizada correctamente.']);
    }

    public function destroySubcategory(AssetSubcategory $asset_subcategory): RedirectResponse
    {
        $asset_subcategory->delete();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Subcategoría eliminada correctamente.']);
    }

    public function storeBrand(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ]);
        $validated['name'] = mb_strtoupper($validated['name']);
        AssetBrand::create($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Marca creada correctamente.']);
    }

    public function updateBrand(Request $request, AssetBrand $asset_brand): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ]);
        $validated['name'] = mb_strtoupper($validated['name']);
        $asset_brand->update($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Marca actualizada correctamente.']);
    }

    public function destroyBrand(AssetBrand $asset_brand): RedirectResponse
    {
        $asset_brand->delete();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Marca eliminada correctamente.']);
    }

    public function storeModel(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'brand_id' => ['required', 'uuid', 'exists:asset_brands,id'],
            'subcategory_id' => [
                'required',
                'uuid',
                Rule::exists('asset_subcategories', 'id'),
            ],
            'name' => ['required', 'string', 'max:200'],
            'specs' => ['nullable', 'array'],
            'is_active' => ['boolean'],
        ]);
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['name'] = mb_strtoupper($validated['name']);

        $trashed = AssetModel::onlyTrashed()
            ->where('brand_id', $validated['brand_id'])
            ->where('subcategory_id', $validated['subcategory_id'])
            ->where('name', $validated['name'])
            ->first();

        if ($trashed) {
            return redirect()->back()
                ->with('restore_candidate', [
                    'type' => 'asset_model',
                    'id' => $trashed->id,
                    'name' => $trashed->name,
                ])
                ->with('restore_payload', $validated);
        }

        AssetModel::create($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Modelo creado correctamente.']);
    }

    public function updateModel(Request $request, AssetModel $asset_model): RedirectResponse
    {
        $allowedSubcategoryIds = AssetSubcategory::query()
            ->where('is_active', true)
            ->pluck('id')
            ->push($asset_model->subcategory_id)
            ->unique()
            ->values()
            ->all();

        $validated = $request->validate([
            'brand_id' => ['required', 'uuid', 'exists:asset_brands,id'],
            'subcategory_id' => [
                'required',
                'uuid',
                Rule::in($allowedSubcategoryIds),
            ],
            'name' => ['required', 'string', 'max:200'],
            'specs' => ['nullable', 'array'],
            'is_active' => ['boolean'],
        ]);
        $validated['name'] = mb_strtoupper($validated['name']);
        $asset_model->update($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Modelo actualizado correctamente.']);
    }

    public function destroyModel(AssetModel $asset_model): RedirectResponse
    {
        $asset_model->delete();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Modelo eliminado correctamente.']);
    }

    public function restoreModel(Request $request): RedirectResponse
    {
        abort_if(! $request->user()?->can('asset_models.create'), 403);
        $request->validate(['id' => ['required', 'uuid']]);
        $model = AssetModel::withTrashed()->findOrFail($request->input('id'));
        $model->restore();
        $data = $request->only(['brand_id', 'subcategory_id', 'name', 'specs', 'is_active']);
        if (isset($data['is_active'])) {
            $data['is_active'] = (bool) $data['is_active'];
        }
        if (isset($data['name'])) {
            $data['name'] = mb_strtoupper($data['name']);
        }
        $model->update($data);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Modelo restaurado correctamente.']);
    }

    public function storeComponentType(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'code' => ['nullable', 'string', 'max:30'],
        ]);
        $validated['name'] = mb_strtoupper($validated['name']);
        if (! empty($validated['code'])) {
            $validated['code'] = mb_strtoupper($validated['code']);
        }
        ComponentType::create($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Tipo de componente creado correctamente.']);
    }

    public function updateComponentType(Request $request, ComponentType $component_type): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'code' => ['nullable', 'string', 'max:30'],
        ]);
        $validated['name'] = mb_strtoupper($validated['name']);
        if (! empty($validated['code'])) {
            $validated['code'] = mb_strtoupper($validated['code']);
        }
        $component_type->update($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Tipo de componente actualizado correctamente.']);
    }

    public function destroyComponentType(ComponentType $component_type): RedirectResponse
    {
        $component_type->delete();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Tipo de componente eliminado correctamente.']);
    }
}
