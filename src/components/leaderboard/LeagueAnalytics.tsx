import React from 'react';
import { Box, Typography, Paper, LinearProgress, Avatar, Chip } from '@mui/material';
import {
  EmojiEvents,
  TrendingUp,
  Groups,
  Star,
  Timer,
  Whatshot,
  BarChart,
  TrendingDown,
  PersonOutline,
} from '@mui/icons-material';
import type { LeaderboardSnapshot, League, LeagueSquad } from '../../types/database';
import { findMostConsistentPerformer } from '../../utils/streakCalculator';

interface LeagueAnalyticsProps {
  snapshot: LeaderboardSnapshot;
  league: League;
  squads: LeagueSquad[];
}

const LeagueAnalytics: React.FC<LeagueAnalyticsProps> = ({ snapshot, league, squads }) => {
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

  // =============== HOT STREAK ===============
  const hotStreak = standings.filter(s => s.pointsGainedToday > 0).sort((a, b) => b.pointsGainedToday - a.pointsGainedToday).slice(0, 3);

  // =============== MOST CONSISTENT PERFORMER ===============
  const mostConsistentPerformer = findMostConsistentPerformer(standings);

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

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
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
                    label={`${((mostPopularCaptain.count / totalPlayers) * 100).toFixed(1)}% ownership`}
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
                    label={`${((mostPopularViceCaptain.count / totalPlayers) * 100).toFixed(1)}% ownership`}
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
                    label={`${((mostPopularXFactor.count / totalPlayers) * 100).toFixed(1)}% ownership`}
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
                    +{standing.pointsGainedToday.toFixed(2)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        )}

        {/* Most Consistent Performer */}
        {mostConsistentPerformer && (
          <Paper sx={{ p: 3, height: '100%', background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Whatshot sx={{ color: '#FF9800' }} />
              <Typography variant="h6" fontWeight="bold">
                Most Consistent
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Longest rank streak
            </Typography>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: '2px solid',
                borderColor: '#FF9800',
                mt: 2,
              }}
            >
              <Box sx={{ textAlign: 'center', minWidth: 48 }}>
                <Whatshot sx={{ fontSize: 32, color: '#FF9800' }} />
                <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 'bold', fontSize: '1.25rem' }}>
                  {mostConsistentPerformer.rankStreak}
                </Typography>
              </Box>
              <Avatar src={mostConsistentPerformer.profilePicUrl} sx={{ width: 48, height: 48 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" fontWeight="bold" noWrap>
                  {mostConsistentPerformer.displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Rank #{mostConsistentPerformer.rank} for {mostConsistentPerformer.rankStreak} consecutive updates
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h6" fontWeight="bold" color="primary.main">
                  {mostConsistentPerformer.totalPoints.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  points
                </Typography>
              </Box>
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

        {/* Top Picks */}
        <Paper sx={{ p: 3, height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Groups sx={{ color: 'primary.main' }} />
            <Typography variant="h6" fontWeight="bold">
              Top Picks
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Most popular 11 players
          </Typography>

          <Box sx={{ mt: 2 }}>
            {templateSquad.map((player, idx) => (
              <Box
                key={player.playerId}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                  borderBottom: idx < 10 ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight="600" noWrap>
                    {player.playerName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {player.avgPoints.toFixed(2)} avg pts
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={player.ownershipPercent}
                    sx={{
                      width: 60,
                      height: 6,
                      borderRadius: 1,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' },
                    }}
                  />
                  <Typography variant="caption" fontWeight="bold" sx={{ minWidth: 40, textAlign: 'right' }}>
                    {player.ownershipPercent.toFixed(0)}%
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Squad Differential */}
        {squadDifferentials.length > 0 && (
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PersonOutline sx={{ color: 'secondary.main' }} />
              <Typography variant="h6" fontWeight="bold">
                Most Unique Squads
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Least template-dependent teams
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
              {squadDifferentials.map((item, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    bgcolor: 'background.default',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="h6" sx={{ color: 'secondary.main', fontWeight: 'bold', minWidth: 24 }}>
                    {idx + 1}
                  </Typography>
                  <Avatar src={item.profilePicUrl} sx={{ width: 36, height: 36 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight="600" noWrap>
                      {item.displayName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.uniquePlayersCount} unique picks • Rank #{item.rank}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" fontWeight="bold" color="secondary.main">
                      {(100 - item.templateScore).toFixed(0)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      unique
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        )}

        {/* Rank Projection - Top */}
        <Paper sx={{ p: 3, height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <BarChart sx={{ color: 'warning.main' }} />
            <Typography variant="h6" fontWeight="bold">
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
        <Paper sx={{ p: 3, height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TrendingDown sx={{ color: 'error.main' }} />
            <Typography variant="h6" fontWeight="bold">
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

        {/* Points Distribution */}
        <Paper sx={{ p: 3, height: '100%', gridColumn: { xs: '1', md: 'span 2' } }}>
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

          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              The gap between top and bottom performers is <strong>{pointsRange.toFixed(2)} points</strong>.
              {pointsRange > avgPoints * 0.5 ? ' This is a highly competitive league!' : ' The competition is tight!'}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default LeagueAnalytics;
