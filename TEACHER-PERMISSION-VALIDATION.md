# ✅ Teacher Permission Validation on Login

## 📋 Tổng quan

Đã thêm validation kiểm tra teacher permissions khi đăng nhập để đảm bảo:
1. Teacher phải có ít nhất 1 permission active
2. Permission phải còn trong thời hạn (validFrom <= now <= validTo)
3. Hiển thị thông báo rõ ràng nếu không đủ điều kiện

## 🔒 Logic Validation

### Luồng xử lý khi Teacher login:

```javascript
authenticate: async (email, password) => {
  // 1. Tìm user với email và status = 'active'
  const user = await User.findOne({ 
    where: { email, status: 'active' }
  });
  
  if (!user) return null; // ❌ User không tồn tại hoặc inactive
  
  // 2. Kiểm tra password
  if (!(await user.validatePassword(password))) return null; // ❌ Sai password
  
  // 3. Nếu là TEACHER → Kiểm tra permissions
  if (user.role === 'teacher') {
    // 3a. Lấy tất cả permissions active
    const activePermissions = await TeacherPermission.findAll({
      where: { userId: user.id, status: 'active' }
    });
    
    if (activePermissions.length === 0) {
      throw Error('Tài khoản giáo viên không có quyền truy cập. Vui lòng liên hệ quản trị viên.');
    }
    
    // 3b. Lọc permissions còn trong thời hạn
    const now = new Date();
    const validPermissions = activePermissions.filter(perm => {
      const validFrom = new Date(perm.validFrom);
      const validTo = new Date(perm.validTo);
      return now >= validFrom && now <= validTo;
    });
    
    if (validPermissions.length === 0) {
      throw Error('Tài khoản giáo viên đã hết thời hạn truy cập. Vui lòng liên hệ quản trị viên.');
    }
  }
  
  // 4. Update lastLogin và cho phép đăng nhập
  user.lastLogin = new Date();
  await user.save();
  
  return { id, email, username, role };
}
```

## 📊 Các trường hợp xử lý

### Case 1: Admin Login ✅
```
Admin không có TeacherPermission
→ Không kiểm tra permissions
→ Cho phép đăng nhập
```

### Case 2: Teacher có permissions hợp lệ ✅
```
Teacher User: { status: 'active' }
TeacherPermission: 
  - status: 'active'
  - validFrom: 2025-01-01
  - validTo: 2025-12-31
  - now: 2025-10-09 (trong khoảng)
→ Cho phép đăng nhập
→ Log: "Teacher email@example.com logged in successfully with N valid permissions"
```

### Case 3: Teacher không có permissions ❌
```
Teacher User: { status: 'active' }
TeacherPermission: [] (empty)
→ Throw Error
→ Message: "Tài khoản giáo viên không có quyền truy cập. Vui lòng liên hệ quản trị viên."
```

### Case 4: Teacher có permissions nhưng đã hết hạn ❌
```
Teacher User: { status: 'active' }
TeacherPermission: 
  - status: 'active'
  - validFrom: 2024-01-01
  - validTo: 2024-12-31
  - now: 2025-10-09 (ngoài khoảng)
→ Throw Error
→ Message: "Tài khoản giáo viên đã hết thời hạn truy cập. Vui lòng liên hệ quản trị viên."
```

### Case 5: Teacher có permissions chưa có hiệu lực ❌
```
Teacher User: { status: 'active' }
TeacherPermission: 
  - status: 'active'
  - validFrom: 2026-01-01
  - validTo: 2026-12-31
  - now: 2025-10-09 (trước validFrom)
→ Throw Error
→ Message: "Tài khoản giáo viên đã hết thời hạn truy cập. Vui lòng liên hệ quản trị viên."
```

### Case 6: Teacher có mix permissions (some expired, some valid) ✅
```
Teacher User: { status: 'active' }
TeacherPermissions: 
  - Permission 1: validTo: 2024-12-31 (expired)
  - Permission 2: validTo: 2025-12-31 (valid)
→ Có ít nhất 1 permission valid
→ Cho phép đăng nhập
```

## 🎯 Console Logs

### Login thành công:
```
[Auth] Teacher 24410207@ms.uit.edu.vn logged in successfully with 2 valid permissions
[Auth] User 24410207@ms.uit.edu.vn (teacher) logged in successfully
```

### Login thất bại - No permissions:
```
[Auth] Login failed: Teacher teacher@example.com has no active permissions
[Auth] Authentication error: Error: Tài khoản giáo viên không có quyền truy cập. Vui lòng liên hệ quản trị viên.
```

### Login thất bại - Expired:
```
[Auth] Login failed: All permissions expired for teacher old@example.com
[Auth] Authentication error: Error: Tài khoản giáo viên đã hết thời hạn truy cập. Vui lòng liên hệ quản trị viên.
```

### Login thất bại - Wrong password:
```
[Auth] Login failed: Invalid password - teacher@example.com
```

### Login thất bại - User not found:
```
[Auth] Login failed: User not found or inactive - notexist@example.com
```

## 🔧 Files Modified

**`/app.js`** - authenticate function:
```javascript
Lines 92-160: Added teacher permission validation logic
```

## 🧪 Test Cases

### Test 1: Admin login
```bash
Email: admin@university.edu.vn
Password: 123456
Expected: ✅ Login successful (no permission check)
```

### Test 2: Teacher với permissions hợp lệ
```bash
Email: 24410207@ms.uit.edu.vn
Password: 123456
Expected: ✅ Login successful
Console: "Teacher ... logged in successfully with N valid permissions"
```

### Test 3: Teacher với permissions hết hạn
```bash
# Cần tạo teacher test với expired permissions
Email: expired@example.com
Expected: ❌ Login failed
Error: "Tài khoản giáo viên đã hết thời hạn truy cập"
```

### Test 4: Teacher không có permissions
```bash
# Cần tạo teacher test không có permissions
Email: noperm@example.com
Expected: ❌ Login failed
Error: "Tài khoản giáo viên không có quyền truy cập"
```

## 📝 Notes

### User model vs TeacherPermission model:

**User model:**
- Fields: `id`, `email`, `username`, `password`, `role`, `status`, `lastLogin`
- `status`: 'active' | 'inactive' | 'suspended'
- Không có `validFrom`/`validTo` → User account không có expiry date

**TeacherPermission model:**
- Fields: `userId`, `classId`, `subjectId`, `validFrom`, `validTo`, `status`
- `status`: 'active' | 'inactive'
- Có `validFrom`/`validTo` → Permission có thời hạn

### Security considerations:

1. ✅ Kiểm tra cả `status` và date range
2. ✅ Message rõ ràng để user biết vấn đề
3. ✅ Log chi tiết để admin debug
4. ✅ Không expose sensitive info trong error message
5. ✅ Throw error để AdminJS hiển thị message cho user

### Future improvements:

1. Thêm email notification khi permission sắp hết hạn (7 ngày trước)
2. Dashboard hiển thị expiry date của permissions
3. Tự động gia hạn permissions hàng năm
4. API endpoint để teacher check own permissions status
