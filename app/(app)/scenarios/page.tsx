import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export default function ScenariosPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-lp-dark">Сценарии</h1>
        <p className="mt-1 text-sm text-lp-text-muted">
          История сохранённых расчётов. Каждый сценарий содержит снэпшот baseline-метрик.
        </p>
      </div>

      <div className="rounded-xl border border-lp-border bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <BookOpen size={40} className="text-lp-text-muted" />
          <h2 className="text-base font-semibold text-lp-dark">Нет сохранённых сценариев</h2>
          <p className="max-w-sm text-sm text-lp-text-muted">
            Откройте калькулятор, настройте параметры и нажмите «Сохранить сценарий». Сценарии сохраняются в Firestore вместе со снэпшотом метрик.
          </p>
          <Link
            href="/calculators"
            className="mt-2 rounded-lg bg-lp-yellow px-4 py-2 text-sm font-semibold text-lp-dark hover:bg-lp-yellow/80"
          >
            Открыть калькулятор
          </Link>
        </div>
      </div>
    </div>
  );
}
