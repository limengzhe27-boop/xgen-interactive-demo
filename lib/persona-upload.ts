export const PORTRAIT_DATA_LIMIT = 240_000;
export function localPortrait(value: unknown): value is string {
  return typeof value === 'string' && value.length <= PORTRAIT_DATA_LIMIT && /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(value);
}
export function checkPortraitFile(file: Pick<File, 'type' | 'size'>) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('请选择 JPG、PNG 或 WebP 图片。');
  if (!file.size || file.size > 8 * 1024 * 1024) throw new Error('图片不能超过 8 MB，请先缩小后重试。');
}
// Local raster re-encoding drops metadata, avoids SVG, and never sends a file to a model.
export async function readPersonaUpload(file: File): Promise<string> {
  checkPortraitFile(file);
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 24_000_000) throw new Error('图片尺寸过大，请缩小到 2400 万像素以内。');
    const scale = Math.min(1, 768 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('浏览器暂不支持图片处理，请换个浏览器重试。');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    for (const quality of [.85,.7,.5,.35]) {
      const data = canvas.toDataURL('image/jpeg',quality);
      if (localPortrait(data)) return data;
    }
    throw new Error('图片压缩后仍过大，请选择更小的图片。');
  } finally { bitmap.close(); }
}
