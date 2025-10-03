/**
 * Simple Test Component for debugging
 */
import React from 'react';
import { Box, Header, Text } from '@adminjs/design-system';

const SimpleGradePage = () => {
  return (
    <Box padding="xl">
      <Header.H1>🎉 Component Loaded Successfully!</Header.H1>
      <Text>
        Đây là custom page đơn giản để test component loading.
        Nếu bạn thấy text này, component đã được load thành công!
      </Text>
    </Box>
  );
};

export default SimpleGradePage;
