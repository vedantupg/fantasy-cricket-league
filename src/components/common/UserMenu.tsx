import React, { useState } from 'react';
import {
  Avatar,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import {
  KeyboardArrowDown,
  Dashboard,
  Settings,
  Logout
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const UserMenu: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, userData, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

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

  return (
    <>
      <Button
        variant="outlined"
        onClick={handleMenuOpen}
        endIcon={<KeyboardArrowDown />}
        sx={{ 
          borderRadius: 2,
          textTransform: 'none',
          color: 'text.primary',
          borderColor: alpha(theme.palette.primary.main, 0.3),
          '&:hover': {
            borderColor: theme.palette.primary.main,
            bgcolor: alpha(theme.palette.primary.main, 0.05)
          }
        }}
      >
        <Avatar 
          src={userData?.profilePicUrl} 
          sx={{ width: 24, height: 24, mr: 1 }}
        >
          {userData?.displayName?.charAt(0) || user.email?.charAt(0)}
        </Avatar>
        {userData?.displayName || user.email?.split('@')[0]}
      </Button>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            bgcolor: 'background.paper',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            borderRadius: 2,
            boxShadow: theme.shadows[8]
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleNavigation('/dashboard')}>
          <ListItemIcon><Dashboard /></ListItemIcon>
          My Leagues
        </MenuItem>
        <MenuItem onClick={() => handleNavigation('/profile')}>
          <ListItemIcon><Settings /></ListItemIcon>
          Edit Profile
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon><Logout /></ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </>
  );
};

export default UserMenu;