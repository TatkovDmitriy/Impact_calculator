import { collection, getDocs, orderBy, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { ResearchItem } from './types';

export async function getResearchItems(): Promise<ResearchItem[]> {
  const q = query(
    collection(db, 'research_items'),
    orderBy('meta.lastRefreshedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => doc.data() as ResearchItem);
}

export async function getResearchItem(slug: string): Promise<ResearchItem | null> {
  const q = query(
    collection(db, 'research_items'),
    where('slug', '==', slug),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as ResearchItem;
}
