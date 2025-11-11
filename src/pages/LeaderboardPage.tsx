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
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import AppHeader from '../components/common/AppHeader';
import LeagueNav from '../components/common/LeagueNav';
import Podium from '../components/leaderboard/Podium';
import LeaderboardCard from '../components/leaderboard/LeaderboardCard';
import LeaderboardHighlights from '../components/leaderboard/LeaderboardHighlights';
import { leaderboardSnapshotService, leagueService } from '../services/firestore';
import type { LeaderboardSnapshot, League } from '../types/database';

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

      // Fetch latest snapshot
      const latestSnapshot = await leaderboardSnapshotService.getLatest(leagueId);

      // If no snapshot exists, create one
      if (!latestSnapshot) {
        await leaderboardSnapshotService.create(leagueId);
        const newSnapshot = await leaderboardSnapshotService.getLatest(leagueId);
        setSnapshot(newSnapshot);
      } else {
        setSnapshot(latestSnapshot);
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError('Failed to load leaderboard. Please try again.');
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
        <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  if (error || !snapshot) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppHeader />
        {leagueId && league && (
          <LeagueNav
            leagueName={league.name}
            leagueId={leagueId}
            currentPage="Leaderboard"
            actions={quickActions}
          />
        )}
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">{error || 'No leaderboard data available'}</Alert>
        </Container>
      </Box>
    );
  }

  const topThree = snapshot.standings.slice(0, 3);
  const userStanding = snapshot.standings.find((s) => s.userId === userData?.uid);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader />
      {league && leagueId && (
        <LeagueNav
          leagueName={league.name}
          leagueId={leagueId}
          currentPage="Leaderboard"
          actions={quickActions}
        />
      )}

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* League Info */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {league?.tournamentName || 'Tournament'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {snapshot.standings.length} participants • Last updated:{' '}
                  {snapshot.snapshotDate.toLocaleString()}
                </Typography>
              </Box>
              {userStanding && (
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h4" fontWeight="bold" color="primary">
                    #{userStanding.rank}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Your Rank
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Podium for Top 3 */}
        {topThree.length > 0 && <Podium topThree={topThree} />}

        <Divider sx={{ my: 4 }} />

        {/* Best Performer & Rapid Riser */}
        <LeaderboardHighlights snapshot={snapshot} />

        {/* Full Leaderboard */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Full Standings
          </Typography>

          {/* Show all standings */}
          {snapshot.standings.map((standing) => (
            <LeaderboardCard
              key={standing.userId}
              standing={standing}
              isCurrentUser={standing.userId === userData?.uid}
            />
          ))}
        </Box>

        {/* Empty State */}
        {snapshot.standings.length === 0 && (
          <Card sx={{ mt: 4 }}>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No standings available yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Standings will appear once squads are submitted and matches begin.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Container>
    </Box>
  );
};

export default LeaderboardPage;