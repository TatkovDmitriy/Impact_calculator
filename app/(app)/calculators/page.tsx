import Link from 'next/link';
import { Calculator } from 'lucide-react';

const CALCULATORS = [
  {
    slug: 'novosel-loyalty-impact',
    title: 'Новосел: программа лояльности',
    description:
      'Стоит ли дисконт до 85 000 ₽ той выручки и маржи, которую приносят Новоселы? Три сценария: рост доли, сравнение категорий, бенчмарк сегментов.',
    category: 'revenue',
    badge: 'P0',
    status: 'ready',
  },
  {
    slug: 'revenue-uplift',
    title: 'Прирост выручки от фичи',
    description: 'Сколько +₽ даст фича Х за 12 месяцев?',
    category: 'revenue',
    badge: 'P0',
    status: 'planned',
  },
  {
    slug: 'conversion-funnel',
    title: 'Влияние на конверсию воронки',
    description: 'Если конверсия этапа Y вырастет на N%, сколько +₽?',
    category: 'revenue',
    badge: 'P0',
    status: 'planned',
  },
];

const CATEGORY_LABEL: Record<string, string> = {
  revenue: 'Выручка',
  cx: 'CX',
  ops: 'Операции',
  risk: 'Риски',
};

export default function CalculatorsCatalogPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-lp-dark">Калькуляторы</h1>
        <p className="mt-1 text-sm text-lp-text-muted">
          Один калькулятор — один вопрос. Baseline метрики подтягиваются из Google Sheets.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CALCULATORS.map(({ slug, title, description, category, badge, status }) => {
          const isReady = status === 'ready';
          const card = (
            <div
              className={`rounded-xl border p-5 shadow-sm transition-shadow ${
                isReady
                  ? 'border-lp-border bg-white hover:shadow-md'
                  : 'border-dashed border-lp-border bg-lp-muted opacity-60'
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-lp-yellow/20 px-2 py-0.5 text-xs font-semibold text-lp-dark">
                  {badge}
                </span>
                <span className="text-xs text-lp-text-muted">
                  {CATEGORY_LABEL[category] ?? category}
                </span>
              </div>
              <div className="mb-1 flex items-start gap-2">
                <Calculator size={16} className="mt-0.5 shrink-0 text-lp-text-muted" />
                <h2 className="text-sm font-semibold text-lp-dark">{title}</h2>
              </div>
              <p className="text-xs text-lp-text-muted">{description}</p>
              {!isReady && (
                <div className="mt-3 text-xs font-medium text-lp-text-muted">
                  В разработке
                </div>
              )}
            </div>
          );

          return isReady ? (
            <Link key={slug} href={`/calculators/${slug}`}>
              {card}
            </Link>
          ) : (
            <div key={slug}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
