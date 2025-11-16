import React from 'react';
import { Box, Typography, Paper, LinearProgress, Avatar, Chip } from '@mui/material';
import {
  EmojiEvents,
  TrendingUp,
  Groups,
  Star,
  Timer,
  Whatshot,
} from '@mui/icons-material';
import type { LeaderboardSnapshot } from '../../types/database';

interface LeagueAnalyticsProps {
  snapshot: LeaderboardSnapshot;
}

const LeagueAnalytics: React.FC<LeagueAnalyticsProps> = ({ snapshot }) => {
  const { standings } = snapshot;

  if (!standings || standings.length === 0) return null;

  // Calculate analytics
  const totalPlayers = standings.length;
  const avgPoints = standings.reduce((sum, s) => sum + s.totalPoints, 0) / totalPlayers;
  const highestScore = Math.max(...standings.map(s => s.totalPoints));
  const lowestScore = Math.min(...standings.map(s => s.totalPoints));
  const pointsRange = highestScore - lowestScore;

  // Find most common captain
  const captainCounts = new Map<string, { name: string; count: number; points: number }>();
  standings.forEach(s => {
    if (s.captainId && s.captainName) {
      const existing = captainCounts.get(s.captainId);
      if (existing) {
        existing.count++;
        existing.points += s.captainPoints;
      } else {
        captainCounts.set(s.captainId, { name: s.captainName, count: 1, points: s.captainPoints });
      }
    }
  });
  const mostPopularCaptain = Array.from(captainCounts.values()).sort((a, b) => b.count - a.count)[0];

  // Find most common vice-captain
  const viceCaptainCounts = new Map<string, { name: string; count: number; points: number }>();
  standings.forEach(s => {
    if (s.viceCaptainId && s.viceCaptainName) {
      const existing = viceCaptainCounts.get(s.viceCaptainId);
      if (existing) {
        existing.count++;
        existing.points += s.viceCaptainPoints;
      } else {
        viceCaptainCounts.set(s.viceCaptainId, { name: s.viceCaptainName, count: 1, points: s.viceCaptainPoints });
      }
    }
  });
  const mostPopularViceCaptain = Array.from(viceCaptainCounts.values()).sort((a, b) => b.count - a.count)[0];

  // Find most successful X-Factor
  const xFactorCounts = new Map<string, { name: string; count: number; points: number }>();
  standings.forEach(s => {
    if (s.xFactorId && s.xFactorName) {
      const existing = xFactorCounts.get(s.xFactorId);
      if (existing) {
        existing.count++;
        existing.points += s.xFactorPoints;
      } else {
        xFactorCounts.set(s.xFactorId, { name: s.xFactorName, count: 1, points: s.xFactorPoints });
      }
    }
  });
  const mostPopularXFactor = Array.from(xFactorCounts.values()).sort((a, b) => b.points - a.points)[0];

  // Find tight battles (within 5 points)
  const battles: Array<{ rank1: number; rank2: number; gap: number; name1: string; name2: string }> = [];
  for (let i = 0; i < standings.length - 1; i++) {
    const gap = standings[i].totalPoints - standings[i + 1].totalPoints;
    if (gap <= 5 && gap > 0) {
      battles.push({
        rank1: standings[i].rank,
        rank2: standings[i + 1].rank,
        gap,
        name1: standings[i].displayName,
        name2: standings[i + 1].displayName,
      });
    }
  }

  // Calculate average contribution percentages
  const avgCaptainPercent = (standings.reduce((sum, s) => sum + s.captainPoints, 0) / standings.reduce((sum, s) => sum + s.totalPoints, 0)) * 100;
  const avgVCPercent = (standings.reduce((sum, s) => sum + s.viceCaptainPoints, 0) / standings.reduce((sum, s) => sum + s.totalPoints, 0)) * 100;
  const avgXFactorPercent = (standings.reduce((sum, s) => sum + s.xFactorPoints, 0) / standings.reduce((sum, s) => sum + s.totalPoints, 0)) * 100;

  // Hot streak - players with consistent gains
  const hotStreak = standings.filter(s => s.pointsGainedToday > 0).sort((a, b) => b.pointsGainedToday - a.pointsGainedToday).slice(0, 3);

  const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) => (
    <Paper sx={{ p: 2, height: '100%', bgcolor: color ? `${color}10` : 'background.paper' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        {icon}
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Typography>
      </Box>
      <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, color }}>
        {value}
      </Typography>
    </Paper>
  );

  return (
    <Box sx={{ my: 4 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Star sx={{ color: 'warning.main' }} />
        League Analytics
      </Typography>

      {/* Quick Stats Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <StatCard
          icon={<Groups sx={{ fontSize: 24, color: 'primary.main' }} />}
          label="Total Players"
          value={totalPlayers}
          color="#2196F3"
        />
        <StatCard
          icon={<EmojiEvents sx={{ fontSize: 24, color: 'warning.main' }} />}
          label="Highest Score"
          value={highestScore.toFixed(1)}
          color="#FFD700"
        />
        <StatCard
          icon={<TrendingUp sx={{ fontSize: 24, color: 'success.main' }} />}
          label="Average"
          value={avgPoints.toFixed(1)}
          color="#4CAF50"
        />
        <StatCard
          icon={<Timer sx={{ fontSize: 24, color: 'secondary.main' }} />}
          label="Points Range"
          value={pointsRange.toFixed(1)}
          color="#9C27B0"
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
        {/* Points Distribution */}
        <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Points Contribution Breakdown
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              League-wide average distribution
            </Typography>

            <Box sx={{ mt: 3 }}>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" fontWeight="600" color="primary.main">Captain (2x)</Typography>
                  <Typography variant="body2" fontWeight="bold">{avgCaptainPercent.toFixed(1)}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={avgCaptainPercent}
                  sx={{ height: 8, borderRadius: 1, bgcolor: 'primary.50', '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' } }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" fontWeight="600" color="secondary.main">Vice-Captain (1.5x)</Typography>
                  <Typography variant="body2" fontWeight="bold">{avgVCPercent.toFixed(1)}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={avgVCPercent}
                  sx={{ height: 8, borderRadius: 1, bgcolor: 'secondary.50', '& .MuiLinearProgress-bar': { bgcolor: 'secondary.main' } }}
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" fontWeight="600" sx={{ color: '#9C27B0' }}>X-Factor (1.25x)</Typography>
                  <Typography variant="body2" fontWeight="bold">{avgXFactorPercent.toFixed(1)}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={avgXFactorPercent}
                  sx={{ height: 8, borderRadius: 1, bgcolor: '#9C27B050', '& .MuiLinearProgress-bar': { bgcolor: '#9C27B0' } }}
                />
              </Box>
            </Box>
          </Paper>

        {/* Popular Picks */}
        <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Most Popular Picks
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Who's everyone betting on?
            </Typography>

            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {mostPopularCaptain && (
                <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.200' }}>
                  <Typography variant="caption" color="primary.main" fontWeight="bold" sx={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    Top Captain Pick
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" sx={{ mt: 0.5 }}>
                    {mostPopularCaptain.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Chip
                      label={`${mostPopularCaptain.count} teams`}
                      size="small"
                      color="primary"
                      sx={{ fontSize: '0.7rem' }}
                    />
                    <Chip
                      label={`Avg: ${(mostPopularCaptain.points / mostPopularCaptain.count).toFixed(1)} pts`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </Box>
                </Box>
              )}

              {mostPopularViceCaptain && (
                <Box sx={{ p: 2, bgcolor: 'secondary.50', borderRadius: 2, border: '1px solid', borderColor: 'secondary.200' }}>
                  <Typography variant="caption" color="secondary.main" fontWeight="bold" sx={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    Top Vice-Captain Pick
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" sx={{ mt: 0.5 }}>
                    {mostPopularViceCaptain.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Chip
                      label={`${mostPopularViceCaptain.count} teams`}
                      size="small"
                      color="secondary"
                      sx={{ fontSize: '0.7rem' }}
                    />
                    <Chip
                      label={`Avg: ${(mostPopularViceCaptain.points / mostPopularViceCaptain.count).toFixed(1)} pts`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </Box>
                </Box>
              )}

              {mostPopularXFactor && (
                <Box sx={{ p: 2, bgcolor: '#9C27B010', borderRadius: 2, border: '1px solid', borderColor: '#9C27B040' }}>
                  <Typography variant="caption" sx={{ color: '#9C27B0', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    Top X-Factor Pick
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" sx={{ mt: 0.5 }}>
                    {mostPopularXFactor.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Chip
                      label={`${mostPopularXFactor.count} teams`}
                      size="small"
                      sx={{ bgcolor: '#9C27B0', color: 'white', fontSize: '0.7rem' }}
                    />
                    <Chip
                      label={`Total: ${mostPopularXFactor.points.toFixed(1)} pts`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', borderColor: '#9C27B0' }}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>

        {/* Hot Streak */}
        {hotStreak.length > 0 && (
          <Paper sx={{ p: 3, height: '100%', background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 87, 34, 0.05) 100%)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Whatshot sx={{ color: '#FF9800' }} />
                <Typography variant="h6" fontWeight="bold">
                  On Fire
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Biggest gainers this update
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                {hotStreak.map((standing, idx) => (
                  <Box
                    key={standing.userId}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: idx === 0 ? '#FF9800' : 'divider',
                    }}
                  >
                    <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 'bold', minWidth: 24 }}>
                      {idx + 1}
                    </Typography>
                    <Avatar src={standing.profilePicUrl} sx={{ width: 36, height: 36 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight="600" noWrap>
                        {standing.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Rank #{standing.rank}
                      </Typography>
                    </Box>
                    <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 'bold', fontSize: '1rem' }}>
                      +{standing.pointsGainedToday.toFixed(1)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
        )}

        {/* Tight Battles */}
        {battles.length > 0 && (
          <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Position Battles
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Closest races (within 5 points)
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                {battles.slice(0, 4).map((battle, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 2,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      border: '1px dashed',
                      borderColor: 'warning.main',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" fontWeight="bold" noWrap>
                          #{battle.rank1} {battle.name1}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          vs
                        </Typography>
                        <Typography variant="body2" fontWeight="600" color="text.secondary" noWrap>
                          #{battle.rank2} {battle.name2}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${battle.gap.toFixed(2)} pts`}
                        size="small"
                        color="warning"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
        )}
      </Box>
    </Box>
  );
};

export default LeagueAnalytics;
