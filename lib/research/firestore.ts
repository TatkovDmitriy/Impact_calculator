import { collection, getDocs, orderBy, query } from 'firebase/firestore';
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
