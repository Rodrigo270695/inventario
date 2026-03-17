<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Invoice\InvoiceRequest;
use App\Models\Invoice;
use App\Models\PurchaseOrder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InvoiceController extends Controller
{
    private const VALID_SORT = ['invoice_number', 'invoice_date', 'amount', 'created_at'];

    private const VALID_ORDER = ['asc', 'desc'];

    private const PER_PAGE_OPTIONS = [5, 10, 15, 25, 50, 100];

    public function index(Request $request): Response
    {
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $perPage = (int) $request->input('per_page', 25);
        $q = $request->input('q', '');
        $q = ($q === null || $q === 'null') ? '' : trim((string) $q);
        $dateFrom = $request->input('date_from', '');
        $dateFrom = ($dateFrom === null || $dateFrom === 'null') ? '' : trim((string) $dateFrom);
        $dateTo = $request->input('date_to', '');
        $dateTo = ($dateTo === null || $dateTo === 'null') ? '' : trim((string) $dateTo);
        $status = $request->input('status', '');
        $status = ($status === null || $status === 'null') ? '' : trim((string) $status);

        if ($dateFrom === '' && $dateTo === '') {
            $dateFrom = now()->startOfMonth()->format('Y-m-d');
            $dateTo = now()->endOfMonth()->format('Y-m-d');
        }

        if (! in_array($sortBy, self::VALID_SORT, true)) {
            $sortBy = 'created_at';
        }
        if (! in_array($sortOrder, self::VALID_ORDER, true)) {
            $sortOrder = 'desc';
        }
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = 25;
        }

        $query = Invoice::query()->with([
            'purchaseOrder:id,code,supplier_id',
            'purchaseOrder.supplier:id,name,ruc',
            'registeredBy:id,name,last_name',
        ]);

        if ($q !== '') {
            $term = '%'.mb_strtolower($q).'%';
            $query->where(function ($qb) use ($term) {
                $qb->whereRaw('LOWER(COALESCE(invoice_number, \'\')) LIKE ?', [$term])
                    ->orWhereHas('purchaseOrder', function ($po) use ($term) {
                        $po->whereRaw('LOWER(COALESCE(code, \'\')) LIKE ?', [$term])
                            ->orWhereHas('supplier', function ($s) use ($term) {
                                $s->whereRaw('LOWER(COALESCE(name, \'\')) LIKE ?', [$term])
                                    ->orWhereRaw('LOWER(COALESCE(ruc, \'\')) LIKE ?', [$term]);
                            });
                    });
            });
        }

        $from = \Carbon\Carbon::parse($dateFrom)->startOfDay();
        $to = \Carbon\Carbon::parse($dateTo)->endOfDay();
        $query->where('created_at', '>=', $from)->where('created_at', '<=', $to);

        if ($status !== '') {
            $query->where('status', $status);
        }

        $query->orderBy($sortBy, $sortOrder);

        $invoices = $query->paginate($perPage)->withQueryString();

        $totalCount = Invoice::query()
            ->where('created_at', '>=', $from)
            ->where('created_at', '<=', $to)
            ->count();

        $payload = [
            'invoices' => $invoices,
            'filters' => [
                'q' => $q,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
                'per_page' => $perPage,
                'status' => $status,
            ],
            'stats' => [
                'total' => $totalCount,
            ],
        ];

        if ($request->user()?->can('invoices.create')) {
            $payload['purchase_orders'] = PurchaseOrder::query()
                ->where('status', 'approved')
                ->whereDoesntHave('invoices')
                ->with('supplier:id,name,ruc')
                ->orderByDesc('created_at')
                ->select(['id', 'code', 'supplier_id', 'total_amount'])
                ->get();
        }

        return Inertia::render('admin/invoices/index', $payload);
    }

    public function store(InvoiceRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $pdfPath = null;
        if ($request->hasFile('document')) {
            $pdfPath = $request->file('document')->store('invoices', 'local');
        }
        $remissionGuidePath = null;
        if ($request->hasFile('remission_guide_file')) {
            $remissionGuidePath = $request->file('remission_guide_file')->store('remission_guides', 'local');
        }
        $userId = $request->user()?->id;
        $status = ($pdfPath && $remissionGuidePath) ? 'closed' : 'open';

        Invoice::create([
            'purchase_order_id' => $validated['purchase_order_id'],
            'invoice_number' => $validated['invoice_number'],
            'invoice_date' => isset($validated['invoice_date']) ? $validated['invoice_date'] : null,
            'amount' => isset($validated['amount']) ? $validated['amount'] : null,
            'remission_guide' => $validated['remission_guide'] ?? null,
            'pdf_path' => $pdfPath,
            'remission_guide_path' => $remissionGuidePath,
            'status' => $status,
            'registered_by_id' => $userId,
            'closed_by_id' => $status === 'closed' ? $userId : null,
        ]);

        return redirect()->route('admin.invoices.index')->with('toast', ['type' => 'success', 'message' => 'Factura creada correctamente.']);
    }

    public function showDocument(Request $request, Invoice $invoice): StreamedResponse
    {
        if (! $request->user()?->can('invoices.view')) {
            abort(403);
        }
        if (! $invoice->pdf_path) {
            abort(404, 'No hay documento asociado.');
        }
        $disk = Storage::disk('local');
        if (! $disk->exists($invoice->pdf_path)) {
            abort(404, 'El archivo no existe.');
        }
        $name = basename($invoice->pdf_path);
        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        return $disk->download($invoice->pdf_path, $name);
    }

    public function showRemissionGuide(Request $request, Invoice $invoice): StreamedResponse
    {
        if (! $request->user()?->can('invoices.view')) {
            abort(403);
        }
        if (! $invoice->remission_guide_path) {
            abort(404, 'No hay guía de remisión asociada.');
        }
        $disk = Storage::disk('local');
        if (! $disk->exists($invoice->remission_guide_path)) {
            abort(404, 'El archivo de guía de remisión no existe.');
        }
        $name = basename($invoice->remission_guide_path);
        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        return $disk->download($invoice->remission_guide_path, $name);
    }

    public function update(Request $request, Invoice $invoice): RedirectResponse
    {
        if (! $request->user()?->can('invoices.update')) {
            abort(403);
        }
        $validated = $request->validate([
            'invoice_number' => ['required', 'string', 'max:100'],
            'invoice_date' => ['nullable', 'date'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'remission_guide' => ['nullable', 'string', 'max:100'],
            'remission_guide_file' => ['nullable', 'file', 'mimes:pdf', 'max:5120'],
            'document' => ['nullable', 'file', 'mimes:pdf,doc,docx', 'max:5120'],
        ], [
            'document.mimes' => 'El documento debe ser PDF o Word (.doc, .docx).',
            'document.max' => 'El documento no debe superar 5 MB.',
            'remission_guide_file.mimes' => 'La guía de remisión debe ser un archivo PDF.',
            'remission_guide_file.max' => 'La guía de remisión no debe superar 5 MB.',
        ], [
            'invoice_number' => 'número de factura',
            'invoice_date' => 'fecha de factura',
            'amount' => 'monto',
            'remission_guide' => 'guía de remisión',
            'remission_guide_file' => 'archivo de guía de remisión',
            'document' => 'documento',
        ]);

        $pdfPath = $invoice->pdf_path;
        if ($request->hasFile('document')) {
            if ($invoice->pdf_path && Storage::disk('local')->exists($invoice->pdf_path)) {
                Storage::disk('local')->delete($invoice->pdf_path);
            }
            $pdfPath = $request->file('document')->store('invoices', 'local');
        }

        $remissionGuidePath = $invoice->remission_guide_path;
        if ($request->hasFile('remission_guide_file')) {
            if ($invoice->remission_guide_path && Storage::disk('local')->exists($invoice->remission_guide_path)) {
                Storage::disk('local')->delete($invoice->remission_guide_path);
            }
            $remissionGuidePath = $request->file('remission_guide_file')->store('remission_guides', 'local');
        }

        $newStatus = $invoice->status;
        $userId = $request->user()?->id;
        $updateStatusFields = [];
        if ($pdfPath && $remissionGuidePath) {
            $newStatus = 'closed';
            $updateStatusFields = [
                'status' => 'closed',
                'closed_by_id' => $userId,
            ];
        } elseif (! $pdfPath || ! $remissionGuidePath) {
            $newStatus = 'open';
            $updateStatusFields = [
                'status' => 'open',
                'opened_by_id' => $userId,
            ];
        }

        $invoice->update(array_merge([
            'invoice_number' => $validated['invoice_number'],
            'invoice_date' => $validated['invoice_date'] ?? null,
            'amount' => $validated['amount'] ?? null,
            'remission_guide' => $validated['remission_guide'] ?? null,
            'pdf_path' => $pdfPath,
            'remission_guide_path' => $remissionGuidePath,
            'updated_by_id' => $userId,
        ], $updateStatusFields));

        return redirect()->route('admin.invoices.index')->with('toast', ['type' => 'success', 'message' => 'Factura actualizada.']);
    }

    public function destroy(Request $request, Invoice $invoice): RedirectResponse
    {
        if (! $request->user()?->can('invoices.delete')) {
            abort(403);
        }

        if ($invoice->status === 'closed') {
            return redirect()->back()->with('toast', ['type' => 'error', 'message' => 'No se puede eliminar una factura cerrada.']);
        }

        $graceDays = 3;
        $limit = now()->subDays($graceDays);
        if ($invoice->created_at->lt($limit)) {
            abort(403, 'Solo se puede eliminar una factura dentro de los '.$graceDays.' días posteriores a su creación.');
        }

        $invoice->delete();

        return redirect()->route('admin.invoices.index')->with('toast', ['type' => 'success', 'message' => 'Factura eliminada.']);
    }

    public function close(Request $request, Invoice $invoice): RedirectResponse
    {
        if (! $request->user()?->can('invoices.status')) {
            abort(403);
        }

        if (! $invoice->pdf_path || ! $invoice->remission_guide_path) {
            return redirect()->back()->with('toast', ['type' => 'error', 'message' => 'Para cerrar la factura se deben subir ambos documentos (factura y guía).']);
        }

        $invoice->update([
            'status' => 'closed',
            'closed_by_id' => $request->user()?->id,
        ]);

        return redirect()->route('admin.invoices.index')->with('toast', ['type' => 'success', 'message' => 'Factura cerrada correctamente.']);
    }

    public function open(Request $request, Invoice $invoice): RedirectResponse
    {
        if (! $request->user()?->can('invoices.status')) {
            abort(403);
        }

        $invoice->update([
            'status' => 'open',
            'opened_by_id' => $request->user()?->id,
        ]);

        return redirect()->route('admin.invoices.index')->with('toast', ['type' => 'success', 'message' => 'Factura abierta correctamente.']);
    }
}
