import React from 'react';
import { Box, Avatar, Typography, Paper } from '@mui/material';
import {
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Remove as NoChangeIcon,
} from '@mui/icons-material';
import type { StandingEntry } from '../../types/database';

interface CompactPodiumProps {
  topFive: StandingEntry[];
}

const CompactPodium: React.FC<CompactPodiumProps> = ({ topFive }) => {
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
      case 4: return '#3f51b5'; // 🎨 4th Place - Pink/Primary (MUI primary.main)
      case 5: return '#3f51b5'; // 🎨 5th Place - Pink/Primary (MUI primary.main)
      default: return '#757575';
    }
  };

  const getRankChangeIcon = (standing: StandingEntry) => {
    if (!standing.rankChange || standing.rankChange === 0) {
      return <NoChangeIcon sx={{ fontSize: { xs: 12, sm: 14 }, color: 'text.secondary' }} />;
    }
    if (standing.rankChange > 0) {
      return <ArrowUpIcon sx={{ fontSize: { xs: 12, sm: 14 }, color: 'success.main' }} />;
    }
    return <ArrowDownIcon sx={{ fontSize: { xs: 12, sm: 14 }, color: 'error.main' }} />;
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
            elevation={rank === 1 ? 8 : rank === 2 ? 6 : rank === 3 ? 4 : 2}
            sx={{
              // 🎨 CARD WIDTH - Fixed width to prevent username length issues
              width: { xs: 145, sm: 165, md: 185 }, // All cards same width
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
              '&:hover': {
                transform: 'translateY(-6px)',
                boxShadow: rank === 1 ? 10 : 6,
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
                boxShadow: `0 4px 12px ${rankColor}40`,
                zIndex: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: '0.9rem', sm: '1.05rem', md: '1.2rem' },
                  fontWeight: 900,
                  color: 'white',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                #{rank}
              </Typography>
            </Box>

            {/* Avatar */}
            <Avatar
              src={standing.profilePicUrl}
              alt={standing.displayName}
              sx={{
                width: { xs: 56, sm: 72, md: 84 },
                height: { xs: 56, sm: 72, md: 84 },
                border: `3px solid ${rankColor}`,
                boxShadow: `0 4px 12px ${rankColor}30`,
                mt: { xs: 2, sm: 2.5 },
                mb: 1,
              }}
            />

            {/* Name */}
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                textAlign: 'center',
                fontSize: { xs: '0.85rem', sm: '0.95rem', md: '1.05rem' },
                lineHeight: 1.3,
                mb: 0.4,
                px: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                minHeight: { xs: '2.2em', sm: '2.4em' }, // Fixed height for name
              }}
            >
              {standing.displayName}
            </Typography>

            {/* Points Row: Rank Change | Points | Points Gained */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: { xs: 0.75, sm: 1, md: 1.25 },
              width: '100%',
              py: { xs: 0.67, sm: 0.77 },
              // 🎨 POINTS BAR BACKGROUND (try: rgba(0,0,0,0.15), rgba(99,110,250,0.12))
              bgcolor: 'rgba(99,110,250,0.05)',
              borderRadius: 2,
              mb: 0.75
            }}>
              {/* Rank change on left */}
              {standing.rankChange !== undefined && standing.rankChange !== 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                  {getRankChangeIcon(standing)}
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      color: (standing.rankChange || 0) > 0 ? 'success.main' : 'error.main',
                      fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
                    }}
                  >
                    {Math.abs(standing.rankChange || 0)}
                  </Typography>
                </Box>
              )}

              {/* Total points in center */}
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 'bold',
                  color: rankColor,
                  fontSize: { xs: '1.05rem', sm: '1.2rem', md: '1.35rem' },
                  lineHeight: 1,
                  textAlign: 'center',
                }}
              >
                {standing.totalPoints.toFixed(2)}
              </Typography>

              {/* Points gained on right */}
              {standing.pointsGainedToday > 0 && (
                <Typography variant="caption" sx={{ color: 'success.main', fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem' } }}>
                  (+{standing.pointsGainedToday.toFixed(2)})
                </Typography>
              )}
            </Box>

            {/* C/VC/X Breakdown */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.5, width: '100%', mt: 'auto' }}>
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
                  X
                </Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ color: '#9C27B0', fontSize: { xs: '0.65rem', sm: '0.7rem' }, lineHeight: 1 }}>
                  {standing.xFactorPoints.toFixed(2)}
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
