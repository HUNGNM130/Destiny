// ══════════════════════════════════════════════════════
//  DECORATIONS — Confetti, Bóng bay, Pháo hoa, Tim/Sao, Đèn
// ══════════════════════════════════════════════════════

let decoActive   = true;
let decoTimers   = [];
let decoCanvas   = null;
let confettiCtx  = null;
let confettiParts = [];
let animFrameId  = null;

// ── Khởi động khi load trang ──────────────────────────
window.addEventListener("load", () => {
  decoActive = false;

  buildToggleBtn();
  buildCanvas();

  const btn = document.getElementById("decoToggleBtn");
  btn.innerHTML = "🎉 Bật trang trí";
});

// ── Nút bật/tắt ───────────────────────────────────────
function buildToggleBtn() {
  const btn = document.createElement("button");
  btn.id = "decoToggleBtn";
  btn.innerHTML = "🎉 Tắt trang trí";
  btn.onclick = toggleDeco;
  document.body.appendChild(btn);
}

function toggleDeco() {
  decoActive = !decoActive;

  const btn = document.getElementById("decoToggleBtn");

  if (decoActive) {
    btn.innerHTML = "🎉 Tắt trang trí";

    buildStringLights();
    startAll();

  } else {

    btn.innerHTML = "🎉 Bật trang trí";

    stopAll();
  }
}
function startAll() {
  startConfetti();
  scheduleBalloonsLoop();
  schedulePhaohoa();
  scheduleFloaters();
}

function stopAll() {
  // Dừng timers
  decoTimers.forEach(t => clearTimeout(t));
  decoTimers = [];

  // Dừng confetti
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  confettiParts = [];
  if (confettiCtx) confettiCtx.clearRect(0, 0, decoCanvas.width, decoCanvas.height);

  // Xóa bóng bay, tim, sao, pháo hoa
  document.querySelectorAll(".deco-balloon, .deco-floater, .deco-firework, .deco-spark")
    .forEach(el => el.remove());

  // Xóa đèn
  const lights = document.getElementById("stringLights");
  if (lights) lights.remove();
}

// ══════════════════════════════════════════════════════
//  1. DÂY ĐÈN NHẤP NHÁY
// ══════════════════════════════════════════════════════
function buildStringLights() {
  const old = document.getElementById("stringLights");
  if (old) old.remove();

  const wrap = document.createElement("div");
  wrap.id = "stringLights";

  const colors = ["#ff6b6b","#ffd93d","#6bcb77","#4d96ff","#ff6bdf","#ff922b","#f06595"];
  const count  = Math.floor(window.innerWidth / 55) + 2;

  for (let i = 0; i < count; i++) {
    const bulb = document.createElement("span");
    bulb.className = "light-bulb";
    bulb.style.setProperty("--c", colors[i % colors.length]);
    bulb.style.animationDelay = (i * 0.18) + "s";
    wrap.appendChild(bulb);
  }
  document.body.insertBefore(wrap, document.body.firstChild);
}

// ══════════════════════════════════════════════════════
//  2. CONFETTI RƠI
// ══════════════════════════════════════════════════════
function buildCanvas() {
  decoCanvas = document.createElement("canvas");
  decoCanvas.id = "confettiCanvas";
  document.body.appendChild(decoCanvas);
  confettiCtx = decoCanvas.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}

function resizeCanvas() {
  if (!decoCanvas) return;
  decoCanvas.width  = window.innerWidth;
  decoCanvas.height = window.innerHeight;
}

const CONFETTI_COLORS = [
  "#ff6b6b","#ffd93d","#6bcb77","#4d96ff",
  "#ff6bdf","#c084fc","#ff922b","#f06595","#fff"
];
const SHAPES = ["rect","circle","ribbon"];

function spawnConfettiParticle() {
  return {
    x:       Math.random() * window.innerWidth,
    y:       -20,
    w:       6 + Math.random() * 8,
    h:       10 + Math.random() * 6,
    color:   CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    shape:   SHAPES[Math.floor(Math.random() * SHAPES.length)],
    vx:      (Math.random() - 0.5) * 2.5,
    vy:      2 + Math.random() * 3,
    angle:   Math.random() * Math.PI * 2,
    spin:    (Math.random() - 0.5) * 0.18,
    opacity: 0.85 + Math.random() * 0.15,
  };
}

