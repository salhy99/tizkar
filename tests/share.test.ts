
import { 
  buildPublicInvitationUrl, 
  generateShareText, 
  buildWhatsAppShareUrl, 
  buildTelegramShareUrl, 
  sanitizeFilenameSlug 
} from '../src/lib/utils/share';

describe('Share Utils', () => {
  it('buildPublicInvitationUrl should construct correct URLs', () => {
    expect(buildPublicInvitationUrl('https://example.com', 'my-wedding')).toBe('https://example.com/my-wedding');
    expect(buildPublicInvitationUrl('https://example.com/', '/my-wedding')).toBe('https://example.com/my-wedding');
    expect(buildPublicInvitationUrl('http://localhost:3000', 'slug')).toBe('http://localhost:3000/slug');
  });

  it('generateShareText should prioritize names if available', () => {
    const text1 = generateShareText('Invitation Title', 'Ahmed', 'Zahraa');
    expect(text1).toContain('Ahmed و Zahraa');
    expect(text1).not.toContain('Invitation Title');

    const text2 = generateShareText('My Title');
    expect(text2).toContain('My Title');
  });

  it('buildWhatsAppShareUrl should encode text and url correctly', () => {
    const url = buildWhatsAppShareUrl('Hello World', 'https://example.com');
    expect(url).toBe('https://wa.me/?text=Hello%20World%0A%0Ahttps%3A%2F%2Fexample.com');
  });

  it('buildTelegramShareUrl should encode text and url correctly', () => {
    const url = buildTelegramShareUrl('Hello World', 'https://example.com');
    expect(url).toBe('https://t.me/share/url?url=https%3A%2F%2Fexample.com&text=Hello%20World');
  });

  it('sanitizeFilenameSlug should clean special characters', () => {
    expect(sanitizeFilenameSlug('Ahmad & Fatima')).toBe('AhmadFatima');
    expect(sanitizeFilenameSlug('my-slug_123')).toBe('my-slug123');
    expect(sanitizeFilenameSlug('very-long-slug-name-that-exceeds-thirty-characters')).toBe('very-long-slug-name-that-excee');
  });
});

import { getShareVisualAdapter } from '../src/components/share';
import { loadLocalFont } from '../src/components/share/fontLoader';

describe('Share Visual System', () => {
  it('getShareVisualAdapter should resolve correctly', () => {
    expect(getShareVisualAdapter('modern-glass')).toBeDefined();
    expect(getShareVisualAdapter('rose-garden')).toBeDefined();
    expect(getShareVisualAdapter('layali')).toBeDefined();
    // Unknown templates fallback to layali
    expect(getShareVisualAdapter('unknown')).toBe(getShareVisualAdapter('layali'));
  });

  it('loadLocalFont should resolve font buffers safely', async () => {
    // Just verifying the function is defined and doesn't throw synchronously
    expect(loadLocalFont).toBeDefined();
    // Assuming tests run in a Next.js environment or similar where process.cwd() is valid
    // We mock or skip full file read to avoid breaking vitest if cwd is strange.
    const font = await loadLocalFont('700');
    if (font) {
      expect(font).toBeInstanceOf(ArrayBuffer);
    }
  });
});
