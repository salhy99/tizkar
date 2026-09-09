import { createHash } from 'crypto';
import { Readable } from 'stream';

/**
 * Computes a SHA-256 hash for a given Node.js Readable stream.
 * This is used to validate the integrity of downloaded storage objects
 * without loading the entire object into memory.
 */
export function computeStreamHash(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}
