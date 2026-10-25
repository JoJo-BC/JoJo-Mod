# JoJo-Mod (Bondage Club R133+)

Addon for Bondage Club that unlocks and maps clothes & restraints for flat-chested / male avatars (`FlatSmall` & `FlatMedium`).

## 🌐 Live Link & Launchers
- **Landing Page (All 4 Servers + Bookmarklet):** https://jojo-bc.github.io/JoJo-Mod/
- **Direct Userscript / FUSAM Script:** https://jojo-bc.github.io/JoJo-Mod/jojo-mod.user.js

## ✨ Currently Supported Items
1. **Glossy Bodystocking** (`Suit / GlossyBodystocking` & Echo `Suit / 马油袜`)
2. **Pantyhose fullBody** (`ItemArms / PantyhoseBody`)
3. **Crotchless Pantyhose fullBody** (`ItemArms / PantyhoseBodyOpen`)

## 🖼️ How Custom PNGs Work
- Place any custom-edited flat-chest PNG inside `assets/Female3DCG/<GroupName>/...` (matching Bondage Club's path structure, e.g. `assets/Female3DCG/ItemArms/PantyhoseBody_FlatSmall.png`).
- If a PNG is present in `CUSTOM_PNG_MANIFEST`, `jojo-mod.user.js` loads it from `https://jojo-bc.github.io/JoJo-Mod/assets/...`.
- If a PNG is **not** in `CUSTOM_PNG_MANIFEST`, `jojo-mod.user.js` automatically falls back to the official Vanilla `_Small.png` sprite from the Bondage Club server.
