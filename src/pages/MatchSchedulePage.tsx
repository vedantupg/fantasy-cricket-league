import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { ArrowBack, Upload } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import LeagueNav from '../components/common/LeagueNav';
import MatchScheduleViewer from '../components/schedule/MatchScheduleViewer';
import type { League } from '../types/database';
import colors from '../theme/colors';

const MatchSchedulePage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = league && user && (league.creatorId === user.uid || league.adminIds.includes(user.uid));

  useEffect(() => {
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

    if (leagueId) {
      loadLeague();
    }
  }, [leagueId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error || !league) {
    return (
      <Box>
        <AppHeader />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">{error || 'League not found'}</Alert>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/leagues')} sx={{ mt: 2 }}>
            Back to Leagues
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <AppHeader />
      <LeagueNav
        leagueName={league.name}
        leagueId={leagueId!}
        currentPage="Match Schedule"
      />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Match Schedule
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {league.tournamentName} • {league.format} Format
          </Typography>
        </Box>

        {/* Admin Upload Button */}
        {isAdmin && (
          <Box sx={{ mb: 3 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                As an admin, you can upload the match schedule for this league.
              </Typography>
            </Alert>
            <Button
              variant="contained"
              startIcon={<Upload />}
              onClick={() => navigate(`/leagues/${leagueId}/schedule/upload`)}
              sx={{
                bgcolor: colors.blue.electric,
                color: 'white',
                fontWeight: 600,
                px: 3,
                py: 1.25,
                '&:hover': {
                  bgcolor: colors.blue.deep,
                  boxShadow: colors.shadows.blue.md
                }
              }}
            >
              Upload/Update Schedule
            </Button>
          </Box>
        )}

        {/* Schedule Viewer */}
        <MatchScheduleViewer
          matches={league.matchSchedule || []}
          highlightMatchNumber={undefined}
        />
      </Container>
    </Box>
  );
};

export default MatchSchedulePage;
