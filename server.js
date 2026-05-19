require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

console.log("HOST:", process.env.DB_HOST);
console.log("USER:", process.env.DB_USER);
console.log("PORT:", process.env.DB_PORT);

const express = require("express");
const mysql   = require("mysql2");
const multer  = require("multer");
const cors    = require("cors");
const path    = require("path");
const fs      = require("fs");
const http    = require("http");
const { Server } = require("socket.io");

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 3000;
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);
// ─────────────────────────────────────────────
// SOCKET.IO
// ─────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true
  }
});

io.on("connection", (socket) => {

  console.log("🟢 User connected");

  socket.on("moveMemory", (data) => {
    socket.broadcast.emit("memoryMoved", data);
  });

  socket.on("moveVideo", (data) => {
    socket.broadcast.emit("videoMoved", data);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected");
  });

});

io.on("connection", (socket) => {

  console.log("🟢 User connected");

  socket.on("moveMemory", (data) => {

    socket.broadcast.emit("memoryMoved", data);
  });

  socket.on("moveVideo", (data) => {

    socket.broadcast.emit("videoMoved", data);
  });

  socket.on("disconnect", () => {

    console.log("🔴 User disconnected");
  });

});
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/videos-file", express.static(
  path.join(__dirname, "uploads-video"),
  {
    maxAge: "1d"
  }
));
app.use(
  "/music-file",
  express.static(path.join(__dirname, "uploads-music"))
);


// ─────────────────────────────────────────────
// MYSQL
// ─────────────────────────────────────────────
const db = mysql.createConnection({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port:     process.env.DB_PORT
});

