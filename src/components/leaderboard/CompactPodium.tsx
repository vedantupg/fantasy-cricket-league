import React from 'react';
import { Box, Avatar, Typography, Paper, Tooltip } from '@mui/material';
import {
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from '@mui/icons-material';
import type { StandingEntry, League } from '../../types/database';

interface CompactPodiumProps {
  topFive: StandingEntry[];
  league?: League;
}

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

const getLeadColor = (lead: number): string => {
  if (lead < 10) return '#F44336';   // red — danger
  if (lead <= 50) return '#FF9800';  // amber — unstable
  if (lead <= 99) return '#66BB6A';  // green — comfortable
  return '#1E88E5';                  // blue — dominant
};

const CompactPodium: React.FC<CompactPodiumProps> = ({ topFive, league }) => {
  if (topFive.length === 0) return null;

  // Display in sequential order: 1st, 2nd, 3rd, 4th, 5th
  const podiumOrder = [
    topFive[0], // 1st place
    topFive[1], // 2nd place
    topFive[2], // 3rd place
    topFive[3], // 4th place
    topFive[4], // 5th place
  ].filter(Boolean);

  // 🎨 COLOR CUSTOMIZATION ZONE - PODIUM RANK COLORS
  // Change these hex values to customize the color scheme for different ranks
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return '#FFD700'; // 🎨 1st Place - Gold (try: #F7B731, #FFC312, #FFDD59)
      case 2: return '#C0C0C0'; // 🎨 2nd Place - Silver (try: #A6ACAF, #BDC3C7, #95A5A6)
      case 3: return '#CD7F32'; // 🎨 3rd Place - Bronze (try: #E67E22, #D68910, #B87333)
      case 4: return '#1E88E5'; // 🎨 4th Place - Electric Blue (brand primary)
      case 5: return '#9C27B0'; // 🎨 5th Place - Purple
      default: return '#757575';
    }
  };

  const getRankChangeIcon = (standing: StandingEntry) => {
    // Priority 1: Check if rank changed (moved up or down)
    if (standing.rankChange !== undefined && standing.rankChange !== 0) {
      if (standing.rankChange > 0) {
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <ArrowUpIcon sx={{ fontSize: { xs: 12, sm: 14 }, color: 'success.main' }} />
            <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' }, fontWeight: 'bold', color: 'success.main', lineHeight: 1 }}>
              {Math.abs(standing.rankChange)}
            </Typography>
          </Box>
        );
      }
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <ArrowDownIcon sx={{ fontSize: { xs: 12, sm: 14 }, color: '#F44336' }} />
          <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' }, fontWeight: 'bold', color: '#F44336', lineHeight: 1 }}>
            {Math.abs(standing.rankChange)}
          </Typography>
        </Box>
      );
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
          <Typography sx={{ fontSize: { xs: '0.8rem', sm: '0.85rem' }, lineHeight: 1 }}>🔥</Typography>
          <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' }, fontWeight: 'bold', color: '#FF9800' }}>
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
  const renderTransferDots = (standing: StandingEntry) => {
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
          available: i >= flexUsed, // REVERSED: available (unused) = filled
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
          available: i >= benchUsed, // REVERSED: available (unused) = filled
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
            gap: 0.35,
            flexWrap: 'nowrap', // Keep horizontal
            justifyContent: 'center',
            alignItems: 'center',
            my: 0.2,
          }}
        >
          {dots.map((dot, index) => (
            <Box
              key={`${dot.type}-${index}`}
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: dot.available ? dot.color : 'transparent', // REVERSED
                border: `1.5px solid ${dot.color}`,
                opacity: dot.available ? 1 : 0.4, // REVERSED
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </Box>
      </Tooltip>
    );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch',
        gap: { xs: 1.5, sm: 2, md: 2.5 },
        mb: { xs: 2, sm: 3 },
        px: { xs: 1, sm: 2 },
        flexWrap: 'wrap',
      }}
    >
      {podiumOrder.map((standing) => {
        if (!standing) return null;

        const rank = standing.rank;
        const rankColor = getRankColor(rank);

        return (
          <Paper
            key={standing.userId}
            elevation={rank === 1 ? 0 : rank === 2 ? 6 : rank === 3 ? 4 : 2}
            sx={{
              // 🎨 CARD WIDTH - Fixed width to prevent username length issues
              width: { xs: 155, sm: 180, md: 205 }, // Increased width to prevent points truncation
              p: { xs: 1.5, sm: 1.75, md: 2 },
              // 🎨 BACKGROUND GRADIENT - Customize card backgrounds
              background: rank === 1
                ? `linear-gradient(135deg, ${rankColor}25 0%, ${rankColor}08 100%)` // 🎨 1st place gradient
                : rank === 2
                ? `linear-gradient(135deg, ${rankColor}20 0%, ${rankColor}05 100%)` // 🎨 2nd place gradient
                : rank === 3
                ? `linear-gradient(135deg, ${rankColor}18 0%, ${rankColor}05 100%)` // 🎨 3rd place gradient
                : 'rgba(255, 255, 255, 0.03)', // 🎨 4th & 5th place bg - same as leaderboard cards
              border: `2px solid ${rankColor}`,
              borderRadius: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: rank === 1 ? '0 8px 28px rgba(0,0,0,0.36), inset 0 0 12px 2px rgba(255,215,0,0.18)' : undefined,
              '&:hover': {
                transform: 'translateY(-6px)',
                boxShadow: rank === 1 ? '0 14px 36px rgba(0,0,0,0.45), inset 0 0 18px 3px rgba(255,215,0,0.25)' : 6,
              },
            }}
          >
            {/* Classy Rank Badge */}
            <Box
              sx={{
                position: 'absolute',
                top: -12,
                left: '50%',
                transform: 'translateX(-50%)',
                width: { xs: 36, sm: 42, md: 48 },
                height: { xs: 36, sm: 42, md: 48 },
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${rankColor} 0%, ${rankColor}CC 100%)`,
                border: `3px solid white`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 12px ${rankColor}38`,
                zIndex: 1,
              }}
            >
              <Typography
                sx={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontWeight: 400,
                  letterSpacing: '0.5px',
                  fontSize: { xs: '1rem', sm: '1.15rem', md: '1.3rem' },
                  color: 'white',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  lineHeight: 1,
                }}
              >
                #{rank}
              </Typography>
            </Box>

            {/* Avatar */}
            <Avatar
              src={standing.profilePicUrl || undefined}
              alt={standing.displayName}
              sx={{
                width: { xs: 56, sm: 72, md: 84 },
                height: { xs: 56, sm: 72, md: 84 },
                border: `3px solid ${rankColor}`,
                boxShadow: `0 4px 12px ${rankColor}2b`,
                mt: { xs: 2, sm: 2.5 },
                mb: 0.4,
                bgcolor: '#000',
              }}
            >
              <Typography sx={{ fontSize: { xs: '1rem', sm: '1.2rem', md: '1.4rem' }, fontWeight: 700, color: '#1E88E5', lineHeight: 1 }}>
                {getInitials(standing.displayName)}
              </Typography>
            </Avatar>

            {/* Name with gradient fade for long names */}
            <Box sx={{ position: 'relative', width: '100%', mb: 0.2, px: 0.5 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontWeight: 700,
                  textAlign: 'center',
                  fontSize: { xs: '0.85rem', sm: '0.95rem', md: '1.05rem' },
                  lineHeight: 1.3,
                  minHeight: { xs: '2.2em', sm: '2.4em' },
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

            {/* Transfer Dots */}
            {renderTransferDots(standing)}

            {/* Points Row: Rank Change | Total Points | +Gained */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: { xs: 0.4, sm: 0.6, md: 0.8 },
              width: '100%',
              px: { xs: 0.5, sm: 0.75, md: 1 },
              py: { xs: 0.3, sm: 0.4 },
              bgcolor: 'rgba(99,110,250,0.05)',
              borderRadius: 2,
              mb: 0.4,
              overflow: 'hidden'
            }}>
              {/* Rank change icon */}
              {getRankChangeIcon(standing) && (
                <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  {getRankChangeIcon(standing)}
                </Box>
              )}

              {/* Total points - center */}
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontWeight: 400,
                  color: rankColor,
                  fontSize: { xs: '1rem', sm: '1.15rem', md: '1.3rem' },
                  lineHeight: 1,
                  letterSpacing: '0.5px',
                  textAlign: 'center',
                  flex: '1 1 auto',
                  minWidth: 0,
                  overflow: 'visible',
                  whiteSpace: 'nowrap',
                }}
              >
                {standing.totalPoints.toFixed(2)}
              </Typography>

              {/* Points gained - right */}
              {standing.pointsGainedToday !== undefined && standing.pointsGainedToday !== 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontWeight: 400,
                    letterSpacing: '0.5px',
                    color: standing.pointsGainedToday > 0 ? 'success.main' : '#F44336',
                    fontSize: { xs: '0.8rem', sm: '0.85rem', md: '0.9rem' },
                    lineHeight: 1,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {standing.pointsGainedToday > 0 ? '+' : ''}{standing.pointsGainedToday.toFixed(2)}
                </Typography>
              )}
            </Box>

            {/* C/VC/PP/Lead Breakdown - 4 columns */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0.5, width: '100%', mt: 0.25 }}>
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
      })}
    </Box>
  );
};

export default CompactPodium;
