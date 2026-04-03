import React, { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Divider,
  alpha
} from '@mui/material';
import {
  KeyboardArrowDown,
  Dashboard,
  ManageAccounts,
  Logout
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import colors from '../../theme/colors';

const UserMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, userData, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      handleMenuClose();
      navigate('/');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    handleMenuClose();
  };

  if (!user) return null;

  const displayName = userData?.displayName || user.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      {/* Trigger button */}
      <Button
        onClick={handleMenuOpen}
        disableRipple
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.25,
          py: 0.625,
          borderRadius: 2,
          textTransform: 'none',
          background: open
            ? alpha(colors.blue.electric, 0.1)
            : 'transparent',
          border: `1px solid ${open ? colors.border.default : colors.border.subtle}`,
          transition: 'all 0.2s ease',
          '&:hover': {
            background: alpha(colors.blue.electric, 0.08),
            border: `1px solid ${colors.border.default}`,
          },
        }}
      >
        {/* Avatar with glow ring when open */}
        <Box
          sx={{
            p: '2px',
            borderRadius: '50%',
            background: open
              ? `linear-gradient(135deg, ${colors.blue.electric}, #00BCD4)`
              : 'transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <Avatar
            src={userData?.profilePicUrl}
            sx={{
              width: 28,
              height: 28,
              bgcolor: colors.background.elevated,
              fontSize: '0.75rem',
              fontWeight: 700,
              border: `1.5px solid ${colors.background.default}`,
            }}
          >
            {initial}
          </Avatar>
        </Box>

        <Typography
          sx={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: colors.text.primary,
            maxWidth: 120,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </Typography>

        <KeyboardArrowDown
          sx={{
            fontSize: '1rem',
            color: alpha(colors.text.primary, 0.45),
            transition: 'transform 0.2s ease',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      </Button>

      {/* Dropdown */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 220,
            background: colors.background.paper,
            border: `1px solid ${colors.border.default}`,
            borderRadius: 2.5,
            boxShadow: `${colors.shadows.blue.md}, 0 4px 24px rgba(0,0,0,0.5)`,
            overflow: 'hidden',
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* User identity header */}
        <Box
          sx={{
            px: 2,
            py: 1.75,
            background: `linear-gradient(135deg, ${alpha(colors.blue.electric, 0.08)}, transparent)`,
            borderBottom: `1px solid ${colors.border.subtle}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                p: '2px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${colors.blue.electric}, #00BCD4)`,
                flexShrink: 0,
              }}
            >
              <Avatar
                src={userData?.profilePicUrl}
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: colors.background.elevated,
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  border: `1.5px solid ${colors.background.paper}`,
                }}
              >
                {initial}
              </Avatar>
            </Box>
            <Box sx={{ overflow: 'hidden' }}>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: colors.text.primary,
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  color: alpha(colors.text.primary, 0.4),
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  mt: 0.25,
                }}
              >
                {user.email}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Nav items */}
        <Box sx={{ py: 0.75 }}>
          <MenuItem
            onClick={() => handleNavigation('/dashboard')}
            sx={{
              px: 2,
              py: 1.125,
              gap: 1.5,
              borderRadius: 1.5,
              mx: 0.75,
              transition: 'all 0.15s ease',
              '&:hover': {
                background: alpha(colors.blue.electric, 0.1),
                '& .menu-icon': { color: colors.blue.electric },
                '& .menu-label': { color: colors.text.primary },
              },
            }}
          >
            <Dashboard
              className="menu-icon"
              sx={{
                fontSize: '1.1rem',
                color: alpha(colors.text.primary, 0.45),
                transition: 'color 0.15s ease',
              }}
            />
            <Typography
              className="menu-label"
              sx={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: alpha(colors.text.primary, 0.8),
                transition: 'color 0.15s ease',
              }}
            >
              My Leagues
            </Typography>
          </MenuItem>

          <MenuItem
            onClick={() => handleNavigation('/profile')}
            sx={{
              px: 2,
              py: 1.125,
              gap: 1.5,
              borderRadius: 1.5,
              mx: 0.75,
              transition: 'all 0.15s ease',
              '&:hover': {
                background: alpha(colors.blue.electric, 0.1),
                '& .menu-icon': { color: colors.blue.electric },
                '& .menu-label': { color: colors.text.primary },
              },
            }}
          >
            <ManageAccounts
              className="menu-icon"
              sx={{
                fontSize: '1.1rem',
                color: alpha(colors.text.primary, 0.45),
                transition: 'color 0.15s ease',
              }}
            />
            <Typography
              className="menu-label"
              sx={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: alpha(colors.text.primary, 0.8),
                transition: 'color 0.15s ease',
              }}
            >
              Edit Profile
            </Typography>
          </MenuItem>
        </Box>

        {/* Divider */}
        <Box sx={{ mx: 2, borderTop: `1px solid ${colors.border.subtle}` }} />

        {/* Logout */}
        <Box sx={{ py: 0.75 }}>
          <MenuItem
            onClick={handleLogout}
            sx={{
              px: 2,
              py: 1.125,
              gap: 1.5,
              borderRadius: 1.5,
              mx: 0.75,
              transition: 'all 0.15s ease',
              '&:hover': {
                background: alpha(colors.error.primary, 0.08),
                '& .logout-icon': { color: colors.error.light },
                '& .logout-label': { color: colors.error.light },
              },
            }}
          >
            <Logout
              className="logout-icon"
              sx={{
                fontSize: '1.1rem',
                color: alpha(colors.text.primary, 0.35),
                transition: 'color 0.15s ease',
              }}
            />
            <Typography
              className="logout-label"
              sx={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: alpha(colors.text.primary, 0.55),
                transition: 'color 0.15s ease',
              }}
            >
              Sign out
            </Typography>
          </MenuItem>
        </Box>
      </Menu>
    </>
  );
};

export default UserMenu;
