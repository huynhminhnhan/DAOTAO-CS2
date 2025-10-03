import React, { useState, useEffect } from 'react';
// import './AdminRetakeManagement.css'; // Tạm thời comment để test

/**
 * Admin Retake Management Component
 * Trang quản lý thi lại/học lại đơn giản cho Admin
 */
const AdminRetakeManagement = () => {
  const [retakeData, setRetakeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all'); // all, pending, completed

  // Load dữ liệu khi component mount
  useEffect(() => {
    loadRetakeData();
  }, []);

  const loadRetakeData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Gọi API để lấy danh sách thi lại
      const response = await fetch('/api/retake/list', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setRetakeData(data.data || []);
      } else {
        throw new Error('Không thể tải dữ liệu');
      }

    } catch (error) {
      console.error('Error loading retake data:', error);
      setError('Không thể tải dữ liệu thi lại');
      setRetakeData([]); // Set empty array để tránh lỗi
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (retakeId) => {
    try {
      const response = await fetch(`/api/retake/${retakeId}/approve`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        alert('Đã phê duyệt yêu cầu thi lại');
        loadRetakeData(); // Reload data
      } else {
        alert('Lỗi khi phê duyệt');
      }
    } catch (error) {
      console.error('Error approving retake:', error);
      alert('Lỗi khi phê duyệt');
    }
  };

  const handleReject = async (retakeId) => {
    try {
      const response = await fetch(`/api/retake/${retakeId}/reject`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        alert('Đã từ chối yêu cầu thi lại');
        loadRetakeData(); // Reload data
      } else {
        alert('Lỗi khi từ chối');
      }
    } catch (error) {
      console.error('Error rejecting retake:', error);
      alert('Lỗi khi từ chối');
    }
  };

  // Filter data based on selected filter
  const filteredData = retakeData.filter(item => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'pending') return item.status === 'PENDING';
    if (selectedFilter === 'completed') return item.status !== 'PENDING';
    return true;
  });

  return (
    <div style={{
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ color: '#333', marginBottom: '10px', fontSize: '28px' }}>🎓 Quản lý Thi lại & Học lại</h1>
        <p style={{ color: '#6c757d', fontSize: '16px', margin: 0 }}>Quản lý các yêu cầu thi lại và học lại của sinh viên</p>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          ❌ {error}
        </div>
      )}

      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <label style={{ fontWeight: '500', color: '#495057' }}>Lọc theo trạng thái:</label>
        <select 
          value={selectedFilter} 
          onChange={(e) => setSelectedFilter(e.target.value)}
          style={{
            padding: '6px 12px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            backgroundColor: 'white',
            color: '#495057',
            fontSize: '14px'
          }}
        >
          <option value="all">Tất cả</option>
          <option value="pending">Đang chờ</option>
          <option value="completed">Đã xử lý</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d', fontSize: '18px' }}>
          ⏳ Đang tải dữ liệu...
        </div>
      ) : (
        <div style={{
          overflowX: 'auto',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ color: '#495057', fontWeight: '600', padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>MSSV</th>
                <th style={{ color: '#495057', fontWeight: '600', padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Họ tên</th>
                <th style={{ color: '#495057', fontWeight: '600', padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Môn học</th>
                <th style={{ color: '#495057', fontWeight: '600', padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Lớp</th>
                <th style={{ color: '#495057', fontWeight: '600', padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Loại</th>
                <th style={{ color: '#495057', fontWeight: '600', padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Lý do</th>
                <th style={{ color: '#495057', fontWeight: '600', padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Trạng thái</th>
                <th style={{ color: '#495057', fontWeight: '600', padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Ngày tạo</th>
                <th style={{ color: '#495057', fontWeight: '600', padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px' }}>{item.studentCode || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>{item.studentName || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>{item.subjectName || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>{item.className || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        textTransform: 'uppercase',
                        backgroundColor: item.retakeType === 'RETAKE_EXAM' ? '#e3f2fd' : '#f3e5f5',
                        color: item.retakeType === 'RETAKE_EXAM' ? '#1976d2' : '#7b1fa2'
                      }}>
                        {item.retakeType === 'RETAKE_EXAM' ? 'Thi lại' : 'Học lại'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.reason || 'N/A'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: 
                          item.status === 'PENDING' ? '#fff3cd' :
                          item.status === 'APPROVED' ? '#d4edda' : '#f8d7da',
                        color:
                          item.status === 'PENDING' ? '#856404' :
                          item.status === 'APPROVED' ? '#155724' : '#721c24'
                      }}>
                        {item.status === 'PENDING' ? 'Đang chờ' : 
                         item.status === 'APPROVED' ? 'Đã duyệt' : 
                         item.status === 'REJECTED' ? 'Từ chối' : 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {item.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            style={{
                              padding: '6px 12px',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: '500',
                              backgroundColor: '#28a745',
                              color: 'white'
                            }}
                            onClick={() => handleApprove(item.id)}
                          >
                            ✅ Duyệt
                          </button>
                          <button 
                            style={{
                              padding: '6px 12px',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: '500',
                              backgroundColor: '#dc3545',
                              color: 'white'
                            }}
                            onClick={() => handleReject(item.id)}
                          >
                            ❌ Từ chối
                          </button>
                        </div>
                      )}
                      {item.status !== 'PENDING' && (
                        <span style={{ color: '#6c757d', fontStyle: 'italic', fontSize: '12px' }}>Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', color: '#6c757d', padding: '40px', fontStyle: 'italic' }}>
                    {selectedFilter === 'all' ? 
                      'Chưa có yêu cầu thi lại nào' : 
                      `Không có yêu cầu nào với trạng thái "${selectedFilter === 'pending' ? 'Đang chờ' : 'Đã xử lý'}"`
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <div style={{ textAlign: 'center', color: '#495057' }}>
          <strong style={{ display: 'block', marginBottom: '5px', fontSize: '16px' }}>Tổng số yêu cầu:</strong>
          {retakeData.length}
        </div>
        <div style={{ textAlign: 'center', color: '#495057' }}>
          <strong style={{ display: 'block', marginBottom: '5px', fontSize: '16px' }}>Đang chờ xử lý:</strong>
          {retakeData.filter(item => item.status === 'PENDING').length}
        </div>
        <div style={{ textAlign: 'center', color: '#495057' }}>
          <strong style={{ display: 'block', marginBottom: '5px', fontSize: '16px' }}>Đã xử lý:</strong>
          {retakeData.filter(item => item.status !== 'PENDING').length}
        </div>
      </div>
    </div>
  );
};

export default AdminRetakeManagement;
