import React, { useEffect, useState } from 'react';
import { Box, H2, Text, Badge, Table, TableRow, TableCell, Loader } from '@adminjs/design-system';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/admin-api/dashboard-stats', { credentials: 'include' });
        const payload = await res.json();
        if (payload && payload.success) setStats(payload.data);
        else setError(payload.message || 'Không thể tải thống kê');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Box p="xl"><Loader /></Box>;
  if (error) return <Box p="xl"><Text>{error}</Text></Box>;

  return (
    <Box p="xl">
      <H2>📈 Thống kê hệ thống</H2>
      <Box mt="lg" display="flex" style={{ gap: '16px', flexWrap: 'wrap' }}>
        <Badge>Users: {stats.users}</Badge>
        <Badge>Teachers: {stats.teachers}</Badge>
        <Badge>Students: {stats.students}</Badge>
        <Badge>Classes: {stats.classes}</Badge>
        <Badge>Subjects: {stats.subjects}</Badge>
        <Badge>Grades: {stats.grades}</Badge>
      </Box>

      <Box mt="lg">
        <Table>
          <thead>
            <TableRow>
              <TableCell><strong>Metric</strong></TableCell>
              <TableCell><strong>Value</strong></TableCell>
            </TableRow>
          </thead>
          <tbody>
            {Object.entries(stats).map(([k, v]) => (
              <TableRow key={k}>
                <TableCell>{k}</TableCell>
                <TableCell>{String(v)}</TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </Box>

      <Box mt="lg">
        <Text color="grey60">Cập nhật lúc: {new Date(stats.updatedAt).toLocaleString()}</Text>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
