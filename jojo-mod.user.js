// ==UserScript==
// @name         JoJo Flat-Chest & Male Avatar Compatibility Mod (BC R133+)
// @namespace    https://jojo-bc.github.io/JoJo-Mod/
// @version      1.4.8
// @description  Unlocks and maps flat-chest (FlatSmall / FlatMedium) and all body sizes clothes and restraints in Bondage Club (Glossy Bodystocking, Echo Latex Top 乳胶衣 & Latex Bottom, Pantyhose fullBody, Glossy Fullbody Pantyhose, etc.), 100% ModSDK & BCX compliant.
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

	if (window.__JoJoFlatModLoaded === "1.4.8") {
		console.log("[JoJo-Mod] v1.4.8 already active, refreshing characters.");
		if (typeof window.__JoJoFlatModRefreshAll === "function") {
			window.__JoJoFlatModRefreshAll();
		}
		return;
	}
	window.__JoJoFlatModLoaded = "1.4.8";

	const TAG = "[JoJo-Mod]";
	const VERSION = "1.4.8";
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

		// Echo Clothing Extension: Latex Top & Latex Bottom
		{ group: "Suit", name: "乳胶衣", fallbackToSmall: true, makeFreeInSession: true },
		{ group: "SuitLower", name: "乳胶衣", fallbackToSmall: true, makeFreeInSession: true },

		// Clothing: Latex Top & Latex Pants
		{ group: "Cloth", name: "LatexTop", fallbackToSmall: true, makeFreeInSession: true },
		{ group: "ClothLower", name: "LatexPants1", fallbackToSmall: true, makeFreeInSession: true },

		// Restraints: Bodyhose (Pantyhose fullBody & Crotchless Pantyhose fullBody)
		{ group: "ItemArms", name: "PantyhoseBody", fallbackToSmall: true, makeFreeInSession: true },
		{ group: "ItemArms", name: "PantyhoseBodyOpen", fallbackToSmall: true, makeFreeInSession: true },

		// Custom Restraints: Glossy Fullbody Pantyhose (Both ItemArms and ItemTorso slots)
		{ group: "ItemArms", name: "GlossyPantyhoseBody", fallbackToSmall: true, makeFreeInSession: true },
		{ group: "ItemTorso", name: "GlossyPantyhoseBody", fallbackToSmall: true, makeFreeInSession: true },
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
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_FlatMedium.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_FlatMedium_BaseColor.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_FlatMedium_Highlight.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_FlatMedium_Shadow.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_FlatSmall.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_FlatSmall_BaseColor.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_FlatSmall_Highlight.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_FlatSmall_Shadow.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_Large.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_Large_BaseColor.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_Large_Highlight.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_Large_Shadow.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_Normal.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_Normal_BaseColor.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_Normal_Highlight.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_Normal_Shadow.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_Small.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_Small_BaseColor.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_Small_Highlight.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_Small_Shadow.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_XLarge.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_XLarge_BaseColor.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_XLarge_Highlight.png",
		"Assets/Female3DCG/ItemArms/GlossyPantyhoseBody_XLarge_Shadow.png",
		"Assets/Female3DCG/ItemArms/PantyhoseBody_FlatMedium.png",
		"Assets/Female3DCG/ItemArms/PantyhoseBody_FlatSmall.png",
		"Assets/Female3DCG/ItemArms/PantyhoseBody_Large.png",
		"Assets/Female3DCG/ItemArms/PantyhoseBody_Normal.png",
		"Assets/Female3DCG/ItemArms/PantyhoseBody_Small.png",
		"Assets/Female3DCG/ItemArms/PantyhoseBody_XLarge.png",
		"Assets/Female3DCG/ItemArms/Preview/GlossyPantyhoseBody.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_FlatMedium.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_FlatMedium_BaseColor.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_FlatMedium_Highlight.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_FlatMedium_Shadow.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_FlatSmall.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_FlatSmall_BaseColor.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_FlatSmall_Highlight.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_FlatSmall_Shadow.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_Large.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_Large_BaseColor.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_Large_Highlight.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_Large_Shadow.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_Normal.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_Normal_BaseColor.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_Normal_Highlight.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_Normal_Shadow.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_Small.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_Small_BaseColor.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_Small_Highlight.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_Small_Shadow.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_XLarge.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_XLarge_BaseColor.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_XLarge_Highlight.png",
		"Assets/Female3DCG/ItemTorso/GlossyPantyhoseBody_XLarge_Shadow.png",
		"Assets/Female3DCG/ItemTorso/Preview/GlossyPantyhoseBody.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_A2.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_A3.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_A4.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_BaseColor.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_BodyHue.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_C1.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_C10.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_C11.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_C12.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_C2.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_C3.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_C4.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_C5.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_C6.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_C7.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_C8.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_C9.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_D1.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_D2.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_D3.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_D4.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_D5.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_D6.png",
		"Assets/Female3DCG/Suit/BackBoxTie/GlossyBodystocking_FlatMedium_D7.png",
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
		"Assets/Female3DCG/Suit/BackBoxTie/乳胶衣_FlatMedium_上底色.png",
		"Assets/Female3DCG/Suit/BackBoxTie/乳胶衣_FlatMedium_上阴影.png",
		"Assets/Female3DCG/Suit/BackBoxTie/乳胶衣_FlatMedium_上高光.png",
		"Assets/Female3DCG/Suit/BackBoxTie/乳胶衣_FlatSmall_上底色.png",
		"Assets/Female3DCG/Suit/BackBoxTie/乳胶衣_FlatSmall_上阴影.png",
		"Assets/Female3DCG/Suit/BackBoxTie/乳胶衣_FlatSmall_上高光.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_A2.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_A3.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_A4.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_BaseColor.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_BodyHue.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_C1.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_C10.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_C11.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_C12.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_C2.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_C3.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_C4.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_C5.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_C6.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_C7.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_C8.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_C9.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_D1.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_D2.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_D3.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_D4.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_D5.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_D6.png",
		"Assets/Female3DCG/Suit/BackCuffs/GlossyBodystocking_FlatMedium_D7.png",
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
		"Assets/Female3DCG/Suit/BackCuffs/乳胶衣_FlatMedium_上底色.png",
		"Assets/Female3DCG/Suit/BackCuffs/乳胶衣_FlatMedium_上阴影.png",
		"Assets/Female3DCG/Suit/BackCuffs/乳胶衣_FlatMedium_上高光.png",
		"Assets/Female3DCG/Suit/BackCuffs/乳胶衣_FlatSmall_上底色.png",
		"Assets/Female3DCG/Suit/BackCuffs/乳胶衣_FlatSmall_上阴影.png",
		"Assets/Female3DCG/Suit/BackCuffs/乳胶衣_FlatSmall_上高光.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_A2.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_A3.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_A4.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_BaseColor.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_BodyHue.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_C1.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_C10.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_C11.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_C12.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_C2.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_C3.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_C4.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_C5.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_C6.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_C7.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_C8.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_C9.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_D1.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_D2.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_D3.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_D4.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_D5.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_D6.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/GlossyBodystocking_FlatMedium_D7.png",
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
		"Assets/Female3DCG/Suit/BackElbowTouch/乳胶衣_FlatMedium_上底色.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/乳胶衣_FlatMedium_上阴影.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/乳胶衣_FlatMedium_上高光.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/乳胶衣_FlatSmall_上底色.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/乳胶衣_FlatSmall_上阴影.png",
		"Assets/Female3DCG/Suit/BackElbowTouch/乳胶衣_FlatSmall_上高光.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_A2.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_A3.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_A4.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_BaseColor.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_BodyHue.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_C1.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_C10.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_C11.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_C12.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_C2.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_C3.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_C4.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_C5.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_C6.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_C7.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_C8.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_C9.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_D1.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_D2.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_D3.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_D4.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_D5.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_D6.png",
		"Assets/Female3DCG/Suit/GlossyBodystocking_FlatMedium_D7.png",
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
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_A2.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_A3.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_A4.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_BaseColor.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_BodyHue.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_C1.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_C10.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_C11.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_C12.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_C2.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_C3.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_C4.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_C5.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_C6.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_C7.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_C8.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_C9.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_D1.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_D2.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_D3.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_D4.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_D5.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_D6.png",
		"Assets/Female3DCG/Suit/OverTheHead/GlossyBodystocking_FlatMedium_D7.png",
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
		"Assets/Female3DCG/Suit/OverTheHead/乳胶衣_FlatMedium_上底色.png",
		"Assets/Female3DCG/Suit/OverTheHead/乳胶衣_FlatMedium_上阴影.png",
		"Assets/Female3DCG/Suit/OverTheHead/乳胶衣_FlatMedium_上高光.png",
		"Assets/Female3DCG/Suit/OverTheHead/乳胶衣_FlatMedium_手套底色.png",
		"Assets/Female3DCG/Suit/OverTheHead/乳胶衣_FlatMedium_手套阴影.png",
		"Assets/Female3DCG/Suit/OverTheHead/乳胶衣_FlatMedium_手套高光.png",
		"Assets/Female3DCG/Suit/OverTheHead/乳胶衣_FlatSmall_上底色.png",
		"Assets/Female3DCG/Suit/OverTheHead/乳胶衣_FlatSmall_上阴影.png",
		"Assets/Female3DCG/Suit/OverTheHead/乳胶衣_FlatSmall_上高光.png",
		"Assets/Female3DCG/Suit/OverTheHead/乳胶衣_FlatSmall_手套底色.png",
		"Assets/Female3DCG/Suit/OverTheHead/乳胶衣_FlatSmall_手套阴影.png",
		"Assets/Female3DCG/Suit/OverTheHead/乳胶衣_FlatSmall_手套高光.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_A2.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_A3.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_A4.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_BaseColor.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_BodyHue.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_C1.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_C10.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_C11.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_C12.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_C2.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_C3.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_C4.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_C5.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_C6.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_C7.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_C8.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_C9.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_D1.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_D2.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_D3.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_D4.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_D5.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_D6.png",
		"Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatMedium_D7.png",
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
		"Assets/Female3DCG/Suit/Yoked/乳胶衣_FlatMedium_上底色.png",
		"Assets/Female3DCG/Suit/Yoked/乳胶衣_FlatMedium_上阴影.png",
		"Assets/Female3DCG/Suit/Yoked/乳胶衣_FlatMedium_上高光.png",
		"Assets/Female3DCG/Suit/Yoked/乳胶衣_FlatMedium_手套底色.png",
		"Assets/Female3DCG/Suit/Yoked/乳胶衣_FlatMedium_手套阴影.png",
		"Assets/Female3DCG/Suit/Yoked/乳胶衣_FlatMedium_手套高光.png",
		"Assets/Female3DCG/Suit/Yoked/乳胶衣_FlatSmall_上底色.png",
		"Assets/Female3DCG/Suit/Yoked/乳胶衣_FlatSmall_上阴影.png",
		"Assets/Female3DCG/Suit/Yoked/乳胶衣_FlatSmall_上高光.png",
		"Assets/Female3DCG/Suit/Yoked/乳胶衣_FlatSmall_手套底色.png",
		"Assets/Female3DCG/Suit/Yoked/乳胶衣_FlatSmall_手套阴影.png",
		"Assets/Female3DCG/Suit/Yoked/乳胶衣_FlatSmall_手套高光.png",
		"Assets/Female3DCG/Suit/乳胶衣_FlatMedium_上底色.png",
		"Assets/Female3DCG/Suit/乳胶衣_FlatMedium_上阴影.png",
		"Assets/Female3DCG/Suit/乳胶衣_FlatMedium_上高光.png",
		"Assets/Female3DCG/Suit/乳胶衣_FlatMedium_手套底色.png",
		"Assets/Female3DCG/Suit/乳胶衣_FlatMedium_手套阴影.png",
		"Assets/Female3DCG/Suit/乳胶衣_FlatMedium_手套高光.png",
		"Assets/Female3DCG/Suit/乳胶衣_FlatSmall_上底色.png",
		"Assets/Female3DCG/Suit/乳胶衣_FlatSmall_上阴影.png",
		"Assets/Female3DCG/Suit/乳胶衣_FlatSmall_上高光.png",
		"Assets/Female3DCG/Suit/乳胶衣_FlatSmall_手套底色.png",
		"Assets/Female3DCG/Suit/乳胶衣_FlatSmall_手套阴影.png",
		"Assets/Female3DCG/Suit/乳胶衣_FlatSmall_手套高光.png",
		"Assets/Female3DCG/SuitLower/Hogtied/乳胶衣_FlatMedium_下阴影.png",
		"Assets/Female3DCG/SuitLower/Hogtied/乳胶衣_FlatSmall_下阴影.png",
		"Assets/Female3DCG/SuitLower/Hogtied/乳胶衣_袜遮罩.png",
		"Assets/Female3DCG/SuitLower/Kneel/乳胶衣_FlatMedium_下底色.png",
		"Assets/Female3DCG/SuitLower/Kneel/乳胶衣_FlatMedium_下阴影.png",
		"Assets/Female3DCG/SuitLower/Kneel/乳胶衣_FlatMedium_下高光.png",
		"Assets/Female3DCG/SuitLower/Kneel/乳胶衣_FlatSmall_下底色.png",
		"Assets/Female3DCG/SuitLower/Kneel/乳胶衣_FlatSmall_下阴影.png",
		"Assets/Female3DCG/SuitLower/Kneel/乳胶衣_FlatSmall_下高光.png",
		"Assets/Female3DCG/SuitLower/KneelingSpread/乳胶衣_FlatMedium_下底色.png",
		"Assets/Female3DCG/SuitLower/KneelingSpread/乳胶衣_FlatMedium_下阴影.png",
		"Assets/Female3DCG/SuitLower/KneelingSpread/乳胶衣_FlatMedium_下高光.png",
		"Assets/Female3DCG/SuitLower/KneelingSpread/乳胶衣_FlatSmall_下底色.png",
		"Assets/Female3DCG/SuitLower/KneelingSpread/乳胶衣_FlatSmall_下阴影.png",
		"Assets/Female3DCG/SuitLower/KneelingSpread/乳胶衣_FlatSmall_下高光.png",
		"Assets/Female3DCG/SuitLower/LegsClosed/乳胶衣_FlatMedium_下底色.png",
		"Assets/Female3DCG/SuitLower/LegsClosed/乳胶衣_FlatMedium_下阴影.png",
		"Assets/Female3DCG/SuitLower/LegsClosed/乳胶衣_FlatMedium_下高光.png",
		"Assets/Female3DCG/SuitLower/LegsClosed/乳胶衣_FlatSmall_下底色.png",
		"Assets/Female3DCG/SuitLower/LegsClosed/乳胶衣_FlatSmall_下阴影.png",
		"Assets/Female3DCG/SuitLower/LegsClosed/乳胶衣_FlatSmall_下高光.png",
		"Assets/Female3DCG/SuitLower/LegsClosed/乳胶衣_袜遮罩.png",
		"Assets/Female3DCG/SuitLower/Spread/乳胶衣_FlatMedium_下底色.png",
		"Assets/Female3DCG/SuitLower/Spread/乳胶衣_FlatMedium_下阴影.png",
		"Assets/Female3DCG/SuitLower/Spread/乳胶衣_FlatMedium_下高光.png",
		"Assets/Female3DCG/SuitLower/Spread/乳胶衣_FlatSmall_下底色.png",
		"Assets/Female3DCG/SuitLower/Spread/乳胶衣_FlatSmall_下阴影.png",
		"Assets/Female3DCG/SuitLower/Spread/乳胶衣_FlatSmall_下高光.png",
		"Assets/Female3DCG/SuitLower/Spread/乳胶衣_袜遮罩.png",
		"Assets/Female3DCG/SuitLower/乳胶衣_FlatMedium_下底色.png",
		"Assets/Female3DCG/SuitLower/乳胶衣_FlatMedium_下阴影.png",
		"Assets/Female3DCG/SuitLower/乳胶衣_FlatMedium_下高光.png",
		"Assets/Female3DCG/SuitLower/乳胶衣_FlatSmall_下底色.png",
		"Assets/Female3DCG/SuitLower/乳胶衣_FlatSmall_下阴影.png",
		"Assets/Female3DCG/SuitLower/乳胶衣_FlatSmall_下高光.png",
		"Assets/Female3DCG/SuitLower/乳胶衣_袜遮罩.png",
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
		let p = cleanSrc;
		try { p = decodeURIComponent(p); } catch (_) {}
		if (p.includes("/Suit/")) {
			if (p.includes("马油袜_FlatSmall_")) {
				p = p.replace("马油袜_FlatSmall_", "GlossyBodystocking_FlatSmall_");
			} else if (p.includes("马油袜_FlatMedium_")) {
				p = p.replace("马油袜_FlatMedium_", "GlossyBodystocking_FlatMedium_");
			}
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

		const assetsIdx = decoded.indexOf("Assets/Female3DCG/");
		const cleanSrc =
			assetsIdx !== -1 ? decoded.slice(assetsIdx) : decoded.startsWith("./") ? decoded.slice(2) : decoded;

		// 1. Direct exact match in custom repository manifest (covers custom assets, layers, and previews)
		if (CUSTOM_PNG_MANIFEST.has(cleanSrc)) {
			return REPO_BASE_URL + "assets/" + cleanSrc;
		}

		// Normalize ItemTorso/GlossyPantyhoseBody to ItemArms/GlossyPantyhoseBody
		let canonicalSrc = cleanSrc;
		if (canonicalSrc.includes("ItemTorso/") && canonicalSrc.includes("GlossyPantyhoseBody")) {
			canonicalSrc = canonicalSrc.replace("ItemTorso/", "ItemArms/");
			if (CUSTOM_PNG_MANIFEST.has(canonicalSrc)) {
				return REPO_BASE_URL + "assets/" + canonicalSrc;
			}
		}

		// Preview fallback for GlossyPantyhoseBody
		if (canonicalSrc.includes("GlossyPantyhoseBody") && canonicalSrc.includes("/Preview/")) {
			return REPO_BASE_URL + "assets/Assets/Female3DCG/ItemArms/Preview/GlossyPantyhoseBody.png";
		}

		if (canonicalSrc.includes("Icons/Previews/TightenLoosen.png")) {
			return "Icons/TightenLoosen.png";
		}

		// Fallback for custom asset without size suffix (e.g. GlossyPantyhoseBody_BaseColor.png -> _Normal_BaseColor.png or _Small_BaseColor.png)
		if (
			canonicalSrc.includes("GlossyPantyhoseBody_") &&
			!canonicalSrc.includes("_Flat") &&
			!canonicalSrc.includes("_Small") &&
			!canonicalSrc.includes("_Normal") &&
			!canonicalSrc.includes("_Large") &&
			!canonicalSrc.includes("_XLarge")
		) {
			const normalFallback = canonicalSrc.replace("GlossyPantyhoseBody_", "GlossyPantyhoseBody_Normal_");
			if (CUSTOM_PNG_MANIFEST.has(normalFallback)) {
				return REPO_BASE_URL + "assets/" + normalFallback;
			}
			const smallFallback = canonicalSrc.replace("GlossyPantyhoseBody_", "GlossyPantyhoseBody_Small_");
			if (CUSTOM_PNG_MANIFEST.has(smallFallback)) {
				return REPO_BASE_URL + "assets/" + smallFallback;
			}
		}

		if (!decoded.includes("_FlatSmall") && !decoded.includes("_FlatMedium")) return src;

		const canonical = toCanonicalManifestPath(cleanSrc);
		if (CUSTOM_PNG_MANIFEST.has(canonical)) {
			return REPO_BASE_URL + "assets/" + canonical;
		}

		// Fallback: If FlatMedium version doesn't exist for a particular layer, try FlatSmall
		if (canonical.includes("_FlatMedium")) {
			const fallbackSmall = canonical.replace("_FlatMedium", "_FlatSmall");
			if (CUSTOM_PNG_MANIFEST.has(fallbackSmall)) {
				return REPO_BASE_URL + "assets/" + fallbackSmall;
			}
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
	 * Registers custom restraint GlossyPantyhoseBody in ItemArms and ItemTorso groups.
	 */
	function registerGlossyPantyhoseBody() {
		if (typeof AssetGet !== "function" || typeof AssetGroupGet !== "function") return;

		// 1. ItemArms slot (standalone fullbody restraint with arms bound behind back)
		const groupArms = AssetGroupGet("Female3DCG", "ItemArms");
		let armsAsset = AssetGet("Female3DCG", "ItemArms", "GlossyPantyhoseBody");
		if (armsAsset) {
			armsAsset.Extended = true;
			armsAsset.AllowTighten = true;
			armsAsset.SetPose = ["BackElbowTouch", "LegsClosed"];
			armsAsset.AllowPose = ["BackElbowTouch", "BackBoxTie", "BackCuffs", "Yoked", "OverTheHead", "LegsClosed"];
			armsAsset.Effect = ["Block", "BlockWardrobe", "Slow"];
			armsAsset.Block = [
				"ItemHands",
				"ItemHandheld",
				"ItemVulva",
				"ItemButt",
				"ItemVulvaPiercings",
				"ItemNipplesPiercings",
			];
		} else if (groupArms && Array.isArray(groupArms.Asset)) {
			armsAsset = {
				Name: "GlossyPantyhoseBody",
				Description: "Glossy Fullbody Pantyhose (Arms)",
				Group: groupArms,
				ParentItem: groupArms.Name,
				AllowColorize: true,
				Value: 0,
				Difficulty: 6,
				SelfBondage: 0,
				Time: 25,
				RemoveTime: 20,
				AllowLock: true,
				AllowTighten: true,
				Extended: true,
				SetPose: ["BackElbowTouch", "LegsClosed"],
				AllowPose: [
					"BackElbowTouch",
					"BackBoxTie",
					"BackCuffs",
					"Yoked",
					"OverTheHead",
					"LegsClosed",
				],
				Effect: ["Block", "BlockWardrobe", "Slow"],
				Hide: ["Cloth", "ClothLower", "Suit", "SuitLower", "Garters"],
				Block: [
					"ItemHands",
					"ItemHandheld",
					"ItemVulva",
					"ItemButt",
					"ItemVulvaPiercings",
					"ItemNipplesPiercings",
				],
				Audio: "ClothSlip",
				Layer: [
					{ Name: "BaseColor", AllowColorize: true },
					{ Name: "Shadow", AllowColorize: false },
					{ Name: "Highlight", AllowColorize: false },
				],
				DefaultColor: ["#1e1e24"],
			};

			if (typeof window.AssetAdd === "function") {
				try {
					window.AssetAdd(groupArms, armsAsset);
				} catch (_) {
					groupArms.Asset.push(armsAsset);
					if (Array.isArray(window.Asset)) window.Asset.push(armsAsset);
				}
			} else {
				groupArms.Asset.push(armsAsset);
				if (Array.isArray(window.Asset)) window.Asset.push(armsAsset);
			}
			console.log(`${TAG} Registered custom restraint: ItemArms / GlossyPantyhoseBody`);
		}

		// 2. ItemTorso slot (foundation restraint layer: leaves arms and legs free for other restraints!)
		const groupTorso = AssetGroupGet("Female3DCG", "ItemTorso");
		let torsoAsset = AssetGet("Female3DCG", "ItemTorso", "GlossyPantyhoseBody");
		if (torsoAsset) {
			torsoAsset.Extended = true;
			torsoAsset.AllowTighten = true;
			torsoAsset.SetPose = ["BackElbowTouch", "LegsClosed"];
			torsoAsset.AllowPose = [
				"BackElbowTouch",
				"BackBoxTie",
				"BackCuffs",
				"Yoked",
				"OverTheHead",
				"LegsClosed",
			];
			torsoAsset.Effect = ["Block", "BlockWardrobe", "Slow"];
			torsoAsset.Block = [
				"ItemHands",
				"ItemHandheld",
				"ItemVulva",
				"ItemButt",
				"ItemVulvaPiercings",
				"ItemNipplesPiercings",
			];
			torsoAsset.Left = 50;
			torsoAsset.Top = 200;
			torsoAsset.DrawingLeft = 50;
			torsoAsset.DrawingTop = 200;
		} else if (groupTorso && Array.isArray(groupTorso.Asset)) {
			torsoAsset = {
				Name: "GlossyPantyhoseBody",
				Description: "Glossy Fullbody Pantyhose (Torso)",
				Group: groupTorso,
				ParentItem: groupTorso.Name,
				Left: 50,
				Top: 200,
				DrawingLeft: 50,
				DrawingTop: 200,
				AllowColorize: true,
				Value: 0,
				Difficulty: 6,
				SelfBondage: 0,
				Time: 25,
				RemoveTime: 20,
				AllowLock: true,
				AllowTighten: true,
				Extended: true,
				SetPose: ["BackElbowTouch", "LegsClosed"],
				AllowPose: [
					"BackElbowTouch",
					"BackBoxTie",
					"BackCuffs",
					"Yoked",
					"OverTheHead",
					"LegsClosed",
				],
				Effect: ["Block", "BlockWardrobe", "Slow"],
				Hide: ["Cloth", "ClothLower", "Suit", "SuitLower", "Garters"],
				Block: [
					"ItemHands",
					"ItemHandheld",
					"ItemVulva",
					"ItemButt",
					"ItemVulvaPiercings",
					"ItemNipplesPiercings",
				],
				Audio: "ClothSlip",
				Layer: [
					{ Name: "BaseColor", AllowColorize: true, Left: 50, Top: 200, DrawingLeft: 50, DrawingTop: 200 },
					{ Name: "Shadow", AllowColorize: false, Left: 50, Top: 200, DrawingLeft: 50, DrawingTop: 200 },
					{ Name: "Highlight", AllowColorize: false, Left: 50, Top: 200, DrawingLeft: 50, DrawingTop: 200 },
				],
				DefaultColor: ["#1e1e24"],
			};

			if (typeof window.AssetAdd === "function") {
				try {
					window.AssetAdd(groupTorso, torsoAsset);
				} catch (_) {
					groupTorso.Asset.push(torsoAsset);
					if (Array.isArray(window.Asset)) window.Asset.push(torsoAsset);
				}
			} else {
				groupTorso.Asset.push(torsoAsset);
				if (Array.isArray(window.Asset)) window.Asset.push(torsoAsset);
			}
			console.log(`${TAG} Registered custom restraint: ItemTorso / GlossyPantyhoseBody`);
		}
	}

	/**
	 * Removes "HasBreasts" prerequisite and "F" gender restriction from configured assets.
	 */
	function unlockFlatAssets() {
		if (typeof AssetGet !== "function" || typeof Asset === "undefined" || !Asset.length) {
			return false;
		}

		registerGlossyPantyhoseBody();

		let unlockedCount = 0;
		for (const item of UNLOCKED_FLAT_ASSETS) {
			const asset = AssetGet("Female3DCG", item.group, item.name);
			if (!asset) continue;

			if (Array.isArray(asset.Prerequisite)) {
				asset.Prerequisite = asset.Prerequisite.filter((p) => p !== "HasBreasts" && p !== "HasVagina");
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
						layer.Prerequisite = layer.Prerequisite.filter((p) => p !== "HasBreasts" && p !== "HasVagina");
					}
				}
			}
			unlockedCount++;
		}

		// Ensure all unlocked assets are present in CharacterAppearanceAssets so Wardrobe arrow buttons (< and >) work
		if (typeof CharacterAppearanceAssets !== "undefined" && Array.isArray(CharacterAppearanceAssets)) {
			for (const item of UNLOCKED_FLAT_ASSETS) {
				const asset = AssetGet("Female3DCG", item.group, item.name);
				if (asset && !CharacterAppearanceAssets.includes(asset)) {
					CharacterAppearanceAssets.push(asset);
				}
			}
		}

		// Clean up any invalid entries in Player.Inventory (must have .Asset to avoid DialogInventoryBuild crash)
		if (typeof Player !== "undefined" && Array.isArray(Player.Inventory)) {
			Player.Inventory = Player.Inventory.filter((i) => i && i.Asset);
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

			// 6. Hook ElementButton._ParseImage, ElementCreate & DrawPreviewBox so DOM & canvas previews load from GitHub Pages
			if (window.ElementButton && typeof window.ElementButton._ParseImage === "function") {
				mod.hookFunction("ElementButton._ParseImage", 20, (args, next) => {
					if (typeof args[1] === "string") {
						args[1] = remapImageUrl(args[1]);
					}
					return next(args);
				});
			}

			if (typeof window.ElementCreate === "function") {
				mod.hookFunction("ElementCreate", 20, (args, next) => {
					const opts = args[0];
					if (opts && typeof opts === "object") {
						if (opts.attributes && typeof opts.attributes.src === "string") {
							opts.attributes.src = remapImageUrl(opts.attributes.src);
						}
						if (opts.style && typeof opts.style === "object") {
							for (const key of ["background-image", "mask-image"]) {
								if (typeof opts.style[key] === "string" && opts.style[key].includes("GlossyPantyhoseBody")) {
									opts.style[key] = opts.style[key].replace(/url\(["']?([^"')]+)["']?\)/g, (_, u) => `url("${remapImageUrl(u)}")`);
								}
							}
						}
					}
					return next(args);
				});
			}

			if (typeof window.DrawPreviewBox === "function") {
				mod.hookFunction("DrawPreviewBox", 20, (args, next) => {
					if (typeof args[2] === "string") {
						args[2] = remapImageUrl(args[2]);
					}
					return next(args);
				});
			}

			// 7. Ensure unlocked flat items are always available & selectable in Wardrobe
			if (typeof window.InventoryAllow === "function") {
				mod.hookFunction("InventoryAllow", 20, (args, next) => {
					const [C, asset] = args;
					const name = typeof asset === "string" ? asset : asset?.Name;
					if (name && UNLOCKED_FLAT_NAMES.has(name)) {
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

			if (typeof window.InventoryBlockedOrLimited === "function") {
				mod.hookFunction("InventoryBlockedOrLimited", 20, (args, next) => {
					const [C, Item] = args;
					const name = Item?.Asset?.Name;
					if (name && UNLOCKED_FLAT_NAMES.has(name)) {
						return false;
					}
					return next(args);
				});
			}

			if (typeof window.CharacterAppearanceGenderAllowed === "function") {
				mod.hookFunction("CharacterAppearanceGenderAllowed", 20, (args, next) => {
					const [asset] = args;
					const name = asset?.Name;
					if (name && UNLOCKED_FLAT_NAMES.has(name)) {
						return true;
					}
					return next(args);
				});
			}

			if (typeof window.AppearanceGetPreviewImageColor === "function") {
				mod.hookFunction("AppearanceGetPreviewImageColor", 20, (args, next) => {
					const [C, item, hover] = args;
					const name = item?.Asset?.Name;
					if (name && UNLOCKED_FLAT_NAMES.has(name)) {
						if (item.Worn) return "pink";
						if (hover) return "cyan";
						return "white";
					}
					return next(args);
				});
			}

			if (typeof window.DialogInventoryCreateItem === "function") {
				mod.hookFunction("DialogInventoryCreateItem", 20, (args, next) => {
					const dialogItem = next(args);
					const asset = dialogItem?.Asset;
					if (asset && UNLOCKED_FLAT_NAMES.has(asset.Name)) {
						const fav =
							typeof window.DialogGetFavoriteStateDetails === "function"
								? window.DialogGetFavoriteStateDetails(args[0], asset)
								: { UsableOrder: 1 };
						dialogItem.SortOrder = `${dialogItem.Worn ? "0" : fav.UsableOrder}${asset.Description}${
							dialogItem.Craft?.Name ?? ""
						}`;
					}
					if (asset && asset.Name === "GlossyPantyhoseBody" && asset.AllowTighten && dialogItem) {
						if (!Array.isArray(dialogItem.Icons)) dialogItem.Icons = [];
						if (!dialogItem.Icons.includes("TightenLoosen")) {
							dialogItem.Icons.push("TightenLoosen");
						}
						if (dialogItem.Worn) {
							dialogItem.SortOrder = `0${asset.Description}${dialogItem.Craft?.Name ?? ""}`;
						}
					}
					return dialogItem;
				});
			}

			// Restraints screen: Always sort currently worn / equipped items to the very top (index 0)
			if (typeof window.DialogInventorySort === "function") {
				mod.hookFunction("DialogInventorySort", 20, (args, next) => {
					next(args);
					if (Array.isArray(window.DialogInventory)) {
						window.DialogInventory.sort((a, b) => {
							const aWorn = a && a.Worn ? 1 : 0;
							const bWorn = b && b.Worn ? 1 : 0;
							if (aWorn !== bWorn) return bWorn - aWorn;
							return (a?.SortOrder || "").localeCompare(b?.SortOrder || "", undefined, {
								numeric: true,
								sensitivity: "base",
							});
						});
					}
				});
			}

			// Ensure Tighten / Loosen button is accessible in top menu for GlossyPantyhoseBody even when hands bound
			if (typeof window.DialogMenuButtonBuild === "function") {
				mod.hookFunction("DialogMenuButtonBuild", 20, (args, next) => {
					const res = next(args);
					const C = args[0];
					if (C && C.FocusGroup && Array.isArray(window.DialogMenuButton)) {
						const item = typeof InventoryGet === "function" ? InventoryGet(C, C.FocusGroup.Name) : null;
						if (item && item.Asset && item.Asset.Name === "GlossyPantyhoseBody" && item.Asset.AllowTighten) {
							if (!window.DialogMenuButton.includes("TightenLoosen")) {
								window.DialogMenuButton.push("TightenLoosen");
							}
						}
					}
					return res;
				});
			}

			// Clicking worn GlossyPantyhoseBody directly opens BC's native Tighten / Loosen screen
			if (typeof window.DialogItemClick === "function") {
				mod.hookFunction("DialogItemClick", 25, (args, next) => {
					const [ClickItem, C, CurrentItem] = args;
					const targetItem = ClickItem || CurrentItem;
					if (targetItem?.Asset?.Name === "GlossyPantyhoseBody" && targetItem.Asset.AllowTighten) {
						const equipped = CurrentItem || (C && C.FocusGroup && typeof InventoryGet === "function" ? InventoryGet(C, C.FocusGroup.Name) : null);
						if (equipped && equipped.Asset && equipped.Asset.Name === "GlossyPantyhoseBody") {
							if (ClickItem?.Worn || ClickItem?.Asset?.Name === "GlossyPantyhoseBody" || !ClickItem) {
								if (typeof DialogSetTightenLoosenItem === "function") {
									DialogSetTightenLoosenItem(equipped);
									return;
								}
							}
						}
					}
					return next(args);
				});
			}

			// 7. Ensure unlocked flat items always appear in the 3x3 Wardrobe DialogInventory
			if (typeof window.DialogInventoryBuild === "function") {
				mod.hookFunction("DialogInventoryBuild", 25, (args, next) => {
					const res = next(args);
					const C = args[0] || window.CharacterAppearanceSelection || (typeof Player !== "undefined" ? Player : null);
					if (C && C.FocusGroup && Array.isArray(window.DialogInventory)) {
						for (const unl of UNLOCKED_FLAT_ASSETS) {
							if (unl.group === C.FocusGroup.Name) {
								const asset = AssetGet("Female3DCG", unl.group, unl.name);
								if (!asset) continue;
								let invItem = window.DialogInventory.find((i) => i && i.Asset && i.Asset.Name === unl.name);
								const worn = Array.isArray(C.Appearance) && C.Appearance.some((a) => a && a.Asset && a.Asset.Name === unl.name && a.Asset.Group.Name === unl.group);
								if (!invItem) {
									invItem = {
										Asset: asset,
										Worn: worn,
										Icons: ["TightenLoosen"],
										SortOrder: `${worn ? "0" : "1"}${asset.Description}`,
									};
									window.DialogInventory.push(invItem);
								} else {
									invItem.Worn = worn;
									invItem.SortOrder = `${worn ? "0" : "1"}${asset.Description}`;
									if (unl.name === "GlossyPantyhoseBody" && Array.isArray(invItem.Icons) && !invItem.Icons.includes("TightenLoosen")) {
										invItem.Icons.push("TightenLoosen");
									}
								}
							}
						}
						if (typeof window.DialogInventorySort === "function") {
							window.DialogInventorySort();
						}
					}
					return res;
				});
			}

			// 8. Hook AppearanceClick: Direct instant equip when clicking an unlocked item in the 3x3 wardrobe grid
			if (typeof window.AppearanceClick === "function") {
				mod.hookFunction("AppearanceClick", 25, (args, next) => {
					const C = window.CharacterAppearanceSelection || (typeof Player !== "undefined" ? Player : null);
					if (
						window.CharacterAppearanceMode === "Cloth" &&
						C &&
						C.FocusGroup &&
						Array.isArray(window.DialogInventory)
					) {
						let X = 1250;
						let Y = 125;
						const offset = window.DialogInventoryOffset || 0;
						const numPerPage = window.CharacterAppearanceNumClothPerPage || 9;
						const mx = typeof MouseX !== "undefined" ? MouseX : 0;
						const my = typeof MouseY !== "undefined" ? MouseY : 0;
						for (let I = offset; I < window.DialogInventory.length && I < offset + numPerPage; I++) {
							if (mx >= X && mx < X + 225 && my >= Y && my < Y + 275) {
								const item = window.DialogInventory[I];
								if (item && item.Asset && UNLOCKED_FLAT_NAMES.has(item.Asset.Name)) {
									const currentItem = typeof InventoryGet === "function" ? InventoryGet(C, C.FocusGroup.Name) : null;
									const worn = !!currentItem && currentItem.Asset.Name === item.Asset.Name;
									if (worn && currentItem.Asset.Name === "GlossyPantyhoseBody" && currentItem.Asset.AllowTighten && typeof DialogSetTightenLoosenItem === "function") {
										DialogSetTightenLoosenItem(currentItem);
										return;
									} else if (worn && currentItem.Asset.Extended && typeof DialogExtendItem === "function") {
										DialogExtendItem(currentItem);
										return;
									} else {
										if (typeof CharacterAppearanceSetItem === "function") {
											CharacterAppearanceSetItem(C, C.FocusGroup.Name, item.Asset);
										}
										if (typeof CharacterRefresh === "function") CharacterRefresh(C);
										if (typeof DialogInventoryBuild === "function") DialogInventoryBuild(C, false, false);
										if (typeof AppearancePreviewBuild === "function") AppearancePreviewBuild(C, true);
										if (typeof AppearanceMenuBuild === "function") AppearanceMenuBuild(C);
									}
									return;
								}
							}
							X += 250;
							if (X > 1800) {
								X = 1250;
								Y += 300;
							}
						}
					}
					return next(args);
				});
			}

			// 9. Hook CharacterAppearanceNextItem so the < and > arrow buttons also cycle through our unlocked items
			if (typeof window.CharacterAppearanceNextItem === "function") {
				mod.hookFunction("CharacterAppearanceNextItem", 25, (args, next) => {
					if (typeof CharacterAppearanceAssets !== "undefined" && Array.isArray(CharacterAppearanceAssets)) {
						for (const unl of UNLOCKED_FLAT_ASSETS) {
							const a = AssetGet("Female3DCG", unl.group, unl.name);
							if (a && !CharacterAppearanceAssets.includes(a)) {
								CharacterAppearanceAssets.push(a);
							}
						}
					}
					return next(args);
				});
			}

			// 10. Interface texts for custom previews and badges
			if (typeof window.InterfaceTextGet === "function") {
				mod.hookFunction("InterfaceTextGet", 20, (args, next) => {
					if (args[0] === "PreviewIconTightenLoosen") return "Stringi / Allenta (Tightness)";
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
			if (typeof document !== "undefined") {
				const previewImgs = document.querySelectorAll("img[src*='GlossyPantyhoseBody']");
				for (const img of previewImgs) {
					img.src = remapImageUrl(img.src);
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

			// If Wardrobe / Appearance screen is currently open, refresh grouped assets and live DialogInventory
			if (typeof window.DialogInventory !== "undefined" && Array.isArray(window.DialogInventory)) {
				for (const item of window.DialogInventory) {
					if (item && item.Asset && UNLOCKED_FLAT_NAMES.has(item.Asset.Name)) {
						const fav =
							typeof window.DialogGetFavoriteStateDetails === "function" &&
							(window.CharacterAppearanceSelection || window.Player)
								? window.DialogGetFavoriteStateDetails(
										window.CharacterAppearanceSelection || window.Player,
										item.Asset
								  )
								: { UsableOrder: 1 };
						item.SortOrder = `${fav.UsableOrder}${item.Asset.Description}${
							item.Craft?.Name ?? ""
						}`;
					}
				}
			}

			if (
				typeof window.CharacterAppearanceGroupedAssets !== "undefined" &&
				typeof window.AssetGetAllAppearanceForCharacter === "function" &&
				(window.CharacterAppearanceSelection || (typeof Player !== "undefined" && Player))
			) {
				const targetChar = window.CharacterAppearanceSelection || window.Player;
				window.CharacterAppearanceGroupedAssets = window.AssetGetAllAppearanceForCharacter(targetChar);
			}

			const targetChar = window.CharacterAppearanceSelection || (typeof Player !== "undefined" ? Player : null);
			if (
				targetChar &&
				targetChar.FocusGroup &&
				typeof window.CharacterAppearanceMode !== "undefined" &&
				window.CharacterAppearanceMode === "Cloth"
			) {
				if (typeof window.DialogInventoryBuild === "function") {
					window.DialogInventoryBuild(targetChar, false, false);
				}
				if (typeof window.AppearancePreviewBuild === "function") {
					window.AppearancePreviewBuild(targetChar, true);
				}
			}
		} catch (e) {
			console.warn(TAG, "Error refreshing characters:", e);
		}
	}
	window.__JoJoFlatModRefreshAll = refreshAllCharacters;

	/**
	 * Emergency helper callable from browser console: JoJoEquip("LatexTop", "Cloth")
	 */
	window.JoJoEquip = function (itemName = "LatexTop", groupName = "Cloth") {
		const C = window.CharacterAppearanceSelection || (typeof Player !== "undefined" ? Player : null);
		if (!C) {
			console.warn(TAG, "No active character found.");
			return false;
		}
		const a = typeof AssetGet === "function" ? AssetGet("Female3DCG", groupName, itemName) : null;
		if (!a) {
			console.warn(TAG, `Asset ${groupName}/${itemName} not found.`);
			return false;
		}
		if (typeof CharacterAppearanceSetItem === "function") {
			CharacterAppearanceSetItem(C, groupName, a);
		}
		if (typeof CharacterRefresh === "function") {
			CharacterRefresh(C);
		}
		if (C.FocusGroup && typeof DialogInventoryBuild === "function") {
			DialogInventoryBuild(C, false, false);
		}
		if (C.FocusGroup && typeof AppearancePreviewBuild === "function") {
			AppearancePreviewBuild(C, true);
		}
		console.log(TAG, `Equipped ${groupName}/${itemName} successfully!`);
		return true;
	};

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
