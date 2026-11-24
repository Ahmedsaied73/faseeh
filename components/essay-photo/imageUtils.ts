export interface NormalizedCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProcessEssayImageOptions {
  rotationDeg?: number;
  crop?: NormalizedCropRect;
  maxSidePx?: number;
  quality?: number;
}

export interface ProcessedEssayImage {
  blob: Blob;
  file: File;
  width: number;
  height: number;
  qualityWarning: string | null;
}

const DEFAULT_MAX_SIDE = 1600;
const DEFAULT_QUALITY = 0.8;

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('تعذر تحميل الصورة للمعالجة.'));
    img.src = src;
  });
}

/**
 * Lightweight brightness & blur check on a downscaled canvas.
 * Returns a non-blocking Arabic warning or null if acceptable.
 */
export function checkImageQuality(
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
): string | null {
  if (srcWidth <= 0 || srcHeight <= 0) return null;

  const sampleMax = 160;
  const scale = Math.min(1, sampleMax / Math.max(srcWidth, srcHeight));
  const w = Math.max(8, Math.round(srcWidth * scale));
  const h = Math.max(8, Math.round(srcHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(source, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  let lumSum = 0;
  const lum = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    lum[p] = y;
    lumSum += y;
  }

  const meanLum = lumSum / (w * h);
  if (meanLum < 55) {
    return 'الإضاءة منخفضة جداً — يفضل إعادة التصوير في إضاءة أوضح.';
  }
  if (meanLum > 242) {
    return 'الصورة ساطعة جداً — تأكد من عدم ضياع تفاصيل الكتابة.';
  }

  // Simple Laplacian-like sharpness estimate
  let lapSum = 0;
  let lapSqSum = 0;
  let count = 0;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      const lap =
        4 * lum[idx] - lum[idx - 1] - lum[idx + 1] - lum[idx - w] - lum[idx + w];
      lapSum += lap;
      lapSqSum += lap * lap;
      count += 1;
    }
  }

  if (count > 0) {
    const mean = lapSum / count;
    const variance = lapSqSum / count - mean * mean;
    if (variance < 35) {
      return 'قد تكون الصورة غير واضحة أو مهزوزة — تأكد من وضوح النص قبل الإرسال.';
    }
  }

  return null;
}

/**
 * Applies optional crop + 90-deg rotation, resizes longest side to 1600px,
 * and re-encodes as JPEG q0.8 (stripping all EXIF metadata on device).
 */
export async function processEssayImage(
  input: File | Blob,
  options: ProcessEssayImageOptions = {},
): Promise<ProcessedEssayImage> {
  const {
    rotationDeg = 0,
    crop = { x: 0, y: 0, width: 1, height: 1 },
    maxSidePx = DEFAULT_MAX_SIDE,
    quality = DEFAULT_QUALITY,
  } = options;

  const objectUrl = URL.createObjectURL(input);
  try {
    const img = await loadImageElement(objectUrl);
    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;

    const normRot = ((rotationDeg % 360) + 360) % 360;
    const isQuarterTurn = normRot === 90 || normRot === 270;

    // 1. Rotate full image onto an intermediate canvas so crop aligns with visual orientation
    const rotW = isQuarterTurn ? natH : natW;
    const rotH = isQuarterTurn ? natW : natH;

    const rotCanvas = document.createElement('canvas');
    rotCanvas.width = rotW;
    rotCanvas.height = rotH;
    const rotCtx = rotCanvas.getContext('2d');
    if (!rotCtx) throw new Error('تعذر تهيئة أداة معالجة الصور.');

    rotCtx.save();
    rotCtx.translate(rotW / 2, rotH / 2);
    rotCtx.rotate((normRot * Math.PI) / 180);
    rotCtx.drawImage(img, -natW / 2, -natH / 2, natW, natH);
    rotCtx.restore();

    // 2. Compute crop region on rotated canvas
    const sx = Math.max(0, Math.min(rotW - 1, Math.round(crop.x * rotW)));
    const sy = Math.max(0, Math.min(rotH - 1, Math.round(crop.y * rotH)));
    const sw = Math.max(1, Math.min(rotW - sx, Math.round(crop.width * rotW)));
    const sh = Math.max(1, Math.min(rotH - sy, Math.round(crop.height * rotH)));

    // 3. Resize longest side to maxSidePx
    const scale = Math.min(1, maxSidePx / Math.max(sw, sh));
    const outW = Math.max(1, Math.round(sw * scale));
    const outH = Math.max(1, Math.round(sh * scale));

    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) throw new Error('تعذر تهيئة أداة تصدير الصورة.');

    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, outW, outH);
    outCtx.drawImage(rotCanvas, sx, sy, sw, sh, 0, 0, outW, outH);

    const qualityWarning = checkImageQuality(outCanvas, outW, outH);

    const blob = await new Promise<Blob>((resolve, reject) => {
      outCanvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('تعذر ضغط الصورة.'))),
        'image/jpeg',
        quality,
      );
    });

    const file = new File([blob], 'essay-solution.jpg', { type: 'image/jpeg' });
    return { blob, file, width: outW, height: outH, qualityWarning };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
