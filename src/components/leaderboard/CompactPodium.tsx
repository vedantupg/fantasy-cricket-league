import React from 'react';
import { Box, Avatar, Typography, Paper, Chip } from '@mui/material';
import { EmojiEvents as TrophyIcon, TrendingUp } from '@mui/icons-material';
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

  const getPodiumHeight = (rank: number) => {
    switch (rank) {
      case 1: return { xs: 80, sm: 100 };
      case 2: return { xs: 60, sm: 75 };
      case 3: return { xs: 45, sm: 60 };
      default: return { xs: 40, sm: 50 };
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: { xs: 1, sm: 2 },
        mb: { xs: 3, sm: 4 },
        px: { xs: 1, sm: 2 },
      }}
    >
      {podiumOrder.map((standing) => {
        if (!standing) return null;

        const rank = standing.rank;
        const rankColor = getRankColor(rank);
        const height = getPodiumHeight(rank);

        return (
          <Box
            key={standing.userId}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              maxWidth: { xs: 110, sm: 140 },
            }}
          >
            {/* Trophy for 1st */}
            {rank === 1 && (
              <TrophyIcon
                sx={{
                  fontSize: { xs: 20, sm: 28 },
                  color: rankColor,
                  mb: 0.5,
                }}
              />
            )}

            {/* Avatar with rank badge */}
            <Box sx={{ position: 'relative', mb: 0.5 }}>
              <Avatar
                src={standing.profilePicUrl}
                alt={standing.displayName}
                sx={{
                  width: { xs: rank === 1 ? 56 : 48, sm: rank === 1 ? 70 : 60 },
                  height: { xs: rank === 1 ? 56 : 48, sm: rank === 1 ? 70 : 60 },
                  border: `3px solid ${rankColor}`,
                  boxShadow: rank === 1 ? `0 0 12px ${rankColor}40` : 2,
                }}
              />
              <Chip
                label={rank}
                size="small"
                sx={{
                  position: 'absolute',
                  bottom: -6,
                  right: -6,
                  backgroundColor: rankColor,
                  color: 'white',
                  fontWeight: 'bold',
                  minWidth: { xs: 22, sm: 26 },
                  height: { xs: 22, sm: 26 },
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  '& .MuiChip-label': { px: 0.5 },
                }}
              />
            </Box>

            {/* Name */}
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: rank === 1 ? 700 : 600,
                textAlign: 'center',
                fontSize: { xs: '0.7rem', sm: '0.85rem' },
                lineHeight: 1.2,
                mb: 0.5,
              }}
              noWrap
            >
              {standing.displayName}
            </Typography>

            {/* Points */}
            <Typography
              variant="h6"
              sx={{
                fontWeight: 'bold',
                color: rankColor,
                fontSize: { xs: '0.95rem', sm: '1.15rem' },
                lineHeight: 1,
              }}
            >
              {standing.totalPoints.toFixed(1)}
            </Typography>

            {/* Points gained */}
            {standing.pointsGainedToday > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mt: 0.3 }}>
                <TrendingUp sx={{ fontSize: { xs: 10, sm: 12 }, color: 'success.main' }} />
                <Typography variant="caption" sx={{ color: 'success.main', fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
                  +{standing.pointsGainedToday.toFixed(1)}
                </Typography>
              </Box>
            )}

            {/* C/VC/X Breakdown */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.5, mt: 0.5, width: '100%' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.55rem', sm: '0.6rem' } }}>
                  C
                </Typography>
                <Typography variant="body2" fontWeight="bold" color="primary.main" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, lineHeight: 1 }}>
                  {standing.captainPoints.toFixed(1)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.55rem', sm: '0.6rem' } }}>
                  VC
                </Typography>
                <Typography variant="body2" fontWeight="bold" color="secondary.main" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, lineHeight: 1 }}>
                  {standing.viceCaptainPoints.toFixed(1)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.55rem', sm: '0.6rem' } }}>
                  X
                </Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ color: '#9C27B0', fontSize: { xs: '0.65rem', sm: '0.75rem' }, lineHeight: 1 }}>
                  {standing.xFactorPoints.toFixed(1)}
                </Typography>
              </Box>
            </Box>

            {/* Podium base */}
            <Paper
              elevation={rank === 1 ? 4 : 2}
              sx={{
                width: '100%',
                height,
                mt: 1,
                background: `linear-gradient(135deg, ${rankColor}30 0%, ${rankColor}10 100%)`,
                border: `2px solid ${rankColor}60`,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: rankColor,
                },
              }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 'bold',
                  color: rankColor,
                  opacity: 0.25,
                  fontSize: { xs: '2rem', sm: '2.5rem' },
                }}
              >
                {rank}
              </Typography>
            </Paper>
          </Box>
        );
      })}
    </Box>
  );
};

export default CompactPodium;
