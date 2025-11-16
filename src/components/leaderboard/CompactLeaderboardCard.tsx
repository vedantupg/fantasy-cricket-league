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
    if (rank <= 5) return '#4CAF50';
    if (rank <= 10) return '#2196F3';
    return '#757575';
  };

  const rankColor = getRankColor(standing.rank);

  const getRankChangeIcon = () => {
    if (!standing.rankChange || standing.rankChange === 0) {
      return <NoChangeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />;
    }
    if (standing.rankChange > 0) {
      return <ArrowUpIcon sx={{ fontSize: 14, color: 'success.main' }} />;
    }
    return <ArrowDownIcon sx={{ fontSize: 14, color: 'error.main' }} />;
  };

  return (
    <Paper
      elevation={isCurrentUser ? 6 : 2}
      sx={{
        p: { xs: 1.25, sm: 1.5 },
        background: isCurrentUser
          ? 'linear-gradient(135deg, rgba(63, 81, 181, 0.1) 0%, rgba(33, 150, 243, 0.05) 100%)'
          : 'background.paper',
        border: isCurrentUser ? '2px solid' : '1px solid',
        borderColor: isCurrentUser ? 'primary.main' : 'divider',
        borderLeft: `4px solid ${rankColor}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      {/* Header - Rank & Change */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 'bold',
            color: rankColor,
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
          }}
        >
          #{standing.rank}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {getRankChangeIcon()}
          {standing.rankChange !== undefined && standing.rankChange !== 0 && (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: (standing.rankChange || 0) > 0 ? 'success.main' : 'error.main',
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
              }}
            >
              {Math.abs(standing.rankChange || 0)}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Avatar & Name */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Avatar
          src={standing.profilePicUrl}
          alt={standing.displayName}
          sx={{
            width: { xs: 36, sm: 42 },
            height: { xs: 36, sm: 42 },
            border: `2px solid ${rankColor}`,
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
              lineHeight: 1.2,
            }}
            noWrap
          >
            {standing.displayName}
          </Typography>
          {standing.leadFromNext !== undefined && standing.leadFromNext > 0 && (
            <Typography
              variant="caption"
              sx={{
                fontSize: { xs: '0.65rem', sm: '0.7rem' },
                color: 'success.main',
                fontWeight: 600,
              }}
            >
              +{standing.leadFromNext.toFixed(1)} ahead
            </Typography>
          )}
        </Box>
        {isCurrentUser && (
          <Chip
            label="You"
            size="small"
            color="primary"
            sx={{ height: 20, fontSize: '0.65rem' }}
          />
        )}
      </Box>

      {/* Total Points */}
      <Box sx={{ textAlign: 'center', mb: 1, py: 0.5, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.65rem' }, display: 'block', mb: 0.25 }}>
          TOTAL POINTS
        </Typography>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 'bold',
            color: rankColor,
            fontSize: { xs: '1.25rem', sm: '1.4rem' },
            lineHeight: 1.1,
          }}
        >
          {standing.totalPoints.toFixed(2)}
        </Typography>
        {standing.pointsGainedToday > 0 && (
          <Typography variant="caption" sx={{ color: 'success.main', fontSize: { xs: '0.6rem', sm: '0.65rem' }, display: 'block', mt: 0.25 }}>
            +{standing.pointsGainedToday.toFixed(2)} today
          </Typography>
        )}
      </Box>

      {/* Points Breakdown */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.5, fontSize: { xs: '0.6rem', sm: '0.65rem' } }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 'inherit', mb: 0.25 }}>
            C
          </Typography>
          <Typography variant="body2" fontWeight="bold" color="primary.main" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
            {standing.captainPoints.toFixed(1)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 'inherit', mb: 0.25 }}>
            VC
          </Typography>
          <Typography variant="body2" fontWeight="bold" color="secondary.main" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
            {standing.viceCaptainPoints.toFixed(1)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 'inherit', mb: 0.25 }}>
            X
          </Typography>
          <Typography variant="body2" fontWeight="bold" sx={{ color: '#9C27B0', fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
            {standing.xFactorPoints.toFixed(1)}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default CompactLeaderboardCard;
