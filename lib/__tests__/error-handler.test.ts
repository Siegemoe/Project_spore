import {
  formatErrorForUser,
  getErrorMessage,
  isRetryableError,
} from '../error-handler';
import { BadRequestError, UnauthorizedError, SupabaseError } from '../errors';

describe('formatErrorForUser', () => {
  it('formats BadRequestError', () => {
    const error = new BadRequestError('Invalid input');
    const result = formatErrorForUser(error);
    
    expect(result.error).toBe('Bad Request');
    expect(result.message).toBe('Invalid input');
  });

  it('formats UnauthorizedError', () => {
    const error = new UnauthorizedError('Not authorized');
    const result = formatErrorForUser(error);
    
    expect(result.error).toBe('Unauthorized');
    expect(result.message).toBe('Not authorized');
  });

  it('handles generic errors', () => {
    const error = new Error('Generic error');
    const result = formatErrorForUser(error);
    
    expect(result.error).toBe('Error');
    expect(result.message).toContain('error');
  });
});

describe('getErrorMessage', () => {
  it('extracts message from Error', () => {
    expect(getErrorMessage(new Error('Test error'))).toBe('Test error');
  });

  it('handles string errors', () => {
    expect(getErrorMessage('String error')).toBe('String error');
  });

  it('handles null/undefined', () => {
    expect(getErrorMessage(null)).toBe('An error occurred');
  });

  it('handles objects with message', () => {
    expect(getErrorMessage({ message: 'Object error' })).toBe('Object error');
  });
});

describe('isRetryableError', () => {
  it('does not retry BadRequestError', () => {
    expect(isRetryableError(new BadRequestError('Bad'))).toBe(false);
  });

  it('does not retry UnauthorizedError', () => {
    expect(isRetryableError(new UnauthorizedError())).toBe(false);
  });

  it('retries network errors', () => {
    expect(isRetryableError(new Error('Network timeout'))).toBe(true);
    expect(isRetryableError(new Error('500 Internal Server Error'))).toBe(true);
  });

  it('retries 5xx errors', () => {
    expect(isRetryableError(new Error('503 Service Unavailable'))).toBe(true);
    expect(isRetryableError(new Error('502 Bad Gateway'))).toBe(true);
  });
});
