import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { SportsCricket, People, EmojiEvents } from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import LeagueRulesDisplay from '../components/league/LeagueRulesDisplay';
import type { League } from '../types/database';

/**
 * Public shareable league invite page.
 * Accessible at /invite/:code without authentication.
 * Logged-in users can join directly; guests are redirected to login.
 */
const LeagueInvitePage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const fetchLeague = async () => {
      if (!code) {
        setError('Invalid invite link.');
        setLoading(false);
        return;
      }
      try {
        const found = await leagueService.getByCode(code.toUpperCase());
        if (!found) {
          setError('League not found. This invite link may be invalid or expired.');
        } else {
          setLeague(found);
        }
      } catch (err) {
        setError('Failed to load league details.');
      } finally {
        setLoading(false);
      }
    };
    fetchLeague();
  }, [code]);

  const handleJoin = async () => {
    if (!league || !user) return;
    setJoining(true);
    try {
      await leagueService.joinLeague(league.id, user.uid);
      setJoined(true);
      setTimeout(() => navigate(`/leagues/${league.id}`), 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to join league.');
    } finally {
      setJoining(false);
    }
  };

  const handleSignIn = () => {
    navigate('/login', { state: { from: location } });
  };

  const handleRegister = () => {
    navigate('/register', { state: { from: location } });
  };

  const isAlreadyMember = user && league && league.participants.includes(user.uid);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader />
      <Container maxWidth="sm" sx={{ py: 6 }}>
        {loading && (
          <Box display="flex" justifyContent="center" mt={8}>
            <CircularProgress />
          </Box>
        )}

        {!loading && error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && league && (
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              {/* Icon + League Name */}
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <SportsCricket sx={{ fontSize: 40, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    {league.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {league.tournamentName}
                  </Typography>
                </Box>
              </Box>

              {/* Format chip */}
              <Chip
                label={league.format}
                variant="outlined"
                size="small"
                sx={{ mb: 2, fontWeight: 600, borderColor: 'warning.main', color: 'warning.main' }}
              />

              {/* Stats */}
              <Box display="flex" gap={3} mb={3}>
                <Box display="flex" alignItems="center" gap={0.75}>
                  <People fontSize="small" sx={{ color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {league.participants.length}/{league.maxParticipants} participants
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={0.75}>
                  <EmojiEvents fontSize="small" sx={{ color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Starts {new Date(league.startDate).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>

              {/* League Rules */}
              <Box mb={3}>
                <LeagueRulesDisplay league={league} />
              </Box>

              {/* CTA */}
              {joined ? (
                <Alert severity="success">
                  You've joined the league! Redirecting...
                </Alert>
              ) : isAlreadyMember ? (
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => navigate(`/leagues/${league.id}`)}
                  sx={{ py: 1.5 }}
                >
                  Go to League Dashboard
                </Button>
              ) : user ? (
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleJoin}
                  disabled={joining || league.participants.length >= league.maxParticipants}
                  sx={{ py: 1.5, fontWeight: 600 }}
                >
                  {joining ? <CircularProgress size={22} sx={{ color: 'inherit' }} /> :
                    league.participants.length >= league.maxParticipants ? 'League Full' : 'Join League'}
                </Button>
              ) : (
                <Box display="flex" flexDirection="column" gap={1.5}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleSignIn}
                    sx={{ py: 1.5, fontWeight: 600 }}
                  >
                    Sign In to Join
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={handleRegister}
                    sx={{ py: 1.5 }}
                  >
                    Create Account
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </Container>
    </Box>
  );
};

export default LeagueInvitePage;
