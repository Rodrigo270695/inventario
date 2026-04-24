<?php

namespace App\Http\Controllers\Admin;

use App\Exports\RepairTicketsExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RepairTicket\RepairTicketRequest;
use App\Jobs\SendRepairTicketPendingApprovalEmailJob;
use App\Models\Asset;
use App\Models\Component;
use App\Models\MaintenanceDocument;
use App\Models\MaintenanceStatusLog;
use App\Models\Office;
use App\Models\RepairCost;
use App\Models\RepairPart;
use App\Models\RepairShop;
use App\Models\RepairTicket;
use App\Models\Scopes\AllowedZonalsScope;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\Zonal;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class RepairTicketController extends Controller
{
    private const VALID_SORT = ['code', 'reported_at', 'status', 'priority', 'created_at'];

    private const VALID_ORDER = ['asc', 'desc'];

    private const PER_PAGE_OPTIONS = [5, 10, 15, 25, 50, 100];

    public function index(Request $request): Response
    {
        $sortBy = $this->cleanString($request->input('sort_by', 'reported_at'));
        $sortOrder = $this->cleanString($request->input('sort_order', 'desc'));
        $perPage = (int) $request->input('per_page', 25);
        $q = $this->cleanString($request->input('q', ''));
        $status = $this->cleanString($request->input('status', ''));
        $priority = $this->cleanString($request->input('priority', ''));
        $maintenanceMode = $this->cleanString($request->input('maintenance_mode', ''));
        $dateFrom = $this->cleanString($request->input('date_from', ''));
        $dateTo = $this->cleanString($request->input('date_to', ''));

        if ($dateFrom === '' && $dateTo === '') {
            $dateFrom = now()->startOfMonth()->format('Y-m-d');
            $dateTo = now()->endOfMonth()->format('Y-m-d');
        }
        $zonalId = $this->cleanString($request->input('zonal_id', ''));
        $officeId = $this->cleanString($request->input('office_id', ''));
        $warehouseId = $this->cleanString($request->input('warehouse_id', ''));

        if (! in_array($sortBy, self::VALID_SORT, true)) {
            $sortBy = 'reported_at';
        }
        if (! in_array($sortOrder, self::VALID_ORDER, true)) {
            $sortOrder = 'desc';
        }
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = 25;
        }

        $query = RepairTicket::query()->with($this->ticketIndexRelations());
        $this->applyIndexFilters($query, $q, $status, $priority, $maintenanceMode, $dateFrom, $dateTo, $zonalId, $officeId, $warehouseId);
        $query->orderBy($sortBy, $sortOrder);

        $tickets = $query->paginate($perPage)->withQueryString();

        $statsBase = RepairTicket::query()->with($this->ticketIndexRelations());
        $this->applyIndexFilters($statsBase, $q, '', $priority, $maintenanceMode, $dateFrom, $dateTo, $zonalId, $officeId, $warehouseId);

        return Inertia::render('admin/repair-tickets/index', array_merge(
            [
                'repairTickets' => $tickets,
                'filters' => [
                    'q' => $q,
                    'status' => $status,
                    'priority' => $priority,
                    'maintenance_mode' => $maintenanceMode,
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                    'zonal_id' => $zonalId,
                    'office_id' => $officeId,
                    'warehouse_id' => $warehouseId,
                    'sort_by' => $sortBy,
                    'sort_order' => $sortOrder,
                    'per_page' => $perPage,
                ],
                'stats' => [
                    'total' => (clone $statsBase)->count(),
                    'pending_approval' => (clone $statsBase)->where('status', 'pending_approval')->count(),
                    'approved' => (clone $statsBase)->where('status', 'approved')->count(),
                    'in_progress' => (clone $statsBase)->where('status', 'in_progress')->count(),
                    'completed' => (clone $statsBase)->where('status', 'completed')->count(),
                    'cancelled' => (clone $statsBase)->whereIn('status', ['rejected', 'cancelled'])->count(),
                    'has_filters' => $q !== '' || $status !== '' || $priority !== '' || $maintenanceMode !== '' || $dateFrom !== '' || $dateTo !== '' || $zonalId !== '' || $officeId !== '' || $warehouseId !== '',
                ],
            ],
            $this->ticketFormPayload()
        ));
    }

    public function export(Request $request)
    {
        $sortBy = $this->cleanString($request->input('sort_by', 'reported_at'));
        $sortOrder = $this->cleanString($request->input('sort_order', 'desc'));
        $q = $this->cleanString($request->input('q', ''));
        $status = $this->cleanString($request->input('status', ''));
        $priority = $this->cleanString($request->input('priority', ''));
        $maintenanceMode = $this->cleanString($request->input('maintenance_mode', ''));
        $dateFrom = $this->cleanString($request->input('date_from', ''));
        $dateTo = $this->cleanString($request->input('date_to', ''));
        $zonalId = $this->cleanString($request->input('zonal_id', ''));
        $officeId = $this->cleanString($request->input('office_id', ''));
        $warehouseId = $this->cleanString($request->input('warehouse_id', ''));

        if ($dateFrom === '' && $dateTo === '') {
            $dateFrom = now()->startOfMonth()->format('Y-m-d');
            $dateTo = now()->endOfMonth()->format('Y-m-d');
        }

        if (! in_array($sortBy, self::VALID_SORT, true)) {
            $sortBy = 'reported_at';
        }
        if (! in_array($sortOrder, self::VALID_ORDER, true)) {
            $sortOrder = 'desc';
        }

        $query = RepairTicket::query()->with($this->ticketIndexRelations());
        $this->applyIndexFilters($query, $q, $status, $priority, $maintenanceMode, $dateFrom, $dateTo, $zonalId, $officeId, $warehouseId);
        $query->orderBy($sortBy, $sortOrder);

        $tickets = $query->get();

        $filename = 'reparaciones-'.now()->format('Y-m-d-His').'.xlsx';

        return Excel::download(new RepairTicketsExport($tickets), $filename, \Maatwebsite\Excel\Excel::XLSX);
    }

    public function create(): RedirectResponse
    {
        return redirect()->route('admin.repair-tickets.index');
    }

    public function store(RepairTicketRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $validated['code'] = $this->generateTicketCode();
        $validated['status'] = 'pending_approval';
        $validated['reported_at'] = now();
        $validated['opened_by'] = $request->user()?->id;

        $ticket = RepairTicket::create($validated);

        $this->logTicketEvent(
            $ticket,
            'status_change',
            null,
            'pending_approval',
            'Ticket registrado y enviado a aprobación.',
            $request->user()?->id
        );

        SendRepairTicketPendingApprovalEmailJob::dispatch($ticket->id);

        return redirect()->route('admin.repair-tickets.index')
            ->with('toast', ['type' => 'success', 'message' => 'Ticket creado correctamente.']);
    }

    public function edit(RepairTicket $repairTicket): RedirectResponse
    {
        return redirect()->route('admin.repair-tickets.config', [
            'repair_ticket' => $repairTicket->id,
            'tab' => 'general',
        ]);
    }

    public function config(Request $request, RepairTicket $repairTicket): Response
    {
        $repairTicket->load($this->ticketConfigRelations());

        $parts = RepairPart::query()
            ->where('repair_ticket_id', $repairTicket->id)
            ->with([
                'component:id,code,serial_number,type_id,brand_id,model',
                'component.type:id,name,code',
                'component.brand:id,name',
            ])
            ->orderByDesc('created_at')
            ->get();

        $costs = RepairCost::query()
            ->where('repair_ticket_id', $repairTicket->id)
            ->with(['supplier:id,name,ruc'])
            ->orderByDesc('incurred_at')
            ->get();

        $documents = MaintenanceDocument::query()
            ->where('repair_ticket_id', $repairTicket->id)
            ->with([
                'repairCost:id,repair_ticket_id,type,amount,document_number',
                'uploadedBy:id,name,last_name,usuario',
            ])
            ->orderByDesc('created_at')
            ->get();

        $statusLogs = MaintenanceStatusLog::query()
            ->where('repair_ticket_id', $repairTicket->id)
            ->with('performedBy:id,name,last_name,usuario')
            ->orderByDesc('created_at')
            ->get();

        $initialTab = $request->query('tab');
        $initialTab = in_array($initialTab, ['general', 'parts', 'costs', 'documents', 'history'], true)
            ? $initialTab
            : 'general';

        return Inertia::render('admin/repair-tickets/config', array_merge(
            [
                'repairTicket' => $repairTicket,
                'parts' => $parts,
                'costs' => $costs,
                'documents' => $documents,
                'statusLogs' => $statusLogs,
                'initialTab' => $initialTab,
            ],
            $this->ticketFormPayload()
        ));
    }

    public function update(RepairTicketRequest $request, RepairTicket $repairTicket): RedirectResponse
    {
        $validated = $request->validated();
        $repairTicket->update($validated);

        $this->logTicketEvent(
            $repairTicket,
            'note',
            null,
            null,
            'Se actualizaron los datos generales del ticket.',
            $request->user()?->id
        );

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Ticket actualizado correctamente.',
        ]);
    }

    public function storePart(Request $request, RepairTicket $repairTicket): RedirectResponse
    {
        $data = $request->validate([
            'component_id' => ['nullable', 'uuid', 'exists:components,id'],
            'part_name' => ['nullable', 'string', 'max:200'],
            'part_number' => ['nullable', 'string', 'max:120'],
            'source_type' => ['required', 'string', 'in:stock,external'],
            'quantity' => ['required', 'integer', 'min:1'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($data['source_type'] === 'stock' && empty($data['component_id'])) {
            abort(422, 'Debe seleccionar un componente de inventario.');
        }

        if ($data['source_type'] === 'external' && $this->cleanString($data['part_name'] ?? '') === '') {
            abort(422, 'Debe indicar el nombre del repuesto externo.');
        }

        $quantity = (int) $data['quantity'];
        $unitCost = isset($data['unit_cost']) ? (float) $data['unit_cost'] : null;

        RepairPart::create([
            'repair_ticket_id' => $repairTicket->id,
            'component_id' => $data['component_id'] ?? null,
            'part_name' => $this->nullableString($data['part_name'] ?? null),
            'part_number' => $this->nullableString($data['part_number'] ?? null),
            'source_type' => $data['source_type'],
            'quantity' => $quantity,
            'unit_cost' => $unitCost,
            'total_cost' => $unitCost !== null ? $unitCost * $quantity : null,
            'notes' => $this->nullableString($data['notes'] ?? null),
        ]);

        $this->logTicketEvent(
            $repairTicket,
            'note',
            null,
            null,
            'Se añadió un repuesto al ticket.',
            $request->user()?->id
        );

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Repuesto agregado correctamente.',
        ]);
    }

    public function destroyPart(Request $request, RepairTicket $repairTicket, RepairPart $repairPart): RedirectResponse
    {
        abort_unless($repairPart->repair_ticket_id === $repairTicket->id, 404);

        $repairPart->delete();

        $this->logTicketEvent(
            $repairTicket,
            'note',
            null,
            null,
            'Se eliminó un repuesto del ticket.',
            $request->user()?->id
        );

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Repuesto eliminado correctamente.',
        ]);
    }

    public function storeCost(Request $request, RepairTicket $repairTicket): RedirectResponse
    {
        $data = $request->validate([
            'type' => ['required', 'string', 'in:labour,transport,external_service,miscellaneous'],
            'amount' => ['required', 'numeric', 'min:0'],
            'supplier_id' => ['nullable', 'uuid', 'exists:suppliers,id'],
            'document_type' => ['nullable', 'string', 'in:factura,recibo_honorarios,boleta,ticket'],
            'document_number' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'incurred_at' => ['nullable', 'date'],
        ]);

        RepairCost::create([
            'repair_ticket_id' => $repairTicket->id,
            'type' => $data['type'],
            'amount' => $data['amount'],
            'supplier_id' => $data['supplier_id'] ?? null,
            'document_type' => $this->nullableString($data['document_type'] ?? null),
            'document_number' => $this->nullableString($data['document_number'] ?? null),
            'description' => $this->nullableString($data['description'] ?? null),
            'incurred_at' => $data['incurred_at'] ?? now(),
        ]);

        $this->logTicketEvent(
            $repairTicket,
            'note',
            null,
            null,
            'Se registró un costo en el ticket.',
            $request->user()?->id
        );

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Costo registrado correctamente.',
        ]);
    }

    public function destroyCost(Request $request, RepairTicket $repairTicket, RepairCost $repairCost): RedirectResponse
    {
        abort_unless($repairCost->repair_ticket_id === $repairTicket->id, 404);

        $repairCost->delete();

        $this->logTicketEvent(
            $repairTicket,
            'note',
            null,
            null,
            'Se eliminó un costo del ticket.',
            $request->user()?->id
        );

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Costo eliminado correctamente.',
        ]);
    }

    public function storeDocument(Request $request, RepairTicket $repairTicket): RedirectResponse
    {
        $data = $request->validate([
            'repair_cost_id' => ['nullable', 'uuid', 'exists:repair_costs,id'],
            'type' => ['required', 'string', 'in:invoice,receipt,fee_receipt,quote,report,evidence_photo,before_photo,after_photo,warranty_doc,other'],
            'issuer_type' => ['nullable', 'string', 'in:company,supplier,technician,other'],
            'document_number' => ['nullable', 'string', 'max:120'],
            'title' => ['nullable', 'string', 'max:200'],
            'issued_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:5120'],
        ]);

        if (! empty($data['repair_cost_id'])) {
            $cost = RepairCost::query()->find($data['repair_cost_id']);
            abort_unless($cost && $cost->repair_ticket_id === $repairTicket->id, 422, 'El costo seleccionado no pertenece a este ticket.');
        }

        $file = $request->file('file');
        abort_unless($file !== null, 422, 'Debe adjuntar un archivo.');

        $storedPath = $file->store("maintenance/repair-tickets/{$repairTicket->id}", 'public');

        MaintenanceDocument::create([
            'repair_ticket_id' => $repairTicket->id,
            'repair_cost_id' => $data['repair_cost_id'] ?? null,
            'type' => $data['type'],
            'issuer_type' => $this->nullableString($data['issuer_type'] ?? null),
            'document_number' => $this->nullableString($data['document_number'] ?? null),
            'title' => $this->nullableString($data['title'] ?? null),
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $storedPath,
            'mime_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'issued_at' => $data['issued_at'] ?? null,
            'uploaded_by' => $request->user()?->id,
            'notes' => $this->nullableString($data['notes'] ?? null),
        ]);

        $this->logTicketEvent(
            $repairTicket,
            'note',
            null,
            null,
            'Se adjuntó un documento al ticket.',
            $request->user()?->id
        );

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Documento adjuntado correctamente.',
        ]);
    }

    public function destroyDocument(Request $request, RepairTicket $repairTicket, MaintenanceDocument $maintenanceDocument): RedirectResponse
    {
        abort_unless($maintenanceDocument->repair_ticket_id === $repairTicket->id, 404);

        if (Storage::disk('public')->exists($maintenanceDocument->file_path)) {
            Storage::disk('public')->delete($maintenanceDocument->file_path);
        }

        $maintenanceDocument->delete();

        $this->logTicketEvent(
            $repairTicket,
            'note',
            null,
            null,
            'Se eliminó un documento del ticket.',
            $request->user()?->id
        );

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Documento eliminado correctamente.',
        ]);
    }

    public function approve(Request $request, RepairTicket $repairTicket): RedirectResponse
    {
        if ($repairTicket->status !== 'pending_approval') {
            abort(422, 'Solo se puede aprobar un ticket pendiente de aprobación.');
        }

        $comment = $this->nullableString($request->input('comment', 'Ticket aprobado.'));

        $fromStatus = $repairTicket->status;

        $repairTicket->update([
            'status' => 'approved',
            'approved_by' => $request->user()?->id,
            'approved_at' => now(),
            'rejected_by' => null,
            'rejected_at' => null,
            'rejection_reason' => null,
            'cancelled_by' => null,
            'cancelled_at' => null,
            'cancellation_reason' => null,
        ]);

        // Al aprobar el ticket, poner el bien en reparación
        $repairTicket->loadMissing('asset', 'component');
        if ($repairTicket->asset) {
            $repairTicket->asset->update(['status' => 'in_repair']);
        } elseif ($repairTicket->component) {
            $repairTicket->component->update(['status' => 'in_repair']);
        }

        $this->logTicketEvent(
            $repairTicket,
            'approval',
            $fromStatus,
            'approved',
            $comment,
            $request->user()?->id
        );

        // Notificar al creador y al técnico responsable
        if ($repairTicket->opened_by || $repairTicket->technician_id) {
            \App\Jobs\SendRepairTicketApprovedEmailJob::dispatch($repairTicket->id);
        }

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Ticket aprobado correctamente.',
        ]);
    }

    public function cancel(Request $request, RepairTicket $repairTicket): RedirectResponse
    {
        $reason = $this->cleanString($request->input('reason', ''));

        if ($reason === '') {
            abort(422, 'Debe indicar el motivo.');
        }

        if ($repairTicket->status === 'pending_approval') {
            $fromStatus = $repairTicket->status;

            $repairTicket->update([
                'status' => 'rejected',
                'rejected_by' => $request->user()?->id,
                'rejected_at' => now(),
                'rejection_reason' => $reason,
            ]);

            $this->logTicketEvent(
                $repairTicket,
                'cancellation',
                $fromStatus,
                'rejected',
                $reason,
                $request->user()?->id
            );

            \App\Jobs\SendRepairTicketStatusChangedEmailJob::dispatch($repairTicket->id, 'rejected', $reason);

            return redirect()->back()->with('toast', [
                'type' => 'success',
                'message' => 'Ticket rechazado correctamente.',
            ]);
        }

        $fromStatus = $repairTicket->status;

        $repairTicket->update([
            'status' => 'cancelled',
            'cancelled_by' => $request->user()?->id,
            'cancelled_at' => now(),
            'cancellation_reason' => $reason,
        ]);

        $this->logTicketEvent(
            $repairTicket,
            'cancellation',
            $fromStatus,
            'cancelled',
            $reason,
            $request->user()?->id
        );

        \App\Jobs\SendRepairTicketStatusChangedEmailJob::dispatch($repairTicket->id, 'cancelled', $reason);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Ticket cancelado correctamente.',
        ]);
    }

    public function markDiagnosed(Request $request, RepairTicket $repairTicket): RedirectResponse
    {
        if (! in_array($repairTicket->status, ['approved', 'in_progress'], true)) {
            abort(422, 'Solo se puede marcar como diagnosticado un ticket aprobado o en proceso.');
        }

        $fromStatus = $repairTicket->status;
        $commentText = $this->cleanString($request->input('comment', ''));
        $comment = $commentText !== '' ? $commentText : $this->nullableString('Ticket marcado como diagnosticado.');

        $repairTicket->update([
            'status' => 'diagnosed',
            'diagnosed_at' => $repairTicket->diagnosed_at ?? now(),
            'diagnosis' => $commentText !== '' ? $commentText : $repairTicket->diagnosis,
        ]);

        $this->logTicketEvent(
            $repairTicket,
            'status_change',
            $fromStatus,
            'diagnosed',
            $comment,
            $request->user()?->id
        );

        \App\Jobs\SendRepairTicketStatusChangedEmailJob::dispatch($repairTicket->id, 'diagnosed', $comment);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Ticket marcado como diagnosticado.',
        ]);
    }

    public function markInProgress(Request $request, RepairTicket $repairTicket): RedirectResponse
    {
        if (! in_array($repairTicket->status, ['approved', 'diagnosed'], true)) {
            abort(422, 'Solo se puede poner en proceso un ticket aprobado o diagnosticado.');
        }

        $fromStatus = $repairTicket->status;
        $commentText = $this->cleanString($request->input('comment', ''));
        $comment = $commentText !== '' ? $commentText : $this->nullableString('Ticket en proceso de reparación.');

        $repairTicket->update([
            'status' => 'in_progress',
            'started_at' => $repairTicket->started_at ?? now(),
            'solution' => $commentText !== '' ? $commentText : $repairTicket->solution,
        ]);

        $this->logTicketEvent(
            $repairTicket,
            'status_change',
            $fromStatus,
            'in_progress',
            $comment,
            $request->user()?->id
        );

        \App\Jobs\SendRepairTicketStatusChangedEmailJob::dispatch($repairTicket->id, 'in_progress', $comment);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Ticket puesto en proceso.',
        ]);
    }

    public function markCompleted(Request $request, RepairTicket $repairTicket): RedirectResponse
    {
        if ($repairTicket->status !== 'in_progress') {
            abort(422, 'Solo se puede completar un ticket que está en proceso.');
        }

        $fromStatus = $repairTicket->status;
        $comment = $this->nullableString($request->input('comment', 'Ticket completado.'));
        $finalStatus = $this->cleanString($request->input('final_status', ''));
        $conditionOut = $this->cleanString($request->input('condition_out', ''));

        if ($finalStatus !== '' && ! in_array($finalStatus, ['stored', 'active', 'in_repair', 'in_transit', 'broken', 'disposed', 'sold'], true)) {
            abort(422, 'Estado final del bien no válido.');
        }

        $validConditions = ['new', 'good', 'regular', 'damaged', 'obsolete'];
        if ($conditionOut !== '' && ! in_array($conditionOut, $validConditions, true)) {
            abort(422, 'Condición de salida no válida.');
        }

        $repairTicket->update([
            'status' => 'completed',
            'completed_at' => $repairTicket->completed_at ?? now(),
            'condition_out' => $conditionOut !== '' ? $conditionOut : null,
        ]);

        // Actualizar estado final del bien si se indicó
        if ($finalStatus !== '') {
            $repairTicket->loadMissing('asset', 'component');
            if ($repairTicket->asset) {
                $repairTicket->asset->update(['status' => $finalStatus]);
            } elseif ($repairTicket->component) {
                $repairTicket->component->update(['status' => $finalStatus]);
            }
        }

        $this->logTicketEvent(
            $repairTicket,
            'status_change',
            $fromStatus,
            'completed',
            $comment,
            $request->user()?->id
        );

        \App\Jobs\SendRepairTicketStatusChangedEmailJob::dispatch($repairTicket->id, 'completed', $comment);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Ticket marcado como completado.',
        ]);
    }

    public function destroy(RepairTicket $repairTicket): RedirectResponse
    {
        $repairTicket->delete();

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Ticket eliminado correctamente.',
        ]);
    }

    private function applyIndexFilters(Builder $query, string $q, string $status, string $priority, string $maintenanceMode, string $dateFrom, string $dateTo, string $zonalId, string $officeId, string $warehouseId): void
    {
        if ($q !== '') {
            $term = '%'.mb_strtolower($q).'%';
            $query->where(function ($qb) use ($term) {
                $qb->whereRaw('LOWER(code) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(issue_description) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(external_reference, \'\')) LIKE ?', [$term])
                    ->orWhereHas('asset', fn ($assetQuery) => $assetQuery
                        ->whereRaw('LOWER(code) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(COALESCE(serial_number, \'\')) LIKE ?', [$term]))
                    ->orWhereHas('component', fn ($componentQuery) => $componentQuery
                        ->whereRaw('LOWER(code) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(COALESCE(serial_number, \'\')) LIKE ?', [$term]))
                    ->orWhereHas('repairShop', fn ($shopQuery) => $shopQuery->whereRaw('LOWER(name) LIKE ?', [$term]))
                    ->orWhereHas('technician', fn ($userQuery) => $userQuery
                        ->whereRaw('LOWER(COALESCE(name, \'\')) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(COALESCE(last_name, \'\')) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(COALESCE(usuario, \'\')) LIKE ?', [$term]));
            });
        }

        if ($status !== '') {
            $query->where('status', $status);
        }

        if ($priority !== '') {
            $query->where('priority', $priority);
        }

        if ($maintenanceMode !== '') {
            $query->where('maintenance_mode', $maintenanceMode);
        }

        if ($dateFrom !== '') {
            $query->whereDate('reported_at', '>=', $dateFrom);
        }

        if ($dateTo !== '') {
            $query->whereDate('reported_at', '<=', $dateTo);
        }

        if ($warehouseId !== '') {
            $query->where('warehouse_id', $warehouseId);
        } elseif ($officeId !== '') {
            $query->whereHas('warehouse.office', function (Builder $officeQuery) use ($officeId) {
                $officeQuery->where('id', $officeId);
            });
        } elseif ($zonalId !== '') {
            $query->whereHas('warehouse.office', function (Builder $officeQuery) use ($zonalId) {
                $officeQuery->where('zonal_id', $zonalId);
            });
        }
    }

    private function ticketIndexRelations(): array
    {
        return [
            'asset:id,code,serial_number,status,category_id,model_id',
            'asset.category:id,name,code,type',
            'asset.model:id,name,brand_id',
            'asset.model.brand:id,name',
            'asset.warehouse:id,name,code,office_id',
            'asset.warehouse.office:id,name,code,zonal_id',
            'asset.warehouse.office.zonal:id,name,code',
            'component.warehouse:id,name,code,office_id',
            'component.warehouse.office:id,name,code,zonal_id',
            'component.warehouse.office.zonal:id,name,code',
            'warehouse:id,name,code,office_id',
            'warehouse.office:id,name,code,zonal_id',
            'warehouse.office.zonal:id,name,code',
            'component:id,code,serial_number,status,type_id,brand_id,model',
            'component.type:id,name,code',
            'component.brand:id,name',
            'repairShop:id,name',
            'openedByUser:id,name,last_name,usuario',
            'technician:id,name,last_name,usuario',
            'approvedByUser:id,name,last_name,usuario',
            'rejectedByUser:id,name,last_name,usuario',
            'cancelledByUser:id,name,last_name,usuario',
        ];
    }

    private function ticketConfigRelations(): array
    {
        return array_merge($this->ticketIndexRelations(), [
            'asset.warehouse.office.zonal',
            'component.warehouse.office.zonal',
        ]);
    }

    private function ticketFormPayload(): array
    {
        $assetsForSelect = Asset::query()
            ->with(['category:id,name,code,type', 'model:id,name,brand_id', 'model.brand:id,name'])
            ->whereNotIn('status', ['disposed', 'sold'])
            ->orderBy('code')
            ->get(['id', 'code', 'serial_number', 'category_id', 'model_id']);

        $componentsForSelect = Component::query()
            ->with(['type:id,name,code', 'brand:id,name'])
            ->where('status', '<>', 'disposed')
            ->orderBy('code')
            ->get(['id', 'code', 'serial_number', 'type_id', 'brand_id', 'model']);

        $repairShopsForSelect = RepairShop::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        $usersForSelect = User::query()
            ->where('is_active', true)
            ->assignable()
            ->orderBy('name')
            ->with('zonals:id,name,code')
            ->get(['id', 'name', 'last_name', 'usuario']);

        $suppliersForSelect = Supplier::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'ruc']);

        $zonalsForSelect = Zonal::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        $officesForSelect = Office::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'zonal_id']);

        $warehousesForSelect = Warehouse::query()
            ->where('is_active', true)
            ->with('office:id,name,code,zonal_id')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'office_id']);

        return [
            'assetsForSelect' => $assetsForSelect,
            'componentsForSelect' => $componentsForSelect,
            'repairShopsForSelect' => $repairShopsForSelect,
            'usersForSelect' => $usersForSelect,
            'suppliersForSelect' => $suppliersForSelect,
            'zonalsForSelect' => $zonalsForSelect,
            'officesForSelect' => $officesForSelect,
            'warehousesForSelect' => $warehousesForSelect,
        ];
    }

    private function logTicketEvent(
        RepairTicket $ticket,
        string $eventType,
        ?string $fromStatus,
        ?string $toStatus,
        ?string $comment,
        ?string $performedBy
    ): void {
        MaintenanceStatusLog::create([
            'repair_ticket_id' => $ticket->id,
            'event_type' => $eventType,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'comment' => $comment,
            'performed_by' => $performedBy,
        ]);
    }

    private function generateTicketCode(): string
    {
        $prefix = 'RT-';
        $lastCode = RepairTicket::withoutGlobalScope(AllowedZonalsScope::class)
            ->withTrashed()
            ->where('code', 'like', $prefix.'%')
            ->max('code');

        $next = 1;
        if ($lastCode !== null) {
            $parts = explode('-', $lastCode);
            $next = ((int) end($parts)) + 1;
        }

        return $prefix.str_pad((string) $next, 5, '0', STR_PAD_LEFT);
    }

    private function nullableString(mixed $value): ?string
    {
        $clean = $this->cleanString($value);

        return $clean === '' ? null : $clean;
    }

    private function cleanString(mixed $value): string
    {
        if ($value === null || $value === 'null') {
            return '';
        }

        return trim((string) $value);
    }
}
