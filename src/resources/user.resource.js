/**
 * User Resource Configuration
 * Cấu hình resource User theo chuẩn AdminJS
 */

import { User } from '../backend/database/index.js';

// Helper: normalize managedClasses payload into an array of numeric IDs or null when absent
function parseManagedClasses(payload, name = 'managedClasses') {
  if (!payload) return null;
  const raw = payload[name];
  if (raw !== undefined) {
    if (Array.isArray(raw)) return raw.map(Number).filter(Boolean);
    if (typeof raw === 'string') {
      // try JSON string
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(Number).filter(Boolean);
      } catch (e) {
        // not JSON, try comma separated
        if (raw === '') return [];
        return raw.split(',').map(s => Number(s.trim())).filter(Boolean);
      }
    }
    return [Number(raw)].filter(Boolean);
  }
  // check for managedClasses[] style
  if (payload[`${name}[]`] !== undefined) {
    const v = payload[`${name}[]`];
    if (Array.isArray(v)) return v.map(Number).filter(Boolean);
    if (typeof v === 'string') return v.split(',').map(s => Number(s.trim())).filter(Boolean);
  }
  // check for indexed keys like managedClasses.0, managedClasses.1
  const indexed = Object.keys(payload).filter(k => k.startsWith(`${name}.`));
  if (indexed.length) {
    indexed.sort((a, b) => {
      const ai = Number(a.split('.').slice(1).join('.')) || 0;
      const bi = Number(b.split('.').slice(1).join('.')) || 0;
      return ai - bi;
    });
    return indexed.map(k => Number(payload[k])).filter(Boolean);
  }
  // check for bracketed indices like managedClasses[0]
  const bracketed = Object.keys(payload).filter(k => k.startsWith(`${name}[`));
  if (bracketed.length) {
    bracketed.sort((a, b) => {
      const ai = Number((a.match(/\[(\d+)\]/) || [])[1]) || 0;
      const bi = Number((b.match(/\[(\d+)\]/) || [])[1]) || 0;
      return ai - bi;
    });
    return bracketed.map(k => Number(payload[k])).filter(Boolean);
  }
  return null;
}

