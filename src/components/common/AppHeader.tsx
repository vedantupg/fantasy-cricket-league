import React from 'react';
import {
  Box,
  Button,
  useTheme,
  alpha,
  Tabs,
  Tab,
  useMediaQuery,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Home, Dashboard, NotificationsOutlined, NotificationsOff } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import UserMenu from './UserMenu';
import { transitionTo } from '../../utils/navigation';
import { requestNotificationPermission, disableNotifications } from '../../services/notifications';
import { vibrate } from '../../utils/haptics';

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
  const { user, userData, updateUserProfile } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const notificationsEnabled = userData?.notificationsEnabled ?? false;

  const handleBellToggle = async () => {
    if (!user) return;
    if (notificationsEnabled) {
      await disableNotifications(user.uid);
      await updateUserProfile({ notificationsEnabled: false, fcmToken: undefined });
    } else {
      vibrate([8, 40, 8]);
      await requestNotificationPermission(user.uid);
      await updateUserProfile({ notificationsEnabled: true });
    }
  };

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
        px: { xs: 2, sm: 3 },
        py: { xs: 1.5, sm: 2 },
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, sm: 4 }, flex: 1, minWidth: 0 }}>
        {/* Brand Logo */}
        <Box
          component="img"
          src="/logo192.png"
          alt="FCL"
          onClick={() => transitionTo(navigate, '/')}
          sx={{
            width: { xs: 32, sm: 36 },
            height: { xs: 32, sm: 36 },
            borderRadius: '50%',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'opacity 0.2s ease',
            '&:hover': { opacity: 0.85 }
          }}
        />

        {/* Global Navigation Tabs - Only show for authenticated users */}
        {user && !hideNavigation && (
          <Tabs
            value={getCurrentTab()}
            onChange={(_, newValue) => {
              if (newValue === 0) transitionTo(navigate, '/');
              if (newValue === 1) transitionTo(navigate, '/dashboard');
            }}
            sx={{
              minHeight: 'auto',
              '& .MuiTabs-indicator': {
                backgroundColor: '#FF9800',
                height: 3,
                borderRadius: '3px 3px 0 0'
              },
              '& .MuiTab-root': {
                minHeight: 'auto',
                py: { xs: 1, sm: 1.5 },
                px: { xs: 1.5, sm: 3 },
                minWidth: { xs: 'auto', sm: 90 },
                textTransform: 'none',
                fontWeight: 600,
                fontSize: { xs: '0.75rem', sm: '0.95rem' },
                color: alpha(theme.palette.text.primary, 0.6),
                '&.Mui-selected': {
                  color: '#FF9800',
                },
                '&:hover': {
                  color: '#FF9800',
                  backgroundColor: 'rgba(255,152,0,0.06)',
                }
              }
            }}
          >
            <Tab
              icon={<Home sx={{ fontSize: { xs: 18, sm: 20 } }} />}
              label={isSmallMobile ? undefined : 'Home'}
              iconPosition="start"
            />
            <Tab
              icon={<Dashboard sx={{ fontSize: { xs: 18, sm: 20 } }} />}
              label={isSmallMobile ? undefined : (isMobile ? 'Leagues' : 'My Leagues')}
              iconPosition="start"
            />
          </Tabs>
        )}
      </Box>

      {/* Right side - User menu or auth buttons */}
      <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, alignItems: 'center', flexShrink: 0 }}>
        {user ? (
          <>
            <Tooltip title={notificationsEnabled ? 'Notifications on' : 'Notifications off'}>
              <IconButton
                size="small"
                onClick={handleBellToggle}
                aria-label="Toggle notifications"
                sx={{
                  color: notificationsEnabled
                    ? theme.palette.primary.main
                    : alpha(theme.palette.text.primary, 0.35),
                  transition: 'color 0.2s ease',
                  '&:hover': { color: theme.palette.primary.main },
                }}
              >
                {notificationsEnabled ? (
                  <NotificationsOutlined sx={{ fontSize: { xs: 20, sm: 22 } }} />
                ) : (
                  <NotificationsOff sx={{ fontSize: { xs: 20, sm: 22 } }} />
                )}
              </IconButton>
            </Tooltip>
            <UserMenu />
          </>
        ) : (
          <>
            <Button
              variant="outlined"
              onClick={() => transitionTo(navigate, '/login')}
              sx={{
                borderRadius: 2,
                px: { xs: 2, sm: 3 },
                fontSize: { xs: '0.8rem', sm: '0.875rem' }
              }}
            >
              Login
            </Button>
            {!isSmallMobile && (
              <Button
                variant="contained"
                onClick={() => transitionTo(navigate, '/register')}
                sx={{
                  borderRadius: 2,
                  px: { xs: 2, sm: 3 },
                  fontSize: { xs: '0.8rem', sm: '0.875rem' }
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