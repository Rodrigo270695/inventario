import { Link, router } from '@inertiajs/react';
import { Eye, FileText, Lock, Pencil, Trash2, Unlock } from 'lucide-react';
import type React from 'react';
import type { Invoice } from '@/types';

type Props = {
    invoice: Invoice;
    canUpdate: boolean;
    canDelete: boolean;
    canChangeStatus: boolean;
    onEdit: (invoice: Invoice) => void;
    onDelete: (invoice: Invoice) => void;
};

export const InvoiceActionsCell: React.FC<Props> = ({
    invoice,
    canUpdate,
    canDelete,
    canChangeStatus,
    onEdit,
    onDelete,
}) => {
    const isClosed = invoice.status === 'closed';
    const canDeleteRow = !isClosed;

    return (
        <div className="flex flex-row flex-nowrap items-center justify-end gap-1">
            <Link
                href={`/admin/purchase-orders/${invoice.purchase_order?.id ?? '#'}`}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-inv-primary hover:bg-inv-primary/10 hover:text-inv-primary dark:hover:bg-inv-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary"
                aria-label="Ver orden de compra"
                title="Ver orden de compra"
            >
                <Eye className="size-4" />
            </Link>
            {invoice.pdf_path && (
                <a
                    href={`/admin/invoices/${invoice.id}/document`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label="Descargar factura"
                    title="Descargar factura"
                >
                    <FileText className="size-4" />
                </a>
            )}
            {invoice.remission_guide_path && (
                <a
                    href={`/admin/invoices/${invoice.id}/remission-guide`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    aria-label="Descargar guía de remisión"
                    title="Descargar guía de remisión"
                >
                    <FileText className="size-4" />
                </a>
            )}
            {canUpdate && !isClosed && (
                <button
                    type="button"
                    onClick={() => onEdit(invoice)}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-sky-600 hover:bg-sky-50 hover:text-sky-700 dark:text-sky-400 dark:hover:bg-sky-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer"
                    aria-label="Editar documentos"
                    title="Editar documentos"
                >
                    <Pencil className="size-4" />
                </button>
            )}
            {canChangeStatus && (
                <button
                    type="button"
                    onClick={() =>
                        router.post(
                            isClosed ? `/admin/invoices/${invoice.id}/open` : `/admin/invoices/${invoice.id}/close`,
                            {},
                            { preserveScroll: true }
                        )
                    }
                    className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
                        isClosed
                            ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-500/20 focus-visible:ring-amber-500'
                            : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-500/20 focus-visible:ring-emerald-500'
                    }`}
                    title={isClosed ? 'Abrir factura' : 'Cerrar factura'}
                >
                    {isClosed ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
                </button>
            )}
            {canDelete && canDeleteRow && (
                <button
                    type="button"
                    onClick={() => onDelete(invoice)}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer"
                    aria-label="Eliminar factura"
                    title="Eliminar factura"
                >
                    <Trash2 className="size-4" />
                </button>
            )}
        </div>
    );
};

