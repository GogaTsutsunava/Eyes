/* ════════════════════════════════════════════════════════════
   EYES Widget — Renderer Process
   Features: drag-drop, upload, gallery view, delete current,
             delete from gallery, pin toggle, glow effect.
   ════════════════════════════════════════════════════════════ */

const api = window.electronAPI;

// ── Element refs ──────────────────────────────────────────────
const dropZone       = document.getElementById('drop-zone');
const dropHint       = document.getElementById('drop-hint');
const dragOverlay    = document.getElementById('drag-overlay');
const widgetImage    = document.getElementById('widget-image');
const glowOverlay    = document.getElementById('glow-overlay');
const btnClose       = document.getElementById('btn-close');
const btnUpload      = document.getElementById('btn-upload');
const btnPin         = document.getElementById('btn-pin');
const btnDelete      = document.getElementById('btn-delete');
const btnGallery     = document.getElementById('btn-gallery');
const btnGalleryClose= document.getElementById('btn-gallery-close');
const hintLink       = document.getElementById('hint-link');
const galleryPanel   = document.getElementById('gallery-panel');
const galleryGrid    = document.getElementById('gallery-grid');
const galleryEmpty   = document.getElementById('gallery-empty');
const galleryCount   = document.getElementById('gallery-count');
const btnWatch       = document.getElementById('btn-watch');
const watchPanel     = document.getElementById('watch-panel');
const btnWatchClose  = document.getElementById('btn-watch-close');
const watchTitleInput= document.getElementById('watch-title');
const watchImageInput= document.getElementById('watch-image');
const watchRatingEl  = document.getElementById('watch-rating');
const btnWatchAdd    = document.getElementById('btn-watch-add');
const btnWatchSelect = document.getElementById('btn-watch-select-image');
const watchListEl    = document.getElementById('watch-list');
const watchCount     = document.getElementById('watch-count');
const btnText        = document.getElementById('btn-text');
const textPanel      = document.getElementById('text-panel');
const btnTextClose   = document.getElementById('btn-text-close');
const textInput      = document.getElementById('text-input');
const textCount      = document.getElementById('text-count');

let watchOpen = false;
let watchRating = 5;
let watchlist = JSON.parse(localStorage.getItem('eyesWatchlist') || '[]');
let currentImageIsGallery = false;
let textOpen = false;
let textContent = localStorage.getItem('eyesText') || '';
// ── App state ─────────────────────────────────────────────────
let pinned       = true;
let currentPath  = null;   // absolute path of displayed image
let gallery      = [];     // ordered array of paths
let dragCounter  = 0;
let galleryOpen  = false;

// ── Init ──────────────────────────────────────────────────────
api.onInitState((state) => {
  pinned  = state.alwaysOnTop ?? true;
  gallery = Array.isArray(state.gallery) ? state.gallery : [];
  updatePinUI();

  if (state.imagePath) {
    currentPath = state.imagePath;
    loadImage('file://' + state.imagePath, true);
  }

  renderWatchlist();
  loadTextFromStorage();
});

// ── Close ─────────────────────────────────────────────────────
btnClose.addEventListener('click', () => api.closeWindow());

// ── Pin toggle ────────────────────────────────────────────────
btnPin.addEventListener('click', async () => {
  pinned = !pinned;
  await api.toggleAlwaysOnTop(pinned);
  updatePinUI();
});

function updatePinUI() {
  btnPin.classList.toggle('active', pinned);
  btnPin.title = pinned ? 'Unpin from top' : 'Pin to top';
}

// ── Upload ────────────────────────────────────────────────────
async function openUploadDialog() {
  const result = await api.openFileDialog();
  if (result) {
    gallery     = result.gallery;
    currentPath = result.filePath;
    loadImage('file://' + result.filePath, true);
    if (galleryOpen) renderGallery();
  }
}

btnUpload.addEventListener('click', openUploadDialog);
hintLink.addEventListener('click',  openUploadDialog);

