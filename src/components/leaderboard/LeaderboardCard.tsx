import React from 'react';
import { Box, Avatar, Typography, Paper, Chip } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as NoChangeIcon,
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
        p: 2,
        mb: 2,
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Rank */}
        <Box
          sx={{
            minWidth: 60,
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
            }}
          >
            {standing.rank}
          </Typography>
          {getRankChangeIndicator()}
        </Box>

        {/* Avatar & Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <Avatar
            src={standing.profilePicUrl}
            alt={standing.displayName}
            sx={{
              width: 56,
              height: 56,
              border: `3px solid ${rankColor}`,
            }}
          />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              {standing.displayName}
              {isCurrentUser && (
                <Chip
                  label="You"
                  size="small"
                  color="primary"
                  sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {standing.squadName}
            </Typography>
          </Box>
        </Box>

        {/* Points Display */}
        <Box sx={{ textAlign: 'right', minWidth: 120 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 'bold',
              color: rankColor,
              lineHeight: 1,
            }}
          >
            {standing.totalPoints.toFixed(2)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Total Points
          </Typography>
        </Box>
      </Box>

      {/* Additional Stats Row */}
      <Box
        sx={{
          display: 'flex',
          gap: 3,
          mt: 2,
          pt: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          flexWrap: 'wrap',
        }}
      >
        {/* Captain Points */}
        <Box sx={{ flex: 1, minWidth: 100 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Captain
          </Typography>
          <Typography variant="body1" fontWeight="bold" color="primary.main">
            {standing.captainPoints.toFixed(2)}
          </Typography>
          {standing.captainName && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {standing.captainName}
            </Typography>
          )}
        </Box>

        {/* Vice-Captain Points */}
        <Box sx={{ flex: 1, minWidth: 100 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Vice-Captain
          </Typography>
          <Typography variant="body1" fontWeight="bold" color="secondary.main">
            {standing.viceCaptainPoints.toFixed(2)}
          </Typography>
          {standing.viceCaptainName && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {standing.viceCaptainName}
            </Typography>
          )}
        </Box>

        {/* Points Gained Today */}
        <Box sx={{ flex: 1, minWidth: 100 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Points Gained
          </Typography>
          <Typography
            variant="body1"
            fontWeight="bold"
            sx={{
              color: standing.pointsGainedToday > 0 ? 'success.main' : 'text.secondary',
            }}
          >
            {standing.pointsGainedToday > 0 ? '+' : ''}
            {standing.pointsGainedToday.toFixed(2)}
          </Typography>
        </Box>

        {/* Lead from Next */}
        {standing.leadFromNext !== undefined && (
          <Box sx={{ flex: 1, minWidth: 100 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Lead
            </Typography>
            <Typography
              variant="body1"
              fontWeight="bold"
              sx={{
                color: 'success.main',
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
