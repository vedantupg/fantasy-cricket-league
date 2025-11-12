import React from 'react';
import {
  Box,
  Typography,
  Button,
  useTheme,
  alpha,
  Breadcrumbs,
  Link,
  Tabs,
  Tab
} from '@mui/material';
import {
  ArrowBack,
  ChevronRight,
  Dashboard,
  People,
  EmojiEvents,
  Groups,
  MenuBook
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface LeagueNavProps {
  leagueName: string;
  leagueId: string;
  currentPage: string;
  backPath?: string;
  actions?: React.ReactNode;
}

/**
 * League Contextual Navigation Bar (Second Tier)
 * Shows league context, breadcrumb navigation, and page-specific actions
 */
const LeagueNav: React.FC<LeagueNavProps> = ({
  leagueName,
  leagueId,
  currentPage,
  backPath,
  actions
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(`/leagues/${leagueId}`);
    }
  };

  const getTabValue = () => {
    switch (currentPage) {
      case 'Overview':
      case 'Dashboard':
        return 0;
      case 'Squad':
      case 'Squad Selection':
        return 1;
      case 'Leaderboard':
        return 2;
      case 'Teams':
        return 3;
      case 'Rules':
        return 4;
      default:
        return false;
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate(`/leagues/${leagueId}`);
        break;
      case 1:
        navigate(`/leagues/${leagueId}/squad`);
        break;
      case 2:
        navigate(`/leagues/${leagueId}/leaderboard`);
        break;
      case 3:
        navigate(`/leagues/${leagueId}/teams`);
        break;
      case 4:
        navigate(`/leagues/${leagueId}/rules`);
        break;
    }
  };

  return (
    <Box
      sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.6),
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        position: 'sticky',
        top: 64, // Height of AppHeader
        zIndex: 1000,
        backdropFilter: 'blur(10px)'
      }}
    >
      {/* Top row - Back button and Breadcrumbs */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
      {/* Left side - Back button and Breadcrumb */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
        {/* Back Button */}
        <Button
          startIcon={<ArrowBack />}
          onClick={handleBack}
          size="small"
          sx={{
            textTransform: 'none',
            color: 'text.secondary',
            fontWeight: 500,
            px: 2,
            py: 0.75,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              color: theme.palette.primary.main,
            }
          }}
        >
          Back
        </Button>

        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          separator={<ChevronRight sx={{ fontSize: 18, color: 'text.disabled' }} />}
          sx={{
            '& .MuiBreadcrumbs-separator': {
              mx: 1
            }
          }}
        >
          {/* League Name */}
          <Link
            component="button"
            onClick={() => navigate(`/leagues/${leagueId}`)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: theme.palette.secondary.main,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline',
                color: theme.palette.secondary.light
              }
            }}
          >
            {leagueName}
          </Link>

          {/* Current Page */}
          <Typography
            sx={{
              color: 'text.primary',
              fontWeight: 500,
              fontSize: '0.95rem'
            }}
          >
            {currentPage}
          </Typography>
        </Breadcrumbs>
      </Box>

      {/* Right side - Quick Actions */}
      {actions && (
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          {actions}
        </Box>
      )}
      </Box>

      {/* Bottom row - Navigation Tabs */}
      <Box sx={{ px: 3, borderTop: `1px solid ${alpha(theme.palette.divider, 0.05)}` }}>
        <Tabs
          value={getTabValue()}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              minHeight: 48,
              textTransform: 'none',
              fontSize: '0.9rem',
              fontWeight: 500,
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.main'
              }
            }
          }}
        >
          <Tab icon={<Dashboard sx={{ fontSize: 20 }} />} iconPosition="start" label="Overview" />
          <Tab icon={<People sx={{ fontSize: 20 }} />} iconPosition="start" label="Squad" />
          <Tab icon={<EmojiEvents sx={{ fontSize: 20 }} />} iconPosition="start" label="Leaderboard" />
          <Tab icon={<Groups sx={{ fontSize: 20 }} />} iconPosition="start" label="Teams" />
          <Tab icon={<MenuBook sx={{ fontSize: 20 }} />} iconPosition="start" label="Rules" />
        </Tabs>
      </Box>
    </Box>
  );
};

export default LeagueNav;
