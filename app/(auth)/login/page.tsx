import { Logo } from '@/components/brand/Logo';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-lp-muted px-4">
      <div className="w-full max-w-sm rounded-xl border border-lp-border bg-white p-8 shadow-sm">
        <div className="mb-8 flex justify-center">
          <Logo width={140} height={36} linkTo="" />
        </div>

        <h1 className="mb-1 text-center text-xl font-semibold text-lp-dark">
          Impact Calculator
        </h1>
        <p className="mb-6 text-center text-sm text-lp-text-muted">
          Войдите с корпоративным email
        </p>

        {/* Login form skeleton — Firebase Auth подключается в Phase 2 */}
        <div className="flex flex-col gap-3">
          <div className="h-10 rounded-lg border border-lp-border bg-lp-muted px-3 py-2 text-sm text-lp-text-muted">
            email@lemana.pro
          </div>
          <div className="h-10 rounded-lg border border-lp-border bg-lp-muted px-3 py-2 text-sm text-lp-text-muted">
            ••••••••
          </div>
          <button
            disabled
            className="h-10 rounded-lg bg-lp-yellow font-semibold text-lp-dark opacity-60"
          >
            Войти
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-lp-text-muted">
          Доступ только для приглашённых пользователей
        </p>
      </div>
    </div>
  );
}
