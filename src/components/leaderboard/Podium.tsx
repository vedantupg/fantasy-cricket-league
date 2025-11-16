import React from 'react';
import { Box, Avatar, Typography, Paper } from '@mui/material';
import { EmojiEvents as TrophyIcon } from '@mui/icons-material';
import type { StandingEntry } from '../../types/database';

interface PodiumProps {
  topThree: StandingEntry[];
}

const Podium: React.FC<PodiumProps> = ({ topThree }) => {
  if (topThree.length === 0) {
    return null;
  }

  // Reorder for podium display: 2nd, 1st, 3rd
  const podiumOrder = [
    topThree[1], // 2nd place
    topThree[0], // 1st place
    topThree[2], // 3rd place
  ].filter(Boolean);

  const getPodiumHeight = (rank: number) => {
    switch (rank) {
      case 1: return 200;
      case 2: return 160;
      case 3: return 130;
      default: return 100;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver
      case 3: return '#CD7F32'; // Bronze
      default: return '#757575';
    }
  };

  const getRankBorderColor = (rank: number) => {
    switch (rank) {
      case 1: return 'rgba(255, 215, 0, 0.5)';
      case 2: return 'rgba(192, 192, 192, 0.5)';
      case 3: return 'rgba(205, 127, 50, 0.5)';
      default: return 'rgba(117, 117, 117, 0.3)';
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: { xs: 1, sm: 2 },
        mb: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, sm: 3 },
        px: { xs: 1, sm: 0 },
        overflowX: 'auto',
      }}
    >
      {podiumOrder.map((standing, index) => {
        if (!standing) return null;

        const rank = standing.rank;
        const height = getPodiumHeight(rank);
        const rankColor = getRankColor(rank);
        const borderColor = getRankBorderColor(rank);

        return (
          <Box
            key={standing.userId}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: { xs: 120, sm: 150, md: 180 },
            }}
          >
            {/* Trophy Icon for 1st place */}
            {rank === 1 && (
              <TrophyIcon
                sx={{
                  fontSize: { xs: 28, sm: 36, md: 40 },
                  color: rankColor,
                  mb: { xs: 0.5, sm: 1 },
                  animation: 'pulse 2s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': {
                      transform: 'scale(1)',
                      opacity: 1,
                    },
                    '50%': {
                      transform: 'scale(1.1)',
                      opacity: 0.9,
                    },
                  },
                }}
              />
            )}

            {/* Rank Badge */}
            <Box
              sx={{
                position: 'relative',
                mb: { xs: 0.5, sm: 1 },
              }}
            >
              <Avatar
                src={standing.profilePicUrl}
                alt={standing.displayName}
                sx={{
                  width: { xs: rank === 1 ? 70 : 60, sm: rank === 1 ? 85 : 70, md: rank === 1 ? 100 : 80 },
                  height: { xs: rank === 1 ? 70 : 60, sm: rank === 1 ? 85 : 70, md: rank === 1 ? 100 : 80 },
                  border: `4px solid ${rankColor}`,
                  boxShadow: `0 0 20px ${borderColor}`,
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: { xs: -6, sm: -8, md: -10 },
                  right: { xs: -6, sm: -8, md: -10 },
                  width: { xs: 28, sm: 32, md: 36 },
                  height: { xs: 28, sm: 32, md: 36 },
                  borderRadius: '50%',
                  backgroundColor: rankColor,
                  border: '3px solid white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: { xs: rank === 1 ? 14 : 13, sm: rank === 1 ? 16 : 15, md: rank === 1 ? 18 : 16 },
                  color: 'white',
                  boxShadow: 2,
                }}
              >
                {rank}
              </Box>
            </Box>

            {/* Player Name */}
            <Typography
              variant="h6"
              sx={{
                fontWeight: rank === 1 ? 'bold' : 600,
                textAlign: 'center',
                mb: 0.5,
                fontSize: { xs: rank === 1 ? '0.8rem' : '0.75rem', sm: rank === 1 ? '0.95rem' : '0.9rem', md: rank === 1 ? '1.1rem' : '1rem' },
              }}
            >
              {standing.displayName.toUpperCase()}
            </Typography>

            {/* Points */}
            <Typography
              variant="h5"
              sx={{
                fontWeight: 'bold',
                color: rankColor,
                mb: 0.5,
                fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
              }}
            >
              {standing.totalPoints.toFixed(2)}
            </Typography>

            {/* Points Breakdown */}
            <Box sx={{ textAlign: 'center', mb: { xs: 0.5, sm: 1 } }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                C: {standing.captainPoints.toFixed(2)} | VC: {standing.viceCaptainPoints.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                X: {standing.xFactorPoints.toFixed(2)}
              </Typography>
            </Box>

            {/* Lead from next */}
            {standing.leadFromNext !== undefined && standing.leadFromNext > 0 && (
              <Typography
                variant="caption"
                sx={{
                  color: 'success.main',
                  fontWeight: 600,
                  mb: { xs: 0.5, sm: 1 },
                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                }}
              >
                +{standing.leadFromNext.toFixed(2)}
              </Typography>
            )}

            {/* Podium Base */}
            <Paper
              elevation={3}
              sx={{
                width: '100%',
                height: { xs: height * 0.6, sm: height * 0.8, md: height },
                background: `linear-gradient(135deg, ${rankColor}33 0%, ${rankColor}11 100%)`,
                border: `2px solid ${borderColor}`,
                borderRadius: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: rankColor,
                },
              }}
            >
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 'bold',
                  color: rankColor,
                  opacity: 0.3,
                  fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
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

export default Podium;
