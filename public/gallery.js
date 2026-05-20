// ── Sphere Image Gallery ────────────────────────────────────────────────────
// Renders uploaded memories as a rotating 3D sphere of polaroid-style images
// using the Canvas 2D API — no external dependencies needed.

(function () {
  // ── Config ────────────────────────────────────────────────────────────────
  const SPHERE_R      = 200;   // logical sphere radius (px)
  const IMG_SIZE      = 56;    // image tile size on canvas (px)
  const AUTO_SPEED    = 0.004; // radians per frame (auto rotation)
  const DRAG_FRICTION = 0.94;  // velocity decay when released
  const MIN_ALPHA     = 0.18;  // dimmest tile opacity (back of sphere)
  const MAX_SCALE     = 1.0;   // largest tile scale (front of sphere)
  const MIN_SCALE     = 0.38;  // smallest tile scale (back)
  const BORDER        = 3;     // polaroid-style white border (px)

  // ── State ─────────────────────────────────────────────────────────────────
  let canvas, ctx, tooltip;
  let points    = [];   // { phi, theta, img, loaded, title, desc }
  let angleY    = 0;    // current Y rotation (radians)
  let angleX    = 0.35; // slight tilt so sphere doesn't look flat
  let velY      = 0;    // drag velocity
  let dragging  = false;
  let lastX     = 0;
  let rafId     = null;
  let memories  = [];
  let sphereActive = false;

  // ── Fibonacci sphere distribution ────────────────────────────────────────
  // Places N points evenly on a sphere using golden-angle method.
  function fibonacciSphere(n) {
    const pts = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y     = 1 - (i / (n - 1)) * 2;           // -1 to 1
      const r     = Math.sqrt(1 - y * y);
      const theta = golden * i;
      pts.push({
        phi:   Math.asin(y),                           // latitude
        theta: theta,                                  // longitude
        rawX:  r * Math.cos(theta),
        rawY:  y,
        rawZ:  r * Math.sin(theta),
      });
    }
    return pts;
  }

  // ── Build point list from memories ───────────────────────────────────────
  function buildPoints(mems) {
    // Use memories that have an image; fall back to placeholder hearts if < 6
    const withImg = mems.filter(m => m.image);
    let items = withImg.length >= 6 ? withImg : withImg;

    // If no memories yet, show placeholder tiles
    if (items.length === 0) {
      items = Array.from({ length: 16 }, (_, i) => ({
        id: i, image: null,
        title: `Kỷ niệm ${i + 1}`,
        description: 'Thêm ảnh để hiện ở đây ♥'
      }));
    }

    // Ensure we have enough points for a nice sphere (duplicate if needed)
    while (items.length < 14) items = [...items, ...items];
    items = items.slice(0, Math.max(items.length, 16));

    const fibPts = fibonacciSphere(items.length);

    points = fibPts.map((fp, i) => {
      const mem = items[i % items.length];
      const pt  = {
        phi:   fp.phi,
        theta: fp.theta,
        rawX:  fp.rawX,
        rawY:  fp.rawY,
        rawZ:  fp.rawZ,
        title: mem.title || '',
        desc:  mem.description || '',
        img:   null,
        loaded:false,
        placeholder: !mem.image,
        color: randomPastel(),
      };

      if (mem.image) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload  = () => { pt.img = img; pt.loaded = true; };
        img.onerror = () => { pt.placeholder = true; };
        img.src = mem.image;
      }
      return pt;
    });
  }

  function randomPastel() {
    const hues = [0, 20, 340, 350, 15, 330];
    const h = hues[Math.floor(Math.random() * hues.length)];
    return `hsl(${h}, 55%, 88%)`;
  }

  // ── 3D → 2D projection ───────────────────────────────────────────────────
  function project(rawX, rawY, rawZ) {
    // Rotate around X axis (tilt)
    const cosX = Math.cos(angleX), sinX = Math.sin(angleX);
    const y1 = rawY * cosX - rawZ * sinX;
    const z1 = rawY * sinX + rawZ * cosX;

    // Rotate around Y axis (spin)
    const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
    const x2 = rawX * cosY + z1 * sinY;
    const z2 = -rawX * sinY + z1 * cosY;

    // Simple perspective
    const perspective = SPHERE_R * 1.6;
    const scale = perspective / (perspective + z2 * SPHERE_R);

    return {
      sx:    x2 * SPHERE_R * scale,
      sy:    y1 * SPHERE_R * scale,
      depth: z2,           // -1 (back) to 1 (front)
      scale: scale,
    };
  }

  // ── Draw one tile ─────────────────────────────────────────────────────────
  function drawTile(pt, px, py, depth, scale) {
    const s     = IMG_SIZE * scale * (MIN_SCALE + (1 - MIN_SCALE) * ((depth + 1) / 2));
    const alpha = MIN_ALPHA + (1 - MIN_ALPHA) * ((depth + 1) / 2);
    const half  = s / 2;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(px, py);

    // Slight tilt per tile for polaroid feel
    const tilt = (pt.rawX * 0.18 + pt.rawZ * 0.12);
    ctx.rotate(tilt);

    // Shadow
    ctx.shadowColor   = 'rgba(44,26,26,0.22)';
    ctx.shadowBlur    = 8 * scale;
    ctx.shadowOffsetX = 2 * scale;
    ctx.shadowOffsetY = 3 * scale;

    // White polaroid border
    const brd = BORDER * scale;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(-half - brd, -half - brd, s + brd * 2, s + brd * 2 + brd * 3, 2 * scale);
    ctx.fill();

    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    // Image or placeholder
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-half, -half, s, s, 1.5 * scale);
    ctx.clip();

    if (pt.loaded && pt.img) {
      ctx.drawImage(pt.img, -half, -half, s, s);
    } else {
      // Pastel placeholder
      ctx.fillStyle = pt.color;
      ctx.fillRect(-half, -half, s, s);
      ctx.fillStyle = 'rgba(139,58,74,0.35)';
      ctx.font      = `${s * 0.4}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♥', 0, 0);
    }
    ctx.restore();

    ctx.restore();
  }

  // ── Main render loop ──────────────────────────────────────────────────────
  function render() {
    if (!sphereActive) return;

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Auto rotate
    if (!dragging) {
      angleY += AUTO_SPEED + velY;
      velY   *= DRAG_FRICTION;
    }

    const cx = W / 2, cy = H / 2;

    // Project all points
    const projected = points.map(pt => {
      const { sx, sy, depth, scale } = project(pt.rawX, pt.rawY, pt.rawZ);
      return { pt, px: cx + sx, py: cy + sy, depth, scale };
    });

    // Sort back-to-front so front tiles draw on top
    projected.sort((a, b) => a.depth - b.depth);
    projected.forEach(({ pt, px, py, depth, scale }) => {
      drawTile(pt, px, py, depth, scale);
    });

    rafId = requestAnimationFrame(render);
  }

  // ── Tooltip on hover ─────────────────────────────────────────────────────
  function hitTest(mx, my) {
    const cx = canvas.width / 2, cy = canvas.height / 2;
    let best = null, bestDist = Infinity;

    points.forEach(pt => {
      const { sx, sy, depth } = project(pt.rawX, pt.rawY, pt.rawZ);
      const px = cx + sx, py = cy + sy;
      const s  = IMG_SIZE * MAX_SCALE * (MIN_SCALE + (1 - MIN_SCALE) * ((depth + 1) / 2));
      const dist = Math.hypot(mx - px, my - py);
      if (dist < s * 0.7 && dist < bestDist && depth > -0.1) {
        bestDist = dist;
        best = { pt, px, py };
      }
    });
    return best;
  }

  // ── Drag interaction ──────────────────────────────────────────────────────
  function onMouseDown(e) {
    dragging = true;
    lastX    = e.clientX || e.touches?.[0]?.clientX;
    velY     = 0;
    tooltip.style.opacity = '0';
  }

  function onMouseMove(e) {
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;

    if (dragging && clientX != null) {
      const dx = clientX - lastX;
      velY      = dx * 0.01;
      angleY   += velY;
      lastX     = clientX;
      return;
    }

    // Hover tooltip (mouse only)
    if (e.touches) return;
    const rect = canvas.getBoundingClientRect();
    const mx   = clientX - rect.left;
    const my   = clientY - rect.top;
    const hit  = hitTest(mx, my);

    if (hit) {
      tooltip.style.opacity = '1';
      tooltip.style.left    = (rect.left + hit.px + 36) + 'px';
      tooltip.style.top     = (rect.top  + hit.py - 20) + 'px';
      tooltip.innerHTML     = `<strong>${hit.pt.title}</strong>${hit.pt.desc ? '<br>' + hit.pt.desc : ''}`;
      canvas.style.cursor   = 'pointer';
    } else {
      tooltip.style.opacity = '0';
      canvas.style.cursor   = 'grab';
    }
  }

  function onMouseUp() {
    dragging = false;
  }

  // ── Init / teardown ───────────────────────────────────────────────────────
  function initSphere() {
    canvas  = document.getElementById('sphereCanvas');
    tooltip = document.getElementById('sphereTooltip');
    if (!canvas) return;

    ctx = canvas.getContext('2d');

    // Size canvas to its CSS container
    function resize() {
      const wrapper = canvas.parentElement;
      const size    = Math.min(wrapper.offsetWidth, 500);
      canvas.width  = size;
      canvas.height = size;
    }
    resize();
    window.addEventListener('resize', resize);

    // Fetch memories and build sphere
    fetch('/memories')
      .then(r => r.json())
      .then(mems => {
        memories = mems;
        buildPoints(mems);
      })
      .catch(() => buildPoints([]));

    // Events
    canvas.addEventListener('mousedown',  onMouseDown);
    canvas.addEventListener('touchstart', onMouseDown, { passive: true });
    window.addEventListener('mousemove',  onMouseMove);
    window.addEventListener('touchmove',  onMouseMove, { passive: true });
    window.addEventListener('mouseup',    onMouseUp);
    window.addEventListener('touchend',   onMouseUp);

    sphereActive = true;
    render();
  }

  function destroySphere() {
    sphereActive = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  // ── Hook into switchTab ───────────────────────────────────────────────────
  // Patch the existing switchTab function to show/hide gallery page
  const _origSwitchTab = window.switchTab;
  window.switchTab = function (tab) {
    // Handle gallery tab manually since original code doesn't know about it
    document.getElementById('pageGallery').style.display = 'none';
    document.getElementById('tabGallery').classList.remove('active');

    if (tab === 'gallery') {
      // Hide other pages
      document.getElementById('pagePhotos').style.display = 'none';
      document.getElementById('pageVideos').style.display = 'none';
      document.getElementById('tabPhotos').classList.remove('active');
      document.getElementById('tabVideos').classList.remove('active');
      // Show gallery
      document.getElementById('pageGallery').style.display = 'block';
      document.getElementById('tabGallery').classList.add('active');

      if (!sphereActive) initSphere();
      else { sphereActive = true; render(); }
    } else {
      destroySphere();
      _origSwitchTab(tab);
    }
  };

  // ── Canvas polyfill for roundRect (Safari < 15.4) ────────────────────────
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      this.moveTo(x + r, y);
      this.lineTo(x + w - r, y);
      this.quadraticCurveTo(x + w, y, x + w, y + r);
      this.lineTo(x + w, y + h - r);
      this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      this.lineTo(x + r, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - r);
      this.lineTo(x, y + r);
      this.quadraticCurveTo(x, y, x + r, y);
      this.closePath();
    };
  }
})();