// Physics-based wetness metrics computed on an RGB face crop.
// Wet skin: water film -> specular highlights grow, fragment into droplet
// glints, desaturate, and gain sharp edges. All luminance thresholds are
// percentiles of the crop's own histogram so the metrics survive lighting
// changes between the enrollment baseline and the 5 AM bathroom.

export interface WetnessMetrics {
  specularRatio: number;        // fraction of pixels that are bright AND desaturated
  glintCount: number;           // small specular blobs (droplets), per 1000 px
  highlightDesaturation: number; // saturation gap: outside mask minus inside mask
  edgeEnergy: number;           // mean gradient magnitude on mask boundary (0-1)
  meanLuminance: number;        // 0-255, used for low-light warning, not scoring
}

const SPECULAR_PERCENTILE = 0.92;
const SPECULAR_MAX_SATURATION = 0.25;
const GLINT_MIN_PX = 2;
const GLINT_MAX_PX = 80;

// Absolute floor: even with a noisy baseline, a face this matte cannot pass.
const SPECULAR_RATIO_FLOOR = 0.008;

// Below HARD the frame is unusable (score forced to 0); between HARD and
// SOFT we still score but the UI nudges the user toward more light.
export const LOW_LIGHT_HARD = 25;
export const LOW_LIGHT_SOFT = 45;
// kept for backwards compat with existing imports
export const LOW_LIGHT_LUMINANCE = LOW_LIGHT_SOFT;

// Metrics are computed only inside the inscribed face oval; crop corners are
// mostly hair/background and drag down both luminance and specular stats.
const ELLIPSE_RX = 0.40; // fraction of crop size
const ELLIPSE_RY = 0.47;

