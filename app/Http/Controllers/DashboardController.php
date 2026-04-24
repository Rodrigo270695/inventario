<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\AssetDisposal;
use App\Models\AssetTransfer;
use App\Models\Component;
use App\Models\InventoryCount;
use App\Models\Invoice;
use App\Models\PurchaseOrder;
use App\Models\RepairTicket;
use App\Models\Service;
use App\Models\StockEntry;
use App\Models\User;
use App\Support\UserGeographicAccess;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /** @var array<string, string> */
    private const CONDITION_LABELS = [
        'new' => 'Nuevo',
        'good' => 'Bueno',
        'regular' => 'Regular',
        'damaged' => 'Dañado',
        'obsolete' => 'Obsoleto',
        'broken' => 'Malogrado',
        'in_repair' => 'En reparación',
        'pending_disposal' => 'Con baja pendiente',
    ];

    /** Valores legacy o en español → clave canónica (alineado con `resources/js/constants/conditions.ts`). */
    private const CONDITION_VALUE_ALIASES = [
        'nuevo' => 'new',
        'bueno' => 'good',
        'fair' => 'regular',
        'malo' => 'damaged',
        'bad' => 'damaged',
        'obsoleto' => 'obsolete',
        'malogrado' => 'broken',
        'en_reparacion' => 'in_repair',
        'en reparación' => 'in_repair',
        'baja_pendiente' => 'pending_disposal',
    ];

    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        [$allowedOfficeIds, $allowedZonalIds] = UserGeographicAccess::forUser($user);

        $scopeHint = $this->scopeHint($user, $allowedOfficeIds, $allowedZonalIds);

        $modules = [];

        if ($user->can('assets.view')) {
            $modules['assets'] = $this->moduleAssets(Asset::query());
        }

        if ($user->can('components.view')) {
            $modules['components'] = $this->moduleComponents(Component::query());
        }

        if ($user->can('purchase_orders.view')) {
            $modules['purchase_orders'] = $this->modulePurchaseOrders(PurchaseOrder::query());
        }

        if ($user->can('services.view')) {
            $q = Service::query();
            $this->applyServiceGeographicScope($q, $allowedOfficeIds, $allowedZonalIds);
            $modules['services'] = $this->moduleServices($q);
        }

        if ($user->can('asset_transfers.view')) {
            $modules['asset_transfers'] = $this->moduleAssetTransfers(AssetTransfer::query());
        }

        if ($user->can('inventory_counts.view')) {
            $q = InventoryCount::query();
            $this->applyWarehouseOfficeScope($q, 'warehouse', $allowedOfficeIds, $allowedZonalIds);
            $modules['inventory_counts'] = $this->moduleInventoryCounts($q);
        }

        if ($user->can('repair_tickets.view')) {
            $modules['repair_tickets'] = $this->moduleRepairTickets(RepairTicket::query());
        }

        if ($user->can('stock_entries.view')) {
            $modules['stock_entries'] = $this->moduleStockEntries(StockEntry::query());
        }

        if ($user->can('invoices.view')) {
            $modules['invoices'] = $this->moduleInvoices(Invoice::query());
        }

        if ($user->can('asset_disposals.view')) {
            $q = AssetDisposal::query();
            $this->applyDisposalGeographicScope($q, $allowedOfficeIds, $allowedZonalIds);
            $modules['asset_disposals'] = $this->moduleAssetDisposals($q);
        }

        return Inertia::render('dashboard', [
            'userDisplayName' => trim($user->name.' '.$user->last_name) ?: $user->usuario,
            'scopeHint' => $scopeHint,
            'modules' => $modules,
        ]);
    }

    /**
     * @param  array<string, string>  $statusLabels
     * @return list<array{key: string, label: string, count: int}>
     */
    private function topStatusRows(Builder $baseQuery, string $statusColumn, array $statusLabels, int $limit = 8, ?string $mergeBlankInto = null, bool $normalizeConditionAliases = false): array
    {
        $counts = $this->countsByStatusKey($baseQuery, $statusColumn, $mergeBlankInto, $normalizeConditionAliases);
        $rows = [];
        foreach ($statusLabels as $key => $label) {
            $rows[] = [
                'key' => (string) $key,
                'label' => $label,
                'count' => (int) ($counts[(string) $key] ?? 0),
            ];
        }
        foreach ($counts as $key => $count) {
            $k = (string) $key;
            if (array_key_exists($k, $statusLabels)) {
                continue;
            }
            if ((int) $count === 0) {
                continue;
            }
            $pretty = trim(str_replace('_', ' ', $k));
            $rows[] = [
                'key' => $k,
                'label' => $pretty !== '' ? ucfirst($pretty) : 'Sin estado',
                'count' => (int) $count,
            ];
        }
        usort($rows, fn (array $a, array $b) => $b['count'] <=> $a['count']);

        return array_slice($rows, 0, $limit);
    }

    /**
     * @return array<string, int>
     */
    private function countsByStatusKey(Builder $baseQuery, string $statusColumn, ?string $mergeBlankInto = null, bool $normalizeConditionAliases = false): array
    {
        $table = $baseQuery->getModel()->getTable();
        $statusCol = $table.'.'.$statusColumn;
        $alias = 'dashboard_status_key';

        $raw = (clone $baseQuery)
            ->selectRaw($statusCol.' as '.$alias.', count(*) as aggregate')
            ->groupBy($statusCol)
            ->pluck('aggregate', $alias)
            ->all();

        $out = [];
        foreach ($raw as $k => $v) {
            $sk = trim((string) $k);
            if ($mergeBlankInto !== null && ($sk === '' || strcasecmp($sk, 'null') === 0)) {
                $sk = $mergeBlankInto;
            }
            if ($normalizeConditionAliases) {
                $lower = mb_strtolower($sk, 'UTF-8');
                $sk = self::CONDITION_VALUE_ALIASES[$lower] ?? $sk;
            }
            $out[$sk] = ($out[$sk] ?? 0) + (int) $v;
        }

        return $out;
    }

    private function formatPen(float|string|int|null $amount): string
    {
        $n = is_numeric($amount) ? (float) $amount : 0.0;

        return 'S/ '.number_format($n, 2, ',', '.');
    }

    private function moduleAssets(Builder $q): array
    {
        $table = $q->getModel()->getTable();
        $total = (clone $q)->count();
        $bookExpr = "COALESCE({$table}.current_value, {$table}.acquisition_value, 0)";
        $book = (float) ((clone $q)->selectRaw("SUM({$bookExpr}) as dashboard_book_sum")->value('dashboard_book_sum') ?? 0);
        $inUse = (clone $q)->where($table.'.status', 'active')->count();
        $inRepair = (clone $q)->where($table.'.status', 'in_repair')->count();
        $stored = (clone $q)->where($table.'.status', 'stored')->count();
        $soon = (clone $q)
            ->whereNotNull($table.'.warranty_until')
            ->whereBetween($table.'.warranty_until', [Carbon::now()->startOfDay(), Carbon::now()->addDays(30)->endOfDay()])
            ->count();

        $statusLabels = [
            'stored' => 'Almacenado',
            'active' => 'En uso',
            'in_repair' => 'En reparación',
            'in_transit' => 'En tránsito',
            'broken' => 'Malogrado',
            'disposed' => 'Dado de baja',
            'sold' => 'Vendido',
        ];

        return [
            'title' => 'Activos',
            'subtitle' => 'Valor contable, estado operativo y condición física',
            'href' => '/admin/assets',
            'accent' => '#447794',
            'primary' => [
                'label' => 'Activos visibles',
                'value' => (string) $total,
            ],
            'kpis' => [
                ['label' => 'Valor en libros', 'value' => $this->formatPen($book), 'hint' => 'Suma de valor actual o de adquisición'],
                ['label' => 'En uso', 'value' => (string) $inUse],
                ['label' => 'En almacén', 'value' => (string) $stored],
                ['label' => 'Garantía ≤30 días', 'value' => (string) $soon, 'tone' => $soon > 0 ? 'rose' : 'default'],
            ],
            'statusRows' => $this->topStatusRows(clone $q, 'status', $statusLabels, 8, 'stored'),
            'chartHint' => 'Por estado operativo',
            'conditionRows' => $this->topStatusRows(clone $q, 'condition', self::CONDITION_LABELS, 8, 'new', true),
            'conditionChartHint' => 'Por condición física',
        ];
    }

    private function moduleComponents(Builder $q): array
    {
        $table = $q->getModel()->getTable();
        $total = (clone $q)->count();
        $active = (clone $q)->where($table.'.status', 'active')->count();
        $stored = (clone $q)->where($table.'.status', 'stored')->count();
        $inRepair = (clone $q)->where($table.'.status', 'in_repair')->count();
        $inTransit = (clone $q)->where($table.'.status', 'in_transit')->count();

        $statusLabels = [
            'stored' => 'Almacenado',
            'active' => 'En uso',
            'in_repair' => 'En reparación',
            'in_transit' => 'En tránsito',
            'broken' => 'Malogrado',
            'disposed' => 'Dado de baja',
        ];

        return [
            'title' => 'Componentes',
            'subtitle' => 'Stock, estado operativo y condición',
            'href' => '/admin/components',
            'accent' => '#2d5b75',
            'primary' => [
                'label' => 'Componentes visibles',
                'value' => (string) $total,
            ],
            'kpis' => [
                ['label' => 'En uso', 'value' => (string) $active],
                ['label' => 'Almacenados', 'value' => (string) $stored],
                ['label' => 'En reparación', 'value' => (string) $inRepair, 'tone' => $inRepair > 0 ? 'amber' : 'default'],
                ['label' => 'En tránsito', 'value' => (string) $inTransit],
            ],
            'statusRows' => $this->topStatusRows(clone $q, 'status', $statusLabels, 8, 'stored'),
            'chartHint' => 'Por estado operativo',
            'conditionRows' => $this->topStatusRows(clone $q, 'condition', self::CONDITION_LABELS, 8, 'new', true),
            'conditionChartHint' => 'Por condición física',
        ];
    }

    private function modulePurchaseOrders(Builder $q): array
    {
        $table = $q->getModel()->getTable();
        $total = (clone $q)->count();
        $approvedSum = (float) ((clone $q)->where($table.'.status', 'approved')->sum($table.'.total_amount') ?? 0);
        $pipelineStatuses = ['pending_minor', 'pending', 'observed_minor', 'observed'];
        $pipelineCount = (clone $q)->whereIn($table.'.status', $pipelineStatuses)->count();
        $pipelineSum = (float) ((clone $q)->whereIn($table.'.status', $pipelineStatuses)->sum($table.'.total_amount') ?? 0);
        $rejected = (clone $q)->where($table.'.status', 'rejected')->count();

        $statusLabels = [
            'pending_minor' => 'Pendiente zonal',
            'pending' => 'Pendiente general',
            'observed_minor' => 'Observado zonal',
            'observed' => 'Observado',
            'approved' => 'Aprobada',
            'rejected' => 'Rechazada',
        ];

        return [
            'title' => 'Órdenes de compra',
            'subtitle' => 'Montos aprobados y pipeline de aprobación',
            'href' => '/admin/purchase-orders',
            'accent' => '#0d9488',
            'primary' => [
                'label' => 'Órdenes visibles',
                'value' => (string) $total,
            ],
            'kpis' => [
                ['label' => 'Monto aprobado', 'value' => $this->formatPen($approvedSum)],
                ['label' => 'En aprobación', 'value' => (string) $pipelineCount, 'hint' => 'Pendientes u observadas'],
                ['label' => 'Monto en pipeline', 'value' => $this->formatPen($pipelineSum)],
                ['label' => 'Rechazadas', 'value' => (string) $rejected, 'tone' => $rejected > 0 ? 'rose' : 'default'],
            ],
            'statusRows' => $this->topStatusRows(clone $q, 'status', $statusLabels, 8),
            'chartHint' => 'OC por estado',
        ];
    }

    private function moduleServices(Builder $q): array
    {
        $table = $q->getModel()->getTable();
        $total = (clone $q)->count();
        $activeSum = (float) ((clone $q)->where($table.'.status', 'active')->sum($table.'.amount') ?? 0);
        $expired = (clone $q)->where($table.'.status', 'expired')->count();
        $about = (clone $q)->where($table.'.status', 'about_to_expire')->count();
        $draft = (clone $q)->where($table.'.status', 'draft')->count();

        $statusLabels = [
            'active' => 'Activo',
            'about_to_expire' => 'Por vencer',
            'expired' => 'Vencido',
            'cancelled' => 'Cancelado',
            'draft' => 'Borrador',
        ];

        return [
            'title' => 'Servicios',
            'subtitle' => 'Contratos, vigencia y montos activos',
            'href' => '/admin/services',
            'accent' => '#7c3aed',
            'primary' => [
                'label' => 'Servicios visibles',
                'value' => (string) $total,
            ],
            'kpis' => [
                ['label' => 'Monto activos', 'value' => $this->formatPen($activeSum)],
                ['label' => 'Por vencer', 'value' => (string) $about, 'tone' => $about > 0 ? 'amber' : 'default'],
                ['label' => 'Vencidos', 'value' => (string) $expired, 'tone' => $expired > 0 ? 'rose' : 'default'],
                ['label' => 'Borradores', 'value' => (string) $draft],
            ],
            'statusRows' => $this->topStatusRows(clone $q, 'status', $statusLabels, 8),
            'chartHint' => 'Servicios por estado',
        ];
    }

    private function moduleAssetTransfers(Builder $q): array
    {
        $table = $q->getModel()->getTable();
        $total = (clone $q)->count();
        $pending = (clone $q)->where($table.'.status', 'pending_approval')->count();
        $inTransit = (clone $q)->where($table.'.status', 'in_transit')->count();
        $received30 = (clone $q)->where($table.'.status', 'received')
            ->where($table.'.received_at', '>=', Carbon::now()->subDays(30))
            ->count();

        $statusLabels = [
            'pending_approval' => 'Por aprobar',
            'approved' => 'Aprobado',
            'in_transit' => 'En tránsito',
            'received' => 'Recibido',
            'cancelled' => 'Cancelado',
        ];

        return [
            'title' => 'Traslados',
            'subtitle' => 'Aprobaciones y movimiento entre almacenes',
            'href' => '/admin/asset-transfers',
            'accent' => '#0369a1',
            'primary' => [
                'label' => 'Traslados visibles',
                'value' => (string) $total,
            ],
            'kpis' => [
                ['label' => 'Por aprobar', 'value' => (string) $pending, 'tone' => $pending > 0 ? 'amber' : 'default'],
                ['label' => 'En tránsito', 'value' => (string) $inTransit],
                ['label' => 'Recibidos (30 d.)', 'value' => (string) $received30, 'hint' => 'Últimos 30 días'],
            ],
            'statusRows' => $this->topStatusRows(clone $q, 'status', $statusLabels, 8),
            'chartHint' => 'Traslados por estado',
        ];
    }

    private function moduleInventoryCounts(Builder $q): array
    {
        $table = $q->getModel()->getTable();
        $total = (clone $q)->count();
        $open = (clone $q)->where($table.'.status', 'in_progress')->count();
        $reconciled = (clone $q)->where($table.'.status', 'reconciled')->count();
        $closed30 = (clone $q)->where($table.'.status', 'closed')
            ->where($table.'.updated_at', '>=', Carbon::now()->subDays(30))
            ->count();

        $statusLabels = [
            'in_progress' => 'En curso',
            'reconciled' => 'Reconciliado',
            'closed' => 'Cerrado',
        ];

        return [
            'title' => 'Inventario físico',
            'subtitle' => 'Conteos abiertos y cierres recientes',
            'href' => '/admin/inventory-counts',
            'accent' => '#b45309',
            'primary' => [
                'label' => 'Conteos visibles',
                'value' => (string) $total,
            ],
            'kpis' => [
                ['label' => 'En curso', 'value' => (string) $open, 'tone' => $open > 0 ? 'amber' : 'default'],
                ['label' => 'Reconciliados', 'value' => (string) $reconciled],
                ['label' => 'Cerrados (30 d.)', 'value' => (string) $closed30],
            ],
            'statusRows' => $this->topStatusRows(clone $q, 'status', $statusLabels, 8),
            'chartHint' => 'Conteos por estado',
        ];
    }

    private function moduleRepairTickets(Builder $q): array
    {
        $table = $q->getModel()->getTable();
        $total = (clone $q)->count();
        $openStatuses = ['pending_approval', 'approved', 'diagnosed', 'in_progress'];
        $open = (clone $q)->whereIn($table.'.status', $openStatuses)->count();
        $inProgress = (clone $q)->where($table.'.status', 'in_progress')->count();
        $budgetOpen = (float) ((clone $q)->whereIn($table.'.status', $openStatuses)->sum($table.'.estimated_cost') ?? 0);
        $done30 = (clone $q)->where($table.'.status', 'completed')
            ->where($table.'.completed_at', '>=', Carbon::now()->subDays(30))
            ->count();

        $statusLabels = [
            'pending_approval' => 'Por aprobar',
            'approved' => 'Aprobado',
            'rejected' => 'Rechazado',
            'diagnosed' => 'Diagnosticado',
            'in_progress' => 'En curso',
            'completed' => 'Completado',
            'cancelled' => 'Cancelado',
        ];

        return [
            'title' => 'Tickets de reparación',
            'subtitle' => 'Carga de trabajo y costos estimados',
            'href' => '/admin/repair-tickets',
            'accent' => '#c2410c',
            'primary' => [
                'label' => 'Tickets visibles',
                'value' => (string) $total,
            ],
            'kpis' => [
                ['label' => 'En taller (abiertos)', 'value' => (string) $open, 'hint' => 'Sin completar ni cancelar'],
                ['label' => 'En curso', 'value' => (string) $inProgress, 'tone' => $inProgress > 0 ? 'amber' : 'default'],
                ['label' => 'Costo est. abierto', 'value' => $this->formatPen($budgetOpen)],
                ['label' => 'Completados (30 d.)', 'value' => (string) $done30],
            ],
            'statusRows' => $this->topStatusRows(clone $q, 'status', $statusLabels, 8),
            'chartHint' => 'Tickets por estado',
        ];
    }

    private function moduleStockEntries(Builder $q): array
    {
        $table = $q->getModel()->getTable();
        $total = (clone $q)->count();
        $draft = (clone $q)->where($table.'.status', 'draft')->count();
        $completed = (clone $q)->where($table.'.status', 'completed')->count();
        $completed90 = (clone $q)->where($table.'.status', 'completed')
            ->where($table.'.entry_date', '>=', Carbon::now()->subDays(90)->toDateString())
            ->count();

        $statusLabels = [
            'draft' => 'Borrador',
            'completed' => 'Completado',
        ];

        return [
            'title' => 'Ingresos de almacén',
            'subtitle' => 'Borradores vs confirmados y ritmo reciente',
            'href' => '/admin/stock-entries',
            'accent' => '#15803d',
            'primary' => [
                'label' => 'Ingresos visibles',
                'value' => (string) $total,
            ],
            'kpis' => [
                ['label' => 'Borradores', 'value' => (string) $draft, 'tone' => $draft > 0 ? 'amber' : 'default'],
                ['label' => 'Completados', 'value' => (string) $completed],
                ['label' => 'Completados (90 d.)', 'value' => (string) $completed90, 'hint' => 'Por fecha de ingreso'],
            ],
            'statusRows' => $this->topStatusRows(clone $q, 'status', $statusLabels, 8),
            'chartHint' => 'Ingresos por estado',
        ];
    }

    private function moduleInvoices(Builder $q): array
    {
        $table = $q->getModel()->getTable();
        $total = (clone $q)->count();
        $openCount = (clone $q)->where($table.'.status', 'open')->count();
        $openSum = (float) ((clone $q)->where($table.'.status', 'open')->sum($table.'.amount') ?? 0);
        $closedSum = (float) ((clone $q)->where($table.'.status', 'closed')->sum($table.'.amount') ?? 0);

        $statusLabels = [
            'open' => 'Abierta',
            'closed' => 'Cerrada',
        ];

        return [
            'title' => 'Facturas',
            'subtitle' => 'Montos abiertos vs cerrados',
            'href' => '/admin/invoices',
            'accent' => '#4338ca',
            'primary' => [
                'label' => 'Facturas visibles',
                'value' => (string) $total,
            ],
            'kpis' => [
                ['label' => 'Abiertas', 'value' => (string) $openCount, 'tone' => $openCount > 0 ? 'amber' : 'default'],
                ['label' => 'Monto abierto', 'value' => $this->formatPen($openSum)],
                ['label' => 'Monto cerrado (total)', 'value' => $this->formatPen($closedSum)],
            ],
            'statusRows' => $this->topStatusRows(clone $q, 'status', $statusLabels, 8),
            'chartHint' => 'Facturas por estado',
        ];
    }

    private function moduleAssetDisposals(Builder $q): array
    {
        $table = $q->getModel()->getTable();
        $total = (clone $q)->count();
        $requested = (clone $q)->where($table.'.status', 'requested')->count();
        $approved = (clone $q)->where($table.'.status', 'approved')->count();
        $rejected = (clone $q)->where($table.'.status', 'rejected')->count();

        $statusLabels = [
            'requested' => 'Solicitado',
            'approved' => 'Aprobado',
            'rejected' => 'Rechazado',
        ];

        return [
            'title' => 'Bajas y ventas',
            'subtitle' => 'Solicitudes y resolución',
            'href' => '/admin/asset-disposals',
            'accent' => '#991b1b',
            'primary' => [
                'label' => 'Registros visibles',
                'value' => (string) $total,
            ],
            'kpis' => [
                ['label' => 'Solicitadas', 'value' => (string) $requested, 'tone' => $requested > 0 ? 'amber' : 'default'],
                ['label' => 'Aprobadas', 'value' => (string) $approved],
                ['label' => 'Rechazadas', 'value' => (string) $rejected, 'tone' => $rejected > 0 ? 'rose' : 'default'],
            ],
            'statusRows' => $this->topStatusRows(clone $q, 'status', $statusLabels, 8),
            'chartHint' => 'Bajas por estado',
        ];
    }

    private function scopeHint(?User $user, ?array $allowedOfficeIds, ?array $allowedZonalIds): ?string
    {
        if (! $user instanceof User) {
            return null;
        }

        if ($user->hasRole('superadmin', 'web')) {
            return null;
        }

        if ($allowedOfficeIds === null && $allowedZonalIds === null) {
            return null;
        }

        if ($allowedOfficeIds === [] || $allowedZonalIds === []) {
            return 'Sin oficinas asignadas: las cifras pueden mostrar 0 hasta que se configure tu alcance.';
        }

        $n = count($allowedOfficeIds);

        return $n === 1
            ? '1 oficina en tu alcance'
            : sprintf('%d oficinas en tu alcance', $n);
    }

    /**
     * @param  array<int, string>|null  $allowedOfficeIds
     * @param  array<int, string>|null  $allowedZonalIds
     */
    private function applyServiceGeographicScope(Builder $query, ?array $allowedOfficeIds, ?array $allowedZonalIds): void
    {
        if ($allowedOfficeIds === null && $allowedZonalIds === null) {
            return;
        }

        if ($allowedOfficeIds === [] || $allowedZonalIds === []) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->whereHas('warehouse', fn (Builder $wq) => $wq->whereIn('office_id', $allowedOfficeIds));
    }

    /**
     * @param  array<int, string>|null  $allowedOfficeIds
     * @param  array<int, string>|null  $allowedZonalIds
     */
    private function applyWarehouseOfficeScope(
        Builder $query,
        string $warehouseRelation,
        ?array $allowedOfficeIds,
        ?array $allowedZonalIds,
    ): void {
        if ($allowedOfficeIds === null && $allowedZonalIds === null) {
            return;
        }

        if ($allowedOfficeIds === [] || $allowedZonalIds === []) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->whereHas($warehouseRelation, fn (Builder $wq) => $wq->whereIn('office_id', $allowedOfficeIds));
    }

    /**
     * @param  array<int, string>|null  $allowedOfficeIds
     * @param  array<int, string>|null  $allowedZonalIds
     */
    private function applyDisposalGeographicScope(Builder $query, ?array $allowedOfficeIds, ?array $allowedZonalIds): void
    {
        if ($allowedOfficeIds === null && $allowedZonalIds === null) {
            return;
        }

        if ($allowedOfficeIds === [] || $allowedZonalIds === []) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->whereHas('warehouse', fn (Builder $wq) => $wq->whereIn('office_id', $allowedOfficeIds));
    }
}
