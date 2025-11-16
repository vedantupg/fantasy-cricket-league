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
  const { bestPerformer: snapshotBestPerformer, rapidRiser: snapshotRapidRiser, standings } = snapshot;

  // Calculate fallback highlights if not provided (e.g., first snapshot)
  let bestPerformer = snapshotBestPerformer;
  let rapidRiser = snapshotRapidRiser;

  // If no bestPerformer, use the player with highest points gained today, or top scorer
  if (!bestPerformer && standings.length > 0) {
    const topGainer = standings
      .filter(s => s.pointsGainedToday > 0)
      .sort((a, b) => b.pointsGainedToday - a.pointsGainedToday)[0];

    if (topGainer) {
      bestPerformer = {
        userId: topGainer.userId,
        displayName: topGainer.displayName,
        squadName: topGainer.squadName,
        profilePicUrl: topGainer.profilePicUrl,
        pointsGained: topGainer.pointsGainedToday,
      };
    } else {
      // Fallback to top scorer
      const topScorer = standings[0];
      bestPerformer = {
        userId: topScorer.userId,
        displayName: topScorer.displayName,
        squadName: topScorer.squadName,
        profilePicUrl: topScorer.profilePicUrl,
        pointsGained: topScorer.totalPoints,
      };
    }
  }

  // If no rapidRiser, use the player with highest rank improvement
  if (!rapidRiser && standings.length > 0) {
    const topClimber = standings
      .filter(s => s.rankChange && s.rankChange > 0)
      .sort((a, b) => (b.rankChange || 0) - (a.rankChange || 0))[0];

    if (topClimber && topClimber.rankChange) {
      rapidRiser = {
        userId: topClimber.userId,
        displayName: topClimber.displayName,
        squadName: topClimber.squadName,
        profilePicUrl: topClimber.profilePicUrl,
        ranksGained: topClimber.rankChange,
        currentRank: topClimber.rank,
        previousRank: topClimber.previousRank !== undefined
          ? topClimber.previousRank
          : topClimber.rank + topClimber.rankChange,
      };
    }
  }

  if (!bestPerformer && !rapidRiser) {
    return null;
  }

  return (
    <Box sx={{ mt: { xs: 2, sm: 3, md: 4 }, mb: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
        {/* Best Performer */}
        {bestPerformer && (
          <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: { xs: '100%', sm: 280, md: 300 } }}>
            <Paper
              elevation={4}
              sx={{
                px: { xs: 2, sm: 3 },
                py: { xs: 2, sm: 3 },
                background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.15) 0%, rgba(33, 150, 243, 0.05) 100%)',
                border: '2px solid',
                borderColor: 'primary.main',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 }, gap: { xs: 0.5, sm: 1 } }}>
                <TrophyIcon sx={{ fontSize: { xs: 24, sm: 32 }, color: 'primary.main' }} />
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 'bold',
                    color: 'primary.main',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    fontSize: { xs: '0.9rem', sm: '1.25rem' },
                  }}
                >
                  Best Performer
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
                <Avatar
                  src={bestPerformer.profilePicUrl}
                  alt={bestPerformer.displayName}
                  sx={{
                    width: { xs: 60, sm: 80 },
                    height: { xs: 60, sm: 80 },
                    border: '3px solid',
                    borderColor: 'primary.main',
                  }}
                />

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }} noWrap>
                    {bestPerformer.displayName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} noWrap>
                    {bestPerformer.squadName}
                  </Typography>

                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      mt: { xs: 0.5, sm: 1 },
                      px: { xs: 1.5, sm: 2 },
                      py: { xs: 0.4, sm: 0.5 },
                      backgroundColor: 'primary.main',
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: { xs: '0.875rem', sm: '1.25rem' },
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
                  sx={{ display: 'block', mt: { xs: 1.5, sm: 2 }, textAlign: 'center', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                >
                  from Match #{bestPerformer.matchNumber}
                </Typography>
              )}

              <Typography
                variant="body2"
                sx={{
                  mt: { xs: 1.5, sm: 2 },
                  pt: { xs: 1.5, sm: 2 },
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  textAlign: 'center',
                  fontStyle: 'italic',
                  color: 'text.secondary',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                }}
              >
                {bestPerformer.displayName} scored {bestPerformer.pointsGained.toFixed(2)} points since the last updated leaderboard!
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Rapid Riser */}
        {rapidRiser && (
          <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: { xs: '100%', sm: 280, md: 300 } }}>
            <Paper
              elevation={4}
              sx={{
                px: { xs: 2, sm: 3 },
                py: { xs: 2, sm: 3 },
                background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0.05) 100%)',
                border: '2px solid',
                borderColor: 'success.main',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 }, gap: { xs: 0.5, sm: 1 } }}>
                <TrendingUpIcon sx={{ fontSize: { xs: 24, sm: 32 }, color: 'success.main' }} />
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 'bold',
                    color: 'success.main',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    fontSize: { xs: '0.9rem', sm: '1.25rem' },
                  }}
                >
                  Rapid Riser
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
                <Avatar
                  src={rapidRiser.profilePicUrl}
                  alt={rapidRiser.displayName}
                  sx={{
                    width: { xs: 60, sm: 80 },
                    height: { xs: 60, sm: 80 },
                    border: '3px solid',
                    borderColor: 'success.main',
                  }}
                />

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }} noWrap>
                    {rapidRiser.displayName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} noWrap>
                    {rapidRiser.squadName}
                  </Typography>

                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      mt: { xs: 0.5, sm: 1 },
                      px: { xs: 1.5, sm: 2 },
                      py: { xs: 0.4, sm: 0.5 },
                      backgroundColor: 'success.main',
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: { xs: '0.875rem', sm: '1.25rem' },
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
                  mt: { xs: 1.5, sm: 2 },
                  pt: { xs: 1.5, sm: 2 },
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  textAlign: 'center',
                  fontStyle: 'italic',
                  color: 'text.secondary',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                }}
              >
                {rapidRiser.displayName} jumped {rapidRiser.ranksGained} rank{rapidRiser.ranksGained > 1 ? 's' : ''}!
              </Typography>
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default LeaderboardHighlights;
