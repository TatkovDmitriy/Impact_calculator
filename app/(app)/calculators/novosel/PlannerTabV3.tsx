'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Save, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';

import { NOVOSEL_BASELINE } from '@/lib/calculators/novosel/baseline';
import { HISTORICAL_MONTHS, BASELINE_DISCOUNT_CAPS, CATEGORY_COLORS_V3 } from '@/lib/calculators/novosel/constants_v3';
import { computePlannerV3 } from '@/lib/calculators/novosel/formulas_v3';
import type { CategoryInputV3, ScenarioV3Result, ForecastBase, HistoricalMonthRow } from '@/lib/calculators/novosel/types_v3';

import { CategoryCard } from './planner/CategoryCard';
import { PlannerKPIsV3 } from './planner/PlannerKPIsV3';

// ── Baseline prefill helpers ──────────────────────────────────────────────────

type BuiltinCatKey = 'kitchen' | 'bathroom' | 'storage';

function buildHistoricalRows(catKey: BuiltinCatKey): HistoricalMonthRow[] {
  const trendByMonth = Object.fromEntries(
    NOVOSEL_BASELINE.trend.map((t) => [t.month, t.byCategory[catKey]]),
  );

  return HISTORICAL_MONTHS.map((month) => {
    const src = trendByMonth[month];
    if (!src) {
      return {
        month,
        totalCreated: 0,
        novoselSharePct: 0,
        novoselConvPct: 0,
        novoselAov: 0,
        nonNovoselConvPct: 0,
        nonNovoselAov: 0,
      };
    }
    const share =
      src.totalCreated > 0
        ? Math.round((src.novoselCreated / src.totalCreated) * 1000) / 10
        : 0;
    return {
      month,
      totalCreated: src.totalCreated,
      novoselSharePct: share,
      novoselConvPct: Math.round(src.novoselConversion * 1000) / 10,
      novoselAov: src.novoselAov,
      nonNovoselConvPct: Math.round(src.nonNovoselConversion * 1000) / 10,
      nonNovoselAov: src.nonNovoselAov,
    };
  });
}

function buildForecastBase(catKey: BuiltinCatKey): ForecastBase {
  const apr = NOVOSEL_BASELINE.trend.find((t) => t.month === '2026-04')!.byCategory[catKey];
  return {
    totalCreated: apr.totalCreated,
    novoselConvPct: Math.round(apr.novoselConversion * 1000) / 10,
    novoselAov: apr.novoselAov,
    nonNovoselConvPct: Math.round(apr.nonNovoselConversion * 1000) / 10,
    nonNovoselAov: apr.nonNovoselAov,
  };
}

const BUILTIN_CATS: { key: BuiltinCatKey; name: string }[] = [
  { key: 'kitchen', name: 'Кухня' },
  { key: 'bathroom', name: 'Ванная' },
  { key: 'storage', name: 'Хранение' },
];

