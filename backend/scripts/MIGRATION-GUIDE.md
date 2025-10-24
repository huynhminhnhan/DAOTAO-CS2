# 📋 HƯỚNG DẪN MIGRATION - TÁI CẤU TRÚC PROJECT

## ⚠️ QUAN TRỌNG: ĐỌC KỸ TRƯỚC KHI CHẠY!

Script migration này sẽ tái cấu trúc toàn bộ project của bạn thành:
- `frontend/` - Chứa React components, public assets
- `backend/` - Chứa Express server, API, database
- `docs/` - Chứa documentation

## 📝 CHUẨN BỊ

### 1. Backup Code (BẮT BUỘC!)

```bash
# Commit tất cả changes hiện tại
git add .
git commit -m "Before structure migration"

# Hoặc tạo branch mới
git checkout -b migration-backup
git add .
git commit -m "Backup before migration"
git checkout main
```

### 2. Kiểm tra Git Status

```bash
git status
```

**Kết quả phải:** `nothing to commit, working tree clean`

### 3. Test Backup Script (Tùy chọn)

```bash
# Tạo backup thủ công
cp -r /Users/NhanHuynhBca/Documents/Project/CĐCSND2/student-management-system \
     /Users/NhanHuynhBca/Documents/Project/CĐCSND2/student-management-system-backup
```

---

## 🚀 CHẠY MIGRATION

### Bước 1: Kiểm tra script

```bash
cd /Users/NhanHuynhBca/Documents/Project/CĐCSND2/student-management-system

# Xem nội dung script
cat scripts/migrate-structure.js
```

### Bước 2: Chạy migration

```bash
node scripts/migrate-structure.js
```

**Script sẽ:**
1. ✅ Kiểm tra git status (phải clean)
2. ✅ Tạo backup tự động trong `backup-[timestamp]/`
3. ✅ Tạo cấu trúc mới (`frontend/`, `backend/`, `docs/`)
4. ✅ Di chuyển files vào đúng vị trí
5. ✅ Tạo package.json cho frontend và backend
6. ✅ Tạo README files
7. ✅ Báo cáo kết quả

### Bước 3: Kiểm tra kết quả

```bash
# Xem cấu trúc mới
tree -L 2 -I 'node_modules'

# Hoặc
ls -la frontend/
ls -la backend/
ls -la docs/
```

---

## 🔧 SAU KHI MIGRATION

### 1. Cài đặt Dependencies

```bash
# Backend
cd backend
npm install
```

### 2. Cập nhật Import Paths (NẾU CẦN)

Script sẽ báo các files cần kiểm tra import paths.

**Ví dụ cần sửa:**

```javascript
// ❌ Trước (trong frontend/src/components/...)
import { API_ENDPOINTS } from '../config/api.config';

// ✅ Sau (nếu component bundled trong backend)
import { API_ENDPOINTS } from '../../../frontend/src/config/api.config';
```

**NHƯNG:** AdminJS tự động handle component imports, nên có thể không cần sửa!

### 3. Cập nhật app.js (Backend)

Kiểm tra các đường dẫn import components trong `backend/app.js`:

```javascript
// Có thể cần update từ:
componentLoader.add('Dashboard', '../src/components/AdminDashboard')

// Thành:
componentLoader.add('Dashboard', '../../frontend/src/components/AdminDashboard')
```

### 4. Test Ứng Dụng

```bash
cd backend
npm run dev
```

Truy cập: http://localhost:3000

**Kiểm tra:**
- ✅ Server khởi động không lỗi
- ✅ AdminJS UI hiển thị bình thường
- ✅ React components render đúng
- ✅ API endpoints hoạt động
- ✅ Database connect thành công

### 5. Fix Lỗi (Nếu có)

**Lỗi thường gặp:**

#### A. Component không tìm thấy

```
Error: Cannot find module '../src/components/...'
```

**Fix:** Cập nhật đường dẫn trong app.js hoặc admin config

