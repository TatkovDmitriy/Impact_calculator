'use client';

import { useState } from 'react';
import { TrendingUp, Calculator, BookOpen, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = ['Overview', 'Scenario Compare'] as const;
type Tab = typeof TABS[number];

const KPI_CARDS = [
  { label: 'Калькуляторов', value: '1', sub: 'из 8 запланированных', icon: Calculator },
  { label: 'Сценариев', value: '0', sub: 'сохранённых расчётов', icon: BookOpen },
  { label: 'Питчей подготовлено', value: '0', sub: 'с использованием инструмента', icon: TrendingUp },
  { label: 'Точность прогнозов', value: '—', sub: 'расхождение < 10%', icon: BarChart2 },
];

const CALCULATOR_CARDS = [
  {
    slug: 'novosel-loyalty-impact',
    title: 'Новосел: программа лояльности',
    description: 'Оценка ROI дисконта 85 000 ₽ и влияния доли Новоселов на выручку',
    category: 'revenue',
    badge: 'P0',
  },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-lp-dark">Дашборд</h1>
        <p className="mt-1 text-sm text-lp-text-muted">
          Impact Calculator — инструмент аргументации для питчей CPO
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-lp-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab
                ? 'border-lp-yellow text-lp-dark'
                : 'border-transparent text-lp-text-muted hover:text-lp-dark'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div className="flex flex-col gap-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {KPI_CARDS.map(({ label, value, sub, icon: Icon }) => (
              <div
                key={label}
                className="rounded-xl border border-lp-border bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-lp-text-muted uppercase tracking-wide">
                    {label}
                  </span>
                  <Icon size={16} className="text-lp-text-muted" />
                </div>
                <div className="text-2xl font-bold text-lp-dark">{value}</div>
                <div className="mt-1 text-xs text-lp-text-muted">{sub}</div>
              </div>
            ))}
          </div>

          {/* Trend chart placeholder */}
          <div className="rounded-xl border border-lp-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-lp-dark">
              Тренд ключевых метрик
            </h2>
            <div className="flex h-48 items-center justify-center rounded-lg bg-lp-muted text-sm text-lp-text-muted">
              График появится после первого сохранённого сценария
            </div>
          </div>

          {/* Recent scenarios */}
          <div className="rounded-xl border border-lp-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-lp-dark">
              Последние сценарии
            </h2>
            <div className="flex h-24 items-center justify-center text-sm text-lp-text-muted">
              Нет сохранённых сценариев
            </div>
          </div>

          {/* Calculator cards */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-lp-dark">
              Калькуляторы
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CALCULATOR_CARDS.map(({ slug, title, description, badge }) => (
                <a
                  key={slug}
                  href={`/calculators/${slug}`}
                  className="group rounded-xl border border-lp-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-full bg-lp-yellow/20 px-2 py-0.5 text-xs font-semibold text-lp-dark">
                      {badge}
                    </span>
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-lp-dark group-hover:underline">
                    {title}
                  </h3>
                  <p className="text-xs text-lp-text-muted">{description}</p>
                </a>
              ))}

              {/* Coming soon placeholder */}
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-dashed border-lp-border bg-lp-muted p-5"
                >
                  <div className="mb-2 h-4 w-8 rounded bg-lp-border" />
                  <div className="mb-1 h-3 w-3/4 rounded bg-lp-border" />
                  <div className="h-3 w-full rounded bg-lp-border" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Scenario Compare' && (
        <div className="rounded-xl border border-lp-border bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center gap-3 text-center">
            <BarChart2 size={40} className="text-lp-text-muted" />
            <h2 className="text-base font-semibold text-lp-dark">
              Сравнение сценариев
            </h2>
            <p className="max-w-sm text-sm text-lp-text-muted">
              Выберите калькулятор, сохраните 2–4 сценария, и они появятся здесь для сравнения бок-о-бок
            </p>
            <a
              href="/calculators"
              className="mt-2 rounded-lg bg-lp-yellow px-4 py-2 text-sm font-semibold text-lp-dark hover:bg-lp-yellow/80"
            >
              Открыть калькуляторы
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
