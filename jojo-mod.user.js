// ==UserScript==
// @name         JoJo Flat-Chest & Male Avatar Compatibility Mod (BC R133+)
// @namespace    https://jojo-bc.github.io/JoJo-Mod/
// @version      1.0.0
// @description  Unlocks and maps flat-chest (FlatSmall / FlatMedium) clothes and restraints in Bondage Club (Glossy Bodystocking, Pantyhose fullBody, etc.), loading custom PNGs from JoJo-Mod repository with automatic fallback to Vanilla _Small sprites.
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
	const REPO_BASE_URL = "https://jojo-bc.github.io/JoJo-Mod/";

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
	 * When a path is NOT listed here, JoJo-Mod automatically falls back to the Vanilla "_Small" sprite!
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
	 *   3. If asset is in FALLBACK_ASSET_NAMES -> rewrites _FlatSmall / _FlatMedium to Vanilla _Small
	 * @param {string} src
	 * @returns {string}
	 */
	function remapImageUrl(src) {
		if (typeof src !== "string" || !src) return src;
		if (!src.includes("_FlatSmall") && !src.includes("_FlatMedium")) return src;

		// Normalize any leading "./"
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

		// 3. Check if this URL belongs to one of our unlocked assets for Vanilla _Small fallback
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

	/**
	 * Installs non-destructive hooks on BC's R133 drawing & fetch pipeline.
	 */
	let hooksInstalled = false;
	function installDrawHooks() {
		if (hooksInstalled) return true;
		if (
			typeof CommonDrawAppearanceBuild !== "function" ||
			typeof DrawGetImage !== "function"
		) {
			return false;
		}

		// 1. Hook CommonFetch so cross-origin PNGs from jojo-bc.github.io load cleanly in R133 ImageCache
		if (typeof CommonFetch === "function" && !CommonFetch.__jojoModHooked) {
			const origCommonFetch = CommonFetch;
			window.CommonFetch = function (url, ...rest) {
				if (typeof url === "string" && url.startsWith(REPO_BASE_URL)) {
					return fetch(url, { mode: "cors", credentials: "omit" });
				}
				return origCommonFetch.call(this, url, ...rest);
			};
			window.CommonFetch.__jojoModHooked = true;
		}

		// 2. Hook CommonDrawAppearanceBuild to remap layer URLs & TextureAlphaMask URLs before WebGL/2D/CacheWarmer
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
									TextureAlphaMask: opts.TextureAlphaMask.map((m) =>
										m && typeof m.Url === "string"
											? { ...m, Url: remapImageUrl(m.Url) }
											: m
									),
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

		// 3. Hook direct image loaders (DrawGetImage, GLDrawImage, DrawImageEx) as safety net
		for (const fnName of ["DrawGetImage", "GLDrawImage", "DrawImageEx"]) {
			if (typeof window[fnName] === "function" && !window[fnName].__jojoModHooked) {
				const origFn = window[fnName];
				window[fnName] = function (src, ...rest) {
					return origFn.call(this, remapImageUrl(src), ...rest);
				};
				window[fnName].__jojoModHooked = true;
			}
		}

		// 4. Hook CommonDrawMarkDrawnAsset so R133's 30-min cache warmer keeps the mapped URL alive
		if (
			typeof CommonDrawMarkDrawnAsset === "function" &&
			!CommonDrawMarkDrawnAsset.__jojoModHooked
		) {
			const origMark = CommonDrawMarkDrawnAsset;
			window.CommonDrawMarkDrawnAsset = function (C, src) {
				return origMark.call(this, C, remapImageUrl(src));
			};
			window.CommonDrawMarkDrawnAsset.__jojoModHooked = true;
		}

		hooksInstalled = true;
		console.log(TAG, "R133 drawing & image-mapping hooks installed.");
		return true;
	}

	/**
	 * Forces a canvas rebuild on all currently visible characters (useful when loaded mid-session).
	 */
	function refreshAllCharacters() {
		try {
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

	// Bootstrap loop: waits until BC's Asset array and drawing functions are ready
	function tryInit() {
		const drawOk = installDrawHooks();
		const assetsOk = unlockFlatAssets();
		if (drawOk && assetsOk) {
			refreshAllCharacters();
			// Re-run unlockFlatAssets once more after 5s in case Echo loads custom assets slightly later
			setTimeout(() => {
				unlockFlatAssets();
				refreshAllCharacters();
			}, 5000);
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
