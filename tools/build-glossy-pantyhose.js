#!/usr/bin/env node
/**
 * JoJo-Mod: Generator for Glossy Fullbody Pantyhose Restraint
 * Generates 500x1000 layers (BaseColor, Shadow, Highlight, Composite) for:
 * - FlatSmall (masculine completely flat chest)
 * - FlatMedium (masculine athletic pectoral fold)
 * - Small (female contour reference)
 * - Preview thumbnail
 */

const fs = require("fs");
const path = require("path");
const { parsePng, encodePng } = require("./warp-engine");

const MOD_DIR = path.resolve(__dirname, "..");
const REF_DIR = path.join(MOD_DIR, "reference_samples", "Assets", "Female3DCG");
const OUT_DIR = path.join(MOD_DIR, "assets", "Assets", "Female3DCG", "ItemArms");
const PREVIEW_DIR = path.join(OUT_DIR, "Preview");

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(PREVIEW_DIR, { recursive: true });

const vanillaPanty = parsePng(fs.readFileSync(path.join(REF_DIR, "ItemArms", "PantyhoseBody_Small.png")));

function createMask(size) {
  const mask = Buffer.alloc(500 * 1000);

  // 1. Position vanilla pantyhose at X=50, Y=200
  for (let y = 0; y < 800; y++) {
    const dstY = y + 200;
    if (dstY >= 1000) break;
    for (let x = 0; x < 400; x++) {
      const dstX = x + 50;
      if (dstX >= 500) break;
      mask[dstY * 500 + dstX] = vanillaPanty.pixels[(y * 400 + x) * 4 + 3];
    }
  }

  // 2. Torso chest contouring
  if (size === "FlatSmall" || size === "FlatMedium") {
    for (let y = 260; y <= 380; y++) {
      const progress = (y - 260) / 120;
      const targetLeft = 168 + progress * 14;
      const targetRight = 332 - progress * 14;
      for (let x = 0; x < 500; x++) {
        const idx = y * 500 + x;
        if (x < targetLeft && mask[idx] > 0) mask[idx] = 0;
        if (x > targetRight && mask[idx] > 0) mask[idx] = 0;
      }
    }
  }

  // 3. Ensure garment completely envelopes the avatar (no skin peeking at elbows, hips, calves)
  // Check bounds of reference BackElbowTouch arms
  let armL = null, armR = null;
  const armLPath = path.join(REF_DIR, "Override", "EchoV2", "ArmsLeft", "BackElbowTouch", `${size === "Small" ? "Small" : size}_White.png`);
  const armRPath = path.join(REF_DIR, "Override", "EchoV2", "ArmsRight", "BackElbowTouch", `${size === "Small" ? "Small" : size}_White.png`);
  if (fs.existsSync(armLPath)) armL = parsePng(fs.readFileSync(armLPath));
  if (fs.existsSync(armRPath)) armR = parsePng(fs.readFileSync(armRPath));

  for (let y = 210; y < 960; y++) {
    let armMinX = 999, armMaxX = -1;
    if (armL && armR) {
      for (let x = 0; x < 500; x++) {
        const idx = (y * 500 + x) * 4 + 3;
        if (armL.pixels[idx] > 30 || armR.pixels[idx] > 30) {
          if (x < armMinX) armMinX = x;
          if (x > armMaxX) armMaxX = x;
        }
      }
    }

    let pLeft = -1, pRight = -1;
    for (let x = 100; x < 400; x++) {
      if (mask[y * 500 + x] > 50) {
        if (pLeft === -1) pLeft = x;
        pRight = x;
      }
    }

    if (pLeft !== -1 && pRight !== -1) {
      const finalLeft = armMinX !== 999 ? Math.min(armMinX, pLeft) : pLeft;
      const finalRight = armMaxX !== -1 ? Math.max(armMaxX, pRight) : pRight;
      for (let x = finalLeft; x <= finalRight; x++) {
        mask[y * 500 + x] = 255;
      }
    }
  }

  // Collar cut at y < 210
  for (let y = 0; y < 210; y++) {
    for (let x = 0; x < 500; x++) {
      mask[y * 500 + x] = 0;
    }
  }

  return mask;
}

