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
  Divider,
  Chip,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { Refresh as RefreshIcon, AccessTime } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import AppHeader from '../components/common/AppHeader';
import LeagueNav from '../components/common/LeagueNav';
import CompactPodium from '../components/leaderboard/CompactPodium';
import CompactLeaderboardCard from '../components/leaderboard/CompactLeaderboardCard';
import LeaderboardHighlights from '../components/leaderboard/LeaderboardHighlights';
import { leaderboardSnapshotService, leagueService, squadService } from '../services/firestore';
import type { LeaderboardSnapshot, League, StandingEntry } from '../types/database';
import { calculateRankStreaks, attachStreaksToStandings } from '../utils/streakCalculator';

const LeaderboardPage: React.FC = () => {
  const { userData } = useAuth();
  const { leagueId } = useParams<{ leagueId: string }>();

  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [league, setLeague] = useState<League | null>(null);
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
                totalPoints: squad.totalPoints || 0,
                captainPoints: squad.captainPoints || 0,
                viceCaptainPoints: squad.viceCaptainPoints || 0,
                xFactorPoints: squad.xFactorPoints || 0,
                rank: index + 1,
                pointsGainedToday: 0,
                captainId: squad.captainId,
                viceCaptainId: squad.viceCaptainId,
                xFactorId: squad.xFactorId,
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
            totalPoints: squad.totalPoints || 0,
            captainPoints: squad.captainPoints || 0,
            viceCaptainPoints: squad.viceCaptainPoints || 0,
            xFactorPoints: squad.xFactorPoints || 0,
            rank: index + 1,
            pointsGainedToday: 0,
            captainId: squad.captainId,
            viceCaptainId: squad.viceCaptainId,
            xFactorId: squad.xFactorId,
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
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppHeader />
        {leagueId && (
          <LeagueNav
            leagueName="Loading..."
            leagueId={leagueId}
            currentPage="Leaderboard"
            actions={quickActions}
          />
        )}
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3, md: 4 }, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
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
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
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
  const userStanding = snapshot?.standings.find((s) => s.userId === userData?.uid);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
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
          // 🎨 Card Background - Remove grey, make transparent
          bgcolor: 'rgba(99,110,250,0.05)', // Try: 'rgba(0,0,0,0.2)', 'rgba(99,110,250,0.05)', or any color
          boxShadow: 'none', // Remove shadow for cleaner look
        }}>
          <CardContent sx={{
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 1.25, sm: 1.5, md: 1.75 }, // 🎨 Reduced from { xs: 2, sm: 2.5, md: 3 } for shorter height
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, sm: 3 }, justifyContent: 'space-between' }}>
              {/* Left: FCL Logo + League Name and Version Chip */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, sm: 3 }, flex: 1, minWidth: 0 }}>
                {/* FCL Logo */}
                <Box
                  component="img"
                  src="/logo192.png"
                  alt="FCL Logo"
                  sx={{
                    width: { xs: 50, sm: 60, md: 70 },
                    height: { xs: 50, sm: 60, md: 70 },
                    borderRadius: '50%',
                    flexShrink: 0,
                  }}
                />

                {/* League Name and Version Chip */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    sx={{
                      fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                      mb: 0.5,
                    }}
                  >
                    {league?.name || 'League'}
                  </Typography>
                  {snapshot?.playerPoolVersion && (
                    <Chip
                      label={snapshot.playerPoolVersion}
                      color="primary"
                      variant="filled" // 🎨 Changed from "outlined" to "filled" for darker chip
                      size="small"
                      sx={{
                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                        fontWeight: 600,
                        // 🎨 CHIP CUSTOMIZATION - Make it darker
                        bgcolor: 'rgba(63,81,181,0.8)', // Try: '#3f51b5', '#1976d2', 'rgba(63,81,181,0.8)'
                        color: 'white', // Text color
                        '&:hover': {
                          bgcolor: 'primary.dark', // Darker on hover
                        }
                      }}
                    />
                  )}
                </Box>
              </Box>

              {/* Right: Last Updated Time */}
              {snapshot && (
                <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                    Last updated
                  </Typography>
                  <Typography variant="body2" fontWeight="500" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    {snapshot.snapshotDate.toLocaleString()}
                  </Typography>
                </Box>
              )}
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
        {topFive.length > 0 && hasLeagueStarted && <CompactPodium topFive={topFive} />}

        {/* Full Leaderboard - Grid layout */}
        {snapshot && snapshot.standings.length > 5 && hasLeagueStarted && (
          <Box sx={{ mt: { xs: 3, sm: 4 } }}>
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
                gap: { xs: 2, sm: 2.5, md: 3 },
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
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Best Performer & Rapid Riser - Below Leaderboard */}
        {hasLeagueStarted && snapshot && snapshot.standings.length > 0 && (
          <>
            <Divider sx={{ my: { xs: 2, sm: 3, md: 4 } }} />
            <LeaderboardHighlights snapshot={snapshot} />
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
    </Box>
  );
};

export default LeaderboardPage;