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

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

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

  const bestPerformerStanding = bestPerformer
    ? standings.find(s => s.userId === bestPerformer!.userId)
    : undefined;

  const rapidRiserStanding = rapidRiser
    ? standings.find(s => s.userId === rapidRiser!.userId)
    : undefined;

  if (!bestPerformer && !rapidRiser) {
    return null;
  }

  return (
    <Box sx={{ mt: { xs: 1.5, sm: 2 }, mb: { xs: 1.5, sm: 2 } }}>
      <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, flexWrap: 'wrap' }}>
        {/* Best Performer */}
        {bestPerformer && (
          <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: { xs: '100%', sm: 280, md: 300 } }}>
            <Paper
              elevation={2}
              sx={{
                px: { xs: 1, sm: 1.25 },
                py: { xs: 0.75, sm: 1 },
                background: 'linear-gradient(135deg, rgba(30, 136, 229, 0.15) 0%, rgba(30, 136, 229, 0.04) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderLeft: '4px solid #1E88E5',
                borderRadius: 2.5,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: '0 8px 24px rgba(30, 136, 229, 0.15)',
                  background: 'linear-gradient(135deg, rgba(30, 136, 229, 0.20) 0%, rgba(30, 136, 229, 0.07) 100%)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1 } }}>
                <TrophyIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: '#1E88E5' }} />
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 800,
                    color: '#1E88E5',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    fontSize: { xs: '0.6rem', sm: '0.65rem' },
                  }}
                >
                  Best Performer
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.25 }, mt: { xs: 0.5, sm: 0.75 } }}>
                <Avatar
                  src={bestPerformer.profilePicUrl || undefined}
                  alt={bestPerformer.displayName}
                  sx={{
                    width: { xs: 40, sm: 46 },
                    height: { xs: 40, sm: 46 },
                    border: '2.5px solid #1E88E5',
                    boxShadow: '0 4px 12px rgba(30, 136, 229, 0.3)',
                    bgcolor: 'rgba(30, 136, 229, 0.2)',
                  }}
                >
                  {getInitials(bestPerformer.displayName)}
                </Avatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: { xs: '0.82rem', sm: '0.9rem' }, lineHeight: 1.2 }} noWrap>
                    {bestPerformer.displayName}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: { xs: '0.65rem', sm: '0.7rem' }, display: 'block' }} noWrap>
                    {bestPerformer.squadName}
                  </Typography>
                  {bestPerformerStanding && (
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Box sx={{
                        display: 'inline-flex', alignItems: 'baseline', gap: 0.4,
                        px: 1, py: 0.3,
                        bgcolor: 'rgba(30, 136, 229, 0.1)',
                        border: '1px solid rgba(30, 136, 229, 0.25)',
                        borderRadius: 1,
                      }}>
                        <Typography sx={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontWeight: 600, fontStyle: 'italic',
                          fontSize: { xs: '0.58rem', sm: '0.62rem' },
                          color: 'text.disabled',
                          lineHeight: 1,
                        }}>total</Typography>
                        <Typography sx={{
                          fontFamily: "'Bebas Neue', sans-serif",
                          fontWeight: 400, fontStyle: 'italic',
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                          color: '#1E88E5', letterSpacing: '0.5px', lineHeight: 1,
                        }}>
                          {bestPerformerStanding.totalPoints.toFixed(2)}
                        </Typography>
                      </Box>

                      {bestPerformerStanding.captainName && (
                        <Box sx={{
                          display: 'inline-flex', alignItems: 'center', gap: 0.4,
                          px: 1, py: 0.3,
                          bgcolor: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 1,
                        }}>
                          <Typography sx={{
                            fontFamily: "'Montserrat', sans-serif",
                            fontWeight: 600, fontSize: { xs: '0.58rem', sm: '0.62rem' },
                            color: 'text.disabled', lineHeight: 1,
                          }}>C</Typography>
                          <Typography sx={{
                            fontFamily: "'Montserrat', sans-serif",
                            fontWeight: 700, fontSize: { xs: '0.65rem', sm: '0.7rem' },
                            color: 'text.secondary', lineHeight: 1,
                            maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {bestPerformerStanding.captainName}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>

                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: { xs: 1, sm: 1.25 },
                    py: { xs: 0.5, sm: 0.6 },
                    bgcolor: 'rgba(30, 136, 229, 0.15)',
                    border: '1px solid rgba(30, 136, 229, 0.4)',
                    borderRadius: 1.5,
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontWeight: 400,
                      letterSpacing: '0.5px',
                      color: '#1E88E5',
                      fontSize: { xs: '0.95rem', sm: '1.05rem' },
                      lineHeight: 1,
                    }}
                  >
                    +{bestPerformer.pointsGained.toFixed(2)}
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
                px: { xs: 1, sm: 1.25 },
                py: { xs: 0.75, sm: 1 },
                background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 152, 0, 0.04) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderLeft: '4px solid #FF9800',
                borderRadius: 2.5,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: '0 8px 24px rgba(255, 152, 0, 0.15)',
                  background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.20) 0%, rgba(255, 152, 0, 0.07) 100%)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1 } }}>
                <TrendingUpIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: '#FF9800' }} />
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 800,
                    color: '#FF9800',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    fontSize: { xs: '0.6rem', sm: '0.65rem' },
                  }}
                >
                  Rapid Riser
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.25 }, mt: { xs: 0.5, sm: 0.75 } }}>
                <Avatar
                  src={rapidRiser.profilePicUrl || undefined}
                  alt={rapidRiser.displayName}
                  sx={{
                    width: { xs: 40, sm: 46 },
                    height: { xs: 40, sm: 46 },
                    border: '2.5px solid #FF9800',
                    boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
                    bgcolor: 'rgba(255, 152, 0, 0.2)',
                  }}
                >
                  {getInitials(rapidRiser.displayName)}
                </Avatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: { xs: '0.82rem', sm: '0.9rem' }, lineHeight: 1.2 }} noWrap>
                    {rapidRiser.displayName}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: { xs: '0.65rem', sm: '0.7rem' }, display: 'block' }} noWrap>
                    {rapidRiser.squadName}
                  </Typography>
                  {rapidRiserStanding && (
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Box sx={{
                        display: 'inline-flex', alignItems: 'baseline', gap: 0.4,
                        px: 1, py: 0.3,
                        bgcolor: 'rgba(255, 152, 0, 0.1)',
                        border: '1px solid rgba(255, 152, 0, 0.25)',
                        borderRadius: 1,
                      }}>
                        <Typography sx={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontWeight: 600, fontStyle: 'italic',
                          fontSize: { xs: '0.58rem', sm: '0.62rem' },
                          color: 'text.disabled', lineHeight: 1,
                        }}>total</Typography>
                        <Typography sx={{
                          fontFamily: "'Bebas Neue', sans-serif",
                          fontWeight: 400, fontStyle: 'italic',
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                          color: '#FF9800', letterSpacing: '0.5px', lineHeight: 1,
                        }}>
                          {rapidRiserStanding.totalPoints.toFixed(2)}
                        </Typography>
                      </Box>

                      <Box sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.5,
                        px: 1, py: 0.3,
                        bgcolor: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 1,
                      }}>
                        <Typography sx={{
                          fontFamily: "'Bebas Neue', sans-serif", fontWeight: 400,
                          fontSize: { xs: '0.85rem', sm: '0.95rem' },
                          color: 'text.disabled', lineHeight: 1,
                        }}>#{rapidRiser.previousRank}</Typography>
                        <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', lineHeight: 1 }}>→</Typography>
                        <Typography sx={{
                          fontFamily: "'Bebas Neue', sans-serif", fontWeight: 400,
                          fontSize: { xs: '0.85rem', sm: '0.95rem' },
                          color: '#FF9800', lineHeight: 1,
                        }}>#{rapidRiser.currentRank}</Typography>
                      </Box>
                    </Box>
                  )}
                </Box>

                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: { xs: 1, sm: 1.25 },
                    py: { xs: 0.5, sm: 0.6 },
                    bgcolor: 'rgba(255, 152, 0, 0.15)',
                    border: '1px solid rgba(255, 152, 0, 0.4)',
                    borderRadius: 1.5,
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontWeight: 400,
                      letterSpacing: '0.5px',
                      color: '#FF9800',
                      fontSize: { xs: '0.95rem', sm: '1.05rem' },
                      lineHeight: 1,
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
