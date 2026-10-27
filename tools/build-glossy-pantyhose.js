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
const TORSO_OUT_DIR = path.join(MOD_DIR, "assets", "Assets", "Female3DCG", "ItemTorso");
const TORSO_PREVIEW_DIR = path.join(TORSO_OUT_DIR, "Preview");
const TORSO2_OUT_DIR = path.join(MOD_DIR, "assets", "Assets", "Female3DCG", "ItemTorso2");
const TORSO2_PREVIEW_DIR = path.join(TORSO2_OUT_DIR, "Preview");

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(PREVIEW_DIR, { recursive: true });
fs.mkdirSync(TORSO_OUT_DIR, { recursive: true });
fs.mkdirSync(TORSO_PREVIEW_DIR, { recursive: true });
fs.mkdirSync(TORSO2_OUT_DIR, { recursive: true });
fs.mkdirSync(TORSO2_PREVIEW_DIR, { recursive: true });

const vanillaPanty = parsePng(fs.readFileSync(path.join(REF_DIR, "ItemArms", "PantyhoseBody_Small.png")));
const vMin = new Int32Array(800).fill(999);
const vMax = new Int32Array(800).fill(-1);
for (let y = 0; y < 800; y++) {
  for (let x = 0; x < 400; x++) {
    if (vanillaPanty.pixels[(y * 400 + x) * 4 + 3] > 15) {
      if (x < vMin[y]) vMin[y] = x;
      if (x > vMax[y]) vMax[y] = x;
    }
  }
}

function getMannequinCanvas(upperSize, legSizes) {
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
  const sizes = Array.isArray(legSizes) ? legSizes : [legSizes];
  for (const ls of sizes) {
    const lPath = path.join(REF_DIR, "BodyLower", "LegsClosed", `${ls}_White.png`);
    if (fs.existsSync(lPath)) stamp(parsePng(fs.readFileSync(lPath)), 0, 462);
  }

  return canvas;
}

