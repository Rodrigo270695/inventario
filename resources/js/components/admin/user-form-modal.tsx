import { useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AppModal } from '@/components/app-modal';
import { Toast, type ToastMessage } from '@/components/toast';
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

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: AdminUser | null;
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

export function UserFormModal({ open, onOpenChange, user, roles }: Props) {
    const isEdit = user != null;
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [validationToast, setValidationToast] = useState<ToastMessage | null>(null);
    const prevProcessingRef = useRef(false);
    const { data, setData, post, put, processing, errors, reset, clearErrors, hasErrors } = useForm({
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
    });

    useEffect(() => {
        if (!open) {
            setValidationToast(null);
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
        });
    }, [
        open,
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
        if (
            prevProcessingRef.current &&
            !processing &&
            open &&
            hasErrors
        ) {
            setValidationToast({
                type: 'error',
                message: 'Revisa los campos marcados en el formulario.',
            });
        }
        prevProcessingRef.current = processing;
    }, [processing, hasErrors, open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setValidationToast(null);
        const payload: Record<string, unknown> = {
            name: data.name,
            last_name: data.last_name,
            usuario: data.usuario,
            email: data.email,
            document_type: data.document_type,
            document_number: data.document_number,
            phone: data.phone || null,
            is_active: data.is_active,
            role_id: data.role_id === '' ? undefined : Number(data.role_id),
        };
        if (isEdit && user) {
            if (data.password) {
                payload.password = data.password;
                payload.password_confirmation = data.password_confirmation;
            }
            put(`/admin/users/${user.id}`, {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        } else {
            payload.password = data.password;
            payload.password_confirmation = data.password_confirmation;
            post('/admin/users', {
                preserveScroll: true,
                data: payload,
                transform: () => payload,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        }
    };

    const passwordOk = isEdit
        ? (data.password === '' && data.password_confirmation === '') ||
          (data.password.length >= 8 && data.password === data.password_confirmation)
        : data.password.length >= 8 && data.password === data.password_confirmation;
    const canSubmit =
        data.name.trim() !== '' &&
        data.last_name.trim() !== '' &&
        data.usuario.trim() !== '' &&
        data.email.trim() !== '' &&
        data.document_number.trim() !== '' &&
        data.role_id !== '' &&
        passwordOk;

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
            contentClassName="space-y-4"
        >
            {validationToast ? (
                <div className="relative z-10 -mt-1 mb-2">
                    <Toast
                        toast={validationToast}
                        onDismiss={() => setValidationToast(null)}
                        duration={5000}
                    />
                </div>
            ) : null}
            <form onSubmit={handleSubmit} className="space-y-4">
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
                {!isEdit && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Contraseña <span className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    className={`pr-10 ${errors.password ? 'border-destructive' : ''}`}
                                    placeholder="Mínimo 8 caracteres"
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
                            <Label>Confirmar contraseña <span className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Input
                                    type={showPasswordConfirm ? 'text' : 'password'}
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    className={`pr-10 ${errors.password_confirmation ? 'border-destructive' : ''}`}
                                    placeholder="Repetir contraseña"
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
                              : 'Crear usuario'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
