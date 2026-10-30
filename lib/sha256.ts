import { sha256 } from '@noble/hashes/sha2.js';

// Pure JS SHA-256 also works on LAN HTTP, where Web Crypto subtle is absent.
// Preserve identical digest bytes for cached media and video billing keys.
export async function sha256Digest(bytes: Uint8Array): Promise<Uint8Array> {
  return sha256(bytes);
}
