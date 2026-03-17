<?php

namespace App\Http\Controllers\Admin;

use App\Exports\AssetsExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Asset\AssetRequest;
use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\AssetModel;
use App\Models\AssetSubcategory;
use App\Models\AssetAssignment;
use App\Models\AssetComputer;
use App\Models\AssetPhoto;
use App\Models\ComputerComponent;
use App\Models\Component;
use App\Models\Office;
use App\Models\Warehouse;
use App\Models\User;
use App\Models\Zonal;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Picqer\Barcode\BarcodeGeneratorPNG;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class AssetController extends Controller
{
    private const VALID_SORT = ['code', 'created_at', 'status'];

    private const VALID_ORDER = ['asc', 'desc'];

    private const PER_PAGE_OPTIONS = [5, 10, 15, 25, 50, 100];

    private const BARCODE_LABEL_WIDTH_MM = 50;

    private const BARCODE_LABEL_HEIGHT_MM = 25;

    public function index(Request $request): Response
    {
        $sortBy = $request->input('sort_by', 'code');
        $sortOrder = $request->input('sort_order', 'asc');
        $perPage = (int) $request->input('per_page', 50);
        $q = $request->input('q', '');
        $q = ($q === null || $q === 'null') ? '' : trim((string) $q);
        $status = $request->input('status', '');
        $status = ($status === null || $status === 'null') ? '' : trim((string) $status);
        $zonalId = $request->input('zonal_id', '');
        $zonalId = ($zonalId === null || $zonalId === 'null') ? '' : trim((string) $zonalId);
        $officeId = $request->input('office_id', '');
        $officeId = ($officeId === null || $officeId === 'null') ? '' : trim((string) $officeId);
        $categoryId = $request->input('category_id', '');
        $categoryId = ($categoryId === null || $categoryId === 'null') ? '' : trim((string) $categoryId);
        $subcategoryId = $request->input('subcategory_id', '');
        $subcategoryId = ($subcategoryId === null || $subcategoryId === 'null') ? '' : trim((string) $subcategoryId);

        if (! in_array($sortBy, self::VALID_SORT, true)) {
            $sortBy = 'code';
        }
        if (! in_array($sortOrder, self::VALID_ORDER, true)) {
            $sortOrder = 'asc';
        }
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = 50;
        }

        $query = Asset::query()->with([
            'model:id,name,subcategory_id,brand_id',
            'model.brand:id,name',
            'model.subcategory:id,name,asset_category_id',
            'category:id,name,code,type',
            'warehouse:id,name,code,office_id',
            'warehouse.office:id,zonal_id,name,code',
            'registeredBy:id,name',
            'updatedBy:id,name',
        ]);

        if ($q !== '') {
            $term = '%'.mb_strtolower($q).'%';
            $query->where(function ($qb) use ($term) {
                $qb->whereRaw('LOWER(code) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(serial_number, \'\')) LIKE ?', [$term])
                    ->orWhereHas('model', fn ($mq) => $mq->whereRaw('LOWER(name) LIKE ?', [$term]))
                    ->orWhereHas('category', fn ($cq) => $cq->whereRaw('LOWER(name) LIKE ?', [$term]));
            });
        }

        if ($zonalId !== '') {
            $query->where(function ($q) use ($zonalId, $officeId) {
                $q->whereHas('warehouse', function ($w) use ($zonalId, $officeId) {
                    $w->whereHas('office', fn ($o) => $o->where('zonal_id', $zonalId));
                    if ($officeId !== '') {
                        $w->where('office_id', $officeId);
                    }
                });
            });
        } elseif ($officeId !== '') {
            $query->whereHas('warehouse', fn ($w) => $w->where('office_id', $officeId));
        }

        if ($categoryId !== '') {
            $query->where('category_id', $categoryId);
        }

        if ($subcategoryId !== '') {
            $query->whereHas('model', fn ($m) => $m->where('subcategory_id', $subcategoryId));
        }

        if ($status !== '') {
            $query->where('status', $status);
        }

        $query->orderBy($sortBy, $sortOrder);

        $assets = $query->paginate($perPage)->withQueryString();

        $categoriesForSelect = AssetCategory::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);
        $subcategoriesForSelect = AssetSubcategory::query()->where('is_active', true)->orderBy('name')->get(['id', 'asset_category_id', 'name', 'code']);
        $modelsForSelect = AssetModel::query()
            ->where('is_active', true)
            ->with('brand:id,name')
            ->orderBy('name')
            ->get(['id', 'subcategory_id', 'name', 'brand_id']);
        $warehousesForSelect = Warehouse::query()
            ->where('is_active', true)
            ->with('office:id,zonal_id,name,code')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'office_id']);
        $zonalsForFilter = Zonal::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);
        $officesForFilter = Office::query()->where('is_active', true)->orderBy('name')->get(['id', 'zonal_id', 'name', 'code']);

        $baseQuery = Asset::query();
        if ($q !== '') {
            $term = '%'.mb_strtolower($q).'%';
            $baseQuery->where(function ($qb) use ($term) {
                $qb->whereRaw('LOWER(code) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(serial_number, \'\')) LIKE ?', [$term])
                    ->orWhereHas('model', fn ($mq) => $mq->whereRaw('LOWER(name) LIKE ?', [$term]))
                    ->orWhereHas('category', fn ($cq) => $cq->whereRaw('LOWER(name) LIKE ?', [$term]));
            });
        }
        if ($zonalId !== '') {
            $baseQuery->where(function ($q) use ($zonalId, $officeId) {
                $q->whereHas('warehouse', function ($w) use ($zonalId, $officeId) {
                    $w->whereHas('office', fn ($o) => $o->where('zonal_id', $zonalId));
                    if ($officeId !== '') {
                        $w->where('office_id', $officeId);
                    }
                });
            });
        } elseif ($officeId !== '') {
            $baseQuery->whereHas('warehouse', fn ($w) => $w->where('office_id', $officeId));
        }
        if ($categoryId !== '') {
            $baseQuery->where('category_id', $categoryId);
        }
        if ($subcategoryId !== '') {
            $baseQuery->whereHas('model', fn ($m) => $m->where('subcategory_id', $subcategoryId));
        }
        if ($status !== '') {
            $baseQuery->where('status', $status);
        }
        $totalFiltered = $baseQuery->count();

        $queryForStatusCounts = Asset::query();
        if ($q !== '') {
            $term = '%'.mb_strtolower($q).'%';
            $queryForStatusCounts->where(function ($qb) use ($term) {
                $qb->whereRaw('LOWER(code) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(serial_number, \'\')) LIKE ?', [$term])
                    ->orWhereHas('model', fn ($mq) => $mq->whereRaw('LOWER(name) LIKE ?', [$term]))
                    ->orWhereHas('category', fn ($cq) => $cq->whereRaw('LOWER(name) LIKE ?', [$term]));
            });
        }
        if ($zonalId !== '') {
            $queryForStatusCounts->where(function ($q) use ($zonalId, $officeId) {
                $q->whereHas('warehouse', function ($w) use ($zonalId, $officeId) {
                    $w->whereHas('office', fn ($o) => $o->where('zonal_id', $zonalId));
                    if ($officeId !== '') {
                        $w->where('office_id', $officeId);
                    }
                });
            });
        } elseif ($officeId !== '') {
            $queryForStatusCounts->whereHas('warehouse', fn ($w) => $w->where('office_id', $officeId));
        }
        if ($categoryId !== '') {
            $queryForStatusCounts->where('category_id', $categoryId);
        }
        if ($subcategoryId !== '') {
            $queryForStatusCounts->whereHas('model', fn ($m) => $m->where('subcategory_id', $subcategoryId));
        }
        $statusCounts = [];
        foreach (['stored', 'active', 'in_repair', 'in_transit', 'disposed', 'sold'] as $s) {
            $statusCounts[$s] = (clone $queryForStatusCounts)->where('status', $s)->count();
        }

        return Inertia::render('admin/assets/index', [
            'assets' => $assets,
            'categoriesForSelect' => $categoriesForSelect,
            'subcategoriesForSelect' => $subcategoriesForSelect,
            'modelsForSelect' => $modelsForSelect,
            'warehousesForSelect' => $warehousesForSelect,
            'zonalsForFilter' => $zonalsForFilter,
            'officesForFilter' => $officesForFilter,
            'filters' => [
                'q' => $q,
                'zonal_id' => $zonalId,
                'office_id' => $officeId,
                'category_id' => $categoryId,
                'subcategory_id' => $subcategoryId,
                'status' => $status,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => $totalFiltered,
                'has_filters' => $q !== '' || $zonalId !== '' || $officeId !== '' || $categoryId !== '' || $subcategoryId !== '' || $status !== '',
                'status_counts' => $statusCounts,
            ],
            'canBarcodeView' => $request->user()?->can('assets.barcodes.view') ?? false,
            'canBarcodeBulk' => $request->user()?->can('assets.barcodes.bulk') ?? false,
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
        $zonalId = $request->input('zonal_id', '');
        $zonalId = ($zonalId === null || $zonalId === 'null') ? '' : trim((string) $zonalId);
        $officeId = $request->input('office_id', '');
        $officeId = ($officeId === null || $officeId === 'null') ? '' : trim((string) $officeId);
        $categoryId = $request->input('category_id', '');
        $categoryId = ($categoryId === null || $categoryId === 'null') ? '' : trim((string) $categoryId);
        $subcategoryId = $request->input('subcategory_id', '');
        $subcategoryId = ($subcategoryId === null || $subcategoryId === 'null') ? '' : trim((string) $subcategoryId);

        if (! in_array($sortBy, self::VALID_SORT, true)) {
            $sortBy = 'code';
        }
        if (! in_array($sortOrder, self::VALID_ORDER, true)) {
            $sortOrder = 'asc';
        }

        $query = Asset::query()->with([
            'model.subcategory.category',
            'model.brand:id,name',
            'category:id,name,code',
            'warehouse.office.zonal',
            'registeredBy:id,name,last_name,usuario',
        ]);

        if ($q !== '') {
            $term = '%'.mb_strtolower($q).'%';
            $query->where(function ($qb) use ($term) {
                $qb->whereRaw('LOWER(code) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(serial_number, \'\')) LIKE ?', [$term])
                    ->orWhereHas('model', fn ($mq) => $mq->whereRaw('LOWER(name) LIKE ?', [$term]))
                    ->orWhereHas('category', fn ($cq) => $cq->whereRaw('LOWER(name) LIKE ?', [$term]));
            });
        }

        if ($zonalId !== '') {
            $query->where(function ($q) use ($zonalId, $officeId) {
                $q->whereHas('warehouse', function ($w) use ($zonalId, $officeId) {
                    $w->whereHas('office', fn ($o) => $o->where('zonal_id', $zonalId));
                    if ($officeId !== '') {
                        $w->where('office_id', $officeId);
                    }
                });
            });
        } elseif ($officeId !== '') {
            $query->whereHas('warehouse', fn ($w) => $w->where('office_id', $officeId));
        }

        if ($categoryId !== '') {
            $query->where('category_id', $categoryId);
        }

        if ($subcategoryId !== '') {
            $query->whereHas('model', fn ($m) => $m->where('subcategory_id', $subcategoryId));
        }

        if ($status !== '') {
            $query->where('status', $status);
        }

        $query->orderBy($sortBy, $sortOrder);

        $assets = $query->get();

        $filename = 'activos-'.now()->format('Y-m-d-His').'.xlsx';

        return Excel::download(new AssetsExport($assets), $filename, \Maatwebsite\Excel\Excel::XLSX);
    }

    public function barcodesPreview(Request $request): Response
    {
        $assets = $this->getAssetsForBarcodeIds($this->parseAssetIds($request));

        return Inertia::render('admin/assets/barcodes-preview', [
            'title' => 'Imprimir barcode de activos',
            'scopeLabel' => 'Registros visibles en la tabla',
            'assetsCount' => $assets->count(),
            'labelSpec' => sprintf(
                'Etiqueta %d x %d mm · Code 128 · Hoja A4',
                self::BARCODE_LABEL_WIDTH_MM,
                self::BARCODE_LABEL_HEIGHT_MM
            ),
            'pdfUrl' => route('admin.assets.barcodes.pdf', [
                'ids' => implode(',', $assets->pluck('id')->all()),
            ]),
            'downloadUrl' => route('admin.assets.barcodes.pdf', [
                'ids' => implode(',', $assets->pluck('id')->all()),
                'download' => 1,
            ]),
        ]);
    }

    public function barcodePreview(Asset $asset): Response
    {
        return Inertia::render('admin/assets/barcodes-preview', [
            'title' => 'Imprimir barcode del activo',
            'scopeLabel' => $asset->code,
            'assetsCount' => 1,
            'labelSpec' => sprintf(
                'Etiqueta %d x %d mm · Code 128 · Hoja A4',
                self::BARCODE_LABEL_WIDTH_MM,
                self::BARCODE_LABEL_HEIGHT_MM
            ),
            'pdfUrl' => route('admin.assets.barcode.pdf', $asset),
            'downloadUrl' => route('admin.assets.barcode.pdf', [
                'asset' => $asset->id,
                'download' => 1,
            ]),
        ]);
    }

    public function barcodesPdf(Request $request): SymfonyResponse
    {
        $assets = $this->getAssetsForBarcodeIds($this->parseAssetIds($request));

        return $this->makeBarcodePdfResponse(
            $assets,
            'activos-barcodes-'.now()->format('Y-m-d-His').'.pdf',
            $request->boolean('download')
        );
    }

    public function barcodePdf(Request $request, Asset $asset): SymfonyResponse
    {
        $asset->load(['model.brand:id,name', 'category:id,name,code', 'warehouse:id,name,code']);

        return $this->makeBarcodePdfResponse(
            collect([$asset]),
            'activo-'.$asset->code.'-barcode.pdf',
            $request->boolean('download')
        );
    }

    public function store(AssetRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $validated['warehouse_id'] = ! empty($validated['warehouse_id'] ?? '') ? $validated['warehouse_id'] : null;
        $validated['model_id'] = (! empty($validated['model_id'] ?? '')) ? $validated['model_id'] : null;
        $validated['registered_by_id'] = $request->user()?->id;
        $validated['updated_by_id'] = $request->user()?->id;

        if (empty($validated['code'] ?? '')) {
            $validated['code'] = $this->generateAssetCode($validated['category_id']);
        }

        $trashed = Asset::onlyTrashed()->where('code', $validated['code'])->first();

        if ($trashed) {
            return redirect()->back()
                ->with('restore_candidate', [
                    'type' => 'asset',
                    'id' => $trashed->id,
                    'name' => $trashed->code,
                ])
                ->with('restore_payload', $validated);
        }

        Asset::create($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Activo creado correctamente.']);
    }

    private function generateAssetCode(string $categoryId): string
    {
        $category = AssetCategory::query()->find($categoryId, ['id', 'code']);
        if (! $category) {
            return 'AST-'.str_pad((string) (Asset::withTrashed()->count() + 1), 5, '0', STR_PAD_LEFT);
        }
        $prefix = $category->code.'-';
        $lastCode = Asset::withTrashed()->where('code', 'like', $prefix.'%')->max('code');
        $next = 1;
        if ($lastCode !== null) {
            $parts = explode('-', $lastCode);
            $num = (int) end($parts);
            $next = $num + 1;
        }

        return $prefix.str_pad((string) $next, 5, '0', STR_PAD_LEFT);
    }

    private function parseAssetIds(Request $request): array
    {
        $ids = explode(',', (string) $request->input('ids', ''));
        $ids = array_values(array_filter(array_map('trim', $ids)));

        if ($ids === []) {
            abort(422, 'No se recibieron activos para generar etiquetas.');
        }

        return $ids;
    }

    private function getAssetsForBarcodeIds(array $ids): Collection
    {
        $assets = Asset::query()
            ->with([
                'model:id,name,subcategory_id,brand_id',
                'model.brand:id,name',
                'category:id,name,code',
                'warehouse:id,name,code',
            ])
            ->whereIn('id', $ids)
            ->get()
            ->sortBy(fn (Asset $asset) => array_search($asset->id, $ids, true))
            ->values();

        if ($assets->isEmpty()) {
            abort(404, 'No se encontraron activos para generar etiquetas.');
        }

        return $assets;
    }

    private function makeBarcodePdfResponse(Collection $assets, string $filename, bool $download): SymfonyResponse
    {
        $generator = new BarcodeGeneratorPNG();

        $labels = $assets->map(function (Asset $asset) use ($generator) {
            $barcode = base64_encode(
                $generator->getBarcode($asset->code, $generator::TYPE_CODE_128, 2, 48)
            );

            return [
                'id' => $asset->id,
                'code' => $asset->code,
                'serial_number' => $asset->serial_number,
                'model_name' => $asset->model?->name,
                'brand_name' => $asset->model?->brand?->name,
                'category_name' => $asset->category?->name,
                'warehouse_name' => $asset->warehouse?->name,
                'warehouse_code' => $asset->warehouse?->code,
                'barcode_data_uri' => 'data:image/png;base64,'.$barcode,
            ];
        })->all();

        $pdf = Pdf::loadView('pdf.assets-barcodes', [
            'labels' => $labels,
            'labelWidthMm' => self::BARCODE_LABEL_WIDTH_MM,
            'labelHeightMm' => self::BARCODE_LABEL_HEIGHT_MM,
        ])->setPaper('a4', 'portrait');

        return $download ? $pdf->download($filename) : $pdf->stream($filename);
    }

    public function update(AssetRequest $request, Asset $asset): RedirectResponse
    {
        $validated = $request->validated();
        $validated['warehouse_id'] = ! empty($validated['warehouse_id'] ?? '') ? $validated['warehouse_id'] : null;
        $validated['model_id'] = (! empty($validated['model_id'] ?? '')) ? $validated['model_id'] : null;
        $validated['updated_by_id'] = $request->user()?->id;

        $asset->update($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Activo actualizado correctamente.']);
    }

    public function destroy(Asset $asset): RedirectResponse
    {
        $asset->delete();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Activo eliminado correctamente.']);
    }

    public function restore(Request $request): RedirectResponse
    {
        abort_if(! $request->user()?->can('assets.create'), 403);
        $request->validate(['id' => ['required', 'uuid']]);
        $asset = Asset::withTrashed()->findOrFail($request->input('id'));
        $asset->restore();
        $data = $request->only(['code', 'serial_number', 'model_id', 'category_id', 'status', 'condition', 'warehouse_id', 'acquisition_value', 'current_value', 'depreciation_rate', 'warranty_until', 'notes']);
        $data['warehouse_id'] = ($data['warehouse_id'] ?? '') !== '' ? $data['warehouse_id'] : null;
        $asset->update($data);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Activo restaurado correctamente.']);
    }

    public function config(Asset $asset): Response
    {
        $asset->load([
            'model.subcategory.category',
            'warehouse.office.zonal',
            'registeredBy:id,name,last_name,usuario',
            'updatedBy:id,name,last_name,usuario',
            'computer',
        ]);

        $assignments = AssetAssignment::query()
            ->where('asset_id', $asset->id)
            ->with([
                'user:id,name,last_name,usuario',
                'assignedBy:id,name,last_name,usuario',
            ])
            ->orderByDesc('assigned_at')
            ->limit(50)
            ->get();

        $photos = AssetPhoto::query()
            ->where('asset_id', $asset->id)
            ->orderByDesc('created_at')
            ->get();

        $computerComponents = ComputerComponent::query()
            ->where('asset_id', $asset->id)
            ->with([
                'component.type:id,name,code',
                'component.brand:id,name',
                'installedBy:id,name,last_name,usuario',
                'uninstalledBy:id,name,last_name,usuario',
            ])
            ->orderByDesc('installed_at')
            ->get();

        $componentsForComputer = Component::query()
            ->where('status', 'stored')
            ->orderBy('code')
            ->with(['type:id,name,code', 'brand:id,name'])
            ->get(['id', 'code', 'serial_number', 'type_id', 'brand_id', 'model']);

        $usersForAssignment = User::query()
            ->where('is_active', true)
            ->assignable()
            ->orderBy('name')
            ->get(['id', 'name', 'last_name', 'usuario']);

        return Inertia::render('admin/assets/config', [
            'asset' => $asset,
            'assignments' => $assignments,
            'photos' => $photos,
            'usersForAssignment' => $usersForAssignment,
            'computerComponents' => $computerComponents,
            'componentsForComputer' => $componentsForComputer,
        ]);
    }

    private const CONDITION_VALUES = ['new', 'good', 'regular', 'damaged', 'obsolete'];

    public function storeAssignment(Request $request, Asset $asset): RedirectResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'uuid', 'exists:users,id'],
            'assigned_at' => ['nullable', 'date'],
            'condition_out' => ['nullable', 'string', 'in:'.implode(',', self::CONDITION_VALUES)],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $assignedAt = isset($data['assigned_at']) ? $data['assigned_at'] : now();

        AssetAssignment::create([
            'asset_id' => $asset->id,
            'user_id' => $data['user_id'],
            'assigned_by' => $request->user()?->id,
            'assigned_at' => $assignedAt,
            'condition_out' => $data['condition_out'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        $asset->update(['status' => 'active']);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Asignación registrada correctamente.']);
    }

    public function returnAssignment(Request $request, Asset $asset, AssetAssignment $assignment): RedirectResponse
    {
        if ($assignment->asset_id !== $asset->id) {
            abort(404);
        }
        if ($assignment->returned_at !== null) {
            return redirect()->back()
                ->with('toast', ['type' => 'error', 'message' => 'Esta asignación ya fue devuelta.']);
        }

        $data = $request->validate([
            'returned_at' => ['nullable', 'date'],
            'condition_in' => ['nullable', 'string', 'in:'.implode(',', self::CONDITION_VALUES)],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $returnedAt = isset($data['returned_at']) ? $data['returned_at'] : now();
        $notes = $assignment->notes;
        if (! empty($data['notes'] ?? '')) {
            $notes = $notes ? $notes."\n--- Devolución: ".trim($data['notes']) : 'Devolución: '.trim($data['notes']);
        }

        $assignment->update([
            'returned_at' => $returnedAt,
            'condition_in' => $data['condition_in'] ?? null,
            'notes' => $notes,
        ]);

        $asset->update(['status' => 'stored']);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Devolución registrada correctamente.']);
    }

    public function updateSpecs(Request $request, Asset $asset): RedirectResponse
    {
        $data = $request->validate([
            'specs' => ['nullable', 'array'],
        ]);

        $asset->specs = $data['specs'] ?? null;
        $asset->save();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Especificaciones actualizadas correctamente.']);
    }

    public function storeComputerComponent(Request $request, Asset $asset): RedirectResponse
    {
        $data = $request->validate([
            'component_id' => ['required', 'uuid', 'exists:components,id'],
            'slot' => ['nullable', 'string', 'max:60'],
            'installed_at' => ['nullable', 'date'],
        ]);

        $installedAt = isset($data['installed_at']) ? $data['installed_at'] : now();

        $computerComponent = ComputerComponent::create([
            'asset_id' => $asset->id,
            'component_id' => $data['component_id'],
            'slot' => $data['slot'] ?? null,
            'installed_at' => $installedAt,
            'installed_by' => $request->user()?->id,
        ]);

        Component::query()
            ->where('id', $computerComponent->component_id)
            ->update(['status' => 'active']);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Componente instalado correctamente.']);
    }

    public function retireComputerComponent(Request $request, Asset $asset, ComputerComponent $computerComponent): RedirectResponse
    {
        if ($computerComponent->asset_id !== $asset->id) {
            abort(404);
        }

        if ($computerComponent->uninstalled_at !== null) {
            return redirect()->back()
                ->with('toast', ['type' => 'error', 'message' => 'Este componente ya fue retirado.']);
        }

        $data = $request->validate([
            'uninstalled_at' => ['nullable', 'date'],
        ]);

        $uninstalledAt = isset($data['uninstalled_at']) ? $data['uninstalled_at'] : now();

        $computerComponent->update([
            'uninstalled_at' => $uninstalledAt,
            'uninstalled_by' => $request->user()?->id,
        ]);

        Component::query()
            ->where('id', $computerComponent->component_id)
            ->update(['status' => 'stored']);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Componente retirado correctamente.']);
    }

    public function updateComputer(Request $request, Asset $asset): RedirectResponse
    {
        $data = $request->validate([
            'hostname' => ['nullable', 'string', 'max:255'],
            'bios_serial' => ['nullable', 'string', 'max:200'],
            'ip_address' => ['nullable', 'string', 'max:45'],
            'mac_address' => ['nullable', 'string', 'max:50'],
        ]);

        $computer = $asset->computer;
        if (! $computer) {
            $computer = new AssetComputer(['asset_id' => $asset->id]);
        }
        $computer->hostname = $data['hostname'] ?? null;
        $computer->bios_serial = $data['bios_serial'] ?? null;
        $computer->ip_address = $data['ip_address'] ?? null;
        $computer->mac_address = $data['mac_address'] ?? null;
        $computer->save();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Datos de equipo actualizados correctamente.']);
    }

    public function storePhoto(Request $request, Asset $asset): RedirectResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'max:5120'],
            'caption' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:30'],
        ]);

        $file = $request->file('photo');
        $path = $file->store(
            'asset_photos/' . $asset->id,
            'public'
        );

        AssetPhoto::create([
            'asset_id' => $asset->id,
            'path' => $path,
            'caption' => $request->input('caption') ?: null,
            'type' => $request->input('type') ?: null,
        ]);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Foto subida correctamente.']);
    }

    public function destroyPhoto(Asset $asset, AssetPhoto $photo): RedirectResponse
    {
        if ($photo->asset_id !== $asset->id) {
            abort(404);
        }
        Storage::disk('public')->delete($photo->path);
        $photo->delete();
        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Foto eliminada.']);
    }
}
