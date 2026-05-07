'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import * as Tabs from '@radix-ui/react-tabs';
import * as Slider from '@radix-ui/react-slider';
import * as Tooltip from '@radix-ui/react-tooltip';
import { ChevronLeft, Info, Save } from 'lucide-react';
import { computeScenarioA, computeScenarioB, computeScenarioC } from '@/lib/calculators/novosel/formulas';
import { NOVOSEL_BASELINE } from '@/lib/calculators/novosel/baseline';
import { NOVOSEL_PRESETS } from '@/lib/calculators/novosel/presets';
import type { NovoselInputs, ScenarioAResult, ScenarioBResult, ScenarioCResult } from '@/lib/calculators/novosel/types';
import type { Category } from '@/lib/calculators/types';
import { ScenarioAPanel } from './ScenarioAPanel';
import { ScenarioBPanel } from './ScenarioBPanel';
import { ScenarioCPanel } from './ScenarioCPanel';
import { SaveModal } from './SaveModal';
import { PlannerTab } from './PlannerTab';
import { cn } from '@/lib/utils';

const INCREMENTALITY_OPTIONS = [
  { value: 'full' as const, label: 'Полная', hint: 'Все Новоселы пришли благодаря программе' },
  { value: 'half' as const, label: 'Частичная (50%)', hint: 'Половина пришла бы и без программы' },
  { value: 'none' as const, label: 'Нет', hint: 'Пришли бы без программы — дисконт убыток' },
];

const CATEGORY_OPTIONS = [
  { value: 'all' as const, label: 'Все категории' },
  { value: 'kitchen' as const, label: 'Кухня' },
  { value: 'bathroom' as const, label: 'Ванная' },
  { value: 'storage' as const, label: 'Хранение' },
];

function SliderField({
  label, value, min, max, step, format, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-lp-text-muted">{label}</span>
        <span className="text-xs font-semibold text-lp-dark tabular-nums">{format(value)}</span>
      </div>
      <Slider.Root
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        className="relative flex h-5 w-full items-center"
      >
        <Slider.Track className="relative h-1.5 w-full grow rounded-full bg-lp-border">
          <Slider.Range className="absolute h-full rounded-full bg-lp-yellow" />
        </Slider.Track>
        <Slider.Thumb className="block h-4 w-4 rounded-full border-2 border-lp-yellow bg-white shadow focus:outline-none" />
      </Slider.Root>
    </div>
  );
}

