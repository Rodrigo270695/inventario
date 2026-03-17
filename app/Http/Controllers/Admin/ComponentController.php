<?php

namespace App\Http\Controllers\Admin;

use App\Exports\ComponentsExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Component\ComponentRequest;
use App\Models\Component;
use App\Models\ComponentType;
use App\Models\AssetBrand;
use App\Models\AssetCategory;
use App\Models\AssetSubcategory;
use App\Models\Office;
use App\Models\Warehouse;
use App\Models\Zonal;
use App\Models\RepairShop;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Picqer\Barcode\BarcodeGeneratorPNG;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class ComponentController extends Controller
{
    private const VALID_SORT = ['code', 'created_at', 'status'];

    private const VALID_ORDER = ['asc', 'desc'];

    private const PER_PAGE_OPTIONS = [5, 10, 15, 25, 50, 100];

    private const BARCODE_LABEL_WIDTH_MM = 38;

    private const BARCODE_LABEL_HEIGHT_MM = 20;

    public function index(Request $request): Response
    {
        $sortBy = $request->input('sort_by', 'code');
        $sortOrder = $request->input('sort_order', 'asc');
        $perPage = (int) $request->input('per_page', 50);
        $q = $request->input('q', '');
        $q = ($q === null || $q === 'null') ? '' : trim((string) $q);
        $status = $request->input('status', '');
        $status = ($status === null || $status === 'null') ? '' : trim((string) $status);
        $typeId = $request->input('type_id', '');
        $typeId = ($typeId === null || $typeId === 'null') ? '' : trim((string) $typeId);
        $zonalId = $request->input('zonal_id', '');
        $zonalId = ($zonalId === null || $zonalId === 'null') ? '' : trim((string) $zonalId);
        $officeId = $request->input('office_id', '');
        $officeId = ($officeId === null || $officeId === 'null') ? '' : trim((string) $officeId);
        $warehouseId = $request->input('warehouse_id', '');
        $warehouseId = ($warehouseId === null || $warehouseId === 'null') ? '' : trim((string) $warehouseId);

        if (! in_array($sortBy, self::VALID_SORT, true)) {
            $sortBy = 'code';
        }
        if (! in_array($sortOrder, self::VALID_ORDER, true)) {
            $sortOrder = 'asc';
        }
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = 50;
        }

        $query = Component::query()->with([
            'type:id,name,code',
            'brand:id,name',
            'subcategory.category',
            'warehouse:id,name,code',
            'repairShop:id,name',
        ]);

        if ($q !== '') {
            $term = '%' . mb_strtolower($q) . '%';
            $query->where(function ($qb) use ($term) {
                $qb->whereRaw('LOWER(code) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(serial_number, \'\')) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(model, \'\')) LIKE ?', [$term])
                    ->orWhereHas('type', fn ($t) => $t->whereRaw('LOWER(name) LIKE ?', [$term]))
                    ->orWhereHas('brand', fn ($b) => $b->whereRaw('LOWER(name) LIKE ?', [$term]));
            });
        }

        if ($typeId !== '') {
            $query->where('type_id', $typeId);
        }

        if ($zonalId !== '') {
            $query->whereHas('warehouse', function ($w) use ($zonalId, $officeId) {
                $w->whereHas('office', fn ($o) => $o->where('zonal_id', $zonalId));
                if ($officeId !== '') {
                    $w->where('office_id', $officeId);
                }
            });
        } elseif ($officeId !== '') {
            $query->whereHas('warehouse', fn ($w) => $w->where('office_id', $officeId));
        }

        if ($warehouseId !== '') {
            $query->where('warehouse_id', $warehouseId);
        }

        if ($status !== '') {
            $query->where('status', $status);
        }

        $query->orderBy($sortBy, $sortOrder);

        $components = $query->paginate($perPage)->withQueryString();

        $typesForSelect = ComponentType::query()->orderBy('name')->get(['id', 'name', 'code']);
        $brandsForSelect = AssetBrand::query()->orderBy('name')->get(['id', 'name']);
        $categoriesForSelect = AssetCategory::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);
        $subcategoriesForSelect = AssetSubcategory::query()->where('is_active', true)->orderBy('name')->get(['id', 'asset_category_id', 'name', 'code']);
        $warehousesForSelect = Warehouse::query()
            ->where('is_active', true)
            ->with('office:id,zonal_id,name,code')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'office_id']);
        $repairShopsForSelect = RepairShop::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $zonalsForFilter = Zonal::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);
        $officesForFilter = Office::query()->where('is_active', true)->orderBy('name')->get(['id', 'zonal_id', 'name', 'code']);

        $baseCount = Component::query();
        if ($q !== '') {
            $term = '%' . mb_strtolower($q) . '%';
            $baseCount->where(function ($qb) use ($term) {
                $qb->whereRaw('LOWER(code) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(serial_number, \'\')) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(model, \'\')) LIKE ?', [$term])
                    ->orWhereHas('type', fn ($t) => $t->whereRaw('LOWER(name) LIKE ?', [$term]))
                    ->orWhereHas('brand', fn ($b) => $b->whereRaw('LOWER(name) LIKE ?', [$term]));
            });
        }
        if ($typeId !== '') {
            $baseCount->where('type_id', $typeId);
        }
        if ($zonalId !== '') {
            $baseCount->whereHas('warehouse', function ($w) use ($zonalId, $officeId) {
                $w->whereHas('office', fn ($o) => $o->where('zonal_id', $zonalId));
                if ($officeId !== '') {
                    $w->where('office_id', $officeId);
                }
            });
        } elseif ($officeId !== '') {
            $baseCount->whereHas('warehouse', fn ($w) => $w->where('office_id', $officeId));
        }
        if ($warehouseId !== '') {
            $baseCount->where('warehouse_id', $warehouseId);
        }
        if ($status !== '') {
            $baseCount->where('status', $status);
        }
        $totalFiltered = $baseCount->count();

        $statusCounts = [];
        foreach (['stored', 'active', 'in_repair', 'in_transit', 'disposed'] as $s) {
            $qCount = Component::query();
            if ($q !== '') {
                $term = '%' . mb_strtolower($q) . '%';
                $qCount->where(function ($qb) use ($term) {
                    $qb->whereRaw('LOWER(code) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(COALESCE(serial_number, \'\')) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(COALESCE(model, \'\')) LIKE ?', [$term])
                        ->orWhereHas('type', fn ($t) => $t->whereRaw('LOWER(name) LIKE ?', [$term]))
                        ->orWhereHas('brand', fn ($b) => $b->whereRaw('LOWER(name) LIKE ?', [$term]));
                });
            }
            if ($typeId !== '') {
                $qCount->where('type_id', $typeId);
            }
            if ($zonalId !== '') {
                $qCount->whereHas('warehouse', function ($w) use ($zonalId, $officeId) {
                    $w->whereHas('office', fn ($o) => $o->where('zonal_id', $zonalId));
                    if ($officeId !== '') {
                        $w->where('office_id', $officeId);
                    }
                });
            } elseif ($officeId !== '') {
                $qCount->whereHas('warehouse', fn ($w) => $w->where('office_id', $officeId));
            }
            if ($warehouseId !== '') {
                $qCount->where('warehouse_id', $warehouseId);
            }
            $statusCounts[$s] = $qCount->where('status', $s)->count();
        }

        return Inertia::render('admin/components/index', [
            'components' => $components,
            'typesForSelect' => $typesForSelect,
            'brandsForSelect' => $brandsForSelect,
            'warehousesForSelect' => $warehousesForSelect,
            'repairShopsForSelect' => $repairShopsForSelect,
            'zonalsForFilter' => $zonalsForFilter,
            'officesForFilter' => $officesForFilter,
            'categoriesForSelect' => $categoriesForSelect,
            'subcategoriesForSelect' => $subcategoriesForSelect,
            'filters' => [
                'q' => $q,
                'type_id' => $typeId,
                'zonal_id' => $zonalId,
                'office_id' => $officeId,
                'warehouse_id' => $warehouseId,
                'status' => $status,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => $totalFiltered,
                'has_filters' => $q !== '' || $typeId !== '' || $zonalId !== '' || $officeId !== '' || $warehouseId !== '' || $status !== '',
                'status_counts' => $statusCounts,
            ],
        ]);
    }

    public function export(Request $request)
    {
        $sortBy = $request->input('sort_by', 'code');
        $sortOrder = $request->input('sort_order', 'asc');
        $q = $request->input('q', '');
        $q = ($q === null || $q === 'null') ? '' : trim((string) $q);
        $status = $request->input('status', '');
        $status = ($status === null || $status === 'null') ? '' : trim((string) $status);
        $typeId = $request->input('type_id', '');
        $typeId = ($typeId === null || $typeId === 'null') ? '' : trim((string) $typeId);
        $zonalId = $request->input('zonal_id', '');
        $zonalId = ($zonalId === null || $zonalId === 'null') ? '' : trim((string) $zonalId);
        $officeId = $request->input('office_id', '');
        $officeId = ($officeId === null || $officeId === 'null') ? '' : trim((string) $officeId);
        $warehouseId = $request->input('warehouse_id', '');
        $warehouseId = ($warehouseId === null || $warehouseId === 'null') ? '' : trim((string) $warehouseId);

        if (! in_array($sortBy, self::VALID_SORT, true)) {
            $sortBy = 'code';
        }
        if (! in_array($sortOrder, self::VALID_ORDER, true)) {
            $sortOrder = 'asc';
        }

        $query = Component::query()->with([
            'type:id,name,code',
            'brand:id,name',
            'subcategory.category',
            'warehouse.office.zonal',
        ]);

        if ($q !== '') {
            $term = '%' . mb_strtolower($q) . '%';
            $query->where(function ($qb) use ($term) {
                $qb->whereRaw('LOWER(code) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(serial_number, \'\')) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(model, \'\')) LIKE ?', [$term])
                    ->orWhereHas('type', fn ($t) => $t->whereRaw('LOWER(name) LIKE ?', [$term]))
                    ->orWhereHas('brand', fn ($b) => $b->whereRaw('LOWER(name) LIKE ?', [$term]));
            });
        }

        if ($typeId !== '') {
            $query->where('type_id', $typeId);
        }

        if ($zonalId !== '') {
            $query->whereHas('warehouse', function ($w) use ($zonalId, $officeId) {
                $w->whereHas('office', fn ($o) => $o->where('zonal_id', $zonalId));
                if ($officeId !== '') {
                    $w->where('office_id', $officeId);
                }
            });
        } elseif ($officeId !== '') {
            $query->whereHas('warehouse', fn ($w) => $w->where('office_id', $officeId));
        }

        if ($warehouseId !== '') {
            $query->where('warehouse_id', $warehouseId);
        }

        if ($status !== '') {
            $query->where('status', $status);
        }

        $query->orderBy($sortBy, $sortOrder);

        $components = $query->get();

        $filename = 'componentes-'.now()->format('Y-m-d-His').'.xlsx';

        return Excel::download(new ComponentsExport($components), $filename, \Maatwebsite\Excel\Excel::XLSX);
    }

    public function barcodesPdf(Request $request): SymfonyResponse
    {
        $components = $this->getComponentsForBarcodeIds($this->parseComponentIds($request));

        return $this->makeBarcodePdfResponse(
            $components,
            'componentes-barcodes-'.now()->format('Y-m-d-His').'.pdf',
            $request->boolean('download')
        );
    }

    public function barcodePdf(Request $request, Component $component): SymfonyResponse
    {
        $component->load([
            'type:id,name,code',
            'brand:id,name',
        ]);

        return $this->makeBarcodePdfResponse(
            collect([$component]),
            'componente-'.$component->code.'-barcode.pdf',
            $request->boolean('download')
        );
    }

    public function store(ComponentRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $validated['warehouse_id'] = ! empty($validated['warehouse_id'] ?? '') ? $validated['warehouse_id'] : null;
        $validated['brand_id'] = ! empty($validated['brand_id'] ?? '') ? $validated['brand_id'] : null;
        $validated['repair_shop_id'] = ! empty($validated['repair_shop_id'] ?? '') ? $validated['repair_shop_id'] : null;

        if (empty($validated['code'] ?? '')) {
            $validated['code'] = $this->generateComponentCode($validated['type_id'] ?? null);
        }

        Component::create($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Componente creado correctamente.']);
    }

    public function update(ComponentRequest $request, Component $component): RedirectResponse
    {
        $validated = $request->validated();
        $validated['warehouse_id'] = ! empty($validated['warehouse_id'] ?? '') ? $validated['warehouse_id'] : null;
        $validated['brand_id'] = ! empty($validated['brand_id'] ?? '') ? $validated['brand_id'] : null;
        $validated['repair_shop_id'] = ! empty($validated['repair_shop_id'] ?? '') ? $validated['repair_shop_id'] : null;

        $component->update($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Componente actualizado correctamente.']);
    }

    public function destroy(Component $component): RedirectResponse
    {
        $component->delete();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Componente eliminado.']);
    }

    public function config(Component $component): Response
    {
        $component->load([
            'type:id,name,code',
            'brand:id,name',
            'warehouse.office.zonal',
        ]);

        return Inertia::render('admin/components/config', [
            'component' => $component,
        ]);
    }

    public function updateSpecs(Request $request, Component $component): RedirectResponse
    {
        $data = $request->validate([
            'specs' => ['nullable', 'array'],
        ]);

        $component->specs = $data['specs'] ?? null;
        $component->save();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Especificaciones actualizadas correctamente.']);
    }

    private function generateComponentCode(?string $typeId): string
    {
        $prefix = 'COMP';

        if ($typeId) {
            $type = ComponentType::query()->find($typeId);
            if ($type && $type->code) {
                $prefix = 'COMP-' . strtoupper($type->code);
            }
        }

        $last = Component::withTrashed()
            ->where('code', 'LIKE', $prefix . '-%')
            ->orderByDesc('code')
            ->value('code');

        $nextNumber = 1;
        if ($last) {
            $parts = explode('-', $last);
            $lastNum = (int) end($parts);
            if ($lastNum > 0) {
                $nextNumber = $lastNum + 1;
            }
        }

        return sprintf('%s-%03d', $prefix, $nextNumber);
    }

    private function parseComponentIds(Request $request): array
    {
        $ids = explode(',', (string) $request->input('ids', ''));
        $ids = array_values(array_filter(array_map('trim', $ids)));

        if ($ids === []) {
            abort(422, 'No se recibieron componentes para generar etiquetas.');
        }

        return $ids;
    }

    private function getComponentsForBarcodeIds(array $ids): Collection
    {
        $components = Component::query()
            ->with([
                'type:id,name,code',
                'brand:id,name',
            ])
            ->whereIn('id', $ids)
            ->get()
            ->sortBy(fn (Component $component) => array_search($component->id, $ids, true))
            ->values();

        if ($components->isEmpty()) {
            abort(404, 'No se encontraron componentes para generar etiquetas.');
        }

        return $components;
    }

    private function makeBarcodePdfResponse(Collection $components, string $filename, bool $download): SymfonyResponse
    {
        $generator = new BarcodeGeneratorPNG();

        $labels = $components->map(function (Component $component) use ($generator) {
            $barcode = base64_encode(
                $generator->getBarcode($component->code, $generator::TYPE_CODE_128, 2, 42)
            );

            return [
                'code' => $component->code,
                'type_name' => $component->type?->name,
                'model_line' => trim(collect([$component->brand?->name, $component->model])->filter()->implode(' ')),
                'serial_number' => $component->serial_number,
                'barcode_data_uri' => 'data:image/png;base64,'.$barcode,
            ];
        })->all();

        $pdf = Pdf::loadView('pdf.components-barcodes', [
            'labels' => $labels,
            'labelWidthMm' => self::BARCODE_LABEL_WIDTH_MM,
            'labelHeightMm' => self::BARCODE_LABEL_HEIGHT_MM,
        ])->setPaper('a4', 'portrait');

        return $download ? $pdf->download($filename) : $pdf->stream($filename);
    }
}
