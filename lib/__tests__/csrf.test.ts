import { 
  generateCSRFToken,
  requiresCSRFProtection,
} from '../csrf';

describe('generateCSRFToken', () => {
  it('generates random token', () => {
    const token1 = generateCSRFToken();
    const token2 = generateCSRFToken();
    
    expect(token1).toHaveLength(64); // 32 bytes = 64 hex chars
    expect(token2).toHaveLength(64);
    expect(token1).not.toBe(token2);
  });

  it('generates hex string', () => {
    const token = generateCSRFToken();
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });
});

describe('requiresCSRFProtection', () => {
  it('requires protection for POST', () => {
    expect(requiresCSRFProtection('POST')).toBe(true);
  });

  it('requires protection for PUT', () => {
    expect(requiresCSRFProtection('PUT')).toBe(true);
  });

  it('requires protection for DELETE', () => {
    expect(requiresCSRFProtection('DELETE')).toBe(true);
  });

  it('requires protection for PATCH', () => {
    expect(requiresCSRFProtection('PATCH')).toBe(true);
  });

  it('does not require for GET', () => {
    expect(requiresCSRFProtection('GET')).toBe(false);
  });

  it('handles lowercase methods', () => {
    expect(requiresCSRFProtection('post')).toBe(true);
    expect(requiresCSRFProtection('get')).toBe(false);
  });
});
