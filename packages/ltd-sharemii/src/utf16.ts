/**
 * Decode a fixed-width little-endian UTF-16 name buffer into a string, stopping
 * at the first NUL code unit (the in-save string terminator).
 */
export function decodeUtf16Name(buf: Uint8Array): string {
  let end = 0;
  while (end + 1 < buf.byteLength) {
    if (buf[end] === 0 && buf[end + 1] === 0) break;
    end += 2;
  }
  const code: number[] = [];
  for (let i = 0; i < end; i += 2) {
    code.push(buf[i] | (buf[i + 1] << 8));
  }
  return String.fromCharCode(...code);
}

/**
 * Reduce a display name to a safe file-name stem by replacing every character
 * outside `[A-Za-z0-9_.-]` with `_`, falling back to `'mii'` when nothing remains.
 */
export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^\w.-]/g, '_');
  return cleaned.length > 0 ? cleaned : 'mii';
}

/**
 * Encode `text` as little-endian UTF-16 into a fresh `byteLen`-byte buffer,
 * truncating to fit while always leaving room for the trailing NUL terminator.
 */
export function encodeUtf16Name(text: string, byteLen: number): Uint8Array {
  const out = new Uint8Array(byteLen);
  const maxChars = Math.floor((byteLen - 2) / 2);
  const truncated = text.length > maxChars ? text.slice(0, maxChars) : text;
  for (let i = 0; i < truncated.length; i++) {
    const code = truncated.charCodeAt(i);
    out[i * 2] = code & 0xff;
    out[i * 2 + 1] = (code >> 8) & 0xff;
  }
  return out;
}
