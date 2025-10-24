import React, { useState } from 'react';
import { Box, H1, Button, Label, Input, FormGroup, Text } from '@adminjs/design-system';

const CustomAdminLogin = (props) => {
  const { action, error, message } = props;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [logoError, setLogoError] = useState(false);

  return (
    <Box style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgb(106 234 102) 0%, rgb(65 119 29) 100%)' }}>
      <Box style={{ width: 480, background: 'white', padding: 32, borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
        <Box style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          {!logoError ? (
            <img 
              src="/assets/logo.jpeg" 
              alt="logo" 
              style={{ width: 56, height: 56, borderRadius: 6, objectFit: 'cover' }}
              onError={() => {
                console.error('Logo failed to load, trying /public/assets/logo.jpeg');
                setLogoError(true);
              }}
            />
          ) : (
            <img 
              src="/public/assets/logo.jpeg" 
              alt="logo" 
              style={{ width: 56, height: 56, borderRadius: 6, objectFit: 'cover' }}
              onError={(e) => {
                console.error('Logo failed to load from both paths');
                e.target.style.display = 'none';
              }}
            />
          )}
          <div>
            <H1 style={{ margin: 0,fontSize: '24px', fontWeight: 'bold' }}>TRƯỜNG CĐCSND II</H1>
            <Text color="grey60">Hệ thống Quản lý Điểm Sinh viên</Text>
          </div>
        </Box>

        {error && (
          <Box mb="lg">
            <Text style={{ color: '#b00020' }}>{error}</Text>
          </Box>
        )}
        {message && (
          <Box mb="lg">
            <Text style={{ color: '#0c5460' }}>{message}</Text>
          </Box>
        )}

        <form action={action} method="post" noValidate>
          <input type="hidden" name="_csrf" value={props.csrf || ''} />
          <FormGroup>
            <Label required>Địa chỉ email</Label>
            <Input 
              name="email" 
              type="email"
              value={email} 
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
            />
          </FormGroup>

          <FormGroup>
            <Label required>Mật khẩu</Label>
            <Input 
              name="password" 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </FormGroup>

          <FormGroup style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" name="remember" checked={remember} onChange={e => setRemember(e.target.checked)} />
              <Text>Ghi nhớ đăng nhập</Text>
            </label>
            <Button type="submit" variant="primary">Đăng nhập</Button>
          </FormGroup>
        </form>

        <Box mt="lg">
          <Text color="grey60" small>
            Liên hệ quản trị hệ thống nếu bạn không thể đăng nhập.
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default CustomAdminLogin;
