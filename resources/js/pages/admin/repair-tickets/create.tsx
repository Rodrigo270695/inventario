import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Wrench } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Mantenimiento', href: '#' },
    { title: 'Reparaciones', href: '/admin/repair-tickets' },
    { title: 'Nuevo ticket', href: '/admin/repair-tickets/create' },
];

export default function RepairTicketsCreate() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo ticket" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Wrench className="size-5 text-inv-primary" />
                        <div>
                            <h1 className="text-xl font-semibold text-foreground">Nuevo ticket</h1>
                            <p className="text-sm text-muted-foreground">
                                El formulario general se implementará en el siguiente paso.
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
