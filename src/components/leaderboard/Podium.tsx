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
        gap: 2,
        mb: 4,
        py: 3,
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
              minWidth: 180,
            }}
          >
            {/* Trophy Icon for 1st place */}
            {rank === 1 && (
              <TrophyIcon
                sx={{
                  fontSize: 40,
                  color: rankColor,
                  mb: 1,
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
                mb: 1,
              }}
            >
              <Avatar
                src={standing.profilePicUrl}
                alt={standing.displayName}
                sx={{
                  width: rank === 1 ? 100 : 80,
                  height: rank === 1 ? 100 : 80,
                  border: `4px solid ${rankColor}`,
                  boxShadow: `0 0 20px ${borderColor}`,
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -10,
                  right: -10,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: rankColor,
                  border: '3px solid white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: rank === 1 ? 18 : 16,
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
                fontSize: rank === 1 ? '1.1rem' : '1rem',
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
              }}
            >
              {standing.totalPoints.toFixed(2)}
            </Typography>

            {/* Points Breakdown */}
            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                C: {standing.captainPoints.toFixed(2)} | VC: {standing.viceCaptainPoints.toFixed(2)}
              </Typography>
            </Box>

            {/* Lead from next */}
            {standing.leadFromNext !== undefined && standing.leadFromNext > 0 && (
              <Typography
                variant="caption"
                sx={{
                  color: 'success.main',
                  fontWeight: 600,
                  mb: 1,
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
                height: height,
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
                  fontSize: '4rem',
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
