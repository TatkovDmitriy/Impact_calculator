'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Logo } from '@/components/brand/Logo';
import { signIn, signOut } from '@/lib/firebase/auth';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
});
type LoginFields = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFields>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async ({ email, password }: LoginFields) => {
    setServerError('');
    setIsSubmitting(true);
    try {
      const user = await signIn(email, password);
      const idToken = await user.getIdToken();

      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const body = await res.json();
        if (body.error === 'access_denied') {
          setServerError(body.message ?? 'Доступ закрыт. Обратитесь к администратору.');
        } else {
          setServerError('Ошибка авторизации. Попробуйте снова.');
        }
        await signOut();
        return;
      }

      router.replace('/dashboard');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setServerError('Неверный email или пароль.');
      } else if (code === 'auth/user-not-found') {
        setServerError('Пользователь не найден.');
      } else if (code === 'auth/too-many-requests') {
        setServerError('Слишком много попыток. Подождите немного.');
      } else {
        setServerError('Не удалось войти. Проверьте соединение.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-xl border border-lp-border bg-white p-8 shadow-sm">
      <div className="mb-8 flex justify-center">
        <Logo width={140} height={36} linkTo="" />
      </div>

      <h1 className="mb-1 text-center text-xl font-semibold text-lp-dark">
        Impact Calculator
      </h1>
      <p className="mb-6 text-center text-sm text-lp-text-muted">
        Войдите с корпоративным email
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <div>
          <input
            {...register('email')}
            type="email"
            placeholder="email@lemana.pro"
            autoComplete="email"
            className={cn(
              'h-10 w-full rounded-lg border px-3 text-sm outline-none transition-colors',
              'focus:border-lp-dark',
              errors.email ? 'border-lp-danger' : 'border-lp-border'
            )}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-lp-danger">{errors.email.message}</p>
          )}
        </div>

        <div>
          <input
            {...register('password')}
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            className={cn(
              'h-10 w-full rounded-lg border px-3 text-sm outline-none transition-colors',
              'focus:border-lp-dark',
              errors.password ? 'border-lp-danger' : 'border-lp-border'
            )}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-lp-danger">{errors.password.message}</p>
          )}
        </div>

        {serverError && (
          <p className="rounded-lg bg-lp-danger/10 px-3 py-2 text-sm text-lp-danger">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-10 rounded-lg bg-lp-yellow font-semibold text-lp-dark transition-opacity disabled:opacity-60"
        >
          {isSubmitting ? 'Вход…' : 'Войти'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-lp-text-muted">
        Доступ только для приглашённых пользователей
      </p>
    </div>
  );
}