export default function NovoselPage() {
  const [outerTab, setOuterTab] = useState<'analysis' | 'planner'>('analysis');
  const [inputs, setInputs] = useState<NovoselInputs>(NOVOSEL_PRESETS[0].inputs as NovoselInputs);
  const [activePreset, setActivePreset] = useState<0 | 1 | 2>(0);
  const [activeTab, setActiveTab] = useState('a');
  const [saveOpen, setSaveOpen] = useState(false);

  const [resultA, setResultA] = useState<ScenarioAResult>(() =>
    computeScenarioA(NOVOSEL_PRESETS[0].inputs as NovoselInputs, NOVOSEL_BASELINE)
  );
  const [resultB, setResultB] = useState<ScenarioBResult>(() =>
    computeScenarioB(NOVOSEL_PRESETS[0].inputs as NovoselInputs, NOVOSEL_BASELINE)
  );
  const [resultC, setResultC] = useState<ScenarioCResult>(() =>
    computeScenarioC(NOVOSEL_BASELINE)
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recalculate = useCallback((inp: NovoselInputs) => {
    setResultA(computeScenarioA(inp, NOVOSEL_BASELINE));
    setResultB(computeScenarioB(inp, NOVOSEL_BASELINE));
    setResultC(computeScenarioC(NOVOSEL_BASELINE));
  }, []);

  const handleInputChange = useCallback((partial: Partial<NovoselInputs>) => {
    setInputs((prev) => {
      const next = { ...prev, ...partial };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => recalculate(next), 300);
      return next;
    });
  }, [recalculate]);

  const loadPreset = useCallback((idx: 0 | 1 | 2) => {
    const preset = NOVOSEL_PRESETS[idx].inputs as NovoselInputs;
    setInputs(preset);
    setActivePreset(idx);
    recalculate(preset);
  }, [recalculate]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-5">
          <Link
            href="/calculators"
            className="mb-2 inline-flex items-center gap-1 text-sm text-lp-text-muted hover:text-lp-dark"
          >
            <ChevronLeft size={14} />
            Все калькуляторы
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-lp-dark">
                Новосел — Программа лояльности
              </h1>
              <p className="mt-0.5 text-sm text-lp-text-muted">
                Бизнес-моделирование эффективности программы · v1.0.0
              </p>
            </div>
            <span className="rounded-full border border-lp-yellow/40 bg-lp-yellow/10 px-3 py-1 text-xs font-semibold text-lp-dark">
              Активна до 31.12.2026
            </span>
          </div>
        </div>

        {/* Outer tab switcher: Анализ | Планировщик */}
        <div className="mb-5 flex gap-1 border-b border-lp-border pb-0">
          {([
            { id: 'analysis', label: 'Анализ A/B/C' },
            { id: 'planner', label: 'Планировщик' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setOuterTab(tab.id)}
              className={cn(
                'rounded-t-lg border border-b-0 px-4 py-2 text-sm font-medium transition-colors',
                outerTab === tab.id
                  ? 'border-lp-border bg-white text-lp-dark'
                  : 'border-transparent text-lp-text-muted hover:text-lp-dark'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Planner panel — always mounted to preserve state */}
        <div className={outerTab !== 'planner' ? 'hidden' : ''}>
          <PlannerTab />
        </div>

        {/* Analysis panel */}
        <div className={cn('flex gap-5 lg:flex-row flex-col', outerTab !== 'analysis' ? 'hidden' : '')}>
          {/* Left: Inputs */}
          <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
            {/* Preset buttons */}
            <div className="rounded-xl border border-lp-border bg-white p-4 shadow-sm">
              <div className="mb-3 text-xs font-semibold text-lp-text-muted uppercase tracking-wide">
                Быстрый пресет
              </div>
              <div className="flex gap-2">
                {NOVOSEL_PRESETS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => loadPreset(i as 0 | 1 | 2)}
                    className={cn(
                      'flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors',
                      activePreset === i
                        ? 'border-lp-yellow bg-lp-yellow text-lp-dark'
                        : 'border-lp-border text-lp-text-muted hover:border-lp-dark hover:text-lp-dark'
                    )}
                  >
                    {['A', 'B', 'C'][i]}
                    <div className="mt-0.5 font-normal">{p.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs form */}
            <div className="rounded-xl border border-lp-border bg-white p-4 shadow-sm flex flex-col gap-4">
              <div className="text-xs font-semibold text-lp-text-muted uppercase tracking-wide">
                Параметры
              </div>

              {/* Category */}
              <div>
                <div className="mb-1.5 text-xs font-medium text-lp-text-muted">Категория</div>
                <div className="flex flex-wrap gap-1">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleInputChange({ category: opt.value as Category | 'all' })}
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                        inputs.category === opt.value
                          ? 'border-lp-dark bg-lp-dark text-white'
                          : 'border-lp-border text-lp-text-muted hover:border-lp-dark hover:text-lp-dark'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <SliderField
                label="Целевая доля Новоселов"
                value={Math.round(inputs.targetNovoselShare * 100)}
                min={5}
                max={50}
                step={1}
                format={(v) => v + '%'}
                onChange={(v) => handleInputChange({ targetNovoselShare: v / 100 })}
              />

              <SliderField
                label="Маржа проекта"
                value={Math.round(inputs.marginPct * 100)}
                min={5}
                max={50}
                step={1}
                format={(v) => v + '%'}
                onChange={(v) => handleInputChange({ marginPct: v / 100 })}
              />

              {/* Incrementality */}
              <div>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="text-xs font-medium text-lp-text-muted">Инкрементальность</span>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button className="text-lp-text-muted hover:text-lp-dark">
                        <Info size={12} />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="max-w-xs rounded-lg bg-lp-dark px-3 py-2 text-xs text-white shadow-lg"
                        sideOffset={4}
                      >
                        Доля Новоселов, которые пришли <em>благодаря</em> программе. Если не-инкрементально — они пришли бы в любом случае, дисконт чистый убыток.
                        <Tooltip.Arrow className="fill-lp-dark" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </div>
                <div className="flex flex-col gap-1.5">
                  {INCREMENTALITY_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="incrementality"
                        value={opt.value}
                        checked={inputs.incrementality === opt.value}
                        onChange={() => handleInputChange({ incrementality: opt.value })}
                        className="accent-lp-yellow"
                      />
                      <span className="text-xs text-lp-dark">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Baseline info */}
            <div className="rounded-xl border border-lp-border bg-lp-muted p-3">
              <div className="mb-1 text-xs font-semibold text-lp-text-muted">Baseline: апрель 2026</div>
              <div className="flex flex-col gap-0.5 font-mono text-xs text-lp-text-muted">
                <span>Kitchen AOV: 166 299 ₽</span>
                <span>Bathroom AOV: 119 374 ₽</span>
                <span>Storage AOV: 74 180 ₽</span>
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div className="flex-1 min-w-0">
            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
              <div className="mb-4 flex items-center justify-between">
                <Tabs.List className="flex gap-1 rounded-xl border border-lp-border bg-lp-muted p-1">
                  {[
                    { value: 'a', label: 'А — Рост доли' },
                    { value: 'b', label: 'Б — Категории' },
                    { value: 'c', label: 'В — Бенчмарк' },
                  ].map((tab) => (
                    <Tabs.Trigger
                      key={tab.value}
                      value={tab.value}
                      className={cn(
                        'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
                        'data-[state=active]:bg-white data-[state=active]:text-lp-dark data-[state=active]:shadow-sm',
                        'data-[state=inactive]:text-lp-text-muted data-[state=inactive]:hover:text-lp-dark'
                      )}
                    >
                      {tab.label}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>

                <button
                  onClick={() => setSaveOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-lp-border bg-white px-3 py-1.5 text-sm font-medium text-lp-dark shadow-sm transition-colors hover:border-lp-dark"
                >
                  <Save size={14} />
                  Сохранить сценарий
                </button>
              </div>

              <Tabs.Content value="a" className="focus:outline-none">
                <ScenarioAPanel inputs={inputs} result={resultA} />
              </Tabs.Content>
              <Tabs.Content value="b" className="focus:outline-none">
                <ScenarioBPanel result={resultB} />
              </Tabs.Content>
              <Tabs.Content value="c" className="focus:outline-none">
                <ScenarioCPanel result={resultC} category={inputs.category} />
              </Tabs.Content>
            </Tabs.Root>
          </div>
        </div>
      </div>

      <SaveModal
        open={saveOpen}
        onOpenChange={setSaveOpen}
        inputs={inputs}
        result={resultA}
      />
    </Tooltip.Provider>
  );
}
