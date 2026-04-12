// @ts-nocheck
/**
 * Unit Tests: imageService.validateImage — pure validation logic, no Firebase deps
 */

jest.mock('../../services/firebase', () => ({ storage: {} }));
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
  uploadBytesResumable: jest.fn(),
}));

// eslint-disable-next-line import/first
import { imageService } from '../../services/storage';

const makeFile = (type: string, size: number): File => {
  const file = new File(['x'.repeat(size)], 'test.img', { type });
  return file;
};

const FIVE_MB = 5 * 1024 * 1024;

describe('imageService.validateImage()', () => {
  it('returns isValid: false for non-image file type', () => {
    const file = makeFile('application/pdf', 100);
    const result = imageService.validateImage(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns isValid: false for file > 5MB', () => {
    const file = makeFile('image/jpeg', FIVE_MB + 1);
    const result = imageService.validateImage(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('5MB');
  });

  it('returns isValid: false for unsupported format (image/gif)', () => {
    const file = makeFile('image/gif', 1000);
    const result = imageService.validateImage(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('JPEG, PNG, WebP');
  });

  it('returns isValid: true for image/jpeg under 5MB', () => {
    const file = makeFile('image/jpeg', 1000);
    const result = imageService.validateImage(file);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns isValid: true for image/png under 5MB', () => {
    const file = makeFile('image/png', 1000);
    const result = imageService.validateImage(file);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns isValid: true for image/webp under 5MB', () => {
    const file = makeFile('image/webp', 1000);
    const result = imageService.validateImage(file);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('error message mentions "5MB" for oversized files', () => {
    const file = makeFile('image/jpeg', FIVE_MB + 1);
    const result = imageService.validateImage(file);
    expect(result.error).toMatch(/5MB/);
  });

  it('error message mentions "JPEG, PNG, WebP" for unsupported formats', () => {
    const file = makeFile('image/gif', 100);
    const result = imageService.validateImage(file);
    expect(result.error).toMatch(/JPEG, PNG, WebP/);
  });
});
