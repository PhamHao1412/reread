# Reread 📖

A modern, mobile-first reading app and AI reading companion designed for reading technical books and PDFs on mobile devices.

---

## ✨ Features

- **📱 Mobile-First Experience**: Optimized for mobile screens (`100dvh`), with smooth page flipping, gestures, and zero layout shifting on iOS Safari and Android.
- **🤖 AI Reading Companion**:
  - **Comprehensive Summaries**: Extract key concepts, motivations, and main takeaways for any chapter or section.
  - **Vocabulary Notebook**: Save, translate, and review unfamiliar words while reading.
- **⚡ Bionic Reading (Readthrough Mode)**: Highlights the initial letters of words to guide the eye and improve reading speed and focus.
- **🎨 Custom Reading Themes**:
  - Multiple color themes (Sepia, Plum Dark, AMOLED Dark, Light).
  - Adjustable font size, typography (Serif, Sans, Mono), and fast page scrubbing.
- **☁️ Cloud Sync**: Automatically syncs reading progress, bookmarks, and AI summaries across devices.

---

## 🛠️ Tech Stack

- **Frontend (`reread-fe`)**: React 18, TypeScript, Vite, Tailwind CSS, PDF.js, Lucide Icons.
- **Backend (`reread-be`)**: Go (Gin), PostgreSQL, Cloudflare R2 storage.

---

## 🚀 Getting Started

### 1. Backend Setup

```bash
cd reread-be
go run main.go
```

The API server will run at `http://localhost:8081`.

### 2. Frontend Setup

```bash
cd reread-fe
npm install
npm run dev
```

Open `http://localhost:5173` on your browser or mobile device.

---

## 📂 Project Structure

```text
reread/
├── reread-be/      # Go Gin API Backend (Database & Cloud Storage)
└── reread-fe/      # React Mobile-First Web App
```

