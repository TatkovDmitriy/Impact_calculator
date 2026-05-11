'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { ResearchItem } from '@/lib/research/types';
import { getResearchItem } from '@/lib/research/firestore';
import { PayloadRenderer } from '../components/PayloadRenderer';
import { MarkdownDescription } from '../components/MarkdownDescription';

const CATEGORY_LABELS: Record<string, string> = {
  metrics: 'Метрики',
  cohorts: 'Когорты',
  segments: 'Сегменты',
  funnels: 'Воронки',
  other: 'Прочее',
};

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  if (hours < 24) return `${hours} ч назад`;
  if (days < 30) return `${days} дн назад`;
  return new Date(ms).toLocaleDateString('ru-RU');
}

export default function ResearchDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [item, setItem] = useState<ResearchItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResearchItem(slug)
      .then(setItem)
      .finally(() => setLoading(false));
  }, [slug]);

  if (!loading && !item) notFound();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-lp-text-muted">
        Загрузка…
      </div>
    );
  }

  if (!item) return null;

  const refreshedMs = item.meta.lastRefreshedAt?.toMillis?.() ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-lp-text-muted">
        <Link
          href="/research"
          className="flex items-center gap-1 transition-colors hover:text-lp-dark"
        >
          <ChevronLeft size={14} />
          Исследования
        </Link>
        <span>/</span>
        <span className="truncate text-lp-dark">{item.title}</span>
      </div>

      <div>
        <span className="mb-2 inline-block rounded-full bg-lp-yellow/20 px-2 py-0.5 text-xs font-medium text-lp-dark">
          {CATEGORY_LABELS[item.category] ?? item.category}
        </span>
        <h1 className="text-2xl font-bold text-lp-dark">{item.title}</h1>
      </div>

      {item.description && <MarkdownDescription content={item.description} />}

      <div className="rounded-xl border border-lp-border bg-white p-5 shadow-sm">
        <PayloadRenderer payload={item.payload} />
      </div>

      <div className="flex items-center justify-between border-t border-lp-border pt-4 text-xs text-lp-text-muted">
        <span>Обновлено: {relativeTime(refreshedMs)}</span>
        <span className="font-mono">research/scripts/{item.slug}/</span>
      </div>
    </div>
  );
}
