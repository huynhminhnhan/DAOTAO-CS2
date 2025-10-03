import { User, Student, Class, Subject, GradeHistory } from '../backend/database/index.js';

const GradeHistoryService = {
  async enrichListRecords(records) {
    if (!records || !Array.isArray(records)) return;
    const changedByIds = Array.from(new Set(records.map(r => r.params && (r.params.changedBy || r.params.changed_by)).filter(Boolean)));
    const studentIds = Array.from(new Set(records.map(r => r.params && (r.params.studentId || r.params.student_id)).filter(Boolean)));
    const classIds = Array.from(new Set(records.map(r => r.params && (r.params.classId || r.params.class_id)).filter(Boolean)));
    const subjectIds = Array.from(new Set(records.map(r => r.params && (r.params.subjectId || r.params.subject_id)).filter(Boolean)));

    const [users, students, classes, subjects] = await Promise.all([
      changedByIds.length ? User.findAll({ where: { id: changedByIds } }) : Promise.resolve([]),
      studentIds.length ? Student.findAll({ where: { id: studentIds } }) : Promise.resolve([]),
      classIds.length ? Class.findAll({ where: { id: classIds } }) : Promise.resolve([]),
      subjectIds.length ? Subject.findAll({ where: { id: subjectIds } }) : Promise.resolve([])
    ]);

    const userMap = Object.fromEntries((users || []).map(u => [u.id, u.fullName || u.username || u.email]));
    const studentMap = Object.fromEntries((students || []).map(s => [s.id, s.fullName || s.studentCode || String(s.id)]));
    const classMap = Object.fromEntries((classes || []).map(c => [c.id, c.className || c.classCode || String(c.id)]));
    const subjectMap = Object.fromEntries((subjects || []).map(su => [su.id, su.subjectName || String(su.id)]));

    for (const r of records) {
      const cb = r.params && (r.params.changedBy || r.params.changed_by);
      if (cb) r.params.changedByName = userMap[cb] || String(cb);

      const sid = r.params && (r.params.studentId || r.params.student_id);
      if (sid) r.params.studentName = studentMap[sid] || String(sid);

      const cid = r.params && (r.params.classId || r.params.class_id);
      if (cid) r.params.className = classMap[cid] || String(cid);

      const suid = r.params && (r.params.subjectId || r.params.subject_id);
      if (suid) r.params.subjectName = subjectMap[suid] || String(suid);
    }
  },

  async enrichShowRecord(record) {
    if (!record) return;
    try {
      let sid = record.params && (record.params.studentId || record.params.student_id || record.studentId);
      let cid = record.params && (record.params.classId || record.params.class_id || record.classId);
      let suid = record.params && (record.params.subjectId || record.params.subject_id || record.subjectId);

      let changedBy = record.params && (record.params.changedBy || record.params.changed_by || record.changedBy);
      if (!changedBy) {
        try {
          const hr = await GradeHistory.findByPk(record.id && record.id());
          if (hr && hr.changedBy) changedBy = hr.changedBy;
        } catch (e) {}
      }

      try {
        if (!sid || !cid || !suid) {
          const hr = await GradeHistory.findByPk(record.id && record.id());
          if (hr) {
            sid = sid || hr.studentId || hr.student_id;
            cid = cid || hr.classId || hr.class_id;
            suid = suid || hr.subjectId || hr.subject_id;
          }
        }
      } catch (e) {}

      if (sid) {
        const s = await Student.findByPk(sid);
        if (s) record.params.studentName = s.fullName || `${s.studentCode || ''}`;
      }
      if (cid) {
        const c = await Class.findByPk(cid);
        if (c) record.params.className = c.className || c.classCode || String(cid);
      }
      if (suid) {
        const su = await Subject.findByPk(suid);
        if (su) record.params.subjectName = su.subjectName || String(suid);
      }
      if (changedBy) {
        const u = await User.findByPk(changedBy);
        if (u) record.params.changedByName = u.fullName || u.username || u.email || String(changedBy);
      }
    } catch (err) {
      console.warn('GradeHistoryService.enrichShowRecord error:', err && err.message);
    }
  }
};

export default GradeHistoryService;
