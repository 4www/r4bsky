import { describe, it, expect } from 'vitest';
import { bsky } from '../services/bsky'; // Using the existing service

describe('Integration tests with real credentials', () => {
  // Skip these tests by default to avoid actual API calls during regular testing
  it.skip('should be able to access BskyService with real credentials', async () => {
    // This would use the credentials from .env
    const identifier = process.env.BSKY_IDENTIFIER;
    const password = process.env.BSKY_PASSWORD;
    
    expect(identifier).toBeDefined();
    expect(password).toBeDefined();
    
    if (identifier && password) {
      // Test that we can attempt login with the credentials
      // (Won't actually run unless we explicitly enable it)
      const result = await bsky.login({ identifier, password });
      expect(result).toBeDefined();
    }
  });

  it('basic service should be available', () => {
    expect(bsky).toBeDefined();
    expect(typeof bsky.login).toBe('function');
    expect(typeof bsky.post).toBe('function');
    expect(typeof bsky.logout).toBe('function');
    expect(typeof bsky.isAuthenticated).toBe('function');
  });
});