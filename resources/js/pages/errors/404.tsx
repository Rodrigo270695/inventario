import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, SearchX } from 'lucide-react';

export default function Error404() {
    return (
        <>
            <Head title="404 - Página no encontrada" />

            <div className="relative flex min-h-svh overflow-hidden bg-inv-bg font-sans selection:bg-inv-primary/30 selection:text-white">
                <div
                    className="pointer-events-none fixed inset-0"
                    aria-hidden
                    style={{
                        background: `
                          radial-gradient(ellipse 120% 80% at 5% 15%, rgba(var(--inv-primary-rgb), 0.22) 0%, transparent 45%),
                          radial-gradient(ellipse 90% 70% at 95% 85%, rgba(var(--inv-surface-rgb), 0.22) 0%, transparent 45%),
                          radial-gradient(ellipse 80% 60% at 50% 105%, rgba(var(--inv-section-rgb), 0.32) 0%, transparent 50%)
                        `,
                    }}
                />

                <div className="relative z-10 mx-auto flex w-full max-w-3xl items-center justify-center px-6 py-12">
                    <div className="w-full rounded-3xl border border-white/10 bg-inv-section/90 p-8 text-center shadow-2xl shadow-black/50 ring-1 ring-white/5 backdrop-blur-2xl sm:p-10">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-inv-primary">Error del sistema</p>
                        <h1 className="mt-2 text-6xl font-bold tracking-tight text-white sm:text-7xl">404</h1>
                        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-300">
                            <SearchX className="size-4" />
                            Página no encontrada
                        </div>
                        <p className="mx-auto mt-6 max-w-lg text-base text-slate-400">
                            La ruta que intentaste abrir no existe o fue movida. Revisa la URL o vuelve al panel principal.
                        </p>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                            <Link
                                href={typeof window !== 'undefined' ? document.referrer || '/' : '/'}
                                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                            >
                                <ArrowLeft className="size-4" />
                                Volver
                            </Link>
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center rounded-xl bg-linear-to-r from-inv-surface to-inv-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                            >
                                Ir al panel
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
