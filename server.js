require("dotenv").config();

const ytdlp = require("yt-dlp-exec");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);
// cloudinary v2: require("cloudinary").v2 works for both v1 and v2 packages
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const express = require("express");
const { Pool } = require("pg");

const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  console.log("🟢 User connected");

  socket.on("moveMemory", (data) => { socket.broadcast.emit("memoryMoved", data); });
  socket.on("moveVideo",  (data) => { socket.broadcast.emit("videoMoved", data); });
  socket.on("deleteMemory", (data) => { socket.broadcast.emit("memoryDeleted", data); });
  socket.on("deleteVideo",  (data) => { socket.broadcast.emit("videoDeleted", data); });

  socket.on("cursorMove", (data) => { socket.broadcast.emit("cursorMoved", data); });
  socket.on("disconnect", () => { console.log("🔴 User disconnected"); });
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/videos-file", express.static(path.join(__dirname, "uploads-video")));

console.log("DATABASE_URL:", process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined
});


(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Kết nối PostgreSQL OK!");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS memories (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        description TEXT,
        image VARCHAR(255),
        mood VARCHAR(50) DEFAULT 'happy',
        location VARCHAR(255) DEFAULT NULL,
        music VARCHAR(255) DEFAULT NULL,
        pos_x FLOAT DEFAULT NULL,
        pos_y FLOAT DEFAULT NULL,
        pos_rotate FLOAT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        description TEXT,
        filename VARCHAR(255),
        pos_x FLOAT DEFAULT NULL,
        pos_y FLOAT DEFAULT NULL,
        pos_rotate FLOAT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ Tables ready");
  } catch (err) {
    console.error("❌ FULL ERROR:");
  console.error(err);
  }
})();


if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("uploads-video")) fs.mkdirSync("uploads-video");

const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "love-diary",
    resource_type: "image",
    format: undefined,          // let Cloudinary auto-detect format
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"],
    transformation: [{ quality: "auto", fetch_format: "auto" }]
  })
});
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads-video/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + Math.round(Math.random()*1e9) + path.extname(file.originalname))
});

const uploadImage = multer({ storage: imageStorage });
const uploadVideo = multer({ storage: videoStorage });

app.get("/", (req, res) => res.json({ success: true, message: "Love Diary API running" }));
app.get("/view", (req, res) => res.sendFile(path.join(__dirname, "public", "view.html")));

app.get("/memories", (req, res) => {
  pool.query("SELECT * FROM memories ORDER BY date DESC")
    .then((r) => res.json(r.rows))
    .catch((err) => res.status(500).json({ error: err.message }));
});
// CREATE memory
app.post("/memories", (req, res) => {

  uploadImage.single("image")(req, res, (uploadErr) => {
    // Nếu Cloudinary hoặc multer lỗi (sai credentials, file không hỗ trợ, timeout...)
    // bắt lỗi ở đây thay vì crash toàn bộ request → 500 không rõ lý do
    if (uploadErr) {
      console.error("[UPLOAD ERROR] Cloudinary/multer failed:", uploadErr.message, uploadErr.http_code || "");
      // Vẫn cho phép lưu memory không có ảnh nếu upload lỗi
      // (hoặc return lỗi nếu muốn bắt buộc có ảnh)
      req.file = null;
    }

    const { title, date, description } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: "Thiếu title hoặc date" });
    }

    // multer-storage-cloudinary@4 trả về req.file.path là public_id (vd: "love-diary/abc123")
    // hoặc full https URL tuỳ version. Chuẩn hoá về https URL để lưu DB.
    let image = null;
    if (req.file) {
      const raw = req.file.secure_url || req.file.path || req.file.url || "";
      // Nếu đã là URL đầy đủ thì dùng luôn, nếu là public_id thì build URL
      image = raw.startsWith("http")
        ? raw
        : cloudinary.url(raw, { secure: true });
    }

    console.log("[UPLOAD] req.file full:", JSON.stringify(req.file, null, 2));
    console.log("[UPLOAD] image URL resolved:", image);

    pool.query(
      "INSERT INTO memories (title,date,description,image) VALUES ($1,$2,$3,$4) RETURNING id",
      [title, date, description, image]
    )
      .then((r) => {
        const id = r.rows[0].id;
        const newMemory = { id, title, date, description, image, pos_x: null, pos_y: null, pos_rotate: null };
        io.emit("memoryAdded", newMemory);
        res.json({ success: true, id, memory: newMemory });
      })
      .catch((err) => {
        console.error("[DB ERROR] INSERT memories:", err.message);
        return res.status(500).json({ error: err.message });
      });

  });
});

// UPDATE memory
app.put("/memories/:id", (req, res) => {

  uploadImage.single("image")(req, res, (uploadErr) => {
    if (uploadErr) {
      console.error("[UPLOAD ERROR] PUT memories Cloudinary failed:", uploadErr.message);
      req.file = null;
    }
    const { title, date, description } = req.body;
    const { id } = req.params;
    let imageUrl = null;
    if (req.file) {
      const raw = req.file.secure_url || req.file.path || req.file.url || "";
      imageUrl = raw.startsWith("http") ? raw : cloudinary.url(raw, { secure: true });
    }
    console.log("[PUT UPLOAD] req.file:", JSON.stringify(req.file, null, 2));
    if (imageUrl) {
      pool.query(
        "UPDATE memories SET title=$1,date=$2,description=$3,image=$4 WHERE id=$5",
        [title, date, description, imageUrl, id]
      )
        .then(() => {
          io.emit("memoryUpdated", { id: parseInt(id), title, date, description, image: imageUrl });
          res.json({ success: true });
        })
        .catch((err) => res.status(500).json({ error: err.message }));

    } else {
      // No new image — fetch existing image URL to include in broadcast

      pool.query("SELECT image FROM memories WHERE id=$1", [id])
        .then((r) => {
          const existingImage = (r.rows && r.rows[0]) ? r.rows[0].image : null;
          return pool.query(
  "UPDATE memories SET title=$1,date=$2,description=$3 WHERE id=$4",
  [title, date, description, id]
).then(() => existingImage);
        })
        .then((existingImage) => {
          io.emit("memoryUpdated", { id: parseInt(id), title, date, description, image: existingImage });
          res.json({ success: true });
        })
        .catch((err) => res.status(500).json({ error: err.message }));


    }
  });
});

