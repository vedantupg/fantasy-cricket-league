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
  Tab,
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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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
          px: { xs: 2, sm: 3 },
          py: { xs: 1, sm: 1.5 },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          gap: { xs: 1, sm: 0 }
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
          size="small"
          sx={{
            textTransform: 'none',
            color: 'text.secondary',
            fontWeight: 500,
            px: { xs: 1, sm: 2 },
            py: 0.75,
            minWidth: { xs: 'auto', sm: 'auto' },
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              color: theme.palette.primary.main,
            }
          }}
        >
          {isSmallMobile ? <ArrowBack /> : 'Back'}
        </Button>

        {/* Breadcrumb Navigation */}
        {!isSmallMobile && (
          <Breadcrumbs
            separator={<ChevronRight sx={{ fontSize: 18, color: 'text.disabled' }} />}
            sx={{
              '& .MuiBreadcrumbs-separator': {
                mx: 1
              },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
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
                fontSize: { xs: '0.85rem', sm: '0.95rem' },
                cursor: 'pointer',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: { xs: '120px', md: 'none' },
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
                fontSize: { xs: '0.85rem', sm: '0.95rem' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {currentPage}
            </Typography>
          </Breadcrumbs>
        )}
        {isSmallMobile && (
          <Typography
            sx={{
              color: 'text.primary',
              fontWeight: 600,
              fontSize: '0.9rem',
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
        px: { xs: 0, sm: 3 },
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
        overflowX: 'auto',
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        scrollbarWidth: 'none'
      }}>
        <Tabs
          value={getTabValue()}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons={isMobile ? 'auto' : false}
          allowScrollButtonsMobile
          sx={{
            minHeight: { xs: 56, sm: 48 },
            '& .MuiTab-root': {
              minHeight: { xs: 56, sm: 48 },
              textTransform: 'none',
              fontSize: { xs: '0.8rem', sm: '0.9rem' },
              fontWeight: 500,
              color: 'text.secondary',
              minWidth: { xs: 'auto', sm: 90 },
              px: { xs: 2, sm: 2 },
              '&.Mui-selected': {
                color: 'primary.main'
              }
            },
            '& .MuiTabs-scrollButtons': {
              '&.Mui-disabled': {
                opacity: 0.3
              }
            }
          }}
        >
          <Tab
            icon={<Dashboard sx={{ fontSize: { xs: 20, sm: 20 } }} />}
            iconPosition={isMobile ? 'top' : 'start'}
            label={currentPage === 'Squad Selection' ? 'Back' : 'Overview'}
          />
          <Tab
            icon={<People sx={{ fontSize: { xs: 20, sm: 20 } }} />}
            iconPosition={isMobile ? 'top' : 'start'}
            label={isMobile ? 'Squad' : 'Squad'}
          />
          <Tab
            icon={<EmojiEvents sx={{ fontSize: { xs: 20, sm: 20 } }} />}
            iconPosition={isMobile ? 'top' : 'start'}
            label={isMobile ? 'Leaderboard' : 'Leaderboard'}
          />
          <Tab
            icon={<Groups sx={{ fontSize: { xs: 20, sm: 20 } }} />}
            iconPosition={isMobile ? 'top' : 'start'}
            label={isMobile ? 'Teams' : 'Teams'}
          />
          <Tab
            icon={<MenuBook sx={{ fontSize: { xs: 20, sm: 20 } }} />}
            iconPosition={isMobile ? 'top' : 'start'}
            label={isMobile ? 'Rules' : 'Rules'}
          />
          <Tab
            icon={<BarChart sx={{ fontSize: { xs: 20, sm: 20 } }} />}
            iconPosition={isMobile ? 'top' : 'start'}
            label={isMobile ? 'Analytics' : 'Analytics'}
          />
        </Tabs>
      </Box>
    </Box>
  );
};

export default LeagueNav;
