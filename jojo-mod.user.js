// ==UserScript==
// @name         JoJo Flat-Chest & Male Avatar Compatibility Mod (BC R133+)
// @namespace    https://jojo-bc.github.io/JoJo-Mod/
// @version      1.3.2
// @description  Unlocks and maps flat-chest (FlatSmall / FlatMedium) clothes and restraints in Bondage Club (Glossy Bodystocking Vanilla & Echo with custom flat male pectoral PNGs, Pantyhose fullBody, etc.), 100% ModSDK & BCX compliant.
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

	// Restore CommonDrawAppearanceBuild if a previous 1.0/1.1.0 build hooked it directly in this tab
	if (
		typeof window.CommonDrawAppearanceBuild === "function" &&
		window.CommonDrawAppearanceBuild.__jojoOrigBuild
	) {
		window.CommonDrawAppearanceBuild = window.CommonDrawAppearanceBuild.__jojoOrigBuild;
	}

	if (window.__JoJoFlatModLoaded === "1.3.2") {
		console.log("[JoJo-Mod] v1.3.2 already active, refreshing characters.");
		if (typeof window.__JoJoFlatModRefreshAll === "function") {
			window.__JoJoFlatModRefreshAll();
		}
		return;
	}
	window.__JoJoFlatModLoaded = "1.3.2";

	const TAG = "[JoJo-Mod]";
	const VERSION = "1.3.2";
	const REPO_BASE_URL = "https://jojo-bc.github.io/JoJo-Mod/";

	console.log(`${TAG} v${VERSION} initializing...`);

	/**
	 * Assets unlocked for FlatSmall / FlatMedium avatars.
	 * Format: { group: "<GroupName>", name: "<AssetName>", fallbackToSmall: true, makeFreeInSession: true }
	 */
	const UNLOCKED_FLAT_ASSETS = [
		// Clothing: Glossy Bodystocking (Vanilla R133 + Echo versions)
		{ group: "Suit", name: "GlossyBodystocking", fallbackToSmall: true, makeFreeInSession: true },
		{ group: "Suit", name: "马油袜", fallbackToSmall: true, makeFreeInSession: true },
		{ group: "SuitLower", name: "马油袜下", fallbackToSmall: true, makeFreeInSession: true },

		// Clothing: Latex Top & Latex Pants
		{ group: "Cloth", name: "LatexTop", fallbackToSmall: true, makeFreeInSession: true },
		{ group: "ClothLower", name: "LatexPants1", fallbackToSmall: true, makeFreeInSession: true },

		// Restraints: Bodyhose (Pantyhose fullBody & Crotchless Pantyhose fullBody)
		{ group: "ItemArms", name: "PantyhoseBody", fallbackToSmall: true, makeFreeInSession: true },
		{ group: "ItemArms", name: "PantyhoseBodyOpen", fallbackToSmall: true, makeFreeInSession: true },
	];

	/**
	 * Manifest of custom PNG files hosted in https://jojo-bc.github.io/JoJo-Mod/assets/
	 * Paths are relative to BC root (e.g. "Assets/Female3DCG/ItemArms/PantyhoseBody_FlatSmall.png").
	 * When a path is listed here, JoJo-Mod loads it from the GitHub Pages repository.
	 * When a path is NOT listed here, JoJo-Mod automatically falls back to the "_Small" sprite!
	 */
	const CUSTOM_PNG_MANIFEST = new Set([
		"Assets/Female3DCG/Cloth/BackBoxTie/LatexTop_FlatMedium.png",
		"Assets/Female3DCG/Cloth/BackBoxTie/LatexTop_FlatSmall.png",
		"Assets/Female3DCG/Cloth/BackCuffs/LatexTop_FlatMedium.png",
		"Assets/Female3DCG/Cloth/BackCuffs/LatexTop_FlatSmall.png",
		"Assets/Female3DCG/Cloth/BackElbowTouch/LatexTop_FlatMedium.png",
		"Assets/Female3DCG/Cloth/BackElbowTouch/LatexTop_FlatSmall.png",
		"Assets/Female3DCG/Cloth/LatexTop_FlatMedium.png",
		"Assets/Female3DCG/Cloth/LatexTop_FlatSmall.png",
		"Assets/Female3DCG/Cloth/OverTheHead/LatexTop_FlatMedium.png",
		"Assets/Female3DCG/Cloth/OverTheHead/LatexTop_FlatSmall.png",
		"Assets/Female3DCG/Cloth/Yoked/LatexTop_FlatMedium.png",
		"Assets/Female3DCG/Cloth/Yoked/LatexTop_FlatSmall.png",
		"Assets/Female3DCG/ClothLower/LatexPants1_FlatMedium.png",
		"Assets/Female3DCG/ClothLower/LatexPants1_FlatSmall.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_A3.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_BaseColor.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_BodyHue.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_D1.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_D2.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_EdgeLine.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_EdgeShade.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_A2.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_A3.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_A4.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_BaseColor.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_BodyHue.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_C1.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_C10.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_C11.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_C12.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_C2.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_C3.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_C4.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_C5.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_C6.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_C7.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_C8.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_C9.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_D1.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_D2.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_D3.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_D4.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_D5.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_D6.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_D7.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_EdgeLine.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatSmall_EdgeShade.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_A3.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_BaseColor.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_BodyHue.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_D1.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_D2.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_EdgeLine.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_EdgeShade.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_A2.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_A3.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_A4.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_BaseColor.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_BodyHue.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_C1.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_C10.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_C11.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_C12.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_C2.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_C3.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_C4.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_C5.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_C6.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_C7.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_C8.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_C9.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_D1.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_D2.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_D3.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_D4.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_D5.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_D6.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_D7.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_EdgeLine.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatSmall_EdgeShade.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_A3.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_BaseColor.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_BodyHue.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_D1.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_D2.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_EdgeLine.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_EdgeShade.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_A2.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_A3.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_A4.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_BaseColor.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_BodyHue.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_C1.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_C10.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_C11.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_C12.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_C2.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_C3.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_C4.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_C5.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_C6.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_C7.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_C8.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_C9.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_D1.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_D2.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_D3.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_D4.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_D5.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_D6.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_D7.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_EdgeLine.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatSmall_EdgeShade.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_A3.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_BaseColor.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_BodyHue.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_D1.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_D2.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_EdgeLine.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_EdgeShade.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_A2.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_A3.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_A4.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_BaseColor.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_BodyHue.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_C1.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_C10.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_C11.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_C12.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_C2.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_C3.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_C4.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_C5.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_C6.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_C7.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_C8.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_C9.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_D1.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_D2.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_D3.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_D4.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_D5.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_D6.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_D7.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_EdgeLine.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_EdgeShade.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_A3.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_BaseColor.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_BodyHue.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_D1.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_D2.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_EdgeLine.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_EdgeShade.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_A2.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_A3.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_A4.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_BaseColor.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_BodyHue.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_C1.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_C10.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_C11.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_C12.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_C2.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_C3.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_C4.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_C5.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_C6.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_C7.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_C8.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_C9.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_D1.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_D2.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_D3.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_D4.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_D5.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_D6.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_D7.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_EdgeLine.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatSmall_EdgeShade.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_A3.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_BaseColor.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_BodyHue.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_D1.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_D2.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_EdgeLine.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_EdgeShade.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_A2.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_A3.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_A4.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_BaseColor.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_BodyHue.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_C1.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_C10.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_C11.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_C12.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_C2.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_C3.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_C4.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_C5.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_C6.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_C7.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_C8.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_C9.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_D1.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_D2.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_D3.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_D4.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_D5.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_D6.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_D7.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_EdgeLine.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_EdgeShade.png",
	]);

	// Fast lookup set of asset names that allow automatic _FlatSmall / _FlatMedium -> _Small fallback
	const FALLBACK_ASSET_NAMES = new Set(
		UNLOCKED_FLAT_ASSETS.filter((a) => a.fallbackToSmall).map((a) => a.name)
	);
	const UNLOCKED_FLAT_NAMES = new Set(UNLOCKED_FLAT_ASSETS.map((a) => a.name));

	// Chest-only layers that share the same torso position across upright poses (BackElbowTouch, BackBoxTie, etc.)
	const UPRIGHT_CHEST_LAYERS = new Set([
		"BodyHue", "A2", "C3", "C4", "C5", "C6", "C7", "D3", "D4", "D5", "D6"
	]);

	// Echo layer name aliases (Echo Suit/马油袜 -> Vanilla Suit/GlossyBodystocking)
	const ECHO_LAYER_ALIASES = {
		Z1: "BodyHue",
		A1: "BaseColor",
		B1: "EdgeLine",
		B2: "EdgeShade",
	};

	/**
	 * Normalizes a Suit/马油袜 or Suit/GlossyBodystocking path to canonical _FlatSmall path for manifest lookup.
	 * @param {string} cleanSrc
	 * @returns {string}
	 */
	function toCanonicalManifestPath(cleanSrc) {
		let p = cleanSrc.replace("_FlatMedium", "_FlatSmall");
		try { p = decodeURIComponent(p); } catch (_) {}
		if (p.includes("/Suit/") && p.includes("马油袜_FlatSmall_")) {
			p = p.replace("马油袜_FlatSmall_", "GlossyBodystocking_FlatSmall_");
			for (const [echoCode, vanillaName] of Object.entries(ECHO_LAYER_ALIASES)) {
				if (p.endsWith(`_${echoCode}.png`)) {
					p = p.slice(0, -(echoCode.length + 5)) + `_${vanillaName}.png`;
					break;
				}
			}
		}
		return p;
	}

	/**
	 * Remaps an image URL if it targets _FlatSmall or _FlatMedium for a supported asset.
	 * @param {string} src
	 * @returns {string}
	 */
	function remapImageUrl(src) {
		if (typeof src !== "string" || !src) return src;
		// Already remapped to our GitHub Pages repository -> do NOT remap a second time!
		if (src.startsWith(REPO_BASE_URL)) return src;

		let decoded = src;
		try { decoded = decodeURIComponent(src); } catch (_) {}
		if (!decoded.includes("_FlatSmall") && !decoded.includes("_FlatMedium")) return src;

		const assetsIdx = decoded.indexOf("Assets/Female3DCG/");
		const cleanSrc =
			assetsIdx !== -1 ? decoded.slice(assetsIdx) : decoded.startsWith("./") ? decoded.slice(2) : decoded;
		const canonical = toCanonicalManifestPath(cleanSrc);

		// 1. Direct match in custom repository manifest (covers both FlatSmall & FlatMedium, Vanilla & Echo!)
		if (CUSTOM_PNG_MANIFEST.has(canonical)) {
			return REPO_BASE_URL + "assets/" + canonical;
		}

		// 2. Upright restraint poses (BackElbowTouch, BackBoxTie, BackCuffs, OverTheHead, Yoked):
		// Use our custom flat-chest PNGs for all chest-only layers so the chest stays flat when bound!
		const poseMatch = canonical.match(
			/^Assets\/Female3DCG\/Suit\/(BackElbowTouch|BackBoxTie|BackCuffs|OverTheHead|Yoked)\/GlossyBodystocking_FlatSmall_([A-Za-z0-9]+)\.png$/
		);
		if (poseMatch && UPRIGHT_CHEST_LAYERS.has(poseMatch[2])) {
			const standingChestPath = `Assets/Female3DCG/Suit/GlossyBodystocking_FlatSmall_${poseMatch[2]}.png`;
			if (CUSTOM_PNG_MANIFEST.has(standingChestPath)) {
				return REPO_BASE_URL + "assets/" + standingChestPath;
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
			if (item.makeFreeInSession) {
				if (typeof asset.Value === "number" && asset.Value > 0) {
					asset.Value = 0;
				}
				if (typeof asset.SelfBondage === "number" && asset.SelfBondage > 0) {
					asset.SelfBondage = 0;
				}
				asset.BuyGroup = null;
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

		// Auto-grant ownership into Player.Inventory so Wardrobe / Appearance never removes them
		if (typeof Player !== "undefined" && Array.isArray(Player.Inventory)) {
			for (const item of UNLOCKED_FLAT_ASSETS) {
				if (!Player.Inventory.some((i) => i.Group === item.group && i.Name === item.name)) {
					Player.Inventory.push({ Group: item.group, Name: item.name });
				}
			}
		}

		if (unlockedCount > 0) {
			console.log(TAG, `Unlocked ${unlockedCount} asset(s) for FlatSmall / FlatMedium avatars.`);
		}
		return unlockedCount > 0;
	}

	let sdkHooksInstalled = false;

	/**
	 * Loads official bcModSdk if no other mod has loaded it yet.
	 */
	function ensureModSdkLoaded() {
		if (window.bcModSdk && typeof window.bcModSdk.registerMod === "function") {
			return Promise.resolve(window.bcModSdk);
		}
		return new Promise((resolve) => {
			const s = document.createElement("script");
			s.src = "https://jomshir98.github.io/bondage-club-mod-sdk/dist/bcmodsdk.js";
			s.onload = () => resolve(window.bcModSdk);
			s.onerror = () => resolve(null);
			document.head.appendChild(s);
		});
	}

	/**
	 * Installs all hooks strictly via bcModSdk (100% BCX Compatibility Checker compliant, zero raw overwrites).
	 * Uses Priority 20 (higher than Echo's Priority 10/0) so _FlatMedium / _FlatSmall is converted
	 * to _Small BEFORE Echo's @sugarch/bc-image-mapping looks up the path in its CDN manifest.
	 */
	function installSdkHooks() {
		if (sdkHooksInstalled) return true;
		if (!window.bcModSdk || typeof window.bcModSdk.registerMod !== "function") {
			return false;
		}
		if (typeof CommonDrawAppearanceBuild !== "function" || typeof DrawGetImage !== "function") {
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

			// 1. Hook CommonDrawAppearanceBuild via ModSDK
			mod.hookFunction("CommonDrawAppearanceBuild", 20, (args, next) => {
				const callbacks = args[1];
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
					args[1] = {
						...callbacks,
						drawImage: wrapDrawCb(callbacks.drawImage),
						drawImageBlink: wrapDrawCb(callbacks.drawImageBlink),
						drawImageColorize: wrapDrawCb(callbacks.drawImageColorize),
						drawImageColorizeBlink: wrapDrawCb(callbacks.drawImageColorizeBlink),
					};
				}
				return next(args);
			});

			// 2. Priority 20 runs BEFORE Echo's Priority 10 hooks!
			for (const fnName of ["DrawImageEx", "DrawImageResize", "GLDrawImage", "DrawGetImage"]) {
				if (typeof window[fnName] === "function") {
					mod.hookFunction(fnName, 20, (args, next) => {
						args[0] = remapImageUrl(args[0]);
						if (
							(fnName === "GLDrawImage" || fnName === "DrawImageEx") &&
							args[4] &&
							Array.isArray(args[4].TextureAlphaMask)
						) {
							args[4] = {
								...args[4],
								TextureAlphaMask: remapMaskArray(args[4].TextureAlphaMask),
							};
						}
						return next(args);
					});
				}
			}

			// 3. Keep R133's 30-min cache warmer in sync
			if (typeof window.CommonDrawMarkDrawnAsset === "function") {
				mod.hookFunction("CommonDrawMarkDrawnAsset", 20, (args, next) => {
					args[1] = remapImageUrl(args[1]);
					return next(args);
				});
			}

			// 4. Remap TextureAlphaMask URLs (Echo's gmask & Vanilla's bmask)
			if (typeof window.GLDrawLoadTextureAlphaMask === "function") {
				mod.hookFunction("GLDrawLoadTextureAlphaMask", 20, (args, next) => {
					args[5] = remapMaskArray(args[5]);
					return next(args);
				});
			}

			// 5. Allow cross-origin fetch for custom PNGs hosted on jojo-bc.github.io
			if (typeof window.CommonFetch === "function") {
				mod.hookFunction("CommonFetch", 20, (args, next) => {
					const reqOrUrl = args[0];
					const url =
						typeof reqOrUrl === "string"
							? reqOrUrl
							: reqOrUrl && typeof reqOrUrl.url === "string"
							? reqOrUrl.url
							: "";
					if (url.startsWith(REPO_BASE_URL)) {
						return fetch(url, { mode: "cors", credentials: "omit" });
					}
					return next(args);
				});
			}

			// 6. Ensure unlocked flat items are always available & selectable in Wardrobe
			if (typeof window.InventoryAllow === "function") {
				mod.hookFunction("InventoryAllow", 20, (args, next) => {
					const [C, asset] = args;
					if (asset && UNLOCKED_FLAT_NAMES.has(asset.Name)) {
						return true;
					}
					return next(args);
				});
			}

			if (typeof window.InventoryAvailable === "function") {
				mod.hookFunction("InventoryAvailable", 20, (args, next) => {
					const [C, Name] = args;
					if (UNLOCKED_FLAT_NAMES.has(Name)) {
						return true;
					}
					return next(args);
				});
			}

			if (typeof window.CharacterAppearanceGenderAllowed === "function") {
				mod.hookFunction("CharacterAppearanceGenderAllowed", 20, (args, next) => {
					const [asset] = args;
					if (asset && UNLOCKED_FLAT_NAMES.has(asset.Name)) {
						return true;
					}
					return next(args);
				});
			}

			sdkHooksInstalled = true;
			console.log(TAG, "Registered 100% ModSDK-compliant hooks (Priority 20, BCX & Echo compatible).");
			return true;
		} catch (e) {
			console.warn(TAG, "ModSDK registration error:", e);
			return false;
		}
	}

	/**
	 * Clears any cached 404 entries for _FlatSmall / _FlatMedium in R133 ImageCache and refreshes characters.
	 */
	function refreshAllCharacters() {
		try {
			for (const cacheObj of [window.GLDrawImageCache, window.DrawImageCache]) {
				if (cacheObj && cacheObj.cache instanceof Map) {
					for (const key of [...cacheObj.cache.keys()]) {
						if (
							typeof key === "string" &&
							(key.startsWith(REPO_BASE_URL) ||
								key.includes("_FlatSmall") ||
								key.includes("_FlatMedium") ||
								key.includes("GlossyBodystocking") ||
								key.includes("马油袜"))
						) {
							if (typeof cacheObj.delete === "function") {
								cacheObj.delete(key);
							} else {
								cacheObj.cache.delete(key);
							}
						}
					}
				}
			}
			if (typeof Player !== "undefined" && Player) {
				if (typeof CharacterRefresh === "function") CharacterRefresh(Player, false, false);
				if (typeof CharacterLoadCanvas === "function") CharacterLoadCanvas(Player);
			}
			if (typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter)) {
				for (const C of ChatRoomCharacter) {
					if (typeof CharacterRefresh === "function") CharacterRefresh(C, false, false);
					if (typeof CharacterLoadCanvas === "function") CharacterLoadCanvas(C);
				}
			}
			if (
				typeof CurrentCharacter !== "undefined" &&
				CurrentCharacter &&
				CurrentCharacter.FocusGroup &&
				typeof DialogInventoryBuild === "function"
			) {
				DialogInventoryBuild(CurrentCharacter, CurrentCharacter.FocusGroup, false, false, true);
			}

			// If Wardrobe / Appearance screen is currently open, refresh grouped assets
			if (
				typeof window.CharacterAppearanceGroupedAssets !== "undefined" &&
				typeof window.AssetGetAllAppearanceForCharacter === "function" &&
				(window.CharacterAppearanceSelection || (typeof Player !== "undefined" && Player))
			) {
				const targetChar = window.CharacterAppearanceSelection || window.Player;
				window.CharacterAppearanceGroupedAssets = window.AssetGetAllAppearanceForCharacter(targetChar);
			}
		} catch (e) {
			console.warn(TAG, "Error refreshing characters:", e);
		}
	}
	window.__JoJoFlatModRefreshAll = refreshAllCharacters;

	function tryInit() {
		if (!window.bcModSdk) {
			ensureModSdkLoaded();
			return false;
		}
		const sdkOk = installSdkHooks();
		const assetsOk = unlockFlatAssets();
		if (sdkOk && assetsOk) {
			refreshAllCharacters();
			// Re-run unlockFlatAssets after 3s and 7s to catch Echo assets if Echo finishes loading after us
			setTimeout(() => {
				unlockFlatAssets();
				refreshAllCharacters();
			}, 3000);
			setTimeout(() => {
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
