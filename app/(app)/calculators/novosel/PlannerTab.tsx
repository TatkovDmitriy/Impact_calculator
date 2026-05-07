'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Save, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';

import { NOVOSEL_BASELINE } from '@/lib/calculators/novosel/baseline';
import {
  ALL_MONTHS,
  FORECAST_MONTHS_SET,
  DEFAULT_DISCOUNT,
  CATEGORY_COLORS,
  BASELINE_CAT_CAPS,
} from '@/lib/calculators/novosel/constants_v2';
import { computeScenario } from '@/lib/calculators/novosel/formulas_v2';
import type { CategoryInput, CategoryMonthData, ScenarioV2Result } from '@/lib/calculators/novosel/types_v2';

import { CategoryAccordion } from './components/CategoryAccordion';
import { PlannerKPIs } from './components/PlannerKPIs';
import { PlannerChart } from './components/PlannerChart';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function buildMonthsFromBaseline(catKey: 'kitchen' | 'bathroom' | 'storage'): CategoryMonthData[] {
  const trendByMonth = Object.fromEntries(
    NOVOSEL_BASELINE.trend.map((t) => [t.month, t.byCategory[catKey]])
  );
  const apr = trendByMonth['2026-04'];

  return ALL_MONTHS.map((month) => {
    const isForecast = FORECAST_MONTHS_SET.has(month);
    const src = isForecast ? apr : (trendByMonth[month] ?? apr);
    return {
      month,
      isForecast,
      novosel: {
        created: src.novoselCreated,
        convPct: Math.round(src.novoselConversion * 1000) / 10,
        aov: src.novoselAov,
      },
      nonNovosel: {
        created: src.totalCreated - src.novoselCreated,
        convPct: Math.round(src.nonNovoselConversion * 1000) / 10,
        aov: src.nonNovoselAov,
      },
    };
  });
}

function buildEmptyMonths(): CategoryMonthData[] {
  return ALL_MONTHS.map((month) => ({
    month,
    isForecast: FORECAST_MONTHS_SET.has(month),
    novosel: { created: 0, convPct: 0, aov: 0 },
    nonNovosel: { created: 0, convPct: 0, aov: 0 },
  }));
}

const INITIAL_CATEGORIES: CategoryInput[] = [
  {
    config: { id: 'kitchen', name: 'Кухня', marginPct: 0, discount: { mode: 'pct_cap', pct: 10, cap: 40_000, amount: 10_000 } },
    months: buildMonthsFromBaseline('kitchen'),
  },
  {
    config: { id: 'bathroom', name: 'Ванная', marginPct: 0, discount: { mode: 'pct_cap', pct: 10, cap: 10_000, amount: 10_000 } },
    months: buildMonthsFromBaseline('bathroom'),
  },
  {
    config: { id: 'storage', name: 'Хранение', marginPct: 0, discount: { mode: 'pct_cap', pct: 10, cap: 10_000, amount: 10_000 } },
    months: buildMonthsFromBaseline('storage'),
  },
];

const INITIAL_RESULT = computeScenario(INITIAL_CATEGORIES);

// Add-category form state
interface NewCatForm {
  name: string;
  marginPct: number;
}

