'use client';

import { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import type { ResearchItem } from '@/lib/research/types';
import { getResearchItems } from '@/lib/research/firestore';
import { ResearchCard } from './components/ResearchCard';

export default function ResearchPage() {
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getResearchItems()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

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
        <div className="flex flex-col gap-5">
          {items.map((item) => (
            <ResearchCard key={item.slug} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
