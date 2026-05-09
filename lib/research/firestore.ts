import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { ResearchItem } from './types';

const CATEGORY_ORDER: Record<string, number> = {
  metrics: 0,
  cohorts: 1,
  segments: 2,
  funnels: 3,
  other: 4,
};

export async function getResearchItems(): Promise<ResearchItem[]> {
  const q = query(
    collection(db, 'research_items'),
    orderBy('meta.lastRefreshedAt', 'desc')
  );
  const snap = await getDocs(q);
  const items = snap.docs.map((doc) => doc.data() as ResearchItem);

  return items.sort((a, b) => {
    const catDiff =
      (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99);
    if (catDiff !== 0) return catDiff;
    const aTs = a.meta.lastRefreshedAt?.toMillis() ?? 0;
    const bTs = b.meta.lastRefreshedAt?.toMillis() ?? 0;
    return bTs - aTs;
  });
}
