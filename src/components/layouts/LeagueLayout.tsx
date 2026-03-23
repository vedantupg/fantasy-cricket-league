/**
 * League Layout Wrapper
 * Wraps league pages with swipe-back gesture and safe-area bottom padding.
 */

import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { transitionTo } from '../../utils/navigation';

interface LeagueLayoutProps {
  children: React.ReactNode;
}

const LeagueLayout: React.FC<LeagueLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    // Edge swipe: starts within 20px of left edge, horizontal > 60px, mostly horizontal
    if (touchStartX.current < 20 && dx > 60 && dy < 80) {
      transitionTo(navigate, -1 as any, true);
    }
  };

  return (
    <Box
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      sx={{ pb: 'env(safe-area-inset-bottom)' }}
    >
      {children}
    </Box>
  );
};

export default LeagueLayout;
