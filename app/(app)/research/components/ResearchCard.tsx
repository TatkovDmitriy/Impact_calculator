import type { ResearchItem } from '@/lib/research/types';
import { PayloadRenderer } from './PayloadRenderer';
import { MarkdownDescription } from './MarkdownDescription';

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

interface Props {
  item: ResearchItem;
}

export function ResearchCard({ item }: Props) {
  const refreshedMs = item.meta.lastRefreshedAt?.toMillis?.() ?? 0;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-lp-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="mb-1 inline-block rounded-full bg-lp-yellow/20 px-2 py-0.5 text-xs font-medium text-lp-dark">
            {CATEGORY_LABELS[item.category] ?? item.category}
          </span>
          <h2 className="text-base font-semibold text-lp-dark">{item.title}</h2>
        </div>
        <span className="shrink-0 text-xs text-lp-text-muted">v{item.meta.scriptVersion}</span>
      </div>

      {item.description && <MarkdownDescription content={item.description} />}

      <PayloadRenderer payload={item.payload} />

      <div className="flex items-center justify-between border-t border-lp-border pt-3 text-xs text-lp-text-muted">
        <span>Обновлено: {relativeTime(refreshedMs)}</span>
        <span className="font-mono">research/scripts/{item.slug}/</span>
      </div>
    </div>
  );
}
