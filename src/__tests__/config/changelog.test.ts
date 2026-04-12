// @ts-nocheck
/**
 * Unit Tests: changelog config — data shape validation
 */

import { CHANGELOG, CURRENT_VERSION } from '../../config/changelog';

describe('CHANGELOG', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(CHANGELOG)).toBe(true);
    expect(CHANGELOG.length).toBeGreaterThan(0);
  });

  it('every Release has version, date, and a non-empty features array', () => {
    for (const release of CHANGELOG) {
      expect(typeof release.version).toBe('string');
      expect(release.version.length).toBeGreaterThan(0);

      expect(typeof release.date).toBe('string');
      expect(release.date.length).toBeGreaterThan(0);

      expect(Array.isArray(release.features)).toBe(true);
      expect(release.features.length).toBeGreaterThan(0);
      for (const feature of release.features) {
        expect(typeof feature).toBe('string');
        expect(feature.length).toBeGreaterThan(0);
      }
    }
  });

  it('CURRENT_VERSION matches CHANGELOG[0].version', () => {
    expect(CURRENT_VERSION).toBe(CHANGELOG[0].version);
  });

  it('has no duplicate version strings', () => {
    const versions = CHANGELOG.map((r) => r.version);
    const uniqueVersions = new Set(versions);
    expect(uniqueVersions.size).toBe(versions.length);
  });
});