// DELETE memory
app.delete("/memories/:id", (req, res) => {
  const { id } = req.params;
  pool.query("DELETE FROM memories WHERE id=$1", [id])
    .then(() => res.json({ success: true }))
    .catch((err) => res.status(500).json({ error: err.message }));
});

// UPDATE memory position
app.patch("/memories/:id/position", (req, res) => {
  const { x, y, rotate } = req.body;
  pool.query(
    "UPDATE memories SET pos_x=$1,pos_y=$2,pos_rotate=$3 WHERE id=$4",
    [x, y, rotate, req.params.id]
  )
    .then(() => {
      res.json({ success: true });
      io.emit("memoryMoved", { id: req.params.id, x, y, rotate });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

// GET videos
app.get("/videos", (req, res) => {
  pool.query("SELECT * FROM videos ORDER BY date DESC")
    .then((r) => res.json(r.rows))
    .catch((err) => res.status(500).json({ error: err.message }));
});

// CREATE video
app.post("/videos", uploadVideo.single("video"), (req, res) => {
  const { title, date, description } = req.body;
  const filename = req.file ? req.file.filename : null;
  if (!filename) return res.status(400).json({ error: "Chưa có file video" });

  pool.query(
    "INSERT INTO videos (title,date,description,filename) VALUES ($1,$2,$3,$4) RETURNING id",
    [title, date, description, filename]
  )
    .then((r) => {
      const id = r.rows[0].id;
      const newVideo = { id, title, date, description, filename, pos_x: null, pos_y: null, pos_rotate: null };
      io.emit("videoAdded", newVideo);
      res.json({ success: true, id });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

// UPDATE video
app.put("/videos/:id", uploadVideo.single("video"), (req, res) => {
  const { title, date, description } = req.body;
  const { id } = req.params;

  if (req.file) {
    pool.query("SELECT filename FROM videos WHERE id=$1", [id])
      .then((r) => {
        const oldFilename = r.rows?.[0]?.filename;
        if (oldFilename) {
          const fp = path.join(__dirname, "uploads-video", oldFilename);
          if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
        return pool.query(
          "UPDATE videos SET title=$1,date=$2,description=$3,filename=$4 WHERE id=$5",
          [title, date, description, req.file.filename, id]
        );
      })
      .then(() => res.json({ success: true }))
      .catch((err) => res.status(500).json({ error: err.message }));
  } else {
    pool.query(
      "UPDATE videos SET title=$1,date=$2,description=$3 WHERE id=$4",
      [title, date, description, id]
    )
      .then(() => res.json({ success: true }))
      .catch((err) => res.status(500).json({ error: err.message }));
  }
});

// DELETE video
app.delete("/videos/:id", (req, res) => {
  const { id } = req.params;

  pool.query("SELECT filename FROM videos WHERE id=$1", [id])
    .then((r) => {
      const oldFilename = r.rows?.[0]?.filename;
      if (oldFilename) {
        const filePath = path.join(__dirname, "uploads-video", oldFilename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      return pool.query("DELETE FROM videos WHERE id=$1", [id]);
    })
    .then(() => res.json({ success: true }))
    .catch((err) => res.status(500).json({ error: err.message }));
});

// UPDATE video position
app.patch("/videos/:id/position", (req, res) => {
  const { x, y, rotate } = req.body;

  pool.query(
    "UPDATE videos SET pos_x=$1,pos_y=$2,pos_rotate=$3 WHERE id=$4",
    [x, y, rotate, req.params.id]
  )
    .then(() => {
      res.json({ success: true });
      io.emit("videoMoved", { id: req.params.id, x, y, rotate });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});



app.post("/youtube-mp3", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "Missing YouTube URL"
      });
    }

    const id = Date.now();

    const tempVideo = path.join(__dirname, `temp_${id}.webm`);
    const tempAudio = path.join(__dirname, `temp_${id}.mp3`);

    // Download audio from YouTube
    await ytdlp(url, {
      output: tempVideo,
      format: "bestaudio",
      noCheckCertificates: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true
    });

    // Convert to mp3
    ffmpeg(tempVideo)
      .audioBitrate(128)
      .format("mp3")
      .save(tempAudio)
      .on("end", () => {
        res.download(tempAudio, "music.mp3", () => {
          try {
            if (fs.existsSync(tempVideo)) fs.unlinkSync(tempVideo);
            if (fs.existsSync(tempAudio)) fs.unlinkSync(tempAudio);
          } catch (e) {
            console.log("Cleanup error:", e.message);
          }
        });
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err);

        res.status(500).json({
          success: false,
          message: "MP3 convert failed"
        });
      });

  } catch (err) {
    console.error("YouTube convert error:", err);

    res.status(500).json({
      success: false,
      message: "YouTube download failed"
    });
  }
});
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);
server.listen(PORT, "0.0.0.0", () => { console.log(`🚀 Server running on port ${PORT}`); });
