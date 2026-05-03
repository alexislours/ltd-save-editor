export function downloadBytes(bytes: Uint8Array, filename: string): void {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  downloadBlob(new Blob([buffer], { type: 'application/octet-stream' }), filename);
}

export function downloadText(content: string, filename: string, mime: string): void {
  downloadBlob(new Blob([content], { type: mime }), filename);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
