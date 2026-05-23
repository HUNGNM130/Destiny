const BASE_URL = "https://destiny-s88d.onrender.com";
const API_URL = `${BASE_URL}/memories`;
const VIDEO_API_URL = `${BASE_URL}/videos`;
const socket = io(BASE_URL);

// Inject CSS: spinner + move-mode
(function() {
  const s = document.createElement("style");
  s.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    .move-btn { background: #e8f4fd; color: #2980b9; border: 1px solid #aed6f1; }
    .move-btn:hover { background: #d0eaf8; }
    .memory-card.move-mode {
      cursor: grab !important;
      outline: 2.5px dashed #f59e0b;
      outline-offset: 3px;
      z-index: 150 !important;
    }
    .memory-card.move-mode.dragging { cursor: grabbing !important; }
    .memory-card.move-mode .move-btn { background: #d5f5e3; color: #1e8449; border-color: #a9dfbf; }
  `;
  document.head.appendChild(s);
})();

// ── Flatpickr ──────────────────────────────────────────
const datePicker = flatpickr("#date", {
  dateFormat: "d/m/Y", allowInput: false, locale: { firstDayOfWeek: 1 }
});
const videoDatePicker = flatpickr("#videoDate", {
  dateFormat: "d/m/Y", allowInput: false, locale: { firstDayOfWeek: 1 }
});
const searchDatePicker = flatpickr("#searchDate", {
  dateFormat: "Y-m-d", allowInput: false, locale: { firstDayOfWeek: 1 }, placeholder: "Chọn một ngày..."
});
let searchDateFromPicker = null;
let searchDateToPicker = null;
// Init range pickers after DOM ready
document.addEventListener("DOMContentLoaded", () => {
  searchDateFromPicker = flatpickr("#searchDateFrom", {
    dateFormat: "Y-m-d", allowInput: false, locale: { firstDayOfWeek: 1 }, placeholder: "Từ ngày..."
  });
  searchDateToPicker = flatpickr("#searchDateTo", {
    dateFormat: "Y-m-d", allowInput: false, locale: { firstDayOfWeek: 1 }, placeholder: "Đến ngày..."
  });
});

// ── Filter mode switch ─────────────────────────────────
let currentFilterMode = 'day';
function switchFilterMode(mode) {
  currentFilterMode = mode;
  document.getElementById('filterModeDay').style.display   = mode === 'day'   ? 'block' : 'none';
  document.getElementById('filterModeRange').style.display = mode === 'range' ? 'block' : 'none';
  document.getElementById('modeDay').classList.toggle('active', mode === 'day');
  document.getElementById('modeRange').classList.toggle('active', mode === 'range');
}

// ── Tab ────────────────────────────────────────────────
let currentTab = "photos";

function switchTab(tab) {
  currentTab = tab;
  document.getElementById("pagePhotos").style.display  = tab === "photos"  ? "block" : "none";
  document.getElementById("pageVideos").style.display  = tab === "videos"  ? "block" : "none";
  document.getElementById("pageCamera").style.display  = tab === "camera"  ? "block" : "none";
  document.getElementById("pageGallery").style.display = tab === "gallery" ? "block" : "none";
  document.getElementById("tabPhotos").classList.toggle("active", tab === "photos");
  document.getElementById("tabVideos").classList.toggle("active", tab === "videos");
  document.getElementById("tabCamera").classList.toggle("active", tab === "camera");
  document.getElementById("tabGallery").classList.toggle("active", tab === "gallery");
  if (tab === "videos") loadVideos();
  if (tab === "camera") initCamera();
  else stopCamera();
}

// ── Positions ─────────────────────────────────────────
let positions = {};
let videoPositions = {};
const draggableCards = new Set(); // chỉ card trong set mới kéo được

function randomRotate() { return parseFloat((Math.random() * 10 - 5).toFixed(2)); }

function getInitialPos(item, index, cols) {
  if (item.pos_x != null) return { x: item.pos_x, y: item.pos_y, rotate: item.pos_rotate };
  // Không dùng Math.random() — mỗi reload sẽ ra vị trí khác nhau
  // Dùng grid cố định + offset nhỏ theo id để trông tự nhiên
  const c = index % cols, r = Math.floor(index / cols);
  const seed = (item.id || index) % 7;
  const offsetX = [-8, 4, -5, 9, -3, 6, -7][seed];
  const offsetY = [5, -6, 8, -4, 7, -9, 3][seed];
  const rotates = [-3.5, 2.1, -1.8, 4.2, -2.7, 1.5, -4.0];
  return { x: 20 + c * 240 + offsetX, y: 20 + r * 340 + offsetY, rotate: rotates[seed] };
}

function emitMove(id, isVideo = false) {
  const p = isVideo ? videoPositions[id] : positions[id];
  if (!p) return;
  socket.emit(isVideo ? "moveVideo" : "moveMemory", { id, x: p.x, y: p.y, rotate: p.rotate });
}

async function savePosition(id, isVideo = false) {
  const p = (isVideo ? videoPositions : positions)[id];
  if (!p) return;
  const url = `${isVideo ? VIDEO_API_URL : API_URL}/${id}/position`;
  const body = JSON.stringify({ x: p.x, y: p.y, rotate: p.rotate });
  try {
    const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
    if (!res.ok) console.warn("[savePosition] server error", res.status, await res.text());
  } catch(err) {
    console.error("[savePosition] failed, retrying...", err);
    setTimeout(() => fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body }).catch(() => {}), 2000);
  }
}

// ── Drag & Drop ────────────────────────────────────────
let dragState = null;

document.addEventListener("mousemove", (e) => {
  if (!dragState) return;
  const dx = e.clientX - dragState.startX, dy = e.clientY - dragState.startY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.moved = true;
  const store = dragState.isVideo ? videoPositions : positions;
  store[dragState.id].x = dragState.origX + dx;
  store[dragState.id].y = dragState.origY + dy;
  dragState.card.style.left = store[dragState.id].x + "px";
  dragState.card.style.top  = store[dragState.id].y + "px";
  emitMove(dragState.id, dragState.isVideo);
});

document.addEventListener("mouseup", () => {
  if (!dragState) return;
  dragState.card.classList.remove("dragging");
  const store = dragState.isVideo ? videoPositions : positions;
  dragState.card.style.transform = `rotate(${store[dragState.id].rotate}deg)`;
  if (dragState.moved) savePosition(dragState.id, dragState.isVideo);
  dragState = null;
});

document.addEventListener("touchmove", (e) => {
  if (!dragState) return;
  const t = e.touches[0], dx = t.clientX - dragState.startX, dy = t.clientY - dragState.startY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.moved = true;
  const store = dragState.isVideo ? videoPositions : positions;
  store[dragState.id].x = dragState.origX + dx;
  store[dragState.id].y = dragState.origY + dy;
  dragState.card.style.left = store[dragState.id].x + "px";
  dragState.card.style.top  = store[dragState.id].y + "px";
  emitMove(dragState.id, dragState.isVideo);
  e.preventDefault();
}, { passive: false });

document.addEventListener("touchend", () => {
  if (!dragState) return;
  dragState.card.classList.remove("dragging");
  const store = dragState.isVideo ? videoPositions : positions;
  dragState.card.style.transform = `rotate(${store[dragState.id].rotate}deg)`;
  if (dragState.moved) savePosition(dragState.id, dragState.isVideo);
  dragState = null;
});

function makeDraggable(card, id, isVideo = false) {
  card.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON") return;
    if (!draggableCards.has(String(id))) return; // chưa bật chế độ di chuyển
    e.preventDefault();
    document.querySelectorAll(".memory-card, .video-card").forEach(c => c.style.zIndex = 1);
    card.style.zIndex = 100;
    card.classList.add("dragging");
    const store = isVideo ? videoPositions : positions;
    dragState = { card, id, isVideo, startX: e.clientX, startY: e.clientY, origX: store[id].x, origY: store[id].y, moved: false };
  });
  card.addEventListener("touchstart", (e) => {
    if (e.target.tagName === "BUTTON") return;
    if (!draggableCards.has(String(id))) return; // chưa bật chế độ di chuyển
    const t = e.touches[0];
    card.style.zIndex = 100;
    card.classList.add("dragging");
    const store = isVideo ? videoPositions : positions;
    dragState = { card, id, isVideo, startX: t.clientX, startY: t.clientY, origX: store[id].x, origY: store[id].y, moved: false };
  }, { passive: true });
}

// ── Bật / tắt chế độ di chuyển card ───────────────────
function enableMove(id) {
  draggableCards.add(String(id));
  const card = document.querySelector(`.memory-card[data-id="${id}"]`);
  if (!card) return;
  card.classList.add("move-mode");
  const btn = card.querySelector(".move-btn");
  if (btn) { btn.textContent = "✅ Xong"; btn.onclick = () => disableMove(id); }
}

function disableMove(id) {
  draggableCards.delete(String(id));
  const card = document.querySelector(`.memory-card[data-id="${id}"]`);
  if (!card) return;
  card.classList.remove("move-mode");
  card.style.zIndex = 1;
  const btn = card.querySelector(".move-btn");
  if (btn) { btn.textContent = "📌 Di chuyển"; btn.onclick = () => enableMove(id); }
  savePosition(id); // lưu vị trí khi bấm Xong
}

// ── Cropper ────────────────────────────────────────────
let cropper = null, croppedBlob = null;

function onImageSelected(event) {
  const file = event.target.files[0];
  if (!file) return;
  croppedBlob = null;
  const preview = document.getElementById("preview");
  preview.style.display = "none"; preview.src = "";
  if (cropper) { cropper.destroy(); cropper = null; }
  const reader = new FileReader();
  reader.onload = (e) => {
    const cropperImg = document.getElementById("cropperImg");
    document.getElementById("cropperWrapper").style.display = "none";
    cropperImg.src = "";
    cropperImg.onload = () => {
      document.getElementById("cropperWrapper").style.display = "block";
      cropper = new Cropper(cropperImg, { viewMode:1, autoCropArea:0.85, movable:true, zoomable:true, rotatable:false, scalable:false, background:false, responsive:true });
    };
    cropperImg.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function doCrop() {
  if (!cropper) return;
  cropper.getCroppedCanvas({ maxWidth:1200, maxHeight:1200 }).toBlob((blob) => {
    croppedBlob = blob;
    const url = URL.createObjectURL(blob);
    const preview = document.getElementById("preview");
    preview.src = url; preview.style.display = "block";
    document.getElementById("cropperWrapper").style.display = "none";
    cropper.destroy(); cropper = null; resetRotate();
  }, "image/jpeg", 0.9);
}

function onRotateRange(val) { if (!cropper) return; document.getElementById("rotateDeg").textContent = val+"°"; cropper.rotateTo(Number(val)); }
function resetRotate() {
  const range = document.getElementById("rotateRange"), deg = document.getElementById("rotateDeg");
  if (range) range.value = 0; if (deg) deg.textContent = "0°"; if (cropper) cropper.rotateTo(0);
}

// ── MOOD CONFIG ────────────────────────────────────────
const MOODS = {
  happy:       { emoji: "😊", label: "Vui vẻ",   color: "#fde68a", accent: "#f59e0b", animation: "mood-bounce" },
  sad:         { emoji: "😢", label: "Buồn",      color: "#bfdbfe", accent: "#3b82f6", animation: "mood-droop"  },
  miss:        { emoji: "💭", label: "Nhớ nhau",  color: "#e9d5ff", accent: "#8b5cf6", animation: "mood-float"  },
  anniversary: { emoji: "❤️", label: "Kỷ niệm",  color: "#fecdd3", accent: "#e11d48", animation: "mood-pulse"  }
};

function getMoodStyle(mood) {
  const m = MOODS[mood] || MOODS.happy;
  return `background: linear-gradient(135deg, #fff 60%, ${m.color}); border-top: 3px solid ${m.accent};`;
}

// ── BUILD MEMORY CARD ──────────────────────────────────
function buildMemoryCard(memory, index, cols) {
  const card = document.createElement("div");
  card.className = "memory-card scrapbook-card";
  card.dataset.id = memory.id;

  const mood = memory.mood || "happy";
  const moodCfg = MOODS[mood] || MOODS.happy;

  const pos = getInitialPos(memory, index, cols);
  positions[memory.id] = pos;
  if (memory.pos_x == null) savePosition(memory.id);
  card.style.cssText = `left:${pos.x}px; top:${pos.y}px; transform:rotate(${pos.rotate}deg); z-index:1; ${getMoodStyle(mood)}`;

  const d = new Date(memory.date);
  const dateStr = d.toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" });

  // Random tape decoration
  const tapeColors = ["rgba(255,230,140,0.8)","rgba(200,200,255,0.7)","rgba(255,200,200,0.8)","rgba(180,255,200,0.7)"];
  const tapeColor = tapeColors[memory.id % tapeColors.length];
  const tapeAngle = -8 + (memory.id % 5) * 4;

  // Sticker based on mood
  const stickers = { happy:"🌸", sad:"🌧️", miss:"🌙", anniversary:"💌" };
  const sticker = stickers[mood] || "✨";

  card.innerHTML = `
    <div class="tape-strip" style="background:${tapeColor};transform:rotate(${tapeAngle}deg) translateX(-50%);"></div>
    <div class="corner-sticker">${sticker}</div>
    ${memory.image
      ? `<div class="polaroid-frame"><img src="${memory.image}?t=${Date.now()}" alt="${memory.title}" loading="lazy"/><div class="polaroid-caption">${memory.title}</div></div>`
      : `<div class="no-photo-placeholder"><div style="font-size:3rem;">♥</div></div>`
    }
    <div class="card-body">
      <div class="card-title handwritten">${memory.title}</div>
      <div class="card-date">📅 ${dateStr}</div>
      ${memory.location ? `<div class="card-meta">📍 ${memory.location}</div>` : ""}
      ${memory.music    ? `<div class="card-meta">🎵 ${memory.music}</div>` : ""}
      ${memory.description ? `<div class="card-desc">${memory.description}</div>` : ""}
      <div class="card-actions">
        <button class="move-btn"   onclick='enableMove(${memory.id})'>📌 Di chuyển</button>
        <button class="edit-btn"   onclick='editMemory(${JSON.stringify(memory)})'>✏️ Sửa</button>
        <button class="delete-btn" onclick='deleteMemory(${memory.id})'>🗑 Xoá</button>
      </div>
    </div>`;
  return card;
}

// ── SOCKET REALTIME ────────────────────────────────────
socket.on("memoryAdded", (memory) => {
  // Xoá card loading tạm (nếu có) — chỉ máy upload mới có
  document.querySelectorAll(".memory-card[data-id^='temp-']").forEach(c => {
    delete positions[c.dataset.id];
    c.remove();
  });

  if (document.querySelector(`.memory-card[data-id="${memory.id}"]`)) return;
  const container = document.getElementById("memoryContainer");
  // Remove empty state if present
  const empty = container.querySelector(".empty-state");
  if (empty) empty.remove();

  const cols = Math.floor((window.innerWidth - 40) / 240) || 3;
  const existing = container.querySelectorAll(".memory-card").length;

  // Card mới (pos_x null): đặt cố định góc trên trái container,
  // chồng lên card khác chứ không đẩy đi
  const isNewCard = (memory.pos_x == null);
  if (isNewCard) {
    memory.pos_x = 20 + Math.random() * 20;
    memory.pos_y = 20 + Math.random() * 20;
    memory.pos_rotate = parseFloat((Math.random() * 6 - 3).toFixed(2));
  }

  const card = buildMemoryCard(memory, existing, cols);
  // Nếu card mới, lưu vị trí vừa gán lên server
  if (isNewCard) savePosition(memory.id);

  // Animate entrance
  card.style.opacity = "0";
  const pos = positions[memory.id] || { rotate: 0 };
  card.style.transform = `rotate(${pos.rotate}deg) scale(0.7)`;
  card.style.zIndex = 200;
  container.appendChild(card);
  makeDraggable(card, memory.id, false);

  requestAnimationFrame(() => {
    card.style.transition = "opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)";
    card.style.opacity = "1";
    const p = positions[memory.id] || { rotate: 0 };
    card.style.transform = `rotate(${p.rotate}deg) scale(1)`;
    setTimeout(() => {
      card.style.transition = "";
      const p2 = positions[memory.id] || { rotate: 0 };
      card.style.transform = `rotate(${p2.rotate}deg)`;
      card.style.zIndex = 1;
    }, 450);
  });
});

socket.on("memoryUpdated", (data) => {
  // Update the card in-place for realtime (no full reload needed)
  const card = document.querySelector(`.memory-card[data-id="${data.id}"]`);
  if (!card) { loadMemories(activeSearchFilters); return; }
  // Update title
  const titleEl = card.querySelector(".card-title");
  if (titleEl) titleEl.textContent = data.title || "";
  // Update date
  const dateEl = card.querySelector(".card-date");
  if (dateEl && data.date) {
    const d = new Date(data.date);
    dateEl.textContent = d.toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" });
  }
  // Update description
  const descEl = card.querySelector(".card-desc");
  if (descEl) descEl.textContent = data.description || "";
  // Update image if changed
  if (data.image) {
    let imgEl = card.querySelector(".card-img");
    if (imgEl) imgEl.src = data.image + "?t=" + Date.now();
  }
  // Update mood styling
  if (data.mood && typeof MOODS !== "undefined") {
    const moodCfg = MOODS[data.mood] || MOODS.happy;
    card.style.background = `linear-gradient(135deg, #fff 60%, ${moodCfg.color})`;
    card.style.borderTop = `3px solid ${moodCfg.accent}`;
  }
});

socket.on("memoryMoved", (data) => {
  const card = document.querySelector(`.memory-card[data-id="${data.id}"]`);
  if (!card) return;
  positions[data.id] = { x: data.x, y: data.y, rotate: data.rotate };
  card.style.transition = "none";
  card.style.left = data.x + "px";
  card.style.top  = data.y + "px";
  card.style.transform = `rotate(${data.rotate}deg)`;
});

socket.on("videoMoved", (data) => {
  const card = document.querySelector(`.video-card[data-id="${data.id}"]`);
  if (!card) return;
  videoPositions[data.id] = { x: data.x, y: data.y, rotate: data.rotate };
  card.style.left = data.x + "px";
  card.style.top  = data.y + "px";
  card.style.transform = `rotate(${data.rotate}deg)`;
});

socket.on("memoryDeleted", (data) => {
  const card = document.querySelector(`.memory-card[data-id="${data.id}"]`);
  if (!card) return;
  delete positions[data.id];
  card.style.transition = "all 0.35s ease";
  card.style.opacity = "0";
  card.style.transform += " scale(0.85)";
  setTimeout(() => card.remove(), 360);
});

socket.on("videoDeleted", (data) => {
  const card = document.querySelector(`.video-card[data-id="${data.id}"]`);
  if (!card) return;
  delete videoPositions[data.id];
  card.style.transition = "all 0.35s ease";
  card.style.opacity = "0";
  card.style.transform = (card.style.transform||"") + " scale(0.85)";
  setTimeout(() => card.remove(), 360);
});

socket.on("videoAdded", (video) => {
  if (document.querySelector(`.video-card[data-id="${video.id}"]`)) return;
  if (currentTab !== "videos") return;
  const container = document.getElementById("videoContainer");
  const empty = container.querySelector(".empty-state");
  if (empty) empty.remove();
  const cols = Math.floor((window.innerWidth - 40) / 240) || 3;
  const existing = container.querySelectorAll(".video-card").length;
  const card = buildVideoCard(video, existing, cols);
  card.style.opacity = "0";
  container.appendChild(card);
  makeDraggable(card, video.id, true);
  requestAnimationFrame(() => {
    card.style.transition = "opacity 0.4s ease";
    card.style.opacity = "1";
    setTimeout(() => card.style.transition = "", 450);
  });
});

// ── SEARCH (time filter) ───────────────────────────────
let activeSearchFilters = {};

function toggleSearch() {
  const panel = document.getElementById("searchPanel");
  panel.classList.toggle("open");
}

function applySearch() {
  activeSearchFilters = {};
  if (currentFilterMode === 'day') {
    const date = document.getElementById("searchDate").value;
    if (date) activeSearchFilters.date = date;
  } else {
    const from = document.getElementById("searchDateFrom").value;
    const to   = document.getElementById("searchDateTo").value;
    if (from) activeSearchFilters.date_from = from;
    if (to)   activeSearchFilters.date_to   = to;
  }
  loadMemories(activeSearchFilters);
  document.getElementById("searchPanel").classList.remove("open");
}

function clearSearch() {
  if (searchDatePicker) searchDatePicker.clear();
  if (searchDateFromPicker) searchDateFromPicker.clear();
  if (searchDateToPicker) searchDateToPicker.clear();
  activeSearchFilters = {};
  loadMemories();
}

// ── Load Memories ──────────────────────────────────────
async function loadMemories(filters = {}) {
  const container = document.getElementById("memoryContainer");
  container.innerHTML = '<div class="loading">đang tải những kỷ niệm... ♥</div>';
  try {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${API_URL}?${params}`);
    const memories = await res.json();
    container.innerHTML = "";
    if (memories.length === 0) {
      container.innerHTML = `<div class="empty-state"><span class="big-heart">💌</span><h2>Chưa có kỷ niệm nào</h2><p>Hãy thêm khoảnh khắc đầu tiên của hai đứa nhé ♥</p></div>`;
      return;
    }
    const cols = Math.floor((window.innerWidth - 40) / 240) || 3;
    const rows = Math.ceil(memories.length / cols);
    container.style.minHeight = (rows * 360 + 100) + "px";
    memories.forEach((memory, index) => {
      const card = buildMemoryCard(memory, index, cols);
      container.appendChild(card);
      makeDraggable(card, memory.id, false);
    });
  } catch {
    container.innerHTML = `<div class="empty-state"><span class="big-heart">😢</span><h2>Không thể kết nối server</h2><p>Hãy đảm bảo server đang chạy tại localhost:3000</p></div>`;
  }
}

// ── Build Video Card ───────────────────────────────────
function buildVideoCard(video, index, cols) {
  const card = document.createElement("div");
  card.className = "video-card";
  card.dataset.id = video.id;
  const pos = getInitialPos(video, index, cols);
  videoPositions[video.id] = pos;
  if (video.pos_x == null) savePosition(video.id, true);
  card.style.left = pos.x + "px"; card.style.top = pos.y + "px";
  card.style.transform = `rotate(${pos.rotate}deg)`; card.style.zIndex = 1;
  const d = new Date(video.date);
  const dateStr = d.toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" });
  const videoSrc = video.url || "";
  card.innerHTML = `
    <div class="video-thumb">
      <video src="${videoSrc}" muted preload="metadata" style="width:100%;height:100%;object-fit:cover;pointer-events:none;"></video>
      <div class="video-play-icon">▶️</div>
    </div>
    <div class="card-body">
      <div class="card-title">${video.title}</div>
      <div class="card-date">📅 ${dateStr}</div>
      ${video.description ? `<div class="card-desc">${video.description}</div>` : ""}
      <div class="card-actions">
        <button class="play-btn"   onclick='playVideo("${videoSrc}")'>▶ Xem</button>
        <button class="edit-btn"   onclick='editVideo(${JSON.stringify(video)})'>✏️</button>
        <button class="delete-btn" onclick='deleteVideo(${video.id})'>🗑</button>
      </div>
    </div>`;
  return card;
}

// ── Load Videos ────────────────────────────────────────
async function loadVideos() {
  const container = document.getElementById("videoContainer");
  container.innerHTML = '<div class="loading">đang tải video... ♥</div>';
  try {
    const res = await fetch(VIDEO_API_URL);
    const videos = await res.json();
    container.innerHTML = "";
    if (videos.length === 0) {
      container.innerHTML = `<div class="empty-state"><span class="big-heart">🎬</span><h2>Chưa có video nào</h2><p>Hãy thêm video đầu tiên của hai đứa nhé ♥</p></div>`;
      return;
    }
    const cols = Math.floor((window.innerWidth - 40) / 240) || 3;
    container.style.minHeight = (Math.ceil(videos.length/cols) * 360 + 100) + "px";
    videos.forEach((video, index) => {
      const card = buildVideoCard(video, index, cols);
      container.appendChild(card);
      makeDraggable(card, video.id, true);
    });
  } catch {
    container.innerHTML = `<div class="empty-state"><span class="big-heart">😢</span><h2>Không thể kết nối server</h2></div>`;
  }
}

// ── Video fullscreen player ────────────────────────────
// ── JolyUI-style Video Player ──────────────────────────
(function() {
  let playerEl, videoEl, controlsTimeout, isDraggingSeek = false;

  function buildPlayer() {
    if (document.getElementById("joly-player-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "joly-player-overlay";
    overlay.innerHTML = `
      <div id="joly-player-wrap">
        <video id="joly-video" preload="metadata"></video>

        <div id="joly-gradient-top"></div>
        <div id="joly-gradient-bot"></div>

        <div id="joly-center-icon" aria-hidden="true">
          <svg id="joly-center-svg" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
            <polygon id="joly-center-poly" points="25,19 25,45 47,32" fill="white"/>
          </svg>
        </div>

        <div id="joly-controls">
          <div id="joly-seek-wrap">
            <div id="joly-seek-track">
              <div id="joly-seek-loaded"></div>
              <div id="joly-seek-fill"></div>
              <div id="joly-seek-thumb"></div>
              <div id="joly-hover-preview">
                <div id="joly-hover-time"></div>
              </div>
            </div>
          </div>

          <div id="joly-ctrl-row">
            <div id="joly-ctrl-left">
              <button class="joly-btn" id="joly-play-btn" aria-label="Phát/Dừng">
                <svg id="joly-play-icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                <svg id="joly-pause-icon" viewBox="0 0 24 24" fill="currentColor" style="display:none"><rect x="5" y="3" width="4" height="18" rx="1"/><rect x="15" y="3" width="4" height="18" rx="1"/></svg>
              </button>

              <button class="joly-btn" id="joly-back-btn" aria-label="Lùi 10s" title="Lùi 10s">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M2.5 12a9.5 9.5 0 1 1 1.07 4.43"/><path d="M2.5 7v5h5"/><text x="7.5" y="15.5" font-size="6" fill="currentColor" stroke="none" font-weight="600">10</text>
                </svg>
              </button>

              <button class="joly-btn" id="joly-fwd-btn" aria-label="Tua 10s" title="Tua 10s">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M21.5 12a9.5 9.5 0 1 0-1.07 4.43"/><path d="M21.5 7v5h-5"/><text x="7.5" y="15.5" font-size="6" fill="currentColor" stroke="none" font-weight="600">10</text>
                </svg>
              </button>

              <div id="joly-vol-wrap">
                <button class="joly-btn" id="joly-mute-btn" aria-label="Tắt/Bật tiếng">
                  <svg id="joly-vol-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
                  <svg id="joly-mute-icon" viewBox="0 0 24 24" fill="currentColor" style="display:none"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </button>
                <div id="joly-vol-slider-wrap">
                  <input type="range" id="joly-vol-slider" min="0" max="1" step="0.02" value="1" aria-label="Âm lượng"/>
                </div>
              </div>

              <div id="joly-time-display"><span id="joly-cur">0:00</span> / <span id="joly-dur">0:00</span></div>
            </div>

            <div id="joly-ctrl-right">
              <div id="joly-speed-wrap">
                <button class="joly-btn joly-text-btn" id="joly-speed-btn" aria-label="Tốc độ phát">1×</button>
                <div id="joly-speed-menu">
                  <button class="joly-speed-opt" data-val="0.5">0.5×</button>
                  <button class="joly-speed-opt" data-val="0.75">0.75×</button>
                  <button class="joly-speed-opt active" data-val="1">1×</button>
                  <button class="joly-speed-opt" data-val="1.25">1.25×</button>
                  <button class="joly-speed-opt" data-val="1.5">1.5×</button>
                  <button class="joly-speed-opt" data-val="2">2×</button>
                </div>
              </div>

              <button class="joly-btn" id="joly-pip-btn" aria-label="Hình trong hình" title="PiP (P)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><rect x="12" y="11" width="8" height="5" rx="1" fill="currentColor" stroke="none"/>
                </svg>
              </button>

              <button class="joly-btn" id="joly-fs-btn" aria-label="Toàn màn hình" title="Toàn màn hình (F)">
                <svg id="joly-fs-enter" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                <svg id="joly-fs-exit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="display:none"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
              </button>

              <button class="joly-btn" id="joly-close-btn" aria-label="Đóng">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    playerEl  = overlay;
    videoEl   = overlay.querySelector("#joly-video");

    // ── Events ──────────────────────────────────────────
    const $  = id => overlay.querySelector("#" + id);

    // Play / Pause
    const playBtn = $("joly-play-btn");
    function syncPlayPause() {
      $("joly-play-icon").style.display  = videoEl.paused ? "" : "none";
      $("joly-pause-icon").style.display = videoEl.paused ? "none" : "";
      animateCenterIcon(videoEl.paused ? "pause" : "play");
    }
    playBtn.addEventListener("click", () => videoEl.paused ? videoEl.play() : videoEl.pause());
    videoEl.addEventListener("play",  syncPlayPause);
    videoEl.addEventListener("pause", syncPlayPause);

    // Center icon animation
    const centerIcon = $("joly-center-icon");
    const centerPoly = $("joly-center-poly");
    function animateCenterIcon(type) {
      centerIcon.classList.remove("joly-pop");
      void centerIcon.offsetWidth;
      if (type === "pause") {
        centerPoly.setAttribute("points", "7,3 11,3 11,21 7,21 M13,3 17,3 17,21 13,21");
        centerPoly.setAttribute("fill", "white");
      } else {
        centerPoly.setAttribute("points", "25,19 25,45 47,32");
      }
      centerIcon.classList.add("joly-pop");
    }

    // Click video area = play/pause
    videoEl.addEventListener("click", () => videoEl.paused ? videoEl.play() : videoEl.pause());

    // Skip
    $("joly-back-btn").addEventListener("click", () => { videoEl.currentTime = Math.max(0, videoEl.currentTime - 10); });
    $("joly-fwd-btn").addEventListener("click",  () => { videoEl.currentTime = Math.min(videoEl.duration || 0, videoEl.currentTime + 10); });

    // Volume
    const volSlider = $("joly-vol-slider");
    const muteBtn   = $("joly-mute-btn");
    function syncVolUI() {
      const muted = videoEl.muted || videoEl.volume === 0;
      $("joly-vol-icon").style.display  = muted ? "none" : "";
      $("joly-mute-icon").style.display = muted ? "" : "none";
      volSlider.value = muted ? 0 : videoEl.volume;
      volSlider.style.setProperty("--pct", (muted ? 0 : videoEl.volume) * 100 + "%");
    }
    muteBtn.addEventListener("click", () => { videoEl.muted = !videoEl.muted; syncVolUI(); });
    volSlider.addEventListener("input", () => {
      videoEl.volume = parseFloat(volSlider.value);
      videoEl.muted  = videoEl.volume === 0;
      syncVolUI();
    });
    videoEl.addEventListener("volumechange", syncVolUI);

    // Seek bar
    const seekTrack = $("joly-seek-track");
    const seekFill  = $("joly-seek-fill");
    const seekLoaded = $("joly-seek-loaded");
    const seekThumb = $("joly-seek-thumb");
    const hoverPreview = $("joly-hover-preview");
    const hoverTime = $("joly-hover-time");

    function seekTo(e) {
      const rect = seekTrack.getBoundingClientRect();
      const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      videoEl.currentTime = pct * (videoEl.duration || 0);
    }
    function updateSeek() {
      if (!videoEl.duration) return;
      const pct = videoEl.currentTime / videoEl.duration * 100;
      seekFill.style.width = pct + "%";
      seekThumb.style.left = pct + "%";
    }
    seekTrack.addEventListener("mousedown", e => { isDraggingSeek = true; seekTo(e); });
    document.addEventListener("mousemove", e => { if (isDraggingSeek) seekTo(e); });
    document.addEventListener("mouseup",   () => { isDraggingSeek = false; });

    seekTrack.addEventListener("mousemove", e => {
      if (!videoEl.duration) return;
      const rect = seekTrack.getBoundingClientRect();
      const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const secs = pct * videoEl.duration;
      hoverTime.textContent = fmtTime(secs);
      hoverPreview.style.left = (pct * 100) + "%";
      hoverPreview.style.opacity = "1";
    });
    seekTrack.addEventListener("mouseleave", () => { hoverPreview.style.opacity = "0"; });

    videoEl.addEventListener("timeupdate", () => {
      updateSeek();
      $("joly-cur").textContent = fmtTime(videoEl.currentTime);
    });
    videoEl.addEventListener("durationchange", () => {
      $("joly-dur").textContent = fmtTime(videoEl.duration);
    });
    videoEl.addEventListener("progress", () => {
      if (!videoEl.duration) return;
      try {
        const buf = videoEl.buffered;
        if (buf.length) seekLoaded.style.width = (buf.end(buf.length - 1) / videoEl.duration * 100) + "%";
      } catch(e) {}
    });

    // Speed menu
    const speedBtn  = $("joly-speed-btn");
    const speedMenu = $("joly-speed-menu");
    speedBtn.addEventListener("click", e => { e.stopPropagation(); speedMenu.classList.toggle("open"); });
    overlay.querySelectorAll(".joly-speed-opt").forEach(opt => {
      opt.addEventListener("click", () => {
        const val = parseFloat(opt.dataset.val);
        videoEl.playbackRate = val;
        speedBtn.textContent = val + "×";
        overlay.querySelectorAll(".joly-speed-opt").forEach(o => o.classList.toggle("active", o === opt));
        speedMenu.classList.remove("open");
      });
    });

    // PiP
    $("joly-pip-btn").addEventListener("click", () => {
      if (document.pictureInPictureElement) document.exitPictureInPicture();
      else if (videoEl.requestPictureInPicture) videoEl.requestPictureInPicture();
    });

    // Fullscreen
    const fsBtn = $("joly-fs-btn");
    function syncFs() {
      const isFs = !!document.fullscreenElement;
      $("joly-fs-enter").style.display = isFs ? "none" : "";
      $("joly-fs-exit").style.display  = isFs ? "" : "none";
    }
    fsBtn.addEventListener("click", () => {
      if (!document.fullscreenElement) $("joly-player-wrap").requestFullscreen();
      else document.exitFullscreen();
    });
    document.addEventListener("fullscreenchange", syncFs);

    // Close
    $("joly-close-btn").addEventListener("click", closeVideoPlayer);
    overlay.addEventListener("click", e => { if (e.target === overlay) closeVideoPlayer(); });

    // Controls auto-hide
    const controls = $("joly-controls");
    function showControls() {
      controls.classList.add("visible");
      clearTimeout(controlsTimeout);
      controlsTimeout = setTimeout(() => { if (!videoEl.paused) controls.classList.remove("visible"); }, 2500);
    }
    overlay.addEventListener("mousemove", showControls);
    overlay.addEventListener("mousedown", showControls);
    videoEl.addEventListener("pause", () => controls.classList.add("visible"));

    // Keyboard shortcuts
    document.addEventListener("keydown", e => {
      if (!playerEl || !playerEl.classList.contains("open")) return;
      if (["INPUT","TEXTAREA"].includes(document.activeElement?.tagName)) return;
      switch(e.key) {
        case " ": case "k": e.preventDefault(); videoEl.paused ? videoEl.play() : videoEl.pause(); break;
        case "f": case "F": fsBtn.click(); break;
        case "m": case "M": muteBtn.click(); break;
        case "j": case "J": videoEl.currentTime = Math.max(0, videoEl.currentTime - 10); break;
        case "l": case "L": videoEl.currentTime = Math.min(videoEl.duration||0, videoEl.currentTime + 10); break;
        case "p": case "P": $("joly-pip-btn").click(); break;
        case "Escape": closeVideoPlayer(); break;
        case "ArrowRight": videoEl.currentTime = Math.min(videoEl.duration||0, videoEl.currentTime + 5); break;
        case "ArrowLeft":  videoEl.currentTime = Math.max(0, videoEl.currentTime - 5); break;
        case "ArrowUp":    videoEl.volume = Math.min(1, videoEl.volume + 0.1); syncVolUI(); break;
        case "ArrowDown":  videoEl.volume = Math.max(0, videoEl.volume - 0.1); syncVolUI(); break;
      }
    });
  }

  function fmtTime(s) {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return m + ":" + String(sec).padStart(2, "0");
  }

  window.playVideo = function(src, title) {
    buildPlayer();
    videoEl.src = src;
    playerEl.classList.add("open");
    document.body.style.overflow = "hidden";
    videoEl.play().catch(() => {});
  };

  window.closeVideoPlayer = function() {
    if (!playerEl) return;
    playerEl.classList.remove("open");
    videoEl.pause();
    videoEl.src = "";
    document.body.style.overflow = "";
  };
})();

// ── Form: Ảnh ──────────────────────────────────────────
function openForm() {
  document.getElementById("formTitle").innerText = "Thêm khoảnh khắc";
  document.getElementById("memoryFormOverlay").style.display = "flex";
}
function closeForm() {
  document.getElementById("memoryFormOverlay").style.display = "none";
  document.getElementById("memoryId").value = "";
  document.getElementById("title").value = "";
  datePicker.clear();
  document.getElementById("description").value = "";
  document.getElementById("preview").src = ""; document.getElementById("preview").style.display = "none";
  document.getElementById("image").value = "";
  document.getElementById("cropperWrapper").style.display = "none";
  if (cropper) { cropper.destroy(); cropper = null; }
  croppedBlob = null;
}
function editMemory(memory) {
  openForm();
  document.getElementById("formTitle").innerText = "Sửa khoảnh khắc ✦";
  document.getElementById("memoryId").value = memory.id;
  document.getElementById("title").value = memory.title;
  datePicker.setDate(new Date(memory.date), true);
  document.getElementById("description").value = memory.description || "";
  if (memory.image) {
    const preview = document.getElementById("preview");
    preview.src = `${memory.image}?t=${Date.now()}`; preview.style.display = "block";
  }
}
async function saveMemory() {
  const id = document.getElementById("memoryId").value;
  const title = document.getElementById("title").value.trim();
  const date  = document.getElementById("date").value;
  if (!title || !date) {
    Swal.fire({ icon:"warning", title:"Thiếu thông tin", text:"Vui lòng nhập tiêu đề và ngày nhé ♥", confirmButtonColor:"#8b3a4a" });
    return;
  }
  const [day, month, year] = date.split("/");
  const formData = new FormData();
  formData.append("title", title);
  formData.append("date", `${year}-${month}-${day}`);
  formData.append("description", document.getElementById("description").value);
  if (croppedBlob) formData.append("image", croppedBlob, "cropped.jpg");
  else if (document.getElementById("image").files[0]) formData.append("image", document.getElementById("image").files[0]);

  closeForm();

  try {
    if (id) {
      await fetch(`${API_URL}/${id}`, { method:"PUT", body:formData });
      loadMemories(activeSearchFilters);
    } else {
      // Hiện card loading ngay lập tức trên máy mình trong khi đợi Cloudinary
      const tempId = "temp-" + Date.now();
      showLoadingCard(tempId, title);

      const res = await fetch(API_URL, { method:"POST", body:formData });
      const data = await res.json();
      if (!res.ok) {
        // Xoá card loading nếu lỗi
        const tempCard = document.querySelector(`.memory-card[data-id="${tempId}"]`);
        if (tempCard) { delete positions[tempId]; tempCard.remove(); }
        throw new Error(data.error || "Server error");
      }
      // socket.on("memoryAdded") sẽ tự xoá card loading và hiện card thật cho tất cả máy
    }
  } catch {
    Swal.fire({ icon:"error", title:"Lỗi rồi!", text:"Không thể lưu. Kiểm tra server nhé.", confirmButtonColor:"#8b3a4a" });
  }
}

// ── Card loading tạm trong khi upload Cloudinary ───────
function showLoadingCard(tempId, title) {
  const container = document.getElementById("memoryContainer");
  const empty = container.querySelector(".empty-state");
  if (empty) empty.remove();

  const card = document.createElement("div");
  card.className = "memory-card scrapbook-card";
  card.dataset.id = tempId;

  // Đặt cố định góc trên trái container, chồng lên card khác
  const x = 20 + Math.random() * 20;
  const y = 20 + Math.random() * 20;
  const rotate = parseFloat((Math.random() * 6 - 3).toFixed(2));
  positions[tempId] = { x, y, rotate };

  card.style.cssText = `left:${x}px; top:${y}px; transform:rotate(${rotate}deg); z-index:200; background: linear-gradient(135deg, #fff 60%, #fde68a); border-top: 3px solid #f59e0b;`;

  card.innerHTML = `
    <div class="polaroid-frame" style="display:flex;align-items:center;justify-content:center;min-height:180px;background:#f9f3ee;">
      <div style="text-align:center;">
        <div style="width:36px;height:36px;border:3px solid #f0ddd5;border-top-color:#c96a5a;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto;"></div>
        <div style="margin-top:10px;font-size:12px;color:#bbb;font-family:'Caveat',cursive;">Đang tải ảnh lên... ♥</div>
      </div>
    </div>
    <div class="card-body">
      <div class="card-title handwritten">${title}</div>
    </div>`;

  container.appendChild(card);

  card.style.opacity = "0";
  card.style.transform = `rotate(${rotate}deg) scale(0.7)`;
  requestAnimationFrame(() => {
    card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    card.style.opacity = "1";
    card.style.transform = `rotate(${rotate}deg) scale(1)`;
    setTimeout(() => card.style.transition = "", 350);
  });
}
async function deleteMemory(id) {
  const result = await Swal.fire({
    title:"Xoá kỷ niệm này?", text:"Sẽ không thể khôi phục lại được đâu nhé 💔",
    icon:"warning", showCancelButton:true, confirmButtonText:"Xoá đi", cancelButtonText:"Giữ lại ♥", reverseButtons:true
  });
  if (result.isConfirmed) {
    const card = document.querySelector(`.memory-card[data-id="${id}"]`);
    if (card) { card.style.transition = "all 0.35s ease"; card.style.opacity = "0"; card.style.transform = (card.style.transform||"") + " scale(0.85)"; setTimeout(() => card.remove(), 360); }
    delete positions[id];
    try { await fetch(`${API_URL}/${id}`, { method:"DELETE" }); socket.emit("deleteMemory", { id }); } catch { console.error("Delete failed"); }
    Swal.fire({ title:"Đã xoá!", text:"Kỷ niệm đã được xoá.", icon:"success", timer:1500, showConfirmButton:false });
  }
}

// ── Form: Video ────────────────────────────────────────
function openVideoForm() { document.getElementById("videoFormTitle").innerText = "Thêm video"; document.getElementById("videoFormOverlay").style.display = "flex"; }
function closeVideoForm() {
  document.getElementById("videoFormOverlay").style.display = "none";
  document.getElementById("videoId").value = ""; document.getElementById("videoTitle").value = "";
  videoDatePicker.clear(); document.getElementById("videoDescription").value = "";
  document.getElementById("videoPreview").style.display = "none"; document.getElementById("videoPreview").src = "";
  document.getElementById("videoFile").value = "";
}
function editVideo(video) {
  openVideoForm();
  document.getElementById("videoFormTitle").innerText = "Sửa video ✦";
  document.getElementById("videoId").value = video.id;
  document.getElementById("videoTitle").value = video.title;
  videoDatePicker.setDate(new Date(video.date), true);
  document.getElementById("videoDescription").value = video.description || "";
}
function previewVideo(event) {
  const file = event.target.files[0];
  if (file) { const vp = document.getElementById("videoPreview"); vp.src = URL.createObjectURL(file); vp.style.display = "block"; }
}
async function saveVideo() {
  const id = document.getElementById("videoId").value;
  const title = document.getElementById("videoTitle").value.trim();
  const date  = document.getElementById("videoDate").value;
  if (!title || !date) { Swal.fire({ icon:"warning", title:"Thiếu thông tin", text:"Vui lòng nhập tiêu đề và ngày nhé ♥" }); return; }
  const [day, month, year] = date.split("/");
  const formData = new FormData();
  formData.append("title", title); formData.append("date", `${year}-${month}-${day}`);
  formData.append("description", document.getElementById("videoDescription").value);
  const vf = document.getElementById("videoFile").files[0];
  if (vf) formData.append("video", vf);

  if (!id && !vf) { Swal.fire({ icon:"warning", title:"Chưa chọn video", text:"Vui lòng chọn file video nhé ♥" }); return; }

  // Hiện loading khi đang upload lên Cloudinary
  const loadingSwal = Swal.fire({
    title: vf ? "Đang upload video... ♥" : "Đang lưu...",
    text: vf ? "Video đang được tải lên Cloudinary, vui lòng chờ nhé!" : "",
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    let resp;
    if (id) {
      resp = await fetch(`${VIDEO_API_URL}/${id}`, { method:"PUT", body:formData });
    } else {
      resp = await fetch(VIDEO_API_URL, { method:"POST", body:formData });
    }
    Swal.close();
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      Swal.fire({ icon:"error", title:"Lỗi upload!", text: err.error || "Không thể lưu video. Kiểm tra server nhé." });
      return;
    }
    closeVideoForm();
    loadVideos();
  } catch {
    Swal.close();
    Swal.fire({ icon:"error", title:"Lỗi rồi!", text:"Không thể lưu. Kiểm tra server nhé." });
  }
}
async function deleteVideo(id) {
  const result = await Swal.fire({ title:"Xoá video này?", text:"Sẽ không thể khôi phục lại được đâu nhé 💔", icon:"warning", showCancelButton:true, confirmButtonText:"Xoá đi", cancelButtonText:"Giữ lại ♥", reverseButtons:true });
  if (result.isConfirmed) {
    const card = document.querySelector(`.video-card[data-id="${id}"]`);
    if (card) { card.style.transition = "all 0.35s ease"; card.style.opacity = "0"; card.style.transform = (card.style.transform||"") + " scale(0.85)"; setTimeout(() => card.remove(), 360); }
    delete videoPositions[id];
    try { await fetch(`${VIDEO_API_URL}/${id}`, { method:"DELETE" }); socket.emit("deleteVideo", { id }); } catch { console.error("Delete failed"); }
    Swal.fire({ title:"Đã xoá!", text:"Video đã được xoá.", icon:"success", timer:1500, showConfirmButton:false });
  }
}

// ── Close overlay khi click ngoài ─────────────────────
document.getElementById("memoryFormOverlay").addEventListener("click", function(e) { if (e.target === this) closeForm(); });
document.getElementById("videoFormOverlay").addEventListener("click", function(e) { if (e.target === this) closeVideoForm(); });

loadMemories();

// ═══════════════════════════════════════════════════
//  LOCKET-STYLE CAMERA — rewritten fullscreen
// ═══════════════════════════════════════════════════
(function() {

  // ── State ──────────────────────────────────────────
  let stream       = null;
  let facingMode   = "user";      // "user" | "environment"
  let currentFilter = "none";
  let capturedBlob  = null;
  let timerMode     = 0;          // 0 | 3 | 10
  let timerCountdown = null;
  let capDatePicker  = null;

  const $ = id => document.getElementById(id);

  const FILTER_CLASS = {
    none:"", warm:"filter-warm", cool:"filter-cool",
    rosy:"filter-rosy", vintage:"filter-vintage",
    bw:"filter-bw", dreamy:"filter-dreamy"
  };
  const CANVAS_FILTER = {
    none:"none",
    warm:"saturate(1.3) sepia(0.25) brightness(1.05)",
    cool:"saturate(0.9) hue-rotate(20deg) brightness(1.02)",
    rosy:"saturate(1.4) hue-rotate(-15deg) brightness(1.05)",
    vintage:"sepia(0.5) contrast(0.9) brightness(0.95) saturate(0.8)",
    bw:"grayscale(1) contrast(1.1)",
    dreamy:"brightness(1.1) saturate(1.2) contrast(0.9)"
  };

  // ── Public: called by switchTab ────────────────────
  window.initCamera = async function() {
    if (stream) return;

    // Init date picker for caption
    if (!capDatePicker) {
      capDatePicker = flatpickr("#locCapDate", {
        dateFormat: "d/m/Y",
        defaultDate: new Date(),
        allowInput: false
      });
    }

    const vf = $("locViewfinder");
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false
      });
      const video = $("locVideo");
      video.srcObject = stream;
      // Mirror front cam via CSS class (keeps pointer-events intact)
      applyMirror();
      goLive();
    } catch(err) {
      console.warn("[CAM] getUserMedia failed:", err.name, err.message);
      vf.innerHTML = `
        <div class="loc-no-camera">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
          <p>Không thể truy cập camera 😢</p>
          <small>Kiểm tra quyền camera trong trình duyệt nhé</small>
        </div>`;
    }
  };

  window.stopCamera = function() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    clearCountdown();
  };

  // ── UI states ──────────────────────────────────────
  function goLive() {
    $("locVideo").style.display          = "block";
    $("locPreviewOverlay").style.display = "none";
    $("locFilterStrip").style.display    = "flex";
    $("locControls").style.display       = "flex";
    $("locPreviewControls").style.display= "none";
    $("locCaptionSheet").style.display   = "none";
    capturedBlob = null;
    applyFilterVideo(currentFilter);
  }

  function goPreview(blobUrl) {
    $("locVideo").style.display          = "none";
    $("locPreviewOverlay").style.display = "block";
    $("locPreviewImg").src               = blobUrl;
    applyFilterImg(currentFilter);
    $("locFilterStrip").style.display    = "flex";  // still let them change filter
    $("locControls").style.display       = "none";
    $("locPreviewControls").style.display= "flex";
    $("locCaptionSheet").style.display   = "none";
  }

  function goCaption(blobUrl) {
    $("locCaptionThumbImg").src = blobUrl;
    $("locCaptionSheet").style.display = "flex";
    if (capDatePicker) capDatePicker.setDate(new Date());
  }

  // ── Filters ────────────────────────────────────────
  function applyFilterVideo(f) {
    const v = $("locVideo");
    v.className = FILTER_CLASS[f] ? FILTER_CLASS[f] : "";
    if (facingMode === "user") v.classList.add("mirrored");
  }
  function applyFilterImg(f) {
    const img = $("locPreviewImg");
    img.className = FILTER_CLASS[f] || "";
    // also update thumb in caption sheet
    const th = $("locCaptionThumbImg");
    if (th) th.className = img.className;
  }
  function applyMirror() {
    const v = $("locVideo");
    if (facingMode === "user") v.classList.add("mirrored");
    else v.classList.remove("mirrored");
  }

  // Filter chip clicks
  document.addEventListener("click", e => {
    const chip = e.target.closest(".loc-filter-chip");
    if (!chip) return;
    currentFilter = chip.dataset.filter || "none";
    document.querySelectorAll(".loc-filter-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    applyFilterVideo(currentFilter);
    if ($("locPreviewImg").src) applyFilterImg(currentFilter);
  });

  // ── Flip ───────────────────────────────────────────
  $("locFlipBtn").addEventListener("click", async () => {
    if (!stream) return;
    const btn = $("locFlipBtn");
    btn.classList.add("spinning");
    setTimeout(() => btn.classList.remove("spinning"), 420);

    stream.getTracks().forEach(t => t.stop());
    stream = null;
    facingMode = facingMode === "user" ? "environment" : "user";

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false
      });
      $("locVideo").srcObject = stream;
      applyMirror();
    } catch(err) { console.warn("[CAM FLIP]", err); }
  });

  // ── Timer ──────────────────────────────────────────
  $("locTimerBtn").addEventListener("click", () => {
    const cycle = [0, 3, 10];
    timerMode = cycle[(cycle.indexOf(timerMode) + 1) % cycle.length];
    $("locTimerLabel").textContent = timerMode === 0 ? "Tắt" : timerMode + "s";
    $("locTimerBtn").classList.toggle("active-timer", timerMode > 0);
  });

  function clearCountdown() {
    if (timerCountdown) { clearInterval(timerCountdown); timerCountdown = null; }
    const badge = $("locTimerBadge");
    if (badge) badge.style.display = "none";
  }

  // ── Shutter ────────────────────────────────────────
  $("locShutter").addEventListener("click", () => {
    if (!stream) return;
    if (timerMode > 0) {
      runTimer(timerMode);
    } else {
      snap();
    }
  });

  function runTimer(secs) {
    clearCountdown();
    let n = secs;
    const badge = $("locTimerBadge");
    badge.textContent = n;
    badge.style.display = "block";
    // restart CSS animation each tick
    const pulse = () => {
      badge.style.animation = "none";
      void badge.offsetWidth;
      badge.style.animation = "loc-badge-pop 1s ease";
    };
    pulse();
    timerCountdown = setInterval(() => {
      n--;
      if (n <= 0) {
        clearCountdown();
        snap();
      } else {
        badge.textContent = n;
        pulse();
      }
    }, 1000);
  }

  function snap() {
    const video  = $("locVideo");
    const canvas = $("locCanvas");

    // Flash
    const flash = $("locFlash");
    flash.classList.remove("firing");
    void flash.offsetWidth;
    flash.classList.add("firing");

    const vw = video.videoWidth  || 640;
    const vh = video.videoHeight || 480;
    // Square crop from center
    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2;
    const sy = (vh - side) / 2;

    canvas.width  = side;
    canvas.height = side;
    const ctx = canvas.getContext("2d");

    // Apply CSS filter baked into canvas
    ctx.filter = CANVAS_FILTER[currentFilter] || "none";

    // Mirror front cam in canvas too
    if (facingMode === "user") {
      ctx.translate(side, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, side, side, 0, 0, side, side);
    if (facingMode === "user") ctx.setTransform(1,0,0,1,0,0);

    canvas.toBlob(blob => {
      capturedBlob = blob;
      const url = URL.createObjectURL(blob);
      goPreview(url);
    }, "image/jpeg", 0.92);
  }

  // ── Retake ─────────────────────────────────────────
  $("locRetakeBtn").addEventListener("click", () => {
    URL.revokeObjectURL($("locPreviewImg").src);
    goLive();
  });

  // ── "Use this photo" → open caption sheet ──────────
  $("locSaveBtn").addEventListener("click", () => {
    goCaption($("locPreviewImg").src);
  });

  // ── Gallery picker ─────────────────────────────────
  $("locGalleryBtn").addEventListener("click", () => $("locGalleryInput").click());
  $("locGalleryInput").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    capturedBlob = file;
    const url = URL.createObjectURL(file);
    goPreview(url);
    e.target.value = "";
  });

  // ── Cancel caption ─────────────────────────────────
  $("locCancelCaption").addEventListener("click", () => {
    $("locCaptionSheet").style.display = "none";
  });

  // ── Confirm save → POST /memories ─────────────────
  $("locConfirmSave").addEventListener("click", async () => {
    if (!capturedBlob) return;

    const rawTitle = $("locCapTitle").value.trim() || "Khoảnh khắc của chúng mình ♥";
    const rawDate  = $("locCapDate").value.trim();
    const desc     = $("locCapDesc").value.trim();

    if (!rawDate) {
      Swal.fire({ icon:"warning", title:"Chưa có ngày", text:"Chọn ngày nhé ♥" });
      return;
    }

    // dd/mm/yyyy → yyyy-mm-dd
    const [dd, mm, yyyy] = rawDate.split("/");
    const isoDate = `${yyyy}-${mm}-${dd}`;

    const fd = new FormData();
    fd.append("title", rawTitle);
    fd.append("date",  isoDate);
    fd.append("description", desc);
    fd.append("image", capturedBlob, "camera.jpg");

    Swal.fire({
      title: "Đang lưu ảnh... ♥",
      text:  "Upload lên Cloudinary",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const resp = await fetch(`${BASE_URL}/memories`, { method:"POST", body:fd });
      Swal.close();
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        Swal.fire({ icon:"error", title:"Lỗi!", text: err.error || "Không thể lưu." });
        return;
      }
      // Reset form fields
      $("locCapTitle").value = "";
      $("locCapDesc").value  = "";
      URL.revokeObjectURL($("locPreviewImg").src);
      goLive();

      Swal.fire({
        icon:"success", title:"Đã lưu! ♥",
        text:"Ảnh đã được thêm vào Kỷ niệm~",
        timer:1800, showConfirmButton:false
      }).then(() => {
        switchTab("photos");
        loadMemories();
      });
    } catch {
      Swal.close();
      Swal.fire({ icon:"error", title:"Lỗi rồi!", text:"Kiểm tra kết nối server nhé." });
    }
  });

})();
