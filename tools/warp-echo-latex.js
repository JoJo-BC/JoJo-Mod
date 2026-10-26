const fs = require("fs");
const path = require("path");
const https = require("https");
const {
  parsePng,
  encodePng,
  buildPoseWarp,
  mapCoord2D,
  sampleBilinearRGBA,
  OUT_ASSETS_DIR,
} = require("./warp-engine");

const POSES = [
  { id: "", name: "Standing" },
  { id: "Yoked/", name: "Yoked" },
  { id: "OverTheHead/", name: "OverTheHead" },
  { id: "BackBoxTie/", name: "BackBoxTie" },
  { id: "BackCuffs/", name: "BackCuffs" },
  { id: "BackElbowTouch/", name: "BackElbowTouch" },
];

const BASE_URL = "https://raw.githubusercontent.com/SugarChain-Studio/echo-clothing-ext/main/resources/Assets/Female3DCG/Suit/";

function download(urlPath) {
  return new Promise((resolve) => {
    const fullUrl = BASE_URL + urlPath.split("/").map(encodeURIComponent).join("/");
    https.get(fullUrl, res => {
      if (res.statusCode !== 200) return resolve(null);
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", () => resolve(null));
  });
}

async function run() {
  console.log("=== Refined Warp & Adaptation for 乳胶衣 (Latex Top) ===");

  for (const p of POSES) {
    console.log(`\nProcessing pose: ${p.name || "Standing"}...`);

    const rawBaseBuf = await download(`${p.id}乳胶衣_Small_上底色.png`);
    const rawShadowBuf = await download(`${p.id}乳胶衣_Small_上阴影.png`);
    const rawHighBuf = await download(`${p.id}乳胶衣_Small_上高光.png`);

    if (!rawBaseBuf || !rawShadowBuf) {
      console.warn(`Missing base or shadow for ${p.name}`);
      continue;
    }

    const rawBase = parsePng(rawBaseBuf);
    const rawShadow = parsePng(rawShadowBuf);
    const rawHigh = rawHighBuf ? parsePng(rawHighBuf) : null;
    const height = 1000;

    for (const size of ["FlatSmall", "FlatMedium"]) {
      const warp = buildPoseWarp(p.id, size);
      const isSmall = size === "FlatSmall";

      // 1. BASE COLOR (上底色):
      const outBase = Buffer.alloc(500 * height * 4);
      for (let y = 0; y < 462; y++) {
        for (let x = 0; x < 500; x++) {
          const bodyA = warp.dBodyAlpha(x, y);
          if (bodyA === 0) continue;

          const idx = (y * 500 + x) * 4;
          outBase[idx] = 255;
          outBase[idx + 1] = 255;
          outBase[idx + 2] = 255;
          outBase[idx + 3] = bodyA;
        }
      }

      // 2. SHADOW (上阴影):
      const outShadow = Buffer.alloc(500 * height * 4);
      for (let y = 0; y < 462; y++) {
        for (let x = 0; x < 500; x++) {
          const bodyA = warp.dBodyAlpha(x, y);
          if (bodyA === 0) continue;

          const mapped = mapCoord2D(x, y, warp) || [x, y];
          const c = sampleBilinearRGBA(rawShadow.pixels, mapped[0], mapped[1]);
          const idx = (y * 500 + x) * 4;

          let r = 252;
          let g = 252;
          let b = 252;
          let a = c.a;

          const distFromCenter = Math.abs(x - 250);

          // Chest region: 260 <= y <= 365, x in 180..320
          if (y >= 260 && y <= 365 && distFromCenter < 70) {
            const vEnv = Math.sin(((y - 260) / 105) * Math.PI);
            const hEnv = Math.cos((distFromCenter / 70) * (Math.PI / 2));
            const chestWeight = Math.pow(vEnv * hEnv, 0.8);

            if (isSmall) {
              const flatTargetA = 45;
              a = Math.round(a * (1 - chestWeight * 0.85) + flatTargetA * (chestWeight * 0.85));

              if (distFromCenter < 10 && y >= 275 && y <= 335) {
                const sternumV = Math.sin(((y - 275) / 60) * Math.PI);
                const sternumH = 1 - distFromCenter / 10;
                const sternumA = Math.round(20 * sternumV * sternumH);
                a = Math.min(90, a + sternumA);
              }
            } else {
              const flatTargetA = 40;
              a = Math.round(a * (1 - chestWeight * 0.8) + flatTargetA * (chestWeight * 0.8));

              const pecY = 333 + Math.min(1, Math.max(0, (distFromCenter - 6) / 38)) * 4;
              if (distFromCenter >= 6 && distFromCenter <= 52 && y >= pecY - 2 && y <= pecY + 8) {
                const dy = (y - pecY) / 7;
                const vFalloff = dy >= 0 ? Math.max(0, 1 - dy) : Math.max(0, 1 + dy * 2.5);
                const hFalloff = Math.sin(((distFromCenter - 6) / 46) * Math.PI);
                const pecShadowA = Math.round(55 * vFalloff * hFalloff);
                a = Math.min(130, a + pecShadowA);
              }

              if (distFromCenter < 8 && y >= 280 && y <= 332) {
                const sternV = Math.sin(((y - 280) / 52) * Math.PI);
                const sternH = 1 - distFromCenter / 8;
                a = Math.min(80, a + Math.round(18 * sternV * sternH));
              }
            }
          }

          a = Math.min(a, bodyA);

          outShadow[idx] = r;
          outShadow[idx + 1] = g;
          outShadow[idx + 2] = b;
          outShadow[idx + 3] = a;
        }
      }

      // 3. HIGHLIGHT (上高光):
      const outHigh = Buffer.alloc(500 * height * 4);
      if (rawHigh) {
        for (let y = 0; y < 462; y++) {
          for (let x = 0; x < 500; x++) {
            const bodyA = warp.dBodyAlpha(x, y);
            if (bodyA === 0) continue;

            const mapped = mapCoord2D(x, y, warp) || [x, y];
            const c = sampleBilinearRGBA(rawHigh.pixels, mapped[0], mapped[1]);
            const idx = (y * 500 + x) * 4;

            let a = c.a;
            const distFromCenter = Math.abs(x - 250);

            // In the chest zone (y: 265..355, distFromCenter < 65):
            // Completely remove the circular female breast glares!
            if (y >= 265 && y <= 355 && distFromCenter < 65) {
              const vE = Math.sin(((y - 265) / 90) * Math.PI);
              const hE = Math.cos((distFromCenter / 65) * (Math.PI / 2));
              const eraseW = Math.min(1, Math.pow(vE * hE, 0.4) * 1.5);

              a = Math.round(a * (1 - eraseW));
            }

            a = Math.min(a, bodyA);

            outHigh[idx] = 255;
            outHigh[idx + 1] = 255;
            outHigh[idx + 2] = 255;
            outHigh[idx + 3] = a;
          }
        }
      }

      const outDir = path.join(OUT_ASSETS_DIR, "Suit", p.id);
      fs.mkdirSync(outDir, { recursive: true });

      fs.writeFileSync(path.join(outDir, `乳胶衣_${size}_上底色.png`), encodePng(500, height, outBase));
      fs.writeFileSync(path.join(outDir, `乳胶衣_${size}_上阴影.png`), encodePng(500, height, outShadow));
      if (rawHigh) {
        fs.writeFileSync(path.join(outDir, `乳胶衣_${size}_上高光.png`), encodePng(500, height, outHigh));
      }
      console.log(`  -> Wrote refined ${size} layers for ${p.id}乳胶衣`);
    }
  }

  console.log("\nDone generating refined flat male chest layers!");
}

if (require.main === module) {
  run().catch(console.error);
}

module.exports = { run };
