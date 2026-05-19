const BASE_URL =
  window.location.origin.includes("localhost")
    ? "http://localhost:3000"
    : window.location.origin;
const API_URL       = `${BASE_URL}/memories`;
const VIDEO_API_URL = `${BASE_URL}/videos`;
const MUSIC_API_URL = `${BASE_URL}/musics`;
const socket = io(BASE_URL);

// ══════════════════════════════════════════════════════
//  1. LOVE COUNTER
// ══════════════════════════════════════════════════════
// Đổi ngày này thành ngày bắt đầu yêu nhau của hai bạn
const LOVE_START = new Date("2023-02-14T00:00:00");

function updateCounter() {
  const now  = new Date();
  const diff = now - LOVE_START;
  if (diff < 0) return;

  const totalSecs  = Math.floor(diff / 1000);
  const secs       = totalSecs % 60;
  const totalMins  = Math.floor(totalSecs / 60);
  const mins       = totalMins % 60;
  const totalHours = Math.floor(totalMins / 60);
  const hours      = totalHours % 24;
  const days       = Math.floor(totalHours / 24);

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    const padded = String(val).padStart(2, "0");
    if (el.textContent !== padded) {
      el.textContent = padded;
      el.classList.remove("bump");
      void el.offsetWidth; // reflow
      el.classList.add("bump");
      setTimeout(() => el.classList.remove("bump"), 200);
    }
  };

  set("cDays",  days);
  set("cHours", hours);
  set("cMins",  mins);
  set("cSecs",  secs);
}
updateCounter();
setInterval(updateCounter, 1000);

// ══════════════════════════════════════════════════════
//  2. MUSIC PLAYER
// ══════════════════════════════════════════════════════
let audio       = new Audio();
let musicLoaded = false;
let musicPlaying = false;

document.getElementById("musicToggleBtn").addEventListener("click", () => {
  if (!musicLoaded) {
    document.getElementById("musicPanel").classList.toggle("open");
    return;
  }
  toggleMusic();
});

function loadMusic(event) {
  const file = event.target.files[0];
  if (!file) return;
  audio.src = URL.createObjectURL(file);
  audio.loop = true;
  musicLoaded = true;
  document.getElementById("musicTrackName").textContent = file.name;
  document.getElementById("musicPanel").classList.remove("open");
  audio.play();
  musicPlaying = true;
  document.getElementById("musicToggleBtn").classList.add("playing");
  document.getElementById("musicToggleBtn").textContent = "⏸";
}

function toggleMusic() {
  if (!musicLoaded) {
    document.getElementById("musicPanel").classList.toggle("open");
    return;
  }
  if (musicPlaying) {
    audio.pause();
    musicPlaying = false;
    document.getElementById("musicToggleBtn").classList.remove("playing");
    document.getElementById("musicToggleBtn").textContent = "🎵";
  } else {
    audio.play();
    musicPlaying = true;
    document.getElementById("musicToggleBtn").classList.add("playing");
    document.getElementById("musicToggleBtn").textContent = "⏸";
  }
}

// ══════════════════════════════════════════════════════
//  FLATPICKR
// ══════════════════════════════════════════════════════
const datePicker = flatpickr("#date", {
  dateFormat: "d/m/Y", allowInput: false, locale: { firstDayOfWeek: 1 }
});
const videoDatePicker = flatpickr("#videoDate", {
  dateFormat: "d/m/Y", allowInput: false, locale: { firstDayOfWeek: 1 }
});

// ══════════════════════════════════════════════════════
//  TAB
// ══════════════════════════════════════════════════════
let currentTab = "photos";

function switchTab(tab) {
  currentTab = tab;
  document.getElementById("pagePhotos").style.display = tab === "photos" ? "block" : "none";
  document.getElementById("pageVideos").style.display = tab === "videos" ? "block" : "none";
  document.getElementById("tabPhotos").classList.toggle("active", tab === "photos");
  document.getElementById("tabVideos").classList.toggle("active", tab === "videos");
  if (tab === "videos") loadVideos();
}

// ══════════════════════════════════════════════════════
//  3. FILTER + SORT + PAGINATION (ảnh)
// ══════════════════════════════════════════════════════
const PAGE_SIZE = 12;
let allMemories   = [];
let filteredMems  = [];
let currentPhotoPage = 1;

