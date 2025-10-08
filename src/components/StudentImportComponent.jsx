import React, { useState, useEffect } from 'react';
import { useNotice } from 'adminjs';
import { Box, Button, Text, MessageBox, DropZone, Loader, Select } from '@adminjs/design-system';

const StudentImportComponent = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const addNotice = useNotice();

  // Lấy danh sách lớp khi component mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch('/admin-api/student-import/classes');
        const data = await response.json();
              
        if (data.success) {
          const classOptions = data.data.map(cls => ({
            value: cls.id.toString(),
            label: `${cls.classCode} - ${cls.className}`
          }));
          setClasses(classOptions);
        } else {
          addNotice({
            message: 'Không thể tải danh sách lớp',
            type: 'error'
          });
        }
      } catch (error) {
        console.error('Fetch classes error:', error); // Debug log
        addNotice({
          message: `Lỗi tải danh sách lớp: ${error.message}`,
          type: 'error'
        });
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
  }, []);
  const handleFileSelect = (files) => {
    if (files && files.length > 0) {
      const selectedFile = files[0];
      
      // Kiểm tra định dạng file
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!allowedTypes.includes(selectedFile.type)) {
        addNotice({
          message: 'Vui lòng chọn file Excel (.xlsx hoặc .xls)',
          type: 'error'
        });
        return;
      }
      
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    console.log('handleImport called with selectedClass:', selectedClass); // Debug log
    
    if (!selectedClass) {
      addNotice({
        message: 'Vui lòng chọn lớp học trước',
        type: 'error'
      });
      return;
    }

    if (!file) {
      addNotice({
        message: 'Vui lòng chọn file Excel để import',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('classId', selectedClass);

      console.log('Sending formData with classId:', selectedClass); // Debug log

      const response = await fetch('/admin-api/student-import/import-students', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        addNotice({
          message: data.message,
          type: data.details.errorCount > 0 ? 'info' : 'success'
        });
        setResult(data);
      } else {
        addNotice({
          message: data.message,
          type: 'error'
        });
      }
      
      setFile(null);
    } catch (error) {
      addNotice({
        message: `Lỗi import: ${error.message}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/admin-api/student-import/download-template');
      
      if (!response.ok) {
        throw new Error('Không thể tải template');
      }
      
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_sinh_vien.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      addNotice({
        message: 'Đã tải template thành công',
        type: 'success'
      });
    } catch (error) {
      addNotice({
        message: `Lỗi tải template: ${error.message}`,
        type: 'error'
      });
    }
  };

  return (
    <Box variant="white" p="xxl">
      <Text variant="h4" mb="xl">📚 Import danh sách sinh viên từ Excel</Text>
      
      {/* Hướng dẫn */}
      <MessageBox variant="info" mb="lg">
        <Text>
          <strong>📋 Hướng dẫn sử dụng:</strong><br/>
          1. 🏫 Chọn lớp học muốn import sinh viên<br/>
          2. 📥 Tải template Excel mẫu bằng nút bên dưới<br/>
          3. ✏️ Điền thông tin sinh viên vào template theo đúng định dạng<br/>
          4. 📤 Upload file đã điền và nhấn nút Import<br/>
          5. ✅ Kiểm tra kết quả import<br/>
          <br/>
          <strong>⚠️ Các cột bắt buộc:</strong> Mã sinh viên, Họ và tên<br/>
          <strong>📝 Lưu ý:</strong> Mã sinh viên không được trùng lặp. Lớp học sẽ được gán tự động theo lựa chọn.
        </Text>
      </MessageBox>

      {/* Chọn lớp học */}
      <Box mb="lg">
        <Text variant="h6" mb="default">🏫 Chọn lớp học:</Text>
        {loadingClasses ? (
          <Text>Đang tải danh sách lớp...</Text>
        ) : (
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="">-- Chọn lớp học --</option>
            {classes.map((cls) => (
              <option key={cls.value} value={cls.value}>
                {cls.label}
              </option>
            ))}
          </select>
        )}
        {selectedClass && (
          <Text mt="sm" color="primary100">
            ✅ Đã chọn lớp: {classes.find(c => c.value === selectedClass)?.label}
          </Text>
        )}
      </Box>

      {/* Nút tải template */}
      <Box mb="lg">
        <Button onClick={downloadTemplate} variant="outlined" size="lg">
          📥 Tải template Excel mẫu
        </Button>
      </Box>

      {/* Upload file */}
      <Box mb="lg">
        <Text variant="h6" mb="default">📄 Chọn file Excel:</Text>
        <DropZone
          onChange={handleFileSelect}
          multiple={false}
          validate={{
            mimeTypes: [
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.ms-excel'
            ]
          }}
        />
        {file && (
          <Text mt="sm" color="primary100">
            ✅ File đã chọn: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </Text>
        )}
      </Box>

      {/* Nút import */}
      <Box mb="lg">
        <Button 
          onClick={handleImport} 
          disabled={!file || !selectedClass || loading}
          variant="primary"
          size="lg"
        >
          {loading ? (
            <>
              <Loader /> Đang import...
            </>
          ) : (
            '📤 Import sinh viên'
          )}
        </Button>
        {(!file || !selectedClass) && (
          <Text mt="sm" color="grey60" fontSize="sm">
            {!selectedClass && !file && 'Vui lòng chọn lớp học và file Excel'}
            {!selectedClass && file && 'Vui lòng chọn lớp học'}
            {selectedClass && !file && 'Vui lòng chọn file Excel'}
          </Text>
        )}
      </Box>

      {/* Kết quả import */}
      {result && (
        <Box>
          <MessageBox 
            variant={result.details.errorCount > 0 ? 'info' : 'success'}
            mb="lg"
          >
            <Text>
              <strong>📊 Kết quả import:</strong><br/>
              ✅ Thành công: {result.details.successCount} sinh viên<br/>
              ❌ Lỗi: {result.details.errorCount} dòng<br/>
              📄 Tổng xử lý: {result.details.totalProcessed} dòng
            </Text>
          </MessageBox>

          {/* Hiển thị danh sách lỗi nếu có */}
          {result.details.errors && result.details.errors.length > 0 && (
            <Box>
              <Text variant="h6" mb="default" color="error">
                ❗ Chi tiết lỗi:
              </Text>
              <Box bg="grey20" p="default" borderRadius="default">
                {result.details.errors.map((error, index) => (
                  <Text key={index} color="error" fontSize="sm" mb="xs">
                    • {error}
                  </Text>
                ))}
                {result.details.errorCount > 10 && (
                  <Text color="grey60" fontSize="sm" fontStyle="italic">
                    ... và {result.details.errorCount - 10} lỗi khác
                  </Text>
                )}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default StudentImportComponent;
