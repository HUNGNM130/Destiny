// ═══════════════════════════════════════════════════════
//  NEW FEATURES: Scrapbook, Floating Messages, Dynamic BG,
//  Memory Capsule, On This Day, Voice Memories,
//  Realtime Cursor, Story Mode, Spotify Card
// ═══════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────
//  1. DYNAMIC BACKGROUND (changes by time of day)
// ──────────────────────────────────────────────────────
(function initDynamicBackground() {
  const gradients = {
    dawn:    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 30%, #ff9a9e 60%, #a18cd1 100%)',
    morning: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 40%, #d4e8f5 70%, #b8d4ea 100%)',
    noon:    'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 40%, #80deea 70%, #c8e6c9 100%)',
    afternoon:'linear-gradient(135deg, #fff9c4 0%, #ffe082 40%, #ffcc02 60%, #f9a825 100%)',
    sunset:  'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 30%, #ffb347 60%, #ff6e7f 100%)',
    evening: 'linear-gradient(135deg, #2c3e50 0%, #3a1c71 40%, #d76d77 70%, #ffaf7b 100%)',
    night:   'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    midnight:'linear-gradient(135deg, #0a0a1a 0%, #1a0533 50%, #0d0d2b 100%)'
  };

  function getTimeOfDay() {
    const h = new Date().getHours();
    if (h >= 5  && h < 7)  return 'dawn';
    if (h >= 7  && h < 11) return 'morning';
    if (h >= 11 && h < 13) return 'noon';
    if (h >= 13 && h < 17) return 'afternoon';
    if (h >= 17 && h < 19) return 'sunset';
    if (h >= 19 && h < 22) return 'evening';
    if (h >= 22 || h < 2)  return 'night';
    return 'midnight';
  }

  const timeLabels = {
    dawn:'🌅 Bình minh', morning:'☀️ Buổi sáng', noon:'🌞 Buổi trưa',
    afternoon:'🌤 Buổi chiều', sunset:'🌇 Hoàng hôn', evening:'🌆 Buổi tối',
    night:'🌙 Đêm', midnight:'⭐ Nửa đêm'
  };

  // Floating particles for nighttime
  function createStars() {
    const existing = document.getElementById('dynamicStars');
    if (existing) existing.remove();
    const tod = getTimeOfDay();
    if (tod !== 'night' && tod !== 'midnight') return;
    
    const wrap = document.createElement('div');
    wrap.id = 'dynamicStars';
    wrap.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;overflow:hidden;';
    for (let i = 0; i < 60; i++) {
      const s = document.createElement('div');
      const size = 1 + Math.random() * 2;
      s.style.cssText = `position:absolute;width:${size}px;height:${size}px;background:white;border-radius:50%;
        left:${Math.random()*100}%;top:${Math.random()*70}%;
        animation:starTwinkle ${2+Math.random()*3}s ease-in-out infinite;
        animation-delay:${Math.random()*4}s;opacity:${0.4+Math.random()*0.6};`;
      wrap.appendChild(s);
    }
    document.body.insertBefore(wrap, document.body.firstChild);
  }

  // Floating petals for daytime
  function createPetals() {
    const tod = getTimeOfDay();
    if (tod !== 'morning' && tod !== 'dawn') return;
    
    const petals = ['🌸','🌺','✿','❀','🌼'];
    function spawnPetal() {
      const el = document.createElement('div');
      el.textContent = petals[Math.floor(Math.random()*petals.length)];
      el.style.cssText = `position:fixed;top:-30px;left:${Math.random()*100}%;font-size:${12+Math.random()*10}px;
        pointer-events:none;z-index:0;animation:petalFall ${4+Math.random()*4}s linear forwards;
        opacity:${0.3+Math.random()*0.5};`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 8000);
    }
    const interval = setInterval(spawnPetal, 800);
    setTimeout(() => clearInterval(interval), 30000);
  }

  function applyBackground() {
    const tod = getTimeOfDay();
    const grad = gradients[tod];
    document.body.style.transition = 'background 3s ease';
    document.body.style.background = grad;
    createStars();
    
    // Update time indicator
    let indicator = document.getElementById('timeIndicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'timeIndicator';
      indicator.style.cssText = `position:fixed;top:12px;right:12px;z-index:9999;
        background:rgba(255,255,255,0.25);backdrop-filter:blur(10px);
        border-radius:20px;padding:4px 12px;font-size:11px;color:#fff;
        text-shadow:0 1px 3px rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.3);
        font-family:'Caveat',cursive;font-size:13px;cursor:pointer;`;
      indicator.title = 'Đổi nền thủ công';
      indicator.onclick = cycleBackground;
      document.body.appendChild(indicator);
    }
    indicator.textContent = timeLabels[tod];
  }

  const timeOrder = ['dawn','morning','noon','afternoon','sunset','evening','night','midnight'];
  let manualIdx = -1;
  function cycleBackground() {
    manualIdx = (manualIdx + 1) % timeOrder.length;
    const tod = timeOrder[manualIdx];
    document.body.style.transition = 'background 1.5s ease';
    document.body.style.background = gradients[tod];
    document.getElementById('timeIndicator').textContent = timeLabels[tod];
    createStars();
  }

  applyBackground();
  createPetals();
  setInterval(applyBackground, 5 * 60 * 1000);
})();


// ──────────────────────────────────────────────────────
//  2. FLOATING MESSAGES (love notes popping up)
//  — Controlled from panel ✨ (no separate button)
// ──────────────────────────────────────────────────────
(function initFloatingMessages() {
  // Just expose the global interval reference; actual toggle is in features.js panel
  window._floatingMsgInterval = null;
})();


