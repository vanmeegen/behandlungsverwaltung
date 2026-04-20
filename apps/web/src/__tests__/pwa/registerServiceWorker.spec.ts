import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from '../../pwa/registerServiceWorker';

type MutableNav = { serviceWorker?: { register: (url: string) => Promise<unknown> } };

describe('registerServiceWorker', () => {
  const register = vi.fn().mockResolvedValue({});
  const nav = navigator as unknown as MutableNav;

  beforeEach(() => {
    register.mockClear();
    nav.serviceWorker = { register };
  });

  afterEach(() => {
    delete nav.serviceWorker;
  });

  it('registers /sw.js on window load', () => {
    registerServiceWorker();

    window.dispatchEvent(new Event('load'));

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('does nothing when serviceWorker is not available', () => {
    delete nav.serviceWorker;

    expect(() => registerServiceWorker()).not.toThrow();
    window.dispatchEvent(new Event('load'));
    expect(register).not.toHaveBeenCalled();
  });

  it('swallows a failed registration', async () => {
    register.mockRejectedValueOnce(new Error('boom'));

    registerServiceWorker();
    window.dispatchEvent(new Event('load'));

    await Promise.resolve();
    expect(register).toHaveBeenCalledTimes(1);
  });
});
