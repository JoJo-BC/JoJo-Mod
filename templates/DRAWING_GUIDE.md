# 🎨 Drawing & Asset Creation Guide for Bondage Club (JoJo-Mod)

This guide explains how to create or modify custom clothing and restraints for male and flat-chest avatars (`FlatSmall` and `FlatMedium`) using any image editing software (**Photoshop, Krita, GIMP, Procreate, Paint.NET**), ensuring 100% precision and compatibility with Bondage Club R133+.

---

## 📐 1. Bondage Club Technical Specifications

1. **Fixed Resolution**: The canvas must **always be exactly 500 × 1000 pixels**, with a transparent background.
2. **Coordinate System**:
   - `y = 0..200`: Head and neck.
   - `y = 200..460`: Torso, chest, shoulders, arms, and elbows (`BodyUpper`).
   - `y = 460..1000`: Hips, pelvis, legs, and feet (`BodyLower`).
   - `x = 250`: Center line of the avatar.
3. **File Format**: **32-bit PNG (RGBA)** with transparent alpha channel.

---

## 🧍 2. Reference Mannequins (`templates/mannequins/`)

In the `templates/mannequins/` folder, you will find 12 full-body mannequins (500x1000 px) pre-aligned pixel-for-pixel:

| Pose | FlatSmall File | FlatMedium File |
| :--- | :--- | :--- |
| **Standard Standing** | `mannequin_FlatSmall_Standing.png` | `mannequin_FlatMedium_Standing.png` |
| **Yoked (T-Pose / Yoke)** | `mannequin_FlatSmall_Yoked.png` | `mannequin_FlatMedium_Yoked.png` |
| **OverTheHead (Hands Raised)** | `mannequin_FlatSmall_OverTheHead.png` | `mannequin_FlatMedium_OverTheHead.png` |
| **BackBoxTie (Bound Behind)** | `mannequin_FlatSmall_BackBoxTie.png` | `mannequin_FlatMedium_BackBoxTie.png` |
| **BackCuffs (Cuffed Behind)** | `mannequin_FlatSmall_BackCuffs.png` | `mannequin_FlatMedium_BackCuffs.png` |
| **BackElbowTouch (Elbows Tied)** | `mannequin_FlatSmall_BackElbowTouch.png` | `mannequin_FlatMedium_BackElbowTouch.png` |

### Setup in your graphics editor:
1. Create a new document at **500 × 1000 pixels**.
2. Place the mannequin for your target pose as the bottom layer and **lock it**.
3. Paint your clothing or restraint on layers above with a transparent background.

---

## 🥞 3. How Layers Work in Bondage Club

Bondage Club items can consist of a single PNG or multiple composite layers to support in-game color customization:

### A. Single-Layer Items / Restraints (1 PNG)
- Example: `assets/Assets/Female3DCG/ItemArms/PantyhoseBody_FlatSmall.png`
- A single PNG file containing all colors, shading, and highlights flattened together.

### B. Recolor-Ready Items (e.g., Glossy Bodystocking)
- **`BaseColor`**: Semi-transparent or solid white silhouette that receives the color chosen by the player in the wardrobe.
- **`EdgeLine`**: Black outline lines (semi-transparent near boundaries).
- **`EdgeShade`**: Ambient occlusion shadows along the outer body contours.
- **`A2` / `A3`**: Shading for chest and arms.
- **`C1..C12`**: Specular gloss highlights.
- **`D1..D7`**: Surface folds, creases, and reflections.

---

## 🧪 4. Testing Your Artwork in JoJo-Studio

1. Open `studio/index.html` in your browser.
2. Select your target pose and body size (`FlatSmall` or `FlatMedium`).
3. Drag & drop your newly painted PNG into the **Test Custom Artwork** area.
4. You will instantly see how your texture fits on the mannequin without needing to launch or reload the game!
