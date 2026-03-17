import { router } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import { SearchableSelect, type SearchableSelectOption } from '@/components/searchable-select';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { RepairTicketConfigTicket, RepairTicketCost, RepairTicketDocument } from './types';
import { DOCUMENT_TYPE_LABELS, ISSUER_TYPE_LABELS, formatDateTimeShort, fullDisplayName } from './utils';

const DOCUMENT_OPTIONS = [
    { value: 'invoice', label: 'Factura' },
    { value: 'receipt', label: 'Recibo' },
    { value: 'fee_receipt', label: 'Recibo por honorarios' },
    { value: 'quote', label: 'Cotización' },
    { value: 'report', label: 'Informe' },
    { value: 'evidence_photo', label: 'Foto evidencia' },
    { value: 'before_photo', label: 'Foto antes' },
    { value: 'after_photo', label: 'Foto después' },
    { value: 'warranty_doc', label: 'Documento garantía' },
    { value: 'other', label: 'Otro' },
];

const ISSUER_OPTIONS = [
    { value: '', label: '—' },
    { value: 'company', label: 'Empresa' },
    { value: 'supplier', label: 'Proveedor' },
    { value: 'technician', label: 'Técnico' },
    { value: 'other', label: 'Otro' },
];

function nowLocalDate() {
    const date = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

type Props = {
    repairTicket: RepairTicketConfigTicket;
    documents: RepairTicketDocument[];
    costs: RepairTicketCost[];
    canEdit: boolean;
};

export function RepairTicketConfigDocumentsTab({ repairTicket, documents, costs, canEdit }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [documentToDelete, setDocumentToDelete] = useState<RepairTicketDocument | null>(null);
    const [form, setForm] = useState({
        repair_cost_id: '',
        type: 'report',
        issuer_type: '',
        document_number: '',
        title: '',
        issued_at: nowLocalDate(),
        notes: '',
    });

    const costOptions = useMemo<SearchableSelectOption[]>(
        () =>
            costs.map((cost) => ({
                value: cost.id,
                label: `${cost.type} · ${cost.amount}`,
                searchTerms: [cost.document_number ?? '', cost.supplier?.name ?? ''],
            })),
        [costs]
    );

    const handleUpload = () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file) return;

        const data = new FormData();
        data.append('file', file);
        data.append('type', form.type);
        if (form.repair_cost_id) data.append('repair_cost_id', form.repair_cost_id);
        if (form.issuer_type) data.append('issuer_type', form.issuer_type);
        if (form.document_number.trim()) data.append('document_number', form.document_number.trim());
        if (form.title.trim()) data.append('title', form.title.trim());
        if (form.issued_at) data.append('issued_at', form.issued_at);
        if (form.notes.trim()) data.append('notes', form.notes.trim());

        setUploading(true);
        router.post(`/admin/repair-tickets/${repairTicket.id}/documents`, data, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setUploading(false),
            onSuccess: () => {
                setForm({
                    repair_cost_id: '',
                    type: 'report',
                    issuer_type: '',
                    document_number: '',
                    title: '',
                    issued_at: nowLocalDate(),
                    notes: '',
                });
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
        });
    };

    const handleDelete = () => {
        if (!documentToDelete) return;
        setDeleting(documentToDelete.id);
        router.delete(`/admin/repair-tickets/${repairTicket.id}/documents/${documentToDelete.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(null);
                setDocumentToDelete(null);
            },
        });
    };

    const fileHref = (path: string) => `/storage/${path}`;

    return (
        <div className="space-y-6 p-4 md:p-6">
            {canEdit && (
                <div className="space-y-4 rounded-xl border border-inv-primary/40 bg-inv-primary/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-sm font-semibold text-foreground">Adjuntar documento</h2>
                        <button
                            type="button"
                            onClick={handleUpload}
                            disabled={uploading}
                            className="cursor-pointer rounded-md bg-inv-primary px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                        >
                            {uploading ? 'Subiendo...' : 'Guardar documento'}
                        </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Archivo</label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                className="flex h-10 w-full cursor-pointer items-center rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-inv-primary/15 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-inv-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                            <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value }))}>
                                <SelectTrigger className="w-full border-border/70 bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DOCUMENT_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Emisor</label>
                            <Select value={form.issuer_type === '' ? '_' : form.issuer_type} onValueChange={(value) => setForm((current) => ({ ...current, issuer_type: value === '_' ? '' : value }))}>
                                <SelectTrigger className="w-full border-border/70 bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ISSUER_OPTIONS.map((option) => (
                                        <SelectItem key={option.value || '_'} value={option.value || '_'}>{option.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Fecha emisión</label>
                            <input
                                type="date"
                                value={form.issued_at}
                                onChange={(event) => setForm((current) => ({ ...current, issued_at: event.target.value }))}
                                className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">N° documento</label>
                            <input
                                type="text"
                                value={form.document_number}
                                onChange={(event) => setForm((current) => ({ ...current, document_number: event.target.value }))}
                                className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                            />
                        </div>
                        <div className="space-y-2 xl:col-span-2">
                            <label className="text-xs font-medium text-muted-foreground">Título</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                                className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                            />
                        </div>
                        <div className="space-y-2 xl:col-span-4">
                            <label className="text-xs font-medium text-muted-foreground">Relacionado a costo</label>
                            <SearchableSelect
                                value={form.repair_cost_id}
                                onChange={(value) => setForm((current) => ({ ...current, repair_cost_id: value }))}
                                options={costOptions}
                                placeholder="Opcional"
                            />
                        </div>
                        <div className="space-y-2 xl:col-span-4">
                            <label className="text-xs font-medium text-muted-foreground">Notas</label>
                            <textarea
                                value={form.notes}
                                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                                rows={3}
                                className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">Documentos adjuntos</h2>
                {documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aún no se han adjuntado documentos para este ticket.</p>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {documents.map((document) => (
                            <article key={document.id} className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-foreground">
                                            {document.title || document.file_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {DOCUMENT_TYPE_LABELS[document.type] ?? document.type}
                                            {document.issuer_type ? ` · ${ISSUER_TYPE_LABELS[document.issuer_type] ?? document.issuer_type}` : ''}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {document.document_number || 'Sin número'} · {formatDateTimeShort(document.created_at)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Subido por: {fullDisplayName(document.uploaded_by)}
                                        </p>
                                        {document.repair_cost && (
                                            <p className="text-xs text-muted-foreground">
                                                Relacionado a costo: {document.repair_cost.document_number || document.repair_cost.type}
                                            </p>
                                        )}
                                    </div>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={() => setDocumentToDelete(document)}
                                            className="cursor-pointer rounded-md border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/30"
                                        >
                                            Eliminar
                                        </button>
                                    )}
                                </div>
                                {document.notes && (
                                    <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{document.notes}</p>
                                )}
                                <div className="mt-3 flex items-center gap-2">
                                    <a
                                        href={fileHref(document.file_path)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex cursor-pointer items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                                    >
                                        Ver archivo
                                    </a>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>

            <DeleteConfirmModal
                open={documentToDelete != null}
                onOpenChange={(open) => !open && setDocumentToDelete(null)}
                title="Eliminar documento"
                description="¿Deseas eliminar este documento del ticket?"
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                loading={deleting != null}
                onConfirm={handleDelete}
            />
        </div>
    );
}
