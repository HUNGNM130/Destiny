require("dotenv").config();

const express    = require("express");
const http       = require("http");
const path       = require("path");
const fs         = require("fs");
const cors       = require("cors");
const multer     = require("multer");
const { Pool }   = require("pg");
const { Server } = require("socket.io");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: "*" } });
const PORT   = process.env.PORT || 3000;

// ─── Database ─────────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("✅ PostgreSQL connected");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS memories (
        id          SERIAL PRIMARY KEY,
        title       VARCHAR(255) NOT NULL,
        date        DATE NOT NULL,
        description TEXT,
        image       TEXT,
        mood        VARCHAR(50)  DEFAULT 'happy',
        location    VARCHAR(255) DEFAULT NULL,
        music       TEXT DEFAULT NULL,
        pos_x       FLOAT        DEFAULT NULL,
        pos_y       FLOAT        DEFAULT NULL,
        pos_rotate  FLOAT        DEFAULT NULL,
        created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`ALTER TABLE memories ALTER COLUMN image TYPE TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS mood VARCHAR(50) DEFAULT 'happy'`).catch(() => {});
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT NULL`).catch(() => {});
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS music TEXT DEFAULT NULL`).catch(() => {});
    await pool.query(`ALTER TABLE memories ALTER COLUMN music TYPE TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS music_url TEXT DEFAULT NULL`).catch(() => {});
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS music_kind VARCHAR(30) DEFAULT NULL`).catch(() => {});
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS music_file_id INTEGER DEFAULT NULL`).catch(() => {});
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS latitude FLOAT DEFAULT NULL`).catch(() => {});
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS longitude FLOAT DEFAULT NULL`).catch(() => {});
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS place_name TEXT DEFAULT NULL`).catch(() => {});
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS is_capsule BOOLEAN DEFAULT FALSE`).catch(() => {});
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS capsule_unlock_at DATE DEFAULT NULL`).catch(() => {});
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS weather_summary TEXT DEFAULT NULL`).catch(() => {});
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS weather_icon VARCHAR(20) DEFAULT NULL`).catch(() => {});
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS weather_temp FLOAT DEFAULT NULL`).catch(() => {});
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS share_token VARCHAR(80) UNIQUE DEFAULT NULL`).catch(() => {});
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS pos_x FLOAT DEFAULT NULL`).catch(() => {});
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS pos_y FLOAT DEFAULT NULL`).catch(() => {});
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS pos_rotate FLOAT DEFAULT NULL`).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id          SERIAL PRIMARY KEY,
        title       VARCHAR(255) NOT NULL,
        date        DATE NOT NULL,
        description TEXT,
        filename    VARCHAR(255),
        pos_x       FLOAT     DEFAULT NULL,
        pos_y       FLOAT     DEFAULT NULL,
        pos_rotate  FLOAT     DEFAULT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);


    await pool.query(`
      CREATE TABLE IF NOT EXISTS love_letters (
        id          SERIAL PRIMARY KEY,
        title       VARCHAR(255) NOT NULL,
        unlock_at   DATE NOT NULL,
        message     TEXT NOT NULL,
        cover_image TEXT,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── Gift page config table ──────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gift_config (
        id            SERIAL PRIMARY KEY,
        config_key    VARCHAR(100) UNIQUE NOT NULL,
        config_value  TEXT,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gift_images (
        id          SERIAL PRIMARY KEY,
        filename    VARCHAR(255),
        mime_type   VARCHAR(100),
        data_url    TEXT NOT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);


    await pool.query(`
      CREATE TABLE IF NOT EXISTS music_files (
        id          SERIAL PRIMARY KEY,
        filename    VARCHAR(255),
        mime_type   VARCHAR(100),
        data_url    TEXT NOT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS anniversary_events (
        id          SERIAL PRIMARY KEY,
        title       VARCHAR(255) NOT NULL,
        event_date  DATE NOT NULL,
        description TEXT,
        memory_id   INTEGER DEFAULT NULL,
        remind      BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS diary_entries (
        id          SERIAL PRIMARY KEY,
        entry_date  DATE UNIQUE NOT NULL,
        mood        VARCHAR(50) DEFAULT NULL,
        content     TEXT NOT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bucket_items (
        id          SERIAL PRIMARY KEY,
        title       VARCHAR(255) NOT NULL,
        notes       TEXT,
        done        BOOLEAN DEFAULT FALSE,
        done_at     DATE DEFAULT NULL,
        image       TEXT DEFAULT NULL,
        memory_id   INTEGER DEFAULT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS goodnight_messages (
        id          SERIAL PRIMARY KEY,
        message     TEXT NOT NULL,
        sent_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_subscriptions (
        id          SERIAL PRIMARY KEY,
        endpoint    TEXT UNIQUE NOT NULL,
        payload     JSONB,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert defaults if not exists
    const defaults = [
      ['appTitle',               'Món Quà Nhỏ'],
      ['appIcon',                'assets/images/couple.svg'],
      ['siteHeroEyebrow',        'Private memory system'],
      ['siteHeroTitle',          'Our Love Diary'],
      ['siteHeroSubtitle',       'Mỗi khoảnh khắc là mãi mãi ✦'],
      ['siteGlobalNotice',       ''],
      ['loveStartDate',          '2025-09-20'],
      ['siteMotionIntensity',    '1'],
      ['enableSiteAurora',       'true'],
      ['enableCardSpotlight',    'true'],
      ['adminWelcomeText',       'Điều khiển giao diện, nội dung và trang quà từ một nơi.'],
      ['sitePrimaryColor',       '#c97b8a'],
      ['siteAccentColor',        '#e8a0b0'],
      ['siteBackgroundStart',    '#fff5ee'],
      ['siteBackgroundMid',      '#ffd3cf'],
      ['siteBackgroundEnd',      '#cbb7ff'],
      ['siteTextColor',          '#3d1a26'],
      ['siteFontBody',           "'DM Sans', system-ui, sans-serif"],
      ['siteFontDisplay',        "'Playfair Display', Georgia, serif"],
      ['siteFontHand',           "'Caveat', cursive"],
      ['passcode',               '0308'],
      ['passcodeTitle',          'Nhập mật khẩu'],
      ['passcodeSubtitle',       'Mở món quà đặc biệt'],
      ['enablePasscode',         'true'],
      ['enableMorphEffect',      'true'],
      ['enableSphere',           'true'],
      ['enableSphereFlyingImages','true'],
      ['enableLetter',           'true'],
      ['morphTexts',             JSON.stringify(['happy', "women's day", 'em iu'])],
      ['particleImage',          ''],
      ['sphereImages',           JSON.stringify([])],
      ['letterText',             "Happy Women's Day!\n\nEm iu, chúc em luôn xinh đẹp\nvà hạnh phúc mỗi ngày! 💕"],
      ['letterImage',            ''],
      ['letterCaption',          '♥'],
      ['bgMusic',                'assets/music/bgmusic.mp3'],
      ['bgVolume',               '0.55'],
      ['giftEnabled',            'true'],
      ['giftStartDate',          ''],
      ['giftEndDate',            ''],
    ];
    for (const [k, v] of defaults) {
      await pool.query(
        `INSERT INTO gift_config (config_key, config_value)
         VALUES ($1, $2)
         ON CONFLICT (config_key) DO NOTHING`,
        [k, v]
      );
    }
    await pool.query("UPDATE gift_config SET config_value='assets/images/couple.svg' WHERE config_key='appIcon' AND config_value='assets/images/couple.png'").catch(() => {});

    console.log("✅ Tables ready");
  } catch (err) {
    console.error("❌ DB init error:", err);
  }
})();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/videos-file", express.static(path.join(__dirname, "uploads-video")));

// Serve gift page static assets
app.use("/mon-qua-nho", express.static(path.join(__dirname, "public", "mon-qua-nho")));
// Serve uploaded gift images
app.use("/gift-uploads", express.static(path.join(__dirname, "uploads-gift")));

app.use(express.static(path.join(__dirname, "client", "dist")));

if (!fs.existsSync("uploads-video"))  fs.mkdirSync("uploads-video");
if (!fs.existsSync("uploads-gift"))   fs.mkdirSync("uploads-gift");

// ─── Storage ──────────────────────────────────────────────────────────────────
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder:          "love-diary",
    resource_type:   "image",
    format:          undefined,
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"],
    transformation:  [{ quality: "auto", fetch_format: "auto" }],
  }),
});

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads-video/"),
  filename:    (req, file, cb) =>
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname)),
});

