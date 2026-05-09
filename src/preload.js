const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  closeWindow:        ()         => ipcRenderer.invoke('close-window'),
  toggleAlwaysOnTop:  (value)    => ipcRenderer.invoke('toggle-always-on-top', value),
  openFileDialog:     ()         => ipcRenderer.invoke('open-file-dialog'),
  openWatchlistImageDialog: ()   => ipcRenderer.invoke('open-watchlist-image-dialog'),
  addImagePath:       (path)     => ipcRenderer.invoke('add-image-path', path),
  setActiveImage:     (path)     => ipcRenderer.invoke('set-active-image', path),
  deleteImage:        (path)     => ipcRenderer.invoke('delete-image', path),
  deleteCurrentImage: ()         => ipcRenderer.invoke('delete-current-image'),
  onInitState:        (callback) => ipcRenderer.on('init-state', (_, state) => callback(state)),
});
