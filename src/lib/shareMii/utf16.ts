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

export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^\w.-]/g, '_');
  return cleaned.length > 0 ? cleaned : 'mii';
}
