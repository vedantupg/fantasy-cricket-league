import React from 'react';
import { Box, Avatar, Typography, Paper, Chip } from '@mui/material';
import {
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from '@mui/icons-material';
import type { StandingEntry } from '../../types/database';

interface CompactLeaderboardCardProps {
  standing: StandingEntry;
  isCurrentUser?: boolean;
}

const CompactLeaderboardCard: React.FC<CompactLeaderboardCardProps> = ({ standing, isCurrentUser = false }) => {
  // 🎨 COLOR CUSTOMIZATION ZONE - LEADERBOARD CARD COLORS
  const getRankColor = (rank: number) => {
    if (rank <= 3) {
      const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
      return colors[rank - 1];
    }
    return 'text.primary'; // Use theme text color for all other ranks
  };

  const rankColor = getRankColor(standing.rank);
  const borderColor = standing.rank <= 3 ? rankColor : 'rgba(255, 255, 255, 0.12)'; // 🎨 Border for non-podium (try: rgba(99,110,250,0.3))

  const getRankChangeIcon = () => {
    // Priority 1: Check if rank changed (moved up or down)
    if (standing.rankChange !== undefined && standing.rankChange !== 0) {
      if (standing.rankChange > 0) {
        return <ArrowUpIcon sx={{ fontSize: 12, color: 'success.main' }} />;
      }
      return <ArrowDownIcon sx={{ fontSize: 12, color: 'error.main' }} />;
    }

    // Priority 2: Check if rank stayed the same (rankChange === 0) AND has a streak
    // IMPORTANT: Only show fire if:
    // 1. rankChange === 0 (rank didn't change)
    // 2. previousRank exists (not first time appearing)
    // 3. rankStreak >= 2 (maintained rank for at least 2 snapshots)
    if (
      standing.rankChange === 0 &&
      standing.previousRank !== undefined &&
      standing.rankStreak &&
      standing.rankStreak >= 2
    ) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <Typography sx={{ fontSize: '0.75rem', lineHeight: 1 }}>🔥</Typography>
          <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#FF9800' }}>
            {standing.rankStreak}
          </Typography>
        </Box>
      );
    }

    // No indicator if:
    // - rankChange is undefined (first snapshot, no previous data)
    // - rankChange is 0 but no previousRank (first time appearing)
    // - rankChange is 0 but rankStreak < 2 (not enough history)
    return null;
  };

  return (
    <Paper
      elevation={isCurrentUser ? 6 : 2}
      sx={{
        p: { xs: 1, sm: 1.25 },
        // 🎨 CARD BACKGROUND - Current user vs regular
        background: isCurrentUser
          ? 'linear-gradient(135deg, rgba(63, 81, 181, 0.12) 0%, rgba(33, 150, 243, 0.06) 100%)' // 🎨 Current user bg
          : 'rgba(255, 255, 255, 0.03)', // 🎨 Regular card bg (try: rgba(30,30,30,0.4), rgba(99,110,250,0.05))
        border: isCurrentUser ? '2px solid' : '1px solid',
        borderColor: isCurrentUser ? 'primary.main' : borderColor,
        borderLeft: `4px solid`,
        borderLeftColor: borderColor,
        borderRadius: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 0.75, sm: 1 },
        width: '100%', // Fixed width - all cards same width
        height: '100%', // Fixed height for consistent card sizes
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
          // 🎨 HOVER BACKGROUND (try different rgba values)
          background: isCurrentUser
            ? 'linear-gradient(135deg, rgba(63, 81, 181, 0.15) 0%, rgba(33, 150, 243, 0.08) 100%)'
            : 'rgba(255, 255, 255, 0.06)',
        },
      }}
    >
      {/* Top Row: Rank, Avatar, Name, You chip */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1 }, minWidth: 0 }}>
        {/* Rank */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: { xs: 28, sm: 32 }, flexShrink: 0 }}>
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
            width: { xs: 36, sm: 40 },
            height: { xs: 36, sm: 40 },
            border: `2.5px solid`,
            borderColor: borderColor,
            boxShadow: `0 2px 8px ${typeof borderColor === 'string' && borderColor.includes('rgba') ? borderColor : `${borderColor}30`}`,
            flexShrink: 0,
          }}
        />

        {/* Name - Fixed to prevent card stretching */}
        <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '0.8rem', sm: '0.9rem' },
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
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
            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}
          />
        )}
      </Box>

      {/* Total Points Row: Rank Change | Points | Lead/Gap from Next */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: { xs: 0.5, sm: 0.75 },
        py: { xs: 0.57, sm: 0.67 },
        // 🎨 POINTS BAR BACKGROUND (try: rgba(0,0,0,0.15), rgba(99,110,250,0.12))
        bgcolor: 'rgba(99,110,250, 0.1)',
        borderRadius: 2,
        minWidth: 0,
        overflow: 'hidden'
      }}>
        {/* Rank change/streak indicator on left - shown when available */}
        {getRankChangeIcon() && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, flexShrink: 0 }}>
            {getRankChangeIcon()}
            {standing.rankChange !== undefined && standing.rankChange !== 0 && (
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
            )}
          </Box>
        )}

        {/* Total points in center */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 'bold',
            color: rankColor,
            fontSize: { xs: '0.95rem', sm: '1.05rem' },
            lineHeight: 1,
            flexShrink: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {standing.totalPoints.toFixed(2)}
        </Typography>

        {/* Lead/Gap from next rank on right */}
        {standing.leadFromNext !== undefined && standing.leadFromNext !== 0 && (
          <Typography
            variant="caption"
            sx={{
              color: standing.leadFromNext > 0 ? 'success.main' : 'text.secondary',
              fontSize: { xs: '0.58rem', sm: '0.63rem' },
              fontWeight: 500,
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
          >
            ({standing.leadFromNext > 0 ? '↓' : '↑'}{Math.abs(standing.leadFromNext).toFixed(1)})
          </Typography>
        )}
      </Box>

      {/* Points Breakdown - Compact */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.5, minWidth: 0 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.5rem', sm: '0.55rem' } }}>
            C
          </Typography>
          <Typography variant="body2" fontWeight="bold" color="primary.main" sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' }, lineHeight: 1 }}>
            {standing.captainPoints.toFixed(2)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.5rem', sm: '0.55rem' } }}>
            VC
          </Typography>
          <Typography variant="body2" fontWeight="bold" color="secondary.main" sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' }, lineHeight: 1 }}>
            {standing.viceCaptainPoints.toFixed(2)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.5rem', sm: '0.55rem' } }}>
            PP
          </Typography>
          <Typography variant="body2" fontWeight="bold" sx={{ color: '#9C27B0', fontSize: { xs: '0.65rem', sm: '0.7rem' }, lineHeight: 1 }}>
            {standing.powerplayCompleted ? (standing.powerplayPoints || 0).toFixed(2) : '--'}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default CompactLeaderboardCard;