// ──────────────────────────────────────────────────────
//  3. MEMORY CAPSULE
// ──────────────────────────────────────────────────────
(function initMemoryCapsule() {
  function openCapsule() {
    const stored = JSON.parse(localStorage.getItem('memoryCapsules') || '[]');
    const today = new Date().toISOString().split('T')[0];
    const ready = stored.filter(c => c.openDate <= today && !c.opened);

    Swal.fire({
      title: '💊 Memory Capsule',
      html: `
        <div style="text-align:left">
          ${ready.length > 0 ? `
            <div style="background:#fff0f3;border-radius:12px;padding:12px;margin-bottom:16px;">
              <p style="color:#e11d48;font-weight:bold;margin-bottom:8px;">🎁 Có ${ready.length} capsule đã đến ngày mở!</p>
              ${ready.map(c => `
                <div style="background:white;border-radius:8px;padding:10px;margin-bottom:8px;border-left:3px solid #e11d48;">
                  <div style="font-weight:bold">${c.title}</div>
                  <div style="color:#666;font-size:13px;margin-top:4px">${c.message}</div>
                  <div style="color:#e11d48;font-size:12px;margin-top:4px">📅 Tạo ngày: ${c.createdDate}</div>
                </div>`).join('')}
            </div>
          ` : ''}
          <p style="font-size:13px;color:#666;margin-bottom:8px;">Tạo capsule mới — tin nhắn sẽ xuất hiện vào ngày bạn chọn:</p>
          <input id="capsuleTitle" placeholder="Tiêu đề capsule..." style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px;margin-bottom:8px;font-family:inherit;box-sizing:border-box"/>
          <textarea id="capsuleMsg" placeholder="Viết điều muốn nhắn nhủ..." rows="3" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px;margin-bottom:8px;font-family:inherit;box-sizing:border-box;resize:vertical"></textarea>
          <input type="date" id="capsuleDate" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px;font-family:inherit;box-sizing:border-box" min="${today}"/>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '💊 Niêm phong capsule',
      cancelButtonText: 'Đóng',
      confirmButtonColor: '#8b3a4a',
      preConfirm: () => {
        const title = document.getElementById('capsuleTitle').value.trim();
        const msg = document.getElementById('capsuleMsg').value.trim();
        const date = document.getElementById('capsuleDate').value;
        if (!title || !msg || !date) { Swal.showValidationMessage('Vui lòng điền đầy đủ ♥'); return false; }
        const capsules = JSON.parse(localStorage.getItem('memoryCapsules') || '[]');
        capsules.push({ id: Date.now(), title, message: msg, openDate: date, createdDate: today, opened: false });
        localStorage.setItem('memoryCapsules', JSON.stringify(capsules));
        // Mark opened ones
        stored.forEach(c => { if (c.openDate <= today) c.opened = true; });
        localStorage.setItem('memoryCapsules', JSON.stringify([...stored.map(c => ({ ...c, opened: c.openDate <= today ? true : c.opened })), { id: Date.now(), title, message: msg, openDate: date, createdDate: today, opened: false }]));
        return true;
      }
    }).then(result => {
      if (result.isConfirmed) {
        Swal.fire({ icon: 'success', title: '💊 Đã niêm phong!', text: 'Capsule sẽ mở vào ngày bạn chọn ♥', confirmButtonColor: '#8b3a4a' });
      }
    });
  }

  window.openMemoryCapsule = openCapsule;
})();


// ──────────────────────────────────────────────────────
//  4. ON THIS DAY
// ──────────────────────────────────────────────────────
async function checkOnThisDay() {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  
  try {
    const res = await fetch(`${BASE_URL}/memories`);
    const memories = await res.json();
    
    const onThisDay = memories.filter(m => {
      const d = new Date(m.date);
      return String(d.getMonth()+1).padStart(2,'0') === mm && 
             String(d.getDate()).padStart(2,'0') === dd &&
             d.getFullYear() < today.getFullYear();
    });

    if (onThisDay.length > 0) {
      const m = onThisDay[0];
      const yearsAgo = today.getFullYear() - new Date(m.date).getFullYear();
      
      setTimeout(() => {
        Swal.fire({
          title: `📅 Hôm này ${yearsAgo} năm trước...`,
          html: `
            <div style="text-align:center">
              ${m.image ? `<img src="${m.image}" style="width:200px;height:150px;object-fit:cover;border-radius:12px;margin-bottom:12px;box-shadow:0 4px 15px rgba(0,0,0,0.2)"/>` : ''}
              <div style="font-size:18px;font-weight:bold;color:#8b3a4a;margin-bottom:8px">${m.title}</div>
              ${m.description ? `<div style="color:#666;font-size:14px">${m.description}</div>` : ''}
              ${m.location ? `<div style="color:#999;font-size:12px;margin-top:8px">📍 ${m.location}</div>` : ''}
            </div>
          `,
          confirmButtonText: '💌 Xem thêm',
          confirmButtonColor: '#8b3a4a',
          showCancelButton: true,
          cancelButtonText: 'OK',
          background: 'linear-gradient(135deg, #fff 0%, #ffe4e8 100%)'
        });
      }, 3000);
    }
  } catch(e) { /* silent */ }
}


// ──────────────────────────────────────────────────────
//  5. VOICE MEMORIES — IndexedDB storage, real playback
// ──────────────────────────────────────────────────────
(function initVoiceMemories() {
  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;
  let recordingTimer = null;
  let seconds = 0;
  // In-memory blob URLs for this session
  const blobURLs = {};

  // ── IndexedDB helpers ─────────────────────────────
  function openDB() {
    return new Promise((res, rej) => {
      const req = indexedDB.open('VoiceMemoriesDB', 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore('voices', { keyPath: 'id', autoIncrement: true });
      req.onsuccess = e => res(e.target.result);
      req.onerror   = e => rej(e.target.error);
    });
  }

  async function getAllVoices() {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction('voices', 'readonly');
      const req = tx.objectStore('voices').getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror   = e => rej(e.target.error);
    });
  }

  async function saveVoice(record) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction('voices', 'readwrite');
      const req = tx.objectStore('voices').add(record);
      req.onsuccess = () => res(req.result);
      req.onerror   = e => rej(e.target.error);
    });
  }

  async function deleteVoiceDB(id) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction('voices', 'readwrite');
      tx.objectStore('voices').delete(id);
      tx.oncomplete = res;
      tx.onerror    = e => rej(e.target.error);
    });
  }

  // ── Global audio player instance ─────────────────
  let currentAudio = null;
  let currentPlayBtn = null;

  window.playVoice = function(id, btn) {
    // Stop previous
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      if (currentPlayBtn) currentPlayBtn.textContent = '▶';
    }
    const url = blobURLs[id];
    if (!url) { alert('Không tìm thấy file ghi âm'); return; }
    currentAudio = new Audio(url);
    currentPlayBtn = btn;
    btn.textContent = '⏸';
    currentAudio.play().catch(e => { btn.textContent = '▶'; alert('Không thể phát: ' + e.message); });
    currentAudio.onended = () => { btn.textContent = '▶'; currentAudio = null; currentPlayBtn = null; };
  };

  window.stopVoice = function() {
    if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; currentAudio = null; }
    if (currentPlayBtn) { currentPlayBtn.textContent = '▶'; currentPlayBtn = null; }
  };

  window.deleteVoice = async function(id) {
    await deleteVoiceDB(id);
    if (blobURLs[id]) { URL.revokeObjectURL(blobURLs[id]); delete blobURLs[id]; }
    window.openVoiceMemories();
  };

  async function renderVoiceList(container) {
    const voices = await getAllVoices();
    // Preload blob URLs
    voices.forEach(v => {
      if (!blobURLs[v.id]) {
        const blob = new Blob([v.audioData], { type: v.mimeType || 'audio/webm' });
        blobURLs[v.id] = URL.createObjectURL(blob);
      }
    });

    if (voices.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#ccc;padding:20px">Chưa có ghi âm nào ♥</p>';
      return;
    }

    container.innerHTML = voices.reverse().map(v => `
      <div style="background:white;border-radius:10px;padding:10px;margin-bottom:8px;display:flex;align-items:center;gap:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <button id="playbtn_${v.id}"
          onclick="playVoice(${v.id}, this)"
          style="background:linear-gradient(135deg,#8b3a4a,#c44569);border:none;color:white;border-radius:50%;width:36px;height:36px;cursor:pointer;font-size:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center">▶</button>
        <div style="flex:1;min-width:0">
          <div style="font-weight:bold;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v.title}</div>
          <div style="color:#999;font-size:11px">${v.date} · ${v.duration}s</div>
        </div>
        <button onclick="deleteVoice(${v.id})" style="background:none;border:none;color:#ddd;cursor:pointer;font-size:18px;flex-shrink:0">🗑</button>
      </div>
    `).join('');
  }

  window.openVoiceMemories = async function() {
    const swal = Swal.fire({
      title: '🎙 Voice Memories',
      html: `
        <div>
          <div id="recordSection" style="text-align:center;padding:16px;background:#fff0f3;border-radius:12px;margin-bottom:16px">
            <div id="recordStatus" style="font-size:28px;margin-bottom:4px">🎙</div>
            <div id="recordTimer" style="font-size:32px;font-family:'Caveat',cursive;color:#8b3a4a;margin-bottom:12px;font-weight:bold">00:00</div>
            <input id="voiceTitle" placeholder="Tên ghi âm..." style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px;margin-bottom:10px;font-family:inherit;box-sizing:border-box"/>
            <button id="recordBtn" onclick="toggleRecording()"
              style="background:linear-gradient(135deg,#8b3a4a,#c44569);color:white;border:none;border-radius:25px;padding:10px 28px;cursor:pointer;font-family:'Caveat',cursive;font-size:16px;transition:opacity 0.2s">
              🎙 Bắt đầu ghi âm
            </button>
          </div>
          <div id="voiceListContainer" style="max-height:240px;overflow-y:auto">
            <p style="text-align:center;color:#ccc;padding:20px">Đang tải...</p>
          </div>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      width: 480,
      didOpen: () => {
        renderVoiceList(document.getElementById('voiceListContainer'));
      },
      willClose: () => { stopVoice(); }
    });
  };

  window.toggleRecording = async function() {
    const btn = document.getElementById('recordBtn');
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        // Try opus/webm first, fallback
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
        mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
          const arrayBuffer = await blob.arrayBuffer();
          const title = document.getElementById('voiceTitle')?.value.trim() || ('Ghi âm ' + new Date().toLocaleTimeString('vi-VN'));
          const record = {
            title,
            date: new Date().toLocaleDateString('vi-VN'),
            duration: seconds,
            mimeType: mediaRecorder.mimeType,
            audioData: arrayBuffer
          };
          const id = await saveVoice(record);
          record.id = id;
          const url = URL.createObjectURL(new Blob([arrayBuffer], { type: mediaRecorder.mimeType }));
          blobURLs[id] = url;
          const container = document.getElementById('voiceListContainer');
          if (container) renderVoiceList(container);
          Swal.showValidationMessage(''); // clear any msg
          const status = document.getElementById('recordStatus');
          if (status) { status.textContent = '✅'; setTimeout(() => { if(status) status.textContent = '🎙'; }, 1500); }
        };
        mediaRecorder.start(100); // collect every 100ms
        isRecording = true;
        seconds = 0;
        if (btn) btn.textContent = '⏹ Dừng ghi âm';
        recordingTimer = setInterval(() => {
          seconds++;
          const el = document.getElementById('recordTimer');
          if (el) el.textContent = String(Math.floor(seconds/60)).padStart(2,'0') + ':' + String(seconds%60).padStart(2,'0');
          const st = document.getElementById('recordStatus');
          if (st) st.textContent = seconds % 2 === 0 ? '🔴' : '⚫';
        }, 1000);
      } catch(e) {
        Swal.fire({ icon:'error', title:'Không thể ghi âm', text:'Vui lòng cho phép truy cập microphone trong trình duyệt', confirmButtonColor:'#8b3a4a' });
      }
    } else {
      clearInterval(recordingTimer);
      mediaRecorder.stop();
      isRecording = false;
      if (btn) btn.textContent = '🎙 Bắt đầu ghi âm';
      const st = document.getElementById('recordStatus');
      if (st) st.textContent = '💾';
    }
  };
})();


