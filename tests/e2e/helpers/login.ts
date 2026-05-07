import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

// Structure: SliderField root div > header div > span (label)
//                                               > Slider.Root > Slider.Thumb[role=slider]
// So from the label span we need to go up 2 levels to SliderField root, then find role=slider.
function sliderThumb(page: Page, label: string) {
  return page.getByText(label, { exact: true }).locator('../..').getByRole('slider');
}

/** Move a Radix UI Slider thumb to min (Home) using keyboard. */
export async function setSliderToMin(page: Page, label: string) {
  const thumb = sliderThumb(page, label);
  await thumb.focus();
  await thumb.press('Home');
}

export async function setSliderToMax(page: Page, label: string) {
  const thumb = sliderThumb(page, label);
  await thumb.focus();
  await thumb.press('End');
}

/** Press ArrowRight/Left n times on a slider. */
export async function nudgeSlider(page: Page, label: string, steps: number) {
  const thumb = sliderThumb(page, label);
  await thumb.focus();
  for (let i = 0; i < Math.abs(steps); i++) {
    await thumb.press(steps > 0 ? 'ArrowRight' : 'ArrowLeft');
  }
}
