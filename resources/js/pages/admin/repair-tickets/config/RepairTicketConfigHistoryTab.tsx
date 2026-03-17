import type { RepairTicketConfigTicket, RepairTicketStatusLog } from './types';
import {
    EVENT_TYPE_LABELS,
    STATUS_LABELS,
    formatDateTimeShort,
    fullDisplayName,
} from './utils';

type Props = {
    repairTicket: RepairTicketConfigTicket;
    statusLogs: RepairTicketStatusLog[];
};

export function RepairTicketConfigHistoryTab({ repairTicket, statusLogs }: Props) {
    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border/80 bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Creado</p>
                    <p className="mt-1 text-sm text-foreground">{formatDateTimeShort(repairTicket.created_at)}</p>
                </div>
                <div className="rounded-xl border border-border/80 bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Diagnóstico</p>
                    <p className="mt-1 text-sm text-foreground">{formatDateTimeShort(repairTicket.diagnosed_at)}</p>
                </div>
                <div className="rounded-xl border border-border/80 bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Inicio reparación</p>
                    <p className="mt-1 text-sm text-foreground">{formatDateTimeShort(repairTicket.started_at)}</p>
                </div>
                <div className="rounded-xl border border-border/80 bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Cierre</p>
                    <p className="mt-1 text-sm text-foreground">
                        {formatDateTimeShort(repairTicket.completed_at || repairTicket.cancelled_at || repairTicket.rejected_at)}
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">Historial del ticket</h2>
                {statusLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aún no hay eventos registrados para este ticket.</p>
                ) : (
                    <ol className="space-y-3">
                        {statusLogs.map((log) => (
                            <li key={log.id} className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-foreground">
                                            {EVENT_TYPE_LABELS[log.event_type] ?? log.event_type}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {log.from_status ? `${STATUS_LABELS[log.from_status] ?? log.from_status} → ` : ''}
                                            {log.to_status ? STATUS_LABELS[log.to_status] ?? log.to_status : 'Sin cambio de estado'}
                                        </p>
                                        {log.comment && (
                                            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{log.comment}</p>
                                        )}
                                    </div>
                                    <div className="text-right text-xs text-muted-foreground">
                                        <p>{formatDateTimeShort(log.created_at)}</p>
                                        <p>{fullDisplayName(log.performed_by)}</p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </div>
    );
}
