import { promises as fs } from 'fs';
import path from 'path';

// Cache for loaded fonts to avoid reading from disk on every request
const fontCache: Record<string, ArrayBuffer> = {};

export async function loadLocalFont(weight: '400' | '700' = '700'): Promise<ArrayBuffer | null> {
  const fontName = weight === '700' ? 'Cairo-Bold.ttf' : 'Cairo-Regular.ttf';
  
  if (fontCache[fontName]) {
    return fontCache[fontName];
  }

  try {
    const fontPath = path.join(process.cwd(), 'public', 'fonts', fontName);
    const fontData = await fs.readFile(fontPath);
    const arrayBuffer = fontData.buffer.slice(fontData.byteOffset, fontData.byteOffset + fontData.byteLength);
    fontCache[fontName] = arrayBuffer;
    return arrayBuffer;
  } catch (error) {
    console.error(`Failed to load local font ${fontName}:`, error);
    return null;
  }
}