// Gift images are stored in PostgreSQL as data URLs so they survive Railway redeploys.
const giftImageStorage = multer.memoryStorage();

const uploadImage      = multer({ storage: imageStorage });
const uploadVideo      = multer({ storage: videoStorage });
const uploadGiftImage  = multer({
  storage: giftImageStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|svg\+xml/;
    cb(null, allowed.test(file.mimetype));
  },
});


const uploadMusic = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 18 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /audio\/(mpeg|mp3|wav|ogg|m4a|aac|x-m4a)|application\/octet-stream/.test(file.mimetype || '');
    cb(null, ok || /\.(mp3|wav|ogg|m4a|aac)$/i.test(file.originalname || ''));
  },
});

// ─── Socket.io ────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("🟢 User connected");
  socket.on("moveMemory",   (d) => socket.broadcast.emit("memoryMoved", d));
  socket.on("moveVideo",    (d) => socket.broadcast.emit("videoMoved", d));
  socket.on("deleteMemory", (d) => socket.broadcast.emit("memoryDeleted", d));
  socket.on("deleteVideo",  (d) => socket.broadcast.emit("videoDeleted", d));
  socket.on("cursorMove",   (d) => socket.broadcast.emit("cursorMoved", d));
  socket.on("disconnect",   ()  => console.log("🔴 User disconnected"));
});

// ─── Admin PIN Verify ──────────────────────────────────────────────────────────
// PIN được set qua env var ADMIN_PIN (default: 1234)
// Có rate-limit đơn giản: 5 lần sai → khoá 60s
const adminAttempts = new Map(); // ip → { count, lockedUntil }

app.post("/api/admin-verify", (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const record = adminAttempts.get(ip) || { count: 0, lockedUntil: 0 };

  if (record.lockedUntil > now) {
    const wait = Math.ceil((record.lockedUntil - now) / 1000);
    return res.status(429).json({ ok: false, message: `Thử lại sau ${wait}s` });
  }

  const { pin } = req.body;
  const adminPin = process.env.ADMIN_PIN || "1234";

  if (pin === adminPin) {
    adminAttempts.delete(ip);
    return res.json({ ok: true });
  }

  record.count += 1;
  if (record.count >= 5) {
    record.lockedUntil = now + 60_000;
    record.count = 0;
  }
  adminAttempts.set(ip, record);
  res.json({ ok: false });
});

