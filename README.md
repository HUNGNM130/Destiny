# 💌 Our Love Diary

Trang nhật ký ảnh lãng mạn — lưu giữ kỷ niệm hai đứa ♥

## Cấu trúc thư mục

```
mylove-diary/
├── server.js          ← Backend Node.js + Express
├── package.json
├── setup.sql          ← Script tạo database MySQL
├── uploads/           ← Ảnh upload (tự tạo)
└── public/
    └── index.html     ← Giao diện frontend
```

---

## ⚙️ Cài đặt từng bước

### Bước 1: Tạo Database MySQL
Mở MySQL Workbench hoặc terminal và chạy:
```bash
mysql -u root -p < setup.sql
```
Hoặc copy nội dung `setup.sql` và chạy trong MySQL Workbench.

### Bước 2: Cài Node.js packages
```bash
npm install
```

### Bước 3: Cấu hình kết nối MySQL
Mở file `server.js`, tìm phần này và sửa thông tin:
```js
const db = mysql.createConnection({
  host: "localhost",
  user: "root",      // ← username MySQL của bạn
  password: "",      // ← password MySQL của bạn
  database: "mylove_diary"
});
```

### Bước 4: Chạy server
```bash
node server.js
```
Hoặc dùng nodemon để tự reload khi sửa code:
```bash
npm run dev
```

### Bước 5: Mở trình duyệt
Truy cập: **http://localhost:3000**

---

## 🛠 Yêu cầu hệ thống
- Node.js v16+
- MySQL 5.7+ hoặc 8.0+
- Trình duyệt Chrome/Edge/Firefox

## 💡 Tính năng
- ✅ Thêm / Sửa / Xoá kỷ niệm
- ✅ Upload ảnh
- ✅ Nhập ngày bằng lịch đẹp (Flatpickr)
- ✅ Giao diện Polaroid lộn xộn như nhật ký thật
- ✅ Xác nhận xoá bằng SweetAlert2
- ✅ Lưu trữ MySQL
