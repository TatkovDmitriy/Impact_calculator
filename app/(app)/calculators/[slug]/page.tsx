import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

const KNOWN_SLUGS = ['novosel-loyalty-impact'];

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CalculatorPage({ params }: Props) {
  const { slug } = await params;

  if (!KNOWN_SLUGS.includes(slug)) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Link
          href="/calculators"
          className="mb-3 inline-flex items-center gap-1 text-sm text-lp-text-muted hover:text-lp-dark"
        >
          <ChevronLeft size={14} />
          Все калькуляторы
        </Link>
        <h1 className="text-2xl font-bold text-lp-dark">
          Новосел: программа лояльности
        </h1>
        <p className="mt-1 text-sm text-lp-text-muted">
          Slug: <code className="font-mono text-xs">{slug}</code> · Версия 1.0.0
        </p>
      </div>

      {/* Inputs placeholder */}
      <div className="mb-4 rounded-xl border border-lp-border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-lp-dark">Параметры</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {['Маржа проекта', 'Дисконт на проект', 'Целевая доля Новоселов', 'Incrementality'].map(
            (label) => (
              <div key={label}>
                <div className="mb-1 text-xs font-medium text-lp-text-muted">{label}</div>
                <div className="h-9 rounded-lg border border-lp-border bg-lp-muted" />
              </div>
            )
          )}
        </div>
        <div className="mt-4 flex gap-3">
          <button
            disabled
            className="rounded-lg bg-lp-yellow px-4 py-2 text-sm font-semibold text-lp-dark opacity-60"
          >
            Рассчитать
          </button>
          <button
            disabled
            className="rounded-lg border border-lp-border px-4 py-2 text-sm font-medium text-lp-text-muted opacity-60"
          >
            Сохранить сценарий
          </button>
        </div>
      </div>

      {/* Scenarios tabs placeholder */}
      <div className="mb-4 flex gap-1 border-b border-lp-border">
        {['Сценарий А — Рост доли', 'Сценарий Б — Категории', 'Сценарий В — Бенчмарк'].map(
          (tab, i) => (
            <button
              key={tab}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
                i === 0
                  ? 'border-lp-yellow text-lp-dark'
                  : 'border-transparent text-lp-text-muted'
              }`}
            >
              {tab}
            </button>
          )
        )}
      </div>

      {/* Chart placeholder */}
      <div className="rounded-xl border border-lp-border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-lp-dark">
          Waterfall: Baseline → Новосел → Дисконт → Net Margin
        </h2>
        <div className="flex h-64 items-center justify-center rounded-lg bg-lp-muted text-sm text-lp-text-muted">
          Подключение Firebase + Sheets в Phase 2 — графики появятся здесь
        </div>
      </div>
    </div>
  );
}
