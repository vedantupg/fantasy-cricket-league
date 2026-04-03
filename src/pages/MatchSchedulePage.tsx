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
import LeagueAssistant from '../components/LeagueAssistant';
import type { League } from '../types/database';
import colors from '../theme/colors';
import { alpha } from '@mui/material/styles';

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
            Match Schedule
          </Typography>
          <Typography variant="body2" sx={{ color: alpha(colors.text.secondary, 0.6), mt: 0.4 }}>
            {league.tournamentName} • {league.format} Format
          </Typography>
        </Box>

        {/* Admin Upload Button */}
        {isAdmin && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{
              mb: 2,
              p: 2,
              bgcolor: alpha(colors.blue.electric, 0.06),
              border: `1px solid ${colors.border.default}`,
              borderRadius: 2,
            }}>
              <Typography variant="body2" gutterBottom>
                As an admin, you can upload the match schedule for this league.
              </Typography>
            </Box>
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
                boxShadow: colors.shadows.blue.sm,
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: colors.blue.deep,
                  boxShadow: colors.shadows.blue.md,
                  transform: 'translateY(-1px)',
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
      <LeagueAssistant leagueId={leagueId} />
    </Box>
  );
};

export default MatchSchedulePage;
