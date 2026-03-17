import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Role } from '@/types';

type RoleFormProps = {
    role: Role | null;
    onClose: () => void;
};

export function RoleForm({ role, onClose }: RoleFormProps) {
    const isEdit = role != null;
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: role?.name ?? '',
        guard_name: 'web',
    });

    useEffect(() => {
        setData('name', role?.name ?? '');
    }, [role?.id, role?.name]);

    const isValid = data.name.trim().length > 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;
        if (isEdit && role) {
            put(`/admin/roles/${role.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        } else {
            post('/admin/roles', {
                preserveScroll: true,
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="guard_name" value="web" />
            <div className="space-y-2">
                <Label htmlFor="role-form-name">
                    Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="role-form-name"
                    name="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    required
                    maxLength={255}
                    placeholder="ej. editor"
                className={errors.name ? 'border-destructive focus-visible:ring-destructive' : 'border-inv-surface/40 focus-visible:ring-inv-primary'}
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer border-inv-surface/40"
                    onClick={onClose}
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={!isValid || processing}
                    className="cursor-pointer bg-inv-primary hover:bg-inv-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {processing ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear rol'}
                </Button>
            </div>
        </form>
    );
}
