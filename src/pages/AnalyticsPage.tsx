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
import LeagueAssistant from '../components/LeagueAssistant';
import { leaderboardSnapshotService, leagueService, squadService, playerPoolService } from '../services/firestore';
import type { LeaderboardSnapshot, League, LeagueSquad, PlayerPool } from '../types/database';
import colors from '../theme/colors';
import { alpha } from '@mui/material/styles';

const cardSx = {
  background: `linear-gradient(145deg, ${alpha(colors.blue.navy, 0.95)} 0%, ${alpha('#0A1929', 0.98)} 100%)`,
  border: `1px solid ${colors.border.default}`,
  borderRadius: 4,
  boxShadow: `0 20px 60px rgba(0,0,0,0.4)`,
  overflow: 'hidden',
  position: 'relative' as const,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '1px',
    background: `linear-gradient(90deg, transparent, ${alpha(colors.blue.electric, 0.6)}, transparent)`,
  }
};

const AnalyticsPage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();

  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [squads, setSquads] = useState<LeagueSquad[]>([]);
  const [playerPool, setPlayerPool] = useState<PlayerPool | null>(null);
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

      // Fetch player pool for top performers
      if (leagueData.playerPoolId) {
        const playerPoolData = await playerPoolService.getById(leagueData.playerPoolId);
        setPlayerPool(playerPoolData);
      }
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
      sx={{
        bgcolor: colors.blue.electric,
        color: 'white',
        fontWeight: 600,
        boxShadow: colors.shadows.blue.sm,
        transition: 'all 0.2s ease',
        '&:hover': {
          bgcolor: colors.blue.deep,
          boxShadow: colors.shadows.blue.md,
          transform: 'translateY(-1px)',
        }
      }}
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
        <Box sx={{
          position: 'relative', pl: 3, py: 2, mb: 4,
          '&::before': {
            content: '""', position: 'absolute',
            left: 0, top: 0, bottom: 0, width: '4px', borderRadius: '4px',
            background: `linear-gradient(180deg, ${colors.blue.electric}, ${alpha(colors.blue.electric, 0.2)})`,
          }
        }}>
          <Typography variant="h4" fontWeight={800} sx={{
            letterSpacing: '-0.02em',
            background: `linear-gradient(90deg, ${colors.text.primary} 60%, ${colors.blue.light})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            League Analytics
          </Typography>
          <Typography variant="body2" sx={{ color: alpha(colors.text.secondary, 0.6), mt: 0.4 }}>
            {league?.tournamentName || 'Tournament'}
          </Typography>
        </Box>

        {/* League Info */}
        <Card sx={{ mb: { xs: 2, sm: 3, md: 4 }, ...cardSx }}>
          <CardContent sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 1.5, sm: 2, md: 2.5 } }}>
            <Typography variant="h6" fontWeight="bold" sx={{
              fontSize: { xs: '1rem', sm: '1.25rem' },
              background: `linear-gradient(90deg, ${colors.text.primary} 60%, ${colors.blue.light})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              League Analytics
            </Typography>
            <Typography variant="body2" sx={{ color: alpha(colors.text.secondary, 0.6), fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              {league?.tournamentName || 'Tournament'}
              {snapshot ? ` • Last updated: ${snapshot.snapshotDate.toLocaleString()}` : ''}
            </Typography>
          </CardContent>
        </Card>

        {/* Analytics Content */}
        {!hasLeagueStarted && (
          <Card sx={{
            ...cardSx,
            '&::after': {
              content: '""',
              position: 'absolute',
              left: 0, top: 0, bottom: 0, width: '4px',
              background: `linear-gradient(180deg, ${colors.warning.primary}, ${alpha(colors.warning.primary, 0.2)})`,
            }
          }}>
            <CardContent sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
              <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, color: colors.warning.light }}>
                Analytics Not Yet Available
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                Analytics will be available once the league starts on {new Date(league.startDate).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        )}

        {hasLeagueStarted && snapshot && snapshot.standings.length > 0 ? (
          <LeagueAnalytics snapshot={snapshot} league={league} squads={squads} playerPool={playerPool} />
        ) : hasLeagueStarted ? (
          <Card sx={cardSx}>
            <CardContent sx={{ textAlign: 'center', py: { xs: 4, sm: 6 }, px: { xs: 2, sm: 3 } }}>
              <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, color: alpha(colors.text.secondary, 0.5) }}>
                No analytics data available yet
              </Typography>
              <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, color: alpha(colors.text.secondary, 0.5) }}>
                Analytics will appear once squads are submitted and points are earned.
              </Typography>
            </CardContent>
          </Card>
        ) : null}
      </Container>
      <LeagueAssistant leagueId={leagueId} />
    </Box>
  );
};

export default AnalyticsPage;
