import {
  sanitizeText,
  sanitizeHandle,
  sanitizeEmail,
  sanitizeURL,
  isSuspiciousInput,
  MAX_LENGTHS,
} from '../sanitize';

describe('sanitizeText', () => {
  it('removes HTML tags', () => {
    expect(sanitizeText('<script>alert("xss")</script>Hello')).toBe('Hello');
    expect(sanitizeText('<div>Test</div>')).toBe('Test');
  });

  it('trims whitespace', () => {
    expect(sanitizeText('  Hello  ')).toBe('Hello');
  });

  it('enforces max length', () => {
    const long = 'a'.repeat(100);
    expect(sanitizeText(long, 50)).toHaveLength(50);
  });

  it('handles null/undefined', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
  });
});

describe('sanitizeHandle', () => {
  it('converts to lowercase', () => {
    expect(sanitizeHandle('TestUser')).toBe('testuser');
  });

  it('removes invalid characters', () => {
    expect(sanitizeHandle('test@user!')).toBe('testuser');
  });

  it('allows alphanumeric, underscore, hyphen', () => {
    expect(sanitizeHandle('test_user-123')).toBe('test_user-123');
  });

  it('enforces max length', () => {
    const long = 'a'.repeat(50);
    expect(sanitizeHandle(long)).toHaveLength(MAX_LENGTHS.handle);
  });

  it('must start with alphanumeric', () => {
    expect(sanitizeHandle('__test')).toBe('test');
    expect(sanitizeHandle('--test')).toBe('test');
  });
});

describe('sanitizeEmail', () => {
  it('validates email format', () => {
    expect(sanitizeEmail('test@example.com')).toBe('test@example.com');
    expect(sanitizeEmail('invalid-email')).toBe('');
    expect(sanitizeEmail('test@')).toBe('');
  });

  it('converts to lowercase', () => {
    expect(sanitizeEmail('Test@Example.COM')).toBe('test@example.com');
  });

  it('removes HTML', () => {
    expect(sanitizeEmail('<script>test@example.com</script>')).toBe('');
  });
});

describe('sanitizeURL', () => {
  it('validates http/https URLs', () => {
    expect(sanitizeURL('https://example.com')).toBe('https://example.com/');
    expect(sanitizeURL('http://example.com')).toBe('http://example.com/');
  });

  it('rejects non-http protocols', () => {
    expect(sanitizeURL('javascript:alert(1)')).toBeNull();
    expect(sanitizeURL('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('rejects invalid URLs', () => {
    expect(sanitizeURL('not a url')).toBeNull();
  });
});

describe('isSuspiciousInput', () => {
  it('detects script tags', () => {
    expect(isSuspiciousInput('<script>alert(1)</script>')).toBe(true);
    expect(isSuspiciousInput('normal text')).toBe(false);
  });

  it('detects event handlers', () => {
    expect(isSuspiciousInput('onclick=alert(1)')).toBe(true);
    expect(isSuspiciousInput('onload=badstuff')).toBe(true);
  });

  it('detects javascript: protocol', () => {
    expect(isSuspiciousInput('javascript:alert(1)')).toBe(true);
  });

  it('detects iframes', () => {
    expect(isSuspiciousInput('<iframe src="evil.com"></iframe>')).toBe(true);
  });
});