function luminanceOf(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function saturationOf(r: number, g: number, b: number): number {
  const maxC = Math.max(r, g, b);
  if (maxC === 0) return 0;
  return (maxC - Math.min(r, g, b)) / maxC;
}

export function computeWetnessMetrics(rgb: Uint8Array, size: number): WetnessMetrics {
  const pixelCount = size * size;
  const lum = new Float32Array(pixelCount);
  const sat = new Float32Array(pixelCount);
  const inFace = new Uint8Array(pixelCount);

  const cx = size / 2;
  const cy = size / 2;
  const rx = size * ELLIPSE_RX;
  const ry = size * ELLIPSE_RY;

  let lumSum = 0;
  let faceCount = 0;
  for (let p = 0, i = 0; p < pixelCount; p++, i += 3) {
    const x = p % size;
    const y = (p / size) | 0;
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    if (dx * dx + dy * dy > 1) continue;
    inFace[p] = 1;
    faceCount++;
    const l = luminanceOf(rgb[i], rgb[i + 1], rgb[i + 2]);
    lum[p] = l;
    lumSum += l;
    sat[p] = saturationOf(rgb[i], rgb[i + 1], rgb[i + 2]);
  }
  const meanLuminance = faceCount > 0 ? lumSum / faceCount : 0;

  // Percentile threshold from the face region's own histogram (256 bins).
  const hist = new Uint32Array(256);
  for (let p = 0; p < pixelCount; p++) {
    if (inFace[p]) hist[Math.min(255, lum[p] | 0)]++;
  }
  let cum = 0;
  let lumThreshold = 255;
  const target = faceCount * SPECULAR_PERCENTILE;
  for (let bin = 0; bin < 256; bin++) {
    cum += hist[bin];
    if (cum >= target) { lumThreshold = bin; break; }
  }

  // Specular mask: bright AND desaturated, face region only.
  const mask = new Uint8Array(pixelCount);
  let maskCount = 0;
  let satInsideSum = 0;
  let satOutsideSum = 0;
  for (let p = 0; p < pixelCount; p++) {
    if (!inFace[p]) continue;
    if (lum[p] >= lumThreshold && sat[p] <= SPECULAR_MAX_SATURATION) {
      mask[p] = 1;
      maskCount++;
      satInsideSum += sat[p];
    } else {
      satOutsideSum += sat[p];
    }
  }
  const specularRatio = faceCount > 0 ? maskCount / faceCount : 0;
  const satInside = maskCount > 0 ? satInsideSum / maskCount : 0;
  const satOutside = faceCount - maskCount > 0 ? satOutsideSum / (faceCount - maskCount) : 0;
  const highlightDesaturation = Math.max(0, satOutside - satInside);

  // Connected components (4-neighbour flood fill) over the specular mask.
  let glints = 0;
  const visited = new Uint8Array(pixelCount);
  const stack: number[] = [];
  for (let start = 0; start < pixelCount; start++) {
    if (!mask[start] || visited[start]) continue;
    let blobSize = 0;
    stack.length = 0;
    stack.push(start);
    visited[start] = 1;
    while (stack.length > 0) {
      const p = stack.pop()!;
      blobSize++;
      const x = p % size;
      const y = (p / size) | 0;
      if (x > 0 && mask[p - 1] && !visited[p - 1]) { visited[p - 1] = 1; stack.push(p - 1); }
      if (x < size - 1 && mask[p + 1] && !visited[p + 1]) { visited[p + 1] = 1; stack.push(p + 1); }
      if (y > 0 && mask[p - size] && !visited[p - size]) { visited[p - size] = 1; stack.push(p - size); }
      if (y < size - 1 && mask[p + size] && !visited[p + size]) { visited[p + size] = 1; stack.push(p + size); }
    }
    if (blobSize >= GLINT_MIN_PX && blobSize <= GLINT_MAX_PX) glints++;
  }
  const glintCount = faceCount > 0 ? (glints / faceCount) * 1000 : 0;

  // Edge energy: mean |gradient| on mask boundary pixels, normalized to 0-1.
  let edgeSum = 0;
  let edgePixels = 0;
  for (let p = 0; p < pixelCount; p++) {
    if (!mask[p]) continue;
    const x = p % size;
    const y = (p / size) | 0;
    const isBoundary =
      (x > 0 && !mask[p - 1]) || (x < size - 1 && !mask[p + 1]) ||
      (y > 0 && !mask[p - size]) || (y < size - 1 && !mask[p + size]);
    if (!isBoundary) continue;
    const gx = (x > 0 && x < size - 1) ? Math.abs(lum[p + 1] - lum[p - 1]) : 0;
    const gy = (y > 0 && y < size - 1) ? Math.abs(lum[p + size] - lum[p - size]) : 0;
    edgeSum += Math.min(255, gx + gy);
    edgePixels++;
  }
  const edgeEnergy = edgePixels > 0 ? edgeSum / edgePixels / 255 : 0;

  return { specularRatio, glintCount, highlightDesaturation, edgeEnergy, meanLuminance };
}

export function averageMetrics(list: WetnessMetrics[]): WetnessMetrics {
  const n = Math.max(1, list.length);
  const sum = list.reduce(
    (acc, m) => ({
      specularRatio: acc.specularRatio + m.specularRatio,
      glintCount: acc.glintCount + m.glintCount,
      highlightDesaturation: acc.highlightDesaturation + m.highlightDesaturation,
      edgeEnergy: acc.edgeEnergy + m.edgeEnergy,
      meanLuminance: acc.meanLuminance + m.meanLuminance,
    }),
    { specularRatio: 0, glintCount: 0, highlightDesaturation: 0, edgeEnergy: 0, meanLuminance: 0 },
  );
  return {
    specularRatio: sum.specularRatio / n,
    glintCount: sum.glintCount / n,
    highlightDesaturation: sum.highlightDesaturation / n,
    edgeEnergy: sum.edgeEnergy / n,
    meanLuminance: sum.meanLuminance / n,
  };
}

// Default baseline for packets enrolled before baselines existed: typical
// dry-face values, slightly conservative so the delta requirement still bites.
export const FALLBACK_DRY_BASELINE: WetnessMetrics = {
  specularRatio: 0.01,
  glintCount: 0.15,
  highlightDesaturation: 0.08,
  edgeEnergy: 0.10,
  meanLuminance: 120,
};

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

// Weighted delta vs the user's own dry baseline -> 0..1.
// Tuned so a genuinely wet face (specular ratio 2-5x baseline, fragmented
// glints) lands ~0.85-0.95 and a dry face lands ~0.1-0.3.
export function scoreWetness(now: WetnessMetrics, dry: WetnessMetrics): number {
  if (now.specularRatio < SPECULAR_RATIO_FLOOR) return Math.min(0.3, now.specularRatio / SPECULAR_RATIO_FLOOR * 0.3);

  const ratioGain = Math.min(4, now.specularRatio / Math.max(dry.specularRatio, 0.004)); // 1 = unchanged
  const glintGain = now.glintCount - dry.glintCount;                        // droplets added
  const desatGain = now.highlightDesaturation - dry.highlightDesaturation;  // whiter highlights
  const edgeGain = now.edgeEnergy - dry.edgeEnergy;                         // sharper edges

  const z =
    2.0 * (ratioGain - 1.25) +  // ~1.25x baseline specular area to break even
    1.8 * glintGain +
    6.0 * desatGain +
    3.0 * edgeGain;

  return sigmoid(z);
}
