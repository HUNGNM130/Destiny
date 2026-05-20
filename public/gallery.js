// ============================================================
//  Sphere Image Gallery — vanilla JS port of Joly UI's
//  SphereImageGrid (CSS 3D transforms + spring physics)
//  Integrates with the Love Diary memories API.
// ============================================================
(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────
  const CFG = {
    containerSize:   420,
    sphereRadius:    175,
    dragSensitivity: 0.5,
    momentumDecay:   0.95,
    maxRotSpeed:     5,
    baseImageScale:  0.13,   // fraction of containerSize
    hoverScale:      1.25,
    perspective:     1000,
    autoRotate:      true,
    autoRotateSpeed: 0.12,   // deg/frame
  };

  // ── State ─────────────────────────────────────────────────
  let rotation   = { x: 15, y: 15 };
  let velocity   = { x: 0,  y: 0  };
  let isDragging = false;
  let lastMouse  = { x: 0,  y: 0  };
  let rafId      = null;
  let images     = [];        // { id, src, alt, title, description }
  let positions  = [];        // SphericalPosition[]
  let hoveredIdx = null;
  let sphereEl   = null;
  let isActive   = false;

  // ── Math helpers ──────────────────────────────────────────
  const toRad = d => d * Math.PI / 180;
  const normalizeAngle = a => { while (a > 180) a -= 360; while (a < -180) a += 360; return a; };
  const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

  // ── Fibonacci sphere distribution ─────────────────────────
  function generatePositions(n) {
    const golden = (1 + Math.sqrt(5)) / 2;
    const inc    = 2 * Math.PI / golden;
    const pts    = [];
    for (let i = 0; i < n; i++) {
      const t    = i / n;
      let phi    = Math.acos(1 - 2 * t) * 180 / Math.PI;  // 0..180
      let theta  = ((inc * i) * 180 / Math.PI) % 360;

      // Push slightly toward poles for full coverage
      const poleBoost = (Math.abs(phi - 90) / 90) ** 0.6 * 35;
      phi = phi < 90 ? Math.max(5,   phi - poleBoost)
                     : Math.min(175, phi + poleBoost);
      phi   = 15 + (phi / 180) * 150;
      theta = (theta + (Math.random() - 0.5) * 20 + 360) % 360;
      phi   = clamp(phi + (Math.random() - 0.5) * 10, 0, 180);

      pts.push({ theta, phi, radius: CFG.sphereRadius });
    }
    return pts;
  }

  // ── World-position calculation (matches Joly UI logic) ────
  function calcWorldPositions() {
    const R         = CFG.sphereRadius;
    const baseSize  = CFG.containerSize * CFG.baseImageScale;
    const rotXRad   = toRad(rotation.x);
    const rotYRad   = toRad(rotation.y);
    const fadeStart = -10, fadeEnd = -30;

    const raw = positions.map((pos, idx) => {
      const tRad = toRad(pos.theta), pRad = toRad(pos.phi);
      let x = R * Math.sin(pRad) * Math.cos(tRad);
      let y = R * Math.cos(pRad);
      let z = R * Math.sin(pRad) * Math.sin(tRad);

      // Y-axis rotation (horizontal drag)
      const x1 =  x * Math.cos(rotYRad) + z * Math.sin(rotYRad);
      const z1 = -x * Math.sin(rotYRad) + z * Math.cos(rotYRad);
      x = x1; z = z1;

      // X-axis rotation (vertical drag)
      const y2 = y * Math.cos(rotXRad) - z * Math.sin(rotXRad);
      const z2 = y * Math.sin(rotXRad) + z * Math.cos(rotXRad);
      y = y2; z = z2;

      const isVisible  = z > fadeEnd;
      const fadeOpacity = z <= fadeStart
        ? Math.max(0, (z - fadeEnd) / (fadeStart - fadeEnd))
        : 1;

      const distXY = Math.sqrt(x * x + y * y) / R;
      const isPole = pos.phi < 30 || pos.phi > 150;
      const distPenalty = isPole ? 0.4 : 0.7;
      const centerScale = Math.max(0.3, 1 - distXY * distPenalty);
      const depthScale  = (z + R) / (2 * R);
      const scale = centerScale * Math.max(0.5, 0.8 + depthScale * 0.3);

      return { x, y, z, scale, zIndex: Math.round(1000 + z), isVisible, fadeOpacity, idx };
    });

    // Collision-based scale reduction
    const adjusted = raw.map(p => ({ ...p }));
    for (let i = 0; i < adjusted.length; i++) {
      if (!adjusted[i].isVisible) continue;
      let s = adjusted[i].scale;
      const si = baseSize * s;
      for (let j = 0; j < adjusted.length; j++) {
        if (i === j || !adjusted[j].isVisible) continue;
        const sj = baseSize * adjusted[j].scale;
        const dx = adjusted[i].x - adjusted[j].x;
        const dy = adjusted[i].y - adjusted[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minD = (si + sj) / 2 + 25;
        if (dist < minD && dist > 0) {
          const ovlp = minD - dist;
          s = Math.min(s, s * Math.max(0.4, 1 - (ovlp / minD) * 0.6));
        }
      }
      adjusted[i].scale = Math.max(0.25, s);
    }
    return adjusted;
  }

  // ── DOM: build tile elements ──────────────────────────────
  function buildTiles() {
    sphereEl.innerHTML = '';
    images.forEach((img, i) => {
      const tile = document.createElement('div');
      tile.className     = 'sphere-tile';
      tile.dataset.index = i;

      const inner = document.createElement('div');
      inner.className = 'sphere-tile-inner';

      const imgEl = document.createElement('img');
      imgEl.src           = img.src;
      imgEl.alt           = img.alt || img.title || '';
      imgEl.draggable     = false;
      imgEl.loading       = i < 4 ? 'eager' : 'lazy';
      imgEl.crossOrigin   = 'anonymous';

      inner.appendChild(imgEl);
      tile.appendChild(inner);
      sphereEl.appendChild(tile);

      // Hover
      tile.addEventListener('mouseenter', () => { hoveredIdx = i; });
      tile.addEventListener('mouseleave', () => { hoveredIdx = null; });

      // Click → modal
      tile.addEventListener('click', (e) => {
        if (isDragging) return;
        e.stopPropagation();
        openSphereModal(img);
      });
    });
  }

  // ── Render frame ─────────────────────────────────────────
  function render() {
    if (!isActive) return;

    // Momentum + auto-rotate
    if (!isDragging) {
      velocity.x *= CFG.momentumDecay;
      velocity.y *= CFG.momentumDecay;
      if (CFG.autoRotate) velocity.y += CFG.autoRotateSpeed;
      rotation.x = normalizeAngle(rotation.x + clamp(velocity.x, -CFG.maxRotSpeed, CFG.maxRotSpeed));
      rotation.y = normalizeAngle(rotation.y + clamp(velocity.y, -CFG.maxRotSpeed, CFG.maxRotSpeed));
    }

    const world    = calcWorldPositions();
    const tiles    = sphereEl.querySelectorAll('.sphere-tile');
    const half     = CFG.containerSize / 2;
    const baseSize = CFG.containerSize * CFG.baseImageScale;

    tiles.forEach((tile, i) => {
      const wp = world[i];
      if (!wp || !wp.isVisible) {
        tile.style.opacity = '0';
        tile.style.pointerEvents = 'none';
        return;
      }
      const sz          = baseSize * wp.scale;
      const isHov       = hoveredIdx === i;
      const hoverFactor = isHov ? Math.min(CFG.hoverScale, CFG.hoverScale / wp.scale) : 1;

      tile.style.cssText = `
        position: absolute;
        width:  ${sz}px;
        height: ${sz}px;
        left:   ${half + wp.x}px;
        top:    ${half + wp.y}px;
        opacity: ${wp.fadeOpacity};
        z-index: ${wp.zIndex};
        transform: translate(-50%,-50%) scale(${hoverFactor});
        transition: transform 0.2s ease-out;
        pointer-events: auto;
        cursor: pointer;
      `;
    });

    rafId = requestAnimationFrame(render);
  }

  // ── Modal ─────────────────────────────────────────────────
  function openSphereModal(img) {
    document.getElementById('sphereModalImg').src   = img.src;
    document.getElementById('sphereModalImg').alt   = img.alt || '';
    document.getElementById('sphereModalTitle').textContent = img.title || '';
    document.getElementById('sphereModalDesc').textContent  = img.description || '';
    const m = document.getElementById('sphereModal');
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  window.closeSphereModal = function () {
    document.getElementById('sphereModal').classList.remove('open');
    document.body.style.overflow = '';
  };

  // Keyboard close
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') window.closeSphereModal();
  });

  // ── Drag / touch ─────────────────────────────────────────
  function onDragStart(e) {
    isDragging = true;
    velocity   = { x: 0, y: 0 };
    const src  = e.touches ? e.touches[0] : e;
    lastMouse  = { x: src.clientX, y: src.clientY };
    if (sphereEl) sphereEl.style.cursor = 'grabbing';
    e.preventDefault();
  }

  function onDragMove(e) {
    if (!isDragging) return;
    const src  = e.touches ? e.touches[0] : e;
    const dx   = src.clientX - lastMouse.x;
    const dy   = src.clientY - lastMouse.y;
    const vx   = clamp(-dy * CFG.dragSensitivity, -CFG.maxRotSpeed, CFG.maxRotSpeed);
    const vy   = clamp( dx * CFG.dragSensitivity, -CFG.maxRotSpeed, CFG.maxRotSpeed);
    rotation.x = normalizeAngle(rotation.x + vx);
    rotation.y = normalizeAngle(rotation.y + vy);
    velocity   = { x: vx, y: vy };
    lastMouse  = { x: src.clientX, y: src.clientY };
    e.preventDefault();
  }

  function onDragEnd() {
    isDragging = false;
    if (sphereEl) sphereEl.style.cursor = 'grab';
  }

  // ── Init / teardown ───────────────────────────────────────
  function initSphere() {
    sphereEl = document.getElementById('sphereContainer');
    if (!sphereEl) return;

    // Set container size via JS so CSS vars match
    const outer = document.querySelector('.sphere-outer');
    if (outer) {
      outer.style.width  = CFG.containerSize + 'px';
      outer.style.height = CFG.containerSize + 'px';
    }
    sphereEl.style.width       = CFG.containerSize + 'px';
    sphereEl.style.height      = CFG.containerSize + 'px';
    sphereEl.style.perspective = CFG.perspective + 'px';
    sphereEl.style.cursor      = 'grab';

    // Load memories from API
    fetch('/memories')
      .then(r => r.json())
      .then(mems => {
        // Keep only memories that have images
        const withImg = mems.filter(m => m.image);
        // If fewer than 6 images, pad with Unsplash placeholders
        images = withImg.map(m => ({
          id:          String(m.id),
          src:         m.image,
          alt:         m.title || '',
          title:       m.title || '',
          description: m.description || '',
        }));

        if (images.length < 6) {
          const pads = [
            'photo-1535713875002-d1d0cf377fde','photo-1494790108377-be9c29b29330',
            'photo-1507003211169-0a1dd7228f2d','photo-1438761681033-6461ffad8d80',
            'photo-1472099645785-5658abf4ff4e','photo-1544005313-94ddf0286df2',
            'photo-1500648767791-00dcc994a43e','photo-1534528741775-53994a69daeb',
          ];
          pads.forEach((p, i) => {
            if (images.length >= 10) return;
            images.push({
              id: 'pad' + i,
              src: `https://images.unsplash.com/${p}?w=150&h=150&fit=crop`,
              alt: 'Kỷ niệm', title: 'Kỷ niệm ♥', description: 'Thêm ảnh để hiện ở đây',
            });
          });
        }

        positions = generatePositions(images.length);
        buildTiles();
        isActive = true;
        render();
      })
      .catch(() => {
        // Fallback: all placeholders
        images = Array.from({ length: 10 }, (_, i) => ({
          id: 'p' + i,
          src: `https://picsum.photos/seed/${i + 42}/150/150`,
          alt: 'Ảnh ' + (i + 1), title: 'Kỷ niệm ' + (i + 1), description: '',
        }));
        positions = generatePositions(images.length);
        buildTiles();
        isActive = true;
        render();
      });

    // Events
    sphereEl.addEventListener('mousedown',  onDragStart);
    sphereEl.addEventListener('touchstart', onDragStart, { passive: false });
    document.addEventListener('mousemove',  onDragMove);
    document.addEventListener('touchmove',  onDragMove, { passive: false });
    document.addEventListener('mouseup',    onDragEnd);
    document.addEventListener('touchend',   onDragEnd);
  }

  function destroySphere() {
    isActive = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    sphereEl?.removeEventListener('mousedown',  onDragStart);
    sphereEl?.removeEventListener('touchstart', onDragStart);
    document.removeEventListener('mousemove',  onDragMove);
    document.removeEventListener('touchmove',  onDragMove);
    document.removeEventListener('mouseup',    onDragEnd);
    document.removeEventListener('touchend',   onDragEnd);
    if (sphereEl) sphereEl.innerHTML = '';
  }

  // ── Hook into switchTab ───────────────────────────────────
  const _orig = window.switchTab;
  window.switchTab = function (tab) {
    // Always deactivate gallery first
    document.getElementById('pageGallery').style.display = 'none';
    document.getElementById('tabGallery').classList.remove('active');
    destroySphere();

    if (tab === 'gallery') {
      ['pagePhotos','pageVideos'].forEach(id => document.getElementById(id).style.display = 'none');
      ['tabPhotos','tabVideos'].forEach(id =>  document.getElementById(id).classList.remove('active'));
      document.getElementById('pageGallery').style.display = 'block';
      document.getElementById('tabGallery').classList.add('active');
      initSphere();
    } else {
      _orig(tab);
    }
  };
})();