#### B. API Config không tìm thấy

```
Error: Cannot resolve module '../config/api.config'
```

**Fix:** 
- Copy `api.config.js` vào backend nếu cần
- Hoặc update import path trong components

#### C. Static assets 404

**Fix:** Cập nhật static files serving trong app.js:

```javascript
// Backend app.js
app.use('/public', express.static(path.join(__dirname, '../frontend/public')));
```

---

## 🔄 ROLLBACK (NẾU CẦN)

### Cách 1: Restore từ Git

```bash
git reset --hard HEAD
```

### Cách 2: Restore từ Backup

```bash
# Xóa thư mục hiện tại
cd /Users/NhanHuynhBca/Documents/Project/CĐCSND2
rm -rf student-management-system

# Restore từ backup
cp -r backup-[timestamp] student-management-system
cd student-management-system
npm install
```

### Cách 3: Git Checkout

```bash
git checkout migration-backup
```

---

## 📊 KẾT QUẢ MONG ĐỢI

### Cấu trúc sau migration:

```
student-management-system/
├── frontend/                    # ← FRONTEND
│   ├── public/                  # Static assets
│   │   ├── assets/
│   │   └── *.css
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── config/              # API config
│   │   │   └── api.config.js
│   │   └── utils/               # Frontend utils
│   │       └── gradeCalculation.js
│   ├── package.json
│   └── README.md
│
├── backend/                     # ← BACKEND
│   ├── src/
│   │   ├── config/              # Server configs
│   │   ├── controllers/         # Request handlers
│   │   ├── routes/              # API routes
│   │   ├── services/            # Business logic
│   │   ├── repositories/        # Database
│   │   ├── middleware/          # Express middleware
│   │   ├── resources/           # AdminJS resources
│   │   ├── database/            # Models, migrations
│   │   └── utils/               # Backend utils
│   ├── config/                  # DB config
│   ├── scripts/                 # Scripts
│   ├── app.js                   # Entry point
│   ├── .env
│   ├── .sequelizerc
│   ├── package.json
│   └── README.md
│
├── docs/                        # ← DOCUMENTATION
│   ├── ARCHITECTURE.md
│   ├── DATABASE-SCHEMA.md
│   ├── ROUTES-REFACTORING-FINAL.md
│   └── ...
│
├── backup-[timestamp]/          # ← AUTO BACKUP
│   └── ... (old structure)
│
├── .gitignore
├── package.json                 # Root package.json
└── README.md
```

---

## 🎯 LỢI ÍCH SAU MIGRATION

✅ **Tách biệt rõ ràng:** Frontend và Backend độc lập
✅ **Dễ maintain:** Mỗi layer có responsibility riêng
✅ **Scalable:** Có thể deploy frontend/backend riêng
✅ **Clean imports:** Không còn lẫn lộn import paths
✅ **Professional structure:** Chuẩn industry best practices
✅ **Team collaboration:** Dễ phân chia công việc

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề:

1. **Check backup:** `ls -la backup-*/`
2. **Check git:** `git log --oneline`
3. **Rollback:** Xem section "ROLLBACK" bên trên
4. **Debug:** Check console errors trong script output

---

## ✅ CHECKLIST

Trước khi chạy migration:
- [ ] Đã commit tất cả changes
- [ ] Git working tree clean
- [ ] Đã đọc hết hướng dẫn này
- [ ] Hiểu rõ cấu trúc mới
- [ ] Sẵn sàng fix imports nếu cần

Sau khi migration:
- [ ] Backend server khởi động thành công
- [ ] AdminJS UI hiển thị bình thường
- [ ] Components render đúng
- [ ] API calls hoạt động
- [ ] Database queries OK
- [ ] No console errors
- [ ] Commit new structure: `git commit -m "Restructure: Separate frontend/backend"`

---

**🎉 CHÚC BẠN MIGRATION THÀNH CÔNG!**
