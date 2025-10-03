import React, { useEffect, useState } from 'react';
import { Box, Button, Table, TableRow, TableCell, Label, Text } from '@adminjs/design-system';

const StudentGradeHistoryTab = (props) => {
  const { record } = props;
  const studentId = record?.params?.id || record?.id || record?.params?.studentId;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    (async () => {
      try {
        const resp = await fetch(`/api/grade-history?studentId=${studentId}&limit=50`, { credentials: 'same-origin' });
        const json = await resp.json();
        
        if (json && json.success) setRows(json.data || []);
        else setError('Không tải được lịch sử');
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  const handleView = async (id) => {
    // open a new AdminJS modal by navigating to the GradeHistory resource show page
    window.location.href = `/admin/resources/GradeHistory/records/${id}/show`;
  };

  const handleRevert = async (id) => {
    if (!confirm('Bạn có chắc muốn revert bản ghi này?')) return;
    try {
      const resp = await fetch(`/api/grade-history/${id}/revert`, { method: 'POST', credentials: 'same-origin' });
      const json = await resp.json();
      if (json && json.success) {
        alert('Revert thành công');
        // refresh
        setLoading(true);
        try {
          const r = await fetch(`/api/grade-history?studentId=${studentId}&limit=50`, { credentials: 'same-origin' });
          const jr = await r.json();
          setRows(jr.data || []);
        } catch (e) {
          setError(e.message || String(e));
        } finally {
          setLoading(false);
        }
      } else {
        alert('Không thể revert: ' + (json && json.message));
      }
    } catch (e) {
      alert('Lỗi: ' + (e.message || e));
    }
  };

  if (!studentId) return <Box>Không xác định sinh viên</Box>;
  if (loading) return <Box>Đang tải...</Box>;
  if (error) return <Box>{error}</Box>;

  return (
    <Box>
      <Box marginBottom="default">Lịch sử sửa điểm của sinh viên</Box>
      <Table>
        <thead>
          <TableRow>
            <TableCell><Label>Thời gian</Label></TableCell>
            <TableCell><Label>Loại</Label></TableCell>
            <TableCell><Label>Người thay đổi</Label></TableCell>
            <TableCell><Label>Lớp/Môn</Label></TableCell>
            <TableCell><Label>Hành động</Label></TableCell>
          </TableRow>
        </thead>
        <tbody>
          {rows.map(r => (
            <TableRow key={r.id}>
              <TableCell><Text>{new Date(r.createdAt).toLocaleString()}</Text></TableCell>
              <TableCell><Text>{r.changeType}</Text></TableCell>
              <TableCell><Text>{r.changedByName || r.changedBy || r.changedByRole || '-'}</Text></TableCell>
              <TableCell><Text>{r.classId || r.subjectId || '-'}</Text></TableCell>
              <TableCell>
                <Button size="sm" variant="primary" onClick={() => handleView(r.id)}>
                  Xem 
                </Button>
                {' '}
               
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </Box>
  );
};

export default StudentGradeHistoryTab;
