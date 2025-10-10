/**
 * Student Edit Layout - 2 Column Layout sử dụng AdminJS Design System
 * Custom component để hiển thị form edit/new student thành 2 cột
 */

import React from 'react';
import { 
  Box, 
  FormGroup, 
  Label, 
  Input, 
  Select,
  H3,
  Text,
  Button,
  Section
} from '@adminjs/design-system';

const StudentEditLayout = (props) => {
  const { 
    record, 
    resource, 
    action,
    onChange,
    onSubmit
  } = props;

  // Get current values from record
  const values = record?.params || {};

  // Handle input change
  const handleChange = (property, value) => {
    if (onChange) {
      onChange(property, value);
    }
  };

  // Handle form submit
  const handleSubmit = (event) => {
    event.preventDefault();
    if (onSubmit) {
      onSubmit(event);
    }
  };

  // Gender options
  const genderOptions = [
    { value: '', label: 'Chọn giới tính' },
    { value: 'male', label: 'Nam' },
    { value: 'female', label: 'Nữ' },
    { value: 'other', label: 'Khác' }
  ];

  // Status options  
  const statusOptions = [
    { value: 'active', label: '✅ Đang học' },
    { value: 'suspended', label: '⏸️ Tạm nghỉ' },
    { value: 'graduated', label: '🎓 Đã tốt nghiệp' },
    { value: 'dropped', label: '❌ Thôi học' }
  ];

  return (
    <Box variant="white" p="xxl">
      <H3 mb="xl">
        {action?.name === 'new' ? '➕ Thêm sinh viên mới' : '✏️ Chỉnh sửa thông tin sinh viên'}
      </H3>
      
      <form onSubmit={handleSubmit}>
        {/* Layout 2 cột sử dụng AdminJS Design System */}
        <Box display="flex" flexDirection="row" gap="xl">
          
          {/* Cột trái - Thông tin cơ bản */}
          <Box flex="1" mr="lg">
            <Section>
              <H3 mb="lg" fontSize="md" color="grey60">
                📋 Thông tin cơ bản
              </H3>
              
              <FormGroup>
                <Label required>Mã sinh viên</Label>
                <Input
                  value={values.studentCode || ''}
                  onChange={(e) => handleChange('studentCode', e.target.value)}
                  placeholder="Nhập mã sinh viên"
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label required>Họ và tên</Label>
                <Input
                  value={values.fullName || ''}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  placeholder="Nhập họ và tên đầy đủ"
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label required>Email</Label>
                <Input
                  type="email"
                  value={values.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="Nhập địa chỉ email"
                  required
                />
              </FormGroup>
            </Section>
          </Box>

          {/* Cột phải - Thông tin cá nhân */}
          <Box flex="1" ml="lg">
            <Section>
              <H3 mb="lg" fontSize="md" color="grey60">
                👤 Thông tin cá nhân
              </H3>
              
              <FormGroup>
                <Label>Giới tính</Label>
                <Select
                  value={genderOptions.find(opt => opt.value === values.gender)}
                  onChange={(selected) => handleChange('gender', selected ? selected.value : '')}
                  options={genderOptions}
                  isClearable
                />
              </FormGroup>

              <FormGroup>
                <Label>Ngày sinh</Label>
                <Input
                  type="date"
                  value={values.dateOfBirth || ''}
                  onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                />
              </FormGroup>

              <FormGroup>
                <Label>Số điện thoại</Label>
                <Input
                  type="tel"
                  value={values.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="Nhập số điện thoại"
                />
              </FormGroup>

              <FormGroup>
                <Label>Trạng thái</Label>
                <Select
                  value={statusOptions.find(opt => opt.value === values.status)}
                  onChange={(selected) => handleChange('status', selected ? selected.value : 'active')}
                  options={statusOptions}
                />
              </FormGroup>
            </Section>
          </Box>
        </Box>

        {/* Action buttons */}
        <Box mt="xxl" display="flex" justifyContent="flex-end" gap="default">
          <Button 
            type="button" 
            variant="light"
            onClick={() => window.history.back()}
          >
            Hủy bỏ
          </Button>
          <Button 
            type="submit" 
            variant="primary"
          >
            {action?.name === 'new' ? 'Thêm mới' : 'Cập nhật'}
          </Button>
        </Box>

        {/* Info footer */}
        <Box mt="xl" p="lg" bg="grey20" borderRadius="default">
          <Text fontSize="sm" color="grey60" textAlign="center">
            💡 <strong>Layout tối ưu:</strong> Form được chia thành 2 cột sử dụng AdminJS Design System 
            để tăng trải nghiệm người dùng và tận dụng không gian màn hình hiệu quả
          </Text>
        </Box>
      </form>
    </Box>
  );
};

export default StudentEditLayout;
