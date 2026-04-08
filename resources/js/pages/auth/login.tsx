import { Form, Head } from '@inertiajs/react';
import {
    AlertCircle,
    Eye,
    EyeOff,
    Lock,
    Server,
    ShieldCheck,
    User,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';

type Props = {
    status?: string;
};

export default function Login({ status }: Props) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <>
            <Head title="Iniciar sesión" />

            <div className="relative flex min-h-svh flex-col overflow-hidden bg-inv-bg font-sans selection:bg-inv-primary/30 selection:text-white lg:flex-row">
                {/* Fondo: mesh con paleta navy */}
                <div
                    className="login-motion-safe pointer-events-none fixed inset-0"
                    aria-hidden
                    style={{
                        background: `
                          radial-gradient(ellipse 120% 80% at 5% 15%, rgba(var(--inv-primary-rgb), 0.25) 0%, transparent 45%),
                          radial-gradient(ellipse 90% 70% at 95% 85%, rgba(var(--inv-surface-rgb), 0.2) 0%, transparent 45%),
                          radial-gradient(ellipse 80% 60% at 50% 105%, rgba(var(--inv-section-rgb), 0.3) 0%, transparent 50%)
                        `,
                        animation: 'login-ambient 14s ease-in-out infinite',
                    }}
                />
                <div
                    className="pointer-events-none fixed inset-0 opacity-[0.025] mix-blend-overlay"
                    aria-hidden
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                    }}
                />

                {/* ——— PANEL IZQUIERDO: hero visual + contenido editorial ——— */}
                <div className="relative hidden min-h-svh flex-1 flex-col justify-between overflow-hidden lg:flex">
                    {/* Patrón de rejilla diagonal (estructura) */}
                    <div
                        className="absolute inset-0 opacity-[0.04]"
                        style={{
                            backgroundImage: `
                              linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
                            `,
                            backgroundSize: '48px 48px',
                        }}
                    />
                    <div className="absolute inset-0 bg-linear-to-br from-inv-section/60 via-transparent to-transparent" />

                    {/* Orb flotante — paleta navy */}
                    <div
                        className="login-motion-safe absolute -left-1/4 top-1/3 h-[480px] w-[480px] rounded-full opacity-90"
                        style={{
                            background: 'radial-gradient(circle at 30% 30%, rgba(var(--inv-primary-rgb), 0.4), rgba(var(--inv-surface-rgb), 0.25) 40%, transparent 70%)',
                            filter: 'blur(40px)',
                            animation: 'login-orb-float 20s ease-in-out infinite',
                        }}
                        aria-hidden
                    />
                    <div
                        className="login-motion-safe absolute bottom-1/4 right-0 h-64 w-64 rounded-full opacity-60"
                        style={{
                            background: 'radial-gradient(circle at 70% 70%, rgba(var(--inv-surface-rgb), 0.35), transparent 70%)',
                            filter: 'blur(32px)',
                            animation: 'login-orb-float 18s ease-in-out infinite reverse',
                        }}
                        aria-hidden
                    />

                    {/* Logo */}
                    <header className="relative z-10 flex items-center gap-3 p-10 xl:p-14">
                        <img
                            src="/apple-touch-icon.png"
                            alt="Logo Macga"
                            className="h-12 w-12 rounded-2xl object-cover ring-1 ring-white/20 shadow-lg shadow-black/30"
                        />
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold tracking-tight text-white">
                                Inventario
                            </span>
                            <span className="rounded-lg bg-inv-primary/30 px-2 py-0.5 text-sm font-semibold text-inv-primary ring-1 ring-inv-primary/50 transition-colors duration-300 hover:bg-inv-primary/40 hover:ring-inv-primary">
                                TI
                            </span>
                        </div>
                    </header>

                    {/* Bloque editorial: título + descripción + pills */}
                    <div className="relative z-10 px-10 pb-20 xl:px-16 xl:pb-24">
                        <h2 className="text-4xl font-bold leading-[1.1] tracking-tight text-white drop-shadow-sm xl:text-5xl">
                            Sistema inventario de activos
                            <br />
                            <span className="bg-linear-to-r from-inv-primary via-[#5a8baa] to-inv-primary bg-clip-text text-transparent drop-shadow-sm">
                                y no activos
                            </span>
                        </h2>
                        <p className="mt-6 max-w-md text-base leading-relaxed text-slate-400">
                            Control de activos, almacenes y ciclo de vida en un solo sistema.
                        </p>
                        {/* Pills de valor (bento-style) con hover */}
                        <div className="mt-10 flex flex-wrap gap-3">
                            {['Activos', 'Almacenes', 'Ciclo de vida'].map((label) => (
                                <span
                                    key={label}
                                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
                                >
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ——— PANEL DERECHO: una sola card flotante con glow ——— */}
                <div className="relative flex min-h-svh flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-16">
                    {/* Marca en móvil (cuando no se ve el panel izquierdo) */}
                    <div className="absolute left-0 right-0 top-6 z-0 flex justify-center lg:hidden">
                        <div className="flex items-center gap-2 rounded-xl bg-inv-section/50 px-4 py-2 backdrop-blur-sm ring-1 ring-white/10">
                            <img
                                src="/apple-touch-icon.png"
                                alt="Logo Macga"
                                className="h-5 w-5 rounded-md object-cover ring-1 ring-white/20"
                            />
                            <span className="text-sm font-semibold text-white">Inventario TI</span>
                        </div>
                    </div>
                    {/* Glow detrás de la card (flotación real) */}
                    <div
                        className="login-motion-safe absolute left-1/2 top-1/2 h-[420px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-4xl opacity-60"
                        style={{
                            background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(var(--inv-primary-rgb), 0.4), transparent 70%)',
                            filter: 'blur(56px)',
                            animation: 'login-card-float 6s ease-in-out infinite',
                        }}
                        aria-hidden
                    />

                    <div className="relative w-full max-w-[400px]">
                        {/* Una sola card: header + form + divider + trust */}
                        <div className="login-motion-safe animate-in fade-in-0 slide-in-from-bottom-6 duration-600">
                            <div className="group/card relative overflow-hidden rounded-3xl border border-white/10 bg-inv-section/90 shadow-2xl shadow-black/50 ring-1 ring-white/5 backdrop-blur-2xl transition-all duration-300 hover:border-inv-primary/30 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(68,119,148,0.15)]">
                                {/* Borde superior en gradiente animado */}
                                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-inv-primary/60 to-transparent login-motion-safe opacity-80" style={{ animation: 'login-border-shine 3s ease-in-out infinite' }} aria-hidden />
                                {/* Header integrado (sin card aparte) */}
                                <div className="border-b border-white/10 px-6 py-6 sm:px-8 sm:py-7">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-inv-surface to-inv-primary text-white shadow-lg shadow-inv-primary/30 ring-1 ring-white/20 transition-transform duration-300 group-hover/card:scale-105">
                                            <img
                                                src="/apple-touch-icon.png"
                                                alt="Logo Macga"
                                                className="h-8 w-8 rounded-lg object-cover"
                                            />
                                        </div>
                                        <div>
                                            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                                                Iniciar sesión
                                            </h1>
                                            <p className="text-sm text-slate-400">
                                                Accede al sistema de inventario
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Formulario: inputs estilo underline (diseño distinto) */}
                                <div className="px-6 py-6 sm:px-8 sm:py-7">
                                    <Form
                                        {...store.form()}
                                        resetOnSuccess={['password']}
                                        className="relative flex flex-col gap-5"
                                    >
                                        {({ processing, errors }) => (
                                            <>
                                                {processing && (
                                                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-inv-section/90 backdrop-blur-sm" aria-live="polite">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <Spinner className="h-8 w-8 text-inv-primary" />
                                                            <span className="text-sm font-medium text-slate-300">Iniciando sesión…</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {status && (
                                                    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 px-3 py-2.5 text-sm text-emerald-200 ring-1 ring-emerald-400/40 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                                                        <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
                                                        <span>{status}</span>
                                                    </div>
                                                )}

                                                {/* Usuario — underline */}
                                                <div className="space-y-1">
                                                    <Label htmlFor="usuario" className="text-xs font-medium uppercase tracking-wider text-slate-400">
                                                        Usuario
                                                    </Label>
                                                    <div className="relative group rounded-sm transition-colors duration-200 hover:border-white/30">
                                                        <User className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors duration-200 group-focus-within:text-inv-primary group-hover:text-slate-400" />
                                                        <Input
                                                            id="usuario"
                                                            type="text"
                                                            name="usuario"
                                                            required
                                                            autoFocus
                                                            tabIndex={1}
                                                            autoComplete="username"
                                                            placeholder="tu_usuario"
                                                            className="h-11 border-0 border-b-2 border-white/20 bg-transparent pl-8 pr-0 pb-2 pt-1 text-white placeholder:text-slate-500 rounded-none transition-[border-color,color] duration-200 hover:border-white/30 focus:border-inv-primary focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:border-inv-primary focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                                        />
                                                    </div>
                                                    {errors.usuario && (
                                                        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-2 py-1.5 text-sm text-red-400 ring-1 ring-red-400/30 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                                                            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                                            <span>{errors.usuario}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Contraseña — underline */}
                                                <div className="space-y-1">
                                                    <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-slate-400">
                                                        Contraseña
                                                    </Label>
                                                    <div className="relative group rounded-sm transition-colors duration-200 hover:border-white/30">
                                                        <Lock className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors duration-200 group-focus-within:text-inv-primary group-hover:text-slate-400" />
                                                        <Input
                                                            id="password"
                                                            type={showPassword ? 'text' : 'password'}
                                                            name="password"
                                                            required
                                                            tabIndex={2}
                                                            autoComplete="current-password"
                                                            placeholder="••••••••"
                                                            className="h-11 border-0 border-b-2 border-white/20 bg-transparent pl-8 pr-10 pb-2 pt-1 text-white placeholder:text-slate-500 rounded-none transition-[border-color,color] duration-200 hover:border-white/30 focus:border-inv-primary focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:border-inv-primary focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                                        />
                                                        <button
                                                            type="button"
                                                            tabIndex={3}
                                                            onClick={() => setShowPassword((v) => !v)}
                                                            className="absolute right-0 top-1/2 -translate-y-1/2 cursor-pointer p-1.5 text-slate-500 transition-all duration-200 hover:scale-110 hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-inv-primary/50 focus:ring-offset-2 focus:ring-offset-inv-section rounded"
                                                            aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                                                        >
                                                            {showPassword ? (
                                                                <EyeOff className="h-4 w-4" aria-hidden />
                                                            ) : (
                                                                <Eye className="h-4 w-4" aria-hidden />
                                                            )}
                                                        </button>
                                                    </div>
                                                    {errors.password && (
                                                        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-2 py-1.5 text-sm text-red-400 ring-1 ring-red-400/30 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                                                            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                                            <span>{errors.password}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        id="remember"
                                                        name="remember"
                                                        tabIndex={4}
                                                        className="rounded border-slate-500 bg-white/5 transition-colors duration-200 hover:bg-white/10 data-[state=checked]:bg-inv-primary data-[state=checked]:border-inv-primary focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2 focus-visible:ring-offset-inv-section"
                                                    />
                                                    <Label
                                                        htmlFor="remember"
                                                        className="cursor-pointer text-sm text-slate-400 transition-colors duration-200 hover:text-slate-300"
                                                    >
                                                        Mantener sesión iniciada
                                                    </Label>
                                                </div>

                                                <Button
                                                    type="submit"
                                                    className="h-12 w-full cursor-pointer rounded-xl bg-linear-to-r from-inv-surface to-inv-primary font-semibold text-white shadow-lg shadow-inv-primary/30 transition-all duration-300 hover:-translate-y-0.5 hover:from-inv-primary hover:to-inv-surface hover:shadow-xl hover:shadow-inv-primary/40 active:translate-y-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2 focus-visible:ring-offset-inv-section"
                                                    disabled={processing}
                                                    tabIndex={5}
                                                    data-test="login-button"
                                                >
                                                    {processing ? (
                                                        <Spinner className="h-5 w-5" />
                                                    ) : (
                                                        'Entrar al sistema'
                                                    )}
                                                </Button>
                                            </>
                                        )}
                                    </Form>
                                </div>

                                {/* Bloque de confianza (bento inferior) */}
                                <div className="flex items-center justify-center gap-6 border-t border-white/10 bg-white/2 px-6 py-4">
                                    <span className="flex items-center gap-2 text-xs text-slate-500 transition-all duration-200 hover:text-slate-400 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110">
                                        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                        Conexión segura
                                    </span>
                                    <span className="flex items-center gap-2 text-xs text-slate-500 transition-all duration-200 hover:text-slate-400 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110">
                                        <Server className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                        Inventario TI
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