export function PlannerTab() {
  const [categories, setCategories] = useState<CategoryInput[]>(INITIAL_CATEGORIES);
  const [result, setResult] = useState<ScenarioV2Result>(INITIAL_RESULT);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCat, setNewCat] = useState<NewCatForm>({ name: '', marginPct: 0 });
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedOk, setSavedOk] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recalculate = useCallback((cats: CategoryInput[]) => {
    setResult(computeScenario(cats));
  }, []);

  const updateCategories = useCallback((cats: CategoryInput[]) => {
    setCategories(cats);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => recalculate(cats), 300);
  }, [recalculate]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  function handleCategoryUpdate(idx: number, updated: CategoryInput) {
    const next = categories.map((c, i) => (i === idx ? updated : c));
    updateCategories(next);
  }

  function handleCategoryDelete(idx: number) {
    const next = categories.filter((_, i) => i !== idx);
    updateCategories(next);
  }

  function handleAddCategory() {
    if (!newCat.name.trim()) return;
    const added: CategoryInput = {
      config: {
        id: genId(),
        name: newCat.name.trim(),
        marginPct: newCat.marginPct,
        discount: { ...DEFAULT_DISCOUNT },
      },
      months: buildEmptyMonths(),
    };
    const next = [...categories, added];
    updateCategories(next);
    setShowAddForm(false);
    setNewCat({ name: '', marginPct: 0 });
  }

  async function handleSave() {
    const user = auth.currentUser;
    if (!user) { setSaveError('Необходима авторизация'); return; }
    setSaving(true);
    setSaveError('');
    try {
      const autoLabel = `Планировщик — ${categories.map((c) => c.config.name).join(', ')} — ${new Date().toLocaleDateString('ru-RU')}`;
      await addDoc(collection(db, 'scenarios'), {
        type: 'novosel_v2',
        version: '2.0.0',
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

  const catResults = Object.fromEntries(result.categories.map((r) => [r.categoryId, r]));

  return (
    <div className="flex flex-col gap-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-lp-dark">Планировщик сценариев</h2>
          <p className="text-xs text-lp-text-muted mt-0.5">Dec 2025 – Dec 2026 · 13 месяцев</p>
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
      <PlannerKPIs result={result} />

      {/* Chart */}
      <PlannerChart result={result} categories={categories} />

      {/* Categories */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-lp-text-muted uppercase tracking-wide">
            Категории ({categories.length})
          </div>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="flex items-center gap-1 rounded-lg border border-lp-border px-2.5 py-1 text-xs font-medium text-lp-text-muted hover:border-lp-dark hover:text-lp-dark transition-colors"
          >
            <Plus size={12} />
            Добавить категорию
          </button>
        </div>

        {/* Inline add form */}
        {showAddForm && (
          <div className="rounded-xl border border-lp-yellow/50 bg-lp-yellow/5 p-4 flex flex-col gap-3">
            <div className="text-xs font-semibold text-lp-dark">Новая категория</div>
            <div className="flex gap-3 flex-wrap">
              <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                <label className="text-xs text-lp-text-muted">Название</label>
                <input
                  value={newCat.name}
                  onChange={(e) => setNewCat((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Напр. Полы"
                  className="h-8 rounded-lg border border-lp-border px-2.5 text-sm text-lp-dark outline-none focus:border-lp-dark"
                />
              </div>
              <div className="flex flex-col gap-1 w-24">
                <label className="text-xs text-lp-text-muted">Маржа %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newCat.marginPct}
                  onChange={(e) => setNewCat((p) => ({ ...p, marginPct: Number(e.target.value) }))}
                  className="h-8 rounded-lg border border-lp-border px-2 text-sm text-lp-dark outline-none focus:border-lp-dark"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddCategory}
                disabled={!newCat.name.trim()}
                className="rounded-lg bg-lp-yellow px-3 py-1.5 text-xs font-semibold text-lp-dark disabled:opacity-50 transition-opacity"
              >
                Добавить
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-lp-border px-3 py-1.5 text-xs font-medium text-lp-text-muted hover:text-lp-dark transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Category accordions */}
        {categories.map((cat, idx) => (
          <CategoryAccordion
            key={cat.config.id}
            item={cat}
            result={catResults[cat.config.id]}
            color={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
            onUpdate={(updated) => handleCategoryUpdate(idx, updated)}
            onDelete={() => handleCategoryDelete(idx)}
            canDelete={categories.length > 1}
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
                Сохранить сценарий Планировщика
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
                <p className="rounded-lg bg-lp-danger/10 px-3 py-2 text-sm text-lp-danger">{saveError}</p>
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
