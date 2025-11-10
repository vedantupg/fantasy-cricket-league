import React from 'react';
import {
  Box,
  Typography,
  Button,
  useTheme,
  alpha,
  Tabs,
  Tab
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
        px: 3,
        py: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        position: 'sticky',
        top: 0,
        zIndex: 1100,
        bgcolor: alpha(theme.palette.background.default, 0.95)
      }}
    >
      {/* Left side - Logo and Navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Brand Logo */}
        <Typography
          variant="h5"
          sx={{
            fontWeight: 'bold',
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            cursor: 'pointer',
            letterSpacing: 1
          }}
          onClick={() => navigate('/')}
        >
          FCL
        </Typography>

        {/* Global Navigation Tabs - Only show for authenticated users */}
        {user && !hideNavigation && (
          <Tabs
            value={getCurrentTab()}
            onChange={(_, newValue) => {
              if (newValue === 0) navigate('/');
              if (newValue === 1) navigate('/dashboard');
            }}
            sx={{
              minHeight: 'auto',
              '& .MuiTabs-indicator': {
                backgroundColor: theme.palette.primary.main,
                height: 3,
                borderRadius: '3px 3px 0 0'
              },
              '& .MuiTab-root': {
                minHeight: 'auto',
                py: 1.5,
                px: 3,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                color: alpha(theme.palette.text.primary, 0.6),
                '&.Mui-selected': {
                  color: theme.palette.primary.main,
                },
                '&:hover': {
                  color: theme.palette.primary.main,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                }
              }
            }}
          >
            <Tab icon={<Home sx={{ fontSize: 20 }} />} label="Home" iconPosition="start" />
            <Tab icon={<Dashboard sx={{ fontSize: 20 }} />} label="My Leagues" iconPosition="start" />
          </Tabs>
        )}
      </Box>

      {/* Right side - User menu or auth buttons */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {user ? (
          <UserMenu />
        ) : (
          <>
            <Button
              variant="outlined"
              onClick={() => navigate('/login')}
              sx={{ borderRadius: 2, px: 3 }}
            >
              Login
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/register')}
              sx={{ borderRadius: 2, px: 3 }}
            >
              Sign Up
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
};

export default AppHeader;