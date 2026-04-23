import { Head, Link, router, usePage } from '@inertiajs/react';
import { ClipboardCheck, ListTodo, Pencil, Plus, Trash2, Wrench } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppModal } from '@/components/app-modal';
import { SearchableSelect, type SearchableSelectOption } from '@/components/searchable-select';
import type { DataTableColumn, SortOrder } from '@/components/data-table';
import { DataTable } from '@/components/data-table';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import type { ToastMessage } from '@/components/toast';
import { Toast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Mantenimiento', href: '#' },
    { title: 'Mant. preventivo', href: '/admin/preventive-maintenance' },
];

const TARGET_LABELS: Record<string, string> = {
    asset: 'Activo',
    component: 'Componente',
};

const FREQUENCY_LABELS: Record<string, string> = {
    monthly: 'Mensual',
    quarterly: 'Trimestral',
    biannual: 'Semestral',
    annual: 'Anual',
    custom: 'Personalizado',
};

const TASK_STATUS_LABELS: Record<string, string> = {
    scheduled: 'Programada',
    in_progress: 'En proceso',
    completed: 'Completada',
    skipped: 'Omitida',
    overdue: 'Vencida',
    cancelled: 'Cancelada',
};

const TASK_STATUS_BADGE: Record<string, string> = {
    scheduled: 'bg-sky-100 text-sky-800 dark:bg-sky-500/25 dark:text-sky-300',
    in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-300',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-300',
    skipped: 'bg-slate-200 text-slate-700 dark:bg-slate-500/30 dark:text-slate-300',
    overdue: 'bg-rose-100 text-rose-800 dark:bg-rose-500/25 dark:text-rose-300',
    cancelled: 'bg-slate-200 text-slate-600 dark:bg-slate-500/30 dark:text-slate-400',
};

const PRIORITY_LABELS: Record<string, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
};

type Plan = {
    id: string;
    name: string;
    target_type: string;
    frequency_type: string;
    frequency_days: number | null;
    is_active: boolean;
    description: string | null;
    subcategory?: { id: string; name: string; code: string } | null;
    component_type?: { id: string; name: string; code: string } | null;
    warehouse?: { id: string; name: string; code: string; office?: { name: string; zonal?: { name: string } } } | null;
};

type Task = {
    id: string;
    plan_id: string;
    asset_id: string | null;
    component_id: string | null;
    status: string;
    priority: string | null;
    scheduled_date: string;
    started_at: string | null;
    completed_at: string | null;
    technician_id: string | null;
    plan?: { id: string; name: string; frequency_type: string; frequency_days: number | null };
    asset?: { id: string; code: string; category?: { name: string }; model?: { name: string; brand?: { name: string } } } | null;
    component?: { id: string; code: string; type?: { name: string }; brand?: { name: string }; model?: string } | null;
    technician?: { id: string; name: string; last_name: string | null; usuario: string } | null;
};

type PlanOption = { id: string; name: string; target_type: string };
type SubcategoryOption = { id: string; name: string; code: string; category?: { name: string; type?: string } };
type ComponentTypeOption = { id: string; name: string; code: string };
type ZonalOption = { id: string; name: string; code: string };
type WarehouseOption = { id: string; name: string; code: string; office_id: string; office?: { name: string; zonal_id: string } };
type UserOption = { id: string; name: string; last_name: string | null; usuario: string };
type AssetOption = { id: string; code: string; serial_number: string | null; category_id: string | null; model_id: string | null };
type ComponentOption = { id: string; code: string; serial_number: string | null; type_id: string | null; brand_id: string | null; model: string | null };

type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    from: number | null;
    to: number | null;
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
};

type Props = {
    tab: string;
    plans: Paginated<Plan>;
    tasks: Paginated<Task>;
    subcategoriesForSelect: SubcategoryOption[];
    componentTypesForSelect: ComponentTypeOption[];
    officesForSelect: { id: string; name: string; code: string; zonal_id: string }[];
    warehousesForSelect: WarehouseOption[];
    plansForSelect: PlanOption[];
    assetsForSelect: AssetOption[];
    componentsForSelect: ComponentOption[];
    usersForSelect: UserOption[];
};

function buildUrl(params: { tab?: string; plans_page?: number; tasks_page?: number }) {
    const search = new URLSearchParams();
    if (params.tab) search.set('tab', params.tab);
    if (params.plans_page !== undefined) search.set('plans_page', String(params.plans_page));
    if (params.tasks_page !== undefined) search.set('tasks_page', String(params.tasks_page));
    return `/admin/preventive-maintenance?${search.toString()}`;
}

function userName(user: UserOption | null | undefined): string {
    if (!user) return '—';
    return [user.name, user.last_name].filter(Boolean).join(' ') || user.usuario || '—';
}