function create400x800Mask(size, legSizeOverride) {
  let upperSize = size;
  let legSize = legSizeOverride;
  if (!legSize) {
    if (size === "Small" || size === "FlatSmall") {
      legSize = "Small";
    } else if (size === "Normal" || size === "FlatMedium") {
      legSize = "Normal";
    } else if (size === "Large") {
      legSize = "Large";
    } else if (size === "XLarge") {
      legSize = "XLarge";
    } else {
      legSize = "Normal";
    }
  }

  const manCanvas = getMannequinCanvas(upperSize, [legSize]);

  // 1. Exact min and max X for each row y (0..799)
  const rawMin = new Int32Array(800).fill(999);
  const rawMax = new Int32Array(800).fill(-1);

  // Starts at neckline y_ia = 23 (canvasY = 223), cleanly avoiding the neck column and chin!
  for (let y = 23; y < 800; y++) {
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

  // 2. Smooth outer contours
  const smoothMin = new Int32Array(800);
  const smoothMax = new Int32Array(800);
  for (let y = 0; y < 800; y++) {
    smoothMin[y] = rawMin[y];
    smoothMax[y] = rawMax[y];
  }

  // Clavicle & shoulders (y = 23..70):
  // Ensure full, seamless coverage of avatar's body and arms with zero exposed skin pixels!
  for (let y = 23; y <= 70; y++) {
    if (rawMin[y] <= rawMax[y]) {
      smoothMin[y] = Math.min(rawMin[y], vMin[y]);
      smoothMax[y] = Math.max(rawMax[y], vMax[y]);
    }
  }

  // Torso and calves smoothing (y = 71..649)
  for (let y = 71; y <= 649; y++) {
    if (rawMin[y] <= rawMax[y] && rawMin[y - 1] <= rawMax[y - 1] && rawMin[y + 1] <= rawMax[y + 1]) {
      smoothMin[y] = Math.round((rawMin[y - 1] + rawMin[y] * 2 + rawMin[y + 1]) / 4);
      smoothMax[y] = Math.round((rawMax[y - 1] + rawMax[y] * 2 + rawMax[y + 1]) / 4);
    }
  }

  // Ankles & feet (y = 650..755):
  // Snug elastic contour matching vanilla pantyhose silhouette, tightening around ankles and soles
  let legOffset = 0;
  let maxY = 752;
  if (legSize === "Normal") {
    legOffset = 2;
    maxY = 753;
  } else if (legSize === "Large") {
    legOffset = 4;
    maxY = 754;
  } else if (legSize === "XLarge") {
    legOffset = 6;
    maxY = 755;
  }

  for (let y = 650; y <= maxY; y++) {
    if (vMin[y] <= vMax[y]) {
      smoothMin[y] = vMin[y] - legOffset;
      smoothMax[y] = vMax[y] + legOffset;
    } else {
      smoothMin[y] = 999;
      smoothMax[y] = -1;
    }
  }
  for (let y = maxY + 1; y < 800; y++) {
    smoothMin[y] = 999;
    smoothMax[y] = -1;
  }

  // 3. Build snug form-fitting mask with clean anti-aliasing (starts at y = 23, terminates cleanly at maxY)
  const mask = Buffer.alloc(400 * 800);
  for (let y = 23; y <= maxY; y++) {
    if (smoothMin[y] > smoothMax[y]) continue;
    for (let x = smoothMin[y]; x <= smoothMax[y]; x++) {
      mask[y * 400 + x] = 255;
    }
    // Anti-aliased outer edge on the boundary
    mask[y * 400 + smoothMin[y]] = 210;
    mask[y * 400 + smoothMax[y]] = 210;
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

function generate400x800Layers(upperSize, legSizeOverride) {
  const size = upperSize;
  const mask = create400x800Mask(upperSize, legSizeOverride);

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

  // 2D specular hotspots (in 400x800 coordinates) - soft silky nylon glows matching Shiss example
  let chestHotspots = [];
  if (upperSize === "FlatSmall") {
    chestHotspots = [
      { xRatio: -0.22, y: 110, sigmaX: 0.12, sigmaY: 16, peak: 40 },
      { xRatio: 0.22, y: 110, sigmaX: 0.12, sigmaY: 16, peak: 40 },
    ];
  } else if (upperSize === "FlatMedium") {
    chestHotspots = [
      { xRatio: -0.24, y: 115, sigmaX: 0.12, sigmaY: 16, peak: 45 },
      { xRatio: 0.24, y: 115, sigmaX: 0.12, sigmaY: 16, peak: 45 },
    ];
  } else if (upperSize === "Small") {
    chestHotspots = [
      { xRatio: -0.28, y: 115, sigmaX: 0.12, sigmaY: 20, peak: 45 },
      { xRatio: 0.28, y: 115, sigmaX: 0.12, sigmaY: 20, peak: 45 },
    ];
  } else if (upperSize === "Normal") {
    chestHotspots = [
      { xRatio: -0.30, y: 120, sigmaX: 0.12, sigmaY: 22, peak: 50 },
      { xRatio: 0.30, y: 120, sigmaX: 0.12, sigmaY: 22, peak: 50 },
    ];
  } else if (upperSize === "Large") {
    chestHotspots = [
      { xRatio: -0.32, y: 125, sigmaX: 0.13, sigmaY: 24, peak: 55 },
      { xRatio: 0.32, y: 125, sigmaX: 0.13, sigmaY: 24, peak: 55 },
    ];
  } else if (upperSize === "XLarge") {
    chestHotspots = [
      { xRatio: -0.34, y: 130, sigmaX: 0.14, sigmaY: 26, peak: 60 },
      { xRatio: 0.34, y: 130, sigmaX: 0.14, sigmaY: 26, peak: 60 },
    ];
  }

  const isSlenderLegs = legSizeOverride === "Small" || (!legSizeOverride && (upperSize === "Small" || upperSize === "FlatSmall"));
  const legHotspots = isSlenderLegs ? [
    { xRatio: -0.28, y: 320, sigmaX: 0.08, sigmaY: 30, peak: 45 }, // Upper Thigh L
    { xRatio: 0.28, y: 320, sigmaX: 0.08, sigmaY: 30, peak: 45 },  // Upper Thigh R
    { xRatio: -0.27, y: 400, sigmaX: 0.08, sigmaY: 35, peak: 50 }, // Mid Thigh L
    { xRatio: 0.27, y: 400, sigmaX: 0.08, sigmaY: 35, peak: 50 },  // Mid Thigh R
    { xRatio: -0.27, y: 520, sigmaX: 0.09, sigmaY: 22, peak: 55 }, // Knee L
    { xRatio: 0.27, y: 520, sigmaX: 0.09, sigmaY: 22, peak: 55 },  // Knee R
    { xRatio: -0.27, y: 620, sigmaX: 0.07, sigmaY: 35, peak: 45 }, // Shin L
    { xRatio: 0.27, y: 620, sigmaX: 0.07, sigmaY: 35, peak: 45 },  // Shin R
  ] : [
    { xRatio: -0.30, y: 320, sigmaX: 0.08, sigmaY: 30, peak: 45 }, // Upper Thigh L
    { xRatio: 0.30, y: 320, sigmaX: 0.08, sigmaY: 30, peak: 45 },  // Upper Thigh R
    { xRatio: -0.28, y: 400, sigmaX: 0.08, sigmaY: 35, peak: 50 }, // Mid Thigh L
    { xRatio: 0.28, y: 400, sigmaX: 0.08, sigmaY: 35, peak: 50 },  // Mid Thigh R
    { xRatio: -0.28, y: 520, sigmaX: 0.09, sigmaY: 22, peak: 55 }, // Knee L
    { xRatio: 0.28, y: 520, sigmaX: 0.09, sigmaY: 22, peak: 55 },  // Knee R
    { xRatio: -0.28, y: 620, sigmaX: 0.07, sigmaY: 35, peak: 45 }, // Shin L
    { xRatio: 0.28, y: 620, sigmaX: 0.07, sigmaY: 35, peak: 45 },  // Shin R
  ];

  const hotspots = [
    { xRatio: -0.32, y: 48, sigmaX: 0.10, sigmaY: 16, peak: 40 },  // Left shoulder
    { xRatio: 0.32, y: 48, sigmaX: 0.10, sigmaY: 16, peak: 40 },   // Right shoulder
    ...chestHotspots,
    ...legHotspots,
  ];

  for (let y = 23; y < 770; y++) {
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

      // 3. Highlight: Silky sheer nylon sheen (soft, elegant, matching Shiss example on the left)
      const distFromBand = Math.abs(absX - 0.28);
      // Soft, broad silky sheen (no harsh blinding core, diffuse nylon reflection)
      const silkySheen = Math.exp(-(distFromBand * distFromBand) / (2 * 0.14 * 0.14)) * 62;
      const subtleGlint = Math.exp(-(distFromBand * distFromBand) / (2 * 0.07 * 0.07)) * 22;

      const normY = y / 750;
      const verticalFlow = 0.88 + 0.12 * Math.cos(normY * Math.PI * 3.5);

      let hiVal = (silkySheen + subtleGlint) * verticalFlow;

      for (const h of hotspots) {
        const dx = normX - h.xRatio;
        const dy = y - h.y;
        const d2 = (dx * dx) / (2 * h.sigmaX * h.sigmaX) + (dy * dy) / (2 * h.sigmaY * h.sigmaY);
        if (d2 < 5) {
          hiVal += Math.exp(-d2) * h.peak;
        }
      }

      // Soft Fresnel Rim Glint (subtle rim light)
      if (absX > 0.85) {
        const rimDist = Math.abs(absX - 0.94);
        const rimSheen = Math.exp(-(rimDist * rimDist) / (2 * 0.05 * 0.05));
        hiVal += rimSheen * 35;
      }

      hiVal = Math.min(95, Math.round(hiVal));
      if (hiVal > 0) {
        rawHighlight[idx] = 255;
        rawHighlight[idx + 1] = 255;
        rawHighlight[idx + 2] = 255;
        rawHighlight[idx + 3] = Math.round(hiVal * a);
      }
    }

    // Central seam line (stops at ankle y=745, no seam under soles)
    if (y <= 745 && mask[y * 400 + 200] > 50) {
      const idx = (y * 400 + 200) * 4;
      rawShadow[idx] = 0;
      rawShadow[idx + 1] = 0;
      rawShadow[idx + 2] = 0;
      rawShadow[idx + 3] = 180;
    }
  }

  const highlight = gaussianBlurAlpha(rawHighlight, 400, 800, 2);
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

const configs = [
  { name: "FlatSmall", upper: "FlatSmall", leg: "Small" },
  { name: "FlatMedium", upper: "FlatMedium", leg: "Normal" },
  { name: "FlatMedium_LegsSmall", upper: "FlatMedium", leg: "Small" },
  { name: "Small", upper: "Small", leg: "Small" },
  { name: "Normal", upper: "Normal", leg: "Normal" },
  { name: "Normal_LegsSmall", upper: "Normal", leg: "Small" },
  { name: "Large", upper: "Large", leg: "Large" },
  { name: "Large_LegsSmall", upper: "Large", leg: "Small" },
  { name: "XLarge", upper: "XLarge", leg: "XLarge" },
];

for (const cfg of configs) {
  console.log(`- Building 400x800 layers for ${cfg.name} (upper=${cfg.upper}, leg=${cfg.leg})...`);
  const layers = generate400x800Layers(cfg.upper, cfg.leg);

  const encBase = encodePng(400, 800, layers.baseColor);
  const encShd = encodePng(400, 800, layers.shadow);
  const encHlt = encodePng(400, 800, layers.highlight);
  const encComp = encodePng(400, 800, layers.composite);

  // Write to ItemArms (single source of truth; ItemTorso and ItemTorso2 reference this via DynamicGroupName)
  fs.writeFileSync(path.join(OUT_DIR, `GlossyPantyhoseBody_${cfg.name}_BaseColor.png`), encBase);
  fs.writeFileSync(path.join(OUT_DIR, `GlossyPantyhoseBody_${cfg.name}_Shadow.png`), encShd);
  fs.writeFileSync(path.join(OUT_DIR, `GlossyPantyhoseBody_${cfg.name}_Highlight.png`), encHlt);
  fs.writeFileSync(path.join(OUT_DIR, `GlossyPantyhoseBody_${cfg.name}.png`), encComp);
  if (!cfg.name.includes("_LegsSmall")) {
    fs.writeFileSync(path.join(OUT_DIR, `PantyhoseBody_${cfg.name}.png`), encComp);
  }
}

// Generate High-Quality Selection Preview thumbnails (221x221, matching vanilla BC format)
console.log("- Generating High-Quality Selection Preview thumbnails (221x221)...");
function generatePreviewThumbnail() {
  const upper = parsePng(fs.readFileSync(path.join(REF_DIR, "BodyUpper", "FlatMedium_White.png")));
  const aLeft = parsePng(fs.readFileSync(path.join(REF_DIR, "Override", "EchoV2", "ArmsLeft", "BackElbowTouch", "FlatMedium_White.png")));
  const aRight = parsePng(fs.readFileSync(path.join(REF_DIR, "Override", "EchoV2", "ArmsRight", "BackElbowTouch", "FlatMedium_White.png")));
  const leg = parsePng(fs.readFileSync(path.join(REF_DIR, "BodyLower", "LegsClosed", "Normal_White.png")));

  const baseImg = parsePng(fs.readFileSync(path.join(OUT_DIR, "GlossyPantyhoseBody_FlatMedium_BaseColor.png")));
  const shdImg = parsePng(fs.readFileSync(path.join(OUT_DIR, "GlossyPantyhoseBody_FlatMedium_Shadow.png")));
  const hltImg = parsePng(fs.readFileSync(path.join(OUT_DIR, "GlossyPantyhoseBody_FlatMedium_Highlight.png")));

  const fullCanvas = Buffer.alloc(500 * 1000 * 4);

  function drawSkin(img, ox, oy) {
    for (let y = 0; y < img.height; y++) {
      const dstY = y + oy;
      if (dstY >= 1000) continue;
      for (let x = 0; x < img.width; x++) {
        const dstX = x + ox;
        if (dstX >= 500) continue;
        const srcIdx = (y * img.width + x) * 4;
        const dstIdx = (dstY * 500 + dstX) * 4;
        const a = img.pixels[srcIdx + 3] / 255;
        if (a > 0.05) {
          fullCanvas[dstIdx] = 232;
          fullCanvas[dstIdx + 1] = 188;
          fullCanvas[dstIdx + 2] = 162;
          fullCanvas[dstIdx + 3] = Math.round(a * 255);
        }
      }
    }
  }

  drawSkin(upper, 0, 0);
  drawSkin(aLeft, 0, 0);
  drawSkin(aRight, 0, 0);
  drawSkin(leg, 0, 462);

  for (let y = 0; y < 800; y++) {
    const dstY = y + 200;
    for (let x = 0; x < 400; x++) {
      const dstX = x + 50;
      const srcIdx = (y * 400 + x) * 4;
      const dstIdx = (dstY * 500 + dstX) * 4;

      const bA = baseImg.pixels[srcIdx + 3] / 255;
      if (bA > 0) {
        const r = 25, g = 25, b = 32;
        const curA = fullCanvas[dstIdx + 3] / 255;
        if (curA > 0) {
          fullCanvas[dstIdx] = Math.round(fullCanvas[dstIdx] * (1 - bA) + r * bA);
          fullCanvas[dstIdx + 1] = Math.round(fullCanvas[dstIdx + 1] * (1 - bA) + g * bA);
          fullCanvas[dstIdx + 2] = Math.round(fullCanvas[dstIdx + 2] * (1 - bA) + b * bA);
        } else {
          fullCanvas[dstIdx] = r;
          fullCanvas[dstIdx + 1] = g;
          fullCanvas[dstIdx + 2] = b;
          fullCanvas[dstIdx + 3] = Math.round(bA * 255);
        }
      }

      const sA = shdImg.pixels[srcIdx + 3] / 255;
      if (sA > 0) {
        fullCanvas[dstIdx] = Math.round(fullCanvas[dstIdx] * (1 - sA));
        fullCanvas[dstIdx + 1] = Math.round(fullCanvas[dstIdx + 1] * (1 - sA));
        fullCanvas[dstIdx + 2] = Math.round(fullCanvas[dstIdx + 2] * (1 - sA));
      }

      const hA = hltImg.pixels[srcIdx + 3] / 255;
      if (hA > 0) {
        fullCanvas[dstIdx] = Math.min(255, Math.round(fullCanvas[dstIdx] + 255 * hA));
        fullCanvas[dstIdx + 1] = Math.min(255, Math.round(fullCanvas[dstIdx + 1] + 255 * hA));
        fullCanvas[dstIdx + 2] = Math.min(255, Math.round(fullCanvas[dstIdx + 2] + 255 * hA));
      }
    }
  }

  const thumb221 = Buffer.alloc(221 * 221 * 4);
  const scale = 215 / 760;
  const srcMinY = 205;
  const srcCenterX = 250;
  const dstCenterX = 110;
  const dstMinY = 3;

  for (let dy = 0; dy < 221; dy++) {
    const sy = (dy - dstMinY) / scale + srcMinY;
    if (sy < 0 || sy >= 1000) continue;
    const sy0 = Math.floor(sy);
    const sy1 = Math.min(999, sy0 + 1);
    const fy = sy - sy0;

    for (let dx = 0; dx < 221; dx++) {
      const sx = (dx - dstCenterX) / scale + srcCenterX;
      if (sx < 0 || sx >= 500) continue;
      const sx0 = Math.floor(sx);
      const sx1 = Math.min(499, sx0 + 1);
      const fx = sx - sx0;

      const idx00 = (sy0 * 500 + sx0) * 4;
      const idx01 = (sy0 * 500 + sx1) * 4;
      const idx10 = (sy1 * 500 + sx0) * 4;
      const idx11 = (sy1 * 500 + sx1) * 4;

      const dstIdx = (dy * 221 + dx) * 4;
      for (let c = 0; c < 4; c++) {
        const top = fullCanvas[idx00 + c] * (1 - fx) + fullCanvas[idx01 + c] * fx;
        const bot = fullCanvas[idx10 + c] * (1 - fx) + fullCanvas[idx11 + c] * fx;
        thumb221[dstIdx + c] = Math.round(top * (1 - fy) + bot * fy);
      }
    }
  }

  const encodedThumb = encodePng(221, 221, thumb221);
  fs.writeFileSync(path.join(PREVIEW_DIR, "GlossyPantyhoseBody.png"), encodedThumb);
}

generatePreviewThumbnail();

console.log("[JoJo-Mod] All assets and previews generated successfully for ItemArms (shared with ItemTorso & ItemTorso2)!");
