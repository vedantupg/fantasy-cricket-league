import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import Skeleton from '@mui/material/Skeleton';
import { useParams } from 'react-router-dom';
import { Refresh as RefreshIcon, AccessTime } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import AppHeader from '../components/common/AppHeader';
import LeagueNav from '../components/common/LeagueNav';
import CompactPodium from '../components/leaderboard/CompactPodium';
import CompactLeaderboardCard from '../components/leaderboard/CompactLeaderboardCard';
import LeaderboardHighlights from '../components/leaderboard/LeaderboardHighlights';
import LeagueAssistant from '../components/LeagueAssistant';
import { leaderboardSnapshotService, leagueService, squadService, playerPoolSnapshotService } from '../services/firestore';
import type { LeaderboardSnapshot, League, StandingEntry, PlayerPoolSnapshot } from '../types/database';
import { calculateRankStreaks, attachStreaksToStandings } from '../utils/streakCalculator';

const LeaderboardPage: React.FC = () => {
  const { userData } = useAuth();
  const { leagueId } = useParams<{ leagueId: string }>();

  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [poolSnapshot, setPoolSnapshot] = useState<PlayerPoolSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    if (!leagueId) {
      setError('No league ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch league details
      const leagueData = await leagueService.getById(leagueId);
      if (!leagueData) {
        setError('League not found');
        setLoading(false);
        return;
      }
      setLeague(leagueData);

      // Fetch latest player pool snapshot (non-fatal)
      if (leagueData.playerPoolId) {
        try {
          const ps = await playerPoolSnapshotService.getLatest(leagueData.playerPoolId);
          setPoolSnapshot(ps);
        } catch {
          // non-fatal — strip simply won't render
        }
      }

      // Try to fetch latest snapshot
      try {
        const latestSnapshot = await leaderboardSnapshotService.getLatest(leagueId);

        if (!latestSnapshot) {
          // Try to create one
          try {
            await leaderboardSnapshotService.create(leagueId);
            const newSnapshot = await leaderboardSnapshotService.getLatest(leagueId);
            setSnapshot(newSnapshot);
          } catch (createErr) {
            console.error('Error creating snapshot:', createErr);
            // Build a basic snapshot from squads
            const squads = await squadService.getByLeague(leagueId);
            const standings: StandingEntry[] = squads
              .filter(s => s.isSubmitted)
              .map((squad, index) => ({
                userId: squad.userId,
                squadId: squad.id,
                squadName: squad.squadName,
                displayName: squad.squadName,
                totalPoints: (squad.totalPoints || 0) + (squad.predictionBonusPoints || 0),
                captainPoints: squad.captainPoints || 0,
                viceCaptainPoints: squad.viceCaptainPoints || 0,
                xFactorPoints: squad.xFactorPoints || 0,
                rank: index + 1,
                pointsGainedToday: 0,
                captainId: squad.captainId,
                viceCaptainId: squad.viceCaptainId,
                xFactorId: squad.xFactorId,
                benchTransfersUsed: squad.benchTransfersUsed || 0,
                flexibleTransfersUsed: squad.flexibleTransfersUsed || 0,
                midSeasonTransfersUsed: squad.midSeasonTransfersUsed || 0,
              }))
              .sort((a, b) => b.totalPoints - a.totalPoints)
              .map((standing, index) => ({ ...standing, rank: index + 1 }));

            setSnapshot({
              id: 'temp',
              leagueId,
              snapshotDate: new Date(),
              standings,
              createdAt: new Date(),
            });
          }
        } else {
          // Fetch recent snapshots to calculate streaks
          try {
            const recentSnapshots = await leaderboardSnapshotService.getRecent(leagueId, 15);
            console.log('🔍 DEBUG: Recent snapshots fetched:', recentSnapshots.length);
            console.log('🔍 DEBUG: Snapshot dates:', recentSnapshots.map(s => s.snapshotDate));

            const streaks = calculateRankStreaks(recentSnapshots);
            console.log('🔍 DEBUG: Calculated streaks:', Object.fromEntries(streaks));

            const standingsWithStreaks = attachStreaksToStandings(latestSnapshot.standings, streaks);
            console.log('🔍 DEBUG: Standings with streaks:', standingsWithStreaks.map(s => ({
              name: s.displayName,
              rank: s.rank,
              previousRank: s.previousRank,
              rankChange: s.rankChange,
              rankStreak: s.rankStreak
            })));

            setSnapshot({
              ...latestSnapshot,
              standings: standingsWithStreaks,
            });
          } catch (streakErr) {
            console.error('Error calculating streaks:', streakErr);
            // Fallback to snapshot without streaks
            setSnapshot(latestSnapshot);
          }
        }
      } catch (snapshotErr) {
        console.error('Error fetching snapshot:', snapshotErr);
        // Build a basic snapshot from squads
        const squads = await squadService.getByLeague(leagueId);
        const standings: StandingEntry[] = squads
          .filter(s => s.isSubmitted)
          .map((squad, index) => ({
            userId: squad.userId,
            squadId: squad.id,
            squadName: squad.squadName,
            displayName: squad.squadName,
            totalPoints: (squad.totalPoints || 0) + (squad.predictionBonusPoints || 0),
            captainPoints: squad.captainPoints || 0,
            viceCaptainPoints: squad.viceCaptainPoints || 0,
            xFactorPoints: squad.xFactorPoints || 0,
            rank: index + 1,
            pointsGainedToday: 0,
            captainId: squad.captainId,
            viceCaptainId: squad.viceCaptainId,
            xFactorId: squad.xFactorId,
            benchTransfersUsed: squad.benchTransfersUsed || 0,
            flexibleTransfersUsed: squad.flexibleTransfersUsed || 0,
            midSeasonTransfersUsed: squad.midSeasonTransfersUsed || 0,
          }))
          .sort((a, b) => b.totalPoints - a.totalPoints)
          .map((standing, index) => ({ ...standing, rank: index + 1 }));

        setSnapshot({
          id: 'temp',
          leagueId,
          snapshotDate: new Date(),
          standings,
          createdAt: new Date(),
        });
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError('Failed to load league data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    loadLeaderboard();

    // Set up real-time listener
    if (leagueId) {
      const unsubscribe = leaderboardSnapshotService.subscribeToLatest(
        leagueId,
        (newSnapshot) => {
          if (newSnapshot) {
            setSnapshot(newSnapshot);
          }
        }
      );

      return () => unsubscribe();
    }
  }, [leagueId, loadLeaderboard]);

  const handleRefresh = async () => {
    if (!leagueId) return;

    try {
      setLoading(true);
      await leaderboardSnapshotService.create(leagueId);
      await loadLeaderboard();
    } catch (err) {
      console.error('Error refreshing leaderboard:', err);
      setError('Failed to refresh leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = (
    <Button
      variant="contained"
      startIcon={<RefreshIcon />}
      onClick={handleRefresh}
      disabled={loading}
    >
      Refresh
    </Button>
  );

  if (loading && !snapshot) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#050E18' }}>
        <AppHeader />
        {leagueId && (
          <LeagueNav
            leagueName="Loading..."
            leagueId={leagueId}
            currentPage="Leaderboard"
            actions={quickActions}
          />
        )}
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3, md: 4 } }}>
          <Box sx={{ px: 2 }}>
            {[...Array(6)].map((_, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                  <Skeleton variant="text" width="40%" height={12} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
                </Box>
                <Skeleton variant="rounded" width={56} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
              </Box>
            ))}
          </Box>
        </Container>
      </Box>
    );
  }

  // Calculate time until league starts
  const getTimeUntilStart = () => {
    if (!league) return null;
    const now = new Date();
    const startDate = new Date(league.startDate);
    if (now >= startDate) return null;

    const diff = startDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const timeUntilStart = getTimeUntilStart();
  const hasLeagueStarted = league && new Date() >= new Date(league.startDate);

  if (!league || (error && !snapshot)) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#050E18' }}>
        <AppHeader />
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3, md: 4 } }}>
          {error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <Box display="flex" justifyContent="center">
              <CircularProgress />
            </Box>
          )}
        </Container>
      </Box>
    );
  }

  // At this point, league is guaranteed to be non-null
  const topFive = snapshot?.standings.slice(0, 5) || [];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#050E18' }}>
      <AppHeader />
      {leagueId && (
        <LeagueNav
          leagueName={league.name}
          leagueId={leagueId}
          currentPage="Leaderboard"
          actions={quickActions}
        />
      )}

      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3, md: 4 } }}>
        {/* League Info */}
        {/* 🎨 CUSTOMIZATION ZONE - LEAGUE INFO CARD */}
        <Card sx={{
          mb: { xs: 2, sm: 3, md: 4 },
          background: 'linear-gradient(135deg, rgba(30, 136, 229, 0.08) 0%, rgba(156, 39, 176, 0.05) 100%)',
          backdropFilter: 'blur(10px)',
          border: 'none',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08), 0 4px 24px rgba(0,0,0,0.5)',
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: 4,
            height: '100%',
            background: 'linear-gradient(180deg, #1E88E5 0%, #9C27B0 100%)',
            borderRadius: '3px 0 0 3px',
          },
        }}>
          <CardContent sx={{
            px: { xs: 2, sm: 3, md: 3.5 },
            py: { xs: 1.5, sm: 1.25, md: 1.5 },
          }}>
            {/* Main row - wraps on mobile */}
            <Box sx={{
              display: 'flex',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: { xs: 2, sm: 2.5 },
              justifyContent: 'space-between',
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
            }}>
              {/* Left: FCL Logo + League Name */}
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1.5, sm: 2.5 },
                flex: { xs: '1 1 100%', sm: '1 1 auto' },
                minWidth: 0,
              }}>
                {/* FCL Logo */}
                <Box
                  component="img"
                  src="/logo192.png"
                  alt="FCL Logo"
                  sx={{
                    width: { xs: 40, sm: 52, md: 60 },
                    height: { xs: 40, sm: 52, md: 60 },
                    borderRadius: '50%',
                    flexShrink: 0,
                  }}
                />

                {/* League Name + Format Badge */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0, flex: 1 }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontFamily: "'Satoshi', sans-serif",
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      fontSize: { xs: '1.6rem', sm: '2rem', md: '2.2rem' },
                      lineHeight: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: { xs: 'normal', sm: 'nowrap' },
                    }}
                  >
                    {league?.name || 'League'}
                  </Typography>

                  {/* Format Badge below league name */}
                  {league && (
                    <Box>
                      <Chip
                        label={league.format}
                        size="small"
                        sx={{
                          fontFamily: "'Satoshi', sans-serif",
                          fontSize: { xs: '0.6rem', sm: '0.65rem' },
                          fontWeight: 700,
                          height: { xs: 20, sm: 22 },
                          bgcolor: 'rgba(156, 39, 176, 0.12)',
                          color: '#9C27B0',
                          border: '1px solid rgba(156, 39, 176, 0.35)',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Right: Stats & Info - Stacks on mobile */}
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 1.5 },
                flexShrink: 0,
                flexWrap: 'wrap',
                justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                width: { xs: '100%', sm: 'auto' },
              }}>
                {/* Average Score - Ocean Blue/Neon Cyan */}
                {snapshot && snapshot.standings.length > 0 && (
                  <Chip
                    label={`Avg: ${(snapshot.standings.reduce((sum, s) => sum + s.totalPoints, 0) / snapshot.standings.length).toFixed(1)}`}
                    size="small"
                    sx={{
                      fontFamily: "'Satoshi', sans-serif",
                      fontSize: { xs: '0.7rem', sm: '0.8rem' },
                      fontWeight: 600,
                      height: { xs: 24, sm: 28 },
                      bgcolor: 'rgba(6,182,212,0.15)',
                      color: '#06b6d4',
                      border: '1px solid rgba(6,182,212,0.3)',
                      '&:hover': {
                        bgcolor: 'rgba(6,182,212,0.25)',
                      }
                    }}
                  />
                )}

                {/* PlayerPool Update Message */}
                {snapshot?.playerPoolVersion && (
                  <Chip
                    label={snapshot.playerPoolVersion}
                    size="small"
                    sx={{
                      fontFamily: "'Satoshi', sans-serif",
                      fontSize: { xs: '0.65rem', sm: '0.7rem' },
                      fontWeight: 600,
                      height: { xs: 22, sm: 24 },
                      maxWidth: { xs: '180px', sm: 'none' },
                      bgcolor: 'rgba(255, 152, 0, 0.15)',
                      color: '#FF9800',
                      border: '1px solid rgba(255, 152, 0, 0.4)',
                      '& .MuiChip-label': {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      },
                    }}
                  />
                )}

                {/* Relative Time */}
                {snapshot && (
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: { xs: '0.65rem', sm: '0.7rem' },
                      color: 'text.disabled',
                      letterSpacing: '0.3px',
                      whiteSpace: { xs: 'normal', sm: 'nowrap' },
                    }}
                  >
                    {(() => {
                      const now = new Date();
                      const updated = new Date(snapshot.snapshotDate);
                      const diffMs = now.getTime() - updated.getTime();
                      const diffMins = Math.floor(diffMs / 60000);
                      const diffHours = Math.floor(diffMins / 60);
                      const diffDays = Math.floor(diffHours / 24);

                      if (diffMins < 1) return 'Just now';
                      if (diffMins < 60) return `${diffMins}m ago`;
                      if (diffHours < 24) return `${diffHours}h ago`;
                      return `${diffDays}d ago`;
                    })()}
                  </Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Show "League starting soon" message if league hasn't started */}
        {!hasLeagueStarted && (
          <Card sx={{ mb: { xs: 2, sm: 3, md: 4 }, bgcolor: 'primary.50', borderLeft: '4px solid', borderColor: 'primary.main' }}>
            <CardContent sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AccessTime color="primary" sx={{ fontSize: { xs: 32, sm: 40 } }} />
                <Box>
                  <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                    League Starting Soon
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    The league will start on {new Date(league.startDate).toLocaleString()}
                    {timeUntilStart && ` (in ${timeUntilStart})`}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Podium for Top 5 */}
        {topFive.length > 0 && hasLeagueStarted && <CompactPodium topFive={topFive} league={league} />}

        {/* Full Leaderboard - Grid layout */}
        {snapshot && snapshot.standings.length > 5 && hasLeagueStarted && (
          <Box sx={{ mt: { xs: 2, sm: 3 } }}>
            {/* Responsive grid: 6 columns per row (configurable on line below) */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                  lg: 'repeat(5, 1fr)', // <-- Change this number to modify cards per row
                },
                gap: { xs: 1.25, sm: 1.75, md: 2 },
                '& > *': {
                  minWidth: 0, // Prevent grid items from expanding beyond column width
                },
              }}
            >
              {snapshot.standings.slice(5).map((standing) => (
                <CompactLeaderboardCard
                  key={standing.userId}
                  standing={standing}
                  isCurrentUser={standing.userId === userData?.uid}
                  league={league}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Best Performer & Rapid Riser - Below Leaderboard */}
        {hasLeagueStarted && snapshot && snapshot.standings.length > 0 && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: { xs: 2.5, sm: 3.5, md: 4 } }}>
              <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.08)' }} />
              <Typography sx={{
                fontFamily: "'Satoshi', sans-serif",
                fontWeight: 800,
                fontSize: { xs: '0.6rem', sm: '0.65rem' },
                letterSpacing: '3px',
                color: 'text.disabled',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>
                Round Highlights
              </Typography>
              <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.08)' }} />
            </Box>
            <LeaderboardHighlights snapshot={snapshot} poolSnapshot={poolSnapshot} />
          </>
        )}

        {/* Empty State */}
        {(!snapshot || snapshot.standings.length === 0) && hasLeagueStarted && (
          <Card sx={{ mt: { xs: 2, sm: 3, md: 4 } }}>
            <CardContent sx={{ textAlign: 'center', py: { xs: 4, sm: 6 }, px: { xs: 2, sm: 3 } }}>
              <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                No standings available yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                Standings will appear once squads are submitted.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Container>

      {/* AI Assistant Widget */}
      <LeagueAssistant leagueId={leagueId} />
    </Box>
  );
};

export default LeaderboardPage;