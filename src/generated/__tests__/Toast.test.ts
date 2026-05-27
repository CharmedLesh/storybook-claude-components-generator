import { describe, expect, it } from 'vitest';
import { TOAST_VARIANT_CONFIG, type ToastVariant } from '../Toast/Toast';

const VARIANTS: ToastVariant[] = ['success', 'error', 'warning'];

describe('TOAST_VARIANT_CONFIG', () => {
  it('defines all three variants', () => {
    for (const variant of VARIANTS) {
      expect(TOAST_VARIANT_CONFIG[variant]).toBeDefined();
    }
  });

  it.each(VARIANTS)('%s variant has all required fields', (variant) => {
    const config = TOAST_VARIANT_CONFIG[variant];
    expect(config.bg).toBeTruthy();
    expect(config.border).toBeTruthy();
    expect(config.text).toBeTruthy();
    expect(config.iconColor).toBeTruthy();
    expect(config.icon).toBeTruthy();
    expect(config.defaultTitle).toBeTruthy();
  });

  it('success uses green color scheme', () => {
    const config = TOAST_VARIANT_CONFIG.success;
    expect(config.bg).toContain('green');
    expect(config.border).toContain('green');
    expect(config.iconColor).toContain('green');
    expect(config.defaultTitle).toBe('Success');
  });

  it('error uses red color scheme', () => {
    const config = TOAST_VARIANT_CONFIG.error;
    expect(config.bg).toContain('red');
    expect(config.border).toContain('red');
    expect(config.iconColor).toContain('red');
    expect(config.defaultTitle).toBe('Error');
  });

  it('warning uses amber color scheme', () => {
    const config = TOAST_VARIANT_CONFIG.warning;
    expect(config.bg).toContain('amber');
    expect(config.border).toContain('amber');
    expect(config.iconColor).toContain('amber');
    expect(config.defaultTitle).toBe('Warning');
  });

  it('each variant has a distinct icon', () => {
    const icons = VARIANTS.map((v) => TOAST_VARIANT_CONFIG[v].icon);
    const unique = new Set(icons);
    expect(unique.size).toBe(VARIANTS.length);
  });
});
