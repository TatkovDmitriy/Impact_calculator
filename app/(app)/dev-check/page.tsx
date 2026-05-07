'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type Status = 'idle' | 'loading' | 'ok' | 'error';

interface CheckResult {
  status: Status;
  detail?: string;
}

export default function DevCheckPage() {
  const { user } = useAuth();
  const [firebase, setFirebase] = useState<CheckResult>({ status: 'idle' });
  const [sheets, setSheets] = useState<CheckResult>({ status: 'idle' });

  useEffect(() => {
    // Firebase check: if we have a user, Firebase is connected
    if (user) {
      setFirebase({ status: 'ok', detail: user.email ?? 'authenticated' });
    } else {
      setFirebase({ status: 'error', detail: 'No auth user' });
    }

    // Sheets check: call /api/baseline
    setSheets({ status: 'loading' });
    fetch('/api/baseline')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const kitchenAov = data.baseline?.byCategory?.kitchen?.novoselAov;
        setSheets({
          status: 'ok',
          detail: `${data.source} · Kitchen Novosel AOV: ${kitchenAov?.toLocaleString('ru')} ₽`,
        });
      })
      .catch((err: Error) => setSheets({ status: 'error', detail: err.message }));
  }, [user]);

  const checks = [
    { label: 'Firebase Auth', result: firebase, hint: user?.email },
    { label: 'Baseline API (/api/baseline)', result: sheets },
  ] as const;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-lp-dark">Dev Check</h1>
        <p className="mt-1 text-sm text-lp-text-muted">
          Статус подключений. Только для разработки.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {checks.map(({ label, result }) => (
          <div
            key={label}
            className="flex items-start gap-3 rounded-xl border border-lp-border bg-white p-4 shadow-sm"
          >
            <div className="mt-0.5">
              {result.status === 'loading' && (
                <Loader2 size={18} className="animate-spin text-lp-text-muted" />
              )}
              {result.status === 'ok' && (
                <CheckCircle2 size={18} className="text-[#2E7D32]" />
              )}
              {result.status === 'error' && (
                <XCircle size={18} className="text-lp-danger" />
              )}
              {result.status === 'idle' && (
                <div className="h-[18px] w-[18px] rounded-full border-2 border-lp-border" />
              )}
            </div>
            <div>
              <div className="text-sm font-medium text-lp-dark">{label}</div>
              {result.detail && (
                <div className="mt-0.5 font-mono text-xs text-lp-text-muted">
                  {result.detail}
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="rounded-xl border border-lp-border bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-lp-text-muted uppercase tracking-wide">
            Auth User
          </div>
          <div className="mt-1 font-mono text-sm text-lp-dark">
            {user ? (
              <>
                <div>{user.email}</div>
                <div className="text-xs text-lp-text-muted">uid: {user.uid}</div>
              </>
            ) : (
              <span className="text-lp-danger">Not authenticated</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
