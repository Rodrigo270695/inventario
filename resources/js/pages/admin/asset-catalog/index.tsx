import { Head, router, usePage } from '@inertiajs/react';
import { Layers } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BrandFormModal } from '@/components/asset-catalog/brand-form-modal';
import { SubcategoryFormModal } from '@/components/asset-catalog/subcategory-form-modal';
import { ComponentTypeFormModal } from '@/components/asset-catalog/component-type-form-modal';
import { ModelFormModal } from '@/components/asset-catalog/model-form-modal';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import type { RestoreCandidate } from '@/components/restore-confirm-modal';
import { RestoreConfirmModal } from '@/components/restore-confirm-modal';
import { Toast } from '@/components/toast';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { AssetBrand, AssetModel, AssetSubcategory, ComponentType } from '@/types/asset-catalog';
import type { AssetCategory } from '@/types/organization';
import { CatalogListItem } from './components/CatalogListItem';
import { CatalogPanel } from './components/CatalogPanel';
import { CatalogStats } from './components/CatalogStats';
import { useToastFromFlash } from './components/useToastFromFlash';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Panel de control', href: '/dashboard' },
    { title: 'Administración', href: '#' },
    { title: 'Catálogo de activos', href: '/admin/asset-catalog' },
];

type DeleteTarget =
    | { type: 'subcategory'; item: AssetSubcategory }
    | { type: 'brand'; item: AssetBrand }
    | { type: 'model'; item: AssetModel }
    | { type: 'component_type'; item: ComponentType };

type FlashWithRestore = {
    restore_candidate?: RestoreCandidate;
    restore_payload?: Record<string, unknown>;
};

type AssetCatalogIndexProps = {
    categories: AssetCategory[];
    subcategories: AssetSubcategory[];
    brands: AssetBrand[];
    models: AssetModel[];
    componentTypes: ComponentType[];
    can: {
        create_subcategory: boolean;
        update_subcategory: boolean;
        delete_subcategory: boolean;
        create_brand: boolean;
        update_brand: boolean;
        delete_brand: boolean;
        create_model: boolean;
        update_model: boolean;
        delete_model: boolean;
        create_component_type: boolean;
        update_component_type: boolean;
        delete_component_type: boolean;
    };
};

const LIST_CLASS = 'flex flex-col gap-0.5 sm:gap-1 max-h-[min(320px,45vh)] overflow-y-auto pr-1';

