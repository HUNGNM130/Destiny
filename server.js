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

    // Insert defaults if not exists
    const defaults = [
      ['appTitle',               'Món Quà Nhỏ'],
      ['appIcon',                'assets/images/couple.png'],
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

// Gift image storage – local disk (served at /gift-uploads)
const giftImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads-gift/"),
  filename:    (req, file, cb) =>
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname)),
});

const uploadImage      = multer({ storage: imageStorage });
const uploadVideo      = multer({ storage: videoStorage });
const uploadGiftImage  = multer({
  storage: giftImageStorage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    cb(null, allowed.test(file.mimetype));
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

// POST /api/gift-upload-image  → upload gift image, returns URL
app.post("/api/gift-upload-image", uploadGiftImage.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  const url = `/gift-uploads/${req.file.filename}`;
  res.json({ success: true, url });
});

// GET /api/gift-images  → list all uploaded gift images
app.get("/api/gift-images", (req, res) => {
  const dir = path.join(__dirname, "uploads-gift");
  const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
  const urls = files.map(f => `/gift-uploads/${f}`);
  res.json(urls);
});

// DELETE /api/gift-images/:filename
app.delete("/api/gift-images/:filename", (req, res) => {
  const fp = path.join(__dirname, "uploads-gift", req.params.filename);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  res.json({ success: true });
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
      appIcon:                 cfg.appIcon          || "assets/images/couple.png",
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


// ─── Future Love Letters ─────────────────────────────────────────────────────
function letterIsUnlocked(unlockAt) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(unlockAt);
  d.setHours(0, 0, 0, 0);
  return d.getTime() <= today.getTime();
}

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

app.get("/api/admin/backup", async (req, res) => {
  try {
    const [memories, videos, letters, gift] = await Promise.all([
      pool.query("SELECT * FROM memories ORDER BY date DESC, id DESC"),
      pool.query("SELECT * FROM videos ORDER BY date DESC, id DESC"),
      pool.query("SELECT * FROM love_letters ORDER BY unlock_at ASC, id DESC"),
      pool.query("SELECT config_key, config_value FROM gift_config ORDER BY config_key ASC")
    ]);
    res.json({
      exported_at: new Date().toISOString(),
      memories: memories.rows,
      videos: videos.rows,
      letters: letters.rows,
      gift_config: gift.rows
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
    const { title, date, description, mood, location, music } = req.body;
    if (!title || !date) return res.status(400).json({ error: "Thiếu title hoặc date" });

    let image = null;
    if (req.file) {
      const raw = req.file.secure_url || req.file.url || req.file.path || "";
      image = raw.startsWith("http") ? raw : cloudinary.url(raw, { secure: true });
    }

    try {
      const r = await pool.query(
        "INSERT INTO memories (title,date,description,image,mood,location,music) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [title, date, description, image, mood || null, location || null, music || null]
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
    const { title, date, description, mood, location, music } = req.body;
    const { id } = req.params;

    let imageUrl = null;
    if (req.file) {
      const raw = req.file.secure_url || req.file.path || req.file.url || "";
      imageUrl = raw.startsWith("http") ? raw : cloudinary.url(raw, { secure: true });
    }

    try {
      if (imageUrl) {
        await pool.query(
          "UPDATE memories SET title=$1,date=$2,description=$3,image=$4,mood=$5,location=$6,music=$7 WHERE id=$8",
          [title, date, description, imageUrl, mood || null, location || null, music || null, id]
        );
      } else {
        const r = await pool.query("SELECT image FROM memories WHERE id=$1", [id]);
        imageUrl = r.rows[0]?.image || null;
        await pool.query("UPDATE memories SET title=$1,date=$2,description=$3,mood=$4,location=$5,music=$6 WHERE id=$7", [title, date, description, mood || null, location || null, music || null, id]);
      }
      io.emit("memoryUpdated", { id: parseInt(id), title, date, description, image: imageUrl, mood: mood || null, location: location || null, music: music || null });
      res.json({ success: true });
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