function gaussianBlurAlpha(srcBuf, width, height, radius) {
  const dst = Buffer.alloc(width * height * 4);
  const temp = new Float32Array(width * height);

  const kernel = [];
  let kSum = 0;
  for (let i = -radius; i <= radius; i++) {
    const w = Math.exp(-(i * i) / (2 * (radius / 2) * (radius / 2)));
    kernel.push(w);
    kSum += w;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= kSum;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;
      for (let k = -radius; k <= radius; k++) {
        const nx = Math.min(width - 1, Math.max(0, x + k));
        val += srcBuf[(y * width + nx) * 4 + 3] * kernel[k + radius];
      }
      temp[y * width + x] = val;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;
      for (let k = -radius; k <= radius; k++) {
        const ny = Math.min(height - 1, Math.max(0, y + k));
        val += temp[ny * width + x] * kernel[k + radius];
      }
      const idx = (y * width + x) * 4;
      dst[idx] = srcBuf[idx];
      dst[idx + 1] = srcBuf[idx + 1];
      dst[idx + 2] = srcBuf[idx + 2];
      dst[idx + 3] = Math.round(Math.min(255, val));
    }
  }

  return dst;
}

function generateLayers(size) {
  const mask = createMask(size);

  const rawBounds = [];
  for (let y = 0; y < 1000; y++) {
    let left = -1, right = -1;
    for (let x = 100; x < 400; x++) {
      if (mask[y * 500 + x] > 50) {
        if (left === -1) left = x;
        right = x;
      }
    }
    rawBounds.push({ left, right, width: right - left, center: (left + right) / 2 });
  }

  const smoothBounds = [];
  for (let y = 0; y < 1000; y++) {
    if (rawBounds[y].left === -1) {
      smoothBounds.push(rawBounds[y]);
      continue;
    }
    let cSum = 0, wSum = 0, count = 0;
    for (let dy = -7; dy <= 7; dy++) {
      const ny = y + dy;
      if (ny >= 0 && ny < 1000 && rawBounds[ny].left !== -1) {
        cSum += rawBounds[ny].center;
        wSum += rawBounds[ny].width;
        count++;
      }
    }
    smoothBounds.push({
      left: rawBounds[y].left,
      right: rawBounds[y].right,
      width: wSum / count,
      center: cSum / count,
    });
  }

  const baseColor = Buffer.alloc(500 * 1000 * 4);
  const rawShadow = Buffer.alloc(500 * 1000 * 4);
  const rawHighlight = Buffer.alloc(500 * 1000 * 4);

  // Soft 2D elliptical specular hotspots (smooth 2D Gaussians)
  const hotspots = [
    { xRatio: -0.32, y: 245, sigmaX: 0.12, sigmaY: 25, peak: 90 }, // Left shoulder
    { xRatio: 0.32, y: 245, sigmaX: 0.12, sigmaY: 25, peak: 90 },  // Right shoulder
    { xRatio: -0.28, y: 310, sigmaX: 0.14, sigmaY: 35, peak: 60 }, // Left chest
    { xRatio: 0.28, y: 310, sigmaX: 0.14, sigmaY: 35, peak: 60 },  // Right chest
    { xRatio: -0.32, y: 590, sigmaX: 0.12, sigmaY: 45, peak: 70 }, // Left thigh
    { xRatio: 0.32, y: 590, sigmaX: 0.12, sigmaY: 45, peak: 70 },  // Right thigh
    { xRatio: -0.30, y: 720, sigmaX: 0.12, sigmaY: 30, peak: 95 }, // Left knee
    { xRatio: 0.30, y: 720, sigmaX: 0.12, sigmaY: 30, peak: 95 },  // Right knee
    { xRatio: -0.28, y: 820, sigmaX: 0.11, sigmaY: 40, peak: 75 }, // Left shin
    { xRatio: 0.28, y: 820, sigmaX: 0.11, sigmaY: 40, peak: 75 },  // Right shin
  ];

  for (let y = 210; y < 960; y++) {
    const { left, right, width, center } = smoothBounds[y];
    if (left === -1 || width < 10) continue;

    for (let x = left; x <= right; x++) {
      const idx = (y * 500 + x) * 4;
      const a = mask[y * 500 + x] / 255;
      if (a === 0) continue;

      const normX = (x - center) / (width / 2);
      const absX = Math.abs(normX);

      // BaseColor (pure white base for perfect wardrobe color tinting)
      baseColor[idx] = 255;
      baseColor[idx + 1] = 255;
      baseColor[idx + 2] = 255;
      baseColor[idx + 3] = Math.round(a * 242);

      // Shadow: Continuous Fresnel edge falloff
      let sVal = 0;
      if (absX > 0.48) {
        const edgeT = (absX - 0.48) / 0.52;
        sVal += (edgeT * edgeT) * 165;
      }

      // Taut fabric junction between legs
      if (y >= 500 && y <= 940) {
        let legFade = 1.0;
        if (y < 550) legFade = (y - 500) / 50;
        if (y > 920) legFade = (940 - y) / 20;

        const centerDist = Math.abs(x - center);
        if (centerDist < 18) {
          const crease = Math.cos((centerDist / 18) * (Math.PI / 2));
          sVal += crease * 65 * legFade;
        }
      }

      // FlatMedium pectoral fold
      if (size === "FlatMedium" && y >= 325 && y <= 337 && absX < 0.55) {
        const yDist = Math.abs(y - 331);
        const yWeight = Math.cos((yDist / 6) * (Math.PI / 2));
        const xWeight = Math.cos((absX / 0.55) * (Math.PI / 2));
        sVal += yWeight * xWeight * 45;
      }

      sVal = Math.min(255, Math.round(sVal));
      if (sVal > 0) {
        rawShadow[idx] = 10;
        rawShadow[idx + 1] = 10;
        rawShadow[idx + 2] = 16;
        rawShadow[idx + 3] = Math.round(sVal * a);
      }

      // Highlight: Continuous Gaussian band (zero lines)
      const distFromBand = Math.abs(absX - 0.32);
      const bandSheen = Math.exp(-(distFromBand * distFromBand) / (2 * 0.15 * 0.15));

      const normY = (y - 210) / 750;
      const verticalFlow = 0.75 + 0.15 * Math.cos(normY * Math.PI * 3);

      let hiVal = bandSheen * verticalFlow * 150;

      // Add 2D smooth hotspots
      for (const h of hotspots) {
        const dx = normX - h.xRatio;
        const dy = y - h.y;
        const d2 = (dx * dx) / (2 * h.sigmaX * h.sigmaX) + (dy * dy) / (2 * h.sigmaY * h.sigmaY);
        if (d2 < 5) {
          hiVal += Math.exp(-d2) * h.peak;
        }
      }

      // Rim Fresnel
      if (absX > 0.82) {
        const rimDist = Math.abs(absX - 0.92);
        const rimSheen = Math.exp(-(rimDist * rimDist) / (2 * 0.06 * 0.06));
        hiVal += rimSheen * 75;
      }

      hiVal = Math.min(255, Math.round(hiVal));
      if (hiVal > 0) {
        rawHighlight[idx] = 255;
        rawHighlight[idx + 1] = 255;
        rawHighlight[idx + 2] = 255;
        rawHighlight[idx + 3] = Math.round(hiVal * a);
      }
    }

    // Seam
    if (mask[y * 500 + 250] > 50) {
      const idx = (y * 500 + 250) * 4;
      rawShadow[idx] = 0;
      rawShadow[idx + 1] = 0;
      rawShadow[idx + 2] = 0;
      rawShadow[idx + 3] = 180;
    }
  }

  const highlight = gaussianBlurAlpha(rawHighlight, 500, 1000, 4);
  const shadow = gaussianBlurAlpha(rawShadow, 500, 1000, 3);

  for (let i = 0; i < 500 * 1000; i++) {
    const a = mask[i] / 255;
    highlight[i * 4 + 3] = Math.round(highlight[i * 4 + 3] * a);
    shadow[i * 4 + 3] = Math.round(shadow[i * 4 + 3] * a);
  }

  // Pre-composite version (tinted black vinyl #141419)
  const composite = Buffer.alloc(500 * 1000 * 4);
  for (let i = 0; i < composite.length; i += 4) {
    const bA = baseColor[i + 3] / 255;
    if (bA === 0) continue;
    // Tint base with black vinyl [20, 20, 25]
    let r = (baseColor[i] * 20) / 255;
    let g = (baseColor[i + 1] * 20) / 255;
    let b = (baseColor[i + 2] * 25) / 255;
    let a = bA;

    // Blend shadow over
    const sA = shadow[i + 3] / 255;
    if (sA > 0) {
      r = r * (1 - sA) + shadow[i] * sA;
      g = g * (1 - sA) + shadow[i + 1] * sA;
      b = b * (1 - sA) + shadow[i + 2] * sA;
      a = a + sA * (1 - a);
    }

    // Blend highlight over
    const hA = highlight[i + 3] / 255;
    if (hA > 0) {
      r = r * (1 - hA) + highlight[i] * hA;
      g = g * (1 - hA) + highlight[i + 1] * hA;
      b = b * (1 - hA) + highlight[i + 2] * hA;
      a = a + hA * (1 - a);
    }

    composite[i] = Math.round(r);
    composite[i + 1] = Math.round(g);
    composite[i + 2] = Math.round(b);
    composite[i + 3] = Math.round(a * 255);
  }

  return { baseColor, shadow, highlight, composite };
}

