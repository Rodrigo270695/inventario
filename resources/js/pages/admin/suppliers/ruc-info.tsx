import { Head, Link } from '@inertiajs/react';
import { Printer } from 'lucide-react';

type Props = {
    ruc: string;
    basic: any | null;
    extra: {
        deuda_coactiva?: any;
        representantes?: any;
        establecimientos?: any;
        domicilio_fiscal?: any;
    } | null;
    error?: string | null;
};

export default function SupplierRucInfoPage({ ruc, basic, extra, error }: Props) {
    const razonSocial =
        basic?.data?.razon_social ??
        basic?.data?.nombre_o_razon_social ??
        basic?.razon_social ??
        basic?.nombre_o_razon_social ??
        '';

    return (
        <>
            <Head title={`RUC ${ruc}`} />
            <div className="min-h-screen bg-slate-100 print:bg-white flex justify-center px-4 py-6 md:py-8">
                <div className="w-full max-w-[820px] rounded-lg border border-border bg-white p-6 text-xs leading-relaxed shadow-sm print:shadow-none print:border-0 print:max-w-none">
                    <header className="mb-4 border-b border-border pb-3 flex items-start justify-between gap-4">
                        <p className="text-[11px] font-semibold text-muted-foreground">
                            INFORMACIÓN SUNAT — CONSULTA RUC
                        </p>
                        <p className="mt-1 text-sm font-bold text-foreground">
                            RUC {ruc}
                        </p>
                        {razonSocial && (
                            <p className="mt-0.5 text-[12px] font-semibold text-foreground">
                                {razonSocial}
                            </p>
                        )}
                        <div className="text-right space-y-1 print:hidden">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="inline-flex items-center gap-1 rounded border border-border bg-white px-2 py-1 text-[11px] font-medium text-foreground hover:bg-slate-50"
                            >
                                <Printer className="h-3 w-3" />
                                <span>Imprimir</span>
                            </button>
                            <div>
                                <Link href="/admin/suppliers" className="text-[11px] text-inv-primary hover:underline">
                                    ← Volver a proveedores
                                </Link>
                            </div>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground w-full print:block hidden">
                            Datos obtenidos vía ApiPeru (SUNAT). Documento solo informativo.
                        </p>
                    </header>

                    {error && (
                        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
                            {error}
                        </div>
                    )}

                    {!error && (
                        <div className="space-y-4">
                            <section>
                                <p className="mb-1 text-[11px] font-semibold uppercase text-foreground">
                                    1. Datos generales del contribuyente
                                </p>
                                <pre className="max-h-48 overflow-auto rounded border border-border/60 bg-slate-50 px-3 py-2 text-[11px] text-slate-800">
{JSON.stringify(basic ?? {}, null, 2)}
                                </pre>
                            </section>

                            <section>
                                <p className="mb-1 text-[11px] font-semibold uppercase text-foreground">
                                    2. Deuda coactiva
                                </p>
                                <pre className="max-h-48 overflow-auto rounded border border-border/60 bg-slate-50 px-3 py-2 text-[11px] text-slate-800">
{JSON.stringify(extra?.deuda_coactiva ?? {}, null, 2)}
                                </pre>
                            </section>

                            <section>
                                <p className="mb-1 text-[11px] font-semibold uppercase text-foreground">
                                    3. Representantes legales
                                </p>
                                <pre className="max-h-48 overflow-auto rounded border border-border/60 bg-slate-50 px-3 py-2 text-[11px] text-slate-800">
{JSON.stringify(extra?.representantes ?? {}, null, 2)}
                                </pre>
                            </section>

                            <section>
                                <p className="mb-1 text-[11px] font-semibold uppercase text-foreground">
                                    4. Establecimientos anexos
                                </p>
                                <pre className="max-h-48 overflow-auto rounded border border-border/60 bg-slate-50 px-3 py-2 text-[11px] text-slate-800">
{JSON.stringify(extra?.establecimientos ?? {}, null, 2)}
                                </pre>
                            </section>

                            <section>
                                <p className="mb-1 text-[11px] font-semibold uppercase text-foreground">
                                    5. Domicilio fiscal
                                </p>
                                <pre className="max-h-48 overflow-auto rounded border border-border/60 bg-slate-50 px-3 py-2 text-[11px] text-slate-800">
{JSON.stringify(extra?.domicilio_fiscal ?? {}, null, 2)}
                                </pre>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

