import {
  validateFileSize,
  validateExtension,
  sanitizeFilename,
  containsSuspiciousContent,
  generateSafeUploadPath,
} from '../validator';

describe('validateFileSize', () => {
  it('accepts valid sizes', () => {
    expect(validateFileSize(1000, 2000)).toBe(true);
    expect(validateFileSize(2000, 2000)).toBe(true);
  });

  it('rejects oversized files', () => {
    expect(validateFileSize(3000, 2000)).toBe(false);
  });

  it('rejects zero or negative sizes', () => {
    expect(validateFileSize(0, 1000)).toBe(false);
    expect(validateFileSize(-100, 1000)).toBe(false);
  });
});

describe('validateExtension', () => {
  it('validates image extensions', () => {
    expect(validateExtension('photo.jpg', 'image/jpeg')).toBe(true);
    expect(validateExtension('photo.jpeg', 'image/jpeg')).toBe(true);
    expect(validateExtension('photo.png', 'image/png')).toBe(true);
  });

  it('rejects mismatched extensions', () => {
    expect(validateExtension('photo.png', 'image/jpeg')).toBe(false);
    expect(validateExtension('video.mp4', 'image/png')).toBe(false);
  });

  it('handles case insensitivity', () => {
    expect(validateExtension('photo.JPG', 'image/jpeg')).toBe(true);
    expect(validateExtension('photo.PNG', 'image/png')).toBe(true);
  });
});

describe('sanitizeFilename', () => {
  it('removes special characters', () => {
    expect(sanitizeFilename('test@file!.jpg')).toBe('test_file_.jpg');
  });

  it('prevents path traversal', () => {
    expect(sanitizeFilename('../../../etc/passwd')).toBe('___etc_passwd');
  });

  it('preserves safe characters', () => {
    expect(sanitizeFilename('test-file_123.jpg')).toBe('test-file_123.jpg');
  });

  it('limits length', () => {
    const long = 'a'.repeat(300) + '.jpg';
    const result = sanitizeFilename(long);
    expect(result.length).toBeLessThanOrEqual(255);
    expect(result.endsWith('.jpg')).toBe(true);
  });
});

describe('containsSuspiciousContent', () => {
  it('detects script tags in buffer', () => {
    const buffer = new TextEncoder().encode('<script>alert(1)</script>').buffer;
    expect(containsSuspiciousContent(buffer)).toBe(true);
  });

  it('detects PHP code', () => {
    const buffer = new TextEncoder().encode('<?php echo "bad"; ?>').buffer;
    expect(containsSuspiciousContent(buffer)).toBe(true);
  });

  it('allows normal content', () => {
    const buffer = new TextEncoder().encode('Just normal text content').buffer;
    expect(containsSuspiciousContent(buffer)).toBe(false);
  });
});

describe('generateSafeUploadPath', () => {
  it('generates path with user folder structure', () => {
    const path = generateSafeUploadPath({
      userId: 'user123',
      originalFilename: 'photo.jpg',
      contentType: 'image/jpeg',
    });
    
    expect(path).toContain('user123/');
    expect(path).toMatch(/\d{4}\/\d{2}\//); // YYYY/MM/
    expect(path.endsWith('.jpg')).toBe(true);
  });

  it('sanitizes filename', () => {
    const path = generateSafeUploadPath({
      userId: 'user123',
      originalFilename: '../../../bad.jpg',
      contentType: 'image/jpeg',
    });
    
    expect(path).not.toContain('..');
  });

  it('generates unique paths', () => {
    const path1 = generateSafeUploadPath({
      userId: 'user123',
      originalFilename: 'photo.jpg',
      contentType: 'image/jpeg',
    });
    
    const path2 = generateSafeUploadPath({
      userId: 'user123',
      originalFilename: 'photo.jpg',
      contentType: 'image/jpeg',
    });
    
    expect(path1).not.toBe(path2);
  });
});