// ── Delete current image ──────────────────────────────────────
btnDelete.addEventListener('click', async () => {
  if (!currentPath || !currentImageIsGallery) {
    clearImage();
    return;
  }
  const result = await api.deleteCurrentImage();
  gallery     = result.gallery;
  currentPath = result.newActive;

  if (currentPath) {
    loadImage('file://' + currentPath, true);
  } else {
    clearImage();
  }
  if (galleryOpen) renderGallery();
});



// ── Gallery toggle ────────────────────────────────────────────
btnGallery.addEventListener('click', () => {
  galleryOpen ? closeGallery() : openGallery();
});

btnGalleryClose.addEventListener('click', () => closeGallery());
btnWatch.addEventListener('click', () => {
  watchOpen ? closeWatchPanel() : openWatchPanel();
});
btnWatchClose.addEventListener('click', () => closeWatchPanel());
btnText.addEventListener('click', () => {
  textOpen ? closeTextPanel() : openTextPanel();
});
btnTextClose.addEventListener('click', () => closeTextPanel());
btnWatchAdd.addEventListener('click', addWatchItemFromForm);
btnWatchSelect.addEventListener('click', async () => {
  const filePath = await api.openWatchlistImageDialog();
  if (!filePath) return;
  watchImageInput.value = `file://${filePath}`;
});

if (watchRatingEl) {
  watchRatingEl.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || !button.dataset.value) return;
    setWatchRating(Number(button.dataset.value));
  });
  watchRatingEl.addEventListener('mouseover', (event) => {
    const button = event.target.closest('button');
    if (!button || !button.dataset.value) return;
    previewWatchRating(Number(button.dataset.value));
  });
  watchRatingEl.addEventListener('mouseleave', () => {
    updateWatchRatingButtons(watchRating);
  });
}

[watchTitleInput, watchImageInput].forEach((input) => {
  input?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addWatchItemFromForm();
  });
});

textInput?.addEventListener('input', (event) => {
  textContent = event.target.value;
  updateTextCount();
  saveTextToStorage();
});

function openGallery() {
  galleryOpen = true;
  btnGallery.classList.add('active');
  galleryPanel.classList.remove('hidden');
  // force reflow then animate
  galleryPanel.classList.add('show-now');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => galleryPanel.classList.add('visible'));
  });
  renderGallery();
}

function openWatchPanel() {
  if (galleryOpen) closeGallery();
  watchOpen = true;
  btnWatch.classList.add('active');
  watchPanel.classList.remove('hidden');
  watchPanel.classList.add('show-now');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => watchPanel.classList.add('visible'));
  });
  renderWatchlist();
}

function closeWatchPanel() {
  watchOpen = false;
  btnWatch.classList.remove('active');
  watchPanel.classList.remove('visible');
  watchPanel.addEventListener('transitionend', () => {
    watchPanel.classList.add('hidden');
    watchPanel.classList.remove('show-now');
  }, { once: true });
}

function openTextPanel() {
  if (galleryOpen) closeGallery();
  if (watchOpen) closeWatchPanel();
  textOpen = true;
  btnText.classList.add('active');
  textPanel.classList.remove('hidden');
  textPanel.classList.add('show-now');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => textPanel.classList.add('visible'));
  });
  // Load content after animation setup, like gallery/watchlist
  textInput.value = textContent;
  updateTextCount();
  setTimeout(() => textInput.focus(), 100); // Focus after animation
}

function closeTextPanel() {
  textOpen = false;
  btnText.classList.remove('active');
  textPanel.classList.remove('visible');
  textPanel.addEventListener('transitionend', () => {
    textPanel.classList.add('hidden');
    textPanel.classList.remove('show-now');
  }, { once: true });
}

function updateTextCount() {
  if (textCount) {
    textCount.textContent = `${textContent.length}/500`;
  }
}

function saveTextToStorage() {
  localStorage.setItem('eyesText', textContent);
}

function loadTextFromStorage() {
  textContent = localStorage.getItem('eyesText') || '';
  if (textInput) {
    textInput.value = textContent;
    updateTextCount();
  }
}

