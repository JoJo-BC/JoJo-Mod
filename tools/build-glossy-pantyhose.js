#!/usr/bin/env node
/**
 * JoJo-Mod: Generator for Glossy Fullbody Pantyhose Restraint
 * Generates 400x800 layers (BaseColor, Shadow, Highlight, Composite) matching
 * BC's native ItemArms coordinates (Left: 50, Top: 200 on 500x1000 canvas).
 *
 * Features:
 * - Sheer / Translucent BaseColor (alpha ~ 105, showing skin through fabric like GlossyBodystocking)
 * - Ultra-feathered Gaussian wetlook specular highlights
 * - 3D volumetric edge and leg-junction crease shadows
 * - Full support for FlatSmall, FlatMedium, Small, Normal, Large, XLarge
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

function getMannequinCanvas(upperSize, legSize) {
  const canvas = Buffer.alloc(500 * 1000);
  function stamp(img, offsetX, offsetY) {
    for (let y = 0; y < img.height; y++) {
      const dstY = y + offsetY;
      if (dstY >= 1000) continue;
      for (let x = 0; x < img.width; x++) {
        const dstX = x + offsetX;
        if (dstX >= 500) continue;
        if (img.pixels[(y * img.width + x) * 4 + 3] > 15) {
          canvas[dstY * 500 + dstX] = 255;
        }
      }
    }
  }

  // 1. Upper Body
  const uPath = path.join(REF_DIR, "BodyUpper", `${upperSize}_White.png`);
  if (fs.existsSync(uPath)) stamp(parsePng(fs.readFileSync(uPath)), 0, 0);

  // 2. Arms in BackElbowTouch
  const armSize = (upperSize === "FlatSmall" || upperSize === "FlatMedium") ? upperSize : "Small";
  const aLeft = path.join(REF_DIR, "Override", "EchoV2", "ArmsLeft", "BackElbowTouch", `${armSize}_White.png`);
  const aRight = path.join(REF_DIR, "Override", "EchoV2", "ArmsRight", "BackElbowTouch", `${armSize}_White.png`);
  if (fs.existsSync(aLeft)) stamp(parsePng(fs.readFileSync(aLeft)), 0, 0);
  if (fs.existsSync(aRight)) stamp(parsePng(fs.readFileSync(aRight)), 0, 0);

  // 3. Legs in LegsClosed (starts at Top: 462 on 500x1000 canvas)
  const lPath = path.join(REF_DIR, "BodyLower", "LegsClosed", `${legSize}_White.png`);
  if (fs.existsSync(lPath)) stamp(parsePng(fs.readFileSync(lPath)), 0, 462);

  return canvas;
}

function create400x800Mask(size) {
  let upperSize = size;
  let legSize = "Normal";
  if (size === "FlatMedium") {
    legSize = "Normal";
  } else if (size === "FlatSmall") {
    legSize = "Small";
  } else if (size === "Small") {
    legSize = "Small";
  } else if (size === "Normal") {
    legSize = "Normal";
  } else if (size === "Large") {
    legSize = "Large";
  } else if (size === "XLarge") {
    legSize = "XLarge";
  }

  const manCanvas = getMannequinCanvas(upperSize, legSize);

  // 1. Exact min and max X for each row y (0..799)
  const rawMin = new Int32Array(800).fill(999);
  const rawMax = new Int32Array(800).fill(-1);

  // BodyUpper starts at y_ia = 14 (canvasY = 214)
  for (let y = 14; y < 800; y++) {
    const cY = y + 200;
    if (cY < 1000) {
      for (let x = 0; x < 400; x++) {
        const cX = x + 50;
        if (manCanvas[cY * 500 + cX] > 15) {
          if (x < rawMin[y]) rawMin[y] = x;
          if (x > rawMax[y]) rawMax[y] = x;
        }
      }
    }
  }

  // 2. Build form-fitting, skin-tight mask (0px excess margin)
  const mask = Buffer.alloc(400 * 800);
  for (let y = 14; y < 765; y++) {
    if (rawMin[y] > rawMax[y]) continue;
    for (let x = rawMin[y]; x <= rawMax[y]; x++) {
      mask[y * 400 + x] = 255;
    }
    // Subtle anti-aliased edge on outer boundary pixel
    mask[y * 400 + rawMin[y]] = 200;
    mask[y * 400 + rawMax[y]] = 200;
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

function generate400x800Layers(size) {
  const mask = create400x800Mask(size);

  const rawBounds = [];
  for (let y = 0; y < 800; y++) {
    let left = -1, right = -1;
    for (let x = 0; x < 400; x++) {
      if (mask[y * 400 + x] > 50) {
        if (left === -1) left = x;
        right = x;
      }
    }
    rawBounds.push({ left, right, width: right - left, center: (left + right) / 2 });
  }

  const smoothBounds = [];
  for (let y = 0; y < 800; y++) {
    if (rawBounds[y].left === -1) {
      smoothBounds.push(rawBounds[y]);
      continue;
    }
    let cSum = 0, wSum = 0, count = 0;
    for (let dy = -6; dy <= 6; dy++) {
      const ny = y + dy;
      if (ny >= 0 && ny < 800 && rawBounds[ny].left !== -1) {
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

  const baseColor = Buffer.alloc(400 * 800 * 4);
  const rawShadow = Buffer.alloc(400 * 800 * 4);
  const rawHighlight = Buffer.alloc(400 * 800 * 4);

  // 2D specular hotspots (in 400x800 coordinates)
  let chestHotspots = [];
  if (size === "FlatSmall") {
    chestHotspots = [
      { xRatio: -0.28, y: 110, sigmaX: 0.12, sigmaY: 20, peak: 180 },
      { xRatio: 0.28, y: 110, sigmaX: 0.12, sigmaY: 20, peak: 180 },
    ];
  } else if (size === "FlatMedium") {
    chestHotspots = [
      { xRatio: -0.28, y: 110, sigmaX: 0.12, sigmaY: 20, peak: 195 },
      { xRatio: 0.28, y: 110, sigmaX: 0.12, sigmaY: 20, peak: 195 },
    ];
  } else if (size === "Small") {
    chestHotspots = [
      { xRatio: -0.28, y: 115, sigmaX: 0.12, sigmaY: 20, peak: 180 },
      { xRatio: 0.28, y: 115, sigmaX: 0.12, sigmaY: 20, peak: 180 },
    ];
  } else if (size === "Normal") {
    chestHotspots = [
      { xRatio: -0.30, y: 120, sigmaX: 0.12, sigmaY: 22, peak: 190 },
      { xRatio: 0.30, y: 120, sigmaX: 0.12, sigmaY: 22, peak: 190 },
    ];
  } else if (size === "Large") {
    chestHotspots = [
      { xRatio: -0.32, y: 125, sigmaX: 0.13, sigmaY: 24, peak: 205 },
      { xRatio: 0.32, y: 125, sigmaX: 0.13, sigmaY: 24, peak: 205 },
    ];
  } else if (size === "XLarge") {
    chestHotspots = [
      { xRatio: -0.34, y: 130, sigmaX: 0.14, sigmaY: 26, peak: 220 },
      { xRatio: 0.34, y: 130, sigmaX: 0.14, sigmaY: 26, peak: 220 },
    ];
  }

  const hotspots = [
    { xRatio: -0.32, y: 48, sigmaX: 0.10, sigmaY: 16, peak: 180 },  // Left shoulder
    { xRatio: 0.32, y: 48, sigmaX: 0.10, sigmaY: 16, peak: 180 },   // Right shoulder
    ...chestHotspots,
    { xRatio: -0.32, y: 320, sigmaX: 0.08, sigmaY: 30, peak: 200 }, // Upper Thigh L
    { xRatio: 0.32, y: 320, sigmaX: 0.08, sigmaY: 30, peak: 200 },  // Upper Thigh R
    { xRatio: -0.30, y: 400, sigmaX: 0.08, sigmaY: 35, peak: 215 }, // Mid Thigh L
    { xRatio: 0.30, y: 400, sigmaX: 0.08, sigmaY: 35, peak: 215 },  // Mid Thigh R
    { xRatio: -0.28, y: 520, sigmaX: 0.09, sigmaY: 22, peak: 240 }, // Knee L
    { xRatio: 0.28, y: 520, sigmaX: 0.09, sigmaY: 22, peak: 240 },  // Knee R
    { xRatio: -0.28, y: 620, sigmaX: 0.07, sigmaY: 35, peak: 210 }, // Shin L
    { xRatio: 0.28, y: 620, sigmaX: 0.07, sigmaY: 35, peak: 210 },  // Shin R
  ];

  for (let y = 14; y < 770; y++) {
    const { left, right, width, center } = smoothBounds[y];
    if (left === -1 || width < 10) continue;

    for (let x = left; x <= right; x++) {
      const idx = (y * 400 + x) * 4;
      const a = mask[y * 400 + x] / 255;
      if (a === 0) continue;

      const normX = (x - center) / (width / 2);
      const absX = Math.abs(normX);

      // 1. BaseColor: SHEER / TRANSLUCENT (Median alpha ~ 105, showing skin through fabric like GlossyBodystocking)
      baseColor[idx] = 255;
      baseColor[idx + 1] = 255;
      baseColor[idx + 2] = 255;
      baseColor[idx + 3] = Math.round(a * 105);

      // 2. Shadow: Ambient rim darkening & leg-joining crease
      let sVal = 0;
      if (absX > 0.40) {
        const edgeT = (absX - 0.40) / 0.60;
        sVal += (edgeT * edgeT) * 160;
      }

      // Taut leg junction crease (y >= 300 to 740)
      if (y >= 300 && y <= 740) {
        let legFade = 1.0;
        if (y < 350) legFade = (y - 300) / 50;
        if (y > 720) legFade = (740 - y) / 20;

        const centerDist = Math.abs(x - center);
        if (centerDist < 12) {
          const crease = Math.cos((centerDist / 12) * (Math.PI / 2));
          sVal += crease * 70 * legFade;
        }
      }

      // FlatMedium pectoral fold (y ~ 125..135)
      if (size === "FlatMedium" && y >= 125 && y <= 135 && absX < 0.55) {
        const yDist = Math.abs(y - 130);
        const yWeight = Math.cos((yDist / 5) * (Math.PI / 2));
        const xWeight = Math.cos((absX / 0.55) * (Math.PI / 2));
        sVal += yWeight * xWeight * 45;
      }

      // Female cleavage shadow
      if ((size === "Normal" || size === "Large" || size === "XLarge") && y >= 100 && y <= 150) {
        const centerDist = Math.abs(x - center);
        if (centerDist < 12) {
          const cleav = Math.cos((centerDist / 12) * (Math.PI / 2)) * Math.sin(((y - 100) / 50) * Math.PI);
          const cleavStrength = size === "XLarge" ? 70 : size === "Large" ? 55 : 40;
          sVal += cleav * cleavStrength;
        }
      }

      sVal = Math.min(255, Math.round(sVal));
      if (sVal > 0) {
        rawShadow[idx] = 10;
        rawShadow[idx + 1] = 10;
        rawShadow[idx + 2] = 18;
        rawShadow[idx + 3] = Math.round(sVal * a);
      }

      // 3. Highlight: Wetlook glossy specular sheen (High-contrast shine!)
      const distFromBand = Math.abs(absX - 0.30);
      const sharpCore = Math.exp(-(distFromBand * distFromBand) / (2 * 0.06 * 0.06)) * 140;
      const broadSheen = Math.exp(-(distFromBand * distFromBand) / (2 * 0.16 * 0.16)) * 80;

      const normY = y / 750;
      const verticalFlow = 0.85 + 0.15 * Math.cos(normY * Math.PI * 3.5);

      let hiVal = (sharpCore + broadSheen) * verticalFlow;

      for (const h of hotspots) {
        const dx = normX - h.xRatio;
        const dy = y - h.y;
        const d2 = (dx * dx) / (2 * h.sigmaX * h.sigmaX) + (dy * dy) / (2 * h.sigmaY * h.sigmaY);
        if (d2 < 5) {
          hiVal += Math.exp(-d2) * h.peak;
        }
      }

      // Crisp Fresnel Rim Glint
      if (absX > 0.85) {
        const rimDist = Math.abs(absX - 0.94);
        const rimSheen = Math.exp(-(rimDist * rimDist) / (2 * 0.04 * 0.04));
        hiVal += rimSheen * 110;
      }

      hiVal = Math.min(255, Math.round(hiVal));
      if (hiVal > 0) {
        rawHighlight[idx] = 255;
        rawHighlight[idx + 1] = 255;
        rawHighlight[idx + 2] = 255;
        rawHighlight[idx + 3] = Math.round(hiVal * a);
      }
    }

    // Central seam line
    if (mask[y * 400 + 200] > 50) {
      const idx = (y * 400 + 200) * 4;
      rawShadow[idx] = 0;
      rawShadow[idx + 1] = 0;
      rawShadow[idx + 2] = 0;
      rawShadow[idx + 3] = 180;
    }
  }

  const highlight = gaussianBlurAlpha(rawHighlight, 400, 800, 1);
  const shadow = gaussianBlurAlpha(rawShadow, 400, 800, 2);

  for (let i = 0; i < 400 * 800; i++) {
    const a = mask[i] / 255;
    highlight[i * 4 + 3] = Math.round(highlight[i * 4 + 3] * a);
    shadow[i * 4 + 3] = Math.round(shadow[i * 4 + 3] * a);
  }

  // Pre-composite version (translucent tinted black vinyl)
  const composite = Buffer.alloc(400 * 800 * 4);
  for (let i = 0; i < composite.length; i += 4) {
    const bA = baseColor[i + 3] / 255;
    if (bA === 0) continue;
    let r = (baseColor[i] * 20) / 255;
    let g = (baseColor[i + 1] * 20) / 255;
    let b = (baseColor[i + 2] * 25) / 255;
    let a = bA;

    const sA = shadow[i + 3] / 255;
    if (sA > 0) {
      r = r * (1 - sA) + shadow[i] * sA;
      g = g * (1 - sA) + shadow[i + 1] * sA;
      b = b * (1 - sA) + shadow[i + 2] * sA;
      a = a + sA * (1 - a);
    }

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

console.log("[JoJo-Mod] Generating 400x800 translucent GlossyPantyhoseBody assets...");

const allSizes = ["FlatSmall", "FlatMedium", "Small", "Normal", "Large", "XLarge"];
for (const size of allSizes) {
  console.log(`- Building 400x800 layers for ${size}...`);
  const layers = generate400x800Layers(size);

  fs.writeFileSync(path.join(OUT_DIR, `GlossyPantyhoseBody_${size}_BaseColor.png`), encodePng(400, 800, layers.baseColor));
  fs.writeFileSync(path.join(OUT_DIR, `GlossyPantyhoseBody_${size}_Shadow.png`), encodePng(400, 800, layers.shadow));
  fs.writeFileSync(path.join(OUT_DIR, `GlossyPantyhoseBody_${size}_Highlight.png`), encodePng(400, 800, layers.highlight));

  fs.writeFileSync(path.join(OUT_DIR, `GlossyPantyhoseBody_${size}.png`), encodePng(400, 800, layers.composite));

  // Also write for vanilla PantyhoseBody override
  fs.writeFileSync(path.join(OUT_DIR, `PantyhoseBody_${size}.png`), encodePng(400, 800, layers.composite));
}

// Generate Preview thumbnail (100x100)
console.log("- Generating Preview thumbnail...");
const compSmall = parsePng(fs.readFileSync(path.join(OUT_DIR, "GlossyPantyhoseBody_FlatSmall.png")));
const thumb = Buffer.alloc(100 * 100 * 4);
for (let y = 0; y < 100; y++) {
  const srcY = y * 8;
  for (let x = 0; x < 100; x++) {
    const srcX = x * 4;
    const srcIdx = (srcY * 400 + srcX) * 4;
    const dstIdx = (y * 100 + x) * 4;
    for (let c = 0; c < 4; c++) {
      thumb[dstIdx + c] = compSmall.pixels[srcIdx + c];
    }
  }
}
fs.writeFileSync(path.join(PREVIEW_DIR, "GlossyPantyhoseBody.png"), encodePng(100, 100, thumb));

console.log("[JoJo-Mod] All 6 body types generated successfully at 400x800 with sheer translucency!");
