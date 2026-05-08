import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/login';

const EMAIL = process.env.TEST_EMAIL ?? '';
const PASSWORD = process.env.TEST_PASSWORD ?? '';

test.describe('Phase 4 v3 — Планировщик сценариев v3', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, EMAIL, PASSWORD);
    await page.goto('/calculators/novosel');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Планировщик' }).click();
    // Wait for skeleton to resolve (useEffect prefill on mount)
    await page.waitForTimeout(500);
  });

  // P1 — Рендер: заголовок v3, subtitle, 4 KPI, 3 категории
  test('P1: Планировщик v3 рендерится с KPI и тремя категориями', async ({ page }) => {
    await expect(page.getByText('Планировщик сценариев v3')).toBeVisible();
    await expect(page.getByText('Дек 2025 – Дек 2026 · 5 факт + 8 прогноз')).toBeVisible();
    await expect(page.getByText('GMV total', { exact: true })).toBeVisible();
    await expect(page.getByText('Маржа total', { exact: true })).toBeVisible();
    await expect(page.getByText('Затраты на дисконт', { exact: true })).toBeVisible();
    // 'Чистая маржа' appears in KPI card + chart legend — target first
    await expect(page.getByText('Чистая маржа', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Категории (3)')).toBeVisible();
  });

  // P2 — 3 начальные категории видны в аккордионе
  test('P2: три начальные категории — Кухня, Ванная, Хранение', async ({ page }) => {
    await expect(page.getByText('Кухня').first()).toBeVisible();
    await expect(page.getByText('Ванная').first()).toBeVisible();
    await expect(page.getByText('Хранение').first()).toBeVisible();
  });

  // P3 — Аккордион Кухня открывается → историческая таблица + конфиг + слайдер
  test('P3: аккордион Кухня открывается и показывает таблицу и слайдер доли', async ({ page }) => {
    // cursor-pointer div targets accordion header (not Recharts legend)
    await page.locator('div[class*="cursor-pointer"]').filter({ hasText: 'Кухня' }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Фактические данные (дек 2025 – апр 2026)')).toBeVisible();
    await expect(page.getByText('Конфигурация дисконта')).toBeVisible();
    await expect(page.getByText('Целевая доля Новоселов (прогноз)')).toBeVisible();
  });

  // P4 — Историческая таблица: декабрь 2025 присутствует, totalCreated Кухня = 32 092
  test('P4: историческая таблица показывает 2025-12 и totalCreated Кухни = 32092', async ({ page }) => {
    await page.locator('div[class*="cursor-pointer"]').filter({ hasText: 'Кухня' }).click();
    await page.waitForTimeout(300);
    // Row header shows the month string with ФАКТ badge
    await expect(page.getByText('2025-12')).toBeVisible();
    // totalCreated input for Dec 2025 kitchen = 32092 (from baseline)
    const inputs = page.locator('input[type="number"]');
    // First numeric input in the table is totalCreated for 2025-12
    await expect(inputs.first()).toHaveValue('32092');
  });

  // P5 — Слайдер «Целевая доля» видим, имеет корректный диапазон (1–50)
  test('P5: слайдер Целевая доля Новоселов в аккордионе Кухня работает', async ({ page }) => {
    await page.locator('div[class*="cursor-pointer"]').filter({ hasText: 'Кухня' }).click();
    await page.waitForTimeout(300);
    const slider = page.getByRole('slider');
    await expect(slider).toBeVisible();
    await expect(slider).toHaveAttribute('aria-valuemin', '1');
    await expect(slider).toHaveAttribute('aria-valuemax', '50');
  });

  // P6 — Слайдер двигается и обновляет отображаемый процент
  test('P6: слайдер Целевая доля обновляет значение при нажатии End (50%)', async ({ page }) => {
    await page.locator('div[class*="cursor-pointer"]').filter({ hasText: 'Кухня' }).click();
    await page.waitForTimeout(300);
    const slider = page.getByRole('slider');
    await slider.focus();
    await slider.press('End');
    await expect(slider).toHaveAttribute('aria-valuenow', '50');
    // Label span also updates
    await expect(page.getByText('50%')).toBeVisible();
  });

  // P7 — Переключатель режима дисконта (pct_cap → fixed)
  test('P7: переключение режима дисконта на Фиксированная', async ({ page }) => {
    await page.locator('div[class*="cursor-pointer"]').filter({ hasText: 'Кухня' }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Фиксированная' }).first().click();
    await expect(page.getByText('Сумма ₽').first()).toBeVisible();
    await expect(page.getByText('Кап ₽').first()).not.toBeVisible();
  });

  // P8 — Forecast chart рендерится после открытия аккордиона
  test('P8: ForecastChart показывает заголовок с именем категории', async ({ page }) => {
    await page.locator('div[class*="cursor-pointer"]').filter({ hasText: 'Кухня' }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText(/Кухня.*GMV.*Маржа.*Дисконт/)).toBeVisible();
  });

  // P9 — Кнопка «Сохранить сценарий» открывает диалог
  test('P9: кнопка Сохранить сценарий открывает диалог', async ({ page }) => {
    await page.getByRole('button', { name: 'Сохранить сценарий' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Сохранить сценарий').last()).toBeVisible();
  });

  // P10 — GMV total показывает ненулевое значение
  test('P10: GMV total показывает ненулевое значение на начальных данных', async ({ page }) => {
    const gmvCard = page.getByText('GMV total', { exact: true }).locator('..');
    await expect(gmvCard.getByText(/\d+,\d+ млн ₽/)).toBeVisible({ timeout: 2_000 });
  });

  // P11 — Переключение Планировщик → Анализ → Планировщик: состояние сохраняется
  test('P11: переключение на Анализ и обратно — данные планировщика не сбрасываются', async ({ page }) => {
    // Verify planner loaded
    await expect(page.getByText('Категории (3)')).toBeVisible();

    // Switch to Analysis
    await page.getByRole('button', { name: 'Анализ A/B/C' }).click();
    await expect(page.getByText('Δ Net Margin', { exact: true })).toBeVisible();

    // Switch back — categories should still be there (always-mounted div)
    await page.getByRole('button', { name: 'Планировщик' }).click();
    await page.waitForTimeout(200);
    await expect(page.getByText('Категории (3)')).toBeVisible();
    await expect(page.getByText('Планировщик сценариев v3')).toBeVisible();
  });
});

// P12 — Таб Анализ A/B/C: переключение на Планировщик не ломает существующий функционал
test('P12: Анализ A/B/C не сломан после переключения на Планировщик v3', async ({ page }) => {
  await loginAs(page, EMAIL, PASSWORD);
  await page.goto('/calculators/novosel');
  await page.waitForLoadState('networkidle');

  // Analysis works
  await expect(page.getByText('Δ Net Margin', { exact: true })).toBeVisible();

  // Switch to Planner
  await page.getByRole('button', { name: 'Планировщик' }).click();
  await page.waitForTimeout(500);
  await expect(page.getByText('Планировщик сценариев v3')).toBeVisible();

  // Back to Analysis — all 3 KPI still present
  await page.getByRole('button', { name: 'Анализ A/B/C' }).click();
  await expect(page.getByText('Δ Net Margin', { exact: true })).toBeVisible();
  await expect(page.getByText('Δ Выручка', { exact: true })).toBeVisible();
  await expect(page.getByText('ROI дисконта', { exact: true })).toBeVisible();
});
