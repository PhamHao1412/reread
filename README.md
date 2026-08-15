# Reread 📖 (Mobile Reading Companion)

Ứng dụng web đọc sách tối ưu hóa 100% cho trải nghiệm di động (**Mobile-First Reader**), kết nối và sử dụng chung tài khoản & cơ sở dữ liệu với dự án **`readthrough`**.

---

## 📱 Điểm nổi bật
* **Chuẩn Mobile Viewport (`100dvh`)**: Thiết kế vừa vặn màn hình điện thoại (`max-w-[420px]`), khóa chống rung giật & overscroll bounce trên iOS Safari.
* **Chế độ đọc đa năng**:
  * **Xem PDF Canvas mượt mà**: Tự động căn chỉnh vừa chiều rộng màn hình, vuốt chạm chuyển trang.
  * **Chế độ Readthrough (Bionic Reading Mode)**: Tự động in đậm các âm tiết đầu của từ ngữ giúp mắt lướt nhanh hơn 2-3x mà không bị mỏi.
* **Bộ tùy biến giao diện đọc sách**:
  * Đổi màu nền: **Plum Dark (Tím tối Pocky) / Vàng Sepia (Sách giấy) / Đen AMOLED / Trắng**.
  * Đổi kích thước chữ (A- / A+), phông chữ (Serif, Sans, Mono), thanh tua trang nhanh (Page Scrubber).
* **Đồng bộ thời gian thực**:
  * Đăng nhập bằng tài khoản `readthrough`.
  * Hiển thị toàn bộ sách đã tải lên ở `readthrough`.
  * Tự động lưu tiến độ trang đọc và bookmark.

---

## 🚀 Hướng dẫn khởi chạy

### 1. Khởi động Backend (`reread-be`)
Backend chạy trên cổng `8081` (kết nối trực tiếp database `readful` của readthrough):
```bash
cd reread-be
go run main.go
```
*API Server sẽ chạy tại: `http://localhost:8081`*

---

### 2. Khởi động Frontend (`reread-fe`)
```bash
cd reread-fe
npm run dev
```
*Mở `http://localhost:5173` trên trình duyệt máy tính hoặc điện thoại.*

---

## 📂 Cấu trúc thư mục

```
reread/
├── reread-be/      # Go Gin Backend (kết nối DB readful & R2 Cloud storage)
└── reread-fe/      # React 18 + Vite + Tailwind v4 Mobile-First E-Reader
```
