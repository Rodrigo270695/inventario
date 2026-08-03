import { router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import type { AssetConfigAsset } from './types';
import { formatDateShort, formatDateTimeShort } from './utils';

type Props = {
    asset: AssetConfigAsset;
};

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = '—'): string {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }
    return String(value);
}

function diskKindLabel(disk: Record<string, unknown> | null): string {
    if (!disk) return '—';
    const kind = text(disk.kind, '').toUpperCase();
    if (kind === 'SSD' || kind === 'HDD') return kind;

    const model = text(disk.model, '');
    const iface = text(disk.interface, '');
    const bus = text(disk.bus, '');
    const media = text(disk.media_type, '');
    const blob = `${model} ${iface} ${bus} ${media}`;

    if (/(nvme|ssd|solid|sa400|sa200|bx500|mx500|870 evo|980)/i.test(blob)) return 'SSD';
    if (/\bhdd\b|dt01aca|wd\d{2}|st\d{4}/i.test(blob)) return 'HDD';
    if (/fixed hard disk/i.test(media) && !/(nvme|ssd)/i.test(blob)) return 'HDD?';

    return '—';
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <dt className="text-muted-foreground text-[11px] font-medium">{label}</dt>
            <dd className="truncate text-sm text-foreground" title={value}>
                {value}
            </dd>
        </div>
    );
}