function planScopeLabel(plan: Plan): string {
    const parts: string[] = [];
    if (plan.warehouse?.name) {
        const office = plan.warehouse.office?.name;
        const zonal = plan.warehouse.office?.zonal?.name;
        if (zonal || office) parts.push([zonal, office].filter(Boolean).join(' / '));
        parts.push(plan.warehouse.name);
    }
    if (plan.subcategory?.name) parts.push(plan.subcategory.name);
    if (plan.component_type?.name) parts.push(plan.component_type.name);
    return parts.length ? parts.join(' · ') : '—';
}

function taskItemLabel(task: Task): string {
    if (task.asset) {
        return [
            task.asset.code,
            task.asset.category?.name,
            task.asset.model?.brand?.name,
            task.asset.model?.name,
        ].filter(Boolean).join(' · ');
    }
    if (task.component) {
        return [
            task.component.code,
            task.component.type?.name,
            task.component.brand?.name,
            task.component.model,
        ].filter(Boolean).join(' · ');
    }
    return '—';
}

function formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PreventiveMaintenanceIndex(props: Props) {
    const {
        tab: initialTab,
        plans,
        tasks,
        subcategoriesForSelect,
        componentTypesForSelect,
        officesForSelect,
        warehousesForSelect,
        plansForSelect,
        assetsForSelect,
        componentsForSelect,
        usersForSelect,
    } = props;

    const [tab, setTab] = useState(initialTab || 'plans');
    const [planModalOpen, setPlanModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [taskItemType, setTaskItemType] = useState<'asset' | 'component'>('asset');
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [deletePlan, setDeletePlan] = useState<Plan | null>(null);
    const [deleteTask, setDeleteTask] = useState<Task | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [planForm, setPlanForm] = useState({
        name: '',
        target_type: 'asset' as 'asset' | 'component',
        subcategory_id: '',
        component_type_id: '',
        warehouse_id: '',
        frequency_type: 'annual',
        frequency_days: '',
        default_priority: 'medium',
        estimated_cost: '',
        description: '',
        is_active: true,
    });

    const [taskForm, setTaskForm] = useState({
        plan_id: '',
        asset_id: '',
        component_id: '',
        scheduled_date: '',
        priority: 'medium',
        technician_id: '',
    });

    const { props: pageProps } = usePage();
    const auth = (pageProps as { auth?: { permissions?: string[] } }).auth;
    const permissions = auth?.permissions ?? [];
    const canViewPlans = permissions.includes('preventive_plans.view');
    const canCreatePlan = permissions.includes('preventive_plans.create');
    const canUpdatePlan = permissions.includes('preventive_plans.update');
    const canDeletePlan = permissions.includes('preventive_plans.delete');
    const canViewTasks = permissions.includes('preventive_tasks.view');
    const canCreateTask = permissions.includes('preventive_tasks.create');
    const canUpdateTask = permissions.includes('preventive_tasks.update');
    const canDeleteTask = permissions.includes('preventive_tasks.delete');

    const assetOptions: SearchableSelectOption[] = assetsForSelect.map((asset) => ({
        value: asset.id,
        label: asset.code,
        searchTerms: [asset.serial_number ?? ''],
    }));

    const componentOptions: SearchableSelectOption[] = componentsForSelect.map((component) => ({
        value: component.id,
        label: component.code,
        searchTerms: [component.serial_number ?? component.model ?? ''],
    }));

    const technicianOptions: SearchableSelectOption[] = usersForSelect.map((user) => ({
        value: user.id,
        label: userName(user),
        searchTerms: [user.usuario ?? ''],
    }));

    const warehouseOptions: SearchableSelectOption[] = warehousesForSelect
        .slice()
        .sort((a, b) => {
            const az = a.office?.zonal?.name ?? '';
            const bz = b.office?.zonal?.name ?? '';
            if (az !== bz) return az.localeCompare(bz);
            return a.name.localeCompare(b.name);
        })
        .map((w) => {
            const zonal = w.office?.zonal?.name ?? '';
            const office = w.office?.name ?? '';
            const path = [zonal, office, w.name].filter(Boolean).join(' / ');
            return {
                value: w.id,
                label: path || w.name,
                searchTerms: [w.code ?? '', w.name, office, zonal],
            };
        });

    const [plansSortBy, setPlansSortBy] = useState<string | undefined>();
    const [plansSortOrder, setPlansSortOrder] = useState<SortOrder>('asc');
    const [tasksSortBy, setTasksSortBy] = useState<string | undefined>();
    const [tasksSortOrder, setTasksSortOrder] = useState<SortOrder>('asc');

    const subcategoryOptions: SearchableSelectOption[] = subcategoriesForSelect
        .slice()
        .sort((a, b) => {
            const ac = a.category?.name ?? '';
            const bc = b.category?.name ?? '';
            if (ac !== bc) return ac.localeCompare(bc);
            return a.name.localeCompare(b.name);
        })
        .map((s) => {
            const categoryName = s.category?.name ?? '';
            const rawType = s.category?.type ?? '';
            const typeLabel =
                rawType === 'technology'
                    ? 'tecnológico'
                    : rawType === 'furniture'
                        ? 'mobiliario'
                        : rawType === 'vehicle'
                            ? 'vehicular'
                            : rawType === 'building'
                                ? 'inmueble'
                                : rawType === 'machinery'
                                    ? 'maquinaria'
                                    : rawType === 'other'
                                        ? 'otros'
                                        : rawType;
            const categoryWithType = categoryName
                ? typeLabel
                    ? `${categoryName} (${typeLabel})`
                    : categoryName
                : '';
            const label = categoryWithType ? `${categoryWithType} / ${s.name}` : s.name;
            return {
                value: s.id,
                label,
                searchTerms: [s.code ?? '', s.name, categoryName, typeLabel],
            };
        });

    const flash = pageProps.flash as { toast?: ToastMessage } | undefined;
    const [toastQueue, setToastQueue] = useState<Array<ToastMessage & { id: number }>>([]);
    const lastFlashRef = useRef<ToastMessage | null>(null);

    useEffect(() => {
        const t = flash?.toast;
        if (!t || t === lastFlashRef.current) return;
        lastFlashRef.current = t;
        setToastQueue((q) => [...q, { ...t, id: Date.now() }]);
    }, [flash?.toast]);

    useEffect(() => {
        setTab(initialTab || 'plans');
    }, [initialTab]);

    const goToTab = useCallback((newTab: string) => {
        setTab(newTab);
        router.get(buildUrl({ tab: newTab }), {}, { preserveState: true, preserveScroll: true });
    }, []);

    const openNewPlan = () => {
        setEditingPlan(null);
        setPlanForm({
            name: '',
            target_type: 'asset',
            subcategory_id: '',
            component_type_id: '',
            warehouse_id: '',
            frequency_type: 'annual',
            frequency_days: '',
            default_priority: 'medium',
            estimated_cost: '',
            description: '',
            is_active: true,
        });
        setPlanModalOpen(true);
    };

    const openEditPlan = (plan: Plan) => {
        setEditingPlan(plan);
        setPlanForm({
            name: plan.name,
            target_type: plan.target_type as 'asset' | 'component',
            subcategory_id: plan.subcategory?.id ?? '',
            component_type_id: plan.component_type?.id ?? '',
            warehouse_id: plan.warehouse?.id ?? '',
            frequency_type: plan.frequency_type,
            frequency_days: plan.frequency_days != null ? String(plan.frequency_days) : '',
            default_priority: (plan as Plan & { default_priority?: string }).default_priority ?? 'medium',
            estimated_cost: (plan as Plan & { estimated_cost?: number | null }).estimated_cost != null ? String((plan as Plan & { estimated_cost?: number }).estimated_cost) : '',
            description: plan.description ?? '',
            is_active: plan.is_active,
        });
        setPlanModalOpen(true);
    };

    const submitPlan = () => {
        if (!planForm.name.trim()) return;
        const payload = {
            name: planForm.name.trim(),
            target_type: planForm.target_type,
            category_id: planForm.category_id || null,
            subcategory_id: planForm.subcategory_id || null,
            component_type_id: planForm.component_type_id || null,
            warehouse_id: planForm.warehouse_id || null,
            zonal_id: planForm.zonal_id || null,
            frequency_type: planForm.frequency_type,
            frequency_days: planForm.frequency_type === 'custom' && planForm.frequency_days ? Number(planForm.frequency_days) : null,
            default_priority: planForm.default_priority,
            estimated_cost: planForm.estimated_cost ? Number(planForm.estimated_cost) : null,
            description: planForm.description.trim() || null,
            is_active: planForm.is_active,
        };
        if (editingPlan) {
            router.put(`/admin/preventive-maintenance/plans/${editingPlan.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setPlanModalOpen(false);
                    setEditingPlan(null);
                },
            });
        } else {
            router.post('/admin/preventive-maintenance/plans', payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setPlanModalOpen(false);
                },
            });
        }
    };

    const openNewTask = () => {
        setEditingTask(null);
        setTaskForm({
            plan_id: plansForSelect[0]?.id ?? '',
            asset_id: '',
            component_id: '',
            scheduled_date: new Date().toISOString().slice(0, 10),
            priority: 'medium',
            technician_id: '',
        });
        setTaskItemType('asset');
        setTaskModalOpen(true);
    };

    const submitTask = () => {
        if (!taskForm.plan_id || (!taskForm.asset_id && !taskForm.component_id)) return;
        if (taskForm.asset_id && taskForm.component_id) return;
        const payload = {
            plan_id: taskForm.plan_id,
            asset_id: taskForm.asset_id || null,
            component_id: taskForm.component_id || null,
            scheduled_date: taskForm.scheduled_date,
            priority: taskForm.priority,
            technician_id: taskForm.technician_id || null,
        };
        if (editingTask) {
            router.put(`/admin/preventive-maintenance/tasks/${editingTask.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setTaskModalOpen(false);
                    setEditingTask(null);
                },
            });
        } else {
            router.post('/admin/preventive-maintenance/tasks', payload, {
                preserveScroll: true,
                onSuccess: () => setTaskModalOpen(false),
            });
        }
    };

    const handleDeletePlan = () => {
        if (!deletePlan) return;
        setDeleting(true);
        router.delete(`/admin/preventive-maintenance/plans/${deletePlan.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeletePlan(null);
            },
        });
    };

    const handleDeleteTask = () => {
        if (!deleteTask) return;
        setDeleting(true);
        router.delete(`/admin/preventive-maintenance/tasks/${deleteTask.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteTask(null);
            },
        });
    };

    const planColumns: DataTableColumn<Plan>[] = [
        { key: 'name', label: 'Nombre', sortable: true, render: (row) => <span className="font-medium text-foreground">{row.name}</span> },
        { key: 'target_type', label: 'Tipo', sortable: true, render: (row) => TARGET_LABELS[row.target_type] ?? row.target_type },
        { key: 'frequency', label: 'Frecuencia', sortable: true, render: (row) => row.frequency_type === 'custom' && row.frequency_days ? `${row.frequency_days} días` : (FREQUENCY_LABELS[row.frequency_type] ?? row.frequency_type) },
        { key: 'scope', label: 'Alcance', sortable: false, className: 'max-w-[200px]', render: (row) => <span className="text-xs text-muted-foreground">{planScopeLabel(row)}</span> },
        { key: 'is_active', label: 'Activo', sortable: true, render: (row) => <span className={row.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>{row.is_active ? 'Sí' : 'No'}</span> },
        {
            key: 'actions',
            label: '',
            className: 'w-0 text-right',
            render: (row) => (
                <div className="flex flex-row flex-nowrap items-center justify-end gap-1">
                    {canUpdatePlan && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer shrink-0 size-8 rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
                            title="Editar plan"
                            onClick={() => openEditPlan(row)}
                        >
                            <Pencil className="size-4" />
                        </Button>
                    )}
                    {canDeletePlan && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer shrink-0 size-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400/80 dark:hover:bg-rose-900/20"
                            title="Eliminar plan"
                            onClick={() => setDeletePlan(row)}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    const taskColumns: DataTableColumn<Task>[] = [
        { key: 'plan', label: 'Plan', sortable: true, render: (row) => <span className="font-medium text-foreground">{row.plan?.name ?? '—'}</span> },
        { key: 'item', label: 'Bien', sortable: false, render: (row) => <span className="text-xs">{taskItemLabel(row)}</span> },
        { key: 'scheduled_date', label: 'Programada', sortable: true, render: (row) => formatDate(row.scheduled_date) },
        { key: 'status', label: 'Estado', sortable: true, render: (row) => <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium', TASK_STATUS_BADGE[row.status] ?? 'bg-slate-100 text-slate-600')}>{TASK_STATUS_LABELS[row.status] ?? row.status}</span> },
        { key: 'technician', label: 'Técnico', sortable: true, render: (row) => userName(row.technician) },
        {
            key: 'actions',
            label: '',
            className: 'w-0 text-right',
            render: (row) => (
                <div className="flex flex-row flex-nowrap items-center justify-end gap-1">
                    {canUpdateTask && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer shrink-0 size-8 rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
                            title="Editar tarea"
                            onClick={() => {
                                setEditingTask(row);
                                setTaskForm({
                                    plan_id: row.plan_id,
                                    asset_id: row.asset_id ?? '',
                                    component_id: row.component_id ?? '',
                                    scheduled_date: row.scheduled_date,
                                    priority: row.priority ?? 'medium',
                                    technician_id: row.technician_id ?? '',
                                });
                                setTaskItemType(row.asset_id ? 'asset' : 'component');
                                setTaskModalOpen(true);
                            }}
                        >
                            <Pencil className="size-4" />
                        </Button>
                    )}
                    {canDeleteTask && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer shrink-0 size-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400/80 dark:hover:bg-rose-900/20"
                            title="Eliminar tarea"
                            onClick={() => setDeleteTask(row)}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    const buildPlansPageUrl = (page: number) => buildUrl({ tab: 'plans', plans_page: page });
    const buildTasksPageUrl = (page: number) => buildUrl({ tab: 'tasks', tasks_page: page });

    const handlePlansSort = (key: string) => {
        setPlansSortBy((prevKey) => {
            const nextOrder: SortOrder =
                prevKey === key && plansSortOrder === 'asc' ? 'desc' : 'asc';
            setPlansSortOrder(nextOrder);
            return key;
        });
    };

    const handleTasksSort = (key: string) => {
        setTasksSortBy((prevKey) => {
            const nextOrder: SortOrder =
                prevKey === key && tasksSortOrder === 'asc' ? 'desc' : 'asc';
            setTasksSortOrder(nextOrder);
            return key;
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Mantenimiento preventivo" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                {toastQueue.length > 0 && (
                    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
                        {toastQueue.map((t) => (
                            <Toast key={t.id} toast={t} onDismiss={() => setToastQueue((q) => q.filter((item) => item.id !== t.id))} duration={3000} />
                        ))}
                    </div>
                )}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="relative inline-block pb-1 text-xl font-semibold text-foreground">
                            Mantenimiento preventivo
                            <span className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary" />
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Planes y tareas de mantenimiento preventivo para activos y componentes.
                        </p>
                    </div>
                </div>

                <div className="border-t border-border w-full shrink-0" aria-hidden />

                <div className="relative overflow-hidden rounded-2xl">
                    <div className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.12]" style={{ background: 'linear-gradient(135deg, #447794 0%, #2d5b75 40%, #123249 100%)' }} aria-hidden />
                    <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #447794 0%, transparent 70%)' }} aria-hidden />

                    <div className="relative border-b border-inv-primary/50 bg-inv-primary/25 dark:bg-inv-section/70 dark:border-inv-surface/60">
                        <nav className="flex gap-0.5 p-2 overflow-x-auto pb-3 flex-none" aria-label="Tabs">
                            <button
                                type="button"
                                onClick={() => goToTab('plans')}
                                className={cn('flex-none cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all sm:text-sm', tab === 'plans' ? 'bg-inv-primary text-white shadow-md ring-2 ring-inv-surface/30' : 'text-muted-foreground hover:bg-inv-primary/10 hover:text-inv-primary')}
                            >
                                <ListTodo className="hidden size-4 sm:inline-block" />
                                <span>Planes</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => goToTab('tasks')}
                                className={cn('flex-none cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all sm:text-sm', tab === 'tasks' ? 'bg-inv-primary text-white shadow-md ring-2 ring-inv-surface/30' : 'text-muted-foreground hover:bg-inv-primary/10 hover:text-inv-primary')}
                            >
                                <ClipboardCheck className="hidden size-4 sm:inline-block" />
                                <span>Tareas</span>
                            </button>
                        </nav>
                    </div>

                    <div className="relative rounded-b-2xl border border-t-0 border-border/80 bg-card shadow-sm">
                        {tab === 'plans' && (
                            <>
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
                                    <p className="text-sm text-muted-foreground">
                                        {plans.total} plan{plans.total !== 1 ? 'es' : ''} en total.
                                    </p>
                                    {canCreatePlan && (
                                        <Button type="button" className="cursor-pointer bg-inv-primary text-white hover:bg-inv-primary/90" onClick={openNewPlan}>
                                            <Plus className="size-4" />
                                            Nuevo plan
                                        </Button>
                                    )}
                                </div>

                                {/* Desktop table */}
                                <div className="hidden md:block">
                                    <div className="overflow-x-auto">
                                        <DataTable
                                            columns={planColumns}
                                            data={plans.data}
                                            keyExtractor={(row) => row.id}
                                            sortBy={plansSortBy}
                                            sortOrder={plansSortOrder}
                                            onSort={handlePlansSort}
                                            emptyMessage="No hay planes. Crea uno con «Nuevo plan»."
                                            variant="default"
                                        />
                                    </div>
                                </div>

                                {/* Mobile cards */}
                                <div className="md:hidden">
                                    {plans.data.length === 0 ? (
                                        <p className="py-6 px-4 text-center text-sm text-muted-foreground">
                                            No hay planes. Crea uno con «Nuevo plan».
                                        </p>
                                    ) : (
                                        <ul className="flex flex-col gap-3 p-3">
                                            {plans.data.map((plan) => (
                                                <li key={plan.id}>
                                                    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
                                                        <div className="space-y-1.5 p-4">
                                                            <p className="text-sm font-semibold text-foreground">
                                                                {plan.name}
                                                            </p>
                                                            <dl className="grid grid-cols-1 gap-1 text-xs">
                                                                <div className="flex flex-wrap gap-1">
                                                                    <dt className="mr-1 font-medium text-muted-foreground">
                                                                        Tipo:
                                                                    </dt>
                                                                    <dd>{TARGET_LABELS[plan.target_type] ?? plan.target_type}</dd>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1">
                                                                    <dt className="mr-1 font-medium text-muted-foreground">
                                                                        Frecuencia:
                                                                    </dt>
                                                                    <dd>
                                                                        {plan.frequency_type === 'custom' && plan.frequency_days
                                                                            ? `${plan.frequency_days} días`
                                                                            : FREQUENCY_LABELS[plan.frequency_type] ?? plan.frequency_type}
                                                                    </dd>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1">
                                                                    <dt className="mr-1 font-medium text-muted-foreground">
                                                                        Alcance:
                                                                    </dt>
                                                                    <dd className="text-foreground">
                                                                        {planScopeLabel(plan)}
                                                                    </dd>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1">
                                                                    <dt className="mr-1 font-medium text-muted-foreground">
                                                                        Activo:
                                                                    </dt>
                                                                    <dd className={plan.is_active ? 'text-emerald-600' : 'text-muted-foreground'}>
                                                                        {plan.is_active ? 'Sí' : 'No'}
                                                                    </dd>
                                                                </div>
                                                            </dl>
                                                        </div>
                                                        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/40 px-3 py-2">
                                                            {canUpdatePlan && (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="cursor-pointer border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
                                                                    title="Editar plan"
                                                                    onClick={() => openEditPlan(plan)}
                                                                >
                                                                    Editar
                                                                </Button>
                                                            )}
                                                            {canDeletePlan && (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="cursor-pointer border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                                                    title="Eliminar plan"
                                                                    onClick={() => setDeletePlan(plan)}
                                                                >
                                                                    Eliminar
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </article>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                {plans.last_page > 1 && (
                                    <div className="border-t border-border p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                                            <span>
                                                Mostrando {plans.from ?? 0} a {plans.to ?? 0} de {plans.total}
                                            </span>
                                            <div className="flex gap-2">
                                                {plans.current_page > 1 && (
                                                    <Link
                                                        href={buildPlansPageUrl(plans.current_page - 1)}
                                                        className="cursor-pointer text-inv-primary hover:underline"
                                                        preserveScroll
                                                    >
                                                        Anterior
                                                    </Link>
                                                )}
                                                {plans.current_page < plans.last_page && (
                                                    <Link
                                                        href={buildPlansPageUrl(plans.current_page + 1)}
                                                        className="cursor-pointer text-inv-primary hover:underline"
                                                        preserveScroll
                                                    >
                                                        Siguiente
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {tab === 'tasks' && (
                            <>
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
                                    <p className="text-sm text-muted-foreground">
                                        {tasks.total} tarea{tasks.total !== 1 ? 's' : ''} en total.
                                    </p>
                                    {canCreateTask && (
                                        <Button type="button" className="cursor-pointer bg-inv-primary text-white hover:bg-inv-primary/90" onClick={openNewTask}>
                                            <Plus className="size-4" />
                                            Nueva tarea
                                        </Button>
                                    )}
                                </div>

                                {/* Desktop table */}
                                <div className="hidden md:block">
                                    <div className="overflow-x-auto">
                                        <DataTable
                                            columns={taskColumns}
                                            data={tasks.data}
                                            keyExtractor={(row) => row.id}
                                            sortBy={tasksSortBy}
                                            sortOrder={tasksSortOrder}
                                            onSort={handleTasksSort}
                                            emptyMessage="No hay tareas. Crea una con «Nueva tarea»."
                                            variant="default"
                                        />
                                    </div>
                                </div>

                                {/* Mobile cards */}
                                <div className="md:hidden">
                                    {tasks.data.length === 0 ? (
                                        <p className="py-6 px-4 text-center text-sm text-muted-foreground">
                                            No hay tareas. Crea una con «Nueva tarea».
                                        </p>
                                    ) : (
                                        <ul className="flex flex-col gap-3 p-3">
                                            {tasks.data.map((task) => (
                                                <li key={task.id}>
                                                    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
                                                        <div className="space-y-1.5 p-4">
                                                            <p className="text-sm font-semibold text-foreground">
                                                                {task.plan?.name ?? 'Tarea preventiva'}
                                                            </p>
                                                            <dl className="grid grid-cols-1 gap-1 text-xs">
                                                                <div className="flex flex-wrap gap-1">
                                                                    <dt className="mr-1 font-medium text-muted-foreground">
                                                                        Bien:
                                                                    </dt>
                                                                    <dd>{taskItemLabel(task)}</dd>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1">
                                                                    <dt className="mr-1 font-medium text-muted-foreground">
                                                                        Programada:
                                                                    </dt>
                                                                    <dd>{formatDate(task.scheduled_date)}</dd>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1">
                                                                    <dt className="mr-1 font-medium text-muted-foreground">
                                                                        Estado:
                                                                    </dt>
                                                                    <dd>
                                                                        <span
                                                                            className={cn(
                                                                                'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                                                                                TASK_STATUS_BADGE[task.status] ??
                                                                                    'bg-slate-100 text-slate-600'
                                                                            )}
                                                                        >
                                                                            {TASK_STATUS_LABELS[task.status] ?? task.status}
                                                                        </span>
                                                                    </dd>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1">
                                                                    <dt className="mr-1 font-medium text-muted-foreground">
                                                                        Técnico:
                                                                    </dt>
                                                                    <dd>{userName(task.technician)}</dd>
                                                                </div>
                                                            </dl>
                                                        </div>
                                                        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/40 px-3 py-2">
                                                            {canUpdateTask && (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="cursor-pointer border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
                                                                    title="Editar tarea"
                                                                    onClick={() => {
                                                                        setEditingTask(task);
                                                                        setTaskForm({
                                                                            plan_id: task.plan_id,
                                                                            asset_id: task.asset_id ?? '',
                                                                            component_id: task.component_id ?? '',
                                                                            scheduled_date: task.scheduled_date,
                                                                            priority: task.priority ?? 'medium',
                                                                            technician_id: task.technician_id ?? '',
                                                                        });
                                                                        setTaskItemType(task.asset_id ? 'asset' : 'component');
                                                                        setTaskModalOpen(true);
                                                                    }}
                                                                >
                                                                    Editar
                                                                </Button>
                                                            )}
                                                            {canDeleteTask && (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="cursor-pointer border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                                                    title="Eliminar tarea"
                                                                    onClick={() => setDeleteTask(task)}
                                                                >
                                                                    Eliminar
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </article>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                {tasks.last_page > 1 && (
                                    <div className="border-t border-border p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                                            <span>
                                                Mostrando {tasks.from ?? 0} a {tasks.to ?? 0} de {tasks.total}
                                            </span>
                                            <div className="flex gap-2">
                                                {tasks.current_page > 1 && (
                                                    <Link
                                                        href={buildTasksPageUrl(tasks.current_page - 1)}
                                                        className="cursor-pointer text-inv-primary hover:underline"
                                                        preserveScroll
                                                    >
                                                        Anterior
                                                    </Link>
                                                )}
                                                {tasks.current_page < tasks.last_page && (
                                                    <Link
                                                        href={buildTasksPageUrl(tasks.current_page + 1)}
                                                        className="cursor-pointer text-inv-primary hover:underline"
                                                        preserveScroll
                                                    >
                                                        Siguiente
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <DeleteConfirmModal
                open={!!deletePlan}
                title="Eliminar plan"
                description={deletePlan ? `¿Eliminar el plan «${deletePlan.name}»? No se puede deshacer.` : ''}
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                loading={deleting}
                onOpenChange={(open) => { if (!open) setDeletePlan(null); }}
                onConfirm={handleDeletePlan}
            />

            <DeleteConfirmModal
                open={!!deleteTask}
                title="Eliminar tarea"
                description={deleteTask ? '¿Eliminar esta tarea preventiva? No se puede deshacer.' : ''}
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                loading={deleting}
                onOpenChange={(open) => { if (!open) setDeleteTask(null); }}
                onConfirm={handleDeleteTask}
            />

            <AppModal open={planModalOpen} onOpenChange={setPlanModalOpen} title={editingPlan ? 'Editar plan' : 'Nuevo plan'} contentClassName="space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <Label>
                            Nombre
                            <span className="ml-0.5 text-destructive">*</span>
                        </Label>
                        <Input value={planForm.name} onChange={(e) => setPlanForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ej. Revisión trimestral equipos" className="mt-1" />
                    </div>
                    <div>
                        <Label>
                            Tipo de bien
                            <span className="ml-0.5 text-destructive">*</span>
                        </Label>
                        <Select value={planForm.target_type} onValueChange={(v: 'asset' | 'component') => setPlanForm((p) => ({ ...p, target_type: v }))}>
                            <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="asset">{TARGET_LABELS.asset}</SelectItem>
                                <SelectItem value="component">{TARGET_LABELS.component}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>
                            Frecuencia
                            <span className="ml-0.5 text-destructive">*</span>
                        </Label>
                        <Select value={planForm.frequency_type} onValueChange={(v) => setPlanForm((p) => ({ ...p, frequency_type: v }))}>
                            <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {planForm.frequency_type === 'custom' && (
                        <div>
                            <Label>Días (personalizado)</Label>
                            <Input type="number" min={1} value={planForm.frequency_days} onChange={(e) => setPlanForm((p) => ({ ...p, frequency_days: e.target.value }))} className="mt-1" />
                        </div>
                    )}
                    <div className="sm:col-span-2">
                        <Label>Almacén</Label>
                        <SearchableSelect
                            value={planForm.warehouse_id}
                            onChange={(value) => setPlanForm((p) => ({ ...p, warehouse_id: value }))}
                            options={warehouseOptions}
                            placeholder="Seleccionar almacén"
                            noOptionsMessage="No se encontraron almacenes"
                        />
                    </div>
                    {planForm.target_type === 'asset' && (
                        <div className="sm:col-span-2">
                            <Label>Subcategoría (activo)</Label>
                            <SearchableSelect
                                value={planForm.subcategory_id}
                                onChange={(value) => setPlanForm((p) => ({ ...p, subcategory_id: value }))}
                                options={subcategoryOptions}
                                placeholder="Seleccionar subcategoría"
                                noOptionsMessage="No se encontraron subcategorías"
                            />
                        </div>
                    )}
                    {planForm.target_type === 'component' && (
                        <div className="sm:col-span-2">
                            <Label>Tipo (componente)</Label>
                            <Select value={planForm.component_type_id || '_'} onValueChange={(v) => setPlanForm((p) => ({ ...p, component_type_id: v === '_' ? '' : v }))}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Todos los tipos" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_">Todos los tipos</SelectItem>
                                    {componentTypesForSelect.map((ct) => <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="sm:col-span-2">
                        <Label>Descripción</Label>
                        <textarea
                            value={planForm.description}
                            onChange={(e) => setPlanForm((p) => ({ ...p, description: e.target.value }))}
                            rows={2}
                            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                        />
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                        <input type="checkbox" id="plan_active" checked={planForm.is_active} onChange={(e) => setPlanForm((p) => ({ ...p, is_active: e.target.checked }))} className="rounded border-border" />
                        <Label htmlFor="plan_active">Plan activo</Label>
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setPlanModalOpen(false)}>Cancelar</Button>
                    <Button type="button" className="cursor-pointer bg-inv-primary text-white" onClick={submitPlan}>Guardar</Button>
                </div>
            </AppModal>

            <AppModal
                open={taskModalOpen}
                onOpenChange={(open) => {
                    setTaskModalOpen(open);
                    if (!open) {
                        setEditingTask(null);
                    }
                }}
                title={editingTask ? 'Editar tarea' : 'Nueva tarea'}
                contentClassName="space-y-4"
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <Label>
                            Plan
                            <span className="ml-0.5 text-destructive">*</span>
                        </Label>
                        <Select value={taskForm.plan_id} onValueChange={(v) => setTaskForm((p) => ({ ...p, plan_id: v }))}>
                            <SelectTrigger className="mt-1 w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {plansForSelect.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({TARGET_LABELS[p.target_type]})</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>
                            Fecha programada
                            <span className="ml-0.5 text-destructive">*</span>
                        </Label>
                        <Input type="date" value={taskForm.scheduled_date} onChange={(e) => setTaskForm((p) => ({ ...p, scheduled_date: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                        <Label>Prioridad</Label>
                        <Select value={taskForm.priority} onValueChange={(v) => setTaskForm((p) => ({ ...p, priority: v }))}>
                            <SelectTrigger className="mt-1 w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(PRIORITY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="sm:col-span-2">
                        <Label>Tipo de bien</Label>
                        <Select
                            value={taskItemType}
                            onValueChange={(v: 'asset' | 'component') => {
                                setTaskItemType(v);
                                setTaskForm((p) => ({
                                    ...p,
                                    asset_id: v === 'asset' ? p.asset_id : '',
                                    component_id: v === 'component' ? p.component_id : '',
                                }));
                            }}
                        >
                            <SelectTrigger className="mt-1 w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="asset">Activo</SelectItem>
                                <SelectItem value="component">Componente</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="sm:col-span-2">
                        <Label>Activo</Label>
                        {taskItemType === 'asset' && (
                            <SearchableSelect
                                value={taskForm.asset_id}
                                onChange={(value) => setTaskForm((p) => ({ ...p, asset_id: value, component_id: '' }))}
                                options={assetOptions}
                                placeholder="Seleccionar activo"
                                noOptionsMessage="No se encontraron activos"
                            />
                        )}
                    </div>
                    <div className="sm:col-span-2">
                        <Label>Componente</Label>
                        {taskItemType === 'component' && (
                            <SearchableSelect
                                value={taskForm.component_id}
                                onChange={(value) => setTaskForm((p) => ({ ...p, component_id: value, asset_id: '' }))}
                                options={componentOptions}
                                placeholder="Seleccionar componente"
                                noOptionsMessage="No se encontraron componentes"
                            />
                        )}
                    </div>
                    <div className="sm:col-span-2">
                        <Label>Técnico</Label>
                        <SearchableSelect
                            value={taskForm.technician_id}
                            onChange={(value) => setTaskForm((p) => ({ ...p, technician_id: value }))}
                            options={technicianOptions}
                            placeholder="Seleccionar técnico (opcional)"
                            noOptionsMessage="No se encontraron técnicos"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setTaskModalOpen(false)}>Cancelar</Button>
                    <Button
                        type="button"
                        className="cursor-pointer bg-inv-primary text-white"
                        onClick={submitTask}
                        disabled={
                            !taskForm.plan_id ||
                            (taskItemType === 'asset' ? !taskForm.asset_id : !taskForm.component_id)
                        }
                    >
                        {editingTask ? 'Guardar cambios' : 'Crear tarea'}
                    </Button>
                </div>
            </AppModal>
        </AppLayout>
    );
}
