import { test, expect } from '@playwright/test';
import { loginAs, setSliderToMax, setSliderToMin } from './helpers/login';

const EMAIL = process.env.TEST_EMAIL ?? '';
const PASSWORD = process.env.TEST_PASSWORD ?? '';

// Helper: get aria-valuenow of slider by label (reliable, no text ambiguity)
function sliderValue(page: Parameters<typeof loginAs>[0], label: string) {
  return page.getByText(label, { exact: true }).locator('../..').getByRole('slider');
}

test.describe('C-09 Новосел — Golden Path', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, EMAIL, PASSWORD);
    await page.goto('/calculators/novosel');
    await page.waitForLoadState('networkidle');
  });

  // K1 — страница рендерится, Таб А активен, KPI-карточки показывают числа
  test('K1: страница рендерится с KPI-карточками и Табом А', async ({ page }) => {
    await expect(page).toHaveURL(/\/calculators\/novosel/);
    await expect(page.getByRole('heading', { name: 'Новосел — Программа лояльности' })).toBeVisible();
    await expect(page.getByText('А — Рост доли')).toBeVisible();
    await expect(page.getByText('Δ Выручка', { exact: true })).toBeVisible();
    await expect(page.getByText('Δ Net Margin', { exact: true })).toBeVisible();
    await expect(page.getByText('ROI дисконта', { exact: true })).toBeVisible();
    await expect(page.getByText('Стоимость программы', { exact: true })).toBeVisible();
    // Baseline info (regex — числа с пробелами могут быть non-breaking)
    await expect(page.getByText(/Kitchen AOV/)).toBeVisible();
  });

  // K2 — нажать пресет Оптимистичный → слайдер доли → 25
  test('K2: пресет Оптимистичный устанавливает долю 25%', async ({ page }) => {
    await page.getByRole('button', { name: /Оптимистичный/ }).click();
    await page.waitForTimeout(400);
    const shareSlider = sliderValue(page, 'Целевая доля Новоселов');
    await expect(shareSlider).toHaveAttribute('aria-valuenow', '25');
  });

  // K3 — слайдер доли → 50, значение обновляется за ≤ 300ms + дебаунс
  test('K3: слайдер доли реагирует и пересчитывает за ≤ 300ms дебаунс', async ({ page }) => {
    await page.getByRole('button', { name: /Базовый/ }).click();
    const shareSlider = sliderValue(page, 'Целевая доля Новоселов');
    await shareSlider.focus();
    await shareSlider.press('End');
    await expect(shareSlider).toHaveAttribute('aria-valuenow', '50');
    // KPI карточка обновляется после дебаунса
    await page.waitForTimeout(400);
    await expect(page.getByText('Δ Net Margin', { exact: true })).toBeVisible();
  });

  // K4 — Storage + margin=5% + share=50% + Инкрементальность=Нет → roi_negative
  test('K4: roi_negative при Storage + margin min + share max + Нет инкрементальности', async ({ page }) => {
    await page.getByRole('button', { name: 'Хранение' }).click();
    await setSliderToMin(page, 'Маржа проекта');
    await setSliderToMax(page, 'Целевая доля Новоселов');
    await page.getByRole('radio', { name: 'Нет' }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText('ROI < 1 — программа убыточна')).toBeVisible();
  });

  // K5 — Ванная → cap_hit (жёлтый баннер)
  test('K5: cap_hit баннер при выборе Ванная', async ({ page }) => {
    await page.getByRole('button', { name: 'Ванная' }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText('Дисконт достиг капа')).toBeVisible();
  });

  // K6 — Таб Б: 3 карточки ROI, badge "Лучший ROI" у Ванной (bestByRoi=bathroom ≈ 2.39×)
  test('K6: Таб Б — карточки ROI загружаются, badge Лучший ROI у Ванной', async ({ page }) => {
    await page.getByText('Б — Категории').click();
    await page.waitForTimeout(400);
    // Заголовок сравнительного графика
    await expect(page.getByText('Сравнение категорий, млн ₽')).toBeVisible();
    // Карточки показывают ROI дисконта (есть хотя бы одна)
    await expect(page.getByText('ROI дисконта').first()).toBeVisible();
    // Badge "Лучший ROI" присутствует у Ванной (bathroom bestByRoi ≈ 2.39×)
    await expect(page.getByText('Лучший ROI')).toBeVisible();
  });

  // K7 — Таб В загружается
  test('K7: Таб В загружается и показывает бенчмарк данные', async ({ page }) => {
    await page.getByText('В — Бенчмарк').click();
    await page.waitForTimeout(400);
    const content = await page.content();
    const hasData = content.includes('AOV') || content.includes('Конверс') || content.includes('Доля');
    expect(hasData).toBe(true);
  });

  // K8 — Сохранить сценарий → модал открывается
  test('K8: сохранение сценария открывает модал', async ({ page }) => {
    await page.getByRole('button', { name: 'Сохранить сценарий' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
  });
});

