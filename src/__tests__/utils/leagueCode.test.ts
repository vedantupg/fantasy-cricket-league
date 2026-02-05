// @ts-nocheck
/**
 * Unit Tests: League Code Utilities
 */

import { generateLeagueCode, isValidLeagueCode } from '../../utils/leagueCode';

describe('League Code Utilities', () => {
  describe('generateLeagueCode', () => {
    it('should generate a 6-character code', () => {
      const code = generateLeagueCode();
      expect(code).toHaveLength(6);
    });

    it('should generate code with only uppercase letters and numbers', () => {
      const code = generateLeagueCode();
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should generate unique codes on multiple calls', () => {
      const codes = new Set();
      
      // Generate 100 codes
      for (let i = 0; i < 100; i++) {
        codes.add(generateLeagueCode());
      }
      
      // All codes should be unique (with very high probability)
      expect(codes.size).toBeGreaterThan(95);
    });

    it('should never include lowercase letters', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateLeagueCode();
        expect(code).not.toMatch(/[a-z]/);
      }
    });

    it('should never include special characters', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateLeagueCode();
        expect(code).not.toMatch(/[^A-Z0-9]/);
      }
    });
  });

  describe('isValidLeagueCode', () => {
    it('should return true for valid 6-character uppercase alphanumeric codes', () => {
      expect(isValidLeagueCode('ABC123')).toBe(true);
      expect(isValidLeagueCode('XYZ789')).toBe(true);
      expect(isValidLeagueCode('000000')).toBe(true);
      expect(isValidLeagueCode('AAAAAA')).toBe(true);
      expect(isValidLeagueCode('A1B2C3')).toBe(true);
    });

    it('should return false for codes with lowercase letters', () => {
      expect(isValidLeagueCode('abc123')).toBe(false);
      expect(isValidLeagueCode('Abc123')).toBe(false);
      expect(isValidLeagueCode('ABC12c')).toBe(false);
    });

    it('should return false for codes with wrong length', () => {
      expect(isValidLeagueCode('ABC12')).toBe(false); // 5 chars
      expect(isValidLeagueCode('ABC1234')).toBe(false); // 7 chars
      expect(isValidLeagueCode('')).toBe(false); // empty
      expect(isValidLeagueCode('A')).toBe(false); // 1 char
    });

    it('should return false for codes with special characters', () => {
      expect(isValidLeagueCode('ABC-123')).toBe(false);
      expect(isValidLeagueCode('ABC_123')).toBe(false);
      expect(isValidLeagueCode('ABC 123')).toBe(false);
      expect(isValidLeagueCode('ABC@123')).toBe(false);
      expect(isValidLeagueCode('ABC#123')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isValidLeagueCode(null as any)).toBe(false);
      expect(isValidLeagueCode(undefined as any)).toBe(false);
    });

    it('should validate generated codes', () => {
      // Generate 50 codes and verify all are valid
      for (let i = 0; i < 50; i++) {
        const code = generateLeagueCode();
        expect(isValidLeagueCode(code)).toBe(true);
      }
    });
  });
});

export {};