function buildMonthYearOptions(items, monthSel, yearSel) {
  const months = new Set();
  const years  = new Set();
  items.forEach(m => {
    const d = new Date(m.date);
    months.add(d.getMonth() + 1);
    years.add(d.getFullYear());
  });
  const mOpts = monthSel.querySelectorAll("option:not(:first-child)");
  mOpts.forEach(o => o.remove());
  const yOpts = yearSel.querySelectorAll("option:not(:first-child)");
  yOpts.forEach(o => o.remove());

  [...months].sort((a,b) => a-b).forEach(m => {
    const o = document.createElement("option");
    o.value = m; o.textContent = `Tháng ${m}`;
    monthSel.appendChild(o);
  });
  [...years].sort((a,b) => b-a).forEach(y => {
    const o = document.createElement("option");
    o.value = y; o.textContent = y;
    yearSel.appendChild(o);
  });
}

function applyFilters() {
  const month = document.getElementById("filterMonth").value;
  const year  = document.getElementById("filterYear").value;
  const sort  = document.getElementById("sortOrder").value;

  filteredMems = allMemories.filter(m => {
    const d = new Date(m.date);
    if (month && (d.getMonth() + 1) != month) return false;
    if (year  && d.getFullYear() != year)      return false;
    return true;
  });

  filteredMems.sort((a, b) => {
    const da = new Date(a.date), db = new Date(b.date);
    return sort === "asc" ? da - db : db - da;
  });

  currentPhotoPage = 1;
  renderMemoriesPage();
}