const UserResource = {
  resource: User,
  options: {
    id: 'users', // ID để mapping với translations
    titleProperty: 'Người dùng', // Title hiển thị
    navigation: {
      name: 'Người dùng',
      icon: 'Settings'
    },
    parent: {
      name: 'Quản lý Hệ thống',
      icon: 'Settings'
    },
  listProperties: ['id', 'username', 'email', 'fullName', 'role', 'status', 'lastLogin'],
  filterProperties: ['username', 'email', 'role', 'status'],
  showProperties: ['id', 'username', 'email', 'fullName', 'role', 'status', 'lastLogin', 'createdAt', 'managedClasses'],
  editProperties: ['username', 'email', 'fullName', 'role', 'status', 'password', 'managedClasses'],
    actions: {
      new: {
        isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
        before: async (request) => {
          // If creating a user and password is empty string, remove it so hook doesn't overwrite
          if (request.method === 'post' && request.payload) {
            if (request.payload.password === '') delete request.payload.password;
            // Validate length if provided; actual hashing is handled by Sequelize hooks
            if (request.payload.password && request.payload.password.length < 6) {
              throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
            }
            // Handle managedClasses assignment for teacher users
            try {
              const managed = parseManagedClasses(request.payload);
              const role = request.payload.role;
              if (managed !== null && role === 'teacher') {
                const { Teacher, TeacherClassAssignment } = await import('../backend/database/index.js');
                // managed is already normalized to array of ints
                const classIds = managed;
                // find or create teacher by email
                let teacher = null;
                if (request.payload.email) teacher = await Teacher.findOne({ where: { email: request.payload.email } });
                if (!teacher) {
                  const username = request.payload.username || (request.payload.email ? request.payload.email.split('@')[0] : null);
                  const teacherCode = username || `T${Date.now()}`;
                  teacher = await Teacher.create({ teacherCode, fullName: request.payload.fullName || '', email: request.payload.email || '', status: 'active' });
                }
                // Replace assignments: remove existing then create new
                console.log('Syncing managedClasses for teacher', teacher.email, 'classIds=', classIds);
                await TeacherClassAssignment.destroy({ where: { teacherId: teacher.id } });
                let createdCount = 0;
                for (const cid of classIds) {
                  if (!cid) continue;
                  await TeacherClassAssignment.create({ teacherId: teacher.id, classId: cid });
                  createdCount++;
                }
                console.log(`Created ${createdCount} TeacherClassAssignment rows for teacherId=${teacher.id}`);
              }
              // If role is not teacher but managedClasses provided, drop it
            } catch (err) {
              console.warn('Error syncing managedClasses:', err.message);
            }
          }
          return request;
        },
        after: async (response) => {
          if (response.record) {
            response.record.params.password = '';
            try {
              const { Teacher, TeacherClassAssignment, Class, User: UserModel } = await import('../backend/database/index.js');
              // Try to get email from response.record.params
              let email = response.record.params && response.record.params.email;
              // If no email, try to resolve from record.id
              if (!email && response.record && response.record.id) {
                try {
                  const rid = (typeof response.record.id === 'function') ? response.record.id() : response.record.id;
                  const u = await UserModel.findByPk(rid);
                  if (u && u.email) email = u.email;
                } catch (e) { /* ignore */ }
              }

              let teacher = null;
              if (email) teacher = await Teacher.findOne({ where: { email } });
              const teacherIdToQuery = teacher ? teacher.id : (response.record.params && response.record.params.id ? response.record.params.id : ((typeof response.record.id === 'function') ? response.record.id() : response.record.id));

              if (teacherIdToQuery) {
                const assignments = await TeacherClassAssignment.findAll({ where: { teacherId: teacherIdToQuery } });
                const classIds = assignments.map(a => a.classId);
                if (classIds.length) {
                  const classes = await Class.findAll({ where: { id: classIds } });
                  response.record.params.managedClasses = classes.map(c => String(c.id));
                  response.record.params.managedClassesLabels = classes.map(c => `${c.classCode} - ${c.className}`);
                } else {
                  response.record.params.managedClasses = [];
                  response.record.params.managedClassesLabels = [];
                }
              } else {
                response.record.params.managedClasses = [];
                response.record.params.managedClassesLabels = [];
              }
            } catch (err) {
              console.warn('Error loading managedClasses in edit.after:', err.message);
            }
          }
          return response;
        }
      },
      edit: {
        isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'admin',
        before: async (request, context) => {
         
          // Robust extraction of the user id being edited from several places AdminJS may provide it
          // Debug: dump incoming context/request records to help diagnose preload issues
         
          let userIdRaw =
            (context && context.record && (context.record.id || (context.record.params && context.record.params.id))) ||
            (request && request.record && (request.record.id || (request.record.params && request.record.params.id))) ||
            (request && request.params && request.params.recordId) ||
            (request && request.query && request.query.recordId) ||
            (request && request.payload && (request.payload.id || request.payload.recordId)) ||
            null;

          // AdminJS sometimes provides a Record.id() function instead of a raw value — call it to get the real id
          try {
            if (typeof userIdRaw === 'function') {
              // Prefer calling the id() on the provided record object when available
              if (context && context.record && typeof context.record.id === 'function') {
                userIdRaw = context.record.id();
              } else if (request && request.record && typeof request.record.id === 'function') {
                userIdRaw = request.record.id();
              } else {
                // last resort: call the function directly
                userIdRaw = userIdRaw();
              }
            }
          } catch (err) {
            console.warn('Could not resolve userIdRaw function:', err && err.message);
            userIdRaw = null;
          }

          const userId = userIdRaw ? String(userIdRaw) : null;

          console.log('DEBUG: edit.before resolved userId =', userIdRaw, '->', userId);
          if (request.method === 'get' && userId) {
            try {
              const { Teacher, TeacherClassAssignment, Class, User: UserModel } = await import('../backend/database/index.js');

              // Try to resolve teacher by email available on the record; fall back to fetching User by id
              let email = (context && context.record && context.record.params && context.record.params.email) ||
                          (request && request.record && request.record.params && request.record.params.email) ||
                          null;

              if (!email && userId) {
                // try to load email from User table using the userId
                try {
                  const u = await UserModel.findByPk(userId);
                  if (u && u.email) email = u.email;
                } catch (e) {
                  // ignore - we'll fallback later
                }
              }

              let teacher = null;
              if (email) teacher = await Teacher.findOne({ where: { email } });

              // If we found a Teacher, use its id; otherwise as a last resort try using userId
              const teacherIdToQuery = teacher ? teacher.id : userId;

              const assignments = await TeacherClassAssignment.findAll({ where: { teacherId: teacherIdToQuery } });
              const classIds = assignments.map(a => a.classId);
              request.record = request.record || { params: {} };
              request.record.params = request.record.params || {};
              if (classIds.length) {
                const classes = await Class.findAll({ where: { id: classIds } });
                // set IDs (for component preselect) and labels (for readable display)
                request.record.params.managedClasses = classes.map(c => String(c.id));
                request.record.params.managedClassesLabels = classes.map(c => `${c.classCode} - ${c.className}`);
              } else {
                request.record.params.managedClasses = [];
                request.record.params.managedClassesLabels = [];
              }
              // Debug: show what we preloaded for the component
              try { console.log('DEBUG: edit.before preloaded request.record.params.managedClasses =', request.record.params.managedClasses); } catch (e) {}
            } catch (err) {
              console.warn('Error preloading managedClasses for edit:', err.message);
            }
          }

          // On edit POST, if admin left password blank, don't overwrite existing password
          if (request.method === 'post' && request.payload) {
            if (request.payload.password === '') delete request.payload.password;
            // Validate length if provided; hashing handled by model hooks
            if (request.payload.password && request.payload.password.length < 6) {
              throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
            }
            // Handle managedClasses update for teacher users
            try {
              const managed = parseManagedClasses(request.payload);
              // Only process if payload contains managedClasses (null means absent)
              if (managed !== null) {
                const { Teacher, TeacherClassAssignment } = await import('../backend/database/index.js');
                // Determine teacher: prefer matching by email, else try by username
                const email = request.payload.email || (request.record && request.record.params && request.record.params.email);
                let teacher = null;
                if (email) teacher = await Teacher.findOne({ where: { email } });
                // If teacher doesn't exist but role is teacher, create it
                const role = request.payload.role || (request.record && request.record.params && request.record.params.role);
                if (!teacher && role === 'teacher') {
                  const username = request.payload.username || (request.record && request.record.params && request.record.params.username) || (email ? email.split('@')[0] : null);
                  const teacherCode = username || `T${Date.now()}`;
                  teacher = await Teacher.create({ teacherCode, fullName: request.payload.fullName || (request.record && request.record.params && request.record.params.fullName) || '', email: email || '', status: 'active' });
                }
                // If we have a teacher and managedClasses is set, sync assignments
                if (teacher) {
                  const classIds = managed;
                  console.log('Syncing managedClasses (edit) for teacher', teacher.email, 'classIds=', classIds);
                  await TeacherClassAssignment.destroy({ where: { teacherId: teacher.id } });
                  let createdCount = 0;
                  for (const cid of classIds) {
                    if (!cid) continue;
                    await TeacherClassAssignment.create({ teacherId: teacher.id, classId: cid });
                    createdCount++;
                  }
                  console.log(`(edit) Created ${createdCount} TeacherClassAssignment rows for teacherId=${teacher.id}`);
                }
                // If role changed from teacher to non-teacher, remove assignments
                if (role !== 'teacher' && request.record && request.record.params && request.record.params.role === 'teacher' && teacher) {
                  await TeacherClassAssignment.destroy({ where: { teacherId: teacher.id } });
                }
              }
            } catch (err) {
              console.warn('Error syncing managedClasses on edit:', err.message);
            }
          }
          return request;
        },
        after: async (response) => {
          if (response.record) response.record.params.password = '';
          return response;
        }
      },
      show: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher',
        after: async (response) => {
          if (response.record) {
            response.record.params.password = '';
            try {
              const rec = response.record;
              const email = rec.params.email;
              if (email) {
                const { Teacher, TeacherClassAssignment, Class } = await import('../backend/database/index.js');
                const teacher = await Teacher.findOne({ where: { email } });
                if (teacher) {
                  const assignments = await TeacherClassAssignment.findAll({ where: { teacherId: teacher.id } });
                  const classIds = assignments.map(a => a.classId);
                  const classes = await Class.findAll({ where: { id: classIds } });
                  rec.params.managedClasses = classes.map(c => `${c.classCode} - ${c.className}`);
                }
              }
            } catch (err) {
              console.warn('Error loading managedClasses for show:', err.message);
            }
          }
          return response;
        }
      },
      list: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher',
        after: async (response) => {
          if (response.records) {
            for (const r of response.records) {
              r.params.password = '';
              try {
                const email = r.params.email;
                if (email) {
                  const { Teacher, TeacherClassAssignment, Class } = await import('../backend/database/index.js');
                  const teacher = await Teacher.findOne({ where: { email } });
                  if (teacher) {
                    const assignments = await TeacherClassAssignment.findAll({ where: { teacherId: teacher.id } });
                    const classIds = assignments.map(a => a.classId);
                    const classes = await Class.findAll({ where: { id: classIds } });
                    r.params.managedClasses = classes.map(c => `${c.classCode} - ${c.className}`);
                  }
                }
              } catch (err) {
                console.warn('Error loading managedClasses for list:', err.message);
              }
            }
          }
          return response;
        }
      },
      delete: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher'
      }
    },
    properties: {
      id: { isVisible: { list: true, filter: false, show: true, edit: false } },
      password: {
        isVisible: { list: false, filter: false, show: false, edit: true },
        type: 'password'
      },
      username: { isTitle: true, isRequired: true },
      email: { isRequired: true, type: 'email' },
      fullName: { isRequired: true },
      role: { 
        availableValues: [
          { value: 'admin', label: 'Quản trị viên' },
          { value: 'teacher', label: 'Giảng viên' }
        ]
      },
      status: { 
        availableValues: [
          { value: 'active', label: 'Hoạt động' },
          { value: 'inactive', label: 'Ngừng hoạt động' },
          { value: 'suspended', label: 'Tạm khóa' }
        ]
      }
      ,
      managedClasses: {
        isVisible: { list: false, filter: false, show: true, edit: true, new: true },
        type: 'string',
        components: {
          edit: 'ManagedClassesMultiSelect',
          new: 'ManagedClassesMultiSelect'
        },
  // Provided options are loaded by the custom AdminJS component via an API call.
  // Keep availableValues as a synchronous array to avoid AdminJS attempting to call
  // array methods on a Promise (which causes `availableValues.includes is not a function`).
  availableValues: [],
        label: 'Các lớp được quản lý',
        description: 'Chọn 1 hoặc nhiều lớp (dùng cho vai trò Giảng viên)'
      }
    }
  }
};

export default UserResource;