export default function AssetCatalogIndex({
    categories,
    subcategories,
    brands,
    models,
    componentTypes,
    can,
}: AssetCatalogIndexProps) {
    const [subcategoryFormOpen, setSubcategoryFormOpen] = useState(false);
    const [editingSubcategory, setEditingSubcategory] = useState<AssetSubcategory | null>(null);
    const [brandFormOpen, setBrandFormOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<AssetBrand | null>(null);
    const [modelFormOpen, setModelFormOpen] = useState(false);
    const [editingModel, setEditingModel] = useState<AssetModel | null>(null);
    const [componentTypeFormOpen, setComponentTypeFormOpen] = useState(false);
    const [editingComponentType, setEditingComponentType] = useState<ComponentType | null>(null);
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [restoreModalOpen, setRestoreModalOpen] = useState(false);
    const [restoring, setRestoring] = useState(false);

    const { props } = usePage();
    const flash = (props.flash as FlashWithRestore | undefined);
    const { toastQueue, dismiss } = useToastFromFlash();

    useEffect(() => {
        if (flash?.restore_candidate?.type !== 'asset_model') return;
        queueMicrotask(() => setRestoreModalOpen(true));
    }, [flash?.restore_candidate?.type]);

    // No permitir tener seleccionada una subcategoría inactiva
    useEffect(() => {
        if (!selectedSubcategoryId) return;
        const sub = subcategories.find((s) => s.id === selectedSubcategoryId);
        if (sub && !sub.is_active) {
            queueMicrotask(() => {
                setSelectedSubcategoryId(null);
                setSelectedBrandId(null);
            });
        }
    }, [subcategories, selectedSubcategoryId]);

    useEffect(() => {
        const offStart = router.on('start', () => setIsNavigating(true));
        const offFinish = router.on('finish', () => setIsNavigating(false));
        return () => {
            offStart();
            offFinish();
        };
    }, []);

    const modelsFiltered =
        selectedSubcategoryId && selectedBrandId
            ? models.filter(
                  (m) => m.subcategory_id === selectedSubcategoryId && m.brand_id === selectedBrandId
              )
            : selectedSubcategoryId
              ? models.filter((m) => m.subcategory_id === selectedSubcategoryId)
              : selectedBrandId
                ? models.filter((m) => m.brand_id === selectedBrandId)
                : models;

    const openSubcategoryForm = (subcategory: AssetSubcategory | null) => {
        setEditingSubcategory(subcategory);
        setSubcategoryFormOpen(true);
    };
    const openBrandForm = (brand: AssetBrand | null) => {
        setEditingBrand(brand);
        setBrandFormOpen(true);
    };
    const openModelForm = (model: AssetModel | null) => {
        setEditingModel(model);
        setModelFormOpen(true);
    };
    const openComponentTypeForm = (ct: ComponentType | null) => {
        setEditingComponentType(ct);
        setComponentTypeFormOpen(true);
    };

    const handleRestoreConfirm = () => {
        const candidate = flash?.restore_candidate;
        const payload = flash?.restore_payload as Record<string, unknown> | undefined;
        if (!candidate || candidate.type !== 'asset_model' || !payload) return;
        setRestoring(true);
        router.post('/admin/asset-catalog/models/restore', { id: candidate.id, ...payload }, {
            preserveScroll: true,
            onFinish: () => setRestoring(false),
            onSuccess: () => setRestoreModalOpen(false),
        });
    };

    const handleRestoreOpenChange = (open: boolean) => {
        setRestoreModalOpen(open);
        if (!open) router.get(window.location.pathname, {}, { preserveState: false });
    };

    const handleDeleteConfirm = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        const url =
            deleteTarget.type === 'subcategory'
                ? `/admin/asset-catalog/subcategories/${deleteTarget.item.id}`
                : deleteTarget.type === 'brand'
                  ? `/admin/asset-catalog/brands/${deleteTarget.item.id}`
                  : deleteTarget.type === 'model'
                    ? `/admin/asset-catalog/models/${deleteTarget.item.id}`
                    : `/admin/asset-catalog/component-types/${deleteTarget.item.id}`;
        router.delete(url, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    const deleteTitle =
        deleteTarget?.type === 'subcategory'
            ? 'Eliminar subcategoría'
            : deleteTarget?.type === 'brand'
              ? 'Eliminar marca'
              : deleteTarget?.type === 'model'
                ? 'Eliminar modelo'
                : 'Eliminar tipo de componente';
    const deleteName = deleteTarget && 'name' in deleteTarget.item ? deleteTarget.item.name : '';
    const deleteDescription = deleteTarget
        ? `¿Eliminar «${deleteName}»? Esta acción no se puede deshacer.`
        : undefined;

    const selectedSubcategoryName =
        selectedSubcategoryId != null
            ? subcategories.find((s) => s.id === selectedSubcategoryId)?.name
            : undefined;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Catálogo de activos" />

            <div className="relative flex flex-1 flex-col gap-4 p-4 md:p-6">
                {isNavigating && (
                    <div
                        className="absolute left-0 right-0 top-0 z-10 h-0.5 rounded-b bg-inv-primary/80 animate-pulse"
                        role="progressbar"
                        aria-label="Cargando"
                    />
                )}

                {toastQueue.length > 0 && (
                    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
                        {toastQueue.map((t) => (
                            <Toast
                                key={t.id}
                                toast={t}
                                onDismiss={() => dismiss(t.id)}
                                duration={3000}
                            />
                        ))}
                    </div>
                )}

                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="relative inline-block pb-1 text-xl font-semibold tracking-tight text-foreground">
                            Catálogo de activos
                            <span
                                className="absolute bottom-0 left-0 h-0.5 w-8 rounded-full bg-inv-primary"
                                aria-hidden
                            />
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Subcategorías, marcas, modelos y tipos de componente.
                        </p>
                    </div>
                </header>

                <CatalogStats
                    subcategoriesCount={subcategories.length}
                    brandsCount={brands.length}
                    modelsCount={models.length}
                    componentTypesCount={componentTypes.length}
                />

                <div className="border-t border-border pt-4" />

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                    <CatalogPanel
                        title="Subcategorías"
                        actionButton={
                            can.create_subcategory
                                ? { show: true, label: 'Nueva', onClick: () => openSubcategoryForm(null) }
                                : undefined
                        }
                        emptyState={
                            subcategories.length === 0
                                ? {
                                      message: 'No hay subcategorías.',
                                      primaryButton: can.create_subcategory
                                          ? { label: 'Crear primera', onClick: () => openSubcategoryForm(null) }
                                          : undefined,
                                  }
                                : undefined
                        }
                    >
                        {subcategories.length > 0 && (
                            <ul className={LIST_CLASS}>
                                {subcategories.map((s) => (
                                    <CatalogListItem
                                        key={s.id}
                                        selected={selectedSubcategoryId === s.id}
                                        disabled={!s.is_active}
                                        onSelect={() => {
                                            if (!s.is_active) return;
                                            setSelectedSubcategoryId((prev) => (prev === s.id ? null : s.id));
                                            setSelectedBrandId(null);
                                        }}
                                        name={s.name}
                                        subtitle={s.asset_category?.name}
                                        statusBadge={
                                            <span
                                                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                                                    s.is_active
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                                        : 'bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                {s.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        }
                                        canEdit={can.update_subcategory}
                                        canDelete={can.delete_subcategory}
                                        onEdit={() => openSubcategoryForm(s)}
                                        onDelete={() => setDeleteTarget({ type: 'subcategory', item: s })}
                                    />
                                ))}
                            </ul>
                        )}
                    </CatalogPanel>

                    <CatalogPanel
                        title="Marcas"
                        titleExtra={
                            selectedSubcategoryName != null ? `(${selectedSubcategoryName})` : undefined
                        }
                        actionButton={
                            can.create_brand
                                ? { show: true, label: 'Nueva', onClick: () => openBrandForm(null) }
                                : undefined
                        }
                        emptyState={
                            brands.length === 0
                                ? {
                                      message: 'No hay marcas.',
                                      primaryButton: can.create_brand
                                          ? { label: 'Crear primera', onClick: () => openBrandForm(null) }
                                          : undefined,
                                  }
                                : undefined
                        }
                    >
                        {brands.length > 0 && (
                            <ul className={LIST_CLASS}>
                                {brands.map((b) => (
                                    <CatalogListItem
                                        key={b.id}
                                        selected={selectedBrandId === b.id}
                                        onSelect={() =>
                                            setSelectedBrandId((prev) => (prev === b.id ? null : b.id))
                                        }
                                        name={b.name}
                                        canEdit={can.update_brand}
                                        canDelete={can.delete_brand}
                                        onEdit={() => openBrandForm(b)}
                                        onDelete={() => setDeleteTarget({ type: 'brand', item: b })}
                                    />
                                ))}
                            </ul>
                        )}
                    </CatalogPanel>

                    <CatalogPanel
                        title="Modelos"
                        titleExtra={
                            selectedSubcategoryId != null || selectedBrandId != null
                                ? '(filtrado)'
                                : undefined
                        }
                        actionButton={
                            can.create_model
                                ? { show: true, label: 'Nuevo', onClick: () => openModelForm(null) }
                                : undefined
                        }
                        emptyState={
                            selectedSubcategoryId == null && selectedBrandId == null
                                ? {
                                      icon: Layers,
                                      message:
                                          'Seleccione subcategoría y/o marca para filtrar modelos.',
                                  }
                                : modelsFiltered.length === 0
                                  ? {
                                        message: 'No hay modelos.',
                                        primaryButton: can.create_model
                                            ? { label: 'Crear primero', onClick: () => openModelForm(null) }
                                            : undefined,
                                    }
                                  : undefined
                        }
                    >
                        {modelsFiltered.length > 0 && (
                            <ul className={LIST_CLASS}>
                                {modelsFiltered.map((m) => (
                                    <CatalogListItem
                                        key={m.id}
                                        name={m.name}
                                        subtitle={`${m.brand?.name ?? ''} · ${m.subcategory?.name ?? ''}`}
                                        canEdit={can.update_model}
                                        canDelete={can.delete_model}
                                        onEdit={() => openModelForm(m)}
                                        onDelete={() => setDeleteTarget({ type: 'model', item: m })}
                                    />
                                ))}
                            </ul>
                        )}
                    </CatalogPanel>

                    <CatalogPanel
                        title="Tipos de componente"
                        actionButton={
                            can.create_component_type
                                ? {
                                      show: true,
                                      label: 'Nuevo',
                                      onClick: () => openComponentTypeForm(null),
                                  }
                                : undefined
                        }
                        emptyState={
                            componentTypes.length === 0
                                ? {
                                      message: 'No hay tipos.',
                                      primaryButton: can.create_component_type
                                          ? {
                                                label: 'Crear primero',
                                                onClick: () => openComponentTypeForm(null),
                                            }
                                          : undefined,
                                  }
                                : undefined
                        }
                    >
                        {componentTypes.length > 0 && (
                            <ul className={LIST_CLASS}>
                                {componentTypes.map((ct) => (
                                    <CatalogListItem
                                        key={ct.id}
                                        name={ct.name}
                                        canEdit={can.update_component_type}
                                        canDelete={can.delete_component_type}
                                        onEdit={() => openComponentTypeForm(ct)}
                                        onDelete={() =>
                                            setDeleteTarget({ type: 'component_type', item: ct })
                                        }
                                    />
                                ))}
                            </ul>
                        )}
                    </CatalogPanel>
                </div>
            </div>

            <SubcategoryFormModal
                open={subcategoryFormOpen}
                onOpenChange={(o) => {
                    setSubcategoryFormOpen(o);
                    if (!o) setEditingSubcategory(null);
                }}
                subcategory={editingSubcategory}
                categories={categories}
            />
            <BrandFormModal
                open={brandFormOpen}
                onOpenChange={(o) => {
                    setBrandFormOpen(o);
                    if (!o) setEditingBrand(null);
                }}
                brand={editingBrand}
            />
            <ModelFormModal
                open={modelFormOpen}
                onOpenChange={(o) => {
                    setModelFormOpen(o);
                    if (!o) setEditingModel(null);
                }}
                model={editingModel}
                subcategories={subcategories}
                brands={brands}
                defaultSubcategoryId={selectedSubcategoryId}
                defaultBrandId={selectedBrandId}
            />
            <ComponentTypeFormModal
                open={componentTypeFormOpen}
                onOpenChange={(o) => {
                    setComponentTypeFormOpen(o);
                    if (!o) setEditingComponentType(null);
                }}
                componentType={editingComponentType}
            />
            <DeleteConfirmModal
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title={deleteTitle}
                description={deleteDescription}
                onConfirm={handleDeleteConfirm}
                loading={deleting}
            />
            {flash?.restore_candidate?.type === 'asset_model' && (
                <RestoreConfirmModal
                    open={restoreModalOpen}
                    onOpenChange={handleRestoreOpenChange}
                    candidate={flash.restore_candidate}
                    onConfirm={handleRestoreConfirm}
                    loading={restoring}
                />
            )}
        </AppLayout>
    );
}
