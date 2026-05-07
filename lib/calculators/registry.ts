import type { CalculatorPlugin } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry: CalculatorPlugin<any, any, any>[] = [];

export function registerCalculator<I, O, B>(plugin: CalculatorPlugin<I, O, B>): void {
  registry.push(plugin);
}

export function getCalculator(slug: string) {
  return registry.find((p) => p.slug === slug) ?? null;
}

export function getAllCalculators() {
  return [...registry];
}
