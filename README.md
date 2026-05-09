# EYES — Floating Image Widget

A minimal, dark-themed floating desktop widget for displaying images and animated GIFs.
Inspired by atmospheric, glowing nature aesthetics.

---

## Features

- 🌙 Dark, transparent floating panel with soft glow
- 🖼️ Display images (JPG, PNG, WEBP, BMP, SVG) and animated GIFs
- 📂 Upload via dialog button or drag & drop
- 📌 Pin / unpin always-on-top (toggle)
- 💾 Remembers last image and window position across sessions
- ✨ Dynamic glow effect sampled from image colors
- 🔲 Resizable window (drag bottom-right corner)
- ⌨️ Press `Escape` to close

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later
- npm (included with Node.js)

### Install & Run

```bash
# 1. Navigate to the project folder
cd eyes-widget

# 2. Install dependencies
npm install

# 3. Launch the widget
npm start
```

---

## Build Distributable

```bash
# Windows installer (.exe)
npm run build:win

# Linux AppImage
npm run build:linux

# Both platforms
npm run build
```

Output files appear in the `dist/` folder.

---

## Usage

| Action | How |
|--------|-----|
| Move widget | Drag the title bar |
| Load image | Click ↑ upload button, or drag & drop a file onto the widget |
| Toggle always-on-top | Click the 📌 pin button |
| Resize | Drag the bottom-right corner handle |
| Close | Click ✕ or press `Escape` |

---

## Project Structure

```
eyes-widget/
├── src/
│   ├── main.js        # Electron main process (window, IPC, state)
│   ├── preload.js     # Secure IPC bridge (contextBridge)
│   ├── index.html     # Widget HTML structure
│   ├── style.css      # Dark atmospheric styles
│   └── renderer.js    # UI logic (drag-drop, image load, glow)
├── assets/            # App icons (add icon.ico / icon.png here)
├── package.json
└── README.md
```

---

## Customization

Edit `src/style.css` CSS variables in `:root` to change colors, glow, transparency:

```css
:root {
  --bg:         rgba(8, 12, 16, 0.88);   /* background opacity */
  --border:     rgba(80, 180, 160, 0.18); /* border tint */
  --accent:     #4ecfb3;                  /* glow / accent color */
}
```

---

## License
MIT
