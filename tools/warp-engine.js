/**
 * JoJo-Mod: 2D Adaptive Warp Engine for Flat-Chest (FlatSmall & FlatMedium) & Multi-Pose support
 * Self-contained pure Node.js module (no external dependencies, built-in zlib & fs).
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const MOD_DIR = path.resolve(__dirname, "..");
const REF_DIR = path.join(MOD_DIR, "reference_samples", "Assets", "Female3DCG");
const OUT_ASSETS_DIR = path.join(MOD_DIR, "assets", "Assets", "Female3DCG");

function parsePng(buf) {
	const width = buf.readUInt32BE(16);
	const height = buf.readUInt32BE(20);
	const colorType = buf[25];
	let pos = 8;
	const idatChunks = [];
	while (pos < buf.length) {
		const len = buf.readUInt32BE(pos);
		const type = buf.toString("ascii", pos + 4, pos + 8);
		if (type === "IDAT") idatChunks.push(buf.subarray(pos + 8, pos + 8 + len));
		pos += 12 + len;
	}
	const raw = zlib.inflateSync(Buffer.concat(idatChunks));
	const bpp = colorType === 6 ? 4 : colorType === 4 ? 2 : colorType === 2 ? 3 : 1;
	const stride = width * bpp;
	const pixels = Buffer.alloc(width * height * 4);
	let prevRow = Buffer.alloc(stride);
	for (let y = 0; y < height; y++) {
		const filter = raw[y * (stride + 1)];
		const row = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
		for (let i = 0; i < stride; i++) {
			const a = i >= bpp ? row[i - bpp] : 0;
			const b = prevRow[i];
			const c = i >= bpp ? prevRow[i - bpp] : 0;
			if (filter === 1) row[i] = (row[i] + a) & 0xff;
			else if (filter === 2) row[i] = (row[i] + b) & 0xff;
			else if (filter === 3) row[i] = (row[i] + ((a + b) >> 1)) & 0xff;
			else if (filter === 4) {
				const p = a + b - c;
				const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
				const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
				row[i] = (row[i] + pr) & 0xff;
			}
		}
		prevRow = row;
		for (let x = 0; x < width; x++) {
			const outIdx = (y * width + x) * 4;
			if (colorType === 6) {
				pixels[outIdx] = row[x * 4];
				pixels[outIdx + 1] = row[x * 4 + 1];
				pixels[outIdx + 2] = row[x * 4 + 2];
				pixels[outIdx + 3] = row[x * 4 + 3];
			} else if (colorType === 4) {
				pixels[outIdx] = row[x * 2];
				pixels[outIdx + 1] = row[x * 2];
				pixels[outIdx + 2] = row[x * 2];
				pixels[outIdx + 3] = row[x * 2 + 1];
			}
		}
	}
	return { width, height, pixels };
}

function crc32(buf) {
	let c = 0xffffffff;
	for (let i = 0; i < buf.length; i++) {
		c ^= buf[i];
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	}
	return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length, 0);
	const t = Buffer.from(type, "ascii");
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
	return Buffer.concat([len, t, data, crc]);
}

function encodePng(width, height, pixels) {
	const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8;
	ihdr[9] = 6;
	const raw = Buffer.alloc(height * (width * 4 + 1));
	for (let y = 0; y < height; y++) {
		raw[y * (width * 4 + 1)] = 0;
		pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
	}
	return Buffer.concat([
		sig,
		makeChunk("IHDR", ihdr),
		makeChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
		makeChunk("IEND", Buffer.alloc(0)),
	]);
}

function loadPart(pose, part, size) {
	const full = path.join(REF_DIR, `Override/EchoV2/${part}/${pose}${size}_White.png`);
	if (!fs.existsSync(full)) return null;
	return parsePng(fs.readFileSync(full)).pixels;
}

function findBoundsX(maskFn, y, xMin, xMax, thresh = 16) {
	let l = -1, r = -1;
	for (let x = xMin; x <= xMax; x++) {
		if (maskFn(x, y) >= thresh) {
			if (l === -1) l = x;
			r = x;
		}
	}
	return l === -1 ? null : [l, r];
}

function findBoundsY(maskFn, x, yMin, yMax, thresh = 16) {
	let t = -1, b = -1;
	for (let y = yMin; y <= yMax; y++) {
		if (maskFn(x, y) >= thresh) {
			if (t === -1) t = y;
			b = y;
		}
	}
	return t === -1 ? null : [t, b];
}

function getAlpha(buf, x, y) {
	if (!buf || y < 0 || y >= 462 || x < 0 || x >= 500) return 0;
	return buf[(y * 500 + x) * 4 + 3];
}

function buildPoseWarp(pose, targetSize) {
	const sBU = loadPart(pose, "BodyUpper", "Small");
	const sAR = loadPart(pose, "ArmsRight", "Small");
	const sAL = loadPart(pose, "ArmsLeft", "Small");
	const sHR = loadPart(pose, "HandsRight", "Small");
	const sHL = loadPart(pose, "HandsLeft", "Small");

	const dBU = loadPart(pose, "BodyUpper", targetSize);
	const dAR = loadPart(pose, "ArmsRight", targetSize);
	const dAL = loadPart(pose, "ArmsLeft", targetSize);
	const dHR = loadPart(pose, "HandsRight", targetSize);
	const dHL = loadPart(pose, "HandsLeft", targetSize);

	// Composite target EchoV2 body
	const dComp = Buffer.alloc(500 * 462 * 4);
	for (const part of [dBU, dAL, dAR, dHL, dHR]) {
		if (!part) continue;
		for (let i = 0; i < dComp.length; i += 4) {
			const sa = part[i + 3] / 255;
			if (sa <= 0) continue;
			const da = dComp[i + 3] / 255;
			const oa = sa + da * (1 - sa);
			if (oa > 0) {
				dComp[i] = Math.round((part[i] * sa + dComp[i] * da * (1 - sa)) / oa);
				dComp[i + 1] = Math.round((part[i + 1] * sa + dComp[i + 1] * da * (1 - sa)) / oa);
				dComp[i + 2] = Math.round((part[i + 2] * sa + dComp[i + 2] * da * (1 - sa)) / oa);
				dComp[i + 3] = Math.round(oa * 255);
			}
		}
	}

	// Seal 1-6px internal jigsaw seams between adjacent EchoV2 parts on row y
	const partsList = [dBU, dAL, dAR, dHL, dHR].filter(Boolean);
	for (let y = 5; y < 455; y++) {
		for (let x = 10; x < 485; x++) {
			const i = (y * 500 + x) * 4;
			if (dComp[i + 3] >= 240) continue;
			for (let dxL = 1; dxL <= 6; dxL++) {
				const xL = x - dxL;
				if (xL < 0) break;
				const iL = (y * 500 + xL) * 4;
				if (dComp[iL + 3] < 200) continue;
				for (let dxR = 1; dxR <= 6; dxR++) {
					const xR = x + dxR;
					if (xR >= 500) break;
					const iR = (y * 500 + xR) * 4;
					if (dComp[iR + 3] < 200) continue;
					let differentParts = false;
					for (let p1 = 0; p1 < partsList.length && !differentParts; p1++) {
						if (partsList[p1][iL + 3] > 80) {
							for (let p2 = 0; p2 < partsList.length; p2++) {
								if (p1 !== p2 && partsList[p2][iR + 3] > 80) {
									differentParts = true;
									break;
								}
							}
						}
					}
					if (differentParts && dxL + dxR <= 11) {
						const t = dxL / (dxL + dxR);
						dComp[i] = Math.round(dComp[iL] * (1 - t) + dComp[iR] * t);
						dComp[i + 1] = Math.round(dComp[iL + 1] * (1 - t) + dComp[iR + 1] * t);
						dComp[i + 2] = Math.round(dComp[iL + 2] * (1 - t) + dComp[iR + 2] * t);
						dComp[i + 3] = 255;
						break;
					}
				}
				if (dComp[i + 3] >= 240) break;
			}
		}
	}

	const dBodyAlpha = (x, y) => {
		if (y < 0 || y >= 462 || x < 0 || x >= 500) return 0;
		const i = (y * 500 + x) * 4 + 3;
		return Math.min(
			255,
			Math.max(
				dComp[i],
				(dBU ? dBU[i] : 0) +
					(dAL ? dAL[i] : 0) +
					(dAR ? dAR[i] : 0) +
					(dHL ? dHL[i] : 0) +
					(dHR ? dHR[i] : 0)
			)
		);
	};

	const rawRows = new Array(462);
	for (let y = 0; y < 462; y++) {
		const st = findBoundsX((x, yy) => getAlpha(sBU, x, yy), y, 155, 345);
		const dt = findBoundsX((x, yy) => getAlpha(dBU, x, yy), y, 155, 345);

		const armXMaxL = pose === "Yoked/" ? 105 : 245;
		const armXMinR = pose === "Yoked/" ? 395 : 255;

		const sLeftArm = findBoundsX(
			(x, yy) => (getAlpha(sBU, x, yy) > 50 ? 0 : getAlpha(sAR, x, yy)),
			y,
			60,
			armXMaxL
		);
		let dLeftArm = findBoundsX(
			(x, yy) => (getAlpha(dBU, x, yy) > 50 ? 0 : getAlpha(dAR, x, yy)),
			y,
			60,
			armXMaxL
		);

		const sRightArm = findBoundsX(
			(x, yy) => (getAlpha(sBU, x, yy) > 50 ? 0 : getAlpha(sAL, x, yy)),
			y,
			armXMinR,
			440
		);
		let dRightArm = findBoundsX(
			(x, yy) => (getAlpha(dBU, x, yy) > 50 ? 0 : getAlpha(dAL, x, yy)),
			y,
			armXMinR,
			440
		);

		if (pose === "" && y >= 402 && sLeftArm) {
			if (!dLeftArm) dLeftArm = [...sLeftArm];
			else {
				const t = Math.min(1, (y - 402) / 14);
				dLeftArm = [
					dLeftArm[0] * (1 - t) + sLeftArm[0] * t,
					dLeftArm[1] * (1 - t) + sLeftArm[1] * t,
				];
			}
		}
		if (pose === "" && y >= 402 && sRightArm) {
			if (!dRightArm) dRightArm = [...sRightArm];
			else {
				const t = Math.min(1, (y - 402) / 14);
				dRightArm = [
					dRightArm[0] * (1 - t) + sRightArm[0] * t,
					dRightArm[1] * (1 - t) + sRightArm[1] * t,
				];
			}
		}

		rawRows[y] = { st, dt, sLeftArm, dLeftArm, sRightArm, dRightArm };
	}

	function smoothRowPair(keyS, keyD, y) {
		const curS = rawRows[y]?.[keyS];
		const curD = rawRows[y]?.[keyD];
		if (!curS || !curD) return { s: curS, d: curD };
		let s0 = 0, s1 = 0, d0 = 0, d1 = 0, wSum = 0;
		for (let dy = -5; dy <= 5; dy++) {
			const ny = Math.max(0, Math.min(461, y + dy));
			const ns = rawRows[ny]?.[keyS];
			const nd = rawRows[ny]?.[keyD];
			if (ns && nd) {
				const w = Math.exp(-(dy * dy) / (2 * 2.4 * 2.4));
				s0 += ns[0] * w;
				s1 += ns[1] * w;
				d0 += nd[0] * w;
				d1 += nd[1] * w;
				wSum += w;
			}
		}
		return { s: [s0 / wSum, s1 / wSum], d: [d0 / wSum, d1 / wSum] };
	}

	const rows = new Array(462);
	for (let y = 0; y < 462; y++) {
		const t = smoothRowPair("st", "dt", y);
		const la = smoothRowPair("sLeftArm", "dLeftArm", y);
		const ra = smoothRowPair("sRightArm", "dRightArm", y);
		rows[y] = {
			st: t.s,
			dt: t.d,
			sLeftArm: la.s,
			dLeftArm: la.d,
			sRightArm: ra.s,
			dRightArm: ra.d,
		};
	}

	const rawCols = new Array(500);
	for (let x = 0; x < 500; x++) {
		const stY = findBoundsY((xx, y) => getAlpha(sBU, xx, y), x, 200, 320);
		const dtY = findBoundsY((xx, y) => getAlpha(dBU, xx, y), x, 200, 320);
		const sArmY =
			x < 250
				? findBoundsY((xx, y) => getAlpha(sAR, xx, y), x, 210, 330)
				: findBoundsY((xx, y) => getAlpha(sAL, xx, y), x, 210, 330);
		const dArmY =
			x < 250
				? findBoundsY((xx, y) => getAlpha(dAR, xx, y), x, 210, 330)
				: findBoundsY((xx, y) => getAlpha(dAL, xx, y), x, 210, 330);
		rawCols[x] = { stY, dtY, sArmY, dArmY };
	}

	function smoothColPair(keyS, keyD, x) {
		const curS = rawCols[x]?.[keyS];
		const curD = rawCols[x]?.[keyD];
		if (!curS || !curD) return { s: curS, d: curD };
		let s0 = 0, s1 = 0, d0 = 0, d1 = 0, wSum = 0;
		for (let dx = -5; dx <= 5; dx++) {
			const nx = Math.max(0, Math.min(499, x + dx));
			const ns = rawCols[nx]?.[keyS];
			const nd = rawCols[nx]?.[keyD];
			if (ns && nd) {
				const w = Math.exp(-(dx * dx) / (2 * 2.4 * 2.4));
				s0 += ns[0] * w;
				s1 += ns[1] * w;
				d0 += nd[0] * w;
				d1 += nd[1] * w;
				wSum += w;
			}
		}
		return { s: [s0 / wSum, s1 / wSum], d: [d0 / wSum, d1 / wSum] };
	}

	const cols = new Array(500);
	for (let x = 0; x < 500; x++) {
		const ty = smoothColPair("stY", "dtY", x);
		const ay = smoothColPair("sArmY", "dArmY", x);
		cols[x] = { stY: ty.s, dtY: ty.d, sArmY: ay.s, dArmY: ay.d };
	}

	return {
		pose,
		targetSize,
		rows,
		cols,
		sBU,
		sAR,
		sAL,
		sHR,
		sHL,
		dBU,
		dAR,
		dAL,
		dHR,
		dHL,
		dComp,
		dBodyAlpha,
	};
}

function sampleBilinear(srcPixels, sx, sy) {
	if (sx < 0 || sx >= 499 || sy < 0 || sy >= 999) return 0;
	const x0 = Math.floor(sx);
	const x1 = x0 + 1;
	const y0 = Math.floor(sy);
	const y1 = y0 + 1;
	const fx = sx - x0;
	const fy = sy - y0;

	const i00 = (y0 * 500 + x0) * 4 + 3;
	const i10 = (y0 * 500 + x1) * 4 + 3;
	const i01 = (y1 * 500 + x0) * 4 + 3;
	const i11 = (y1 * 500 + x1) * 4 + 3;

	const v0 = srcPixels[i00] * (1 - fx) + srcPixels[i10] * fx;
	const v1 = srcPixels[i01] * (1 - fx) + srcPixels[i11] * fx;
	return Math.round(v0 * (1 - fy) + v1 * fy);
}

function mapCoord2D(x, y, warp) {
	const { pose, rows, cols } = warp;
	const r = rows[y];
	const c = cols[x];
	if (!r) return null;

	if (pose === "OverTheHead/" && y <= 80) {
		if (getAlpha(warp.dHL, x, y) > 10 || getAlpha(warp.dHR, x, y) > 10 || y < 68) {
			return [x - 1, y];
		}
	}

	if (pose === "Yoked/") {
		if (y < 216 && (x < 125 || x > 375)) return [x, y];

		const evalForearmL = () => {
			let sx = x;
			if (r.sLeftArm && r.dLeftArm) {
				const [sL, sR] = r.sLeftArm;
				const [dL, dR] = r.dLeftArm;
				sx = sL + ((x - dL) / Math.max(1, dR - dL)) * Math.max(1, sR - sL);
			}
			let sy = y;
			if (y > 265 && c && c.sArmY && c.dArmY) {
				const sB = c.sArmY[1];
				const dB = c.dArmY[1];
				if (dB > 265 && sB > 265) {
					sy = 265 + ((y - 265) / (dB - 265)) * (sB - 265);
				}
			}
			return [sx, sy];
		};

		const evalForearmR = () => {
			let sx = x;
			if (r.sRightArm && r.dRightArm) {
				const [sL, sR] = r.sRightArm;
				const [dL, dR] = r.dRightArm;
				sx = sL + ((x - dL) / Math.max(1, dR - dL)) * Math.max(1, sR - sL);
			}
			let sy = y;
			if (y > 265 && c && c.sArmY && c.dArmY) {
				const sB = c.sArmY[1];
				const dB = c.dArmY[1];
				if (dB > 265 && sB > 265) {
					sy = 265 + ((y - 265) / (dB - 265)) * (sB - 265);
				}
			}
			return [sx, sy];
		};

		const evalUpperArm = () => {
			if (c && c.sArmY && c.dArmY) {
				const [sT, sB] = c.sArmY;
				const [dT, dB] = c.dArmY;
				const sy = sT + ((y - dT) / Math.max(1, dB - dT)) * Math.max(1, sB - sT);
				return [x, sy];
			}
			return [x, y];
		};

		const evalTorso = () => {
			if (r.st && r.dt) {
				const [sL, sR] = r.st;
				const [dL, dR] = r.dt;
				const sx =
					x <= 250
						? 250 + ((x - 250) / Math.min(-1, dL - 250)) * (sL - 250)
						: 250 + ((x - 250) / Math.max(1, dR - 250)) * (sR - 250);
				let sy = y;
				if (y <= 252 && c && c.stY && c.dtY) {
					const sT = c.stY[0];
					const dT = c.dtY[0];
					const w = Math.max(0, 1 - Math.max(0, y - dT) / 28);
					sy = y + (sT - dT) * w;
				}
				return [sx, sy];
			}
			return [x, y];
		};

		if (x < 94) return evalForearmL();
		if (x >= 94 && x <= 106) {
			const t = (x - 94) / 12;
			const [x0, y0] = evalForearmL();
			const [x1, y1] = evalUpperArm();
			return [x0 * (1 - t) + x1 * t, y0 * (1 - t) + y1 * t];
		}
		if (x > 106 && x < 166) return evalUpperArm();
		if (x >= 166 && x <= 174) {
			const t = (x - 166) / 8;
			const [x0, y0] = evalUpperArm();
			const [x1, y1] = evalTorso();
			return [x0 * (1 - t) + x1 * t, y0 * (1 - t) + y1 * t];
		}
		if (x > 174 && x < 326) return evalTorso();
		if (x >= 326 && x <= 334) {
			const t = (x - 326) / 8;
			const [x0, y0] = evalTorso();
			const [x1, y1] = evalUpperArm();
			return [x0 * (1 - t) + x1 * t, y0 * (1 - t) + y1 * t];
		}
		if (x > 334 && x < 394) return evalUpperArm();
		if (x >= 394 && x <= 406) {
			const t = (x - 394) / 12;
			const [x0, y0] = evalUpperArm();
			const [x1, y1] = evalForearmR();
			return [x0 * (1 - t) + x1 * t, y0 * (1 - t) + y1 * t];
		}
		return evalForearmR();
	}

	if (pose === "BackCuffs/" && y >= 376 && x > 306) {
		if (getAlpha(warp.dHL, x, y) > 10 || getAlpha(warp.dHR, x, y) > 10) {
			return [x, y];
		}
	}

	let sy = y;
	if (y >= 205 && y <= 245 && x >= 170 && x <= 330 && c && c.stY && c.dtY) {
		const sT = c.stY[0];
		const dT = c.dtY[0];
		if (Math.abs(sT - dT) <= 8) {
			const w = Math.max(0, 1 - Math.max(0, y - dT) / 24);
			sy = y + (sT - dT) * w;
		}
	}

	let res = null;
	if (x <= 250) {
		const hasArm = !!(r.sLeftArm && r.dLeftArm);
		const hasTorso = !!(r.st && r.dt);
		if (hasArm && hasTorso) {
			const midL = 0.5 * (r.dLeftArm[1] + r.dt[0]);
			if (x < midL) {
				const [sL, sR] = r.sLeftArm;
				const [dL, dR] = r.dLeftArm;
				const sx = sL + ((x - dL) / Math.max(1, dR - dL)) * Math.max(1, sR - sL);
				res = [sx, y];
			} else {
				const [sL] = r.st;
				const [dL] = r.dt;
				const sx = 250 + ((x - 250) / Math.min(-1, dL - 250)) * (sL - 250);
				res = [sx, sy];
			}
		} else if (hasArm) {
			const [sL, sR] = r.sLeftArm;
			const [dL, dR] = r.dLeftArm;
			const sx = sL + ((x - dL) / Math.max(1, dR - dL)) * Math.max(1, sR - sL);
			res = [sx, y];
		} else if (hasTorso) {
			const [sL] = r.st;
			const [dL] = r.dt;
			const sx = 250 + ((x - 250) / Math.min(-1, dL - 250)) * (sL - 250);
			res = [sx, sy];
		}
	} else {
		const hasArm = !!(r.sRightArm && r.dRightArm);
		const hasTorso = !!(r.st && r.dt);
		if (hasArm && hasTorso) {
			const midR = 0.5 * (r.dt[1] + r.dRightArm[0]);
			if (x > midR) {
				const [sL, sR] = r.sRightArm;
				const [dL, dR] = r.dRightArm;
				const sx = sL + ((x - dL) / Math.max(1, dR - dL)) * Math.max(1, sR - sL);
				res = [sx, y];
			} else {
				const [, sR] = r.st;
				const [, dR] = r.dt;
				const sx = 250 + ((x - 250) / Math.max(1, dR - 250)) * (sR - 250);
				res = [sx, sy];
			}
		} else if (hasArm) {
			const [sL, sR] = r.sRightArm;
			const [dL, dR] = r.dRightArm;
			const sx = sL + ((x - dL) / Math.max(1, dR - dL)) * Math.max(1, sR - sL);
			res = [sx, y];
		} else if (hasTorso) {
			const [, sR] = r.st;
			const [, dR] = r.dt;
			const sx = 250 + ((x - 250) / Math.max(1, dR - 250)) * (sR - 250);
			res = [sx, sy];
		}
	}

	return res;
}

function warpLayer2D(srcPixels, warp, layerName) {
	const out = Buffer.alloc(srcPixels.length);

	if (layerName === "BaseColor") {
		for (let y = 0; y < 462; y++) {
			for (let x = 0; x < 500; x++) {
				const bodyA = warp.dBodyAlpha(x, y);
				if (bodyA > 0) {
					const idx = (y * 500 + x) * 4;
					out[idx] = 255;
					out[idx + 1] = 255;
					out[idx + 2] = 255;
					out[idx + 3] = Math.round((bodyA / 255) * 101);
				}
			}
		}
		return out;
	}

	for (let y = 0; y < 462; y++) {
		for (let x = 0; x < 500; x++) {
			const bodyA = warp.dBodyAlpha(x, y);
			if (bodyA === 0) continue;

			const mapped = mapCoord2D(x, y, warp);
			if (!mapped) continue;

			let a = sampleBilinear(srcPixels, mapped[0], mapped[1]);
			if (a > 0) {
				if (bodyA < 255 && layerName !== "EdgeLine") {
					a = Math.min(a, bodyA);
				}
				const idx = (y * 500 + x) * 4;
				out[idx] = 255;
				out[idx + 1] = 255;
				out[idx + 2] = 255;
				out[idx + 3] = a;
			}
		}
	}

	if (layerName === "EdgeLine") {
		const { dComp, dBodyAlpha } = warp;
		for (let y = 240; y <= 351; y++) {
			for (let x = 165; x <= 335; x++) {
				const idx = (y * 500 + x) * 4;
				let nearSilhouetteEdge = false;
				for (let dy = -1; dy <= 1 && !nearSilhouetteEdge; dy++) {
					for (let dx = -3; dx <= 3 && !nearSilhouetteEdge; dx++) {
						if (dBodyAlpha(x + dx, y + dy) < 240) nearSilhouetteEdge = true;
					}
				}
				let nearEchoCrease = false;
				let minEchoR = 255;
				for (let dy = -2; dy <= 2; dy++) {
					for (let dx = -2; dx <= 2; dx++) {
						const ny = y + dy, nx = x + dx;
						if (ny >= 0 && ny < 462 && nx >= 0 && nx < 500) {
							const ni = (ny * 500 + nx) * 4;
							if (dComp[ni + 3] > 240 && dComp[ni] < 229) {
								nearEchoCrease = true;
							}
							if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && dComp[ni + 3] > 240) {
								if (dComp[ni] < minEchoR) minEchoR = dComp[ni];
							}
						}
					}
				}
				if (!nearSilhouetteEdge && !nearEchoCrease) {
					out[idx + 3] = 0;
				} else if (!nearSilhouetteEdge && dComp[idx + 3] > 240 && dComp[idx] < 231) {
					const creaseA = Math.min(205, Math.round((238 - dComp[idx]) * 3.1));
					out[idx] = 255;
					out[idx + 1] = 255;
					out[idx + 2] = 255;
					out[idx + 3] = Math.max(Math.min(out[idx + 3], creaseA), creaseA);
				} else if (!nearSilhouetteEdge && nearEchoCrease && dComp[idx] >= 231) {
					const featherA = Math.max(0, Math.min(90, Math.round((235 - minEchoR) * 1.4)));
					out[idx + 3] = Math.min(out[idx + 3], featherA);
				}
			}
		}
	}

	if (layerName === "EdgeShade") {
		for (let y = 240; y <= 310; y++) {
			const r = warp.rows[y];
			if (!r || !r.dt) continue;
			const fade = y <= 294 ? 1 : 1 - (y - 294) / 16;
			const connectedL = r.dLeftArm && r.dt[0] - r.dLeftArm[1] <= 2.5 && warp.pose !== "Yoked/";
			const connectedR = r.dRightArm && r.dRightArm[0] - r.dt[1] <= 2.5 && warp.pose !== "Yoked/";
			const xStartL = connectedL ? 187 : Math.ceil(r.dt[0]) + 3;
			const xStartR = connectedR ? 313 : Math.floor(r.dt[1]) - 3;
			let clampL = out[(y * 500 + (xStartL - 1)) * 4 + 3];
			for (let x = xStartL; x <= 230; x++) {
				const curI = (y * 500 + x) * 4 + 3;
				if (out[curI] < clampL) clampL = out[curI];
				else out[curI] = Math.round(clampL * fade + out[curI] * (1 - fade));
			}
			let clampR = out[(y * 500 + (xStartR + 1)) * 4 + 3];
			for (let x = xStartR; x >= 270; x--) {
				const curI = (y * 500 + x) * 4 + 3;
				if (out[curI] < clampR) clampR = out[curI];
				else out[curI] = Math.round(clampR * fade + out[curI] * (1 - fade));
			}
		}
	}

	return out;
}

function generatePoseFlatLayers(pose, targetSize, rawLayers) {
	const warp = buildPoseWarp(pose, targetSize);
	const outLayers = {};

	for (const [name, srcPx] of Object.entries(rawLayers)) {
		let px = warpLayer2D(srcPx, warp, name);

		if (name === "BodyHue") {
			for (let y = 255; y <= 458; y++) {
				for (let x = 200; x <= 300; x++) {
					if (getAlpha(warp.dBU, x, y) > 180) {
						const hEnv = Math.sin(((x - 200) / 100) * Math.PI);
						const vEnv = Math.sin(((y - 255) / (458 - 255)) * Math.PI);
						const addA = Math.round(20 * hEnv * Math.pow(vEnv, 0.4));
						const i = (y * 500 + x) * 4;
						px[i] = 255; px[i + 1] = 255; px[i + 2] = 255;
						px[i + 3] = Math.min(45, Math.max(px[i + 3], addA));
					}
				}
			}
		} else if (name === "A2") {
			for (let y = 310; y <= 364; y++) {
				const vBlendOrig = y <= 344 ? 0 : (y - 344) / (364 - 344);
				for (let x = 194; x <= 306; x++) {
					const idx = (y * 500 + x) * 4;
					const origA = px[idx + 3];
					const hInterior = Math.pow(Math.sin(((x - 194) / 112) * Math.PI), 0.75);
					const replaceW = (1 - vBlendOrig) * hInterior;
					const distFromCenter = Math.abs(x - 250);
					const pecY = 332 + Math.min(1, Math.max(0, (distFromCenter - 4) / 36)) * 8;
					let pecShadow = 0;
					if (distFromCenter > 3 && distFromCenter < 50 && y >= pecY - 4 && y <= pecY + 22) {
						const dy = (y - pecY) / 18;
						const vFalloff = dy >= 0 ? Math.max(0, 1 - dy) : Math.max(0, 1 + dy * 2.5);
						const hFalloff = Math.sin(((distFromCenter - 3) / 47) * Math.PI);
						pecShadow = Math.round(42 * vFalloff * hFalloff);
					}
					px[idx] = 255; px[idx + 1] = 255; px[idx + 2] = 255;
					px[idx + 3] = Math.round(pecShadow * replaceW + origA * (1 - replaceW));
				}
			}
		} else if (name === "C3" || name === "C5" || name === "C7") {
			px = Buffer.alloc(px.length);
			if (name === "C5") {
				for (let y = 265; y <= 332; y++) {
					const vEnv = Math.sin(((y - 265) / (332 - 265)) * Math.PI);
					for (let x = 246; x <= 254; x++) {
						const hEnv = Math.cos(((x - 250) / 4.5) * (Math.PI / 2));
						if (hEnv > 0) {
							const idx = (y * 500 + x) * 4;
							px[idx] = 255; px[idx + 1] = 255; px[idx + 2] = 255;
							px[idx + 3] = Math.round(26 * vEnv * hEnv * hEnv);
						}
					}
				}
			}
		} else if (name === "C4" || name === "C6") {
			px = Buffer.alloc(px.length);
			const peakAlpha = name === "C4" ? 38 : 24;
			const spreadY = name === "C4" ? 5.5 : 10.0;
			for (let y = 275; y <= 348; y++) {
				for (let x = 196; x <= 304; x++) {
					if (getAlpha(warp.dBU, x, y) < 200) continue;
					const dist = Math.abs(x - 250);
					if (dist < 4 || dist > 48) continue;
					let curveY = dist <= 36 ? 329 + ((dist - 4) / 32) * 9 : 338 - Math.pow((dist - 36) / 12, 2) * 24;
					const dy = y - curveY;
					const sigma = dy < 0 ? spreadY * 1.3 : spreadY * 0.85;
					const vVal = Math.exp(-(dy * dy) / (2 * sigma * sigma));
					const hEnv = Math.sin(((dist - 4) / 44) * Math.PI);
					const a = Math.round(peakAlpha * vVal * Math.pow(hEnv, 1.1));
					if (a > 0) {
						const i = (y * 500 + x) * 4;
						px[i] = 255; px[i + 1] = 255; px[i + 2] = 255;
						px[i + 3] = a;
					}
				}
			}
		} else if (name === "D1" || name === "D2") {
			for (let y = 242; y <= 354; y++) {
				const vEnv = Math.min(1, Math.sin(((y - 242) / (354 - 242)) * Math.PI) * 2.2);
				for (let x = 188; x <= 312; x++) {
					const hEnv = Math.min(1, Math.sin(((x - 188) / (312 - 188)) * Math.PI) * 3.0);
					const erase = vEnv * hEnv;
					const i = (y * 500 + x) * 4;
					px[i + 3] = Math.round(px[i + 3] * Math.max(0, 1 - erase));
				}
			}
		} else if (name === "D3" || name === "D4" || name === "D5") {
			px = Buffer.alloc(px.length);
			if (name === "D4") {
				for (let y = 325; y <= 340; y++) {
					for (let x = 200; x <= 300; x++) {
						const dist = Math.abs(x - 250);
						if (dist < 6 || dist > 44) continue;
						const pecY = 329 + ((dist - 6) / 38) * 8;
						const dy = Math.abs(y - pecY);
						if (dy < 3.0) {
							const i = (y * 500 + x) * 4;
							const a = Math.round(13 * (1 - dy / 3.0) * Math.sin(((dist - 6) / 38) * Math.PI));
							px[i] = 255; px[i + 1] = 255; px[i + 2] = 255;
							px[i + 3] = a;
						}
					}
				}
			}
		} else if (name === "D6") {
			for (let y = 260; y <= 346; y++) {
				const vErase = y <= 332 ? 1 : 1 - (y - 332) / 14;
				for (let x = 192; x <= 308; x++) {
					const hErase = Math.pow(Math.sin(((x - 192) / 116) * Math.PI), 0.7);
					const i = (y * 500 + x) * 4;
					px[i + 3] = Math.round(px[i + 3] * (1 - vErase * hErase));
				}
			}
		}

		outLayers[name] = px;
	}
	return { outLayers, warp };
}

module.exports = {
	parsePng,
	encodePng,
	buildPoseWarp,
	generatePoseFlatLayers,
	loadPart,
	REF_DIR,
	OUT_ASSETS_DIR,
	MOD_DIR,
};
