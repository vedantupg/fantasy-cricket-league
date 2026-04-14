import React from 'react';
import {
  Box,
  Typography,
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  ArrowBack,
  ChevronRight,
  Dashboard,
  People,
  EmojiEvents,
  Groups,
  MenuBook,
  BarChart,
  CalendarMonth,
  SportsScore
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
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
      case 'Schedule':
      case 'Match Schedule':
        return 5;
      case 'Analytics':
        return 6;
      case 'Scoring System':
        return 7;
      default:
        return false;
    }
  };

  const isActive = (index: number) => getTabValue() === index;

  const tabSx = (index: number) => ({
    px: { xs: 1.5, sm: 2 },
    py: { xs: 0.75, sm: 1 },
    fontSize: { xs: '0.65rem', sm: '0.75rem' },
    fontWeight: isActive(index) ? 600 : 400,
    whiteSpace: 'nowrap',
    borderRadius: 0,
    borderBottom: isActive(index) ? '2px solid #FF9800' : '2px solid transparent',
    color: isActive(index) ? '#FF9800' : 'rgba(255,255,255,0.75)',
    '& .MuiButton-startIcon': {
      color: isActive(index) ? '#FF9800' : 'rgba(255,255,255,0.75)',
    },
    '&:hover': {
      bgcolor: 'rgba(255,152,0,0.06)',
      color: isActive(index) ? '#FF9800' : 'rgba(255,255,255,0.9)',
      '& .MuiButton-startIcon': {
        color: isActive(index) ? '#FF9800' : 'rgba(255,255,255,0.9)',
      },
    },
    transition: 'color 0.15s, border-color 0.15s',
    minWidth: 'auto',
  });

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
      case 5:
        navigate(`/leagues/${leagueId}/schedule`);
        break;
      case 6:
        navigate(`/leagues/${leagueId}/analytics`);
        break;
      case 7:
        navigate(`/leagues/${leagueId}/scoring`);
        break;
    }
  };

  return (
    <Box
      sx={{
        bgcolor: '#060D17',
        borderBottom: `1px solid ${theme.palette.divider}`,
        position: 'sticky',
        top: { xs: 56, sm: 64, md: 72 }, // Match actual AppHeader rendered height
        zIndex: 1000,
        boxShadow: 1
      }}
    >
      {/* Top row - Back button and Breadcrumbs */}
      <Box
        sx={{
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 1.5, sm: 2 },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          gap: { xs: 1, sm: 2 },
        }}
      >
      {/* Left side - Back button and Breadcrumb */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1, sm: 2 },
        flex: 1,
        minWidth: 0,
        overflow: 'hidden'
      }}>
        {/* Back Button */}
        <Button
          startIcon={<ArrowBack />}
          onClick={handleBack}
          variant="outlined"
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: { xs: 0.75, sm: 1 },
            minWidth: 'auto',
            fontSize: { xs: '0.75rem', sm: '0.85rem' },
            fontWeight: 600,
          }}
        >
          {isSmallMobile ? null : 'Back'}
        </Button>

        {/* League Name and Current Page */}
        {!isSmallMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              onClick={() => navigate(`/leagues/${leagueId}`)}
              sx={{
                fontFamily: '"Montserrat", sans-serif',
                color: 'text.primary',
                fontWeight: 700,
                fontSize: { xs: '0.9rem', sm: '1.1rem', md: '1.2rem' },
                cursor: 'pointer',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: { xs: '150px', md: '300px' },
                '&:hover': {
                  color: 'primary.main',
                }
              }}
            >
              {leagueName}
            </Typography>
            <ChevronRight sx={{ fontSize: 20, color: 'text.secondary' }} />
            <Typography
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: { xs: '0.85rem', sm: '1rem' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {currentPage}
            </Typography>
          </Box>
        )}
        {isSmallMobile && (
          <Typography
            sx={{
              color: 'text.primary',
              fontWeight: 600,
              fontSize: '0.95rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1
            }}
          >
            {currentPage}
          </Typography>
        )}
      </Box>

      {/* Right side - Quick Actions */}
      {actions && (
        <Box sx={{
          display: 'flex',
          gap: { xs: 1, sm: 1.5 },
          alignItems: 'center',
          flexShrink: 0
        }}>
          {actions}
        </Box>
      )}
      </Box>

      {/* Bottom row - Navigation Tabs */}
      <Box sx={{
        px: { xs: 0, sm: 1, md: 3 },
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.default',
        overflowX: 'auto',
        '&::-webkit-scrollbar': {
          height: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: 'divider',
          borderRadius: '4px',
        },
      }}>
        <Box sx={{
          display: 'flex',
          gap: { xs: 0.5, sm: 1 },
          py: 0,
          px: { xs: 0, sm: 1 },
          minWidth: 'fit-content',
        }}>
          <Button variant='text' startIcon={<Dashboard />} onClick={() => handleTabChange({} as React.SyntheticEvent, 0)} sx={tabSx(0)}>
            {isSmallMobile ? '' : (currentPage === 'Squad Selection' ? 'Back' : 'Overview')}
          </Button>
          <Button variant='text' startIcon={<People />} onClick={() => handleTabChange({} as React.SyntheticEvent, 1)} sx={tabSx(1)}>
            {!isSmallMobile && 'Squad'}
          </Button>
          <Button variant='text' startIcon={<EmojiEvents />} onClick={() => handleTabChange({} as React.SyntheticEvent, 2)} sx={tabSx(2)}>
            {!isSmallMobile && 'Leaderboard'}
          </Button>
          <Button variant='text' startIcon={<Groups />} onClick={() => handleTabChange({} as React.SyntheticEvent, 3)} sx={tabSx(3)}>
            {!isSmallMobile && 'Teams'}
          </Button>
          <Button variant='text' startIcon={<MenuBook />} onClick={() => handleTabChange({} as React.SyntheticEvent, 4)} sx={tabSx(4)}>
            {!isSmallMobile && 'Rules'}
          </Button>
          <Button variant='text' startIcon={<CalendarMonth />} onClick={() => handleTabChange({} as React.SyntheticEvent, 5)} sx={tabSx(5)}>
            {!isSmallMobile && 'Schedule'}
          </Button>
          <Button variant='text' startIcon={<BarChart />} onClick={() => handleTabChange({} as React.SyntheticEvent, 6)} sx={tabSx(6)}>
            {!isSmallMobile && 'Analytics'}
          </Button>
          <Button variant='text' startIcon={<SportsScore />} onClick={() => handleTabChange({} as React.SyntheticEvent, 7)} sx={tabSx(7)}>
            {!isSmallMobile && 'Scoring System'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default LeagueNav;
