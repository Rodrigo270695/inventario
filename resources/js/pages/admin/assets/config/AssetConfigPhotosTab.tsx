import { router } from '@inertiajs/react';
import { Image as ImageIcon, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DeleteConfirmModal } from '@/components/delete-confirm-modal';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { AssetConfigAsset, AssetConfigPhoto } from './types';
import { formatDateShort } from './utils';

const PHOTO_TYPE_OPTIONS = [
    { value: '', label: '—' },
    { value: 'general', label: 'General' },
    { value: 'etiqueta', label: 'Etiqueta' },
    { value: 'serial', label: 'Serial' },
    { value: 'daño', label: 'Daño' },
    { value: 'otro', label: 'Otro' },
];

type Props = {
    asset: AssetConfigAsset;
    photos: AssetConfigPhoto[];
};

export function AssetConfigPhotosTab({ asset, photos }: Props) {
    const [caption, setCaption] = useState('');
    const [type, setType] = useState('');
    const [uploading, setUploading] = useState(false);
    const [hasFile, setHasFile] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [photoToDelete, setPhotoToDelete] = useState<AssetConfigPhoto | null>(null);
    const [lightboxPhoto, setLightboxPhoto] = useState<AssetConfigPhoto | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const file = fileInputRef.current?.files?.[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('photo', file);
        if (caption.trim()) formData.append('caption', caption.trim());
        if (type.trim()) formData.append('type', type.trim());
        router.post(`/admin/assets/${asset.id}/photos`, formData, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setUploading(false),
            onSuccess: () => {
                setCaption('');
                setType('');
                setHasFile(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
        });
    };

    const handleConfirmDelete = () => {
        if (!photoToDelete) return;
        setDeletingId(photoToDelete.id);
        router.delete(`/admin/assets/${asset.id}/photos/${photoToDelete.id}`, {
            preserveScroll: true,
            onSuccess: () => setPhotoToDelete(null),
            onFinish: () => {
                setDeletingId(null);
                setPhotoToDelete(null);
            },
        });
    };

    const photoUrl = (path: string) => `/storage/${path}`;

    useEffect(() => {
        if (!lightboxPhoto) return;
        const onEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setLightboxPhoto(null);
        };
        window.addEventListener('keydown', onEscape);
        return () => window.removeEventListener('keydown', onEscape);
    }, [lightboxPhoto]);

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="rounded-xl border border-inv-primary/40 bg-inv-primary/5 p-4">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Subir foto</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                            <label htmlFor="photo-file" className="text-muted-foreground text-xs font-medium">
                                Archivo
                            </label>
                            <input
                                id="photo-file"
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                required
                                className="flex h-9 w-full min-h-9 cursor-pointer items-center rounded-md border border-border/70 bg-background px-3 py-0 text-sm text-foreground shadow-sm file:mr-2 file:cursor-pointer file:rounded file:border-0 file:bg-inv-primary/20 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-inv-primary focus:outline-none focus:ring-1 focus:ring-inv-primary"
                                onChange={(e) => setHasFile(!!e.target.files?.[0])}
                            />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="photo-caption" className="text-muted-foreground text-xs font-medium">
                                Descripción
                            </label>
                            <input
                                id="photo-caption"
                                type="text"
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                maxLength={255}
                                placeholder="Opcional"
                                className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-inv-primary focus:ring-1 focus:ring-inv-primary"
                            />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="photo-type" className="text-muted-foreground text-xs font-medium">
                                Tipo
                            </label>
                            <Select value={type === '' ? '_' : type} onValueChange={(v) => setType(v === '_' ? '' : v)}>
                                <SelectTrigger
                                    id="photo-type"
                                    className="w-full border-border/70 bg-background px-3 py-2 text-sm"
                                >
                                    <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PHOTO_TYPE_OPTIONS.map((o) => (
                                        <SelectItem key={o.value || '_'} value={o.value || '_'}>
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                disabled={uploading || !hasFile}
                                className="w-full cursor-pointer rounded-md bg-inv-primary px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                            >
                                {uploading ? 'Subiendo…' : 'Subir'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            <h2 className="text-sm font-semibold text-foreground">Fotos del activo</h2>
            {photos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Aún no se han registrado fotos para este activo.
                </p>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {photos.map((photo) => (
                        <div
                            key={photo.id}
                            className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm"
                        >
                            <div
                                className="relative flex aspect-video cursor-pointer items-center justify-center overflow-hidden bg-muted/40"
                                role="button"
                                tabIndex={0}
                                onClick={() => photo.path && setLightboxPhoto(photo)}
                                onKeyDown={(e) =>
                                    photo.path && (e.key === 'Enter' || e.key === ' ') && setLightboxPhoto(photo)
                                }
                                aria-label="Ver imagen a tamaño completo"
                            >
                                {photo.path ? (
                                    <img
                                        src={photoUrl(photo.path)}
                                        alt={photo.caption || 'Foto del activo'}
                                        className="h-full w-full object-cover pointer-events-none"
                                    />
                                ) : (
                                    <ImageIcon className="size-10 text-muted-foreground" />
                                )}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPhotoToDelete(photo);
                                    }}
                                    disabled={deletingId === photo.id}
                                    className="absolute right-2 top-2 flex size-8 cursor-pointer items-center justify-center rounded-md bg-red-500/90 text-white shadow hover:bg-red-600 disabled:opacity-50"
                                    aria-label="Eliminar foto"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            </div>
                            <div className="px-3 py-2">
                                <p className="text-xs font-medium text-foreground line-clamp-2">
                                    {photo.caption || 'Sin descripción'}
                                </p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    {photo.type ?? '—'} · {formatDateShort(photo.created_at)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <DeleteConfirmModal
                open={photoToDelete != null}
                onOpenChange={(open) => !open && setPhotoToDelete(null)}
                title="Eliminar foto"
                description="¿Está seguro de eliminar esta foto? Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={handleConfirmDelete}
                loading={deletingId !== null}
            />

            {lightboxPhoto?.path && (
                <div
                    className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/80 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Ver imagen"
                    onClick={() => setLightboxPhoto(null)}
                >
                    <img
                        src={photoUrl(lightboxPhoto.path)}
                        alt={lightboxPhoto.caption || 'Foto del activo'}
                        className="max-h-full max-w-full cursor-default object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
