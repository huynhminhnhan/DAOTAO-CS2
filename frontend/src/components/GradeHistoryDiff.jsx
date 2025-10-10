import React from 'react';
import { Box, Table, TableRow, TableCell, Label, H5, Text } from '@adminjs/design-system';

const renderValue = (val) => {
  if (val === null || val === undefined) return <Text>-</Text>;
  if (typeof val === 'object') return <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(val, null, 2)}</pre>;
  return <Text>{String(val)}</Text>;
};

// Format date/time for display (Vietnam locale)
const formatDate = (val) => {
  if (val === null || val === undefined) return val;
  try {
    let d;
    if (val instanceof Date) d = val;
    else if (typeof val === 'number') d = new Date(val);
    else if (typeof val === 'string') {
      // try to parse ISO-like strings or epoch
      const n = Number(val);
      d = !isNaN(n) ? new Date(n) : new Date(val);
    } else return val;
    if (!d || isNaN(d.getTime())) return val;
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
  } catch (e) {
    return val;
  }
};

const isNumberLike = (v) => typeof v === 'number' || (!isNaN(Number(v)) && v !== '');

const Delta = ({ prev, next }) => {
  if (!isNumberLike(prev) || !isNumberLike(next)) return null;
  const p = Number(prev);
  const n = Number(next);
  const diff = Math.round((n - p) * 100) / 100;
  const sign = diff > 0 ? '+' : '';
  const color = diff > 0 ? '#0f5132' : (diff < 0 ? '#842029' : '#6c757d');
  return <Text style={{ color, fontWeight: 600, marginLeft: 8 }}>{`(${sign}${diff})`}</Text>;
};

