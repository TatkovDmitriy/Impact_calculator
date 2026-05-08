import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/login';

const EMAIL = process.env.TEST_EMAIL ?? '';
const PASSWORD = process.env.TEST_PASSWORD ?? '';

test.describe('Phase 4 — Планировщик сценариев', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, EMAIL, PASSWORD);
    await page.goto('/calculators/novosel');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Планировщик' }).click();
    await page.waitForTimeout(300);
  });

  // P1 — Плановщик рендерится: заголовок, 4 KPI-карточки, заголовок графика
  test('P1: Планировщик рендерится с KPI-карточками и графиком', async ({ page }) => {
    await expect(page.getByText('Планировщик сценариев')).toBeVisible();
    await expect(page.getByText('Dec 2025 – Dec 2026 · 13 месяцев')).toBeVisible();
    await expect(page.getByText('GMV total', { exact: true })).toBeVisible();
    await expect(page.getByText('Маржа total', { exact: true })).toBeVisible();
    await expect(page.getByText('Затраты на дисконт', { exact: true })).toBeVisible();
    // 'Чистая маржа' appears in KPI card, chart title and chart legend — target the KPI card (first)
    await expect(page.getByText('Чистая маржа', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('GMV по категориям + Чистая маржа, млн ₽')).toBeVisible();
  });

  // P2 — 3 начальные категории видны в аккордионе
  test('P2: три начальные категории — Кухня, Ванная, Хранение', async ({ page }) => {
    await expect(page.getByText('Кухня').first()).toBeVisible();
    await expect(page.getByText('Ванная').first()).toBeVisible();
    await expect(page.getByText('Хранение').first()).toBeVisible();
    await expect(page.getByText('Категории (3)')).toBeVisible();
  });

  // P3 — Аккордион Кухня открывается → таблица и конфиг дисконта видны
  test('P3: аккордион Кухня открывается и показывает таблицу и конфиг дисконта', async ({ page }) => {
    // Use cursor-pointer div to target accordion header (not Recharts legend which also has "Кухня")
    await page.locator('div[class*="cursor-pointer"]').filter({ hasText: 'Кухня' }).click();
    await page.waitForTimeout(200);
    await expect(page.getByText('Данные по месяцам')).toBeVisible();
    await expect(page.getByText('Конфигурация дисконта')).toBeVisible();
    await expect(page.getByRole('button', { name: '% с капом' }).first()).toBeVisible();
  });

  // P4 — Добавить категорию: форма открывается, категория добавляется
  test('P4: добавление новой категории', async ({ page }) => {
    await page.getByRole('button', { name: /Добавить категорию/ }).click();
    await expect(page.getByText('Новая категория')).toBeVisible();

    await page.getByPlaceholder(/Напр. Полы/).fill('Полы');
    // Use exact: true to distinguish "Добавить" (submit) from "Добавить категорию" (open form)
    await page.getByRole('button', { name: 'Добавить', exact: true }).click();
    await page.waitForTimeout(400);

    await expect(page.getByText('Полы').first()).toBeVisible();
    await expect(page.getByText('Категории (4)')).toBeVisible();
  });

  // P5 — Отмена формы добавления
  test('P5: отмена формы добавления категории', async ({ page }) => {
    await page.getByRole('button', { name: /Добавить категорию/ }).click();
    await expect(page.getByText('Новая категория')).toBeVisible();
    await page.getByRole('button', { name: 'Отмена' }).click();
    await expect(page.getByText('Новая категория')).not.toBeVisible();
    await expect(page.getByText('Категории (3)')).toBeVisible();
  });

  // P6 — Кнопка «Добавить» задизейблена при пустом имени
  test('P6: кнопка Добавить недоступна при пустом названии', async ({ page }) => {
    await page.getByRole('button', { name: /Добавить категорию/ }).click();
    // exact: true to avoid matching "Добавить категорию" button
    const addBtn = page.getByRole('button', { name: 'Добавить', exact: true });
    await expect(addBtn).toBeDisabled();
  });

  // P7 — Переключатель режима дисконта (pct_cap → fixed)
  test('P7: переключение режима дисконта на Фиксированная', async ({ page }) => {
    await page.locator('div[class*="cursor-pointer"]').filter({ hasText: 'Кухня' }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Фиксированная' }).first().click();
    await expect(page.getByText('Сумма ₽').first()).toBeVisible();
    // В режиме fixed поле Кап ₽ исчезает
    await expect(page.getByText('Кап ₽').first()).not.toBeVisible();
  });

  // P8 — Сохранить сценарий → диалог
  test('P8: кнопка Сохранить сценарий открывает диалог', async ({ page }) => {
    await page.getByRole('button', { name: 'Сохранить сценарий' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Сохранить сценарий Планировщика')).toBeVisible();
  });

  // P9 — Переключение Планировщик → Анализ → Планировщик: состояние сохраняется
  test('P9: состояние Планировщика сохраняется при переключении табов', async ({ page }) => {
    // Добавляем категорию
    await page.getByRole('button', { name: /Добавить категорию/ }).click();
    await page.getByPlaceholder(/Напр. Полы/).fill('Тест');
    await page.getByRole('button', { name: 'Добавить', exact: true }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Категории (4)')).toBeVisible();

    // Переключаемся на Анализ
    await page.getByRole('button', { name: 'Анализ A/B/C' }).click();
    await expect(page.getByText('А — Рост доли')).toBeVisible();

    // Возвращаемся — категория сохранена
    await page.getByRole('button', { name: 'Планировщик' }).click();
    await page.waitForTimeout(200);
    await expect(page.getByText('Категории (4)')).toBeVisible();
    await expect(page.getByText('Тест').first()).toBeVisible();
  });

  // P10 — GMV считается (ненулевое значение при начальных данных)
  test('P10: GMV total показывает ненулевое значение на начальных данных', async ({ page }) => {
    const gmvCard = page.getByText('GMV total').locator('..');
    // AnimatedNumber рендерит число — ищем паттерн "X,X млн ₽" где X > 0
    await expect(gmvCard.getByText(/\d+,\d+ млн ₽/)).toBeVisible({ timeout: 2_000 });
  });
});

// P11 — Анализ A/B/C: переключение на Планировщик не ломает существующий функционал
test('P11: переключение на Планировщик и обратно не ломает Анализ', async ({ page }) => {
  await loginAs(page, EMAIL, PASSWORD);
  await page.goto('/calculators/novosel');
  await page.waitForLoadState('networkidle');

  // Проверяем Анализ работает
  await expect(page.getByText('Δ Net Margin', { exact: true })).toBeVisible();

  // Переключаем на Планировщик
  await page.getByRole('button', { name: 'Планировщик' }).click();
  await expect(page.getByText('GMV total')).toBeVisible();

  // Возвращаемся на Анализ
  await page.getByRole('button', { name: 'Анализ A/B/C' }).click();
  await expect(page.getByText('Δ Net Margin', { exact: true })).toBeVisible();
  await expect(page.getByText('Δ Выручка', { exact: true })).toBeVisible();
  await expect(page.getByText('ROI дисконта', { exact: true })).toBeVisible();
});
