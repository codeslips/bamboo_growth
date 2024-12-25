import React from 'react';
import { styled } from '@mui/material/styles';
import ShareIcon from '@mui/icons-material/Share';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useWebSocket } from '../../contexts/WebSocketContext';

const CustomFloatingButton = styled('button')(({ theme }) => ({
  width: theme.breakpoints.down('sm') ? '48px' : '56px',
  height: theme.breakpoints.down('sm') ? '48px' : '56px',
  borderRadius: '50%',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  boxShadow: '0 3px 5px -1px rgba(0,0,0,0.2), 0 6px 10px 0 rgba(0,0,0,0.14), 0 1px 18px 0 rgba(0,0,0,0.12)',
  background: `linear-gradient(145deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
  '&:hover': {
    background: `linear-gradient(145deg, ${theme.palette.success.dark}, ${theme.palette.success.main})`,
  },
  '&:focus': {
    outline: 'none',
  },
}));

const ShareButton = ({ hash, userInfo, totalScore }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const wsManager = useWebSocket();

  const handleShare = () => {
    try {
      if (wsManager.isConnectedAndReady()) {
        wsManager.send('share_lesson', {
          receiver: localStorage.getItem('appid'),
          hash: hash,
          lessonTitle: userInfo?.lessonTitle,
          userName: userInfo?.userName,
          totalScore: totalScore,
          timestamp: new Date().toISOString()
        });
        // You might want to show a success message to the user
        // alert('分享成功！');
      } else {
        console.error('WebSocket connection not ready');
        alert('分享失败，请稍后重试');
      }
    } catch (error) {
      console.error('Share handler error:', error);
      alert('分享失败，请稍后重试');
    }
  };

  return (
    <CustomFloatingButton
      onClick={handleShare}
      aria-label="share"
    >
      <ShareIcon fontSize={isMobile ? "small" : "medium"} />
    </CustomFloatingButton>
  );
};

export default ShareButton;
