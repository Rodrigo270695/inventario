import { Head } from '@inertiajs/react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type BarcodesPreviewProps = {
    title: string;
    scopeLabel: string;
    assetsCount: number;
    labelSpec: string;
    pdfUrl: string;
    downloadUrl: string;
};

export default function AssetBarcodesPreview({
    title,
    scopeLabel,
    assetsCount,
    labelSpec,
    pdfUrl,
    downloadUrl,
}: BarcodesPreviewProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Activos', href: '/admin/assets' },
        { title: 'Imprimir barcode', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
                            <p className="text-sm text-muted-foreground">
                                {assetsCount} etiqueta{assetsCount === 1 ? '' : 's'} lista
                                {assetsCount === 1 ? '' : 's'} para vista previa.
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span className="rounded-full bg-muted px-3 py-1">{scopeLabel}</span>
                                <span className="rounded-full bg-muted px-3 py-1">{labelSpec}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => window.open(pdfUrl, '_blank', 'noopener,noreferrer')}
                            >
                                <Printer className="mr-2 size-4" />
                                Abrir para imprimir
                            </Button>
                            <Button
                                type="button"
                                onClick={() => {
                                    window.location.href = downloadUrl;
                                }}
                            >
                                <Download className="mr-2 size-4" />
                                Descargar PDF
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-lg border border-border bg-background p-2">
                        <iframe
                            title={title}
                            src={`${pdfUrl}#toolbar=1&navpanes=0&statusbar=0&view=FitH`}
                            className="h-[78vh] w-full rounded-md"
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
