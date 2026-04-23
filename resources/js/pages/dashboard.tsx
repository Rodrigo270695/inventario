import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    Boxes,
    ClipboardList,
    FileSpreadsheet,
    Layers,
    Package,
    Receipt,
    ShieldCheck,
    Truck,
    Wrench,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import { cn } from '@/lib/utils';

export type DashboardKpi = {
    label: string;
    value: string;
    hint?: string;
    tone?: 'default' | 'amber' | 'emerald' | 'rose';
};

export type DashboardStatusRow = {
    key: string;
    label: string;
    count: number;
};

export type DashboardModule = {
    title: string;
    subtitle: string;
    href: string;
    accent: string;
    primary: { label: string; value: string };
    kpis: DashboardKpi[];
    statusRows: DashboardStatusRow[];
    chartHint: string;
};

export type DashboardModules = Partial<{
    assets: DashboardModule;
    components: DashboardModule;
    purchase_orders: DashboardModule;
    services: DashboardModule;
    asset_transfers: DashboardModule;
    inventory_counts: DashboardModule;
    repair_tickets: DashboardModule;
    stock_entries: DashboardModule;
    invoices: DashboardModule;
    asset_disposals: DashboardModule;
}>;

type DashboardPageProps = {
    userDisplayName: string;
    scopeHint: string | null;
    modules: DashboardModules;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Panel de control',
        href: dashboard.url(),
    },
];

const MODULE_ORDER: (keyof DashboardModules)[] = [
    'assets',
    'components',
    'purchase_orders',
    'services',
    'asset_transfers',
    'inventory_counts',
    'repair_tickets',
    'stock_entries',
    'invoices',
    'asset_disposals',
];

const MODULE_ICONS: Record<keyof DashboardModules, typeof Boxes> = {
    assets: Boxes,
    components: Layers,
    purchase_orders: ClipboardList,
    services: ShieldCheck,
    asset_transfers: Truck,
    inventory_counts: Package,
    repair_tickets: Wrench,
    stock_entries: FileSpreadsheet,
    invoices: Receipt,
    asset_disposals: BarChart3,
};

const KPI_TONE: Record<NonNullable<DashboardKpi['tone']>, string> = {
    default: 'border-border/60 bg-muted/15',
    amber: 'border-amber-500/25 bg-amber-500/8',
    emerald: 'border-emerald-500/25 bg-emerald-500/8',
    rose: 'border-rose-500/25 bg-rose-500/8',
};

function StatusBarChart({ rows, accent }: { rows: DashboardStatusRow[]; accent: string }) {
    if (rows.length === 0) {
        return null;
    }

    const max = Math.max(1, ...rows.map((r) => r.count));
    const chartW = 300;
    const rowH = 26;
    const chartH = Math.max(100, rows.length * rowH + 36);

    return (
        <div className="w-full max-w-[320px] overflow-x-auto">
            <BarChart
                layout="vertical"
                width={chartW}
                height={chartH}
                data={rows}
                margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
                <XAxis type="number" domain={[0, max]} hide allowDecimals={false} />
                <YAxis
                    type="category"
                    dataKey="label"
                    width={108}
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                    interval={0}
                />
                <Tooltip
                    cursor={false}
                    contentStyle={{
                        borderRadius: 8,
                        border: '1px solid hsl(var(--border))',
                        fontSize: 12,
                    }}
                    formatter={(value: number | undefined) => [value ?? 0, 'Registros']}
                />
                <Bar
                    dataKey="count"
                    fill={accent}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={18}
                    opacity={0.88}
                    activeBar={false}
                />
            </BarChart>
        </div>
    );
}

function ModuleCard({ modKey, mod }: { modKey: keyof DashboardModules; mod: DashboardModule }) {
    const Icon = MODULE_ICONS[modKey];

    return (
        <article
            className={cn(
                'group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-shadow',
                'hover:border-inv-primary/25 hover:shadow-md dark:bg-card/60'
            )}
        >
            <div className="flex items-start justify-between gap-2 border-b border-border/50 bg-muted/20 px-4 py-3 dark:bg-muted/10">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white shadow-inner"
                        style={{ backgroundColor: mod.accent }}
                        aria-hidden
                    >
                        <Icon className="size-4 opacity-95" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">{mod.title}</h2>
                        <p className="text-muted-foreground line-clamp-2 text-[11px] leading-snug">{mod.subtitle}</p>
                    </div>
                </div>
                <Link
                    href={mod.href}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-[11px] font-medium text-inv-primary transition-colors hover:bg-inv-primary/10"
                >
                    Ver
                    <ArrowRight className="size-3.5" />
                </Link>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                    <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">{mod.primary.label}</p>
                    <p className="text-foreground text-3xl font-semibold tabular-nums tracking-tight">{mod.primary.value}</p>
                    <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                        Cifras según permisos y alcance geográfico.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {mod.kpis.map((k) => (
                        <div
                            key={k.label}
                            className={cn(
                                'rounded-xl border px-2.5 py-2',
                                KPI_TONE[k.tone ?? 'default']
                            )}
                        >
                            <p className="text-muted-foreground text-[10px] font-medium leading-tight">{k.label}</p>
                            <p className="text-foreground mt-0.5 text-sm font-semibold tabular-nums leading-tight">{k.value}</p>
                            {k.hint && <p className="text-muted-foreground mt-0.5 text-[10px] leading-snug">{k.hint}</p>}
                        </div>
                    ))}
                </div>

                {mod.statusRows.length > 0 && (
                    <div className="border-t border-border/40 pt-2">
                        <p className="text-muted-foreground mb-2 text-[11px] font-medium">{mod.chartHint}</p>
                        <StatusBarChart rows={mod.statusRows} accent={mod.accent} />
                    </div>
                )}
            </div>
        </article>
    );
}

export default function Dashboard() {
    const { props } = usePage<DashboardPageProps & Record<string, unknown>>();
    const modules = (props.modules ?? {}) as DashboardModules;

    const ordered = MODULE_ORDER.map((key) => (modules[key] ? { key, mod: modules[key]! } : null)).filter(Boolean) as {
        key: keyof DashboardModules;
        mod: DashboardModule;
    }[];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Panel de control" />

            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                {ordered.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 px-6 py-16 text-center">
                        <p className="text-foreground text-sm font-medium">No hay indicadores disponibles</p>
                        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-xs leading-relaxed">
                            Tu usuario no tiene permisos de vista (por ejemplo «Activos → Ver» u «Órdenes de compra → Ver»)
                            para ninguno de los módulos del panel. Solicita al administrador los accesos necesarios.
                        </p>
                    </div>
                ) : (
                    <section
                        aria-label="Indicadores por módulo"
                        className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3"
                    >
                        {ordered.map(({ key, mod }) => (
                            <ModuleCard key={key} modKey={key} mod={mod} />
                        ))}
                    </section>
                )}
            </div>
        </AppLayout>
    );
}
