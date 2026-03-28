import { useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AppModal } from '@/components/app-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { AdminUser } from '@/types';

type RoleOption = { id: number; name: string };

const DOCUMENT_TYPES = [
    { value: 'dni', label: 'DNI' },
    { value: 'ce', label: 'CE' },
    { value: 'passport', label: 'Pasaporte' },
    { value: 'ruc', label: 'RUC' },
];

function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

type DuplicateTemplatePreview = {
    role_name: string | null;
    zonal_labels: string[];
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: AdminUser | null;
    /** Usuario origen: mismo rol, zonales y permisos efectivos (no los datos personales). */
    duplicateFrom: AdminUser | null;
    roles: RoleOption[];
};

const DNI_LENGTH = 8;
const DOCUMENT_NUMBER_MAX_LENGTH = 20;

/** Primera letra del nombre + primera palabra del apellido + inicial de la segunda palabra del apellido (si existe). Minúsculas. */
function usuarioFromNameAndLastName(name: string, lastName: string): string {
    const nameWords = name.trim().split(/\s+/).filter(Boolean);
    const lastWords = lastName.trim().split(/\s+/).filter(Boolean);
    const firstOfName = (nameWords[0]?.[0] ?? '').toLowerCase();
    const firstLast = (lastWords[0] ?? '').toLowerCase();
    const secondLastInitial =
        lastWords.length > 1 ? (lastWords[1]?.[0] ?? '').toLowerCase() : '';
    return `${firstOfName}${firstLast}${secondLastInitial}`;
}

