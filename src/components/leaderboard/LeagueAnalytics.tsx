import React from 'react';
import { Box, Typography, Paper, Avatar, Chip, LinearProgress } from '@mui/material';
import {
  EmojiEvents,
  TrendingUp,
  Groups,
  Star,
  Timer,
  BarChart,
  TrendingDown,
  PersonOutline,
} from '@mui/icons-material';
import type { LeaderboardSnapshot, League, LeagueSquad, PlayerPool } from '../../types/database';

interface LeagueAnalyticsProps {
  snapshot: LeaderboardSnapshot;
  league: League;
  squads: LeagueSquad[];
  playerPool: PlayerPool | null;
}

const LeagueAnalytics: React.FC<LeagueAnalyticsProps> = ({ snapshot, league, squads, playerPool }) => {
  const { standings } = snapshot;

  if (!standings || standings.length === 0) return null;

  // =============== BASIC STATS ===============
  const totalPlayers = standings.length;
  const avgPoints = standings.reduce((sum, s) => sum + s.totalPoints, 0) / totalPlayers;
  const highestScore = Math.max(...standings.map(s => s.totalPoints));
  const lowestScore = Math.min(...standings.map(s => s.totalPoints));
  const pointsRange = highestScore - lowestScore;

  // =============== POPULAR PICKS ===============
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

  // =============== TIGHT BATTLES ===============
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

  // =============== RANK PROJECTION ===============
  const rankedStandings = [...standings].sort((a, b) => b.totalPoints - a.totalPoints);
  const rankProjections = rankedStandings.slice(0, 5).map((standing, idx) => {
    const nextStanding = rankedStandings[idx + 1];
    return {
      ...standing,
      pointsToNextRank: nextStanding ? standing.totalPoints - nextStanding.totalPoints : 0,
    };
  });

  const bottomRankProjections = rankedStandings.slice(-3).reverse().map((standing, idx) => {
    const prevIndex = rankedStandings.length - 1 - (2 - idx) - 1;
    const prevStanding = prevIndex >= 0 ? rankedStandings[prevIndex] : null;
    return {
      ...standing,
      pointsToEscape: prevStanding ? prevStanding.totalPoints - standing.totalPoints : 0,
    };
  });

  // =============== TEMPLATE SQUAD (Most Common 11) ===============
  const playerOwnerships = new Map<string, { playerId: string; playerName: string; count: number; avgPoints: number; totalPoints: number }>();

  squads.forEach(squad => {
    squad.players.forEach(player => {
      const existing = playerOwnerships.get(player.playerId);
      if (existing) {
        existing.count++;
        existing.totalPoints += player.points;
      } else {
        playerOwnerships.set(player.playerId, {
          playerId: player.playerId,
          playerName: player.playerName,
          count: 1,
          avgPoints: 0,
          totalPoints: player.points,
        });
      }
    });
  });

  // Calculate average points and ownership percentage
  playerOwnerships.forEach((value) => {
    value.avgPoints = value.totalPoints / value.count;
  });

  const templateSquad = Array.from(playerOwnerships.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 11)
    .map(p => ({
      ...p,
      ownershipPercent: (p.count / totalPlayers) * 100,
    }));

  // =============== SQUAD DIFFERENTIAL ANALYSIS ===============
  const squadDifferentials = squads.map(squad => {
    let uniquePlayersCount = 0;
    let templatePlayersCount = 0;
    const templatePlayerIds = new Set(templateSquad.map(p => p.playerId));

    squad.players.forEach(player => {
      if (templatePlayerIds.has(player.playerId)) {
        templatePlayersCount++;
      } else {
        uniquePlayersCount++;
      }
    });

    const templateScore = (templatePlayersCount / 11) * 100;
    const standing = standings.find(s => s.squadId === squad.id);

    return {
      squadName: squad.squadName,
      displayName: standing?.displayName || '',
      profilePicUrl: standing?.profilePicUrl,
      templateScore,
      uniquePlayersCount,
      rank: squad.rank,
      totalPoints: squad.totalPoints,
    };
  }).sort((a, b) => a.templateScore - b.templateScore).slice(0, 3); // Most unique squads

  // =============== POINTS DISTRIBUTION ===============
  const pointsDistribution = {
    top10Percent: standings.slice(0, Math.ceil(totalPlayers * 0.1)),
    middle: standings.slice(Math.ceil(totalPlayers * 0.1), Math.ceil(totalPlayers * 0.9)),
    bottom10Percent: standings.slice(Math.ceil(totalPlayers * 0.9)),
  };

  const avgTop10 = pointsDistribution.top10Percent.reduce((sum, s) => sum + s.totalPoints, 0) / (pointsDistribution.top10Percent.length || 1);
  const avgBottom10 = pointsDistribution.bottom10Percent.reduce((sum, s) => sum + s.totalPoints, 0) / (pointsDistribution.bottom10Percent.length || 1);

  // =============== TOP PERFORMERS BY ROLE ===============
  const getTopPerformersByRole = () => {
    if (!playerPool) return { batters: [], allRounders: [], bowlers: [] };

    const batters = playerPool.players
      .filter(p => p.role === 'batsman')
      .sort((a, b) => b.points - a.points)
      .slice(0, 8);

    const allRounders = playerPool.players
      .filter(p => p.role === 'allrounder')
      .sort((a, b) => b.points - a.points)
      .slice(0, 8);

    const bowlers = playerPool.players
      .filter(p => p.role === 'bowler')
      .sort((a, b) => b.points - a.points)
      .slice(0, 8);

    return { batters, allRounders, bowlers };
  };

  const topPerformers = getTopPerformersByRole();

  // =============== COMPONENTS ===============
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
          value={highestScore.toFixed(2)}
          color="#FFD700"
        />
        <StatCard
          icon={<TrendingUp sx={{ fontSize: 24, color: 'success.main' }} />}
          label="Average"
          value={avgPoints.toFixed(2)}
          color="#4CAF50"
        />
        <StatCard
          icon={<Timer sx={{ fontSize: 24, color: 'secondary.main' }} />}
          label="Points Range"
          value={pointsRange.toFixed(2)}
          color="#9C27B0"
        />
      </Box>

      {/* ========== ROW 2: TOP PERFORMERS (Full Width) ========== */}
      {playerPool && (topPerformers.batters.length > 0 || topPerformers.allRounders.length > 0 || topPerformers.bowlers.length > 0) && (
        <Box sx={{ mb: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Star sx={{ color: 'warning.main' }} />
              <Typography variant="h6" fontWeight="bold">
                Top Performers by Role
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Top 8 performing players from the player pool
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3, mt: 2 }}>
              {/* Top Batters */}
              {topPerformers.batters.length > 0 && (
                <Box>
                  <Typography variant="caption" fontWeight="bold" color="primary.main" gutterBottom sx={{ display: 'block', mb: 1, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    Batters
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {topPerformers.batters.map((player, idx) => (
                      <Box
                        key={player.playerId}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 1,
                          bgcolor: idx === 0 ? 'primary.50' : 'background.default',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: idx === 0 ? 'primary.main' : 'divider',
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" fontWeight="600" noWrap sx={{ fontSize: '0.75rem' }}>
                            {idx + 1}. {player.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.65rem', display: 'block', mt: 0.25 }}>
                            {player.team}
                          </Typography>
                        </Box>
                        <Typography variant="caption" fontWeight="bold" color="primary.main" sx={{ fontSize: '0.7rem' }}>
                          {player.points.toFixed(0)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Top All-Rounders */}
              {topPerformers.allRounders.length > 0 && (
                <Box>
                  <Typography variant="caption" fontWeight="bold" color="secondary.main" gutterBottom sx={{ display: 'block', mb: 1, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    All-Rounders
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {topPerformers.allRounders.map((player, idx) => (
                      <Box
                        key={player.playerId}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 1,
                          bgcolor: idx === 0 ? 'secondary.50' : 'background.default',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: idx === 0 ? 'secondary.main' : 'divider',
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" fontWeight="600" noWrap sx={{ fontSize: '0.75rem' }}>
                            {idx + 1}. {player.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.65rem', display: 'block', mt: 0.25 }}>
                            {player.team}
                          </Typography>
                        </Box>
                        <Typography variant="caption" fontWeight="bold" color="secondary.main" sx={{ fontSize: '0.7rem' }}>
                          {player.points.toFixed(0)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Top Bowlers */}
              {topPerformers.bowlers.length > 0 && (
                <Box>
                  <Typography variant="caption" fontWeight="bold" sx={{ color: '#9C27B0', display: 'block', mb: 1, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    Bowlers
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {topPerformers.bowlers.map((player, idx) => (
                      <Box
                        key={player.playerId}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 1,
                          bgcolor: idx === 0 ? '#9C27B010' : 'background.default',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: idx === 0 ? '#9C27B0' : 'divider',
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" fontWeight="600" noWrap sx={{ fontSize: '0.75rem' }}>
                            {idx + 1}. {player.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.65rem', display: 'block', mt: 0.25 }}>
                            {player.team}
                          </Typography>
                        </Box>
                        <Typography variant="caption" fontWeight="bold" sx={{ color: '#9C27B0', fontSize: '0.7rem' }}>
                          {player.points.toFixed(0)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
      )}

      {/* ========== ROW 3: TEAM INTELLIGENCE (3 columns) ========== */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
        {/* Popular Picks */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ fontSize: '1rem' }}>
            Popular Picks
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Most selected roles
          </Typography>

          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {mostPopularCaptain && (
              <Box sx={{ p: 1.5, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.200' }}>
                <Typography variant="caption" color="primary.main" fontWeight="bold" sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                  Captain
                </Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5, fontSize: '0.9rem' }}>
                  {mostPopularCaptain.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {((mostPopularCaptain.count / totalPlayers) * 100).toFixed(1)}% ownership
                </Typography>
              </Box>
            )}

            {mostPopularViceCaptain && (
              <Box sx={{ p: 1.5, bgcolor: 'secondary.50', borderRadius: 1, border: '1px solid', borderColor: 'secondary.200' }}>
                <Typography variant="caption" color="secondary.main" fontWeight="bold" sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                  Vice-Captain
                </Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5, fontSize: '0.9rem' }}>
                  {mostPopularViceCaptain.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {((mostPopularViceCaptain.count / totalPlayers) * 100).toFixed(1)}% ownership
                </Typography>
              </Box>
            )}

            {mostPopularXFactor && (
              <Box sx={{ p: 1.5, bgcolor: '#9C27B010', borderRadius: 1, border: '1px solid', borderColor: '#9C27B040' }}>
                <Typography variant="caption" sx={{ color: '#9C27B0', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                  X-Factor
                </Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5, fontSize: '0.9rem' }}>
                  {mostPopularXFactor.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {((mostPopularXFactor.count / totalPlayers) * 100).toFixed(1)}% ownership
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Top Picks */}
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Groups sx={{ color: 'primary.main' }} />
            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1rem' }}>
              Top Picks
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Most popular players
          </Typography>

          <Box sx={{ mt: 2, maxHeight: 250, overflowY: 'auto' }}>
            {templateSquad.slice(0, 8).map((player, idx) => (
              <Box
                key={player.playerId}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 0.75,
                  borderBottom: idx < 7 ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" fontWeight="600" noWrap sx={{ fontSize: '0.8rem' }}>
                    {player.playerName}
                  </Typography>
                </Box>
                <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.75rem', minWidth: 35, textAlign: 'right' }}>
                  {player.ownershipPercent.toFixed(0)}%
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Squad Differential */}
        {squadDifferentials.length > 0 && (
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PersonOutline sx={{ color: 'secondary.main' }} />
              <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                Most Unique Squads
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Differentials
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
              {squadDifferentials.map((item, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    bgcolor: 'background.default',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'secondary.main', fontWeight: 'bold', minWidth: 20, fontSize: '0.85rem' }}>
                    {idx + 1}
                  </Typography>
                  <Avatar src={item.profilePicUrl} sx={{ width: 28, height: 28 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" fontWeight="600" noWrap sx={{ fontSize: '0.8rem' }}>
                      {item.displayName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block' }}>
                      {item.uniquePlayersCount} unique • Rank #{item.rank}
                    </Typography>
                  </Box>
                  <Typography variant="caption" fontWeight="bold" color="secondary.main" sx={{ fontSize: '0.85rem' }}>
                    {(100 - item.templateScore).toFixed(0)}%
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        )}
      </Box>

      {/* ========== ROW 4: RANK ANALYSIS (2 columns) ========== */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3, mb: 3 }}>
        {/* Rank Projection - Top */}
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <BarChart sx={{ color: 'warning.main' }} />
            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1rem' }}>
              Rank Battles - Top
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Points lead over next rank
          </Typography>

          <Box sx={{ mt: 2 }}>
            {rankProjections.map((standing, idx) => (
              <Box
                key={standing.userId}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1.5,
                  borderBottom: idx < rankProjections.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                  <Chip
                    label={`#${standing.rank}`}
                    size="small"
                    sx={{
                      bgcolor: idx === 0 ? 'warning.main' : 'rgba(99,110,250,0.9)',
                      color: 'white',
                      fontWeight: 'bold',
                      minWidth: 40,
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight="600" noWrap>
                      {standing.displayName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {standing.totalPoints.toFixed(2)} pts
                    </Typography>
                  </Box>
                </Box>
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  color={standing.pointsToNextRank > 10 ? 'success.main' : 'warning.main'}
                  sx={{ minWidth: 60, textAlign: 'right' }}
                >
                  {standing.pointsToNextRank > 0 ? `+${standing.pointsToNextRank.toFixed(2)}` : '—'}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Rank Projection - Bottom */}
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TrendingDown sx={{ color: 'error.main' }} />
            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1rem' }}>
              Escape the Bottom
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Points needed to climb up
          </Typography>

          <Box sx={{ mt: 2 }}>
            {bottomRankProjections.map((standing, idx) => (
              <Box
                key={standing.userId}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1.5,
                  borderBottom: idx < bottomRankProjections.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                  <Chip
                    label={`#${standing.rank}`}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(99,110,250,0.9)',
                      color: 'white',
                      fontWeight: 'bold',
                      minWidth: 40,
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight="600" noWrap>
                      {standing.displayName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {standing.totalPoints.toFixed(2)} pts
                    </Typography>
                  </Box>
                </Box>
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  color="error.main"
                  sx={{ minWidth: 60, textAlign: 'right' }}
                >
                  {standing.pointsToEscape > 0 ? `-${standing.pointsToEscape.toFixed(2)}` : '—'}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>

      {/* ========== ROW 5: COMPETITION (Position Battles) ========== */}
      {battles.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Position Battles
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Closest races (within 5 points)
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mt: 2 }}>
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
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" fontWeight="bold" noWrap sx={{ fontSize: '0.8rem' }}>
                      #{battle.rank1} {battle.name1}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      vs
                    </Typography>
                    <Typography variant="caption" fontWeight="600" color="text.secondary" noWrap sx={{ fontSize: '0.75rem' }}>
                      #{battle.rank2} {battle.name2}
                    </Typography>
                    <Chip
                      label={`${battle.gap.toFixed(2)} pts`}
                      size="small"
                      color="warning"
                      sx={{ fontWeight: 'bold', mt: 0.5, fontSize: '0.7rem' }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
      )}

      {/* ========== ROW 6: LEAGUE OVERVIEW (Points Distribution - Full Width) ========== */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <BarChart sx={{ color: 'primary.main' }} />
          <Typography variant="h6" fontWeight="bold">
            Points Distribution
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          League competitive balance
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3, mt: 1 }}>
          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Top 10% Average
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="success.main">
              {avgTop10.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {pointsDistribution.top10Percent.length} managers
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              League Average
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              {avgPoints.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {totalPlayers} managers
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.50', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Bottom 10% Average
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="error.main">
              {avgBottom10.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {pointsDistribution.bottom10Percent.length} managers
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.200' }}>
          <Typography variant="body2" color="primary.main" fontWeight="500">
            The gap between top and bottom performers is <strong>{pointsRange.toFixed(2)} points</strong>.
            {pointsRange > avgPoints * 0.5 ? ' This is a highly competitive league!' : ' The competition is tight!'}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default LeagueAnalytics;
