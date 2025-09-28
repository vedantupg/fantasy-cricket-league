import React from 'react';
import {
  Box,
  Typography,
  Button,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  Tabs,
  Tab
} from '@mui/material';
import { ArrowBack, Home, Dashboard } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import UserMenu from './UserMenu';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  backPath?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  hideNavigation?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  backPath,
  backLabel = 'Back',
  actions,
  hideNavigation = false
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Determine current tab based on current route
  const getCurrentTab = () => {
    const path = window.location.pathname;
    if (path === '/') return 0;
    if (path === '/dashboard' || path.startsWith('/leagues')) return 1;
    return false;
  };

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1); // Go back in history
    }
  };

  return (
    <Box 
      component="nav" 
      sx={{ 
        p: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        bgcolor: alpha(theme.palette.background.default, 0.8)
      }}
    >
      {/* Left side - Logo and Navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
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
            mr: 4
          }}
          onClick={() => navigate('/')}
        >
          FCL
        </Typography>

        {/* Navigation Tabs - Only show for authenticated users */}
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
                height: 2,
              },
              '& .MuiTab-root': {
                minHeight: 'auto',
                py: 1,
                px: 2,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.9rem',
                color: alpha(theme.palette.text.primary, 0.7),
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
            <Tab icon={<Home sx={{ fontSize: 18 }} />} label="Home" iconPosition="start" />
            <Tab icon={<Dashboard sx={{ fontSize: 18 }} />} label="My Leagues" iconPosition="start" />
          </Tabs>
        )}
        
        {/* Back button for sub-pages */}
        {showBack && (
          <Button
            startIcon={<ArrowBack />}
            onClick={handleBack}
            sx={{ 
              ml: 2,
              textTransform: 'none',
              color: 'text.primary',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
              }
            }}
          >
            {backLabel}
          </Button>
        )}
        
        {/* Page Title and subtitle */}
        {title && (
          <Box sx={{ ml: showBack ? 2 : 4 }}>
            <Typography variant="h6" fontWeight="bold">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Middle - Actions */}
      {actions && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mr: 3 }}>
          {actions}
        </Box>
      )}

      {/* Right side - User menu or auth buttons */}
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
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