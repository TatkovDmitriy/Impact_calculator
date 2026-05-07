'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { NOVOSEL_BASELINE } from '@/lib/calculators/novosel/baseline';
import type { NovoselInputs, ScenarioAResult } from '@/lib/calculators/novosel/types';
import { cn } from '@/lib/utils';

const COLORS = [
  { value: '#2F3738', label: 'Тёмный' },
  { value: '#FDC300', label: 'Жёлтый' },
  { value: '#B84A4A', label: 'Красный' },
  { value: '#6B7280', label: 'Серый' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputs: NovoselInputs;
  result: ScenarioAResult;
}

export function SaveModal({ open, onOpenChange, inputs, result }: Props) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#FDC300');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const categoryLabel = inputs.category === 'all' ? 'Все категории'
    : inputs.category === 'kitchen' ? 'Кухня'
    : inputs.category === 'bathroom' ? 'Ванная'
    : 'Хранение';

  const autoLabel = `Новосел — ${categoryLabel} — ${Math.round(inputs.targetNovoselShare * 100)}% доля — 2026-05-07`;

  async function handleSave() {
    const user = auth.currentUser;
    if (!user) {
      setError('Необходима авторизация');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await addDoc(collection(db, 'scenarios'), {
        calculatorSlug: 'novosel',
        ownerId: user.uid,
        label: label.trim() || autoLabel,
        color,
        inputs,
        result,
        baselineSnapshot: NOVOSEL_BASELINE,
        createdAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => {
        onOpenChange(false);
        setSaved(false);
        setLabel('');
      }, 1200);
    } catch (e) {
      setError('Ошибка сохранения. Попробуйте снова.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
                Название
              </label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={autoLabel}
                className="h-9 w-full rounded-lg border border-lp-border px-3 text-sm text-lp-dark outline-none focus:border-lp-dark"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-lp-text-muted">
                Цвет метки
              </label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    title={c.label}
                    className={cn(
                      'h-7 w-7 rounded-full border-2 transition-all',
                      color === c.value ? 'border-lp-dark scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-lp-danger/10 px-3 py-2 text-sm text-lp-danger">
                {error}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="h-10 rounded-lg bg-lp-yellow text-sm font-semibold text-lp-dark transition-opacity disabled:opacity-60"
            >
              {saved ? '✓ Сохранено' : saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