// GET /api/gift-config  → returns full config object
app.get("/api/gift-config", async (req, res) => {
  try {
    const r = await pool.query("SELECT config_key, config_value FROM gift_config");
    const cfg = {};
    for (const row of r.rows) cfg[row.config_key] = row.config_value;
    res.json(cfg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/gift-config  → update key/value pairs (body: { key: value, ... })
app.put("/api/gift-config", async (req, res) => {
  try {
    const updates = req.body;
    for (const [k, v] of Object.entries(updates)) {
      await pool.query(
        `INSERT INTO gift_config (config_key, config_value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (config_key) DO UPDATE
           SET config_value = $2, updated_at = NOW()`,
        [k, typeof v === "string" ? v : JSON.stringify(v)]
      );
    }
    io.emit("giftConfigUpdated");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gift-upload-image  → upload gift image into DB, returns stable URL
app.post("/api/gift-upload-image", uploadGiftImage.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  try {
    const mime = req.file.mimetype || "image/jpeg";
    const base64 = req.file.buffer.toString("base64");
    const dataUrl = `data:${mime};base64,${base64}`;
    const r = await pool.query(
      "INSERT INTO gift_images (filename,mime_type,data_url) VALUES ($1,$2,$3) RETURNING id",
      [req.file.originalname || null, mime, dataUrl]
    );
    const url = `/api/gift-images/${r.rows[0].id}/data`;
    res.json({ success: true, url, id: r.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gift-images  → list DB gift images (plus legacy local images if present)
app.get("/api/gift-images", async (req, res) => {
  try {
    const r = await pool.query("SELECT id FROM gift_images ORDER BY created_at DESC, id DESC");
    const urls = r.rows.map(row => `/api/gift-images/${row.id}/data`);
    const dir = path.join(__dirname, "uploads-gift");
    if (fs.existsSync(dir)) {
      const legacy = fs.readdirSync(dir)
        .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
        .map(f => `/gift-uploads/${f}`);
      urls.push(...legacy);
    }
    res.json(urls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gift-images/:id/data  → serve a DB-stored image
app.get("/api/gift-images/:id/data", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).send("Bad image id");
    const r = await pool.query("SELECT mime_type,data_url FROM gift_images WHERE id=$1", [id]);
    if (!r.rowCount) return res.status(404).send("Not found");
    const dataUrl = r.rows[0].data_url || "";
    const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
    if (!match) return res.status(500).send("Invalid stored image");
    res.setHeader("Content-Type", r.rows[0].mime_type || match[1] || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(Buffer.from(match[2], "base64"));
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// DELETE /api/gift-images/:id  → delete DB image, or legacy file by filename
app.delete("/api/gift-images/:id", async (req, res) => {
  try {
    const maybeId = Number(req.params.id);
    if (Number.isInteger(maybeId)) {
      await pool.query("DELETE FROM gift_images WHERE id=$1", [maybeId]);
      return res.json({ success: true });
    }
    const fp = path.join(__dirname, "uploads-gift", req.params.id);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /mon-qua-nho/config.js  → dynamic JS config for the gift page
app.get("/mon-qua-nho/config.js", async (req, res) => {
  try {
    const r = await pool.query("SELECT config_key, config_value FROM gift_config");
    const cfg = {};
    for (const row of r.rows) cfg[row.config_key] = row.config_value;

    // Parse JSON fields
    const morphTexts    = JSON.parse(cfg.morphTexts    || "[]");
    const sphereImages  = JSON.parse(cfg.sphereImages  || "[]");
    const bgVolume      = parseFloat(cfg.bgVolume || "0.55");

    const js = `window.APP_CONFIG = ${JSON.stringify({
      appTitle:                cfg.appTitle         || "Món Quà Nhỏ",
      appIcon:                 cfg.appIcon          || "assets/images/couple.svg",
      siteHeroEyebrow:          cfg.siteHeroEyebrow  || "Private memory system",
      siteHeroTitle:            cfg.siteHeroTitle    || cfg.appTitle || "Món Quà Nhỏ",
      siteHeroSubtitle:         cfg.siteHeroSubtitle || "Mỗi khoảnh khắc là mãi mãi ✦",
      siteGlobalNotice:         cfg.siteGlobalNotice || "",
      loveStartDate:            cfg.loveStartDate    || "2025-09-20",
      siteStyle: {
        primaryColor:       cfg.sitePrimaryColor    || "#c97b8a",
        accentColor:        cfg.siteAccentColor     || "#e8a0b0",
        backgroundStart:    cfg.siteBackgroundStart || "#fff5ee",
        backgroundMid:      cfg.siteBackgroundMid   || "#ffd3cf",
        backgroundEnd:      cfg.siteBackgroundEnd   || "#cbb7ff",
        textColor:          cfg.siteTextColor       || "#3d1a26",
        fontBody:           cfg.siteFontBody        || "'DM Sans', system-ui, sans-serif",
        fontDisplay:        cfg.siteFontDisplay     || "'Playfair Display', Georgia, serif",
        fontHand:           cfg.siteFontHand        || "'Caveat', cursive",
      },
      passcode:                cfg.passcode         || "0308",
      passcodeTitle:           cfg.passcodeTitle    || "Nhập mật khẩu",
      passcodeSubtitle:        cfg.passcodeSubtitle || "Mở món quà đặc biệt",
      enablePasscode:          cfg.enablePasscode   !== "false",
      enableMorphEffect:       cfg.enableMorphEffect !== "false",
      enableSphere:            cfg.enableSphere     !== "false",
      enableSphereFlyingImages:cfg.enableSphereFlyingImages !== "false",
      enableLetter:            cfg.enableLetter     !== "false",
      morphTexts,
      particleImage:           cfg.particleImage    || "",
      sphereImages,
      letter: {
        text:    cfg.letterText    || "",
        image:   cfg.letterImage   || "",
        caption: cfg.letterCaption || "♥",
      },
      bgMusic:  cfg.bgMusic  || "assets/music/bgmusic.mp3",
      bgVolume,
    }, null, 2)};`;

    res.setHeader("Content-Type", "application/javascript");
    res.send(js);
  } catch (err) {
    res.status(500).send(`console.error("Config error: ${err.message}")`);
  }
});


// ─── Admin media tools ───────────────────────────────────────────────────────
async function checkImageStatus(image) {
  if (!image) return { status: "missing", reason: "Không có link ảnh trong DB" };
  if (String(image).startsWith("data:image")) return { status: "embedded", reason: "Ảnh dạng base64 trong DB" };

  try {
    const url = String(image).startsWith("http")
      ? String(image)
      : `http://127.0.0.1:${PORT}${String(image).startsWith("/") ? image : `/${image}`}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    let response = await fetch(url, { method: "HEAD", signal: controller.signal });
    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, { method: "GET", signal: controller.signal });
    }
    clearTimeout(timer);
    const type = response.headers.get("content-type") || "";
    if (response.ok && type.includes("image")) return { status: "ok", reason: `OK ${response.status}` };
    if (response.ok) return { status: "unchecked", reason: `Có phản hồi nhưng content-type là ${type || "không rõ"}` };
    return { status: "broken", reason: `HTTP ${response.status}` };
  } catch (err) {
    return { status: "broken", reason: err.name === "AbortError" ? "Timeout khi tải ảnh" : err.message };
  }
}

app.get("/api/admin/media-audit", async (req, res) => {
  try {
    const r = await pool.query("SELECT id,title,date,image FROM memories ORDER BY date DESC, id DESC");
    const items = [];
    for (const row of r.rows) {
      const checked = await checkImageStatus(row.image);
      items.push({ ...row, ...checked });
    }
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/memories/:id/image", async (req, res) => {
  try {
    const r = await pool.query("UPDATE memories SET image=NULL WHERE id=$1 RETURNING *", [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: "Not found" });
    io.emit("memoryUpdated", r.rows[0]);
    res.json({ success: true, memory: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/admin/memories/:id/image", async (req, res) => {
  try {
    const { image } = req.body;
    const r = await pool.query("UPDATE memories SET image=$1 WHERE id=$2 RETURNING *", [image || null, req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: "Not found" });
    io.emit("memoryUpdated", r.rows[0]);
    res.json({ success: true, memory: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ─── Wow feature helpers ─────────────────────────────────────────────────────
function boolish(value) {
  return value === true || value === "true" || value === "1" || value === "on";
}

function randomToken(size = 24) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < size; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function normalizeMusicKind(kind, url) {
  const value = String(kind || "").trim().toLowerCase();
  if (value) return value;
  if (/youtube\.com|youtu\.be/i.test(String(url || ""))) return "youtube";
  if (String(url || "").includes("/api/music-files/")) return "mp3";
  return url ? "link" : null;
}

function weatherCodeToText(code) {
  const map = {
    0: ["☀️", "Trời quang"], 1: ["🌤️", "Ít mây"], 2: ["⛅", "Có mây"], 3: ["☁️", "Nhiều mây"],
    45: ["🌫️", "Sương mù"], 48: ["🌫️", "Sương mù đóng băng"],
    51: ["🌦️", "Mưa phùn nhẹ"], 53: ["🌦️", "Mưa phùn"], 55: ["🌧️", "Mưa phùn dày"],
    61: ["🌧️", "Mưa nhẹ"], 63: ["🌧️", "Mưa vừa"], 65: ["⛈️", "Mưa lớn"],
    71: ["🌨️", "Tuyết nhẹ"], 73: ["🌨️", "Tuyết"], 75: ["❄️", "Tuyết dày"],
    80: ["🌦️", "Mưa rào nhẹ"], 81: ["🌧️", "Mưa rào"], 82: ["⛈️", "Mưa rào mạnh"],
    95: ["⛈️", "Dông"], 96: ["⛈️", "Dông kèm mưa đá"], 99: ["⛈️", "Dông mạnh"],
  };
  return map[Number(code)] || ["🌈", "Không rõ thời tiết"];
}

async function fetchMemoryWeather({ latitude, longitude, date }) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !date) return null;
  const day = String(date).slice(0, 10);
  try {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&start_date=${encodeURIComponent(day)}&end_date=${encodeURIComponent(day)}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
    const response = await fetch(url, { headers: { "accept": "application/json" } });
    if (!response.ok) return null;
    const data = await response.json();
    const code = data?.daily?.weather_code?.[0];
    const [icon, text] = weatherCodeToText(code);
    const max = data?.daily?.temperature_2m_max?.[0];
    const min = data?.daily?.temperature_2m_min?.[0];
    const temp = Number.isFinite(Number(max)) && Number.isFinite(Number(min)) ? Math.round((Number(max) + Number(min)) / 2) : null;
    return { weather_icon: icon, weather_summary: text, weather_temp: temp };
  } catch {
    return null;
  }
}

app.get("/api/geocode", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json([]);
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&addressdetails=1&q=${encodeURIComponent(q)}`;
    const response = await fetch(url, { headers: { "User-Agent": "OurLoveDiary/1.0" } });
    const data = await response.json();
    res.json((Array.isArray(data) ? data : []).map(item => ({
      label: item.display_name,
      lat: Number(item.lat),
      lon: Number(item.lon),
      type: item.type,
      importance: item.importance,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/music-upload", uploadMusic.single("music"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Chưa có file MP3/audio" });
  try {
    const mime = req.file.mimetype || "audio/mpeg";
    const base64 = req.file.buffer.toString("base64");
    const dataUrl = `data:${mime};base64,${base64}`;
    const r = await pool.query(
      "INSERT INTO music_files (filename,mime_type,data_url) VALUES ($1,$2,$3) RETURNING id, filename",
      [req.file.originalname || "memory-song.mp3", mime, dataUrl]
    );
    res.json({ success: true, id: r.rows[0].id, url: `/api/music-files/${r.rows[0].id}/data`, filename: r.rows[0].filename });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/music-files/:id/data", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).send("Bad music id");
    const r = await pool.query("SELECT mime_type,data_url FROM music_files WHERE id=$1", [id]);
    if (!r.rowCount) return res.status(404).send("Not found");
    const dataUrl = r.rows[0].data_url || "";
    const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
    if (!match) return res.status(500).send("Invalid stored audio");
    res.setHeader("Content-Type", r.rows[0].mime_type || match[1] || "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(Buffer.from(match[2], "base64"));
  } catch (err) { res.status(500).send(err.message); }
});

// ─── Calendar anniversary events ─────────────────────────────────────────────
app.get("/api/anniversary-events", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM anniversary_events ORDER BY event_date ASC, id DESC");
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/anniversary-events", async (req, res) => {
  try {
    const { title, event_date, description, memory_id, remind } = req.body;
    if (!title || !event_date) return res.status(400).json({ error: "Thiếu title hoặc ngày" });
    const r = await pool.query(
      "INSERT INTO anniversary_events (title,event_date,description,memory_id,remind) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [title, event_date, description || null, memory_id || null, remind !== false]
    );
    io.emit("anniversaryEventsUpdated");
    res.json({ success: true, event: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/anniversary-events/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM anniversary_events WHERE id=$1", [req.params.id]);
    io.emit("anniversaryEventsUpdated");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI love letter with Anthropic ───────────────────────────────────────────
app.post("/api/ai-love-letter", async (req, res) => {
  try {
    const { keywords = "", tone = "ngọt ngào", name = "em" } = req.body || {};
    const prompt = `Viết một bức thư tình tiếng Việt thật lãng mạn, chân thành, không sến quá. Người nhận là ${name}. Từ khóa/kỷ niệm cần đưa vào: ${keywords}. Giọng văn: ${tone}. Độ dài khoảng 250-450 chữ, có mở đầu và kết thúc ấm áp.`;
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.json({
        success: true,
        fallback: true,
        letter: `Gửi ${name || "em"},\n\nAnh viết những dòng này từ vài mảnh ký ức nhỏ: ${keywords || "những ngày mình ở bên nhau"}. Không biết từ bao giờ, những điều bình thường như một buổi sáng có cà phê, một cơn mưa đi ngang, hay một đoạn đường quen lại trở thành nơi anh cất giữ nỗi nhớ.\n\nAnh thích cách em làm mọi thứ trở nên dịu hơn. Ở cạnh em, anh thấy thời gian không chỉ trôi qua, mà còn biết để lại những dấu yêu. Nếu có thể, anh muốn được cùng em gom thêm thật nhiều ngày như thế: có tiếng cười, có những lần giận hờn rồi lại thương nhau hơn, có cả những khoảnh khắc chỉ cần im lặng bên nhau cũng đủ bình yên.\n\nCảm ơn em vì đã xuất hiện trong cuộc đời anh. Mong rằng sau này, khi đọc lại bức thư này, mình vẫn sẽ mỉm cười vì đã từng và vẫn đang yêu nhau nhiều đến vậy.\n\nThương em thật nhiều.`
      });
    }
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": process.env.ANTHROPIC_VERSION || "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
        max_tokens: 1200,
        temperature: 0.85,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || "Anthropic API error" });
    const letter = (data?.content || []).map(part => part.text || "").join("\n").trim();
    res.json({ success: true, letter });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Public memory sharing ───────────────────────────────────────────────────
app.post("/memories/:id/share", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await pool.query("SELECT share_token FROM memories WHERE id=$1", [id]);
    if (!existing.rowCount) return res.status(404).json({ error: "Không tìm thấy kỷ niệm" });
    let token = existing.rows[0].share_token;
    if (!token) {
      token = randomToken(28);
      await pool.query("UPDATE memories SET share_token=$1 WHERE id=$2", [token, id]);
    }
    res.json({ success: true, token, url: `/share/${token}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/share/:token", async (req, res) => {
  try {
    const r = await pool.query("SELECT id,title,date,description,image,mood,location,music,music_url,music_kind,weather_summary,weather_icon,weather_temp FROM memories WHERE share_token=$1", [req.params.token]);
    if (!r.rowCount) return res.status(404).json({ error: "Not found" });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/share/:token", async (req, res) => {
  try {
    const r = await pool.query("SELECT title,date,description,image,location,music,weather_summary,weather_icon,weather_temp FROM memories WHERE share_token=$1", [req.params.token]);
    if (!r.rowCount) return res.status(404).send("Memory not found");
    const m = r.rows[0];
    const safe = (v) => String(v || "").replace(/[&<>\"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[ch]));
    res.send(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe(m.title)} · Our Love Diary</title><style>body{margin:0;min-height:100vh;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:linear-gradient(135deg,#fff5ee,#ffd6de,#d9ccff);display:grid;place-items:center;color:#3d1a26}.card{width:min(720px,92vw);background:rgba(255,255,255,.82);border:1px solid rgba(255,255,255,.7);border-radius:32px;box-shadow:0 25px 80px rgba(90,38,64,.22);overflow:hidden}.photo{width:100%;max-height:62vh;object-fit:cover;display:block}.body{padding:28px}.eyebrow{text-transform:uppercase;letter-spacing:.18em;font-size:.72rem;opacity:.65}h1{font-family:Georgia,serif;font-size:clamp(2rem,6vw,4rem);margin:.25rem 0 1rem}.watermark{margin-top:20px;font-weight:800;opacity:.55}</style></head><body><main class="card">${m.image ? `<img class="photo" src="${safe(m.image)}" alt="${safe(m.title)}">` : ""}<section class="body"><span class="eyebrow">${new Date(m.date).toLocaleDateString("vi-VN")}</span><h1>${safe(m.title)}</h1>${m.location ? `<p>📍 ${safe(m.location)}</p>` : ""}${m.music ? `<p>🎵 ${safe(m.music)}</p>` : ""}${m.weather_summary ? `<p>${safe(m.weather_icon)} ${safe(m.weather_summary)}${m.weather_temp != null ? ` · ${safe(m.weather_temp)}°C` : ""}</p>` : ""}<p>${safe(m.description)}</p><div class="watermark">Our Love Diary</div></section></main></body></html>`);
  } catch (err) { res.status(500).send(err.message); }
});

// ─── Diary / Bucket / Good night ─────────────────────────────────────────────
app.get("/api/diary-entries", async (req, res) => {
  try { const r = await pool.query("SELECT * FROM diary_entries ORDER BY entry_date DESC"); res.json(r.rows); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post("/api/diary-entries", async (req, res) => {
  try {
    const { entry_date, mood, content } = req.body;
    if (!entry_date || !content) return res.status(400).json({ error: "Thiếu ngày hoặc nội dung" });
    const r = await pool.query(`INSERT INTO diary_entries (entry_date,mood,content,updated_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT (entry_date) DO UPDATE SET mood=$2,content=$3,updated_at=NOW() RETURNING *`, [entry_date, mood || null, content]);
    res.json({ success: true, entry: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete("/api/diary-entries/:id", async (req, res) => { try { await pool.query("DELETE FROM diary_entries WHERE id=$1", [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

app.get("/api/bucket-items", async (req, res) => { try { const r = await pool.query("SELECT * FROM bucket_items ORDER BY done ASC, created_at DESC"); res.json(r.rows); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post("/api/bucket-items", async (req, res) => {
  try {
    const { title, notes } = req.body;
    if (!title) return res.status(400).json({ error: "Thiếu title" });
    const r = await pool.query("INSERT INTO bucket_items (title,notes) VALUES ($1,$2) RETURNING *", [title, notes || null]);
    res.json({ success: true, item: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.patch("/api/bucket-items/:id", async (req, res) => {
  try {
    const { title, notes, done, done_at, image, create_memory } = req.body;
    const existing = await pool.query("SELECT title,notes,done,done_at,image FROM bucket_items WHERE id=$1", [req.params.id]);
    if (!existing.rowCount) return res.status(404).json({ error: "Not found" });
    const current = existing.rows[0];
    const nextDone = done === undefined ? current.done : boolish(done);
    const nextDoneAt = done_at !== undefined ? (done_at || null) : (nextDone ? (current.done_at || new Date().toISOString().slice(0,10)) : null);
    const r = await pool.query("UPDATE bucket_items SET title=$1,notes=$2,done=$3,done_at=$4,image=$5 WHERE id=$6 RETURNING *", [title ?? current.title, notes ?? current.notes, nextDone, nextDoneAt, image ?? current.image, req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: "Not found" });
    let memory = null;
    if (boolish(done) && boolish(create_memory) && !r.rows[0].memory_id) {
      const mem = await pool.query("INSERT INTO memories (title,date,description,image,mood) VALUES ($1,$2,$3,$4,$5) RETURNING *", [`Hoàn thành bucket list: ${r.rows[0].title}`, r.rows[0].done_at || new Date().toISOString().slice(0,10), r.rows[0].notes || "Một điều hai đứa đã cùng nhau hoàn thành.", image || null, "🎯"]);
      memory = mem.rows[0];
      await pool.query("UPDATE bucket_items SET memory_id=$1 WHERE id=$2", [memory.id, req.params.id]);
      io.emit("memoryAdded", memory);
    }
    res.json({ success: true, item: r.rows[0], memory });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete("/api/bucket-items/:id", async (req, res) => { try { await pool.query("DELETE FROM bucket_items WHERE id=$1", [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

app.get("/api/goodnight-messages", async (req, res) => { try { const r = await pool.query("SELECT * FROM goodnight_messages ORDER BY sent_at DESC"); res.json(r.rows); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post("/api/goodnight-messages", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Thiếu tin nhắn" });
    const r = await pool.query("INSERT INTO goodnight_messages (message) VALUES ($1) RETURNING *", [message]);
    res.json({ success: true, item: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete("/api/goodnight-messages/:id", async (req, res) => { try { await pool.query("DELETE FROM goodnight_messages WHERE id=$1", [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

app.get("/api/reminders/today", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(5, 10);
    const [events, memories, letters] = await Promise.all([
      pool.query("SELECT 'event' AS kind,id,title,event_date AS date,description FROM anniversary_events WHERE remind=true AND to_char(event_date,'MM-DD')=$1", [today]),
      pool.query("SELECT 'memory' AS kind,id,title,date,description FROM memories WHERE to_char(date,'MM-DD')=$1", [today]),
      pool.query("SELECT 'letter' AS kind,id,title,unlock_at AS date,preview FROM (SELECT id,title,unlock_at,LEFT(message,120) AS preview FROM love_letters) x WHERE unlock_at::date=CURRENT_DATE"),
    ]);
    res.json([...events.rows, ...memories.rows, ...letters.rows]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Future Love Letters ─────────────────────────────────────────────────────
function letterIsUnlocked(unlockAt) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(unlockAt);
  d.setHours(0, 0, 0, 0);
  return d.getTime() <= today.getTime();
}

app.get("/api/admin/letters", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM love_letters ORDER BY unlock_at ASC, id DESC");
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/letters", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM love_letters ORDER BY unlock_at ASC, id DESC");
    const letters = r.rows.map(row => {
      const unlocked = letterIsUnlocked(row.unlock_at);
      return {
        ...row,
        unlocked,
        message: unlocked ? row.message : null,
        preview: unlocked ? row.message.slice(0, 120) : "Bức thư này vẫn đang được khóa tới ngày hẹn."
      };
    });
    res.json(letters);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/letters", async (req, res) => {
  try {
    const { title, unlock_at, message, cover_image } = req.body;
    if (!title || !unlock_at || !message) return res.status(400).json({ error: "Thiếu title, ngày mở khóa hoặc nội dung thư" });
    const r = await pool.query(
      "INSERT INTO love_letters (title,unlock_at,message,cover_image) VALUES ($1,$2,$3,$4) RETURNING *",
      [title, unlock_at, message, cover_image || null]
    );
    io.emit("lettersUpdated");
    res.json({ success: true, letter: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/letters/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM love_letters WHERE id=$1", [req.params.id]);
    io.emit("lettersUpdated");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/letters/:id", async (req, res) => {
  try {
    const { title, unlock_at, message, cover_image } = req.body;
    if (!title || !unlock_at || !message) return res.status(400).json({ error: "Thiếu title, ngày mở khóa hoặc nội dung thư" });
    const r = await pool.query(
      "UPDATE love_letters SET title=$1,unlock_at=$2,message=$3,cover_image=$4 WHERE id=$5 RETURNING *",
      [title, unlock_at, message, cover_image || null, req.params.id]
    );
    if (!r.rowCount) return res.status(404).json({ error: "Not found" });
    io.emit("lettersUpdated");
    res.json({ success: true, letter: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/diary-entries/:id", async (req, res) => {
  try {
    const { entry_date, mood, content } = req.body;
    if (!entry_date || !content) return res.status(400).json({ error: "Thiếu ngày hoặc nội dung" });
    const r = await pool.query("UPDATE diary_entries SET entry_date=$1,mood=$2,content=$3,updated_at=NOW() WHERE id=$4 RETURNING *", [entry_date, mood || null, content, req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, entry: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch("/api/goodnight-messages/:id", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Thiếu tin nhắn" });
    const r = await pool.query("UPDATE goodnight_messages SET message=$1 WHERE id=$2 RETURNING *", [message, req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, item: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/admin/backup", async (req, res) => {
  try {
    const [memories, videos, letters, gift, anniversaryEvents, diaryEntries, bucketItems, goodnightMessages] = await Promise.all([
      pool.query("SELECT * FROM memories ORDER BY date DESC, id DESC"),
      pool.query("SELECT * FROM videos ORDER BY date DESC, id DESC"),
      pool.query("SELECT * FROM love_letters ORDER BY unlock_at ASC, id DESC"),
      pool.query("SELECT config_key, config_value FROM gift_config ORDER BY config_key ASC"),
      pool.query("SELECT * FROM anniversary_events ORDER BY event_date ASC, id DESC"),
      pool.query("SELECT * FROM diary_entries ORDER BY entry_date DESC"),
      pool.query("SELECT * FROM bucket_items ORDER BY done ASC, created_at DESC"),
      pool.query("SELECT * FROM goodnight_messages ORDER BY sent_at DESC")
    ]);
    res.json({
      exported_at: new Date().toISOString(),
      memories: memories.rows,
      videos: videos.rows,
      letters: letters.rows,
      gift_config: gift.rows,
      anniversary_events: anniversaryEvents.rows,
      diary_entries: diaryEntries.rows,
      bucket_items: bucketItems.rows,
      goodnight_messages: goodnightMessages.rows
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Memories ─────────────────────────────────────────────────────────────────
app.get("/memories", async (req, res) => {
  try {
    const { date, date_from, date_to } = req.query;
    let query = "SELECT * FROM memories";
    const params = [];

    if (date) {
      params.push(date);
      query += ` WHERE date = $${params.length}`;
    } else if (date_from || date_to) {
      const conditions = [];
      if (date_from) { params.push(date_from); conditions.push(`date >= $${params.length}`); }
      if (date_to)   { params.push(date_to);   conditions.push(`date <= $${params.length}`); }
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY date DESC";
    const r = await pool.query(query, params);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/memories", (req, res) => {
  uploadImage.single("image")(req, res, async (uploadErr) => {
    if (uploadErr) { console.error("[UPLOAD ERROR]", uploadErr.message); req.file = null; }
    const { title, date, description, mood, location, music, music_url, music_kind, music_file_id, latitude, longitude, place_name, is_capsule, capsule_unlock_at } = req.body;
    if (!title || !date) return res.status(400).json({ error: "Thiếu title hoặc date" });

    let image = null;
    if (req.file) {
      const raw = req.file.secure_url || req.file.url || req.file.path || "";
      image = raw.startsWith("http") ? raw : cloudinary.url(raw, { secure: true });
    }

    const lat = latitude === "" || latitude == null ? null : Number(latitude);
    const lon = longitude === "" || longitude == null ? null : Number(longitude);
    const weather = await fetchMemoryWeather({ latitude: lat, longitude: lon, date });

    try {
      const r = await pool.query(
        `INSERT INTO memories (title,date,description,image,mood,location,music,music_url,music_kind,music_file_id,latitude,longitude,place_name,is_capsule,capsule_unlock_at,weather_summary,weather_icon,weather_temp)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
        [title, date, description, image, mood || null, location || null, music || null, music_url || null, normalizeMusicKind(music_kind, music_url), music_file_id || null, Number.isFinite(lat) ? lat : null, Number.isFinite(lon) ? lon : null, place_name || location || null, boolish(is_capsule), capsule_unlock_at || null, weather?.weather_summary || null, weather?.weather_icon || null, weather?.weather_temp ?? null]
      );
      const saved = r.rows[0];
      io.emit("memoryAdded", saved);
      res.json({ success: true, id: saved.id, memory: saved });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
});

app.put("/memories/:id", (req, res) => {
  uploadImage.single("image")(req, res, async (uploadErr) => {
    if (uploadErr) { console.error("[UPLOAD ERROR]", uploadErr.message); req.file = null; }
    const { title, date, description, mood, location, music, music_url, music_kind, music_file_id, latitude, longitude, place_name, is_capsule, capsule_unlock_at } = req.body;
    const { id } = req.params;

    let imageUrl = null;
    if (req.file) {
      const raw = req.file.secure_url || req.file.path || req.file.url || "";
      imageUrl = raw.startsWith("http") ? raw : cloudinary.url(raw, { secure: true });
    }

    const lat = latitude === "" || latitude == null ? null : Number(latitude);
    const lon = longitude === "" || longitude == null ? null : Number(longitude);
    const weather = await fetchMemoryWeather({ latitude: lat, longitude: lon, date });

    try {
      if (!imageUrl) {
        const old = await pool.query("SELECT image, weather_summary, weather_icon, weather_temp FROM memories WHERE id=$1", [id]);
        imageUrl = old.rows[0]?.image || null;
      }
      const r = await pool.query(
        `UPDATE memories SET title=$1,date=$2,description=$3,image=$4,mood=$5,location=$6,music=$7,music_url=$8,music_kind=$9,music_file_id=$10,latitude=$11,longitude=$12,place_name=$13,is_capsule=$14,capsule_unlock_at=$15,weather_summary=COALESCE($16,weather_summary),weather_icon=COALESCE($17,weather_icon),weather_temp=COALESCE($18,weather_temp)
         WHERE id=$19 RETURNING *`,
        [title, date, description, imageUrl, mood || null, location || null, music || null, music_url || null, normalizeMusicKind(music_kind, music_url), music_file_id || null, Number.isFinite(lat) ? lat : null, Number.isFinite(lon) ? lon : null, place_name || location || null, boolish(is_capsule), capsule_unlock_at || null, weather?.weather_summary || null, weather?.weather_icon || null, weather?.weather_temp ?? null, id]
      );
      const saved = r.rows[0];
      io.emit("memoryUpdated", saved);
      res.json({ success: true, memory: saved });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
});

app.delete("/memories/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM memories WHERE id=$1", [req.params.id]);
    io.emit("memoryDeleted", { id: Number(req.params.id) });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch("/memories/:id/position", async (req, res) => {
  try {
    const x = Number(req.body.x);
    const y = Number(req.body.y);
    const rotate = Number(req.body.rotate || 0);
    const id = Number(req.params.id);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(rotate) || !Number.isInteger(id)) {
      return res.status(400).json({ error: "Vị trí không hợp lệ" });
    }
    const r = await pool.query(
      "UPDATE memories SET pos_x=$1,pos_y=$2,pos_rotate=$3 WHERE id=$4 RETURNING id,pos_x,pos_y,pos_rotate",
      [x, y, rotate, id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "Không tìm thấy kỷ niệm" });
    io.emit("memoryMoved", { id, x, y, rotate });
    res.json({ success: true, id, x, y, rotate });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Videos ───────────────────────────────────────────────────────────────────
app.get("/videos", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM videos ORDER BY date DESC");
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/videos", uploadVideo.single("video"), async (req, res) => {
  try {
    const { title, date, description } = req.body;
    const filename = req.file?.filename;
    if (!filename) return res.status(400).json({ error: "Chưa có file video" });

    const r = await pool.query(
      "INSERT INTO videos (title,date,description,filename) VALUES ($1,$2,$3,$4) RETURNING id",
      [title, date, description, filename]
    );
    const id = r.rows[0].id;
    const newVideo = { id, title, date, description, filename, pos_x: null, pos_y: null, pos_rotate: null };
    io.emit("videoAdded", newVideo);
    res.json({ success: true, id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/videos/:id", uploadVideo.single("video"), async (req, res) => {
  try {
    const { title, date, description } = req.body;
    const { id } = req.params;

    if (req.file) {
      const r = await pool.query("SELECT filename FROM videos WHERE id=$1", [id]);
      const oldFilename = r.rows[0]?.filename;
      if (oldFilename) {
        const fp = path.join(__dirname, "uploads-video", oldFilename);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
      await pool.query("UPDATE videos SET title=$1,date=$2,description=$3,filename=$4 WHERE id=$5",
        [title, date, description, req.file.filename, id]);
    } else {
      await pool.query("UPDATE videos SET title=$1,date=$2,description=$3 WHERE id=$4", [title, date, description, id]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/videos/:id", async (req, res) => {
  try {
    const r = await pool.query("SELECT filename FROM videos WHERE id=$1", [req.params.id]);
    const oldFilename = r.rows[0]?.filename;
    if (oldFilename) {
      const fp = path.join(__dirname, "uploads-video", oldFilename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await pool.query("DELETE FROM videos WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch("/videos/:id/position", async (req, res) => {
  try {
    const x = Number(req.body.x);
    const y = Number(req.body.y);
    const rotate = Number(req.body.rotate || 0);
    const id = Number(req.params.id);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(rotate) || !Number.isInteger(id)) {
      return res.status(400).json({ error: "Vị trí không hợp lệ" });
    }
    const r = await pool.query(
      "UPDATE videos SET pos_x=$1,pos_y=$2,pos_rotate=$3 WHERE id=$4 RETURNING id,pos_x,pos_y,pos_rotate",
      [x, y, rotate, id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "Không tìm thấy video" });
    io.emit("videoMoved", { id, x, y, rotate });
    res.json({ success: true, id, x, y, rotate });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── YouTube MP3 ──────────────────────────────────────────────────────────────
// Disabled on Railway free/low-memory deploys to keep the build under 500MB.
// The old implementation required Python + ffmpeg + yt-dlp, which made Railway builds fail.
app.post("/youtube-mp3", async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Tính năng tải YouTube MP3 đang tạm tắt trên bản deploy nhẹ Railway để tránh vượt giới hạn 500MB."
  });
});

// ─── SPA Fallback ─────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});

// ─── Start ────────────────────────────────────────────────────────────────────
process.on("uncaughtException",  console.error);
process.on("unhandledRejection", console.error);
server.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on port ${PORT}`));
