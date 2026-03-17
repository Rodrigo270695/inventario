import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, useRef } from 'react';
import { AppModal } from '@/components/app-modal';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPT_TYPES = '.pdf,.doc,.docx';
const ACCEPT_REMISSION_TYPES = '.pdf';

type PurchaseOrderOption = {
    id: string;
    code: string | null;
    supplier_id: string;
    total_amount: string | number | null;
    supplier?: { id: string; name: string; ruc: string | null };
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchase_orders: PurchaseOrderOption[];
};

export function InvoiceFormModal({ open, onOpenChange, purchase_orders }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const remissionFileInputRef = useRef<HTMLInputElement>(null);
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        purchase_order_id: '',
        invoice_number: '',
        invoice_date: '',
        amount: '',
        remission_guide: '',
        remission_guide_file: null as File | null,
        document: null as File | null,
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
            purchase_order_id: '',
            invoice_number: '',
            invoice_date: '',
            amount: '',
            remission_guide: '',
            remission_guide_file: null,
            document: null,
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (remissionFileInputRef.current) remissionFileInputRef.current.value = '';
    }, [open]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setData('document', null);
            return;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            setData('document', null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext && !['pdf', 'doc', 'docx'].includes(ext)) {
            setData('document', null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        setData('document', file);
    };

    const handleRemissionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setData('remission_guide_file', null);
            return;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            setData('remission_guide_file', null);
            if (remissionFileInputRef.current) remissionFileInputRef.current.value = '';
            return;
        }
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext !== 'pdf') {
            setData('remission_guide_file', null);
            if (remissionFileInputRef.current) remissionFileInputRef.current.value = '';
            return;
        }
        setData('remission_guide_file', file);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/invoices', {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    };

    const canSubmit =
        data.purchase_order_id.trim() !== '' && data.invoice_number.trim() !== '';

    const purchaseOrderOptions = useMemo(
        () =>
            purchase_orders.map((po) => {
                const label = po.code
                    ? `${po.code}${po.supplier?.name ? ` - ${po.supplier.name}` : ''}`
                    : po.supplier?.name ?? po.id;
                return {
                    value: po.id,
                    label,
                    searchTerms: [po.code, po.supplier?.name, po.supplier?.ruc].filter(
                        Boolean
                    ) as string[],
                };
            }),
        [purchase_orders]
    );

    const handlePurchaseOrderChange = (value: string) => {
        setData('purchase_order_id', value);
        if (value) {
            const po = purchase_orders.find((p) => p.id === value);
            if (po != null && po.total_amount != null && po.total_amount !== '') {
                const num = typeof po.total_amount === 'number' ? po.total_amount : parseFloat(String(po.total_amount));
                setData('amount', Number.isNaN(num) ? '' : num.toFixed(2));
            } else {
                setData('amount', '');
            }
        } else {
            setData('amount', '');
        }
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title="Nueva factura"
            contentClassName="space-y-4"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label>
                        Orden de compra <span className="text-red-500">*</span>
                    </Label>
                    <SearchableSelect
                        value={data.purchase_order_id}
                        onChange={handlePurchaseOrderChange}
                        options={purchaseOrderOptions}
                        placeholder="Buscar orden de compra..."
                        noOptionsMessage="No hay coincidencias"
                        isClearable={true}
                        className={errors.purchase_order_id ? 'border-destructive' : ''}
                    />
                    {errors.purchase_order_id && (
                        <p className="text-sm text-destructive">
                            {errors.purchase_order_id}
                        </p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>
                        Número de factura <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        value={data.invoice_number}
                        onChange={(e) => setData('invoice_number', e.target.value)}
                        maxLength={100}
                        className={errors.invoice_number ? 'border-destructive' : ''}
                        placeholder="ej. F001-00001234"
                    />
                    {errors.invoice_number && (
                        <p className="text-sm text-destructive">{errors.invoice_number}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Fecha de factura</Label>
                    <Input
                        type="date"
                        value={data.invoice_date}
                        onChange={(e) => setData('invoice_date', e.target.value)}
                        className={errors.invoice_date ? 'border-destructive' : ''}
                    />
                    {errors.invoice_date && (
                        <p className="text-sm text-destructive">{errors.invoice_date}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Monto</Label>
                    <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={data.amount}
                        onChange={(e) => setData('amount', e.target.value)}
                        className={errors.amount ? 'border-destructive' : ''}
                        placeholder="0.00"
                    />
                    {errors.amount && (
                        <p className="text-sm text-destructive">{errors.amount}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Guía de remisión</Label>
                    <Input
                        value={data.remission_guide}
                        onChange={(e) => setData('remission_guide', e.target.value)}
                        maxLength={100}
                        className={errors.remission_guide ? 'border-destructive' : ''}
                        placeholder="ej. T001-00001234"
                    />
                    {errors.remission_guide && (
                        <p className="text-sm text-destructive">{errors.remission_guide}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Archivo de guía de remisión (PDF)</Label>
                    <p className="text-muted-foreground text-xs">
                        Máximo {MAX_FILE_SIZE_MB} MB. Solo formato PDF.
                    </p>
                    <input
                        ref={remissionFileInputRef}
                        type="file"
                        accept={ACCEPT_REMISSION_TYPES}
                        onChange={handleRemissionFileChange}
                        className="border-input flex h-9 w-full rounded-xl border bg-background/80 px-3 py-1.5 text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-inv-primary/10 file:px-3 file:py-1 file:text-inv-primary file:text-sm"
                    />
                    {data.remission_guide_file && (
                        <p className="text-muted-foreground text-xs">
                            Seleccionado: {data.remission_guide_file.name} (
                            {(data.remission_guide_file.size / 1024).toFixed(1)} KB)
                        </p>
                    )}
                    {errors.remission_guide_file && (
                        <p className="text-sm text-destructive">{errors.remission_guide_file}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Documento (PDF o Word)</Label>
                    <p className="text-muted-foreground text-xs">
                        Máximo {MAX_FILE_SIZE_MB} MB. Formatos: PDF, .doc, .docx
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPT_TYPES}
                        onChange={handleFileChange}
                        className="border-input flex h-9 w-full rounded-xl border bg-background/80 px-3 py-1.5 text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-inv-primary/10 file:px-3 file:py-1 file:text-inv-primary file:text-sm"
                    />
                    {data.document && (
                        <p className="text-muted-foreground text-xs">
                            Seleccionado: {data.document.name} (
                            {(data.document.size / 1024).toFixed(1)} KB)
                        </p>
                    )}
                    {errors.document && (
                        <p className="text-sm text-destructive">{errors.document}</p>
                    )}
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
                        {processing ? 'Guardando…' : 'Crear factura'}
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
