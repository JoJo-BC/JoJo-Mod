#!/usr/bin/env node
/**
 * JoJo-Mod CLI Tool: Auto-Adapt Items for Flat-Chest (FlatSmall & FlatMedium)
 *
 * Usage:
 *   node tools/adapt-item.js Suit/GlossyBodystocking
 *   node tools/adapt-item.js ItemArms/PantyhoseBody
 *
 * Automatically downloads vanilla reference sprites (if missing), computes the 2D warp,
 * eliminates female breast curves, matches male pectoral contour, produces all 6 poses,
 * writes them to JoJo-Mod/assets/, and syncs the manifest in jojo-mod.user.js!
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const {
	parsePng,
	encodePng,
	generatePoseFlatLayers,
	REF_DIR,
	OUT_ASSETS_DIR,
	MOD_DIR,
} = require("./warp-engine");

const POSES = ["", "Yoked/", "OverTheHead/", "BackBoxTie/", "BackCuffs/", "BackElbowTouch/"];
const BASE_BC_URL = "https://www.bondage-asia.com/club/R133/Assets/Female3DCG/";

function downloadFile(url, dest) {
	return new Promise((resolve, reject) => {
		fs.mkdirSync(path.dirname(dest), { recursive: true });
		https
			.get(url, (res) => {
				if (res.statusCode !== 200) {
					res.resume();
					return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
				}
				const file = fs.createWriteStream(dest);
				res.pipe(file);
				file.on("finish", () => file.close(() => resolve(dest)));
			})
			.on("error", reject);
	});
}

function syncManifest() {
	const publishScript = path.join(MOD_DIR, "publish.js");
	if (fs.existsSync(publishScript)) {
		const { execSync } = require("child_process");
		execSync(`node "${publishScript}" sync-manifest`, { stdio: "inherit" });
	}
}

async function adaptItem(itemSpec) {
	if (!itemSpec) {
		console.log("Usage: node tools/adapt-item.js <Group>/<ItemName>");
		console.log("Example: node tools/adapt-item.js Suit/GlossyBodystocking");
		process.exit(1);
	}

	const parts = itemSpec.replace(/\\/g, "/").split("/");
	const group = parts[0];
	const itemName = parts[1];

	console.log(`\n======================================================`);
	console.log(` JoJo-Mod Auto-Warp: Adapting ${group}/${itemName}`);
	console.log(`======================================================\n`);

	const refGroupDir = path.join(REF_DIR, group);
	fs.mkdirSync(refGroupDir, { recursive: true });

	// Find available layers from reference_samples or discover standard layer list
	const standardLayers = [
		"BodyHue", "BaseColor", "A2", "A3", "A4", "EdgeLine", "EdgeShade",
		"C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12",
		"D1", "D2", "D3", "D4", "D5", "D6", "D7",
	];

	// Check which layers exist for standing
	let availableLayers = [];
	for (const l of standardLayers) {
		const file = path.join(refGroupDir, `${itemName}_Small_${l}.png`);
		if (fs.existsSync(file)) {
			availableLayers.push(l);
		}
	}

	// If no layered files exist, check if a single file exists (e.g. PantyhoseBody_Small.png)
	let isSingleSprite = false;
	if (availableLayers.length === 0) {
		const singleFile = path.join(refGroupDir, `${itemName}_Small.png`);
		if (fs.existsSync(singleFile)) {
			isSingleSprite = true;
			availableLayers = ["SingleSprite"];
		}
	}

	if (availableLayers.length === 0) {
		console.log(`Searching online for ${group}/${itemName}_Small...`);
		// Attempt to download single sprite first
		try {
			await downloadFile(
				`${BASE_BC_URL}${group}/${itemName}_Small.png`,
				path.join(refGroupDir, `${itemName}_Small.png`)
			);
			isSingleSprite = true;
			availableLayers = ["SingleSprite"];
			console.log(`Downloaded ${itemName}_Small.png`);
		} catch (_) {
			// Try multi-layer download
			for (const l of standardLayers) {
				try {
					await downloadFile(
						`${BASE_BC_URL}${group}/${itemName}_Small_${l}.png`,
						path.join(refGroupDir, `${itemName}_Small_${l}.png`)
					);
					availableLayers.push(l);
				} catch (__) {}
			}
		}
	}

	if (availableLayers.length === 0) {
		console.error(`❌ Could not find or download any reference sprites for ${group}/${itemName}!`);
		process.exit(1);
	}

	console.log(`Detected layers for ${itemName}: ${isSingleSprite ? "[Single Sprite RGBA]" : availableLayers.join(", ")}`);

	let totalCreated = 0;
	const outGroupDir = path.join(OUT_ASSETS_DIR, group);

	for (const pose of POSES) {
		const poseLabel = pose.replace("/", "") || "Standing";
		console.log(`\n⚙️  Processing pose: ${poseLabel}...`);
		const poseOutDir = path.join(outGroupDir, pose);
		fs.mkdirSync(poseOutDir, { recursive: true });

		const rawLayers = {};
		for (const l of availableLayers) {
			const suffix = isSingleSprite ? "" : `_${l}`;
			let srcPath = path.join(refGroupDir, pose, `${itemName}_Small${suffix}.png`);
			if (!fs.existsSync(srcPath)) {
				try {
					await downloadFile(`${BASE_BC_URL}${group}/${pose}${itemName}_Small${suffix}.png`, srcPath);
				} catch (_) {
					srcPath = path.join(refGroupDir, `${itemName}_Small${suffix}.png`);
				}
			}
			if (fs.existsSync(srcPath)) {
				rawLayers[l] = parsePng(fs.readFileSync(srcPath)).pixels;
			}
		}

		// 1. Generate FlatSmall
		const { outLayers: fsLayers } = generatePoseFlatLayers(pose, "FlatSmall", rawLayers);
		for (const [layerKey, px] of Object.entries(fsLayers)) {
			const suffix = isSingleSprite ? "" : `_${layerKey}`;
			const outPath = path.join(poseOutDir, `${itemName}_FlatSmall${suffix}.png`);
			const height = px.length / (500 * 4);
			fs.writeFileSync(outPath, encodePng(500, height, px));
			totalCreated++;
		}
		console.log(`   -> Generated FlatSmall (${Object.keys(fsLayers).length} layers)`);

		// 2. Generate FlatMedium (all layers!)
		const { outLayers: fmLayers } = generatePoseFlatLayers(pose, "FlatMedium", rawLayers);
		for (const [layerKey, px] of Object.entries(fmLayers)) {
			const suffix = isSingleSprite ? "" : `_${layerKey}`;
			const outPath = path.join(poseOutDir, `${itemName}_FlatMedium${suffix}.png`);
			const height = px.length / (500 * 4);
			fs.writeFileSync(outPath, encodePng(500, height, px));
			totalCreated++;
		}
		console.log(`   -> Generated FlatMedium (${Object.keys(fmLayers).length} layers)`);
	}

	console.log(`\n✅ Generated ${totalCreated} PNG files in assets/Assets/Female3DCG/${group}/!`);
	console.log(`🔄 Updating jojo-mod.user.js manifest...`);
	syncManifest();
	console.log(`\n🎉 Adaptation complete! You can now publish with: node publish.js push`);
}

const itemArg = process.argv[2] || "Suit/GlossyBodystocking";
adaptItem(itemArg).catch((e) => {
	console.error(e);
	process.exit(1);
});
