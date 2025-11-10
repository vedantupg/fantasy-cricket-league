import React from 'react';
import { Box, Avatar, Typography, Paper } from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import type { LeaderboardSnapshot } from '../../types/database';

interface LeaderboardHighlightsProps {
  snapshot: LeaderboardSnapshot;
}

const LeaderboardHighlights: React.FC<LeaderboardHighlightsProps> = ({ snapshot }) => {
  const { bestPerformer, rapidRiser } = snapshot;

  if (!bestPerformer && !rapidRiser) {
    return null;
  }

  return (
    <Box sx={{ mt: 4, mb: 3 }}>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Best Performer */}
        {bestPerformer && (
          <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: 300 }}>
            <Paper
              elevation={4}
              sx={{
                p: 3,
                background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.15) 0%, rgba(33, 150, 243, 0.05) 100%)',
                border: '2px solid',
                borderColor: 'primary.main',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrophyIcon sx={{ fontSize: 32, color: 'primary.main', mr: 1 }} />
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 'bold',
                    color: 'primary.main',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Best Performer
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={bestPerformer.profilePicUrl}
                  alt={bestPerformer.displayName}
                  sx={{
                    width: 80,
                    height: 80,
                    border: '3px solid',
                    borderColor: 'primary.main',
                  }}
                />

                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight="bold">
                    {bestPerformer.displayName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {bestPerformer.squadName}
                  </Typography>

                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      mt: 1,
                      px: 2,
                      py: 0.5,
                      backgroundColor: 'primary.main',
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    >
                      +{bestPerformer.pointsGained.toFixed(2)} points
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {bestPerformer.matchNumber && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 2, textAlign: 'center' }}
                >
                  from Match #{bestPerformer.matchNumber}
                </Typography>
              )}

              <Typography
                variant="body2"
                sx={{
                  mt: 2,
                  pt: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  textAlign: 'center',
                  fontStyle: 'italic',
                  color: 'text.secondary',
                }}
              >
                {bestPerformer.displayName} scored {bestPerformer.pointsGained.toFixed(2)} points since the last snapshot!
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Rapid Riser */}
        {rapidRiser && (
          <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: 300 }}>
            <Paper
              elevation={4}
              sx={{
                p: 3,
                background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0.05) 100%)',
                border: '2px solid',
                borderColor: 'success.main',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon sx={{ fontSize: 32, color: 'success.main', mr: 1 }} />
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 'bold',
                    color: 'success.main',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Rapid Riser
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={rapidRiser.profilePicUrl}
                  alt={rapidRiser.displayName}
                  sx={{
                    width: 80,
                    height: 80,
                    border: '3px solid',
                    borderColor: 'success.main',
                  }}
                />

                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight="bold">
                    {rapidRiser.displayName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {rapidRiser.squadName}
                  </Typography>

                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      mt: 1,
                      px: 2,
                      py: 0.5,
                      backgroundColor: 'success.main',
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    >
                      +{rapidRiser.ranksGained} ranks
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Typography
                variant="body2"
                sx={{
                  mt: 2,
                  pt: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  textAlign: 'center',
                  fontStyle: 'italic',
                  color: 'text.secondary',
                }}
              >
                1 rank{rapidRiser.ranksGained > 1 ? 's' : ''} jumped by {rapidRiser.displayName}
              </Typography>
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default LeaderboardHighlights;
