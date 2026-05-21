require("dotenv").config();
const ytdlp = require("yt-dlp-exec");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs");
const path = require("path");

ffmpeg.setFfmpegPath(ffmpegPath);
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
console.log("HOST:", process.env.DB_HOST);
console.log("USER:", process.env.DB_USER);
console.log("PORT:", process.env.DB_PORT);
const express = require("express");
const mysql = require("mysql2");
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

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

db.connect((err) => {
  if (err) { console.error("❌ Lỗi kết nối MySQL:", err.message); return; }
  console.log("✅ Đã kết nối MySQL!");

  db.query(`
    CREATE TABLE IF NOT EXISTS memories (
      id INT AUTO_INCREMENT PRIMARY KEY,
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

  // Add new columns to existing table if they don't exist
  const alterCols = [
    "ALTER TABLE memories ADD COLUMN IF NOT EXISTS mood VARCHAR(50) DEFAULT 'happy'",
    "ALTER TABLE memories ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE memories ADD COLUMN IF NOT EXISTS music VARCHAR(255) DEFAULT NULL"
  ];
  alterCols.forEach(q => db.query(q, () => {}));

  db.query(`
    CREATE TABLE IF NOT EXISTS videos (
      id INT AUTO_INCREMENT PRIMARY KEY,
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
});

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("uploads-video")) fs.mkdirSync("uploads-video");

const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: "love-diary", allowed_formats: ["jpg","jpeg","png","webp"] }
});
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads-video/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + Math.round(Math.random()*1e9) + path.extname(file.originalname))
});

const uploadImage = multer({ storage: imageStorage });
const uploadVideo = multer({ storage: videoStorage });

app.get("/", (req, res) => res.json({ success: true, message: "Love Diary API running" }));
app.get("/view", (req, res) => res.sendFile(path.join(__dirname, "public", "view.html")));

// GET memories (with search filters)
app.get("/memories", (req, res) => {
  let query = "SELECT * FROM memories WHERE 1=1";
  const params = [];
  if (req.query.mood)      { query += " AND mood = ?"; params.push(req.query.mood); }
  if (req.query.location)  { query += " AND location LIKE ?"; params.push(`%${req.query.location}%`); }
  if (req.query.music)     { query += " AND music LIKE ?"; params.push(`%${req.query.music}%`); }
  if (req.query.date)      { query += " AND date = ?"; params.push(req.query.date); }
  if (req.query.date_from) { query += " AND date >= ?"; params.push(req.query.date_from); }
  if (req.query.date_to)   { query += " AND date <= ?"; params.push(req.query.date_to); }
  query += " ORDER BY date DESC";
  db.query(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// CREATE memory
app.post("/memories", uploadImage.single("image"), (req, res) => {
  const { title, date, description, mood, location, music } = req.body;
  const image = req.file ? req.file.path : null;
  db.query(
    "INSERT INTO memories (title,date,description,image,mood,location,music) VALUES (?,?,?,?,?,?,?)",
    [title, date, description, image, mood||"happy", location||null, music||null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      // Broadcast new memory to all other clients for realtime add
      const newMemory = { id: result.insertId, title, date, description, image, mood: mood||"happy", location: location||null, music: music||null, pos_x: null, pos_y: null, pos_rotate: null };
      io.emit("memoryAdded", newMemory);
      res.json({ success: true, id: result.insertId, memory: newMemory });
    }
  );
});

// UPDATE memory
app.put("/memories/:id", uploadImage.single("image"), (req, res) => {
  const { title, date, description, mood, location, music } = req.body;
  const { id } = req.params;
  if (req.file) {
    db.query(
      "UPDATE memories SET title=?,date=?,description=?,image=?,mood=?,location=?,music=? WHERE id=?",
      [title, date, description, req.file.path, mood||"happy", location||null, music||null, id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        io.emit("memoryUpdated", { id: parseInt(id), title, date, description, image: req.file.path, mood: mood||"happy", location: location||null, music: music||null });
        res.json({ success: true });
      }
    );
  } else {
    db.query(
      "UPDATE memories SET title=?,date=?,description=?,mood=?,location=?,music=? WHERE id=?",
      [title, date, description, mood||"happy", location||null, music||null, id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        io.emit("memoryUpdated", { id: parseInt(id), title, date, description, mood: mood||"happy", location: location||null, music: music||null });
        res.json({ success: true });
      }
    );
  }
});

// DELETE memory
app.delete("/memories/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM memories WHERE id=?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// UPDATE memory position
app.patch("/memories/:id/position", (req, res) => {
  const { x, y, rotate } = req.body;
  db.query(
    "UPDATE memories SET pos_x=?,pos_y=?,pos_rotate=? WHERE id=?",
    [x, y, rotate, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
      io.emit("memoryMoved", { id: req.params.id, x, y, rotate });
    }
  );
});

// GET videos
app.get("/videos", (req, res) => {
  db.query("SELECT * FROM videos ORDER BY date DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// CREATE video
app.post("/videos", uploadVideo.single("video"), (req, res) => {
  const { title, date, description } = req.body;
  const filename = req.file ? req.file.filename : null;
  if (!filename) return res.status(400).json({ error: "Chưa có file video" });
  db.query(
    "INSERT INTO videos (title,date,description,filename) VALUES (?,?,?,?)",
    [title, date, description, filename],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      const newVideo = { id: result.insertId, title, date, description, filename, pos_x: null, pos_y: null, pos_rotate: null };
      io.emit("videoAdded", newVideo);
      res.json({ success: true, id: result.insertId });
    }
  );
});

// UPDATE video
app.put("/videos/:id", uploadVideo.single("video"), (req, res) => {
  const { title, date, description } = req.body;
  const { id } = req.params;
  if (req.file) {
    db.query("SELECT filename FROM videos WHERE id=?", [id], (err, rows) => {
      if (!err && rows[0]?.filename) {
        const fp = path.join(__dirname, "uploads-video", rows[0].filename);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
    });
    db.query(
      "UPDATE videos SET title=?,date=?,description=?,filename=? WHERE id=?",
      [title, date, description, req.file.filename, id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  } else {
    db.query(
      "UPDATE videos SET title=?,date=?,description=? WHERE id=?",
      [title, date, description, id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  }
});

// DELETE video
app.delete("/videos/:id", (req, res) => {
  const { id } = req.params;
  db.query("SELECT filename FROM videos WHERE id=?", [id], (err, rows) => {
    if (!err && rows[0]?.filename) {
      const filePath = path.join(__dirname, "uploads-video", rows[0].filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    db.query("DELETE FROM videos WHERE id=?", [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

// UPDATE video position
app.patch("/videos/:id/position", (req, res) => {
  const { x, y, rotate } = req.body;
  db.query(
    "UPDATE videos SET pos_x=?,pos_y=?,pos_rotate=? WHERE id=?",
    [x, y, rotate, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
      io.emit("videoMoved", { id: req.params.id, x, y, rotate });
    }
  );
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

server.listen(PORT, "0.0.0.0", () => { console.log(`🚀 Server running on port ${PORT}`); });
