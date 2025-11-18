import React from 'react';
import { Box, Avatar, Typography, Paper } from '@mui/material';
import {
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Remove as NoChangeIcon,
} from '@mui/icons-material';
import type { StandingEntry } from '../../types/database';

interface CompactPodiumProps {
  topThree: StandingEntry[];
}

const CompactPodium: React.FC<CompactPodiumProps> = ({ topThree }) => {
  if (topThree.length === 0) return null;

  // Reorder for podium display: 2nd, 1st, 3rd
  const podiumOrder = [
    topThree[1], // 2nd place
    topThree[0], // 1st place
    topThree[2], // 3rd place
  ].filter(Boolean);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver
      case 3: return '#CD7F32'; // Bronze
      default: return '#757575';
    }
  };

  const getMedal = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
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
        gap: { xs: 2, sm: 3, md: 4 },
        mb: { xs: 2, sm: 3 },
        px: { xs: 1, sm: 2 },
      }}
    >
      {podiumOrder.map((standing) => {
        if (!standing) return null;

        const rank = standing.rank;
        const rankColor = getRankColor(rank);
        const medal = getMedal(rank);

        return (
          <Paper
            key={standing.userId}
            elevation={rank === 1 ? 4 : 2}
            sx={{
              flex: 1,
              maxWidth: { xs: 140, sm: 190, md: 220 },
              p: { xs: 1.5, sm: 2, md: 2.5 },
              background: rank === 1
                ? `linear-gradient(135deg, ${rankColor}20 0%, ${rankColor}10 100%)`
                : 'background.paper',
              border: `2px solid ${rankColor}`,
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              },
            }}
          >
            {/* Medal */}
            <Typography
              sx={{
                fontSize: { xs: '2.2rem', sm: '2.8rem', md: '3.5rem' },
                lineHeight: 1,
                mb: 0.5,
              }}
            >
              {medal}
            </Typography>

            {/* Avatar */}
            <Avatar
              src={standing.profilePicUrl}
              alt={standing.displayName}
              sx={{
                width: { xs: 52, sm: 68, md: 80 },
                height: { xs: 52, sm: 68, md: 80 },
                border: `2px solid ${rankColor}`,
                mb: 0.5,
              }}
            />

            {/* Name */}
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                textAlign: 'center',
                fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
                lineHeight: 1.2,
                mb: 0.75,
              }}
              noWrap
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
              py: { xs: 0.5, sm: 0.75 },
              bgcolor: 'action.hover',
              borderRadius: 1.5,
              mb: 0.5
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
                }}
              >
                {standing.totalPoints.toFixed(1)}
              </Typography>

              {/* Points gained on right */}
              {standing.pointsGainedToday > 0 && (
                <Typography variant="caption" sx={{ color: 'success.main', fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem' } }}>
                  (+{standing.pointsGainedToday.toFixed(1)})
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
      })}
    </Box>
  );
};

export default CompactPodium;
