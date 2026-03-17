import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Pencil } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, RepairTicket } from '@/types';

type Props = {
    repairTicket: RepairTicket;
};

const breadcrumbs = (ticket: RepairTicket): BreadcrumbItem[] => [
    { title: 'Mantenimiento', href: '#' },
    { title: 'Reparaciones', href: '/admin/repair-tickets' },
    { title: `Editar ${ticket.code}`, href: `/admin/repair-tickets/${ticket.id}/edit` },
];

export default function RepairTicketsEdit({ repairTicket }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs(repairTicket)}>
            <Head title={`Editar ${repairTicket.code}`} />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Pencil className="size-5 text-blue-600" />
                        <div>
                            <h1 className="text-xl font-semibold text-foreground">Editar ticket {repairTicket.code}</h1>
                            <p className="text-sm text-muted-foreground">
                                La edición detallada se implementará en el siguiente paso.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6">
                        <Link
                            href="/admin/repair-tickets"
                            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                        >
                            <ArrowLeft className="size-4" />
                            Volver al listado
                        </Link>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
