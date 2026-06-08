# 💌 Our Love Diary

Web app lưu giữ kỷ niệm — ảnh, video, khoảnh khắc của hai đứa ♥

## Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + Socket.io
- **Database**: PostgreSQL (Supabase)
- **Storage**: Cloudinary (ảnh), local disk (video)

## Cấu trúc

```
├── client/          # React app
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── styles/
│       ├── types.ts
│       └── App.tsx
├── uploads-video/   # Video files (local)
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
```

## Deploy (Render)

- Build Command: `npm install && npm run build`
- Start Command: `npm start`