function addWatchItemFromForm() {
  const title = watchTitleInput?.value.trim();
  const image = watchImageInput?.value.trim();
  if (!title) return;

  watchlist.unshift({
    title,
    image,
    rating: watchRating
  });
  saveWatchlist();
  renderWatchlist();
  watchTitleInput.value = '';
  watchImageInput.value = '';
  setWatchRating(5);
}

function setWatchRating(value) {
  watchRating = value;
  updateWatchRatingButtons(watchRating);
}

function updateWatchRatingButtons(value) {
  if (!watchRatingEl) return;
  watchRatingEl.querySelectorAll('button').forEach((button) => {
    const num = Number(button.dataset.value);
    button.classList.toggle('active', num <= value);
  });
}

function previewWatchRating(value) {
  updateWatchRatingButtons(value);
}

function removeWatchItem(index) {
  watchlist.splice(index, 1);
  saveWatchlist();
  renderWatchlist();
}

function saveWatchlist() {
  localStorage.setItem('eyesWatchlist', JSON.stringify(watchlist));
}

function renderWatchlist() {
  if (!watchListEl || !watchCount) return;
  watchListEl.innerHTML = '';

  const count = watchlist.length;
  watchCount.textContent = count === 1 ? '1 item' : `${count} items`;

  if (count === 0) {
    const empty = document.createElement('div');
    empty.className = 'watch-empty';
    empty.innerHTML = '<p>Your watchlist is empty.</p><p class="gallery-empty-sub">Add a movie, anime, or anything to save.</p>';
    watchListEl.appendChild(empty);
    return;
  }

  watchlist.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'watch-card';

    if (item.image) {
      const thumb = document.createElement('img');
      thumb.className = 'watch-card-img';
      thumb.src = normalizeWatchImagePath(item.image);
      thumb.alt = item.title;
      thumb.onerror = () => { thumb.style.display = 'none'; };
      card.appendChild(thumb);
    }

    const body = document.createElement('div');
    body.className = 'watch-card-body';

    const title = document.createElement('div');
    title.className = 'watch-card-title';
    title.textContent = item.title;
    body.appendChild(title);

    const rating = document.createElement('div');
    rating.className = 'watch-card-rating';
    rating.innerHTML = Array.from({ length: 5 }, (_, i) =>
      `<span class="star${i < item.rating ? ' active' : ''}">★</span>`
    ).join('');

    const ratingLabel = document.createElement('div');
    ratingLabel.className = 'watch-card-rating-label';
    ratingLabel.textContent = `${item.rating}/5`;
    rating.appendChild(ratingLabel);

    body.appendChild(rating);

    card.appendChild(body);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'watch-card-remove';
    removeBtn.textContent = '✕';
    removeBtn.title = 'Remove item';
    removeBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      removeWatchItem(index);
    });
    card.appendChild(removeBtn);

    watchListEl.appendChild(card);
  });
}

function normalizeWatchImagePath(path) {
  if (!path) return '';
  if (/^(https?:|file:|data:)/.test(path)) return path;
  if (/^[a-zA-Z]:[\\/]/.test(path)) {
    return `file:///${path.replace(/\\/g, '/')}`;
  }
  return `file://${path}`;
}

setWatchRating(watchRating);

function closeGallery() {
  galleryOpen = false;
  btnGallery.classList.remove('active');
  galleryPanel.classList.remove('visible');
  // wait for transition then hide
  galleryPanel.addEventListener('transitionend', () => {
    galleryPanel.classList.add('hidden');
    galleryPanel.classList.remove('show-now');
  }, { once: true });
}