function renderMemoriesPage() {
  const container  = document.getElementById("memoryContainer");
  const pagination = document.getElementById("photoPagination");
  container.innerHTML = "";

  if (!filteredMems.length) {
    container.innerHTML = `<div class="empty-state"><span class="big-heart">💌</span><h2>Không có kỷ niệm nào</h2><p>Thử thay đổi bộ lọc nhé ♥</p></div>`;
    pagination.innerHTML = "";
    return;
  }

  const totalPages = Math.ceil(filteredMems.length / PAGE_SIZE);
  const start      = (currentPhotoPage - 1) * PAGE_SIZE;
  const pageItems  = filteredMems.slice(start, start + PAGE_SIZE);

  const cols = Math.floor((window.innerWidth - 40) / 240) || 3;
  container.style.minHeight = (Math.ceil(pageItems.length / cols) * 360 + 100) + "px";

  pageItems.forEach((memory, index) => {
    const card = document.createElement("div");
    card.className  = "memory-card";
    card.dataset.id = memory.id;

    const pos = getInitialPos(memory, index, cols);
    positions[memory.id] = pos;
    if (memory.pos_x == null) savePosition(memory.id);

    card.style.left      = pos.x + "px";
    card.style.top       = pos.y + "px";
    card.style.transform = `rotate(${pos.rotate}deg)`;
    card.style.zIndex    = 1;

    const d = new Date(memory.date + "T00:00:00");
    const dateStr = d.toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" });
    const imgSrc =
  memory.image &&
  memory.image.startsWith("http")
    ? `${memory.image}?t=${Date.now()}`
    : null;

    let reactions = { "💕":0, "😍":0, "🥹":0 };

try {
  if (memory.reactions) {
    reactions = JSON.parse(memory.reactions);
  }
} catch {}

    card.innerHTML = `
      ${imgSrc
        ? `<img src="${imgSrc}" alt="${memory.title}" loading="lazy"
               onclick="openLightbox(${memory.id})" style="cursor:zoom-in;" />`
        : `<div style="width:100%;aspect-ratio:1/1;background:var(--warm);display:flex;align-items:center;justify-content:center;font-size:3rem;">♥</div>`
      }
      <div class="card-body">
        <div class="card-title">${memory.title}</div>
        <div class="card-date">📅 ${dateStr}</div>
        ${memory.description ? `<div class="card-desc">${memory.description}</div>` : ""}
        <div class="card-reactions">
          ${Object.entries(reactions).map(([emoji, count]) =>
            `<button class="reaction-btn" onclick="addReaction(${memory.id},'${emoji}',this)">
               ${emoji} <span class="r-count">${count}</span>
             </button>`
          ).join("")}
        </div>
        <div class="card-actions">
          <button class="edit-btn"   onclick='editMemory(${JSON.stringify(memory)})'>✏️ Sửa</button>
          <button class="delete-btn" onclick='deleteMemory(${memory.id})'>🗑 Xoá</button>
        </div>
      </div>`;

    container.appendChild(card);
    makeDraggable(card, memory.id, false);
  });

  // Render pagination
  renderPagination(pagination, currentPhotoPage, totalPages, (p) => {
    currentPhotoPage = p;
    renderMemoriesPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ══════════════════════════════════════════════════════
//  3b. FILTER + SORT + PAGINATION (video)
// ══════════════════════════════════════════════════════
let allVideos      = [];
let filteredVideos = [];
let currentVideoPage = 1;

function applyVideoFilters() {
  const month = document.getElementById("filterVideoMonth").value;
  const year  = document.getElementById("filterVideoYear").value;
  const sort  = document.getElementById("sortVideoOrder").value;

  filteredVideos = allVideos.filter(v => {
    const d = new Date(v.date);
    if (month && (d.getMonth() + 1) != month) return false;
    if (year  && d.getFullYear() != year)      return false;
    return true;
  });

  filteredVideos.sort((a, b) => {
    const da = new Date(a.date), db = new Date(b.date);
    return sort === "asc" ? da - db : db - da;
  });

  currentVideoPage = 1;
  renderVideosPage();
}

function renderVideosPage() {
  const container  = document.getElementById("videoContainer");
  const pagination = document.getElementById("videoPagination");
  container.innerHTML = "";

  if (!filteredVideos.length) {
    container.innerHTML = `<div class="empty-state"><span class="big-heart">🎬</span><h2>Không có video nào</h2><p>Thử thay đổi bộ lọc nhé ♥</p></div>`;
    pagination.innerHTML = "";
    return;
  }

  const totalPages = Math.ceil(filteredVideos.length / PAGE_SIZE);
  const start      = (currentVideoPage - 1) * PAGE_SIZE;
  const pageItems  = filteredVideos.slice(start, start + PAGE_SIZE);

  const cols = Math.floor((window.innerWidth - 40) / 240) || 3;
  container.style.minHeight = (Math.ceil(pageItems.length / cols) * 360 + 100) + "px";

  pageItems.forEach((video, index) => {
    const card = document.createElement("div");
    card.className  = "video-card";
    card.dataset.id = video.id;

    const pos = getInitialPos(video, index, cols);
    videoPositions[video.id] = pos;
    if (video.pos_x == null) savePosition(video.id, true);

    card.style.left      = pos.x + "px";
    card.style.top       = pos.y + "px";
    card.style.transform = `rotate(${pos.rotate}deg)`;
    card.style.zIndex    = 1;

    const d        = new Date(video.date);
    const dateStr  = d.toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" });
    const videoSrc = `${BASE_URL}/videos-file/${video.filename}`;

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

    container.appendChild(card);
    makeDraggable(card, video.id, true);
  });

  renderPagination(pagination, currentVideoPage, totalPages, (p) => {
    currentVideoPage = p;
    renderVideosPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ── Generic pagination renderer ────────────────────────
function renderPagination(container, current, total, onPage) {
  container.innerHTML = "";
  if (total <= 1) return;

  const mkBtn = (label, page, disabled = false, active = false) => {
    const b = document.createElement("button");
    b.className = "page-btn" + (active ? " active" : "");
    b.textContent = label;
    b.disabled = disabled;
    if (!disabled) b.onclick = () => onPage(page);
    container.appendChild(b);
  };

  mkBtn("← Trước", current - 1, current === 1);

  for (let i = 1; i <= total; i++) {
    if (total > 7 && Math.abs(i - current) > 2 && i !== 1 && i !== total) {
      if (i === 2 || i === total - 1) {
        const dots = document.createElement("span");
        dots.textContent = "…";
        dots.style.cssText = "padding:8px 4px;color:var(--faded);";
        container.appendChild(dots);
      }
      continue;
    }
    mkBtn(i, i, false, i === current);
  }

  mkBtn("Sau →", current + 1, current === total);
}

// ══════════════════════════════════════════════════════
//  4. LIGHTBOX
// ══════════════════════════════════════════════════════
let lightboxItems = []; // [{id, src, title, date}]
let lightboxIdx   = 0;

function buildLightboxItems() {
  lightboxItems = filteredMems
    .filter(m => m.image)
    .map(m => ({
      id:    m.id,
      src:   m.image,
      title: m.title,
      date:  new Date(m.date).toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" })
    }));
}

function openLightbox(memoryId) {
  buildLightboxItems();
  const idx = lightboxItems.findIndex(i => i.id === memoryId);
  if (idx === -1) return;
  lightboxIdx = idx;
  showLightboxSlide();
  document.getElementById("lightbox").classList.add("open");
  document.body.style.overflow = "hidden";
}

function showLightboxSlide() {
  const item = lightboxItems[lightboxIdx];
  if (!item) return;
  const img  = document.getElementById("lightboxImg");
  img.style.opacity = "0";
  img.src = item.src;
  img.onload = () => { img.style.opacity = "1"; };
  document.getElementById("lightboxTitle").textContent = item.title;
  document.getElementById("lightboxDate").textContent  = "📅 " + item.date;
}

function lightboxPrev() {
  if (!lightboxItems.length) return;
  lightboxIdx = (lightboxIdx - 1 + lightboxItems.length) % lightboxItems.length;
  showLightboxSlide();
}

function lightboxNext() {
  if (!lightboxItems.length) return;
  lightboxIdx = (lightboxIdx + 1) % lightboxItems.length;
  showLightboxSlide();
}

function closeLightbox() {
  document.getElementById("lightbox").classList.remove("open");
  document.body.style.overflow = "";
}

// Keyboard navigation for lightbox
document.addEventListener("keydown", (e) => {
  const lb = document.getElementById("lightbox");
  if (!lb.classList.contains("open")) return;
  if (e.key === "ArrowLeft")  lightboxPrev();
  if (e.key === "ArrowRight") lightboxNext();
  if (e.key === "Escape")     closeLightbox();
});

// Click outside lightbox image to close
document.getElementById("lightbox").addEventListener("click", function(e) {
  if (e.target === this) closeLightbox();
});

// ══════════════════════════════════════════════════════
//  8. REACTIONS
// ══════════════════════════════════════════════════════
async function addReaction(memoryId, emoji, btn) {
  try {
    const res  = await fetch(`${API_URL}/${memoryId}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji })
    });
    const data = await res.json();
    if (data.count !== undefined) {
      btn.querySelector(".r-count").textContent = data.count;
      btn.classList.add("active");
      setTimeout(() => btn.classList.remove("active"), 600);
    }
  } catch {
    // Offline fallback — optimistic update
    const countEl = btn.querySelector(".r-count");
    countEl.textContent = parseInt(countEl.textContent || 0) + 1;
    btn.classList.add("active");
    setTimeout(() => btn.classList.remove("active"), 600);
  }
}

// ══════════════════════════════════════════════════════
//  POSITIONS (in-memory, sync lên DB)
// ══════════════════════════════════════════════════════
let positions      = {};
let videoPositions = {};

function randomRotate() {
  return parseFloat((Math.random() * 10 - 5).toFixed(2));
}

function getInitialPos(item, index, cols) {
  if (item.pos_x != null) return { x: item.pos_x, y: item.pos_y, rotate: item.pos_rotate };
  const c = index % cols;
  const r = Math.floor(index / cols);
  return {
    x:      20 + c * 240 + (Math.random() * 20 - 10),
    y:      20 + r * 340 + (Math.random() * 20 - 10),
    rotate: randomRotate()
  };
}

function emitMove(id, isVideo = false) {
  const p = isVideo ? videoPositions[id] : positions[id];
  if (!p) return;
  socket.emit(isVideo ? "moveVideo" : "moveMemory", { id, x: p.x, y: p.y, rotate: p.rotate });
}

async function savePosition(id, isVideo = false) {
  const p = isVideo ? videoPositions[id] : positions[id];
  if (!p) return;
  const url = isVideo ? `${VIDEO_API_URL}/${id}/position` : `${API_URL}/${id}/position`;
  try {
    await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x: p.x, y: p.y, rotate: p.rotate })
    });
  } catch { /* ignore */ }
}

// ══════════════════════════════════════════════════════
//  10. IMPROVED MOBILE DRAG (pointer events)
// ══════════════════════════════════════════════════════
let dragState = null;

// Unified pointer events (works for both mouse & touch)
document.addEventListener("pointermove", (e) => {
  if (!dragState) return;
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.moved = true;
  const store = dragState.isVideo ? videoPositions : positions;
  store[dragState.id].x = dragState.origX + dx;
  store[dragState.id].y = dragState.origY + dy;
  dragState.card.style.left = store[dragState.id].x + "px";
  dragState.card.style.top  = store[dragState.id].y + "px";
  emitMove(dragState.id, dragState.isVideo);
});

document.addEventListener("pointerup", () => {
  if (!dragState) return;
  dragState.card.classList.remove("dragging");
  dragState.card.releasePointerCapture?.(dragState.pointerId);
  const store = dragState.isVideo ? videoPositions : positions;
  dragState.card.style.transform = `rotate(${store[dragState.id].rotate}deg)`;
  if (dragState.moved) savePosition(dragState.id, dragState.isVideo);
  dragState = null;
});

document.addEventListener("pointercancel", () => {
  if (!dragState) return;
  dragState.card.classList.remove("dragging");
  dragState = null;
});

function makeDraggable(card, id, isVideo = false) {
  card.addEventListener("pointerdown", (e) => {
    if (e.target.tagName === "BUTTON" || e.target.tagName === "IMG") {
      // Allow img click for lightbox, but only if not dragging
      if (e.target.tagName === "IMG") return; // let click fall through
      return;
    }
    e.preventDefault();
    card.setPointerCapture(e.pointerId);
    document.querySelectorAll(".memory-card, .video-card").forEach(c => c.style.zIndex = 1);
    card.style.zIndex = 100;
    card.classList.add("dragging");
    const store = isVideo ? videoPositions : positions;
    dragState = {
      card, id, isVideo,
      pointerId: e.pointerId,
      startX: e.clientX, startY: e.clientY,
      origX: store[id].x, origY: store[id].y,
      moved: false
    };
  });

  // img click → open lightbox (only if not dragged)
  const img = card.querySelector("img");
  if (img) {
    img.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      // Track for drag detection
      const sx = e.clientX, sy = e.clientY;
      const onUp = (eu) => {
        img.removeEventListener("pointerup", onUp);
        if (Math.abs(eu.clientX - sx) < 5 && Math.abs(eu.clientY - sy) < 5) {
          openLightbox(id);
        }
      };
      img.addEventListener("pointerup", onUp);
    });
  }
}

// ── SOCKET REALTIME ─────────────────────────────────────
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

// ══════════════════════════════════════════════════════
//  LOAD MEMORIES
// ══════════════════════════════════════════════════════
async function loadMemories() {
  const container = document.getElementById("memoryContainer");
  container.innerHTML = '<div class="loading">đang tải những kỷ niệm... ♥</div>';
  try {
    const res = await fetch(API_URL);
    allMemories = await res.json();

    // Build filter dropdowns
    buildMonthYearOptions(
      allMemories,
      document.getElementById("filterMonth"),
      document.getElementById("filterYear")
    );

    applyFilters();
  } catch {
    container.innerHTML = `<div class="empty-state"><span class="big-heart">😢</span><h2>Không thể kết nối server</h2><p>Hãy đảm bảo server đang chạy</p></div>`;
  }
}

// ══════════════════════════════════════════════════════
//  LOAD VIDEOS
// ══════════════════════════════════════════════════════
async function loadVideos() {
  const container = document.getElementById("videoContainer");
  container.innerHTML = '<div class="loading">đang tải video... ♥</div>';
  try {
    const res = await fetch(VIDEO_API_URL);
    allVideos = await res.json();

    buildMonthYearOptions(
      allVideos,
      document.getElementById("filterVideoMonth"),
      document.getElementById("filterVideoYear")
    );

    applyVideoFilters();
  } catch {
    container.innerHTML = `<div class="empty-state"><span class="big-heart">😢</span><h2>Không thể kết nối server</h2></div>`;
  }
}

// ── Video fullscreen player ──────────────────────────────
function playVideo(src) {
  let overlay = document.getElementById("videoOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "videoOverlay";
    overlay.innerHTML = `<video controls></video><button class="close-video" onclick="closeVideoPlayer()">✕ Đóng</button>`;
    document.body.appendChild(overlay);
  }
  overlay.querySelector("video").src = src;
  overlay.classList.add("open");
  overlay.querySelector("video").play();
}
function closeVideoPlayer() {
  const overlay = document.getElementById("videoOverlay");
  if (overlay) { overlay.classList.remove("open"); overlay.querySelector("video").pause(); }
}

// ══════════════════════════════════════════════════════
//  FORM: ẢNH
// ══════════════════════════════════════════════════════
var cropper     = null;
var croppedBlob = null;

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
      cropper = new Cropper(cropperImg, {
        viewMode: 1, autoCropArea: 0.85, movable: true,
        zoomable: true, rotatable: false, scalable: false,
        background: false, responsive: true,
      });
    };
    cropperImg.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function doCrop() {
  if (!cropper) return;
  cropper.getCroppedCanvas({ maxWidth: 1200, maxHeight: 1200 }).toBlob((blob) => {
    croppedBlob = blob;
    const url     = URL.createObjectURL(blob);
    const preview = document.getElementById("preview");
    preview.src   = url; preview.style.display = "block";
    document.getElementById("cropperWrapper").style.display = "none";
    cropper.destroy(); cropper = null;
    resetRotate();
  }, "image/jpeg", 0.9);
}

function onRotateRange(val) {
  if (!cropper) return;
  document.getElementById("rotateDeg").textContent = val + "°";
  cropper.rotateTo(Number(val));
}

function resetRotate() {
  const range = document.getElementById("rotateRange");
  const deg   = document.getElementById("rotateDeg");
  if (range) range.value = 0;
  if (deg)   deg.textContent = "0°";
  if (cropper) cropper.rotateTo(0);
}

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
  document.getElementById("preview").src = "";
  document.getElementById("preview").style.display = "none";
  document.getElementById("image").value = "";
  document.getElementById("cropperWrapper").style.display = "none";
  if (cropper) { cropper.destroy(); cropper = null; }
  croppedBlob = null;
}
function editMemory(memory) {
  openForm();
  document.getElementById("formTitle").innerText = "Sửa khoảnh khắc ✦";
  document.getElementById("memoryId").value = memory.id;
  document.getElementById("title").value    = memory.title;
  datePicker.setDate(new Date(memory.date), true);
  document.getElementById("description").value = memory.description || "";
  if (memory.image) {
    const preview = document.getElementById("preview");
    // FIX: use full cloudinary URL as-is
    preview.src = `${memory.image}?t=${Date.now()}`;
    preview.style.display = "block";
  }
}
async function saveMemory() {
  const id    = document.getElementById("memoryId").value;
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
  if (croppedBlob) {
    formData.append("image", croppedBlob, "cropped.jpg");
  } else if (document.getElementById("image").files[0]) {
    formData.append("image", document.getElementById("image").files[0]);
  }
  try {
    if (id) {
      await fetch(`${API_URL}/${id}`, { method:"PUT", body:formData });
    } else {
      await fetch(API_URL, { method:"POST", body:formData });
    }
    closeForm();
    loadMemories();
  } catch {
    Swal.fire({ icon:"error", title:"Lỗi rồi!", text:"Không thể lưu. Kiểm tra server nhé.", confirmButtonColor:"#8b3a4a" });
  }
}
async function deleteMemory(id) {
  const result = await Swal.fire({
    title: "Xoá kỷ niệm này?",
    text: "Sẽ không thể khôi phục lại được đâu nhé 💔",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Xoá đi",
    cancelButtonText: "Giữ lại ♥",
    reverseButtons: true
  });
  if (result.isConfirmed) {
    delete positions[id];
    await fetch(`${API_URL}/${id}`, { method:"DELETE" });
    loadMemories();
    Swal.fire({ title:"Đã xoá!", text:"Kỷ niệm đã được xoá.", icon:"success" });
  }
}

// ══════════════════════════════════════════════════════
//  FORM: VIDEO
// ══════════════════════════════════════════════════════
function openVideoForm() {
  document.getElementById("videoFormTitle").innerText = "Thêm video";
  document.getElementById("videoFormOverlay").style.display = "flex";
}
function closeVideoForm() {
  document.getElementById("videoFormOverlay").style.display = "none";
  document.getElementById("videoId").value = "";
  document.getElementById("videoTitle").value = "";
  videoDatePicker.clear();
  document.getElementById("videoDescription").value = "";
  document.getElementById("videoPreview").style.display = "none";
  document.getElementById("videoPreview").src = "";
  document.getElementById("videoFile").value = "";
}
function editVideo(video) {
  openVideoForm();
  document.getElementById("videoFormTitle").innerText = "Sửa video ✦";
  document.getElementById("videoId").value            = video.id;
  document.getElementById("videoTitle").value         = video.title;
  videoDatePicker.setDate(new Date(video.date), true);
  document.getElementById("videoDescription").value   = video.description || "";
}
function previewVideo(event) {
  const file = event.target.files[0];
  if (file) {
    const vp = document.getElementById("videoPreview");
    vp.src = URL.createObjectURL(file);
    vp.style.display = "block";
  }
}
async function saveVideo() {
  const id    = document.getElementById("videoId").value;
  const title = document.getElementById("videoTitle").value.trim();
  const date  = document.getElementById("videoDate").value;
  if (!title || !date) {
    Swal.fire({ icon:"warning", title:"Thiếu thông tin", text:"Vui lòng nhập tiêu đề và ngày nhé ♥" });
    return;
  }
  const [day, month, year] = date.split("/");
  const formData = new FormData();
  formData.append("title", title);
  formData.append("date",  `${year}-${month}-${day}`);
  formData.append("description", document.getElementById("videoDescription").value);
  const vf = document.getElementById("videoFile").files[0];
  if (vf) formData.append("video", vf);
  try {
    if (id) {
      await fetch(`${VIDEO_API_URL}/${id}`, { method:"PUT", body:formData });
    } else {
      if (!vf) { Swal.fire({ icon:"warning", title:"Chưa chọn video", text:"Vui lòng chọn file video nhé ♥" }); return; }
      await fetch(VIDEO_API_URL, { method:"POST", body:formData });
    }
    closeVideoForm();
    loadVideos();
  } catch {
    Swal.fire({ icon:"error", title:"Lỗi rồi!", text:"Không thể lưu. Kiểm tra server nhé." });
  }
}
async function deleteVideo(id) {
  const result = await Swal.fire({
    title: "Xoá video này?",
    text: "Sẽ không thể khôi phục lại được đâu nhé 💔",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Xoá đi",
    cancelButtonText: "Giữ lại ♥",
    reverseButtons: true
  });
  if (result.isConfirmed) {
    delete videoPositions[id];
    await fetch(`${VIDEO_API_URL}/${id}`, { method:"DELETE" });
    loadVideos();
    Swal.fire({ title:"Đã xoá!", text:"Video đã được xoá.", icon:"success" });
  }
}

// ── Close overlay khi click ngoài ────────────────────────
document.getElementById("memoryFormOverlay").addEventListener("click", function(e) {
  if (e.target === this) closeForm();
});
document.getElementById("videoFormOverlay").addEventListener("click", function(e) {
  if (e.target === this) closeVideoForm();
});

// Music panel: click ngoài để đóng
document.addEventListener("click", (e) => {
  const panel = document.getElementById("musicPanel");
  const btn   = document.getElementById("musicToggleBtn");
  if (panel.classList.contains("open") && !panel.contains(e.target) && e.target !== btn) {
    panel.classList.remove("open");
  }
});

async function loadMusicList() {

  try {

    const res = await fetch(MUSIC_API_URL);

    const musics = await res.json();

    const select =
      document.getElementById("musicSelect");

    select.innerHTML =
      `<option value="">-- Chọn nhạc --</option>`;

    musics.forEach(music => {

      const option =
        document.createElement("option");

      option.value =
        `${BASE_URL}/music-file/${music.filename}`;

      option.textContent =
        music.title || music.filename;

      select.appendChild(option);
    });

  } catch (err) {

    console.error(err);
  }
}

document
  .getElementById("musicSelect")
  .addEventListener("change", function () {

    if (!this.value) return;

    audio.src = this.value;

    audio.loop = true;

    audio.play();

    musicLoaded = true;
    musicPlaying = true;

    document
      .getElementById("musicToggleBtn")
      .textContent = "⏸";
});

// ── Start ─────────────────────────────────────────────────
loadMusicList();
loadMemories();