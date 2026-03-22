import React from 'react';
import { Box, Avatar, Typography, Paper, Chip, Tooltip } from '@mui/material';
import {
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from '@mui/icons-material';
import type { StandingEntry } from '../../types/database';
import type { League } from '../../types/database';

interface CompactLeaderboardCardProps {
  standing: StandingEntry;
  isCurrentUser?: boolean;
  league?: League; // Optional league data for transfer limits
}

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

const getLeadColor = (lead: number): string => {
  if (lead < 10) return '#F44336';   // red — danger
  if (lead <= 50) return '#FF9800';  // amber — unstable
  if (lead <= 99) return '#66BB6A';  // green — comfortable
  return '#1E88E5';                  // blue — dominant
};

const CompactLeaderboardCard: React.FC<CompactLeaderboardCardProps> = ({ standing, isCurrentUser = false, league }) => {
  // 🎨 COLOR CUSTOMIZATION ZONE - LEADERBOARD CARD COLORS
  const getRankColor = (rank: number) => {
    if (rank <= 3) {
      const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
      return colors[rank - 1];
    }
    // Special colors for 4th and 5th place
    if (rank === 4) return '#1E88E5'; // Electric Blue for 4th
    if (rank === 5) return '#9C27B0'; // Purple for 5th
    return 'text.primary'; // Use theme text color for all other ranks
  };

  const rankColor = getRankColor(standing.rank);

  // Border colors matching your design
  const getBorderColor = (rank: number) => {
    if (rank <= 3) return rankColor;
    if (rank === 4) return '#1E88E5'; // Electric Blue for 4th
    if (rank === 5) return '#9C27B0'; // Purple for 5th
    return 'rgba(255, 255, 255, 0.12)'; // Subtle border for others
  };

  const borderColor = getBorderColor(standing.rank);

  const getRankChangeIcon = () => {
    // Priority 1: Check if rank changed (moved up or down)
    if (standing.rankChange !== undefined && standing.rankChange !== 0) {
      if (standing.rankChange > 0) {
        return <ArrowUpIcon sx={{ fontSize: 12, color: 'success.main' }} />;
      }
      return <ArrowDownIcon sx={{ fontSize: 12, color: '#F44336' }} />;
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

  // Render transfer dots
  const renderTransferDots = () => {
    if (!league?.transferTypes) return null;

    const { flexibleTransfers, benchTransfers } = league.transferTypes;
    if (!flexibleTransfers?.enabled && !benchTransfers?.enabled) return null;

    const dots = [];

    // Add flexible transfer dots (purple)
    if (flexibleTransfers?.enabled) {
      const flexUsed = standing.flexibleTransfersUsed || 0;
      for (let i = 0; i < flexibleTransfers.maxAllowed; i++) {
        dots.push({
          type: 'flexible',
          available: i >= flexUsed, // available (remaining) = filled
          color: '#9333ea',
        });
      }
    }

    // Add bench transfer dots (cyan)
    if (benchTransfers?.enabled) {
      const benchUsed = standing.benchTransfersUsed || 0;
      for (let i = 0; i < benchTransfers.maxAllowed; i++) {
        dots.push({
          type: 'bench',
          available: i >= benchUsed, // available (remaining) = filled
          color: '#06b6d4',
        });
      }
    }

    if (dots.length === 0) return null;

    const flexUsed = standing.flexibleTransfersUsed || 0;
    const benchUsed = standing.benchTransfersUsed || 0;
    const flexRemaining = (flexibleTransfers?.maxAllowed || 0) - flexUsed;
    const benchRemaining = (benchTransfers?.maxAllowed || 0) - benchUsed;

    return (
      <Tooltip
        title={
          <Box sx={{ fontSize: '0.7rem', lineHeight: 1.4 }}>
            {flexibleTransfers?.enabled && (
              <Box>Flexible: {flexRemaining}/{flexibleTransfers.maxAllowed} left</Box>
            )}
            {benchTransfers?.enabled && (
              <Box>Bench: {benchRemaining}/{benchTransfers.maxAllowed} left</Box>
            )}
          </Box>
        }
        arrow
      >
        <Box
          sx={{
            display: 'flex',
            gap: 0.25,
            flexWrap: 'nowrap',
            alignItems: 'center',
            height: 8, // Constrain height to keep compact
          }}
        >
          {dots.map((dot, index) => (
            <Box
              key={`${dot.type}-${index}`}
              sx={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                bgcolor: dot.available ? dot.color : 'transparent', // REVERSED
                border: `0.8px solid ${dot.color}`,
                opacity: dot.available ? 1 : 0.4, // REVERSED
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </Box>
      </Tooltip>
    );
  };

  // Get subtle background gradient based on rank
  const getBackgroundGradient = () => {
    if (isCurrentUser) {
      return 'linear-gradient(135deg, rgba(63, 81, 181, 0.12) 0%, rgba(33, 150, 243, 0.06) 100%)';
    }

    // More visible gradients for top 5
    switch (standing.rank) {
      case 1:
        return 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0.04) 100%)'; // Gold
      case 2:
        return 'linear-gradient(135deg, rgba(192, 192, 192, 0.15) 0%, rgba(192, 192, 192, 0.04) 100%)'; // Silver
      case 3:
        return 'linear-gradient(135deg, rgba(205, 127, 50, 0.15) 0%, rgba(205, 127, 50, 0.04) 100%)'; // Bronze
      case 4:
        return 'linear-gradient(135deg, rgba(30, 136, 229, 0.15) 0%, rgba(30, 136, 229, 0.04) 100%)'; // Electric Blue
      case 5:
        return 'linear-gradient(135deg, rgba(156, 39, 176, 0.15) 0%, rgba(156, 39, 176, 0.04) 100%)'; // Purple
      default:
        // Subtle gradient for ranks 6+
        return 'linear-gradient(135deg, rgba(100, 100, 100, 0.08) 0%, rgba(80, 80, 80, 0.02) 100%)';
    }
  };

  const getHoverBackgroundGradient = () => {
    if (isCurrentUser) {
      return 'linear-gradient(135deg, rgba(63, 81, 181, 0.18) 0%, rgba(33, 150, 243, 0.10) 100%)';
    }

    // More visible on hover
    switch (standing.rank) {
      case 1:
        return 'linear-gradient(135deg, rgba(255, 215, 0, 0.20) 0%, rgba(255, 215, 0, 0.06) 100%)';
      case 2:
        return 'linear-gradient(135deg, rgba(192, 192, 192, 0.20) 0%, rgba(192, 192, 192, 0.06) 100%)';
      case 3:
        return 'linear-gradient(135deg, rgba(205, 127, 50, 0.20) 0%, rgba(205, 127, 50, 0.06) 100%)';
      case 4:
        return 'linear-gradient(135deg, rgba(30, 136, 229, 0.20) 0%, rgba(30, 136, 229, 0.06) 100%)'; // Electric Blue
      case 5:
        return 'linear-gradient(135deg, rgba(156, 39, 176, 0.20) 0%, rgba(156, 39, 176, 0.06) 100%)'; // Purple
      default:
        return 'linear-gradient(135deg, rgba(100, 100, 100, 0.12) 0%, rgba(80, 80, 80, 0.04) 100%)';
    }
  };

  return (
    <Paper
      elevation={isCurrentUser ? 6 : 2}
      sx={{
        p: { xs: 1, sm: 1.25 },
        // 🎨 CARD BACKGROUND - Subtle gradient based on rank
        background: getBackgroundGradient(),
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
          // 🎨 HOVER BACKGROUND - Slightly enhanced gradient
          background: getHoverBackgroundGradient(),
        },
      }}
    >
      {/* Top Row: Rank, Avatar, Name, Transfer Dots, You chip */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1 }, minWidth: 0 }}>
        {/* Rank */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: { xs: 28, sm: 32 }, flexShrink: 0 }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontWeight: 400,
              color: rankColor,
              fontSize: { xs: '1.1rem', sm: '1.2rem' },
              lineHeight: 1,
              letterSpacing: '0.5px',
            }}
          >
            #{standing.rank}
          </Typography>
        </Box>

        {/* Avatar */}
        <Avatar
          src={standing.profilePicUrl || undefined}
          alt={standing.displayName}
          sx={{
            width: { xs: 36, sm: 40 },
            height: { xs: 36, sm: 40 },
            border: `2.5px solid`,
            borderColor: borderColor,
            boxShadow: `0 2px 8px ${typeof borderColor === 'string' && borderColor.includes('rgba') ? borderColor : `${borderColor}30`}`,
            flexShrink: 0,
            bgcolor: '#000',
          }}
          slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
        >
          <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' }, fontWeight: 700, color: '#1E88E5', lineHeight: 1 }}>
            {getInitials(standing.displayName)}
          </Typography>
        </Avatar>

        {/* Name and Transfer Dots - Vertically stacked */}
        <Box sx={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.3 }}>
          <Box sx={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontFamily: "'Satoshi', sans-serif",
                fontWeight: 700,
                fontSize: { xs: '0.8rem', sm: '0.9rem' },
                lineHeight: 1.3,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'clip',
                maskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
              }}
            >
              {standing.displayName}
            </Typography>
          </Box>
          {/* Transfer Dots - Now below name */}
          {renderTransferDots()}
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

      {/* Total Points Row: Rank Change | Total Points | +Gained */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: { xs: 0.5, sm: 0.75 },
        py: { xs: 0.57, sm: 0.67 },
        bgcolor: 'rgba(99,110,250, 0.1)',
        borderRadius: 2,
        minWidth: 0,
        overflow: 'hidden'
      }}>
        {/* Rank change icon (left) */}
        {getRankChangeIcon() && (
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {getRankChangeIcon()}
          </Box>
        )}

        {/* Total points - center */}
        <Typography
          variant="h6"
          sx={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontWeight: 400,
            color: rankColor,
            fontSize: { xs: '1rem', sm: '1.1rem' },
            lineHeight: 1,
            letterSpacing: '0.5px',
            flex: '1 1 auto',
            textAlign: 'center',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {standing.totalPoints.toFixed(2)}
        </Typography>

        {/* Points gained this update - right */}
        {standing.pointsGainedToday !== undefined && standing.pointsGainedToday !== 0 && (
          <Typography
            variant="caption"
            sx={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontWeight: 400,
              letterSpacing: '0.5px',
              color: standing.pointsGainedToday > 0 ? 'success.main' : '#F44336',
              fontSize: { xs: '0.75rem', sm: '0.8rem' },
              lineHeight: 1,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {standing.pointsGainedToday > 0 ? '+' : ''}{standing.pointsGainedToday.toFixed(2)}
          </Typography>
        )}
      </Box>

      {/* Points Breakdown - 4 columns: C | VC | PP | Lead */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0.5, minWidth: 0, mt: -0.25 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.5rem', sm: '0.55rem' }, fontWeight: 600 }}>
            C
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: "'Bebas Neue', sans-serif", fontWeight: 400, letterSpacing: '0.5px', color: '#1E88E5', fontSize: { xs: '0.7rem', sm: '0.75rem' }, lineHeight: 1 }}>
            {standing.captainPoints.toFixed(2)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.5rem', sm: '0.55rem' }, fontWeight: 600 }}>
            VC
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: "'Bebas Neue', sans-serif", fontWeight: 400, letterSpacing: '0.5px', color: '#FF9800', fontSize: { xs: '0.7rem', sm: '0.75rem' }, lineHeight: 1 }}>
            {standing.viceCaptainPoints.toFixed(2)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.5rem', sm: '0.55rem' }, fontWeight: 600 }}>
            PP
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: "'Bebas Neue', sans-serif", fontWeight: 400, letterSpacing: '0.5px', color: '#9C27B0', fontSize: { xs: '0.7rem', sm: '0.75rem' }, lineHeight: 1 }}>
            {standing.powerplayCompleted ? (standing.powerplayPoints || 0).toFixed(2) : '--'}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.5rem', sm: '0.55rem' }, fontWeight: 600 }}>
            LEAD
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontWeight: 400,
              letterSpacing: '0.5px',
              color: standing.leadFromNext !== undefined && standing.leadFromNext !== 0
                ? getLeadColor(Math.abs(standing.leadFromNext))
                : 'text.secondary',
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
              lineHeight: 1,
            }}
          >
            {standing.leadFromNext !== undefined && standing.leadFromNext !== 0
              ? Math.abs(standing.leadFromNext).toFixed(1)
              : '--'}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default CompactLeaderboardCard;
