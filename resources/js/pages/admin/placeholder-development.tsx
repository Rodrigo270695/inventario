import { Head } from '@inertiajs/react';
import { Construction } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type PlaceholderDevelopmentProps = {
    title: string;
};

export default function PlaceholderDevelopment({ title }: PlaceholderDevelopmentProps) {
    const breadcrumbs: BreadcrumbItem[] = [{ title, href: '#' }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
                <Construction className="size-14 text-muted-foreground" aria-hidden />
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                <p className="max-w-md text-muted-foreground">
                    Este módulo está en desarrollo. Pronto podrás usarlo desde aquí.
                </p>
            </div>
        </AppLayout>
    );
}
