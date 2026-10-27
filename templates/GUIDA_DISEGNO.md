# 🎨 Guida al Disegno e Modifica Personale Restraint & Vestiti per Bondage Club (JoJo-Mod)

Questa guida spiega passo-passo come trovare, modificare personalmente con qualsiasi programma grafico (**Photoshop, GIMP, Krita, Paint.NET, Clip Studio**) e testare sui manichini live tutti i vestiti e i restraint di **JoJo-Mod**.

---

## 📁 1. Dove si trovano le immagini sul PC?

Tutte le immagini sorgente del mod si trovano sul tuo computer nella cartella:
```text
C:\Users\Admin\Documents\BC\JoJo-Mod\assets\Assets\Female3DCG\
```

Per il restraint **Glossy Pantyhose Body** (corpo intero elastico lucido con braccia bloccate dietro la schiena), i file master si trovano in:
```text
C:\Users\Admin\Documents\BC\JoJo-Mod\assets\Assets\Female3DCG\ItemArms\
```
*(Le cartelle `ItemTorso/` e `ItemTorso2/` contengono le repliche speculari identiche per i due slot del torso).*

---

## 🖌️ 2. Su quali file devo intervenire per le correzioni?

Ogni variante corporea è suddivisa in **3 livelli (layers)** trasparenti (risoluzione 400 × 800 px, centrati nel gioco a X=50, Y=200):

| Nome File | Ruolo del Layer | Quando intervenire |
| :--- | :--- | :--- |
| **`..._BaseColor.png`** | **Sagoma e Bordo** (Silhouette) | **Il file principale per le modifiche di forma!** Se devi stringere le caviglie, rifinire i piedi, coprire o scoprire le spalle, o cambiare il bordo del collo/mento, disegna o cancella pixel qui. È questo livello che riceve la tinta di colore scelta nel gioco. |
| **`..._Highlight.png`** | **Riflessi Lucidi** (Gloss / Specularità) | Contiene i riflessi bianchi trasparenti (lucentezza vinile/seta). Se vuoi attenuare il riflesso, riduci l'opacità con la gomma morbida; se vuoi aggiungere un punto luce, disegna con il bianco semitrasparente. |
| **`..._Shadow.png`** | **Ombre e Pieghe** (Shading) | Contiene le ombreggiature scure morbide che danno tridimensionalità al corpo e le pieghe del tessuto. |

### Corrispondenza con la forma del corpo:
- **`GlossyPantyhoseBody_Normal_BaseColor.png`**: Corpo femminile standard.
- **`GlossyPantyhoseBody_Normal_LegsSmall_BaseColor.png`**: Corpo femminile standard con gambe sottili.
- **`GlossyPantyhoseBody_Small_BaseColor.png`**: Corpo femminile con petto piccolo.
- **`GlossyPantyhoseBody_Large_BaseColor.png`**: Corpo femminile con seno abbondante.
- **`GlossyPantyhoseBody_XLarge_BaseColor.png`**: Corpo femminile con seno molto abbondante.
- **`GlossyPantyhoseBody_FlatMedium_BaseColor.png`**: Corpo maschile atletico / flat medio.
- **`GlossyPantyhoseBody_FlatSmall_BaseColor.png`**: Corpo maschile magro / flat piccolo.

---

## 💾 3. Mi basta modificarla e salvarla con lo stesso nome?

**SÌ, assolutamente!**
1. Apri il PNG con il tuo programma di grafica preferito (es. Photoshop o GIMP).
2. Effettua le correzioni (es. togli o aggiungi pixel al bordo, regola la trasparenza).
3. Salva sovrascrivendo il file con lo **stesso identico nome** e in formato **PNG RGBA (32-bit trasparente)**.
4. Per aggiornare anche gli slot del torso: puoi copiare il file modificato dentro `ItemTorso/` e `ItemTorso2/` oppure eseguire da terminale:
   ```bash
   node JoJo-Mod/tools/build-glossy-pantyhose.js
   ```
5. Per pubblicare subito la modifica su GitHub Pages e vederla nel gioco reale:
   ```bash
   node JoJo-Mod/publish.js push "Rifinito bordo spalle e piedi"
   ```

---

## 🧍 4. Come provarle sui nostri manichini (JoJo-Studio v2.0)

Puoi testare qualsiasi file modificato **in tempo reale** senza nemmeno avviare il gioco, usando lo studio integrato:

### Come aprire lo studio:
- Apri con doppio clic nel browser il file:
  `C:\Users\Admin\Documents\BC\JoJo-Mod\studio\index.html`
  *(oppure visitalo online su https://jojo-bc.github.io/JoJo-Mod/studio/index.html)*

### Funzionalità dello Studio:
- **Tutte le forme del corpo disponibili**:
  - **Petto**: Maschile Magro (`FlatSmall`), Maschile Atletico (`FlatMedium`), Femminile Piccolo (`Small`), Standard (`Normal`), Prosperoso (`Large`), Molto Grande (`XLarge`).
  - **Gambe**: Standard (`Normal`), Sottili (`Small`), Formose (`Large`), Extra (`XLarge`).
  - **Sesso / Pelvi**: Femminile (`Smooth`), Maschile (`Bulge` standard, `SkinTight` marcato, `Tucked`).
  - **Pose**: Gomiti uniti dietro (`BackElbowTouch`), In piedi (`Standing`), BoxTie, Manette, ecc.
- **Tonalità Manichino**: Pelle chiara vanilla, media, scura, o grigio tecnico neutro.
- **Tavolozza Colori**: Prova qualsiasi colore (nero vinile, fumo, bianco, rosa, rosso, blu) con ricolorazione in tempo reale.
- **Trascina & Rilascia (Drag & Drop)**:
  Trascina qualsiasi file PNG appena salvato dal tuo desktop o cartella direttamente nel riquadro dell'editor: lo studio lo mostrerà **all'istante sovrapposto al manichino** con il controllo dello zoom fino al 200% pixel-perfect!