// ──────────────────────────────────────────────────────
//  6. REALTIME CURSOR (tên hiển thị theo cursor)
// ──────────────────────────────────────────────────────
(function initRealtimeCursor() {
  const colors = ['#ff6b9d','#a855f7','#3b82f6','#10b981','#f59e0b','#ef4444'];
  let myName = localStorage.getItem('cursorName') || '';
  let myColor = localStorage.getItem('cursorColor') || colors[Math.floor(Math.random()*colors.length)];
  let cursorEl = null;
  let enabled = false;

  function createMyCursor() {
    if (cursorEl) return;
    cursorEl = document.createElement('div');
    cursorEl.style.cssText = `position:fixed;pointer-events:none;z-index:99998;
      display:flex;align-items:center;gap:4px;transition:left 0.05s,top 0.05s;`;
    cursorEl.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="${myColor}"><path d="M0 0L0 16L5 11L8 18L11 17L8 10L14 10Z"/></svg>
      <span style="background:${myColor};color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-family:'Caveat',cursive;white-space:nowrap;font-size:13px">${myName}</span>
    `;
    document.body.appendChild(cursorEl);
  }

  function removeMyCursor() {
    if (cursorEl) { cursorEl.remove(); cursorEl = null; }
    document.body.style.cursor = '';
  }

  document.addEventListener('mousemove', e => {
    if (!enabled || !myName) return;
    if (!cursorEl) createMyCursor();
    cursorEl.style.left = e.clientX + 'px';
    cursorEl.style.top  = e.clientY + 'px';
    // Emit via socket if available
    if (window.socket) {
      window.socket.emit('cursorMove', { name: myName, color: myColor, x: e.clientX, y: e.clientY });
    }
  });

  // Listen for other cursors
  const otherCursors = {};
  if (window.socket) {
    window.socket.on('cursorMoved', data => {
      if (data.name === myName) return;
      let el = otherCursors[data.name];
      if (!el) {
        el = document.createElement('div');
        el.style.cssText = `position:fixed;pointer-events:none;z-index:99997;display:flex;align-items:center;gap:4px;transition:left 0.08s,top 0.08s;`;
        el.innerHTML = `<svg width="16" height="16" viewBox="0 0 20 20" fill="${data.color}"><path d="M0 0L0 16L5 11L8 18L11 17L8 10L14 10Z"/></svg>
          <span style="background:${data.color};color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-family:'Caveat',cursive">${data.name}</span>`;
        document.body.appendChild(el);
        otherCursors[data.name] = el;
      }
      el.style.left = data.x + 'px';
      el.style.top  = data.y + 'px';
      el.style.display = 'flex';
      // Hide after 3s of no movement
      clearTimeout(el._timer);
      el._timer = setTimeout(() => { el.style.display = 'none'; }, 3000);
    });
  }

  window.openCursorSettings = function() {
    Swal.fire({
      title: '🖱 Realtime Cursor',
      html: `
        <div>
          <p style="color:#666;font-size:13px;margin-bottom:12px">Tên của bạn sẽ hiển thị theo con trỏ khi di chuyển</p>
          <input id="cursorNameInput" value="${myName}" placeholder="Tên của bạn..." 
            style="width:100%;border:1px solid #ddd;border-radius:8px;padding:10px;font-family:inherit;box-sizing:border-box;margin-bottom:12px"/>
          <div style="display:flex;gap:8px;justify-content:center;margin-bottom:12px">
            ${colors.map(c => `<div onclick="selectColor('${c}')" style="width:28px;height:28px;background:${c};border-radius:50%;cursor:pointer;border:3px solid ${c===myColor?'#333':'transparent'}" id="colorDot_${c.replace('#','')}"></div>`).join('')}
          </div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;justify-content:center">
            <input type="checkbox" id="cursorEnabled" ${enabled?'checked':''} style="width:16px;height:16px"/>
            <span style="font-size:14px">Bật cursor có tên</span>
          </label>
        </div>
      `,
      confirmButtonText: 'Lưu',
      confirmButtonColor: '#8b3a4a',
      didOpen: () => {
        window.selectColor = (c) => {
          myColor = c;
          colors.forEach(col => {
            const el = document.getElementById('colorDot_' + col.replace('#',''));
            if (el) el.style.border = `3px solid ${col===c?'#333':'transparent'}`;
          });
        };
      },
      preConfirm: () => {
        myName = document.getElementById('cursorNameInput').value.trim() || myName;
        enabled = document.getElementById('cursorEnabled').checked;
        localStorage.setItem('cursorName', myName);
        localStorage.setItem('cursorColor', myColor);
        if (!enabled) removeMyCursor();
        else if (myName) createMyCursor();
        return true;
      }
    });
  };
})();


// ──────────────────────────────────────────────────────
//  7. STORY MODE (slideshow of memories)
// ──────────────────────────────────────────────────────
window.openStoryMode = async function() {
  try {
    const res = await fetch(`${BASE_URL}/memories`);
    const memories = await res.json();
    const withImages = memories.filter(m => m.image);
    if (withImages.length === 0) {
      Swal.fire({ icon:'info', title:'Chưa có ảnh', text:'Hãy thêm vài kỷ niệm có ảnh để xem Story Mode nhé ♥', confirmButtonColor:'#8b3a4a' });
      return;
    }

    let idx = 0;
    let storyTimer = null;
    const overlay = document.createElement('div');
    overlay.id = 'storyOverlay';
    overlay.style.cssText = `position:fixed;inset:0;background:black;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;`;

    function render() {
      const m = withImages[idx];
      const d = new Date(m.date);
      const dateStr = d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
      overlay.innerHTML = `
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:rgba(255,255,255,0.2)">
          <div id="storyProgress" style="height:100%;background:white;width:0%;transition:width 5s linear"></div>
        </div>
        <div style="position:absolute;top:12px;right:16px;z-index:1">
          <button onclick="document.getElementById('storyOverlay').remove();clearInterval(window._storyTimer)" 
            style="background:rgba(255,255,255,0.2);border:none;color:white;width:32px;height:32px;border-radius:50%;font-size:20px;cursor:pointer;line-height:1">✕</button>
        </div>
        <div style="position:absolute;top:16px;left:16px;display:flex;gap:4px">
          ${withImages.map((_,i) => `<div style="flex:1;height:2px;background:${i<=idx?'white':'rgba(255,255,255,0.3)'};min-width:20px;max-width:60px;border-radius:1px;overflow:hidden">
            ${i===idx?'<div id="storyBar" style="height:100%;background:white;width:0%;transition:width 5s linear"></div>':''}
          </div>`).join('')}
        </div>
        <img src="${m.image}" style="max-width:100%;max-height:100vh;object-fit:contain;"/>
        <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.8));padding:40px 24px 32px;color:white">
          <div style="font-family:'Dancing Script',cursive;font-size:22px;margin-bottom:4px">${m.title}</div>
          <div style="font-size:13px;opacity:0.8">📅 ${dateStr}${m.location?' · 📍 '+m.location:''}</div>
          ${m.description ? `<div style="font-size:14px;margin-top:6px;opacity:0.9">${m.description}</div>` : ''}
        </div>
        <div style="position:absolute;top:50%;left:8px;transform:translateY(-50%)">
          <button onclick="prevStory()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">‹</button>
        </div>
        <div style="position:absolute;top:50%;right:8px;transform:translateY(-50%)">
          <button onclick="nextStory()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">›</button>
        </div>
      `;
      // Start progress
      setTimeout(() => {
        const bar = document.getElementById('storyBar');
        if (bar) bar.style.width = '100%';
        const prog = document.getElementById('storyProgress');
        if (prog) prog.style.width = '100%';
      }, 50);
    }

    window.nextStory = function() {
      clearInterval(window._storyTimer);
      idx = (idx + 1) % withImages.length;
      render();
      window._storyTimer = setInterval(() => { idx = (idx+1)%withImages.length; render(); }, 5000);
    };
    window.prevStory = function() {
      clearInterval(window._storyTimer);
      idx = (idx - 1 + withImages.length) % withImages.length;
      render();
      window._storyTimer = setInterval(() => { idx = (idx+1)%withImages.length; render(); }, 5000);
    };

    document.body.appendChild(overlay);
    render();
    window._storyTimer = setInterval(() => { idx = (idx+1)%withImages.length; render(); }, 5000);
  } catch(e) {
    Swal.fire({ icon:'error', title:'Lỗi', text:'Không thể tải ảnh', confirmButtonColor:'#8b3a4a' });
  }
};


// ──────────────────────────────────────────────────────
//  8. SPOTIFY MUSIC CARD — real audio upload + mini player
// ──────────────────────────────────────────────────────
(function initSpotifyCard() {
  let playerAudio = null;
  let playerInterval = null;
  let isPlaying = false;
  let songBlobURL = null;

  // Load song blob from IndexedDB
  function openSongDB() {
    return new Promise((res, rej) => {
      const req = indexedDB.open('OurSongDB', 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore('song', { keyPath: 'key' });
      req.onsuccess = e => res(e.target.result);
      req.onerror   = e => rej(e.target.error);
    });
  }

  async function saveSongToDB(arrayBuffer, mimeType) {
    const db = await openSongDB();
    return new Promise((res, rej) => {
      const tx = db.transaction('song', 'readwrite');
      tx.objectStore('song').put({ key: 'audio', data: arrayBuffer, mimeType });
      tx.oncomplete = res;
      tx.onerror    = e => rej(e.target.error);
    });
  }

  async function loadSongFromDB() {
    const db = await openSongDB();
    return new Promise((res) => {
      const tx = db.transaction('song', 'readonly');
      const req = tx.objectStore('song').get('audio');
      req.onsuccess = () => res(req.result || null);
      req.onerror   = () => res(null);
    });
  }

  async function initPlayer() {
    if (songBlobURL) return;
    const record = await loadSongFromDB();
    if (record) {
      const blob = new Blob([record.data], { type: record.mimeType });
      songBlobURL = URL.createObjectURL(blob);
    }
  }

  // ── Vinyl Disc Player ────────────────────────────────
  function buildMiniPlayer() {
    if (document.getElementById('miniPlayer')) return;
    const saved = JSON.parse(localStorage.getItem('ourSong') || '{}');
    if (!saved.song && !songBlobURL) return;

    const player = document.createElement('div');
    player.id = 'miniPlayer';
    player.innerHTML = `
      <div class="vinyl-disc" id="vinylDisc">
        <div class="vinyl-grooves"></div>
        <div class="vinyl-label"><span id="miniArt">${saved.albumArt||'🎵'}</span></div>
        <div class="vinyl-center"></div>
      </div>
      <div class="vinyl-info">
        <div id="miniTitle" class="vinyl-title">${saved.song||'Bài hát của chúng mình'}</div>
        <div id="miniArtist" class="vinyl-artist">${saved.artist||'♥'}</div>
        <div class="vinyl-controls">
          <button id="miniPlayBtn" onclick="toggleMiniPlayer()" class="vinyl-play-btn">▶</button>
          <div class="vinyl-progress-wrap">
            <div id="miniProgress" class="vinyl-progress-fill"></div>
          </div>
          <button onclick="closeMiniPlayer()" class="vinyl-close-btn">✕</button>
        </div>
      </div>
      <div class="vinyl-needle" id="vinylNeedle"></div>
    `;
    document.body.appendChild(player);
  }

  window.toggleMiniPlayer = function() {
    if (!songBlobURL) { Swal.fire({ icon:'info', title:'Chưa có nhạc', text:'Hãy upload file nhạc trong phần Cài đặt bài hát ♥', confirmButtonColor:'#1db954' }); return; }
    if (!playerAudio) {
      playerAudio = new Audio(songBlobURL);
      playerAudio.loop = true;
      playerAudio.ontimeupdate = () => {
        if (!playerAudio.duration) return;
        const pct = (playerAudio.currentTime / playerAudio.duration) * 100;
        const bar = document.getElementById('miniProgress');
        if (bar) bar.style.width = pct + '%';
      };
    }
    const disc = document.getElementById('vinylDisc');
    const needle = document.getElementById('vinylNeedle');
    if (isPlaying) {
      playerAudio.pause();
      isPlaying = false;
      const btn = document.getElementById('miniPlayBtn');
      if (btn) btn.textContent = '▶';
      if (disc) disc.classList.remove('vinyl-spinning');
      if (needle) needle.classList.remove('needle-on');
    } else {
      playerAudio.play().catch(() => {});
      isPlaying = true;
      const btn = document.getElementById('miniPlayBtn');
      if (btn) btn.textContent = '⏸';
      if (disc) disc.classList.add('vinyl-spinning');
      if (needle) needle.classList.add('needle-on');
    }
  };

  window.closeMiniPlayer = function() {
    if (playerAudio) { playerAudio.pause(); playerAudio = null; isPlaying = false; }
    const p = document.getElementById('miniPlayer');
    if (p) p.remove();
  };

  window.openSpotifyCard = async function() {
    await initPlayer();
    const saved = JSON.parse(localStorage.getItem('ourSong') || '{}');
    const hasSong = !!songBlobURL;

    Swal.fire({
      title: '🎵 Bài hát của chúng mình',
      html: `
        <div style="text-align:center">
          <div style="background:linear-gradient(135deg,#1db954 0%,#191414 100%);color:white;border-radius:16px;padding:20px;margin-bottom:16px;position:relative;overflow:hidden">
            <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;background:rgba(255,255,255,0.04);border-radius:50%"></div>
            <div style="font-size:48px;margin-bottom:8px" id="spotifyAlbumArt">${saved.albumArt||'🎵'}</div>
            <div style="font-size:18px;font-weight:bold;margin-bottom:2px" id="spotifySongName">${saved.song||'Tên bài hát'}</div>
            <div style="font-size:13px;opacity:0.75;margin-bottom:12px" id="spotifyArtistName">${saved.artist||'Nghệ sĩ'}</div>
            <div id="spotifyPlayerControls" style="display:${hasSong?'flex':'none'};align-items:center;gap:8px;margin-bottom:8px">
              <span id="spotifyTime" style="font-size:11px;opacity:0.6;width:36px;text-align:right">0:00</span>
              <div style="flex:1;height:3px;background:rgba(255,255,255,0.2);border-radius:2px;cursor:pointer" id="spotifySeekBar" onclick="seekSong(event,this)">
                <div id="spotifySeekFill" style="width:0%;height:100%;background:#1db954;border-radius:2px;pointer-events:none"></div>
              </div>
              <span id="spotifyDuration" style="font-size:11px;opacity:0.6;width:36px">0:00</span>
            </div>
            <div style="display:flex;justify-content:center;gap:20px;font-size:22px">
              <span style="cursor:pointer;opacity:0.7" onclick="rewindSong()">⏮</span>
              <button id="spotifyPlayBtn" onclick="toggleSongPreview()" style="background:#1db954;border:none;color:white;width:40px;height:40px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center">${hasSong?'▶':'🔇'}</button>
              <span style="cursor:pointer;opacity:0.7">⏭</span>
            </div>
          </div>

          <div style="background:#f8f8f8;border-radius:12px;padding:12px;margin-bottom:12px;text-align:left">
            <div style="font-size:12px;color:#999;margin-bottom:6px;font-weight:bold">🎬 Thêm từ YouTube:</div>
            <div style="display:flex;gap:8px;margin-bottom:6px">
              <input id="ytLinkInput" class="yt-input" placeholder="Dán link YouTube vào đây..." style="flex:1;border:1px solid #ddd;border-radius:8px;padding:8px;font-family:inherit;font-size:13px"/>
              <button onclick="loadYouTubeAudio()" class="yt-btn" style="background:linear-gradient(135deg,#ff0000,#cc0000);color:white;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;white-space:nowrap">▶ Load</button>
            </div>
            <div id="ytStatus" style="font-size:12px;color:#666;min-height:16px;margin-bottom:4px"></div>
            <audio id="ytAudioPlayer" controls style="width:100%;display:none;border-radius:8px;margin-bottom:6px"></audio>
            <button id="ytSaveBtn" onclick="saveYouTubeAsMp3()" style="display:none;width:100%;background:linear-gradient(135deg,#1db954,#169040);color:white;border:none;border-radius:8px;padding:8px;cursor:pointer;font-family:inherit;font-size:13px">💾 Lưu làm nhạc nền</button>
          </div>

          <div style="background:#f8f8f8;border-radius:12px;padding:12px;margin-bottom:12px;text-align:left">
            <div style="font-size:12px;color:#999;margin-bottom:8px">📁 Hoặc upload file nhạc (mp3, m4a, ogg):</div>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;background:white;border:1px dashed #ddd;border-radius:8px;padding:10px">
              <span style="font-size:20px">🎵</span>
              <div>
                <div style="font-size:13px;font-weight:bold;color:#333">${hasSong?'Đổi file nhạc':'Chọn file nhạc'}</div>
                <div style="font-size:11px;color:#999">MP3, M4A, OGG, WAV · Tối đa 20MB</div>
              </div>
              <input type="file" id="songFileInput" accept="audio/*" style="display:none" onchange="handleSongUpload(event)"/>
            </label>
            <div id="uploadStatus" style="margin-top:6px;font-size:12px;color:#1db954;min-height:16px"></div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
            <input id="spotifySongInput" value="${saved.song||''}" placeholder="Tên bài hát..." style="border:1px solid #ddd;border-radius:8px;padding:8px;font-family:inherit;box-sizing:border-box"/>
            <input id="spotifyArtistInput" value="${saved.artist||''}" placeholder="Nghệ sĩ..." style="border:1px solid #ddd;border-radius:8px;padding:8px;font-family:inherit;box-sizing:border-box"/>
          </div>
          <div style="display:flex;gap:8px;justify-content:center;font-size:24px;margin-bottom:4px">
            ${['🎵','🎶','💗','🌹','🌙','⭐','🎼','🎸','🎹','🥁'].map(e => `<span onclick="document.getElementById('spotifyAlbumArt').textContent='${e}'" style="cursor:pointer;transition:transform 0.15s" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'">${e}</span>`).join('')}
          </div>
        </div>
      `,
      confirmButtonText: '💾 Lưu',
      confirmButtonColor: '#1db954',
      showCancelButton: true,
      cancelButtonText: 'Đóng',
      didOpen: () => {
        // Live preview
        const songInput = document.getElementById('spotifySongInput');
        const artistInput = document.getElementById('spotifyArtistInput');
        if (songInput) songInput.addEventListener('input', () => {
          document.getElementById('spotifySongName').textContent = songInput.value || 'Tên bài hát';
        });
        if (artistInput) artistInput.addEventListener('input', () => {
          document.getElementById('spotifyArtistName').textContent = artistInput.value || 'Nghệ sĩ';
        });

        // Preview audio in modal
        window._previewAudio = null;
        window._previewPlaying = false;

        window.toggleSongPreview = function() {
          if (!songBlobURL) return;
          if (!window._previewAudio) {
            window._previewAudio = new Audio(songBlobURL);
            window._previewAudio.ontimeupdate = () => {
              const a = window._previewAudio;
              if (!a.duration) return;
              const pct = (a.currentTime / a.duration) * 100;
              const fill = document.getElementById('spotifySeekFill');
              if (fill) fill.style.width = pct + '%';
              const t = document.getElementById('spotifyTime');
              if (t) t.textContent = fmtTime(a.currentTime);
              const d = document.getElementById('spotifyDuration');
              if (d) d.textContent = fmtTime(a.duration);
            };
            window._previewAudio.onloadedmetadata = () => {
              const d = document.getElementById('spotifyDuration');
              if (d) d.textContent = fmtTime(window._previewAudio.duration);
              document.getElementById('spotifyPlayerControls').style.display = 'flex';
            };
            window._previewAudio.onended = () => {
              window._previewPlaying = false;
              const btn = document.getElementById('spotifyPlayBtn');
              if (btn) btn.textContent = '▶';
            };
          }
          const btn = document.getElementById('spotifyPlayBtn');
          if (window._previewPlaying) {
            window._previewAudio.pause();
            window._previewPlaying = false;
            if (btn) btn.textContent = '▶';
          } else {
            window._previewAudio.play().catch(() => {});
            window._previewPlaying = true;
            if (btn) btn.textContent = '⏸';
          }
        };

        window.seekSong = function(e, bar) {
          if (!window._previewAudio || !window._previewAudio.duration) return;
          const rect = bar.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          window._previewAudio.currentTime = pct * window._previewAudio.duration;
        };

        window.rewindSong = function() {
          if (window._previewAudio) window._previewAudio.currentTime = 0;
        };
      },
      willClose: () => {
        if (window._previewAudio) { window._previewAudio.pause(); window._previewAudio = null; }
        window._previewPlaying = false;
      },
      preConfirm: () => {
        const song = document.getElementById('spotifySongInput').value.trim();
        const artist = document.getElementById('spotifyArtistInput').value.trim();
        const albumArt = document.getElementById('spotifyAlbumArt').textContent;
        localStorage.setItem('ourSong', JSON.stringify({ song, artist, albumArt }));
        return true;
      }
    }).then(r => {
      if (r.isConfirmed) {
        // Update mini player if exists
        const mt = document.getElementById('miniTitle');
        const ma = document.getElementById('miniArtist');
        const mart = document.getElementById('miniArt');
        const saved2 = JSON.parse(localStorage.getItem('ourSong') || '{}');
        if (mt) mt.textContent = saved2.song || 'Bài hát của chúng mình';
        if (ma) ma.textContent = saved2.artist || '';
        if (mart) mart.textContent = saved2.albumArt || '🎵';
        if (!document.getElementById('miniPlayer')) buildMiniPlayer();
      }
    });
  };

  // ── YouTube → MP3 FIXED ──────────────────
  function extractVideoId(url) {
    try {
      const u = new URL(url);

      if (u.hostname.includes('youtu.be')) {
        return u.pathname.slice(1);
      }

      if (u.searchParams.get('v')) {
        return u.searchParams.get('v');
      }

      const parts = u.pathname.split('/');
      return parts.pop();
    } catch(e) {
      return null;
    }
  }

  window.loadYouTubeAudio = async function() {
    const url = (document.getElementById('ytLinkInput')?.value || '').trim();
    const status = document.getElementById('ytStatus');
    const saveBtn = document.getElementById('ytSaveBtn');
    const player = document.getElementById('ytAudioPlayer');

    if (!url) {
      if (status) status.textContent = '⚠️ Vui lòng nhập link YouTube';
      return;
    }

    const videoId = extractVideoId(url);

    if (!videoId) {
      if (status) status.textContent = '❌ Link YouTube không hợp lệ';
      return;
    }

    if (status) {
      status.innerHTML = '⏳ Đang convert YouTube → MP3...';
    }

    if (saveBtn) {
      saveBtn.style.display = 'none';
      saveBtn.disabled = true;
    }

    if (player) {
      player.pause();
      player.src = '';
      player.style.display = 'none';
    }

    try {
      const res = await fetch(`${BASE_URL}/youtube-mp3`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ url })
});

if (!res.ok) {
  throw new Error("Convert failed");
}

const blob = await res.blob();
const audioUrl = URL.createObjectURL(blob);

window._ytAudioUrl = audioUrl;

if (player) {
  player.src = audioUrl;
  player.style.display = 'block';
}

if (status) {
  status.innerHTML = '✅ Convert thành công!';
}

if (saveBtn) {
  saveBtn.style.display = 'inline-flex';
}

      const res = await fetch(api);

      if (!res.ok) {
        throw new Error('Không thể kết nối server convert');
      }

      const data = await res.json();

      if (!data || !data.data) {
        throw new Error('Không lấy được dữ liệu video');
      }

      const audio = data.data.audio?.find(a => a.ext === 'mp3') || data.data.audio?.[0];

      if (!audio || !audio.url) {
        throw new Error('Không tìm thấy file MP3');
      }

      window._ytAudioUrl = audio.url;
      window._ytVideoUrl = url;

      const title = data.data.title || `YouTube Audio ${videoId}`;

      const songInput = document.getElementById('spotifySongInput');
      const songName = document.getElementById('spotifySongName');

      if (songInput && !songInput.value) {
        songInput.value = title;
      }

      if (songName) {
        songName.textContent = title;
      }

      if (player) {
        player.src = audio.url;
        player.style.display = 'block';
      }

      if (saveBtn) {
        saveBtn.style.display = 'inline-flex';
        saveBtn.disabled = false;
      }

      if (status) {
        status.innerHTML = '✅ Convert thành công! Có thể nghe thử và lưu ♥';
      }

    } catch(err) {
      console.error(err);

      if (status) {
        status.innerHTML = `
          ❌ Convert thất bại<br>
          <small>${err.message}</small><br><br>
          <small>💡 Hãy thử link YouTube khác hoặc upload MP3 trực tiếp.</small>
        `;
      }
    }
  };

window.saveYouTubeAsMp3 = async function() {
    const status = document.getElementById('ytStatus');
    const saveBtn = document.getElementById('ytSaveBtn');
    if (!window._ytAudioUrl) { if(status) status.textContent = '⚠️ Chưa có audio để lưu'; return; }
    if(status) status.textContent = '⏳ Đang tải và lưu vào thiết bị...';
    if(saveBtn) saveBtn.disabled = true;
    try {
      const res = await fetch(window._ytAudioUrl);
      if (!res.ok) throw new Error('Không tải được audio');
      const arrayBuffer = await res.arrayBuffer();
      const mimeType = 'audio/mpeg';
      await saveSongToDB(arrayBuffer, mimeType);
      if (songBlobURL) URL.revokeObjectURL(songBlobURL);
      songBlobURL = URL.createObjectURL(new Blob([arrayBuffer], { type: mimeType }));
      if (window._previewAudio) { window._previewAudio.pause(); window._previewAudio = null; }
      window._previewPlaying = false;
      const playBtn = document.getElementById('spotifyPlayBtn');
      if(playBtn) { playBtn.textContent = '▶'; playBtn.style.opacity = '1'; }
      document.getElementById('spotifyPlayerControls').style.display = 'flex';
      if(status) status.textContent = '✅ Đã lưu! Lần sau mở lên vẫn còn ♥';
      if(saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '✅ Đã lưu xong!'; }
      if (playerAudio) { playerAudio.pause(); playerAudio = null; isPlaying = false; }
    } catch(e) {
      if(status) status.textContent = '❌ Lỗi khi lưu: ' + e.message;
      if(saveBtn) saveBtn.disabled = false;
    }
  };

  window.handleSongUpload = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      document.getElementById('uploadStatus').textContent = '❌ File quá lớn (tối đa 20MB)';
      return;
    }
    const status = document.getElementById('uploadStatus');
    if (status) status.textContent = '⏳ Đang xử lý...';
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      await saveSongToDB(arrayBuffer, file.type);
      if (songBlobURL) URL.revokeObjectURL(songBlobURL);
      songBlobURL = URL.createObjectURL(new Blob([arrayBuffer], { type: file.type }));
      
      // Update preview audio
      if (window._previewAudio) { window._previewAudio.pause(); window._previewAudio = null; }
      window._previewPlaying = false;

      // Auto-fill song name from filename
      const nameInput = document.getElementById('spotifySongInput');
      if (nameInput && !nameInput.value) {
        nameInput.value = file.name.replace(/\.[^.]+$/, '');
        document.getElementById('spotifySongName').textContent = nameInput.value;
      }

      if (status) status.textContent = '✅ Upload thành công! Nhấn ▶ để nghe thử';
      
      // Show play button
      const btn = document.getElementById('spotifyPlayBtn');
      if (btn) { btn.textContent = '▶'; btn.style.opacity = '1'; }
      document.getElementById('spotifyPlayerControls').style.display = 'flex';
      
      // Update real mini player
      if (playerAudio) { playerAudio.pause(); playerAudio = null; isPlaying = false; }
    } catch(e) {
      if (status) status.textContent = '❌ Lỗi: ' + e.message;
    }
  };

  function fmtTime(s) {
    if (!s || isNaN(s)) return '0:00';
    return Math.floor(s/60) + ':' + String(Math.floor(s%60)).padStart(2,'0');
  }

  // Init mini player on load
  window.addEventListener('load', async () => {
    await initPlayer();
    const saved = JSON.parse(localStorage.getItem('ourSong') || '{}');
    if (saved.song || songBlobURL) buildMiniPlayer();
  });
})();


// ──────────────────────────────────────────────────────
//  FEATURE BUTTONS (bottom dock) — merged panel
// ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  checkOnThisDay();

  const panel = document.createElement('div');
  panel.id = 'featurePanel';
  panel.style.cssText = `position:fixed;bottom:16px;left:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;`;

  const features = [
    { icon:'💊', label:'Capsule',   fn:'openMemoryCapsule()' },
    { icon:'🎙', label:'Voice',     fn:'openVoiceMemories()' },
    { icon:'🖱', label:'Cursor',    fn:'openCursorSettings()' },
    { icon:'📖', label:'Story',     fn:'openStoryMode()' },
    { icon:'🎵', label:'Nhạc',      fn:'openSpotifyCard()' },
    { icon:'🎉', label:'Trang trí', fn:'toggleDeco()' },
    { icon:'💌', label:'Thư tình',  fn:'toggleFloatingMessages()' },
  ];

  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = '✨';
  toggleBtn.title = 'Mở menu tính năng';
  toggleBtn.style.cssText = `width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#8b3a4a,#c44569);
    color:white;border:none;cursor:pointer;font-size:20px;box-shadow:0 4px 15px rgba(139,58,74,0.4);
    transition:transform 0.2s;`;
  toggleBtn.onclick = function() {
    const btns = panel.querySelectorAll('.feat-btn');
    const visible = btns[0]?.style.display !== 'none';
    btns.forEach(b => b.style.display = visible ? 'none' : 'flex');
    toggleBtn.style.transform = visible ? 'rotate(0deg)' : 'rotate(45deg)';
  };

  features.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'feat-btn';
    if (f.label === 'Thư tình') btn.id = 'floatingMsgBtnMerged';
    if (f.label === 'Trang trí') btn.id = 'decoToggleBtnMerged';
    btn.style.cssText = `display:none;align-items:center;gap:8px;background:rgba(255,255,255,0.92);
      backdrop-filter:blur(10px);border:1px solid rgba(255,182,193,0.4);border-radius:25px;
      padding:7px 14px;cursor:pointer;font-family:'Caveat',cursive;font-size:14px;
      color:#8b3a4a;box-shadow:0 2px 10px rgba(0,0,0,0.1);transition:transform 0.15s,box-shadow 0.15s;
      white-space:nowrap;`;
    btn.innerHTML = `${f.icon} ${f.label}`;
    btn.onmouseenter = () => { btn.style.transform='translateX(3px)'; btn.style.boxShadow='0 4px 15px rgba(139,58,74,0.2)'; };
    btn.onmouseleave = () => { btn.style.transform='translateX(0)'; btn.style.boxShadow='0 2px 10px rgba(0,0,0,0.1)'; };
    btn.onclick = () => eval(f.fn);
    panel.appendChild(btn);
  });

  panel.appendChild(toggleBtn);
  document.body.appendChild(panel);

  // Expose toggle for floating messages via merged button
  window.toggleFloatingMessages = function() {
    const btn = document.getElementById('floatingMsgBtnMerged');
    if (window._floatingMsgInterval) {
      clearInterval(window._floatingMsgInterval);
      window._floatingMsgInterval = null;
      if (btn) { btn.innerHTML = '💌 Thư tình'; btn.style.opacity = '0.6'; }
    } else {
      window._floatingMsgInterval = setInterval(() => {
        const msgs = ["Anh yêu em ♥","Em nhớ anh nhiều lắm 💭","Mỗi ngày bên em là hạnh phúc ✨",
          "Em là điều tuyệt vời nhất 🌸","Yêu mãi mãi nha 💌","Nụ cười của em đẹp quá 😊",
          "Cảm ơn em đã bên anh 🤍","Hai đứa mình mãi vui nha 🌈","Em làm anh hạnh phúc lắm 🥰"];
        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        const el = document.createElement('div');
        el.className = 'floating-msg';
        el.textContent = msg;
        const side = Math.random() > 0.5;
        el.style.cssText = `position:fixed;${side?'left:'+(5+Math.random()*20):'right:'+(5+Math.random()*20)}%;bottom:-50px;
          background:rgba(255,255,255,0.92);backdrop-filter:blur(10px);border-radius:20px;padding:8px 16px;
          font-family:'Caveat',cursive;font-size:15px;color:#8b3a4a;
          box-shadow:0 4px 20px rgba(139,58,74,0.2);border:1px solid rgba(255,182,193,0.5);
          z-index:9990;pointer-events:none;animation:floatUp 5s ease-in forwards;white-space:nowrap;`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 5500);
      }, 8000);
      if (btn) { btn.innerHTML = '💌 Thư tình ✓'; btn.style.opacity = '1'; }
    }
  };
});


// ──────────────────────────────────────────────────────
//  CSS ANIMATIONS (injected)
// ──────────────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
  @keyframes floatUp {
    0%   { transform: translateY(0) rotate(-2deg); opacity: 0; }
    10%  { opacity: 1; }
    80%  { opacity: 1; }
    100% { transform: translateY(-70vh) rotate(3deg); opacity: 0; }
  }
  @keyframes starTwinkle {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.5); }
  }
  @keyframes petalFall {
    0%   { transform: translateY(0) rotate(0deg); opacity: 0.8; }
    100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
  }
  #featurePanel { transition: all 0.3s; }
  .filter-mode-tabs { display:flex; gap:8px; margin-bottom:16px; }
  .filter-mode-btn { flex:1; padding:8px 12px; border-radius:20px; border:1px solid rgba(255,182,193,0.6);
    background:rgba(255,255,255,0.6); cursor:pointer; font-family:'Caveat',cursive; font-size:14px;
    color:#8b3a4a; transition:all 0.2s; }
  .filter-mode-btn.active { background:linear-gradient(135deg,#8b3a4a,#c44569); color:white; border-color:transparent; }
  .search-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .yt-section { background:#f8f8f8; border-radius:12px; padding:12px; margin-bottom:12px; text-align:left; }
  .yt-input-row { display:flex; gap:8px; margin-top:8px; }
  .yt-input { flex:1; border:1px solid #ddd; border-radius:8px; padding:8px; font-family:inherit; font-size:13px; }
  .yt-btn { background:linear-gradient(135deg,#ff0000,#cc0000); color:white; border:none; border-radius:8px;
    padding:8px 14px; cursor:pointer; font-size:13px; white-space:nowrap; font-family:inherit; }
  .yt-status { margin-top:6px; font-size:12px; min-height:16px; color:#666; }
`;
document.head.appendChild(style);
