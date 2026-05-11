import Link from 'next/link';
import type { ResearchItem } from '@/lib/research/types';

const CATEGORY_LABELS: Record<string, string> = {
  metrics: 'Метрики',
  cohorts: 'Когорты',
  segments: 'Сегменты',
  funnels: 'Воронки',
  other: 'Прочее',
};

function getRefreshedMs(ts: unknown): number {
  if (!ts) return 0;
  if (typeof ts === 'string') return new Date(ts).getTime();
  if (typeof (ts as { toMillis?: () => number }).toMillis === 'function') {
    return (ts as { toMillis: () => number }).toMillis();
  }
  return 0;
}

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

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
}

interface Props {
  item: ResearchItem;
}

export function ResearchCard({ item }: Props) {
  const refreshedMs = getRefreshedMs(item.meta.lastRefreshedAt);

  return (
    <Link href={`/research/${item.slug}`} className="group block">
      <div className="flex flex-col gap-3 rounded-xl border border-lp-border bg-white p-5 shadow-sm transition-all group-hover:border-lp-yellow/50 group-hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="mb-1.5 inline-block rounded-full bg-lp-yellow/20 px-2 py-0.5 text-xs font-medium text-lp-dark">
              {CATEGORY_LABELS[item.category] ?? item.category}
            </span>
            <h2 className="text-base font-semibold text-lp-dark">{item.title}</h2>
            {item.description && (
              <p className="mt-1 line-clamp-2 text-sm text-lp-text-muted">
                {stripMarkdown(item.description)}
              </p>
            )}
          </div>
          <span className="shrink-0 text-xs text-lp-text-muted">v{item.meta.scriptVersion}</span>
        </div>
        <div className="border-t border-lp-border pt-3 text-xs text-lp-text-muted">
          Обновлено: {relativeTime(refreshedMs)}
        </div>
      </div>
    </Link>
  );
}