const GradeHistoryDiff = (props) => {
  const { record } = props;

  // Map internal field keys to Vietnamese labels for better readability
  const fieldLabels = {
    txScore: 'Điểm TX',
    dkScore: 'Điểm ĐK',
    dkScore1: 'Điểm ĐK 1',
    dkScore2: 'Điểm ĐK 2',
    dkScore3: 'Điểm ĐK 3',
    finalScore: 'Điểm Thi',
    tbktScore: 'TBKT',
    tbmhScore: 'TBMH',
    letterGrade: 'Xếp loại',
    isPassed: 'Đạt',
    notes: 'Ghi chú',
    studentId: 'Sinh viên',
    classId: 'Lớp',
    subjectId: 'Môn học',
    changedBy: 'Người thay đổi',
    changedByRole: 'Vai trò',
    reason: 'Lý do',
    ipAddress: 'Địa chỉ IP',
    userAgent: 'User-Agent',
    transactionId: 'Mã giao dịch',
    createdAt: 'Ngày tạo',
    updatedAt: 'Ngày cập nhật',
    AcademicYear: "Năm học"

  };

  const normalizeSnapshot = (val) => {
    if (!val) return {};
    // AdminJS sometimes wraps values, or DB returns JSON string -> try to handle
    try {
      // If it's an AdminJS record-like wrapper
      if (val && typeof val === 'object' && val.params) return val.params;
      if (typeof val === 'string') {
        // Try parse JSON string
        try { return JSON.parse(val); } catch (e) { return { raw: val }; }
      }
      if (typeof val === 'object') return val;
    } catch (e) {
      return { raw: String(val) };
    }
    return {};
  };

  // Helper: extract flattened keys like 'previousValue.txScore' into object
  const extractFlattened = (params, prefix) => {
    if (!params || typeof params !== 'object') return null;
    const obj = {};
    let found = false;
    for (const k of Object.keys(params)) {
      if (k.startsWith(prefix + '.')) {
        found = true;
        const subKey = k.slice(prefix.length + 1);
        obj[subKey] = params[k];
      }
    }
    return found ? obj : null;
  };

  // Prefer flattened fields if present (AdminJS may flatten JSON into record.params)
  const flattenedPrev = extractFlattened(record?.params, 'previousValue');
  const flattenedNext = extractFlattened(record?.params, 'newValue');

  const prev = flattenedPrev || normalizeSnapshot(record?.params?.previousValue || record?.previousValue || record?.params?.previous || null);
  const next = flattenedNext || normalizeSnapshot(record?.params?.newValue || record?.newValue || record?.params?.next || null);

  const keys = Array.from(new Set([...(prev && typeof prev === 'object' ? Object.keys(prev) : []), ...(next && typeof next === 'object' ? Object.keys(next) : [])]));

  return (
    <Box>
      <H5>So sánh giá trị trước và sau</H5>
          {keys.length === 0 ? (
        <Box>
          <Text>Không có snapshot trước/sau để hiển thị.</Text>
          <Box marginTop="default">
            <H5>Thông tin thô (debug)</H5>
            <pre style={{ whiteSpace: 'pre-wrap', background: '#f7f7f9', padding: 10, borderRadius: 4 }}>
{JSON.stringify(record?.params || record || {}, null, 2)}
            </pre>
          </Box>
        </Box>
      ) : (
      <Table>
        <thead>
          <TableRow>
            <TableCell><Label>Trường</Label></TableCell>
            <TableCell><Label>Giá trị trước</Label></TableCell>
            <TableCell><Label>Giá trị sau</Label></TableCell>
          </TableRow>
        </thead>
        <tbody>
          {keys.map(key => {
            const p = prev ? prev[key] : undefined;
            const n = next ? next[key] : undefined;
            const changed = JSON.stringify(p) !== JSON.stringify(n);
            const prevStyle = changed ? { background: '#fff1f0' } : {};
            const newStyle = changed ? { background: '#f0fff4' } : {};
            // Icon: ▲ for increase, ▼ for decrease, ➜ for change
            let icon = null;
            if (isNumberLike(p) && isNumberLike(n)) {
              const diff = Number(n) - Number(p);
              if (diff > 0) icon = <span style={{ color: '#0f5132', marginLeft: 8 }}>▲</span>;
              else if (diff < 0) icon = <span style={{ color: '#842029', marginLeft: 8 }}>▼</span>;
            } else if (changed) {
              icon = <span style={{ color: '#0d6efd', marginLeft: 8 }}>➜</span>;
            }

            // If the key looks like an ID field, try to resolve a friendly label from record.params
            const tryResolveLabel = (fieldKey, value) => {
              if (value === null || value === undefined) return value;
              // common pattern: studentId -> studentName, classId -> className, subjectId -> subjectName, changedBy -> changedByName
              const mapping = {
                studentId: 'studentName',
                classId: 'className',
                subjectId: 'subjectName',
                changedBy: 'changedByName'
              };
              const mapKey = mapping[fieldKey] || (fieldKey.endsWith('Id') ? fieldKey.slice(0, -2) + 'Name' : null);
              if (mapKey && record?.params && record.params[mapKey]) return record.params[mapKey];
              return value;
            };

            let displayP = tryResolveLabel(key, p);
            let displayN = tryResolveLabel(key, n);

            // Format date fields
            if (key === 'createdAt' || key === 'updatedAt' || key.toLowerCase().includes('date')) {
              displayP = displayP ? formatDate(displayP) : displayP;
              displayN = displayN ? formatDate(displayN) : displayN;
            }

            const displayKey = fieldLabels[key] || (key === 'id' ? 'ID' : key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()));
            return (
              <TableRow key={key}>
                <TableCell><Text><strong>{displayKey}</strong></Text></TableCell>
                <TableCell style={prevStyle}>
                  <Box display="flex" alignItems="center">
                    {renderValue(displayP)}
                    <Delta prev={p} next={n} />
                  </Box>
                </TableCell>
                <TableCell style={newStyle}>
                  <Box display="flex" alignItems="center">
                    {renderValue(displayN)}
                    {icon}
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </tbody>
      </Table>
      )}
    </Box>
  );
};

export default GradeHistoryDiff;