function startConfetti() {
  // Spawn liên tục
  function spawnLoop() {
    if (!decoActive) return;
    for (let i = 0; i < 3; i++) confettiParts.push(spawnConfettiParticle());
    const t = setTimeout(spawnLoop, 120);
    decoTimers.push(t);
  }
  spawnLoop();

  function draw() {
    if (!decoActive) return;
    confettiCtx.clearRect(0, 0, decoCanvas.width, decoCanvas.height);
    confettiParts.forEach(p => {
      confettiCtx.save();
      confettiCtx.globalAlpha = p.opacity;
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.angle);
      confettiCtx.fillStyle = p.color;
      if (p.shape === "circle") {
        confettiCtx.beginPath();
        confettiCtx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        confettiCtx.fill();
      } else if (p.shape === "ribbon") {
        confettiCtx.fillRect(-p.w / 2, -p.h / 4, p.w, p.h / 2);
      } else {
        confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      confettiCtx.restore();
      p.x     += p.vx;
      p.y     += p.vy;
      p.angle += p.spin;
      p.vx    += (Math.random() - 0.5) * 0.1;
    });
    // Xóa phần đã rơi xuống đáy
    confettiParts = confettiParts.filter(p => p.y < window.innerHeight + 30);
    animFrameId = requestAnimationFrame(draw);
  }
  draw();
}

// ══════════════════════════════════════════════════════
//  3. BÓNG BAY BAY LÊN
// ══════════════════════════════════════════════════════
const BALLOON_EMOJIS = ["💞","🍀","🐳","✨","🩵"];

function spawnBalloon() {
  const el = document.createElement("div");
  el.className = "deco-balloon";
  el.textContent = BALLOON_EMOJIS[Math.floor(Math.random() * BALLOON_EMOJIS.length)];
  el.style.left     = (5 + Math.random() * 90) + "vw";
  el.style.fontSize = (28 + Math.random() * 28) + "px";
  el.style.animationDuration = (6 + Math.random() * 6) + "s";
  el.style.animationDelay    = (Math.random() * 1) + "s";
  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove());
}

function scheduleBalloonsLoop() {
  if (!decoActive) return;
  spawnBalloon();
  const t = setTimeout(scheduleBalloonsLoop, 900 + Math.random() * 800);
  decoTimers.push(t);
}

// ══════════════════════════════════════════════════════
//  4. PHÁO HOA NỔ
// ══════════════════════════════════════════════════════
function launchFirework() {
  const cx = 15 + Math.random() * 70; // % từ trái
  const cy = 10 + Math.random() * 40; // % từ trên
  const colors = CONFETTI_COLORS;
  const sparkCount = 28 + Math.floor(Math.random() * 16);

  for (let i = 0; i < sparkCount; i++) {
    const spark = document.createElement("div");
    spark.className = "deco-spark";
    spark.style.left = cx + "vw";
    spark.style.top  = cy + "vh";
    spark.style.background = colors[Math.floor(Math.random() * colors.length)];

    const angle = (i / sparkCount) * 360;
    const dist  = 60 + Math.random() * 80;
    const dx    = Math.cos(angle * Math.PI / 180) * dist;
    const dy    = Math.sin(angle * Math.PI / 180) * dist;
    spark.style.setProperty("--dx", dx + "px");
    spark.style.setProperty("--dy", dy + "px");
    spark.style.animationDelay = (Math.random() * 0.1) + "s";
    document.body.appendChild(spark);
    spark.addEventListener("animationend", () => spark.remove());
  }

  // Emoji pháo hoa
  const fw = document.createElement("div");
  fw.className  = "deco-firework";
  fw.textContent = ["🎆","🎇","✨"][Math.floor(Math.random() * 3)];
  fw.style.left = cx + "vw";
  fw.style.top  = cy + "vh";
  document.body.appendChild(fw);
  fw.addEventListener("animationend", () => fw.remove());
}

function schedulePhaohoa() {
  if (!decoActive) return;
  launchFirework();
  const t = setTimeout(schedulePhaohoa, 2200 + Math.random() * 2000);
  decoTimers.push(t);
}

// ══════════════════════════════════════════════════════
//  5. TIM / SAO BAY
// ══════════════════════════════════════════════════════
const FLOATERS = ["✨","🌟","🩵","🍀","🐳"];

function spawnFloater() {
  const el = document.createElement("div");
  el.className   = "deco-floater";
  el.textContent = FLOATERS[Math.floor(Math.random() * FLOATERS.length)];
  el.style.left  = (Math.random() * 95) + "vw";
  el.style.fontSize = (16 + Math.random() * 22) + "px";
  el.style.animationDuration = (5 + Math.random() * 7) + "s";
  el.style.animationDelay    = (Math.random() * 0.5) + "s";
  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove());
}

function scheduleFloaters() {
  if (!decoActive) return;
  spawnFloater();
  const t = setTimeout(scheduleFloaters, 600 + Math.random() * 700);
  decoTimers.push(t);
}