// ── Gallery render ────────────────────────────────────────────
function renderGallery() {
  galleryGrid.innerHTML = '';

  const count = gallery.length;
  galleryCount.textContent = count === 1 ? '1 image' : `${count} images`;

  if (count === 0) {
    galleryEmpty.classList.remove('hidden');
    return;
  }
  galleryEmpty.classList.add('hidden');

  // Render newest first
  [...gallery].reverse().forEach(filePath => {
    const isActive = filePath === currentPath;
    const thumb = document.createElement('div');
    thumb.className = 'gallery-thumb' + (isActive ? ' active' : '');
    thumb.title = filePath.split(/[\\/]/).pop(); // filename only

    // Thumbnail image
    const img = document.createElement('img');
    img.src = 'file://' + filePath;
    img.alt = '';
    img.loading = 'lazy';
    img.onerror = () => { thumb.style.opacity = '0.4'; };
    thumb.appendChild(img);

    // Active dot
    if (isActive) {
      const dot = document.createElement('div');
      dot.className = 'thumb-active-dot';
      thumb.appendChild(dot);
    }

    // Delete button
    const del = document.createElement('button');
    del.className = 'thumb-del';
    del.title = 'Remove from gallery';
    del.innerHTML = '✕';
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteFromGallery(filePath);
    });
    thumb.appendChild(del);

    // Click to select
    thumb.addEventListener('click', async () => {
      if (filePath === currentPath) return;
      await api.setActiveImage(filePath);
      currentPath = filePath;
      loadImage('file://' + filePath, true);
      renderGallery();
    });

    galleryGrid.appendChild(thumb);
  });
}

async function deleteFromGallery(filePath) {
  const result = await api.deleteImage(filePath);
  gallery      = result.gallery;
  currentPath  = result.newActive;

  if (result.newActive) {
    loadImage('file://' + result.newActive, true);
  } else {
    clearImage();
  }
  renderGallery();
}

// ── Image loading ─────────────────────────────────────────────
function loadImage(src, isGalleryImage = false) {
  currentImageIsGallery = isGalleryImage;
  widgetImage.classList.remove('loaded');
  widgetImage.classList.add('hidden');

  const tmp = new Image();
  tmp.onload = () => {
    widgetImage.src = src;
    widgetImage.classList.remove('hidden');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      widgetImage.classList.add('loaded');
    }));
    dropHint.classList.add('hidden');
    btnDelete.classList.toggle('hidden', !currentImageIsGallery);
    applyGlowEffect(tmp);
  };
  tmp.onerror = () => console.error('Failed to load image:', src);
  tmp.src = src;
}

function clearImage() {
  currentPath = null;
  widgetImage.src = '';
  widgetImage.classList.add('hidden');
  widgetImage.classList.remove('loaded');
  glowOverlay.style.background = '';
  dropHint.classList.remove('hidden');
  btnDelete.classList.add('hidden');
}

// ── Glow effect ───────────────────────────────────────────────
function applyGlowEffect(img) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 16; canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 16, 16);
    const data = ctx.getImageData(4, 4, 8, 8).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i+1]; b += data[i+2]; n++; }
    r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
    const brightness  = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    const intensity   = Math.min(brightness * 0.28, 0.18);
    glowOverlay.style.background =
      `radial-gradient(ellipse at 50% 50%, rgba(${r},${g},${b},${intensity}) 0%, transparent 68%)`;
  } catch (e) { glowOverlay.style.background = ''; }
}

// ── Drag-and-drop files onto widget ──────────────────────────
dropZone.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragCounter++;
  if (dragCounter === 1) dragOverlay.classList.remove('hidden');
});

dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) { dragCounter = 0; dragOverlay.classList.add('hidden'); }
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dragCounter = 0;
  dragOverlay.classList.add('hidden');

  const files     = Array.from(e.dataTransfer.files);
  const imageFile = files.find(f => /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(f.name));
  if (!imageFile) return;

  if (imageFile.path) {
    const result = await api.addImagePath(imageFile.path);
    gallery      = result.gallery;
    currentPath  = result.filePath;
    loadImage('file://' + imageFile.path, true);
    if (galleryOpen) renderGallery();
  } else {
    const url = URL.createObjectURL(imageFile);
    loadImage(url, false);
  }
});
// ── Keyboard shortcuts ────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (galleryOpen) { closeGallery(); return; }
    if (watchOpen) { closeWatchPanel(); return; }
    if (textOpen) { closeTextPanel(); return; }
    api.closeWindow();
  }
  if (e.key === 'Delete' && !galleryOpen && currentPath) {
    btnDelete.click();
  }
});