function buildInitialCategories(): CategoryInputV3[] {
  const aprShareByKey = Object.fromEntries(
    BUILTIN_CATS.map(({ key }) => {
      const apr = NOVOSEL_BASELINE.trend.find((t) => t.month === '2026-04')!.byCategory[key];
      const share =
        apr.totalCreated > 0
          ? Math.round((apr.novoselCreated / apr.totalCreated) * 1000) / 10
          : 10;
      return [key, share];
    }),
  );

  return BUILTIN_CATS.map(({ key, name }) => ({
    config: {
      id: key,
      name,
      marginPct: 0,
      discount: {
        mode: 'pct_cap',
        pct: 10,
        cap: BASELINE_DISCOUNT_CAPS[key] ?? 10_000,
        amount: 10_000,
      },
      targetNovoselSharePct: Math.round(aprShareByKey[key] ?? 10),
    },
    historical: buildHistoricalRows(key),
    forecastBase: buildForecastBase(key),
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PlannerTabV3() {
  const [loaded, setLoaded] = useState(false);
  const [categories, setCategories] = useState<CategoryInputV3[]>([]);
  const [result, setResult] = useState<ScenarioV3Result | null>(null);

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedOk, setSavedOk] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recalculate = useCallback((cats: CategoryInputV3[]) => {
    setResult(computePlannerV3(cats));
  }, []);

  // Prefill from baseline on mount (simulates async load pattern)
  useEffect(() => {
    const initial = buildInitialCategories();
    setCategories(initial);
    setResult(computePlannerV3(initial));
    setLoaded(true);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function updateCategories(cats: CategoryInputV3[]) {
    setCategories(cats);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => recalculate(cats), 300);
  }

  function handleCategoryUpdate(idx: number, updated: CategoryInputV3) {
    updateCategories(categories.map((c, i) => (i === idx ? updated : c)));
  }

  async function handleSave() {
    const user = auth.currentUser;
    if (!user) { setSaveError('Необходима авторизация'); return; }
    setSaving(true);
    setSaveError('');
    try {
      const autoLabel = `Планировщик v3 — ${categories.map((c) => c.config.name).join(', ')} — ${new Date().toLocaleDateString('ru-RU')}`;
      await addDoc(collection(db, 'scenarios'), {
        type: 'novosel_v3',
        version: '3.0.0',
        calculatorSlug: 'novosel',
        ownerId: user.uid,
        label: saveLabel.trim() || autoLabel,
        color: '#FDC300',
        inputs: categories,
        results: result,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSavedOk(true);
      setTimeout(() => {
        setSaveOpen(false);
        setSavedOk(false);
        setSaveLabel('');
      }, 1200);
    } catch (e) {
      setSaveError('Ошибка сохранения. Попробуйте снова.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  // Skeleton while baseline loads
  if (!loaded || !result) {
    return (
      <div className="flex flex-col gap-5 animate-pulse">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-lp-border bg-lp-muted" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl border border-lp-border bg-lp-muted" />
        ))}
      </div>
    );
  }

  const catResults = Object.fromEntries(result.categories.map((r) => [r.categoryId, r]));

  return (
    <div className="flex flex-col gap-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-lp-dark">Планировщик сценариев v3</h2>
          <p className="text-xs text-lp-text-muted mt-0.5">
            Дек 2025 – Дек 2026 · 5 факт + 8 прогноз
          </p>
        </div>
        <button
          onClick={() => setSaveOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-lp-border bg-white px-3 py-1.5 text-sm font-medium text-lp-dark shadow-sm transition-colors hover:border-lp-dark"
        >
          <Save size={14} />
          Сохранить сценарий
        </button>
      </div>

      {/* KPIs */}
      <PlannerKPIsV3 result={result} />

      {/* Category cards */}
      <div className="flex flex-col gap-3">
        <div className="text-xs font-semibold text-lp-text-muted uppercase tracking-wide">
          Категории ({categories.length})
        </div>

        {categories.map((cat, idx) => (
          <CategoryCard
            key={cat.config.id}
            item={cat}
            result={catResults[cat.config.id]}
            color={CATEGORY_COLORS_V3[idx % CATEGORY_COLORS_V3.length]}
            onUpdate={(updated) => handleCategoryUpdate(idx, updated)}
          />
        ))}
      </div>

      {/* Save modal */}
      <Dialog.Root open={saveOpen} onOpenChange={setSaveOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-lp-border bg-white p-6 shadow-xl focus:outline-none">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="text-base font-semibold text-lp-dark">
                Сохранить сценарий
              </Dialog.Title>
              <Dialog.Close className="rounded-md p-1 text-lp-text-muted hover:bg-lp-muted hover:text-lp-dark">
                <X size={16} />
              </Dialog.Close>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-lp-text-muted">
                  Название (необязательно)
                </label>
                <input
                  value={saveLabel}
                  onChange={(e) => setSaveLabel(e.target.value)}
                  placeholder={`Планировщик — ${categories.map((c) => c.config.name).join(', ')}`}
                  className="h-9 w-full rounded-lg border border-lp-border px-3 text-sm text-lp-dark outline-none focus:border-lp-dark"
                />
              </div>
              {saveError && (
                <p className="rounded-lg bg-lp-danger/10 px-3 py-2 text-sm text-lp-danger">
                  {saveError}
                </p>
              )}
              <button
                onClick={handleSave}
                disabled={saving || savedOk}
                className="h-10 rounded-lg bg-lp-yellow text-sm font-semibold text-lp-dark disabled:opacity-60 transition-opacity"
              >
                {savedOk ? '✓ Сохранено' : saving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
