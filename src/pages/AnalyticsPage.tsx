import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Typography,
  Button,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import AppHeader from '../components/common/AppHeader';
import LeagueNav from '../components/common/LeagueNav';
import LeagueAnalytics from '../components/leaderboard/LeagueAnalytics';
import { leaderboardSnapshotService, leagueService, squadService } from '../services/firestore';
import type { LeaderboardSnapshot, League, LeagueSquad } from '../types/database';

const AnalyticsPage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();

  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [squads, setSquads] = useState<LeagueSquad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
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

      // Fetch latest snapshot
      const latestSnapshot = await leaderboardSnapshotService.getLatest(leagueId);
      setSnapshot(latestSnapshot);

      // Fetch all squads for advanced analytics
      const squadsData = await squadService.getByLeague(leagueId);
      setSquads(squadsData);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    loadAnalytics();

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
  }, [leagueId, loadAnalytics]);

  const handleRefresh = async () => {
    if (!leagueId) return;

    try {
      setLoading(true);
      await leaderboardSnapshotService.create(leagueId);
      await loadAnalytics();
    } catch (err) {
      console.error('Error refreshing analytics:', err);
      setError('Failed to refresh analytics');
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
            leagueName={league?.name || 'Loading...'}
            leagueId={leagueId}
            currentPage="Analytics"
            actions={quickActions}
          />
        )}
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3, md: 4 }, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  if (!league || (error && !snapshot)) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppHeader />
        {leagueId && league && (
          <LeagueNav
            leagueName={league.name}
            leagueId={leagueId}
            currentPage="Analytics"
            actions={quickActions}
          />
        )}
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

  // Check if league has started
  const hasLeagueStarted = league && new Date() >= new Date(league.startDate);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader />
      {leagueId && (
        <LeagueNav
          leagueName={league.name}
          leagueId={leagueId}
          currentPage="Analytics"
          actions={quickActions}
        />
      )}

      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3, md: 4 } }}>
        {/* League Info */}
        <Card sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
          <CardContent sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 1.5, sm: 2, md: 2.5 } }}>
            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              League Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              {league?.tournamentName || 'Tournament'}
              {snapshot ? ` • Last updated: ${snapshot.snapshotDate.toLocaleString()}` : ''}
            </Typography>
          </CardContent>
        </Card>

        {/* Analytics Content */}
        {!hasLeagueStarted && (
          <Card sx={{ bgcolor: 'primary.50', borderLeft: '4px solid', borderColor: 'primary.main' }}>
            <CardContent sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
              <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Analytics Not Yet Available
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                Analytics will be available once the league starts on {new Date(league.startDate).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        )}

        {hasLeagueStarted && snapshot && snapshot.standings.length > 0 ? (
          <LeagueAnalytics snapshot={snapshot} league={league} squads={squads} />
        ) : hasLeagueStarted ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: { xs: 4, sm: 6 }, px: { xs: 2, sm: 3 } }}>
              <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                No analytics data available yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                Analytics will appear once squads are submitted and points are earned.
              </Typography>
            </CardContent>
          </Card>
        ) : null}
      </Container>
    </Box>
  );
};

export default AnalyticsPage;
