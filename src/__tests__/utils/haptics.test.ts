// @ts-nocheck
/**
 * Unit Tests: haptics utility — vibrate()
 */

import { vibrate } from '../../utils/haptics';

describe('vibrate()', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls navigator.vibrate with default pattern (8) when vibrate is supported', () => {
    const mockVibrate = jest.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      configurable: true,
      writable: true,
    });

    vibrate();

    expect(mockVibrate).toHaveBeenCalledTimes(1);
    expect(mockVibrate).toHaveBeenCalledWith(8);
  });

  it('calls navigator.vibrate with custom number pattern', () => {
    const mockVibrate = jest.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      configurable: true,
      writable: true,
    });

    vibrate(200);

    expect(mockVibrate).toHaveBeenCalledWith(200);
  });

  it('calls navigator.vibrate with array pattern', () => {
    const mockVibrate = jest.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      configurable: true,
      writable: true,
    });

    vibrate([100, 50, 100]);

    expect(mockVibrate).toHaveBeenCalledWith([100, 50, 100]);
  });

  it('does nothing when navigator.vibrate is not supported', () => {
    const originalNavigator = global.navigator;
    Object.defineProperty(global, 'navigator', {
      value: {},
      configurable: true,
      writable: true,
    });

    expect(() => vibrate()).not.toThrow();

    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });
});