console.log("[JoJo-Mod] Generating GlossyPantyhoseBody assets...");

const sizes = ["FlatSmall", "FlatMedium", "Small"];
for (const size of sizes) {
  console.log(`- Building layers for ${size}...`);
  const layers = generateLayers(size);

  // Write layers
  fs.writeFileSync(path.join(OUT_DIR, `GlossyPantyhoseBody_${size}_BaseColor.png`), encodePng(500, 1000, layers.baseColor));
  fs.writeFileSync(path.join(OUT_DIR, `GlossyPantyhoseBody_${size}_Shadow.png`), encodePng(500, 1000, layers.shadow));
  fs.writeFileSync(path.join(OUT_DIR, `GlossyPantyhoseBody_${size}_Highlight.png`), encodePng(500, 1000, layers.highlight));

  // Write composite
  fs.writeFileSync(path.join(OUT_DIR, `GlossyPantyhoseBody_${size}.png`), encodePng(500, 1000, layers.composite));

  // Also write for vanilla PantyhoseBody override
  if (size === "FlatSmall" || size === "FlatMedium") {
    fs.writeFileSync(path.join(OUT_DIR, `PantyhoseBody_${size}.png`), encodePng(500, 1000, layers.composite));
  }
}

// Write preview icon (100x100)
console.log("- Generating Preview thumbnail...");
const compSmall = parsePng(fs.readFileSync(path.join(OUT_DIR, "GlossyPantyhoseBody_FlatSmall.png")));
const thumb = Buffer.alloc(100 * 100 * 4);
for (let y = 0; y < 100; y++) {
  const srcY = y * 10;
  for (let x = 0; x < 100; x++) {
    const srcX = x * 5;
    const srcIdx = (srcY * 500 + srcX) * 4;
    const dstIdx = (y * 100 + x) * 4;
    for (let c = 0; c < 4; c++) {
      thumb[dstIdx + c] = compSmall.pixels[srcIdx + c];
    }
  }
}
fs.writeFileSync(path.join(PREVIEW_DIR, "GlossyPantyhoseBody.png"), encodePng(100, 100, thumb));

console.log("[JoJo-Mod] All GlossyPantyhoseBody assets generated successfully!");
