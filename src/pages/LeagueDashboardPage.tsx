import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  SportsCricket,
  People,
  Schedule,
  EmojiEvents
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import type { League } from '../types/database';

const LeagueDashboardPage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (leagueId) {
      loadLeague();
    }
  }, [leagueId]);

  const loadLeague = async () => {
    if (!leagueId) return;

    try {
      setLoading(true);
      const leagueData = await leagueService.getById(leagueId);
      
      if (!leagueData) {
        setError('League not found');
        return;
      }
      
      setLeague(leagueData);
    } catch (err: any) {
      setError('Failed to load league');
      console.error('Error loading league:', err);
    } finally {
      setLoading(false);
    }
  };

  // Removed back button - users can use navbar navigation

  if (loading) {
    return (
      <Box>
        <AppHeader />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <CircularProgress size={60} />
        </Box>
      </Box>
    );
  }

  if (error || !league) {
    return (
      <Box>
        <AppHeader />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="error">{error || 'League not found'}</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <AppHeader />
      <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {league.name}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {league.tournamentName} • {league.format}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* League Info */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                League Information
              </Typography>
              
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <People fontSize="small" color="action" />
                <Typography variant="body2">
                  {league.participants.length}/{league.maxParticipants} participants
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Schedule fontSize="small" color="action" />
                <Typography variant="body2">
                  Tournament: {new Date(league.startDate).toLocaleDateString()} - {new Date(league.endDate).toLocaleDateString()}
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <EmojiEvents fontSize="small" color="action" />
                <Typography variant="body2">
                  {league.maxTransfers} transfers allowed
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary">
                Squad deadline: {new Date(league.squadDeadline).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              
              <Button
                fullWidth
                variant="contained"
                sx={{ mb: 2 }}
                onClick={() => navigate(`/leagues/${leagueId}/squad`)}
              >
                Manage Squad
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                sx={{ mb: 2 }}
                onClick={() => navigate(`/leagues/${leagueId}/leaderboard`)}
              >
                View Leaderboard
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/dashboard')}
              >
                Back to Leagues
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      </Container>
    </Box>
  );
};

export default LeagueDashboardPage;