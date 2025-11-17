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
  BarChart
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
      case 'Analytics':
        return 5;
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
      case 5:
        navigate(`/leagues/${leagueId}/analytics`);
        break;
    }
  };

  return (
    <Box
      sx={{
        bgcolor: '#00e5ff',
        borderBottom: '4px solid #000000',
        position: 'sticky',
        top: { xs: 72, sm: 82 }, // Height of AppHeader
        zIndex: 1000,
        boxShadow: '0px 4px 0px #000000'
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
          gap: { xs: 1, sm: 2 }
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
          startIcon={!isSmallMobile ? <ArrowBack /> : undefined}
          onClick={handleBack}
          variant="outlined"
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: { xs: 0.5, sm: 0.75 },
            minWidth: { xs: 'auto', sm: 'auto' },
            bgcolor: '#ffffff',
            color: '#000000',
            fontSize: { xs: '0.7rem', sm: '0.8rem' },
            '&:hover': {
              bgcolor: '#ffffff',
            }
          }}
        >
          {isSmallMobile ? <ArrowBack /> : 'BACK'}
        </Button>

        {/* League Name and Current Page */}
        {!isSmallMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              onClick={() => navigate(`/leagues/${leagueId}`)}
              sx={{
                color: '#000000',
                fontWeight: 800,
                fontSize: { xs: '0.9rem', sm: '1.1rem', md: '1.2rem' },
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: { xs: '150px', md: '300px' },
                '&:hover': {
                  textDecoration: 'underline',
                }
              }}
            >
              {leagueName}
            </Typography>
            <ChevronRight sx={{ fontSize: 20, color: '#000000' }} />
            <Typography
              sx={{
                color: '#000000',
                fontWeight: 700,
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
              color: '#000000',
              fontWeight: 800,
              fontSize: '0.95rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              textTransform: 'uppercase',
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
        borderTop: '3px solid #000000',
        bgcolor: '#ffffff',
        overflowX: 'auto',
        '&::-webkit-scrollbar': {
          height: '4px',
          bgcolor: '#f0f0f0',
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: '#000000',
        },
      }}>
        <Box sx={{
          display: 'flex',
          gap: { xs: 0.5, sm: 1 },
          p: { xs: 1, sm: 1.5 },
          minWidth: 'fit-content',
        }}>
          <Button
            variant={getTabValue() === 0 ? 'contained' : 'outlined'}
            startIcon={<Dashboard />}
            onClick={() => handleTabChange({} as React.SyntheticEvent, 0)}
            sx={{
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.75, sm: 1 },
              fontSize: { xs: '0.65rem', sm: '0.75rem' },
              bgcolor: getTabValue() === 0 ? '#ff005d' : '#ffffff',
              color: getTabValue() === 0 ? '#ffffff' : '#000000',
              whiteSpace: 'nowrap',
              '&:hover': {
                bgcolor: getTabValue() === 0 ? '#ff005d' : '#ffffff',
              }
            }}
          >
            {isSmallMobile ? '' : (currentPage === 'Squad Selection' ? 'BACK' : 'OVERVIEW')}
          </Button>
          <Button
            variant={getTabValue() === 1 ? 'contained' : 'outlined'}
            startIcon={<People />}
            onClick={() => handleTabChange({} as React.SyntheticEvent, 1)}
            sx={{
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.75, sm: 1 },
              fontSize: { xs: '0.65rem', sm: '0.75rem' },
              bgcolor: getTabValue() === 1 ? '#ff005d' : '#ffffff',
              color: getTabValue() === 1 ? '#ffffff' : '#000000',
              whiteSpace: 'nowrap',
              '&:hover': {
                bgcolor: getTabValue() === 1 ? '#ff005d' : '#ffffff',
              }
            }}
          >
            {!isSmallMobile && 'SQUAD'}
          </Button>
          <Button
            variant={getTabValue() === 2 ? 'contained' : 'outlined'}
            startIcon={<EmojiEvents />}
            onClick={() => handleTabChange({} as React.SyntheticEvent, 2)}
            sx={{
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.75, sm: 1 },
              fontSize: { xs: '0.65rem', sm: '0.75rem' },
              bgcolor: getTabValue() === 2 ? '#ff005d' : '#ffffff',
              color: getTabValue() === 2 ? '#ffffff' : '#000000',
              whiteSpace: 'nowrap',
              '&:hover': {
                bgcolor: getTabValue() === 2 ? '#ff005d' : '#ffffff',
              }
            }}
          >
            {!isSmallMobile && 'LEADERBOARD'}
          </Button>
          <Button
            variant={getTabValue() === 3 ? 'contained' : 'outlined'}
            startIcon={<Groups />}
            onClick={() => handleTabChange({} as React.SyntheticEvent, 3)}
            sx={{
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.75, sm: 1 },
              fontSize: { xs: '0.65rem', sm: '0.75rem' },
              bgcolor: getTabValue() === 3 ? '#ff005d' : '#ffffff',
              color: getTabValue() === 3 ? '#ffffff' : '#000000',
              whiteSpace: 'nowrap',
              '&:hover': {
                bgcolor: getTabValue() === 3 ? '#ff005d' : '#ffffff',
              }
            }}
          >
            {!isSmallMobile && 'TEAMS'}
          </Button>
          <Button
            variant={getTabValue() === 4 ? 'contained' : 'outlined'}
            startIcon={<MenuBook />}
            onClick={() => handleTabChange({} as React.SyntheticEvent, 4)}
            sx={{
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.75, sm: 1 },
              fontSize: { xs: '0.65rem', sm: '0.75rem' },
              bgcolor: getTabValue() === 4 ? '#ff005d' : '#ffffff',
              color: getTabValue() === 4 ? '#ffffff' : '#000000',
              whiteSpace: 'nowrap',
              '&:hover': {
                bgcolor: getTabValue() === 4 ? '#ff005d' : '#ffffff',
              }
            }}
          >
            {!isSmallMobile && 'RULES'}
          </Button>
          <Button
            variant={getTabValue() === 5 ? 'contained' : 'outlined'}
            startIcon={<BarChart />}
            onClick={() => handleTabChange({} as React.SyntheticEvent, 5)}
            sx={{
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.75, sm: 1 },
              fontSize: { xs: '0.65rem', sm: '0.75rem' },
              bgcolor: getTabValue() === 5 ? '#ff005d' : '#ffffff',
              color: getTabValue() === 5 ? '#ffffff' : '#000000',
              whiteSpace: 'nowrap',
              '&:hover': {
                bgcolor: getTabValue() === 5 ? '#ff005d' : '#ffffff',
              }
            }}
          >
            {!isSmallMobile && 'ANALYTICS'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default LeagueNav;
