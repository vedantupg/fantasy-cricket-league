import React from 'react';
import {
  Box,
  Typography,
  Button,
  useTheme,
  alpha,
  Breadcrumbs,
  Link
} from '@mui/material';
import { ArrowBack, ChevronRight } from '@mui/icons-material';
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

  return (
    <Box
      sx={{
        px: 3,
        py: 1.5,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        bgcolor: alpha(theme.palette.background.paper, 0.6),
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        position: 'sticky',
        top: 64, // Height of AppHeader
        zIndex: 1000,
        backdropFilter: 'blur(10px)'
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
  );
};

export default LeagueNav;
