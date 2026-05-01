import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
  alpha,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
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
  SportsScore,
  MoreHoriz,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import colors from '../../theme/colors';

interface LeagueNavProps {
  leagueName: string;
  leagueId: string;
  currentPage: string;
  backPath?: string;
  actions?: React.ReactNode;
}

/**
 * League Contextual Navigation Bar (Second Tier)
 *
 * Desktop (md+): sticky top bar with back/breadcrumb + 8-tab row
 * Mobile (<md):  sticky top strip with back/breadcrumb only,
 *                plus a fixed bottom bar (4 primary tabs + More)
 *                More opens a bottom sheet for secondary pages
 */
const LeagueNav: React.FC<LeagueNavProps> = ({
  leagueName,
  leagueId,
  currentPage,
  backPath,
  actions,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [moreOpen, setMoreOpen] = useState(false);

  const handleBack = () => {
    navigate(backPath ?? `/leagues/${leagueId}`);
  };

  const goTo = (path: string) => {
    navigate(path);
    setMoreOpen(false);
  };

  const primaryTabs = [
    { label: 'Overview', page: 'Overview', icon: <Dashboard />, path: `/leagues/${leagueId}` },
    { label: 'Squad', page: 'Squad', icon: <People />, path: `/leagues/${leagueId}/squad` },
    { label: 'Standings', page: 'Standings', icon: <EmojiEvents />, path: `/leagues/${leagueId}/leaderboard` },
    { label: 'Teams', page: 'Teams', icon: <Groups />, path: `/leagues/${leagueId}/teams` },
    { label: 'Analytics', page: 'Analytics', icon: <BarChart />, path: `/leagues/${leagueId}/analytics` },
  ];

  const secondaryTabs = [
    { label: 'Schedule', page: 'Schedule', icon: <CalendarMonth />, path: `/leagues/${leagueId}/schedule` },
    { label: 'Rules', page: 'Rules', icon: <MenuBook />, path: `/leagues/${leagueId}/rules` },
    { label: 'Scoring', page: 'Scoring System', icon: <SportsScore />, path: `/leagues/${leagueId}/scoring` },
  ];

  const allDesktopTabs = [...primaryTabs, ...secondaryTabs];

  const isActive = (page: string): boolean => {
    if (page === 'Overview' && (currentPage === 'Overview' || currentPage === 'Dashboard')) return true;
    if (page === 'Squad' && (currentPage === 'Squad' || currentPage === 'Squad Selection')) return true;
    if (page === 'Standings' && (currentPage === 'Standings' || currentPage === 'Leaderboard')) return true;
    if (page === 'Schedule' && (currentPage === 'Schedule' || currentPage === 'Match Schedule')) return true;
    return page === currentPage;
  };

  const activeColor = colors.blue.electric;

  const desktopTabSx = (page: string) => {
    const active = isActive(page);
    return {
      px: { sm: 1.5, md: 2 },
      py: 0,
      minHeight: 48,
      fontSize: { sm: '0.75rem', md: '0.8rem' },
      fontWeight: active ? 600 : 400,
      whiteSpace: 'nowrap',
      borderRadius: 0,
      borderBottom: active ? `2px solid ${activeColor}` : '2px solid transparent',
      color: active ? activeColor : 'rgba(255,255,255,0.75)',
      '& .MuiButton-startIcon': {
        color: active ? activeColor : 'rgba(255,255,255,0.75)',
      },
      '&:hover': {
        bgcolor: alpha(activeColor, 0.06),
        color: active ? activeColor : 'rgba(255,255,255,0.9)',
        '& .MuiButton-startIcon': {
          color: active ? activeColor : 'rgba(255,255,255,0.9)',
        },
      },
      transition: 'color 0.15s, border-color 0.15s',
      minWidth: 'auto',
    };
  };

  return (
    <>
      {/* Sticky top bar — always visible on all screen sizes */}
      <Box
        sx={{
          bgcolor: '#060D17',
          borderBottom: `1px solid ${theme.palette.divider}`,
          position: 'sticky',
          top: { xs: 56, sm: 64, md: 72 },
          zIndex: 1000,
          boxShadow: 1,
        }}
      >
        {/* Top row: back button + breadcrumb + optional actions */}
        <Box
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 1.5, sm: 2 },
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: { xs: 1, sm: 2 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={handleBack}
              variant="outlined"
              sx={{
                px: { xs: 1.5, sm: 2 },
                minHeight: 44,
                minWidth: 'auto',
                fontSize: { xs: '0.75rem', sm: '0.85rem' },
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {isMobile ? null : 'Back'}
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
              <Typography
                onClick={() => navigate(`/leagues/${leagueId}`)}
                sx={{
                  fontFamily: '"Montserrat", sans-serif',
                  color: 'text.primary',
                  fontWeight: 700,
                  fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.2rem' },
                  cursor: 'pointer',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: { xs: '180px', sm: '240px', md: '300px' },
                  '&:hover': { color: 'primary.main' },
                }}
              >
                {leagueName}
              </Typography>
              {!isMobile && (
                <>
                  <ChevronRight sx={{ fontSize: 20, color: 'text.secondary', flexShrink: 0 }} />
                  <Typography
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 500,
                      fontSize: { sm: '1rem' },
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {currentPage}
                  </Typography>
                </>
              )}
            </Box>
          </Box>

          {actions && (
            <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5 }, alignItems: 'center', flexShrink: 0 }}>
              {actions}
            </Box>
          )}
        </Box>

        {/* Desktop-only tab row */}
        {!isMobile && (
          <Box
            sx={{
              px: { sm: 1, md: 3 },
              borderTop: `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.default',
              overflowX: 'auto',
              '&::-webkit-scrollbar': { height: '4px' },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: '4px' },
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, py: 0, px: 1, minWidth: 'fit-content' }}>
              {allDesktopTabs.map((tab) => (
                <Button
                  key={tab.page}
                  variant="text"
                  startIcon={tab.icon}
                  onClick={() => goTo(tab.path)}
                  sx={desktopTabSx(tab.page)}
                >
                  {tab.label}
                </Button>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Mobile fixed bottom nav bar */}
      {isMobile && (
        <>
          <Box
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1200,
              bgcolor: '#060D17',
              borderTop: `1px solid ${theme.palette.divider}`,
              display: 'flex',
              height: `calc(64px + env(safe-area-inset-bottom))`,
              pb: 'env(safe-area-inset-bottom)',
            }}
          >
            {primaryTabs.map((tab) => {
              const active = isActive(tab.page);
              return (
                <Box
                  key={tab.page}
                  onClick={() => goTo(tab.path)}
                  sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    cursor: 'pointer',
                    minHeight: 44,
                    color: active ? activeColor : alpha('#fff', 0.45),
                    transition: 'color 0.15s',
                    userSelect: 'none',
                    '&:active': { opacity: 0.7 },
                  }}
                >
                  {React.cloneElement(tab.icon, { sx: { fontSize: 22 } })}
                  <Typography sx={{ fontSize: '0.6rem', fontWeight: active ? 700 : 400, letterSpacing: '0.02em' }}>
                    {tab.label}
                  </Typography>
                </Box>
              );
            })}

            {/* More tab */}
            {(() => {
              const moreActive = secondaryTabs.some((t) => isActive(t.page));
              return (
                <Box
                  onClick={() => setMoreOpen(true)}
                  sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    cursor: 'pointer',
                    minHeight: 44,
                    color: moreActive ? activeColor : alpha('#fff', 0.45),
                    transition: 'color 0.15s',
                    userSelect: 'none',
                    '&:active': { opacity: 0.7 },
                  }}
                >
                  <MoreHoriz sx={{ fontSize: 22 }} />
                  <Typography sx={{ fontSize: '0.6rem', fontWeight: moreActive ? 700 : 400, letterSpacing: '0.02em' }}>
                    More
                  </Typography>
                </Box>
              );
            })()}
          </Box>

          {/* More bottom sheet */}
          <Drawer
            anchor="bottom"
            open={moreOpen}
            onClose={() => setMoreOpen(false)}
            PaperProps={{
              sx: {
                bgcolor: '#060D17',
                borderRadius: '16px 16px 0 0',
                borderTop: `1px solid ${theme.palette.divider}`,
                pb: 'env(safe-area-inset-bottom)',
              },
            }}
          >
            <Box sx={{ px: 2, pt: 2, pb: 1 }}>
              <Typography
                sx={{
                  color: alpha('#fff', 0.4),
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontSize: '0.7rem',
                }}
              >
                More
              </Typography>
            </Box>
            <List disablePadding>
              {secondaryTabs.map((tab) => {
                const active = isActive(tab.page);
                return (
                  <ListItem
                    key={tab.page}
                    onClick={() => goTo(tab.path)}
                    sx={{
                      cursor: 'pointer',
                      py: 1.5,
                      px: 3,
                      color: active ? activeColor : 'text.primary',
                      '&:hover': { bgcolor: alpha(activeColor, 0.06) },
                      '&:active': { opacity: 0.7 },
                    }}
                  >
                    <ListItemIcon sx={{ color: active ? activeColor : alpha('#fff', 0.5), minWidth: 40 }}>
                      {React.cloneElement(tab.icon, { sx: { fontSize: 22 } })}
                    </ListItemIcon>
                    <ListItemText
                      primary={tab.label}
                      primaryTypographyProps={{ fontWeight: active ? 600 : 400, fontSize: '0.95rem' }}
                    />
                  </ListItem>
                );
              })}
            </List>
          </Drawer>
        </>
      )}
    </>
  );
};

export default LeagueNav;
