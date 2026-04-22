<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Audit\StoreAgentTokenRequest;
use App\Models\AgentReport;
use App\Models\AgentToken;
use App\Models\AuditLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AuditController extends Controller
{
    private const AUDIT_ENTRY_PERMISSIONS = [
        'audit.view',
        'audit.logs.view',
        'audit.reports.view',
        'audit.tokens.manage',
    ];

    public function index(Request $request): Response
    {
        $user = $request->user();
        $canEnter = $user && collect(self::AUDIT_ENTRY_PERMISSIONS)->contains(fn (string $p): bool => $user->can($p));
        abort_unless($canEnter, 403);

        $canViewLogs = $user->can('audit.logs.view') || $user->can('audit.view');
        $canViewReports = $user->can('audit.reports.view') || $user->can('audit.view');
        $canManageTokens = $user->can('audit.tokens.manage');

        $allowedTabs = [];
        if ($canViewLogs) {
            $allowedTabs[] = 'logs';
        }
        if ($canViewReports) {
            $allowedTabs[] = 'reports';
        }
        if ($canManageTokens) {
            $allowedTabs[] = 'tokens';
        }

        $tab = (string) $request->input('tab', $allowedTabs[0] ?? 'logs');
        if (! in_array($tab, $allowedTabs, true)) {
            $tab = $allowedTabs[0] ?? 'logs';
        }

        [$logsSortBy, $logsSortOrder] = $this->listSort(
            $request,
            'logs',
            ['created_at', 'action', 'model_type'],
            'created_at',
            'desc'
        );
        [$reportsSortBy, $reportsSortOrder] = $this->listSort(
            $request,
            'reports',
            ['created_at', 'reported_at', 'asset'],
            'created_at',
            'desc'
        );
        [$tokensSortBy, $tokensSortOrder] = $this->listSort(
            $request,
            'tokens',
            ['created_at', 'name', 'expires_at'],
            'created_at',
            'desc'
        );

        $auditLogs = $canViewLogs
            ? $this->paginateAuditLogs($request, $logsSortBy, $logsSortOrder)
            : $this->emptyPaginator($request, 'logs_page');

        $agentReports = $canViewReports
            ? $this->paginateAgentReports($request, $reportsSortBy, $reportsSortOrder)
            : $this->emptyPaginator($request, 'reports_page');

        $agentTokens = $canManageTokens
            ? $this->paginateAgentTokens($request, $tokensSortBy, $tokensSortOrder)
            : $this->emptyPaginator($request, 'tokens_page');

        return Inertia::render('admin/audit/index', [
            'tab' => $tab,
            'canViewLogs' => $canViewLogs,
            'canViewReports' => $canViewReports,
            'canManageTokens' => $canManageTokens,
            'filters' => [
                'logs_sort_by' => $logsSortBy,
                'logs_sort_order' => $logsSortOrder,
                'reports_sort_by' => $reportsSortBy,
                'reports_sort_order' => $reportsSortOrder,
                'tokens_sort_by' => $tokensSortBy,
                'tokens_sort_order' => $tokensSortOrder,
            ],
            'auditLogs' => $auditLogs,
            'agentReports' => $agentReports,
            'agentTokens' => $agentTokens,
        ]);
    }

    public function storeAgentToken(StoreAgentTokenRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $ips = null;
        if (! empty($data['ip_whitelist'])) {
            $parts = preg_split('/[\s,;]+/', (string) $data['ip_whitelist'], -1, PREG_SPLIT_NO_EMPTY);
            $ips = array_values(array_unique(array_filter(array_map(
                static fn ($p) => trim((string) $p),
                $parts
            ))));
            if ($ips === []) {
                $ips = null;
            }
        }

        $secret = Str::random(48);

        $token = AgentToken::create([
            'name' => $data['name'] ?? null,
            'token_hash' => Hash::make($secret),
            'ip_whitelist' => $ips,
            'expires_at' => $data['expires_at'] ?? null,
        ]);

        $plain = $token->id.'|'.$secret;

        return back()
            ->with('toast', [
                'type' => 'success',
                'message' => 'Token creado. Formato: {id}|{secreto}. Cópielo ahora; no se volverá a mostrar.',
            ])
            ->with('created_agent_token', $plain);
    }

    public function destroyAgentToken(Request $request, AgentToken $agentToken): RedirectResponse
    {
        abort_unless($request->user()?->can('audit.tokens.manage'), 403);

        $agentToken->delete();

        return back()->with('toast', ['type' => 'success', 'message' => 'Token revocado correctamente.']);
    }

    private function paginateAuditLogs(Request $request, string $sortBy, string $sortOrder): LengthAwarePaginator
    {
        $query = AuditLog::query()->with('user:id,name,usuario');

        if ($sortBy === 'model_type') {
            $query->orderBy('audit_logs.model_type', $sortOrder);
        } else {
            $query->orderBy('audit_logs.'.$sortBy, $sortOrder);
        }

        return $query
            ->paginate(15, ['*'], 'logs_page')
            ->withQueryString()
            ->through(static function (AuditLog $log): array {
                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'model_type' => $log->model_type,
                    'model_type_short' => class_basename($log->model_type),
                    'model_id' => $log->model_id,
                    'user_display' => $log->user
                        ? trim(($log->user->name ?? '').' ('.($log->user->usuario ?? '').')')
                        : '—',
                    'ip_address' => $log->ip_address,
                    'created_at' => $log->created_at?->toIso8601String(),
                    'old_values_preview' => $log->old_values
                        ? Str::limit(json_encode($log->old_values, JSON_UNESCAPED_UNICODE), 200)
                        : null,
                    'new_values_preview' => $log->new_values
                        ? Str::limit(json_encode($log->new_values, JSON_UNESCAPED_UNICODE), 200)
                        : null,
                ];
            });
    }

    private function paginateAgentReports(Request $request, string $sortBy, string $sortOrder): LengthAwarePaginator
    {
        $query = AgentReport::query()->with('asset:id,code');

        match ($sortBy) {
            'asset' => $query
                ->leftJoin('assets as ar_asset_sort', 'agent_reports.asset_id', '=', 'ar_asset_sort.id')
                ->orderBy('ar_asset_sort.code', $sortOrder)
                ->select('agent_reports.*'),
            default => $query->orderBy('agent_reports.'.$sortBy, $sortOrder),
        };

        return $query
            ->paginate(15, ['*'], 'reports_page')
            ->withQueryString()
            ->through(static function (AgentReport $report): array {
                return [
                    'id' => $report->id,
                    'asset_id' => $report->asset_id,
                    'asset_code' => $report->asset?->code ?? '—',
                    'reported_at' => $report->reported_at?->toIso8601String(),
                    'created_at' => $report->created_at?->toIso8601String(),
                    'is_full_snapshot' => (bool) $report->is_full_snapshot,
                    'payload_preview' => Str::limit(
                        json_encode($report->payload ?? [], JSON_UNESCAPED_UNICODE),
                        240
                    ),
                ];
            });
    }

    private function paginateAgentTokens(Request $request, string $sortBy, string $sortOrder): LengthAwarePaginator
    {
        return AgentToken::query()
            ->orderBy('agent_tokens.'.$sortBy, $sortOrder)
            ->paginate(15, ['*'], 'tokens_page')
            ->withQueryString()
            ->through(static function (AgentToken $token): array {
                $list = $token->ip_whitelist;

                return [
                    'id' => $token->id,
                    'name' => $token->name,
                    'expires_at' => $token->expires_at?->toIso8601String(),
                    'last_used_at' => $token->last_used_at?->toIso8601String(),
                    'created_at' => $token->created_at?->toIso8601String(),
                    'ip_whitelist_count' => is_array($list) ? count($list) : 0,
                    'is_expired' => $token->isExpired(),
                ];
            });
    }

    private function emptyPaginator(Request $request, string $pageName): LengthAwarePaginator
    {
        return new LengthAwarePaginator([], 0, 15, 1, [
            'path' => $request->url(),
            'pageName' => $pageName,
            'query' => $request->query(),
        ]);
    }

    /**
     * @param  array<int, string>  $allowed
     * @return array{0: string, 1: string}
     */
    private function listSort(Request $request, string $listKey, array $allowed, string $defaultColumn, string $defaultOrder): array
    {
        $by = (string) $request->input("{$listKey}_sort_by", $defaultColumn);
        if (! in_array($by, $allowed, true)) {
            $by = $defaultColumn;
        }
        $orderInput = (string) $request->input("{$listKey}_sort_order", $defaultOrder);
        $order = strtolower($orderInput) === 'desc' ? 'desc' : 'asc';

        return [$by, $order];
    }
}
