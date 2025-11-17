import React from 'react';
import {
  Box,
  Typography,
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Home, Dashboard } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import UserMenu from './UserMenu';

interface AppHeaderProps {
  hideNavigation?: boolean;
}

/**
 * Global Navigation Bar (Top Tier)
 * Shows FCL branding, main navigation tabs, and user menu
 */
const AppHeader: React.FC<AppHeaderProps> = ({ hideNavigation = false }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Determine current tab based on current route
  const getCurrentTab = () => {
    const path = location.pathname;
    if (path === '/') return 0;
    if (path === '/dashboard' || path.startsWith('/leagues')) return 1;
    return false;
  };

  return (
    <Box
      component="nav"
      sx={{
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, sm: 2.5 },
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '4px solid #000000',
        position: 'sticky',
        top: 0,
        zIndex: 1100,
        bgcolor: '#ffffff',
        boxShadow: '0px 4px 0px #000000'
      }}
    >
      {/* Left side - Logo and Navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, sm: 3, md: 4 }, flex: 1, minWidth: 0 }}>
        {/* Brand Logo - Neo-Brutalist Style */}
        <Box
          onClick={() => navigate('/')}
          sx={{
            cursor: 'pointer',
            px: { xs: 2, sm: 3 },
            py: { xs: 1, sm: 1.5 },
            bgcolor: '#ff005d',
            border: '3px solid #000000',
            boxShadow: '4px 4px 0px #000000',
            transition: 'all 0.1s ease',
            '&:hover': {
              transform: 'translate(-2px, -2px)',
              boxShadow: '6px 6px 0px #000000',
            },
            '&:active': {
              transform: 'translate(0px, 0px)',
              boxShadow: '2px 2px 0px #000000',
            },
          }}
        >
          <Typography
            variant={isSmallMobile ? 'h6' : 'h5'}
            sx={{
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' }
            }}
          >
            FCL
          </Typography>
        </Box>

        {/* Global Navigation Tabs - Only show for authenticated users */}
        {user && !hideNavigation && (
          <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, alignItems: 'center' }}>
            <Button
              variant={getCurrentTab() === 0 ? 'contained' : 'outlined'}
              startIcon={<Home />}
              onClick={() => navigate('/')}
              sx={{
                px: { xs: 1.5, sm: 2 },
                py: { xs: 0.75, sm: 1 },
                fontSize: { xs: '0.7rem', sm: '0.8rem' },
                bgcolor: getCurrentTab() === 0 ? '#ff005d' : '#ffffff',
                color: getCurrentTab() === 0 ? '#ffffff' : '#000000',
                '&:hover': {
                  bgcolor: getCurrentTab() === 0 ? '#ff005d' : '#ffffff',
                }
              }}
            >
              {!isSmallMobile && 'HOME'}
            </Button>
            <Button
              variant={getCurrentTab() === 1 ? 'contained' : 'outlined'}
              startIcon={<Dashboard />}
              onClick={() => navigate('/dashboard')}
              sx={{
                px: { xs: 1.5, sm: 2 },
                py: { xs: 0.75, sm: 1 },
                fontSize: { xs: '0.7rem', sm: '0.8rem' },
                bgcolor: getCurrentTab() === 1 ? '#ff005d' : '#ffffff',
                color: getCurrentTab() === 1 ? '#ffffff' : '#000000',
                '&:hover': {
                  bgcolor: getCurrentTab() === 1 ? '#ff005d' : '#ffffff',
                }
              }}
            >
              {!isSmallMobile && 'LEAGUES'}
            </Button>
          </Box>
        )}
      </Box>

      {/* Right side - User menu or auth buttons */}
      <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, alignItems: 'center', flexShrink: 0 }}>
        {user ? (
          <UserMenu />
        ) : (
          <>
            <Button
              variant="outlined"
              onClick={() => navigate('/login')}
              sx={{
                px: { xs: 2, sm: 3 },
                py: { xs: 0.75, sm: 1 },
                fontSize: { xs: '0.7rem', sm: '0.8rem' }
              }}
            >
              Login
            </Button>
            {!isSmallMobile && (
              <Button
                variant="contained"
                onClick={() => navigate('/register')}
                sx={{
                  px: { xs: 2, sm: 3 },
                  py: { xs: 0.75, sm: 1 },
                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                  bgcolor: '#00e5ff',
                  color: '#000000',
                  '&:hover': {
                    bgcolor: '#00e5ff',
                  }
                }}
              >
                Sign Up
              </Button>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default AppHeader;