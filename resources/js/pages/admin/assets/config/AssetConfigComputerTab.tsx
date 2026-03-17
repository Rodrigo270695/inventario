import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { AssetConfigAsset } from './types';
import { formatDateShort } from './utils';

type Props = {
    asset: AssetConfigAsset;
};

export function AssetConfigComputerTab({ asset }: Props) {
    const computer = asset.computer ?? null;
    const [savingComputer, setSavingComputer] = useState(false);
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

    const handleSaveComputer = () => {
        setSavingComputer(true);
        router.put(`/admin/assets/${asset.id}/computer`, {
            hostname: computerForm.hostname.trim() || null,
            bios_serial: computerForm.bios_serial.trim() || null,
            ip_address: computerForm.ip_address.trim() || null,
            mac_address: computerForm.mac_address.trim() || null,
        }, {
            preserveScroll: true,
            onFinish: () => setSavingComputer(false),
        });
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <h2 className="text-sm font-semibold text-foreground">Datos de equipo</h2>
            <p className="text-muted-foreground text-xs">
                Registro opcional para equipos de cómputo: hostname, serial BIOS, IP y MAC.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <label
                        htmlFor="computer-hostname"
                        className="text-muted-foreground text-xs font-medium"
                    >
                        Hostname
                    </label>
                    <input
                        id="computer-hostname"
                        type="text"
                        value={computerForm.hostname}
                        onChange={(e) =>
                            setComputerForm((f) => ({ ...f, hostname: e.target.value }))
                        }
                        placeholder="Ej. WS-OFICINA-01"
                        className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                    />
                </div>
                <div className="space-y-2">
                    <label
                        htmlFor="computer-bios_serial"
                        className="text-muted-foreground text-xs font-medium"
                    >
                        Serial BIOS
                    </label>
                    <input
                        id="computer-bios_serial"
                        type="text"
                        value={computerForm.bios_serial}
                        onChange={(e) =>
                            setComputerForm((f) => ({ ...f, bios_serial: e.target.value }))
                        }
                        placeholder="Serial del fabricante"
                        className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                    />
                </div>
                <div className="space-y-2">
                    <label
                        htmlFor="computer-ip_address"
                        className="text-muted-foreground text-xs font-medium"
                    >
                        Dirección IP
                    </label>
                    <input
                        id="computer-ip_address"
                        type="text"
                        value={computerForm.ip_address}
                        onChange={(e) =>
                            setComputerForm((f) => ({ ...f, ip_address: e.target.value }))
                        }
                        placeholder="Ej. 192.168.1.10"
                        className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                    />
                </div>
                <div className="space-y-2">
                    <label
                        htmlFor="computer-mac_address"
                        className="text-muted-foreground text-xs font-medium"
                    >
                        Dirección MAC
                    </label>
                    <input
                        id="computer-mac_address"
                        type="text"
                        value={computerForm.mac_address}
                        onChange={(e) =>
                            setComputerForm((f) => ({ ...f, mac_address: e.target.value }))
                        }
                        placeholder="Ej. 00:1A:2B:3C:4D:5E"
                        className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                    />
                </div>
                <div className="space-y-2 sm:col-span-2">
                    <span className="text-muted-foreground text-xs font-medium">
                        Última vez visto (solo lectura)
                    </span>
                    <p className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-sm text-foreground">
                        {computer?.last_seen_at
                            ? formatDateShort(computer.last_seen_at)
                            : '—'}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                        Se actualiza cuando un agente o proceso detecta el equipo; no es editable
                        desde aquí.
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
        </div>
    );
}
