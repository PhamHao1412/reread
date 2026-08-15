.PHONY: all dev be fe build install clean help
.PHONY: all dev be fe tunnel build install clean help

help:
	@echo "======================================================="
	@echo "               Reread — Makefile Commands              "
	@echo "======================================================="
	@echo "  make dev       - Chạy đồng thời cả Backend và Frontend"
	@echo "  make be        - Chỉ chạy Backend Go (Port 8081)"
	@echo "  make fe        - Chỉ chạy Frontend React/Vite"
	@echo "  make tunnel    - Mở Cloudflare Tunnel kết nối điện thoại"
	@echo "  make install   - Cài đặt dependencies cho cả BE & FE"
	@echo "  make build     - Build production cho cả BE & FE"
	@echo "  make clean     - Dọn dẹp các file build tạm"
	@echo "======================================================="

# Mở Cloudflare Tunnel cho điện thoại truy cập
tunnel:
	@echo "🌐 Đang khởi tạo Cloudflare Tunnel cho http://localhost:5173..."
	cloudflared tunnel --url http://localhost:5173

# Chạy cả Backend và Frontend song song
dev:
	@echo "🚀 Khởi động Reread Backend & Frontend..."
	@(trap 'kill 0' SIGINT; \
		(cd reread-be && go run main.go) & \
		(cd reread-fe && npm run dev) & \
		wait)

# Chỉ chạy Backend
be:
	@echo "⚙️ Đang chạy Reread Backend (Port 8081)..."
	cd reread-be && go run main.go

# Chỉ chạy Frontend
fe:
	@echo "📱 Đang chạy Reread Frontend (Mobile View)..."
	cd reread-fe && npm run dev

# Cài đặt dependencies
install:
	@echo "📦 Cài đặt Go dependencies..."
	cd reread-be && go mod tidy
	@echo "📦 Cài đặt NPM dependencies..."
	cd reread-fe && npm install

# Build production
build:
	@echo "🔨 Build Reread Backend..."
	cd reread-be && go build -o bin/server main.go
	@echo "🔨 Build Reread Frontend..."
	cd reread-fe && npm run build

# Dọn dẹp
clean:
	rm -rf reread-be/bin
	rm -rf reread-fe/dist
