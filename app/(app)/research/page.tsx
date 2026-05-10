'use client';

import { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import type { ResearchItem, ResearchCategory } from '@/lib/research/types';
import { getResearchItems } from '@/lib/research/firestore';
import { ResearchCard } from './components/ResearchCard';
import { cn } from '@/lib/utils';

type FilterValue = ResearchCategory | 'all';

function pluralResearch(n: number): string {
  const m100 = n % 100, m10 = n % 10;
  if (m100 >= 11 && m100 <= 19) return 'исследований';
  if (m10 === 1) return 'исследование';
  if (m10 >= 2 && m10 <= 4) return 'исследования';
  return 'исследований';
}

const FILTER_TABS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'metrics', label: 'Метрики' },
  { value: 'cohorts', label: 'Когорты' },
  { value: 'segments', label: 'Сегменты' },
  { value: 'funnels', label: 'Воронки' },
  { value: 'other', label: 'Прочее' },
];

export default function ResearchPage() {
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<FilterValue>('all');

  useEffect(() => {
    getResearchItems()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    activeCategory === 'all' ? items : items.filter((item) => item.category === activeCategory);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-lp-dark">Внутренние исследования</h1>
        <p className="mt-1 text-sm text-lp-text-muted">
          Данные из Greenplum, опубликованные DA-агентом
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-sm text-lp-text-muted">
          Загрузка…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-lp-border bg-white py-20 text-center">
          <FlaskConical size={40} className="text-lp-text-muted" strokeWidth={1.5} />
          <div>
            <p className="font-semibold text-lp-dark">Здесь появятся исследования</p>
            <p className="mt-1 text-sm text-lp-text-muted">
              Первый pilot готовится DA-агентом
            </p>
          </div>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {FILTER_TABS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setActiveCategory(value)}
                  className={cn(
                    'rounded-full px-3 py-1 text-sm font-medium transition-colors',
                    activeCategory === value
                      ? 'bg-lp-yellow/20 text-lp-dark'
                      : 'bg-lp-muted text-lp-text-muted hover:bg-lp-yellow/10 hover:text-lp-dark'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="shrink-0 text-sm text-lp-text-muted">
              {filtered.length} {pluralResearch(filtered.length)}
            </span>
          </div>

          <div className="flex flex-col gap-5">
            {filtered.map((item) => (
              <ResearchCard key={item.slug} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
