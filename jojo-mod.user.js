// ==UserScript==
// @name         JoJo Flat-Chest & Male Avatar Compatibility Mod (BC R133+)
// @namespace    https://jojo-bc.github.io/JoJo-Mod/
// @version      1.1.0
// @description  Unlocks and maps flat-chest (FlatSmall / FlatMedium) clothes and restraints in Bondage Club (Glossy Bodystocking Vanilla & Echo, Pantyhose fullBody, etc.), loading custom PNGs from JoJo-Mod repository with automatic fallback to _Small sprites.
// @author       JoJo-BC
// @match        https://*.bondageprojects.elementfx.com/R*/*
// @match        https://*.bondage-europe.com/R*/*
// @match        https://*.bondageeurope.com/R*/*
// @match        https://*.bondageprojects.com/R*/*
// @match        https://*.bondage-asia.com/club/R*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
	"use strict";

	if (window.__JoJoFlatModLoaded) {
		console.log("[JoJo-Mod] Already active, refreshing characters.");
		if (typeof window.__JoJoFlatModRefreshAll === "function") {
			window.__JoJoFlatModRefreshAll();
		}
		return;
	}
	window.__JoJoFlatModLoaded = true;

	const TAG = "[JoJo-Mod]";
	const VERSION = "1.1.0";
	const REPO_BASE_URL = "https://jojo-bc.github.io/JoJo-Mod/";

	console.log(`${TAG} v${VERSION} initializing...`);

	/**
	 * Assets unlocked for FlatSmall / FlatMedium avatars.
	 * Format: { group: "<GroupName>", name: "<AssetName>", fallbackToSmall: true }
	 */
	const UNLOCKED_FLAT_ASSETS = [
		// Clothing: Glossy Bodystocking (Vanilla R133 + Echo versions)
		{ group: "Suit", name: "GlossyBodystocking", fallbackToSmall: true },
		{ group: "Suit", name: "马油袜", fallbackToSmall: true },
		{ group: "SuitLower", name: "马油袜下", fallbackToSmall: true },

		// Restraints: Bodyhose (Pantyhose fullBody & Crotchless Pantyhose fullBody)
		{ group: "ItemArms", name: "PantyhoseBody", fallbackToSmall: true },
		{ group: "ItemArms", name: "PantyhoseBodyOpen", fallbackToSmall: true },
	];

	/**
	 * Manifest of custom PNG files hosted in https://jojo-bc.github.io/JoJo-Mod/assets/
	 * Paths are relative to BC root (e.g. "Assets/Female3DCG/ItemArms/PantyhoseBody_FlatSmall.png").
	 * When a path is listed here, JoJo-Mod loads it from the GitHub Pages repository.
	 * When a path is NOT listed here, JoJo-Mod automatically falls back to the "_Small" sprite!
	 */
	const CUSTOM_PNG_MANIFEST = new Set([
		// No custom PNGs in assets/ yet (using automatic Vanilla _Small fallback)
	]);

	// Fast lookup set of asset names that allow automatic _FlatSmall / _FlatMedium -> _Small fallback
	const FALLBACK_ASSET_NAMES = new Set(
		UNLOCKED_FLAT_ASSETS.filter((a) => a.fallbackToSmall).map((a) => a.name)
	);

	/**
	 * Remaps an image URL if it targets _FlatSmall or _FlatMedium for a supported asset.
	 * Priority:
	 *   1. Exact match in CUSTOM_PNG_MANIFEST -> loads from REPO_BASE_URL + "assets/" + normalizedPath
	 *   2. If _FlatMedium isn't in manifest but _FlatSmall IS in manifest -> loads _FlatSmall from repo
	 *   3. If asset is in FALLBACK_ASSET_NAMES -> rewrites _FlatSmall / _FlatMedium to _Small
	 * @param {string} src
	 * @returns {string}
	 */
	function remapImageUrl(src) {
		if (typeof src !== "string" || !src) return src;
		if (!src.includes("_FlatSmall") && !src.includes("_FlatMedium")) return src;

		const cleanSrc = src.startsWith("./") ? src.slice(2) : src;

		// 1. Direct match in custom repository manifest
		if (CUSTOM_PNG_MANIFEST.has(cleanSrc)) {
			return REPO_BASE_URL + "assets/" + cleanSrc;
		}

		// 2. If avatar is FlatMedium and we have a custom _FlatSmall PNG in manifest, use it for both
		if (cleanSrc.includes("_FlatMedium")) {
			const asFlatSmall = cleanSrc.replace("_FlatMedium", "_FlatSmall");
			if (CUSTOM_PNG_MANIFEST.has(asFlatSmall)) {
				return REPO_BASE_URL + "assets/" + asFlatSmall;
			}
		}

		// 3. Check if this URL belongs to one of our unlocked assets for _Small fallback
		const fileName = cleanSrc.slice(cleanSrc.lastIndexOf("/") + 1);
		for (const assetName of FALLBACK_ASSET_NAMES) {
			if (
				fileName.startsWith(assetName + "_FlatSmall") ||
				fileName.startsWith(assetName + "_FlatMedium")
			) {
				return src
					.replace("_FlatSmall", "_Small")
					.replace("_FlatMedium", "_Small");
			}
		}

		return src;
	}

	/**
	 * Remaps an array of TextureAlphaMask objects (important for Echo's gmask & Vanilla's bmask).
	 */
	function remapMaskArray(masks) {
		if (!Array.isArray(masks)) return masks;
		return masks.map((m) =>
			m && typeof m.Url === "string" ? { ...m, Url: remapImageUrl(m.Url) } : m
		);
	}

	/**
	 * Removes "HasBreasts" prerequisite and "F" gender restriction from configured assets.
	 */
	function unlockFlatAssets() {
		if (typeof AssetGet !== "function" || typeof Asset === "undefined" || !Asset.length) {
			return false;
		}

		let unlockedCount = 0;
		for (const item of UNLOCKED_FLAT_ASSETS) {
			const asset = AssetGet("Female3DCG", item.group, item.name);
			if (!asset) continue;

			if (Array.isArray(asset.Prerequisite)) {
				asset.Prerequisite = asset.Prerequisite.filter((p) => p !== "HasBreasts");
			}
			if (asset.Gender === "F") {
				asset.Gender = undefined;
			}
			if (Array.isArray(asset.Layer)) {
				for (const layer of asset.Layer) {
					if (Array.isArray(layer.Prerequisite)) {
						layer.Prerequisite = layer.Prerequisite.filter((p) => p !== "HasBreasts");
					}
				}
			}
			unlockedCount++;
		}

		if (unlockedCount > 0) {
			console.log(TAG, `Unlocked ${unlockedCount} asset(s) for FlatSmall / FlatMedium avatars.`);
		}
		return unlockedCount > 0;
	}

	let rawHooksInstalled = false;
	let sdkHooksInstalled = false;

	/**
	 * Installs hooks via bcModSdk at Priority 20 (higher than Echo's Priority 10/0),
	 * so _FlatMedium / _FlatSmall is converted to _Small BEFORE Echo's @sugarch/bc-image-mapping
	 * looks up the path in its CDN manifest (and before Echo resolves gmask!).
	 */
	function installSdkHooks() {
		if (sdkHooksInstalled) return true;
		if (!window.bcModSdk || typeof window.bcModSdk.registerMod !== "function") {
			return false;
		}
		try {
			const mod = window.bcModSdk.registerMod(
				{
					name: "JoJoFlatMod",
					fullName: "JoJo Flat-Chest & Male Avatar Compatibility Mod",
					version: VERSION,
					repository: REPO_BASE_URL,
				},
				{ allowReplace: true }
			);

			// Priority 20 runs BEFORE Echo's Priority 10 hooks!
			for (const fnName of ["DrawImageEx", "DrawImageResize", "GLDrawImage", "DrawGetImage"]) {
				if (typeof window[fnName] === "function") {
					mod.hookFunction(fnName, 20, (args, next) => {
						args[0] = remapImageUrl(args[0]);
						if (fnName === "GLDrawImage" && args[4] && Array.isArray(args[4].TextureAlphaMask)) {
							args[4] = {
								...args[4],
								TextureAlphaMask: remapMaskArray(args[4].TextureAlphaMask),
							};
						}
						if (fnName === "DrawImageEx" && args[4] && Array.isArray(args[4].TextureAlphaMask)) {
							args[4] = {
								...args[4],
								TextureAlphaMask: remapMaskArray(args[4].TextureAlphaMask),
							};
						}
						return next(args);
					});
				}
			}

			if (typeof window.CommonDrawMarkDrawnAsset === "function") {
				mod.hookFunction("CommonDrawMarkDrawnAsset", 20, (args, next) => {
					args[1] = remapImageUrl(args[1]);
					return next(args);
				});
			}

			if (typeof window.GLDrawLoadTextureAlphaMask === "function") {
				mod.hookFunction("GLDrawLoadTextureAlphaMask", 20, (args, next) => {
					args[5] = remapMaskArray(args[5]);
					return next(args);
				});
			}

			if (typeof window.CommonFetch === "function") {
				mod.hookFunction("CommonFetch", 20, (args, next) => {
					const url = args[0];
					if (typeof url === "string" && url.startsWith(REPO_BASE_URL)) {
						return fetch(url, { mode: "cors", credentials: "omit" });
					}
					return next(args);
				});
			}

			sdkHooksInstalled = true;
			console.log(TAG, "Registered high-priority (20) ModSDK hooks (Echo compatible).");
			return true;
		} catch (e) {
			console.warn(TAG, "ModSDK registration error (using fallback hooks):", e);
			return false;
		}
	}

	/**
	 * Installs hook on CommonDrawAppearanceBuild (works even without ModSDK).
	 */
	function installRawHooks() {
		if (rawHooksInstalled) return true;
		if (typeof CommonDrawAppearanceBuild !== "function") return false;

		if (!CommonDrawAppearanceBuild.__jojoModHooked) {
			const origBuild = CommonDrawAppearanceBuild;
			window.CommonDrawAppearanceBuild = function (C, callbacks) {
				if (callbacks && typeof callbacks === "object") {
					const wrapDrawCb = (fn) => {
						if (typeof fn !== "function") return fn;
						return function (src, x, y, opts, ...more) {
							const mappedSrc = remapImageUrl(src);
							if (opts && Array.isArray(opts.TextureAlphaMask)) {
								opts = {
									...opts,
									TextureAlphaMask: remapMaskArray(opts.TextureAlphaMask),
								};
							}
							return fn.call(this, mappedSrc, x, y, opts, ...more);
						};
					};
					callbacks = {
						...callbacks,
						drawImage: wrapDrawCb(callbacks.drawImage),
						drawImageBlink: wrapDrawCb(callbacks.drawImageBlink),
						drawImageColorize: wrapDrawCb(callbacks.drawImageColorize),
						drawImageColorizeBlink: wrapDrawCb(callbacks.drawImageColorizeBlink),
					};
				}
				return origBuild.call(this, C, callbacks);
			};
			window.CommonDrawAppearanceBuild.__jojoModHooked = true;
		}

		rawHooksInstalled = true;
		return true;
	}

	/**
	 * Clears any cached 404 entries for _FlatSmall / _FlatMedium in R133 ImageCache and refreshes characters.
	 */
	function refreshAllCharacters() {
		try {
			for (const cacheObj of [window.GLDrawImageCache, window.DrawImageCache]) {
				if (cacheObj && cacheObj.cache instanceof Map) {
					for (const key of [...cacheObj.cache.keys()]) {
						if (typeof key === "string" && (key.includes("_FlatSmall") || key.includes("_FlatMedium"))) {
							cacheObj.cache.delete(key);
						}
					}
				}
			}
			if (typeof CharacterRefresh === "function" && typeof Player !== "undefined" && Player) {
				CharacterRefresh(Player, false, false);
			}
			if (typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter)) {
				for (const C of ChatRoomCharacter) {
					if (typeof CharacterRefresh === "function") {
						CharacterRefresh(C, false, false);
					}
				}
			}
		} catch (e) {
			console.warn(TAG, "Error refreshing characters:", e);
		}
	}
	window.__JoJoFlatModRefreshAll = refreshAllCharacters;

	function tryInit() {
		const rawOk = installRawHooks();
		installSdkHooks();
		const assetsOk = unlockFlatAssets();
		if (rawOk && assetsOk) {
			refreshAllCharacters();
			// Re-run after 3s and 7s to catch Echo / ModSDK if they finish loading after us
			setTimeout(() => {
				installSdkHooks();
				unlockFlatAssets();
				refreshAllCharacters();
			}, 3000);
			setTimeout(() => {
				installSdkHooks();
				unlockFlatAssets();
				refreshAllCharacters();
			}, 7000);
			return true;
		}
		return false;
	}

	if (!tryInit()) {
		const timer = setInterval(() => {
			if (tryInit()) clearInterval(timer);
		}, 250);
		setTimeout(() => clearInterval(timer), 120000);
	}
})();
