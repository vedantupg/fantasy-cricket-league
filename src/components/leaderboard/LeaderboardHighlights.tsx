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
    <Box sx={{ mt: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, flexWrap: 'wrap' }}>
        {/* Best Performer */}
        {bestPerformer && (
          <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: { xs: '100%', sm: 280, md: 300 } }}>
            <Paper
              elevation={2}
              sx={{
                px: { xs: 1.25, sm: 1.5 },
                py: { xs: 1, sm: 1.25 },
                background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(33, 150, 243, 0.03) 100%)',
                border: '2px solid',
                borderColor: 'primary.main',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
                <TrophyIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: 'primary.main' }} />
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 'bold',
                    color: 'primary.main',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    fontSize: { xs: '0.7rem', sm: '0.8rem' },
                  }}
                >
                  Best Performer
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.25 }, mt: { xs: 0.75, sm: 1 } }}>
                <Avatar
                  src={bestPerformer.profilePicUrl}
                  alt={bestPerformer.displayName}
                  sx={{
                    width: { xs: 36, sm: 42 },
                    height: { xs: 36, sm: 42 },
                    border: '2px solid',
                    borderColor: 'primary.main',
                  }}
                />

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' }, lineHeight: 1.2 }} noWrap>
                    {bestPerformer.displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' }, display: 'block' }} noWrap>
                    {bestPerformer.squadName}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: { xs: 1, sm: 1.25 },
                    py: { xs: 0.4, sm: 0.5 },
                    backgroundColor: 'primary.main',
                    borderRadius: 1.5,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: { xs: '0.7rem', sm: '0.8rem' },
                    }}
                  >
                    +{bestPerformer.pointsGained.toFixed(1)}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        )}

        {/* Rapid Riser */}
        {rapidRiser && (
          <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: { xs: '100%', sm: 280, md: 300 } }}>
            <Paper
              elevation={2}
              sx={{
                px: { xs: 1.25, sm: 1.5 },
                py: { xs: 1, sm: 1.25 },
                background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.03) 100%)',
                border: '2px solid',
                borderColor: 'success.main',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
                <TrendingUpIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: 'success.main' }} />
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 'bold',
                    color: 'success.main',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    fontSize: { xs: '0.7rem', sm: '0.8rem' },
                  }}
                >
                  Rapid Riser
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.25 }, mt: { xs: 0.75, sm: 1 } }}>
                <Avatar
                  src={rapidRiser.profilePicUrl}
                  alt={rapidRiser.displayName}
                  sx={{
                    width: { xs: 36, sm: 42 },
                    height: { xs: 36, sm: 42 },
                    border: '2px solid',
                    borderColor: 'success.main',
                  }}
                />

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' }, lineHeight: 1.2 }} noWrap>
                    {rapidRiser.displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' }, display: 'block' }} noWrap>
                    {rapidRiser.squadName}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: { xs: 1, sm: 1.25 },
                    py: { xs: 0.4, sm: 0.5 },
                    backgroundColor: 'success.main',
                    borderRadius: 1.5,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: { xs: '0.7rem', sm: '0.8rem' },
                    }}
                  >
                    +{rapidRiser.ranksGained}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default LeaderboardHighlights;
