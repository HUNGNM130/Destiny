const BASE_URL = "https://destiny-s88d.onrender.com";

const API_URL = `${BASE_URL}/memories`;
const VIDEO_API_URL = `${BASE_URL}/videos`;
const socket = io(BASE_URL);

// ── Flatpickr ──────────────────────────────────────────
const datePicker = flatpickr("#date", {
  dateFormat: "d/m/Y", allowInput: false, locale: { firstDayOfWeek: 1 }
});
const videoDatePicker = flatpickr("#videoDate", {
  dateFormat: "d/m/Y", allowInput: false, locale: { firstDayOfWeek: 1 }
});

// ── Tab ────────────────────────────────────────────────
let currentTab = "photos";

function switchTab(tab) {
  currentTab = tab;
  document.getElementById("pagePhotos").style.display = tab === "photos" ? "block" : "none";
  document.getElementById("pageVideos").style.display = tab === "videos" ? "block" : "none";
  document.getElementById("tabPhotos").classList.toggle("active", tab === "photos");
  document.getElementById("tabVideos").classList.toggle("active", tab === "videos");
  if (tab === "videos") loadVideos();
}

// ── Positions (in-memory, sync lên DB) ────────────────
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

  const p = isVideo
    ? videoPositions[id]
    : positions[id];

  if (!p) return;

  socket.emit(
    isVideo ? "moveVideo" : "moveMemory",
    {
      id,
      x: p.x,
      y: p.y,
      rotate: p.rotate
    }
  );
}
async function savePosition(id, isVideo = false) {
  const store = isVideo ? videoPositions : positions;
  const p = store[id];

  if (!p) return;

  try {
    await fetch(
      `${isVideo ? VIDEO_API_URL : API_URL}/${id}/position`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          x: p.x,
          y: p.y,
          rotate: p.rotate
        })
      }
    );
  } catch (err) {
    console.error("Save position failed:", err);
  }
}
// ── Drag & Drop ────────────────────────────────────────
let dragState = null;

document.addEventListener("mousemove", (e) => {
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
  const t  = e.touches[0];
  const dx = t.clientX - dragState.startX;
  const dy = t.clientY - dragState.startY;
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
    e.preventDefault();
    document.querySelectorAll(".memory-card, .video-card").forEach(c => c.style.zIndex = 1);
    card.style.zIndex = 100;
    card.classList.add("dragging");
    const store = isVideo ? videoPositions : positions;
    dragState = { card, id, isVideo, startX: e.clientX, startY: e.clientY, origX: store[id].x, origY: store[id].y, moved: false };
  });
  card.addEventListener("touchstart", (e) => {
    if (e.target.tagName === "BUTTON") return;
    const t = e.touches[0];
    card.style.zIndex = 100;
    card.classList.add("dragging");
    const store = isVideo ? videoPositions : positions;
    dragState = { card, id, isVideo, startX: t.clientX, startY: t.clientY, origX: store[id].x, origY: store[id].y, moved: false };
  }, { passive: true });
}

// ── Cropper ────────────────────────────────────────────
let cropper     = null;
let croppedBlob = null;

function onImageSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  croppedBlob = null;
  const preview = document.getElementById("preview");
  preview.style.display = "none";
  preview.src = "";

  if (cropper) { cropper.destroy(); cropper = null; }

  const reader = new FileReader();
  reader.onload = (e) => {
    const cropperImg = document.getElementById("cropperImg");

    // Ẩn wrapper, reset src để Cropper không bị kẹt kích thước cũ
    document.getElementById("cropperWrapper").style.display = "none";
    cropperImg.src = "";

    // Đợi ảnh load thật sự xong rồi mới init Cropper
    cropperImg.onload = () => {
      document.getElementById("cropperWrapper").style.display = "block";
      cropper = new Cropper(cropperImg, {
        viewMode: 1,
        autoCropArea: 0.85,
        movable: true,
        zoomable: true,
        rotatable: false,
        scalable: false,
        background: false,
        responsive: true,
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
    preview.src   = url;
    preview.style.display = "block";
    document.getElementById("cropperWrapper").style.display = "none";
    cropper.destroy();
    cropper = null;
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
// ── SOCKET REALTIME ──────────────────────────

socket.on("memoryMoved", (data) => {
  const card = document.querySelector(
    `.memory-card[data-id="${data.id}"]`
  );

  if (!card) return;

  positions[data.id] = {
    x: data.x,
    y: data.y,
    rotate: data.rotate
  };

  card.style.transition = "none";
  card.style.left = data.x + "px";
  card.style.top = data.y + "px";
  card.style.transform = `rotate(${data.rotate}deg)`;
});

socket.on("videoMoved", (data) => {
  const cards = document.querySelectorAll(".video-card");

  let target = null;

  cards.forEach((c) => {
    const btn = c.querySelector(".delete-btn");

    if (
      btn &&
      btn.getAttribute("onclick")?.includes(`(${data.id})`)
    ) {
      target = c;
    }
  });

  if (!target) return;

  videoPositions[data.id] = {
    x: data.x,
    y: data.y,
    rotate: data.rotate
  };

  target.style.left = data.x + "px";
  target.style.top = data.y + "px";
  target.style.transform = `rotate(${data.rotate}deg)`;
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
  card.style.transform = (card.style.transform || "") + " scale(0.85)";
  setTimeout(() => card.remove(), 360);
});
// ── Load Memories ──────────────────────────────────────
async function loadMemories() {
  const container = document.getElementById("memoryContainer");
  container.innerHTML = '<div class="loading">đang tải những kỷ niệm... ♥</div>';
  try {
    const res      = await fetch(API_URL);
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
      const card = document.createElement("div");
      card.className = "memory-card";
      card.dataset.id = memory.id;
      const pos = getInitialPos(memory, index, cols);
      positions[memory.id] = pos;
      if (memory.pos_x == null) savePosition(memory.id);
      card.style.left      = pos.x + "px";
      card.style.top       = pos.y + "px";
      card.style.transform = `rotate(${pos.rotate}deg)`;
      card.style.zIndex    = 1;
      const d       = new Date(memory.date);
      const dateStr = d.toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" });
      card.innerHTML = `
        ${memory.image
  ? `<img src="${memory.image}?t=${Date.now()}" alt="${memory.title}" loading="lazy"/>`
          : `<div style="width:100%;aspect-ratio:1/1;background:var(--warm);display:flex;align-items:center;justify-content:center;font-size:3rem;">♥</div>`
        }
        <div class="card-body">
          <div class="card-title">${memory.title}</div>
          <div class="card-date">📅 ${dateStr}</div>
          ${memory.description ? `<div class="card-desc">${memory.description}</div>` : ""}
          <div class="card-actions">
            <button class="edit-btn"   onclick='editMemory(${JSON.stringify(memory)})'>✏️ Sửa</button>
            <button class="delete-btn" onclick='deleteMemory(${memory.id})'>🗑 Xoá</button>
          </div>
        </div>`;
      container.appendChild(card);
      makeDraggable(card, memory.id, false);
    });
  } catch {
    document.getElementById("memoryContainer").innerHTML = `<div class="empty-state"><span class="big-heart">😢</span><h2>Không thể kết nối server</h2><p>Hãy đảm bảo server đang chạy tại localhost:3000</p></div>`;
  }
}

// ── Load Videos ────────────────────────────────────────
async function loadVideos() {
  const container = document.getElementById("videoContainer");
  container.innerHTML = '<div class="loading">đang tải video... ♥</div>';
  try {
    const res    = await fetch(VIDEO_API_URL);
    const videos = await res.json();
    container.innerHTML = "";
    if (videos.length === 0) {
      container.innerHTML = `<div class="empty-state"><span class="big-heart">🎬</span><h2>Chưa có video nào</h2><p>Hãy thêm video đầu tiên của hai đứa nhé ♥</p></div>`;
      return;
    }
    const cols = Math.floor((window.innerWidth - 40) / 240) || 3;
    const rows = Math.ceil(videos.length / cols);
    container.style.minHeight = (rows * 360 + 100) + "px";

    videos.forEach((video, index) => {
      const card = document.createElement("div");
      card.className = "video-card";
      card.dataset.id = video.id;
      const pos = getInitialPos(video, index, cols);
      videoPositions[video.id] = pos;
      if (video.pos_x == null) savePosition(video.id, true);
      card.style.left      = pos.x + "px";
      card.style.top       = pos.y + "px";
      card.style.transform = `rotate(${pos.rotate}deg)`;
      card.style.zIndex    = 1;
      const d       = new Date(video.date);
      const dateStr = d.toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" });
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
  } catch {
    document.getElementById("videoContainer").innerHTML = `<div class="empty-state"><span class="big-heart">😢</span><h2>Không thể kết nối server</h2></div>`;
  }
}

// ── Video fullscreen player ────────────────────────────
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
  document.getElementById("title").value = memory.title;
  datePicker.setDate(new Date(memory.date), true);
  document.getElementById("description").value = memory.description || "";
  if (memory.image) {
    const preview = document.getElementById("preview");
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
    // Xoá DOM ngay lập tức (không reload toàn bộ)
    const card = document.querySelector(`.memory-card[data-id="${id}"]`);
    if (card) {
      card.style.transition = "all 0.35s ease";
      card.style.opacity = "0";
      card.style.transform = (card.style.transform || "") + " scale(0.85)";
      setTimeout(() => card.remove(), 360);
    }
    delete positions[id];

    // Xoá DB + broadcast cho máy khác
    try {
      await fetch(`${API_URL}/${id}`, { method:"DELETE" });
      socket.emit("deleteMemory", { id });
    } catch {
      console.error("Delete failed");
    }

    Swal.fire({ title:"Đã xoá!", text:"Kỷ niệm đã được xoá.", icon:"success", timer: 1500, showConfirmButton: false });
  }
}

// ── Form: Video ────────────────────────────────────────
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
  document.getElementById("videoId").value = video.id;
  document.getElementById("videoTitle").value = video.title;
  videoDatePicker.setDate(new Date(video.date), true);
  document.getElementById("videoDescription").value = video.description || "";
}
function previewVideo(event) {
  const file = event.target.files[0];
  if (file) {
    const vp   = document.getElementById("videoPreview");
    vp.src     = URL.createObjectURL(file);
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
  formData.append("date", `${year}-${month}-${day}`);
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
    // Xoá DOM ngay lập tức (không reload toàn bộ)
    const card = document.querySelector(`.video-card[data-id="${id}"]`);
    if (card) {
      card.style.transition = "all 0.35s ease";
      card.style.opacity = "0";
      card.style.transform = (card.style.transform || "") + " scale(0.85)";
      setTimeout(() => card.remove(), 360);
    }
    delete videoPositions[id];

    // Xoá DB + broadcast cho máy khác
    try {
      await fetch(`${VIDEO_API_URL}/${id}`, { method:"DELETE" });
      socket.emit("deleteVideo", { id });
    } catch {
      console.error("Delete failed");
    }

    Swal.fire({ title:"Đã xoá!", text:"Video đã được xoá.", icon:"success", timer: 1500, showConfirmButton: false });
  }
}

// ── Close overlay khi click ngoài ─────────────────────
document.getElementById("memoryFormOverlay").addEventListener("click", function(e) {
  if (e.target === this) closeForm();
});
document.getElementById("videoFormOverlay").addEventListener("click", function(e) {
  if (e.target === this) closeVideoForm();
});

loadMemories();