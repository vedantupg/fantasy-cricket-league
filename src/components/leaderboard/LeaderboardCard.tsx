import React from 'react';
import { Box, Avatar, Typography, Paper, Chip } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as NoChangeIcon,
  Whatshot as FireIcon,
} from '@mui/icons-material';
import type { StandingEntry } from '../../types/database';

interface LeaderboardCardProps {
  standing: StandingEntry;
  isCurrentUser?: boolean;
}

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ standing, isCurrentUser = false }) => {
  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    if (rank <= 5) return '#4CAF50'; // Green for top 5
    return '#757575'; // Gray for others
  };

  const rankColor = getRankColor(standing.rank);

  const getRankChangeIndicator = () => {
    // Show fire icon if user has a streak of 2 or more (maintained rank for at least 2 consecutive snapshots)
    if (standing.rankStreak && standing.rankStreak >= 2) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', color: '#FF9800' }}>
          <FireIcon sx={{ fontSize: 16, mr: 0.5 }} />
          <Typography variant="caption" fontWeight="bold">
            {standing.rankStreak}
          </Typography>
        </Box>
      );
    }

    if (!standing.rankChange || standing.rankChange === 0) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
          <NoChangeIcon sx={{ fontSize: 16, mr: 0.5 }} />
          <Typography variant="caption">-</Typography>
        </Box>
      );
    }

    if (standing.rankChange > 0) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
          <TrendingUpIcon sx={{ fontSize: 16, mr: 0.5 }} />
          <Typography variant="caption" fontWeight="bold">
            +{standing.rankChange}
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
        <TrendingDownIcon sx={{ fontSize: 16, mr: 0.5 }} />
        <Typography variant="caption" fontWeight="bold">
          {standing.rankChange}
        </Typography>
      </Box>
    );
  };

  return (
    <Paper
      elevation={isCurrentUser ? 6 : 2}
      sx={{
        px: { xs: 1.5, sm: 2 },
        py: { xs: 1.5, sm: 2 },
        mb: { xs: 1.5, sm: 2 },
        background: isCurrentUser
          ? 'linear-gradient(135deg, rgba(63, 81, 181, 0.1) 0%, rgba(33, 150, 243, 0.05) 100%)'
          : 'background.paper',
        border: isCurrentUser ? '2px solid' : '1px solid',
        borderColor: isCurrentUser ? 'primary.main' : 'divider',
        borderLeft: `6px solid ${rankColor}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
        {/* Rank */}
        <Box
          sx={{
            minWidth: { xs: 45, sm: 60 },
            textAlign: 'center',
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 'bold',
              color: rankColor,
              lineHeight: 1,
              mb: 0.5,
              fontSize: { xs: '1.5rem', sm: '2.125rem' },
            }}
          >
            {standing.rank}
          </Typography>
          {getRankChangeIndicator()}
        </Box>

        {/* Avatar & Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flex: 1, minWidth: { xs: '150px', sm: 'auto' } }}>
          <Avatar
            src={standing.profilePicUrl}
            alt={standing.displayName}
            sx={{
              width: { xs: 40, sm: 56 },
              height: { xs: 40, sm: 56 },
              border: `3px solid ${rankColor}`,
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '0.9rem', sm: '1.25rem' } }} noWrap>
              {standing.displayName}
              {isCurrentUser && (
                <Chip
                  label="You"
                  size="small"
                  color="primary"
                  sx={{ ml: { xs: 0.5, sm: 1 }, height: { xs: 18, sm: 20 }, fontSize: { xs: '0.65rem', sm: '0.7rem' } }}
                />
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} noWrap>
              {standing.squadName}
            </Typography>
          </Box>
        </Box>

        {/* Points Display */}
        <Box sx={{ textAlign: 'right', minWidth: { xs: 80, sm: 120 } }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 'bold',
              color: rankColor,
              lineHeight: 1,
              fontSize: { xs: '1.5rem', sm: '2.125rem' },
            }}
          >
            {standing.totalPoints.toFixed(2)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
            Total Points
          </Typography>
        </Box>
      </Box>

      {/* Additional Stats Row */}
      <Box
        sx={{
          display: 'flex',
          gap: { xs: 1.5, sm: 2, md: 3 },
          mt: { xs: 1.5, sm: 2 },
          pt: { xs: 1.5, sm: 2 },
          borderTop: '1px solid',
          borderColor: 'divider',
          flexWrap: 'wrap',
        }}
      >
        {/* Captain Points */}
        <Box sx={{ flex: 1, minWidth: { xs: 80, sm: 100 } }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
            Captain
          </Typography>
          <Typography variant="body1" fontWeight="bold" color="primary.main" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            {standing.captainPoints.toFixed(2)}
          </Typography>
          {standing.captainName && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
              {standing.captainName}
            </Typography>
          )}
        </Box>

        {/* Vice-Captain Points */}
        <Box sx={{ flex: 1, minWidth: { xs: 80, sm: 100 } }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
            Vice-Captain
          </Typography>
          <Typography variant="body1" fontWeight="bold" color="secondary.main" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            {standing.viceCaptainPoints.toFixed(2)}
          </Typography>
          {standing.viceCaptainName && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
              {standing.viceCaptainName}
            </Typography>
          )}
        </Box>

        {/* X-Factor Points */}
        <Box sx={{ flex: 1, minWidth: { xs: 80, sm: 100 } }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
            X-Factor
          </Typography>
          <Typography variant="body1" fontWeight="bold" sx={{ color: '#9C27B0', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            {standing.xFactorPoints.toFixed(2)}
          </Typography>
          {standing.xFactorName && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
              {standing.xFactorName}
            </Typography>
          )}
        </Box>

        {/* Points Gained Today */}
        <Box sx={{ flex: 1, minWidth: { xs: 80, sm: 100 } }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
            Points Gained
          </Typography>
          <Typography
            variant="body1"
            fontWeight="bold"
            sx={{
              color: standing.pointsGainedToday > 0 ? 'success.main' : 'text.secondary',
              fontSize: { xs: '0.875rem', sm: '1rem' },
            }}
          >
            {standing.pointsGainedToday > 0 ? '+' : ''}
            {standing.pointsGainedToday.toFixed(2)}
          </Typography>
        </Box>

        {/* Lead from Next */}
        {standing.leadFromNext !== undefined && (
          <Box sx={{ flex: 1, minWidth: { xs: 80, sm: 100 }, display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
              Lead
            </Typography>
            <Typography
              variant="body1"
              fontWeight="bold"
              sx={{
                color: 'success.main',
                fontSize: { xs: '0.875rem', sm: '1rem' },
              }}
            >
              +{standing.leadFromNext.toFixed(2)}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default LeaderboardCard;
