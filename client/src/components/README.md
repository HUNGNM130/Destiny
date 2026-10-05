# 💌 Our Love Diary

Web app lưu giữ kỷ niệm — ảnh, video, khoảnh khắc của hai đứa ♥

## Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + Socket.io
- **Database**: PostgreSQL (Supabase)
- **Storage**: Cloudinary (ảnh + video, video tối đa 100MB/file ở gói free)

## Cấu trúc

```
├── client/          # React app
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── styles/
│       ├── types.ts
│       └── App.tsx
├── server.js        # Express API + Socket.io
└── package.json
```

## Chạy local

```bash
# Backend
npm install
npm run dev

# Frontend (terminal khác)
cd client
npm install
npm run dev
```

## Env

```
DATABASE_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
ADMIN_PIN=            # PIN 4 số vào Dashboard (đừng để mặc định 1234)
ADMIN_TOKEN_SECRET=   # (tuỳ chọn) chuỗi bí mật ký token admin; Render tự sinh nếu dùng render.yaml
```

## Bảo mật admin

- Nhập đúng PIN → server trả token (hạn 12 giờ), lưu trong sessionStorage.
- Các API `/api/admin/*`, `PUT /api/gift-config`, `POST /api/gift-upload-image`, `PUT /api/letters/:id` yêu cầu token.
- Tải backup: vào Dashboard → nút **💾 Tải backup**.

## Tùy chỉnh giao diện (Dashboard → Giao diện)

- Đổi màu, 3 loại font (thêm Be Vietnam Pro, Nunito, Lora, Cormorant Garamond).
- **Cỡ chữ toàn website**: thanh trượt 80%–150% + 4 nút nhanh (Nhỏ/Vừa/Lớn/Rất lớn).
- **Bật/tắt chức năng**: ẩn tab khỏi thanh menu (dữ liệu vẫn giữ). Luôn phải giữ ít nhất 1 tab.
- Bấm **Lưu** để áp dụng; các thiết bị đang mở web tự cập nhật qua socket.

## Giữ server không ngủ

Dùng UptimeRobot ping `https://<ten-web>.onrender.com/healthz` mỗi 5 phút.

## Deploy (Render)

- Build Command: `npm install && npm run build`
- Start Command: `npm start`
