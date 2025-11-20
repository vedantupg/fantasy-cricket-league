import React from 'react';
import { Box, Avatar, Typography, Paper, Chip } from '@mui/material';
import {
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Remove as NoChangeIcon,
} from '@mui/icons-material';
import type { StandingEntry } from '../../types/database';

interface CompactLeaderboardCardProps {
  standing: StandingEntry;
  isCurrentUser?: boolean;
}

const CompactLeaderboardCard: React.FC<CompactLeaderboardCardProps> = ({ standing, isCurrentUser = false }) => {
  const getRankColor = (rank: number) => {
    if (rank <= 3) {
      const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
      return colors[rank - 1];
    }
    return 'text.primary'; // Use theme text color for all other ranks
  };

  const rankColor = getRankColor(standing.rank);
  const borderColor = standing.rank <= 3 ? rankColor : 'divider';

  const getRankChangeIcon = () => {
    if (!standing.rankChange || standing.rankChange === 0) {
      return <NoChangeIcon sx={{ fontSize: 12, color: 'text.secondary' }} />;
    }
    if (standing.rankChange > 0) {
      return <ArrowUpIcon sx={{ fontSize: 12, color: 'success.main' }} />;
    }
    return <ArrowDownIcon sx={{ fontSize: 12, color: 'error.main' }} />;
  };

  return (
    <Paper
      elevation={isCurrentUser ? 6 : 2}
      sx={{
        p: { xs: 0.75, sm: 1 },
        background: isCurrentUser
          ? 'linear-gradient(135deg, rgba(63, 81, 181, 0.1) 0%, rgba(33, 150, 243, 0.05) 100%)'
          : 'background.paper',
        border: isCurrentUser ? '2px solid' : '1px solid',
        borderColor: isCurrentUser ? 'primary.main' : 'divider',
        borderLeft: `4px solid`,
        borderLeftColor: borderColor,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 0.75, sm: 1 },
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        },
      }}
    >
      {/* Top Row: Rank, Avatar, Name, You chip */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1 } }}>
        {/* Rank */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: { xs: 28, sm: 32 } }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 'bold',
              color: rankColor,
              fontSize: { xs: '1rem', sm: '1.1rem' },
              lineHeight: 1,
            }}
          >
            #{standing.rank}
          </Typography>
        </Box>

        {/* Avatar */}
        <Avatar
          src={standing.profilePicUrl}
          alt={standing.displayName}
          sx={{
            width: { xs: 32, sm: 36 },
            height: { xs: 32, sm: 36 },
            border: `2px solid`,
            borderColor: borderColor,
          }}
        />

        {/* Name */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '0.75rem', sm: '0.85rem' },
              lineHeight: 1.2,
            }}
            noWrap
          >
            {standing.displayName}
          </Typography>
        </Box>

        {/* You chip */}
        {isCurrentUser && (
          <Chip
            label="You"
            size="small"
            color="primary"
            sx={{ height: 18, fontSize: '0.6rem' }}
          />
        )}
      </Box>

      {/* Total Points Row: Rank Change | Points | Points Gained */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: { xs: 0.75, sm: 1 }, py: 0.5, bgcolor: 'action.hover', borderRadius: 1.5 }}>
        {/* Rank change on left */}
        {standing.rankChange !== undefined && standing.rankChange !== 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
            {getRankChangeIcon()}
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: (standing.rankChange || 0) > 0 ? 'success.main' : 'error.main',
                fontSize: { xs: '0.6rem', sm: '0.65rem' },
              }}
            >
              {Math.abs(standing.rankChange || 0)}
            </Typography>
          </Box>
        )}

        {/* Total points in center */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.5rem', sm: '0.55rem' } }}>
            TOTAL
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 'bold',
              color: rankColor,
              fontSize: { xs: '1rem', sm: '1.1rem' },
              lineHeight: 1,
            }}
          >
            {standing.totalPoints.toFixed(1)}
          </Typography>
        </Box>

        {/* Points gained on right */}
        {standing.pointsGainedToday > 0 && (
          <Typography variant="caption" sx={{ color: 'success.main', fontSize: { xs: '0.6rem', sm: '0.65rem' } }}>
            (+{standing.pointsGainedToday.toFixed(1)})
          </Typography>
        )}
      </Box>

      {/* Points Breakdown - Compact */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.5 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.5rem', sm: '0.55rem' } }}>
            C
          </Typography>
          <Typography variant="body2" fontWeight="bold" color="primary.main" sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' }, lineHeight: 1 }}>
            {standing.captainPoints.toFixed(1)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.5rem', sm: '0.55rem' } }}>
            VC
          </Typography>
          <Typography variant="body2" fontWeight="bold" color="secondary.main" sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' }, lineHeight: 1 }}>
            {standing.viceCaptainPoints.toFixed(1)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.5rem', sm: '0.55rem' } }}>
            X
          </Typography>
          <Typography variant="body2" fontWeight="bold" sx={{ color: '#9C27B0', fontSize: { xs: '0.65rem', sm: '0.7rem' }, lineHeight: 1 }}>
            {standing.xFactorPoints.toFixed(1)}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default CompactLeaderboardCard;