export function AssetConfigComputerTab({ asset }: Props) {
    const computer = asset.computer ?? null;
    const [savingComputer, setSavingComputer] = useState(false);
    const [showRawJson, setShowRawJson] = useState(false);
    const [computerForm, setComputerForm] = useState({
        hostname: computer?.hostname ?? '',
        bios_serial: computer?.bios_serial ?? '',
        ip_address: computer?.ip_address ?? '',
        mac_address: computer?.mac_address ?? '',
    });

    useEffect(() => {
        const c = asset.computer ?? null;
        setComputerForm({
            hostname: c?.hostname ?? '',
            bios_serial: c?.bios_serial ?? '',
            ip_address: c?.ip_address ?? '',
            mac_address: c?.mac_address ?? '',
        });
    }, [
        asset.computer?.id,
        asset.computer?.hostname,
        asset.computer?.bios_serial,
        asset.computer?.ip_address,
        asset.computer?.mac_address,
    ]);

    const snapshot = useMemo(() => asRecord(computer?.hardware_snapshot ?? null), [computer?.hardware_snapshot]);
    const os = asRecord(snapshot?.os);
    const cpu = asRecord(snapshot?.cpu);
    const memory = asRecord(snapshot?.memory);
    const disks = asArray(snapshot?.disks);
    const volumes = asArray(snapshot?.volumes);
    const adapters = asArray(snapshot?.network_adapters);

    const handleSaveComputer = () => {
        setSavingComputer(true);
        router.put(
            `/admin/assets/${asset.id}/computer`,
            {
                hostname: computerForm.hostname.trim() || null,
                bios_serial: computerForm.bios_serial.trim() || null,
                ip_address: computerForm.ip_address.trim() || null,
                mac_address: computerForm.mac_address.trim() || null,
            },
            {
                preserveScroll: true,
                onFinish: () => setSavingComputer(false),
            },
        );
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div>
                <h2 className="text-sm font-semibold text-foreground">Datos de equipo</h2>
                <p className="text-muted-foreground mt-1 text-xs">
                    Identidad de red (editable). El detalle de hardware lo actualiza el agente; el historial queda en
                    Auditoría.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <label htmlFor="computer-hostname" className="text-muted-foreground text-xs font-medium">
                        Hostname
                    </label>
                    <input
                        id="computer-hostname"
                        type="text"
                        value={computerForm.hostname}
                        onChange={(e) => setComputerForm((f) => ({ ...f, hostname: e.target.value }))}
                        placeholder="Ej. WS-OFICINA-01"
                        className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="computer-bios_serial" className="text-muted-foreground text-xs font-medium">
                        Serial BIOS
                    </label>
                    <input
                        id="computer-bios_serial"
                        type="text"
                        value={computerForm.bios_serial}
                        onChange={(e) => setComputerForm((f) => ({ ...f, bios_serial: e.target.value }))}
                        placeholder="Serial del fabricante"
                        className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="computer-ip_address" className="text-muted-foreground text-xs font-medium">
                        Dirección IP
                    </label>
                    <input
                        id="computer-ip_address"
                        type="text"
                        value={computerForm.ip_address}
                        onChange={(e) => setComputerForm((f) => ({ ...f, ip_address: e.target.value }))}
                        placeholder="Ej. 192.168.1.10"
                        className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="computer-mac_address" className="text-muted-foreground text-xs font-medium">
                        Dirección MAC
                    </label>
                    <input
                        id="computer-mac_address"
                        type="text"
                        value={computerForm.mac_address}
                        onChange={(e) => setComputerForm((f) => ({ ...f, mac_address: e.target.value }))}
                        placeholder="Ej. 00:1A:2B:3C:4D:5E"
                        className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                    />
                </div>
                <div className="space-y-2 sm:col-span-2">
                    <span className="text-muted-foreground text-xs font-medium">Última vez visto (solo lectura)</span>
                    <p className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-sm text-foreground">
                        {computer?.last_seen_at ? formatDateShort(computer.last_seen_at) : '—'}
                    </p>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleSaveComputer}
                    disabled={savingComputer}
                    className="cursor-pointer rounded-md bg-inv-primary px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                >
                    {savingComputer ? 'Guardando…' : 'Guardar datos de equipo'}
                </button>
            </div>

            <div className="border-t border-border/70 pt-6">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Hardware detectado por el agente</h3>
                        <p className="text-muted-foreground text-xs">
                            Vista actual del equipo. El historial de envíos está en Auditoría → Reportes.
                        </p>
                    </div>
                    {snapshot && (
                        <button
                            type="button"
                            onClick={() => setShowRawJson((v) => !v)}
                            className="cursor-pointer text-xs font-medium text-inv-primary hover:underline"
                        >
                            {showRawJson ? 'Ocultar JSON' : 'Ver JSON'}
                        </button>
                    )}
                </div>

                {!snapshot ? (
                    <p className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                        Aún no hay snapshot de hardware. Cuando el agente reporte, aparecerá aquí (CPU, RAM, discos,
                        etc.).
                    </p>
                ) : (
                    <div className="space-y-4">
                        <dl className="grid gap-3 rounded-md border border-border/70 bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-3">
                            <InfoRow
                                label="Sistema"
                                value={text(os?.caption ?? os?.name)}
                            />
                            <InfoRow
                                label="Versión SO"
                                value={[os?.version, os?.build ? `build ${os.build}` : null]
                                    .filter(Boolean)
                                    .join(' · ') || '—'}
                            />
                            <InfoRow label="Arquitectura" value={text(os?.architecture)} />
                            <InfoRow label="Fabricante" value={text(snapshot.manufacturer)} />
                            <InfoRow label="Modelo" value={text(snapshot.model)} />
                            <InfoRow label="Agente" value={text(snapshot.agent_version)} />
                            <InfoRow label="CPU" value={text(cpu?.name)} />
                            <InfoRow
                                label="Núcleos / hilos"
                                value={
                                    cpu?.cores || cpu?.logical_processors
                                        ? `${text(cpu?.cores, '?')} / ${text(cpu?.logical_processors, '?')}`
                                        : '—'
                                }
                            />
                            <InfoRow
                                label="RAM total"
                                value={memory?.total_gb != null ? `${text(memory.total_gb)} GB` : '—'}
                            />
                            <InfoRow
                                label="Capturado"
                                value={formatDateTimeShort(
                                    typeof snapshot.collected_at === 'string' ? snapshot.collected_at : null,
                                )}
                            />
                        </dl>

                        {asArray(memory?.modules).length > 0 && (
                            <div>
                                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Módulos de memoria
                                </h4>
                                <div className="overflow-x-auto rounded-md border border-border/70">
                                    <table className="w-full min-w-[420px] text-left text-sm">
                                        <thead className="bg-muted/40 text-xs text-muted-foreground">
                                            <tr>
                                                <th className="px-3 py-2 font-medium">Capacidad</th>
                                                <th className="px-3 py-2 font-medium">Velocidad</th>
                                                <th className="px-3 py-2 font-medium">Fabricante</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {asArray(memory?.modules).map((mod, idx) => {
                                                const m = asRecord(mod);
                                                return (
                                                    <tr key={idx} className="border-t border-border/60">
                                                        <td className="px-3 py-2">
                                                            {m?.capacity_gb != null ? `${text(m.capacity_gb)} GB` : '—'}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {m?.speed_mhz != null ? `${text(m.speed_mhz)} MHz` : '—'}
                                                        </td>
                                                        <td className="px-3 py-2">{text(m?.manufacturer)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {disks.length > 0 && (
                            <div>
                                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Discos
                                </h4>
                                <div className="overflow-x-auto rounded-md border border-border/70">
                                    <table className="w-full min-w-[520px] text-left text-sm">
                                        <thead className="bg-muted/40 text-xs text-muted-foreground">
                                            <tr>
                                                <th className="px-3 py-2 font-medium">Modelo</th>
                                                <th className="px-3 py-2 font-medium">Tipo</th>
                                                <th className="px-3 py-2 font-medium">Capacidad</th>
                                                <th className="px-3 py-2 font-medium">Interfaz</th>
                                                <th className="px-3 py-2 font-medium">Serial</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {disks.map((disk, idx) => {
                                                const d = asRecord(disk);
                                                return (
                                                    <tr key={idx} className="border-t border-border/60">
                                                        <td className="px-3 py-2">{text(d?.model)}</td>
                                                        <td className="px-3 py-2 font-medium">{diskKindLabel(d)}</td>
                                                        <td className="px-3 py-2">
                                                            {d?.size_gb != null ? `${text(d.size_gb)} GB` : '—'}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {text(d?.bus || d?.interface)}
                                                        </td>
                                                        <td className="px-3 py-2 font-mono text-xs">{text(d?.serial)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {volumes.length > 0 && (
                            <div>
                                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Volúmenes
                                </h4>
                                <div className="overflow-x-auto rounded-md border border-border/70">
                                    <table className="w-full min-w-[420px] text-left text-sm">
                                        <thead className="bg-muted/40 text-xs text-muted-foreground">
                                            <tr>
                                                <th className="px-3 py-2 font-medium">Unidad</th>
                                                <th className="px-3 py-2 font-medium">FS</th>
                                                <th className="px-3 py-2 font-medium">Tamaño</th>
                                                <th className="px-3 py-2 font-medium">Libre</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {volumes.map((vol, idx) => {
                                                const v = asRecord(vol);
                                                return (
                                                    <tr key={idx} className="border-t border-border/60">
                                                        <td className="px-3 py-2">{text(v?.letter)}</td>
                                                        <td className="px-3 py-2">{text(v?.filesystem)}</td>
                                                        <td className="px-3 py-2">
                                                            {v?.size_gb != null ? `${text(v.size_gb)} GB` : '—'}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {v?.free_gb != null ? `${text(v.free_gb)} GB` : '—'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {adapters.length > 0 && (
                            <div>
                                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Adaptadores de red
                                </h4>
                                <div className="overflow-x-auto rounded-md border border-border/70">
                                    <table className="w-full min-w-[520px] text-left text-sm">
                                        <thead className="bg-muted/40 text-xs text-muted-foreground">
                                            <tr>
                                                <th className="px-3 py-2 font-medium">Nombre</th>
                                                <th className="px-3 py-2 font-medium">MAC</th>
                                                <th className="px-3 py-2 font-medium">IPs</th>
                                                <th className="px-3 py-2 font-medium">Principal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {adapters.map((adapter, idx) => {
                                                const a = asRecord(adapter);
                                                const ips = asArray(a?.ips)
                                                    .map((ip) => text(ip, ''))
                                                    .filter(Boolean)
                                                    .join(', ');
                                                return (
                                                    <tr key={idx} className="border-t border-border/60">
                                                        <td className="px-3 py-2">{text(a?.name)}</td>
                                                        <td className="px-3 py-2 font-mono text-xs">{text(a?.mac)}</td>
                                                        <td className="px-3 py-2 font-mono text-xs">{ips || '—'}</td>
                                                        <td className="px-3 py-2">{a?.is_primary ? 'Sí' : 'No'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {showRawJson && (
                            <pre className="max-h-80 overflow-auto rounded-md border border-border/70 bg-background p-3 text-[11px] leading-relaxed text-foreground">
                                {JSON.stringify(snapshot, null, 2)}
                            </pre>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