export function UserFormModal({ open, onOpenChange, user, duplicateFrom, roles }: Props) {
    const isEdit = user != null;
    const isDuplicate = !isEdit && duplicateFrom != null;
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [dupPreview, setDupPreview] = useState<DuplicateTemplatePreview | null>(null);
    const [dupPreviewLoading, setDupPreviewLoading] = useState(false);
    const { data, setData, post, put, processing, errors, reset, clearErrors, transform } =
        useForm({
            name: user?.name ?? '',
            last_name: user?.last_name ?? '',
            usuario: user?.usuario ?? '',
            email: user?.email ?? '',
            password: '',
            password_confirmation: '',
            document_type: user?.document_type ?? 'dni',
            document_number: user?.document_number ?? '',
            phone: user?.phone ?? '',
            is_active: user?.is_active ?? true,
            role_id: user?.roles?.[0]?.id ?? '',
            duplicate_from_user_id: '',
        });

    useEffect(() => {
        if (!open) {
            clearErrors();
            return;
        }
        const timer = setTimeout(() => {
            document.body.style.pointerEvents = '';
        }, 0);
        return () => {
            clearTimeout(timer);
            document.body.style.pointerEvents = 'auto';
        };
    }, [open, clearErrors]);

    useEffect(() => {
        if (!open) return;
        setData({
            name: user?.name ?? '',
            last_name: user?.last_name ?? '',
            usuario: user?.usuario ?? '',
            email: user?.email ?? '',
            password: '',
            password_confirmation: '',
            document_type: user?.document_type ?? 'dni',
            document_number: user?.document_number ?? '',
            phone: user?.phone ?? '',
            is_active: user?.is_active ?? true,
            role_id: user?.roles?.[0]?.id ?? '',
            duplicate_from_user_id:
                user == null && duplicateFrom != null ? duplicateFrom.id : '',
        });
    }, [
        open,
        duplicateFrom?.id,
        user?.id,
        user?.name,
        user?.last_name,
        user?.usuario,
        user?.email,
        user?.document_type,
        user?.document_number,
        user?.phone,
        user?.is_active,
        user?.roles,
    ]);

    useEffect(() => {
        if (!open || !isDuplicate || !duplicateFrom) {
            setDupPreview(null);
            setDupPreviewLoading(false);
            return;
        }
        setDupPreview(null);
        setDupPreviewLoading(true);
        fetch(`/admin/users/${duplicateFrom.id}/duplicate-template`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': getCsrfToken(),
            },
            credentials: 'same-origin',
        })
            .then((r) => {
                if (!r.ok) throw new Error('fetch');
                return r.json() as Promise<DuplicateTemplatePreview>;
            })
            .then((data) => setDupPreview(data))
            .catch(() => setDupPreview(null))
            .finally(() => setDupPreviewLoading(false));
    }, [open, isDuplicate, duplicateFrom?.id]);

    const resetFormTransform = () => {
        transform((fd) => fd);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        /** Inertia v2: el cuerpo del POST es `transform(currentFormData)`; las opciones `data`/`transform` del visit no sustituyen el payload. */
        if (isEdit && user) {
            transform((fd) => {
                const next: Record<string, unknown> = {
                    name: fd.name,
                    last_name: fd.last_name,
                    usuario: fd.usuario,
                    email: fd.email,
                    document_type: fd.document_type,
                    document_number: fd.document_number,
                    phone: fd.phone ? fd.phone : null,
                    is_active: fd.is_active,
                    role_id: fd.role_id === '' ? undefined : Number(fd.role_id),
                };
                if (fd.password) {
                    next.password = fd.password;
                    next.password_confirmation = fd.password_confirmation;
                }
                return next as typeof fd;
            });
            put(`/admin/users/${user.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    resetFormTransform();
                    reset();
                    onOpenChange(false);
                },
                onFinish: () => resetFormTransform(),
            });
        } else {
            transform((fd) => {
                const next: Record<string, unknown> = {
                    name: fd.name,
                    last_name: fd.last_name,
                    usuario: fd.usuario,
                    email: fd.email,
                    document_type: fd.document_type,
                    document_number: fd.document_number,
                    phone: fd.phone ? fd.phone : null,
                    is_active: fd.is_active,
                };
                const dupId = fd.duplicate_from_user_id?.trim();
                if (dupId) {
                    next.duplicate_from_user_id = dupId;
                } else {
                    next.role_id = fd.role_id === '' ? undefined : Number(fd.role_id);
                }
                return next as typeof fd;
            });
            post('/admin/users', {
                preserveScroll: true,
                onSuccess: () => {
                    resetFormTransform();
                    reset();
                    onOpenChange(false);
                },
                onFinish: () => resetFormTransform(),
            });
        }
    };

    const passwordOk = isEdit
        ? (data.password === '' && data.password_confirmation === '') ||
          (data.password.length >= 8 && data.password === data.password_confirmation)
        : true;
    const canSubmit =
        data.name.trim() !== '' &&
        data.last_name.trim() !== '' &&
        data.usuario.trim() !== '' &&
        data.email.trim() !== '' &&
        data.document_number.trim() !== '' &&
        (isDuplicate || data.role_id !== '') &&
        passwordOk;

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title={
                isEdit
                    ? 'Editar usuario'
                    : isDuplicate
                      ? `Duplicar usuario (${duplicateFrom?.usuario ?? 'origen'})`
                      : 'Nuevo usuario'
            }
            contentClassName="space-y-4"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {isDuplicate && duplicateFrom ? (
                    <div className="space-y-2 rounded-md border border-inv-primary/30 bg-inv-primary/5 px-3 py-2 text-sm text-foreground dark:border-inv-primary/40 dark:bg-inv-primary/10">
                        <p className="font-medium">
                            Se copiarán el rol, los zonales y los permisos efectivos de{' '}
                            <span className="text-inv-primary">
                                {[duplicateFrom.name, duplicateFrom.last_name].filter(Boolean).join(' ')}
                            </span>{' '}
                            (<span className="tabular-nums">{duplicateFrom.usuario}</span>).
                        </p>
                        {dupPreviewLoading ? (
                            <p className="text-muted-foreground text-xs">Cargando resumen…</p>
                        ) : dupPreview ? (
                            <ul className="text-muted-foreground list-inside list-disc space-y-0.5 text-xs">
                                <li>
                                    Rol:{' '}
                                    <span className="font-medium text-foreground">
                                        {dupPreview.role_name ?? '—'}
                                    </span>
                                </li>
                                <li>
                                    Zonales:{' '}
                                    {dupPreview.zonal_labels.length > 0
                                        ? dupPreview.zonal_labels.join(', ')
                                        : 'ninguno'}
                                </li>
                            </ul>
                        ) : null}
                    </div>
                ) : null}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Nombre <span className="text-red-500">*</span></Label>
                        <Input
                            value={data.name}
                            onChange={(e) => {
                                const name = e.target.value.toUpperCase();
                                if (isEdit) {
                                    setData('name', name);
                                } else {
                                    setData((prev) => ({
                                        ...prev,
                                        name,
                                        usuario: usuarioFromNameAndLastName(name, prev.last_name),
                                    }));
                                }
                            }}
                            maxLength={255}
                            className={errors.name ? 'border-destructive' : ''}
                            placeholder="Nombre (mayúsculas)"
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">{errors.name}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>Apellido <span className="text-red-500">*</span></Label>
                        <Input
                            value={data.last_name}
                            onChange={(e) => {
                                const lastName = e.target.value.toUpperCase();
                                if (isEdit) {
                                    setData('last_name', lastName);
                                } else {
                                    setData((prev) => ({
                                        ...prev,
                                        last_name: lastName,
                                        usuario: usuarioFromNameAndLastName(prev.name, lastName),
                                    }));
                                }
                            }}
                            maxLength={255}
                            className={errors.last_name ? 'border-destructive' : ''}
                            placeholder="Apellido (mayúsculas)"
                        />
                        {errors.last_name && (
                            <p className="text-sm text-destructive">{errors.last_name}</p>
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Usuario (login) <span className="text-red-500">*</span></Label>
                    <Input
                        value={data.usuario}
                        onChange={(e) => setData('usuario', e.target.value.toLowerCase())}
                        maxLength={255}
                        className={errors.usuario ? 'border-destructive' : ''}
                        placeholder="usuario"
                    />
                    {errors.usuario && (
                        <p className="text-sm text-destructive">{errors.usuario}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Correo electrónico <span className="text-red-500">*</span></Label>
                    <Input
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        maxLength={255}
                        className={errors.email ? 'border-destructive' : ''}
                        placeholder="email@ejemplo.com"
                    />
                    {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                </div>
                {!isEdit ? (
                    <p className="text-muted-foreground text-sm rounded-md border border-border bg-muted/40 px-3 py-2">
                        La contraseña se generará automáticamente y se enviará al correo indicado junto con el usuario de acceso.
                    </p>
                ) : null}
                {isEdit && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Nueva contraseña</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    className={`pr-10 ${errors.password ? 'border-destructive' : ''}`}
                                    placeholder="Dejar en blanco para no cambiar"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                                >
                                    {showPassword ? (
                                        <EyeOff className="size-4" />
                                    ) : (
                                        <Eye className="size-4" />
                                    )}
                                </Button>
                            </div>
                            {errors.password && (
                                <p className="text-sm text-destructive">{errors.password}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Confirmar nueva contraseña</Label>
                            <div className="relative">
                                <Input
                                    type={showPasswordConfirm ? 'text' : 'password'}
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    className={`pr-10 ${errors.password_confirmation ? 'border-destructive' : ''}`}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowPasswordConfirm((v) => !v)}
                                    aria-label={showPasswordConfirm ? 'Ocultar contraseña' : 'Ver contraseña'}
                                >
                                    {showPasswordConfirm ? (
                                        <EyeOff className="size-4" />
                                    ) : (
                                        <Eye className="size-4" />
                                    )}
                                </Button>
                            </div>
                            {errors.password_confirmation && (
                                <p className="text-sm text-destructive">
                                    {errors.password_confirmation}
                                </p>
                            )}
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Tipo documento <span className="text-red-500">*</span></Label>
                        <Select
                            value={data.document_type}
                            onValueChange={(v) => {
                                setData('document_type', v);
                                if (v === 'dni') {
                                    setData(
                                        'document_number',
                                        data.document_number.replace(/\D/g, '').slice(0, DNI_LENGTH)
                                    );
                                }
                            }}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DOCUMENT_TYPES.map((d) => (
                                    <SelectItem key={d.value} value={d.value}>
                                        {d.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Nº documento <span className="text-red-500">*</span></Label>
                        <div className="relative flex items-center">
                            <Input
                                type="text"
                                inputMode={data.document_type === 'dni' ? 'numeric' : 'text'}
                                value={data.document_number}
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    if (data.document_type === 'dni') {
                                        setData(
                                            'document_number',
                                            raw.replace(/\D/g, '').slice(0, DNI_LENGTH)
                                        );
                                    } else {
                                        setData('document_number', raw.slice(0, DOCUMENT_NUMBER_MAX_LENGTH));
                                    }
                                }}
                                maxLength={data.document_type === 'dni' ? DNI_LENGTH : DOCUMENT_NUMBER_MAX_LENGTH}
                                className={`pr-12 ${errors.document_number ? 'border-destructive' : ''}`}
                                placeholder={
                                    data.document_type === 'dni'
                                        ? 'Solo 8 números'
                                        : 'Número'
                                }
                            />
                            <span
                                className="absolute right-3 text-muted-foreground text-xs tabular-nums pointer-events-none"
                                aria-hidden
                            >
                                {data.document_type === 'dni'
                                    ? `${data.document_number.replace(/\D/g, '').length}/${DNI_LENGTH}`
                                    : `${data.document_number.length}/${DOCUMENT_NUMBER_MAX_LENGTH}`}
                            </span>
                        </div>
                        {errors.document_number && (
                            <p className="text-sm text-destructive">{errors.document_number}</p>
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Teléfono (9 dígitos)</Label>
                    <Input
                        value={data.phone}
                        onChange={(e) => setData('phone', e.target.value.replace(/\D/g, '').slice(0, 9))}
                        maxLength={9}
                        className={errors.phone ? 'border-destructive' : ''}
                        placeholder="912345678"
                    />
                    {errors.phone && (
                        <p className="text-sm text-destructive">{errors.phone}</p>
                    )}
                </div>
                {!isDuplicate ? (
                    <div className="space-y-2">
                        <Label>Rol <span className="text-red-500">*</span></Label>
                        <Select
                            value={data.role_id === '' ? '_' : String(data.role_id)}
                            onValueChange={(v) => setData('role_id', v === '_' ? '' : v)}
                        >
                            <SelectTrigger className="w-full border-border bg-background">
                                <SelectValue placeholder="Seleccione rol" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_">Seleccione rol</SelectItem>
                                {roles.map((r) => (
                                    <SelectItem key={r.id} value={String(r.id)}>
                                        {r.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.role_id && (
                            <p className="text-sm text-destructive">{errors.role_id}</p>
                        )}
                    </div>
                ) : null}
                {errors.duplicate_from_user_id && (
                    <p className="text-sm text-destructive">{errors.duplicate_from_user_id}</p>
                )}
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setData('is_active', !data.is_active)}
                >
                    <input
                        type="checkbox"
                        id="user-is_active"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                        className="cursor-pointer rounded border-border size-4 accent-inv-primary"
                    />
                    <Label htmlFor="user-is_active" className="cursor-pointer">
                        Activo
                    </Label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="cursor-pointer"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={processing || !canSubmit}
                        className="cursor-pointer bg-inv-primary hover:bg-inv-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing
                            ? 'Guardando…'
                            : isEdit
                              ? 'Guardar'
                              : isDuplicate
                                ? 'Crear usuario duplicado'
                                : 'Crear usuario'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
