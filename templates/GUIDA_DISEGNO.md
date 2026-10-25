# 🎨 Guida al Disegno e Modifica Vestiti/Restraint per Bondage Club (JoJo-Mod)

Questa guida spiega come creare o modificare vestiti e restraint personalizzati per avatar maschili / flat-chest (`FlatSmall` e `FlatMedium`) utilizzando qualsiasi programma di grafica (**Photoshop, Krita, GIMP, Procreate, Paint.NET**), garantendo il 100% di precisione e compatibilità con Bondage Club R133+.

---

## 📐 1. Regole e Dimensioni Vincolanti di Bondage Club

1. **Risoluzione fissa**: Il canvas deve essere **sempre esattamente 500 × 1000 pixel**, con sfondo trasparente.
2. **Sistema di coordinate**:
   - `y = 0..200`: Testa e collo.
   - `y = 200..460`: Torace, spalle, braccia e gomiti (la zona `BodyUpper`).
   - `y = 460..1000`: Fianchi, bacino, gambe e piedi (`BodyLower`).
   - `x = 250`: Centro perfetto del corpo.
3. **Formato file**: Solo **PNG a 32-bit (RGBA)** con canale alfa trasparente.

---

## 🧍 2. I Manichini di Riferimento (`templates/mannequins/`)

Nella cartella `templates/mannequins/` trovi i 12 manichini a figura intera (500x1000) già allineati al pixel:

| Posa | File FlatSmall (Corpo Tex) | File FlatMedium |
| :--- | :--- | :--- |
| **In piedi standard** | `mannequin_FlatSmall_Standing.png` | `mannequin_FlatMedium_Standing.png` |
| **Braccia a T / Giogo** | `mannequin_FlatSmall_Yoked.png` | `mannequin_FlatMedium_Yoked.png` |
| **Mani sopra la testa** | `mannequin_FlatSmall_OverTheHead.png` | `mannequin_FlatMedium_OverTheHead.png` |
| **Box Tie dietro** | `mannequin_FlatSmall_BackBoxTie.png` | `mannequin_FlatMedium_BackBoxTie.png` |
| **Manette dietro** | `mannequin_FlatSmall_BackCuffs.png` | `mannequin_FlatMedium_BackCuffs.png` |
| **Gomiti uniti dietro** | `mannequin_FlatSmall_BackElbowTouch.png` | `mannequin_FlatMedium_BackElbowTouch.png` |

### Come impostare il file nel programma di grafica:
1. Crea un nuovo file a **500 × 1000 pixel**.
2. Trascina come livello inferiore il manichino della posa che vuoi disegnare e **blocca il livello** (lucchetto).
3. Disegna i tuoi vestiti o restraint sui livelli superiori con lo sfondo trasparente.

---

## 🥞 3. Come Funzionano i Livelli (Layer) in Bondage Club

Un vestito o restraint in Bondage Club può essere composto da un singolo PNG oppure da più layer sovrapposti per permettere al giocatore di ricolorarlo:

### A. Vestiti semplici o Restraint (1 solo PNG)
- Esempio: `assets/Assets/Female3DCG/ItemArms/PantyhoseBody_FlatSmall.png`
- Basta un singolo file PNG con i colori e le ombre già fusi insieme.

### B. Vestiti ricolorabili (es. Glossy Bodystocking)
- **`BaseColor`**: La sagoma bianca semitrasparente (o opaca) che riceve la tinta scelta dal giocatore nella schermata guardaroba.
- **`EdgeLine`**: Le linee di contorno nere (semi-trasparenti sui bordi).
- **`EdgeShade`**: Le ombre di occlusione ambientale lungo i bordi esterni del corpo.
- **`D1`, `D2`, `A2`**: Riflessi o pieghe scure.
- **`C1..C12`**: Punti luce bianchi per dare l'effetto vinile/lucido o lattice.

---

## 📁 4. Struttura delle Cartelle e Nomi File

I file devono essere salvati dentro `JoJo-Mod/assets/Assets/Female3DCG/<Gruppo>/`:

- **Gruppi principali**:
  - `Suit/` (Vestiti corpo intero)
  - `ItemArms/` (Restraint braccia, manette, corde, calze corpo)
  - `Cloth/` (Magliette, top)
  - `ClothLower/` (Pantaloni, gonne)

- **Convenzione dei nomi**:
  - Posa in piedi: `<NomeOggetto>_FlatSmall_<NomeLivello>.png`
  - Altre pose: `<CartellaPosa>/<NomeOggetto>_FlatSmall_<NomeLivello>.png`
    *(es. `assets/Assets/Female3DCG/Suit/Yoked/GlossyBodystocking_FlatSmall_BaseColor.png`)*

---

## ⚡ 5. Il Comando Rapido Auto-Warp (Zero Token!)

Se vuoi adattare un vestito femminile vanilla senza doverlo ridisegnare a mano:
```bash
# Esempio: adatta un vestito alle 6 pose e alle 2 taglie flat in 5 secondi:
node tools/adapt-item.js Suit/GlossyBodystocking
```

---

## 🚀 6. Pubblicazione su GitHub

Quando hai finito di disegnare o esportare i tuoi PNG in `assets/`:
1. Esegui il comando di pubblicazione dal terminale:
   ```bash
   node publish.js push "Aggiunto nuovo vestito personalizzato"
   ```
2. Lo script rileva in automatico i nuovi PNG, aggiorna il manifest e li pubblica su GitHub Pages in pochi secondi!