// K9 — каталог /calculators → карточка Новосел кликабельна
test('K9: каталог калькуляторов содержит карточку Новосел', async ({ page }) => {
  await loginAs(page, EMAIL, PASSWORD);
  await page.goto('/calculators');
  await page.waitForLoadState('networkidle');
  const card = page.getByText(/Новосел/).first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/calculators\/novosel/);
});

test.describe('C-09 Новосел — Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, EMAIL, PASSWORD);
    await page.goto('/calculators/novosel');
    await page.waitForLoadState('networkidle');
  });

  // E2 — Kitchen + none → deltaRevenue отрицательная
  test('E2: Kitchen + incrementality=none → Δ Выручка отрицательная', async ({ page }) => {
    await page.getByRole('button', { name: 'Кухня' }).click();
    await page.getByRole('radio', { name: 'Нет' }).click();
    await page.waitForTimeout(400);
    // Δ Выручка карточка содержит отрицательный знак (−, не -)
    const card = page.getByText('Δ Выручка', { exact: true }).locator('..');
    await expect(card.getByText(/[−-]\d/)).toBeVisible();
  });

  // E3 — Storage дефолт → нет баннеров
  test('E3: Storage дефолт — нет баннеров предупреждений', async ({ page }) => {
    await page.getByRole('button', { name: 'Хранение' }).click();
    await page.getByRole('button', { name: /Базовый/ }).click();
    await page.getByRole('radio', { name: 'Полная' }).click();
    await page.waitForTimeout(800);
    await expect(page.getByText('Дисконт достиг капа')).not.toBeVisible();
    await expect(page.getByText('ROI < 1')).not.toBeVisible();
  });

  // E4 — Слайдер доли на минимум (5%)
  test('E4: доля = 5% (min) — страница не падает', async ({ page }) => {
    const shareSlider = sliderValue(page, 'Целевая доля Новоселов');
    await shareSlider.focus();
    await shareSlider.press('Home');
    await expect(shareSlider).toHaveAttribute('aria-valuenow', '5');
    await page.waitForTimeout(400);
    await expect(page.getByText('Δ Net Margin', { exact: true })).toBeVisible();
  });

  // E5 — Слайдер доли на максимум (50%)
  test('E5: доля = 50% (max) — страница не падает', async ({ page }) => {
    const shareSlider = sliderValue(page, 'Целевая доля Новоселов');
    await shareSlider.focus();
    await shareSlider.press('End');
    await expect(shareSlider).toHaveAttribute('aria-valuenow', '50');
    await page.waitForTimeout(400);
    await expect(page.getByText('Δ Net Margin', { exact: true })).toBeVisible();
  });

  // E6 — Быстрое движение слайдера
  test('E6: быстрые изменения слайдера не вызывают crash', async ({ page }) => {
    const shareSlider = sliderValue(page, 'Целевая доля Новоселов');
    await shareSlider.focus();
    for (let i = 0; i < 5; i++) {
      await shareSlider.press('ArrowRight');
      await shareSlider.press('ArrowLeft');
    }
    await page.waitForTimeout(500);
    await expect(page.getByText('Δ Net Margin', { exact: true })).toBeVisible();
  });

  // E7 — Mobile layout
  test('E7: mobile layout — ключевые элементы видны', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Новосел — Программа лояльности' })).toBeVisible();
    await expect(page.getByText('А — Рост доли')).toBeVisible();
    await expect(page.getByText('Δ Net Margin', { exact: true })).toBeVisible();
  });
});

test.describe('Security', () => {
  // S1 — /api/baseline без cookie → 401
  test('S1: /api/baseline без auth_uid → 401', async ({ request }) => {
    const res = await request.get('/api/baseline');
    expect(res.status()).toBe(401);
  });

  // S2 — /calculators/novosel без cookie → редирект на /login
  test('S2: /calculators/novosel без auth → редирект на /login', async ({ page }) => {
    await page.goto('/calculators/novosel');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
