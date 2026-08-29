
import { generateEditToken, hashEditToken, TOKEN_PREFIX } from '../src/lib/auth/editor-session';

describe('Editor Session Security', () => {
  it('Token expected format (starts with prefix)', () => {
    const token = generateEditToken();
    expect(token.startsWith(TOKEN_PREFIX)).toBe(true);
  })

  it('Token length is exactly 47 chars', () => {
    const token = generateEditToken();
    expect(token.length).toBe(47);
  })

  it('Token matches strict base64url regex', () => {
    const token = generateEditToken();
    const tokenRegex = /^tzk_[A-Za-z0-9_-]{43}$/;
    expect(tokenRegex.test(token)).toBe(true);
  })

  it('Unique values (two generated tokens are different)', () => {
    const token1 = generateEditToken();
    const token2 = generateEditToken();
    expect(token1).not.toBe(token2);
  })

  it('Deterministic hashing (same token -> same hash)', () => {
    const token1 = generateEditToken();
    const hash1 = hashEditToken(token1);
    const hash1_again = hashEditToken(token1);
    expect(hash1).toBe(hash1_again);
  })

  it('Different token -> different hash', () => {
    const token1 = generateEditToken();
    const token2 = generateEditToken();
    const hash1 = hashEditToken(token1);
    const hash2 = hashEditToken(token2);
    expect(hash1).not.toBe(hash2);
  })

  it('Raw token is not the same as hash', () => {
    const token1 = generateEditToken();
    const hash1 = hashEditToken(token1);
    expect(token1).not.toBe(hash1);
  })

  it('Hash is 64 chars long (SHA-256 hex)', () => {
    const token1 = generateEditToken();
    const hash1 = hashEditToken(token1);
    expect(hash1.length).toBe(64);
  })
})