db.connect((err) => {
  if (err) { console.error("❌ Lỗi kết nối MySQL:", err.message); return; }
  console.log("✅ Đã kết nối MySQL!");

  // TABLE memories (thêm cột reactions nếu chưa có)
  db.query(`
    CREATE TABLE IF NOT EXISTS memories (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      title      VARCHAR(255) NOT NULL,
      date       DATE NOT NULL,
      description TEXT,
      image      VARCHAR(255),
      reactions  TEXT DEFAULT '{"💕":0,"😍":0,"🥹":0}',
      pos_x      FLOAT DEFAULT NULL,
      pos_y      FLOAT DEFAULT NULL,
      pos_rotate FLOAT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error(err);
    // Thêm cột reactions nếu bảng cũ chưa có
    db.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS reactions TEXT DEFAULT '{"💕":0,"😍":0,"🥹":0}'`,
      () => {}); // ignore error nếu đã có
  });

  // TABLE videos
  db.query(`
    CREATE TABLE IF NOT EXISTS videos (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      title      VARCHAR(255) NOT NULL,
      date       DATE NOT NULL,
      description TEXT,
      filename   VARCHAR(255),
      pos_x      FLOAT DEFAULT NULL,
      pos_y      FLOAT DEFAULT NULL,
      pos_rotate FLOAT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // TABLE settings (love counter start date, nhạc nền, v.v.)
  db.query(`
    CREATE TABLE IF NOT EXISTS settings (
      \`key\`   VARCHAR(100) PRIMARY KEY,
      \`value\` TEXT
    )
  `);
    // TABLE musics
db.query(`
  CREATE TABLE IF NOT EXISTS musics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    filename VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);
  console.log("✅ Tables ready");
});

// ─────────────────────────────────────────────
// CREATE UPLOAD FOLDERS
// ─────────────────────────────────────────────
if (!fs.existsSync("uploads"))       fs.mkdirSync("uploads");
if (!fs.existsSync("uploads-video")) fs.mkdirSync("uploads-video");
if (!fs.existsSync("uploads-music")) {
  fs.mkdirSync("uploads-music");
}

// ─────────────────────────────────────────────
// MULTER
// ─────────────────────────────────────────────
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
  folder: "love-diary",
  resource_type: "image",
  allowed_formats: ["jpg", "jpeg", "png", "webp"]
})
});

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads-video/"),
  filename:    (req, file, cb) => cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
});
const musicStorage = multer.diskStorage({

  destination: (req, file, cb) => {
    cb(null, "uploads-music/");
  },

  filename: (req, file, cb) => {

    cb(
      null,
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname)
    );
  }
});

const uploadImage = multer({ storage: imageStorage });
const uploadVideo = multer({ storage: videoStorage });
const uploadMusic = multer({
  storage: musicStorage
});
// ─────────────────────────────────────────────
// ROUTES: TEST + VIEW
// ─────────────────────────────────────────────
app.get("/",     (req, res) => res.json({ success: true, message: "Love Diary API running" }));
app.get("/view", (req, res) => res.sendFile(path.join(__dirname, "public", "view.html")));

// ─────────────────────────────────────────────
// SETTINGS ROUTES (love counter start date)
// ─────────────────────────────────────────────
app.get("/settings", (req, res) => {
  db.query("SELECT * FROM settings", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const obj = {};
    rows.forEach(r => { obj[r.key] = r.value; });
    res.json(obj);
  });
});

app.post("/settings", (req, res) => {
  const { key, value } = req.body;
  db.query(
    "INSERT INTO settings (`key`, `value`) VALUES (?,?) ON DUPLICATE KEY UPDATE `value`=?",
    [key, value, value],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// ─────────────────────────────────────────────
// MEMORIES ROUTES
// ─────────────────────────────────────────────
app.get("/memories", (req, res) => {
  db.query("SELECT * FROM memories ORDER BY date DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/memories", uploadImage.single("image"), (req, res) => {
  const { title, date, description } = req.body;
  const image = req.file ? req.file.path : null;
  db.query(
    "INSERT INTO memories (title,date,description,image) VALUES (?,?,?,?)",
    [title, date, description, image],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: result.insertId });
    }
  );
});

app.put("/memories/:id", uploadImage.single("image"), (req, res) => {
  const { title, date, description } = req.body;
  const { id } = req.params;

  if (req.file) {
    // FIX: delete old Cloudinary image before update
    db.query("SELECT image FROM memories WHERE id=?", [id], (err, rows) => {
      if (!err && rows[0]?.image) {
        // Extract public_id from cloudinary URL for deletion
        try {
          const parts   = rows[0].image.split("/");
          const folder  = parts[parts.length - 2];
          const fileId  = parts[parts.length - 1].replace(/\.[^/.]+$/, "");
          cloudinary.uploader.destroy(`${folder}/${fileId}`, () => {});
        } catch {}
      }
    });

    db.query(
      "UPDATE memories SET title=?,date=?,description=?,image=? WHERE id=?",
      [title, date, description, req.file.path, id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  } else {
    db.query(
      "UPDATE memories SET title=?,date=?,description=? WHERE id=?",
      [title, date, description, id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  }
});

app.delete("/memories/:id", (req, res) => {
  const { id } = req.params;
  db.query("SELECT image FROM memories WHERE id=?", [id], (err, rows) => {
    if (!err && rows[0]?.image) {
      // FIX: delete from Cloudinary on memory delete
      try {
        const parts  = rows[0].image.split("/");
        const folder = parts[parts.length - 2];
        const fileId = parts[parts.length - 1].replace(/\.[^/.]+$/, "");
        cloudinary.uploader.destroy(`${folder}/${fileId}`, () => {});
      } catch {}
    }
    db.query("DELETE FROM memories WHERE id=?", [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

// UPDATE memory position
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

// ── 8. REACTION endpoint ─────────────────────────────────
// ── REACTION endpoint ─────────────────────────────────
app.post("/memories/:id/react", (req, res) => {

  const { emoji } = req.body;
  const { id } = req.params;

  db.query(
    "SELECT reactions FROM memories WHERE id=?",
    [id],
    (err, rows) => {

      if (err || !rows.length) {
        return res.status(404).json({
          error: "Not found"
        });
      }
      let reactions = {};

      try {
        reactions = JSON.parse(rows[0].reactions || "{}");
      } catch {
        reactions = {};
      }

      reactions[emoji] = (reactions[emoji] || 0) + 1;

      db.query(
        "UPDATE memories SET reactions=? WHERE id=?",
        [JSON.stringify(reactions), id],
        (err2) => {

          if (err2) {
            return res.status(500).json({
              error: err2.message
            });
          }

          io.emit("reactionAdded", {
            memoryId: id,
            emoji,
            count: reactions[emoji]
          });

          res.json({
            success: true,
            reactions,
            count: reactions[emoji]
          });
        }
      );
      io.emit("memoryMoved", {
        id: req.params.id,
        x,
        y,
        rotate
      });
    }
  );
});

// ─────────────────────────────────────────────
// VIDEOS ROUTES
// ─────────────────────────────────────────────
app.get("/videos", (req, res) => {
  db.query("SELECT * FROM videos ORDER BY date DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/videos", uploadVideo.single("video"), (req, res) => {
  const { title, date, description } = req.body;
  const filename = req.file ? req.file.filename : null;
  if (!filename) return res.status(400).json({ error: "Chưa có file video" });
  db.query(
    "INSERT INTO videos (title,date,description,filename) VALUES (?,?,?,?)",
    [title, date, description, filename],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: result.insertId });
    }
  );
});

app.put("/videos/:id", uploadVideo.single("video"), (req, res) => {
  const { title, date, description } = req.body;
  const { id } = req.params;

  if (req.file) {
    // FIX: delete old video file on update
    db.query("SELECT filename FROM videos WHERE id=?", [id], (err, rows) => {
      if (!err && rows[0]?.filename) {
        const filePath = path.join(__dirname, "uploads-video", rows[0].filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
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
// UPDATE video position
app.patch("/videos/:id/position", (req, res) => {
  const { x, y, rotate } = req.body;
  db.query(
    "UPDATE videos SET pos_x=?,pos_y=?,pos_rotate=? WHERE id=?",
    [x, y, rotate, req.params.id],
    (err) => {

      if (err) {
        return res.status(500).json({
          error: err.message
        });
      }

      res.json({
        success: true
      });

      io.emit("videoMoved", {
        id: req.params.id,
        x,
        y,
        rotate
      });
    }
  );
});
// ─────────────────────────────────────────────
// MUSIC ROUTES
// ─────────────────────────────────────────────

// GET ALL MUSIC
app.get("/musics", (req, res) => {

  db.query(
    "SELECT * FROM musics ORDER BY created_at DESC",
    (err, rows) => {

      if (err) {
        return res.status(500).json({
          error: err.message
        });
      }

      res.json(rows);
    }
  );
});


// UPLOAD MUSIC

app.post(
  "/musics",
  uploadMusic.single("music"),
  (req, res) => {

    const title = req.body.title;
    const filename = req.file?.filename;

    if (!filename) {
      return res.status(400).json({
        error: "No music file"
      });
    }

    db.query(
      "INSERT INTO musics (title, filename) VALUES (?, ?)",
      [title, filename],
      (err, result) => {

        if (err) {
          return res.status(500).json({
            error: err.message
          });
        }

        res.json({
          success: true,
          id: result.insertId
        });
      }
    );
  }
);


// DELETE MUSIC
app.delete("/musics/:id", (req, res) => {

  const { id } = req.params;

  db.query(
    "SELECT filename FROM musics WHERE id=?",
    [id],
    (err, rows) => {

      if (!err && rows[0]?.filename) {

        const filePath = path.join(
          __dirname,
          "uploads-music",
          rows[0].filename
        );

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      db.query(
        "DELETE FROM musics WHERE id=?",
        [id],
        (err2) => {

          if (err2) {
            return res.status(500).json({
              error: err2.message
            });
          }

          res.json({
            success: true
          });
        }
      );
    }
  );
});
app.post("/youtube-music", async (req, res) => {

  try {

    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: "Missing URL"
      });
    }

    if (!ytdl.validateURL(url)) {
      return res.status(400).json({
        error: "Invalid URL"
      });
    }

    const info =
      await ytdl.getInfo(url);

    const title =
      info.videoDetails.title;

    const filename =
      Date.now() + ".mp3";

    const outputPath = path.join(
      __dirname,
      "uploads-music",
      filename
    );

    const stream = ytdl(url, {
      filter: "audioonly",
      quality: "highestaudio"
    });

    ffmpeg(stream)
      .audioBitrate(128)
      .save(outputPath)

      .on("end", () => {

        db.query(
          "INSERT INTO musics (title, filename) VALUES (?, ?)",
          [title, filename],
          (err, result) => {

            if (err) {
              return res.status(500).json({
                error: err.message
              });
            }

            res.json({
              success: true
            });
          }
        );
      })

      .on("error", (err) => {

        console.error(err);

        res.status(500).json({
          error: "Convert failed"
        });
      });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});
// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
