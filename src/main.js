const { app, BrowserWindow, ipcMain, screen, dialog } = require('electron');
const path = require('path');
const fs   = require('fs');

const userDataPath = app.getPath('userData');
const statePath    = path.join(userDataPath, 'widget-state.json');

let mainWindow;

// ── State helpers ────────────────────────────────────────────
function loadState() {
  try {
    if (fs.existsSync(statePath)) return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch (e) {}
  return { alwaysOnTop: true, width: 360, height: 400, x: null, y: null, imagePath: null, gallery: [] };
}

function saveState(state) {
  try { fs.writeFileSync(statePath, JSON.stringify(state, null, 2)); } catch (e) {}
}

function addToGallery(gallery, filePath) {
  if (!Array.isArray(gallery)) gallery = [];
  if (!gallery.includes(filePath)) return [...gallery, filePath];
  return gallery;
}

// ── Window ───────────────────────────────────────────────────
function createWindow() {
  const state = loadState();
  const { width: sw } = screen.getPrimaryDisplay().workAreaSize;
  const w = state.width  || 360;
  const h = state.height || 400;
  const x = state.x !== null ? state.x : sw - w - 40;
  const y = state.y !== null ? state.y : 60;

  mainWindow = new BrowserWindow({
    width: w, height: h, x, y,
    minWidth: 200, minHeight: 220,
    maxWidth: 900, maxHeight: 900,
    frame: false, transparent: true, resizable: true,
    alwaysOnTop: state.alwaysOnTop,
    skipTaskbar: false, hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('init-state', loadState());
  });
  mainWindow.on('moved',   persistBounds);
  mainWindow.on('resized', persistBounds);
  mainWindow.on('closed',  () => { mainWindow = null; });
}

function persistBounds() {
  if (!mainWindow) return;
  const state = loadState();
  const [x, y]         = mainWindow.getPosition();
  const [width, height] = mainWindow.getSize();
  saveState({ ...state, x, y, width, height });
}

// ── IPC handlers ─────────────────────────────────────────────
ipcMain.handle('close-window', () => { if (mainWindow) mainWindow.close(); });

ipcMain.handle('toggle-always-on-top', (_, value) => {
  if (!mainWindow) return;
  mainWindow.setAlwaysOnTop(value);
  const state = loadState();
  saveState({ ...state, alwaysOnTop: value });
  return value;
});

// Open file dialog → add to gallery + set active
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images & GIFs', extensions: ['jpg','jpeg','png','gif','webp','bmp','svg'] }]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const state    = loadState();
    const gallery  = addToGallery(state.gallery, filePath);
    saveState({ ...state, imagePath: filePath, gallery });
    return { filePath, gallery };
  }
  return null;
});

ipcMain.handle('open-watchlist-image-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg','jpeg','png','gif','webp','bmp','svg'] }]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Add via drag-drop
ipcMain.handle('add-image-path', (_, filePath) => {
  const state   = loadState();
  const gallery = addToGallery(state.gallery, filePath);
  saveState({ ...state, imagePath: filePath, gallery });
  return { filePath, gallery };
});

// Set active (from gallery selection)
ipcMain.handle('set-active-image', (_, filePath) => {
  const state = loadState();
  saveState({ ...state, imagePath: filePath });
  return filePath;
});

// Delete specific path from gallery
ipcMain.handle('delete-image', (_, filePath) => {
  const state     = loadState();
  const gallery   = (state.gallery || []).filter(p => p !== filePath);
  const newActive = state.imagePath === filePath
    ? (gallery.length > 0 ? gallery[gallery.length - 1] : null)
    : state.imagePath;
  saveState({ ...state, imagePath: newActive, gallery });
  return { newActive, gallery };
});

// Delete current active image
ipcMain.handle('delete-current-image', () => {
  const state     = loadState();
  const gallery   = (state.gallery || []).filter(p => p !== state.imagePath);
  const newActive = gallery.length > 0 ? gallery[gallery.length - 1] : null;
  saveState({ ...state, imagePath: newActive, gallery });
  return { newActive, gallery };
});

// ── Lifecycle ────────────────────────────────────────────────
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
