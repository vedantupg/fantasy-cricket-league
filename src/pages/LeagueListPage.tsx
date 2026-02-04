import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Fab,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  SportsCricket,
  Add,
  People,
  EmojiEvents,
  Schedule,
  PersonAdd,
  ContentCopy,
  Groups
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService, squadService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import type { League, LeagueSquad } from '../types/database';
import colors from '../theme/colors';
import { alpha } from '@mui/material';

interface LeagueWithSquad {
  league: League;
  squad: LeagueSquad | null;
}

const LeagueListPage: React.FC = () => {
  const [leaguesWithSquads, setLeaguesWithSquads] = useState<LeagueWithSquad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { user, userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserLeagues = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const userLeagues = await leagueService.getForUser(user.uid);

        // Fetch squad data for each league
        const leaguesWithSquadData = await Promise.all(
          userLeagues.map(async (league) => {
            try {
              const squad = await squadService.getByUserAndLeague(user.uid, league.id);
              return { league, squad };
            } catch (err) {
              console.error(`Error fetching squad for league ${league.id}:`, err);
              return { league, squad: null };
            }
          })
        );

        setLeaguesWithSquads(leaguesWithSquadData);
      } catch (err: any) {
        setError('Failed to load leagues');
        console.error('Error loading leagues:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserLeagues();
  }, [user]);

  const getSmartStatus = (league: League, squad: LeagueSquad | null) => {
    const now = new Date();
    const deadlinePassed = now > new Date(league.squadDeadline);
    const leagueStarted = now > new Date(league.startDate);

    // League is completed
    if (league.status === 'completed') {
      const rank = squad?.rank || '-';
      return {
        label: `🏁 Completed - Rank #${rank}`,
        color: 'default' as const,
        icon: '🏁'
      };
    }

    // League is active
    if (leagueStarted && league.status === 'active') {
      const rank = squad?.rank || '-';
      return {
        label: `Active - Rank #${rank}`,
        color: 'success' as const,
        icon: ''
      };
    }

    // Deadline passed but user didn't submit
    if (deadlinePassed && !squad?.isSubmitted) {
      return {
        label: 'Missed Deadline',
        color: 'error' as const,
        icon: ''
      };
    }

    // User submitted their squad
    if (squad?.isSubmitted) {
      return {
        label: 'Squad Submitted',
        color: 'success' as const,
        icon: ''
      };
    }

    // Deadline approaching - need to submit
    if (!deadlinePassed) {
      const hoursLeft = Math.floor((new Date(league.squadDeadline).getTime() - now.getTime()) / (1000 * 60 * 60));
      if (hoursLeft < 24) {
        return {
          label: `Submit Squad (${hoursLeft}h left)`,
          color: 'error' as const,
          icon: ''
        };
      }
      return {
        label: 'Submit Squad',
        color: 'warning' as const,
        icon: ''
      };
    }

    // Default fallback
    return {
      label: league.status.replace('_', ' '),
      color: 'default' as const,
      icon: ''
    };
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const hasLeagueStarted = (startDate: Date) => {
    return new Date() > new Date(startDate);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      <AppHeader />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Page Header with Actions */}
        <Box mb={4} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              My Leagues
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your fantasy cricket leagues and squads
            </Typography>
          </Box>
          <Box display="flex" gap={2} flexWrap="wrap">
            {userData?.isAdmin && (
              <>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate('/leagues/create')}
                  sx={{
                    bgcolor: colors.blue.electric,
                    color: 'white',
                    fontWeight: 600,
                    px: 3,
                    py: 1.25,
                    boxShadow: colors.shadows.blue.md,
                    '&:hover': {
                      bgcolor: colors.blue.deep,
                      boxShadow: colors.shadows.blue.lg
                    }
                  }}
                >
                  Create League
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PersonAdd />}
                  onClick={() => navigate('/leagues/join')}
                  sx={{
                    borderColor: colors.orange.primary,
                    color: colors.orange.primary,
                    fontWeight: 500,
                    px: 3,
                    py: 1.25,
                    '&:hover': {
                      borderColor: colors.orange.dark,
                      bgcolor: alpha(colors.orange.primary, 0.08)
                    }
                  }}
                >
                  Join League
                </Button>
                <Button
                  variant="text"
                  startIcon={<Groups />}
                  onClick={() => navigate('/admin/player-pools')}
                  sx={{
                    color: colors.grey[400],
                    fontWeight: 500,
                    px: 2,
                    py: 1.25,
                    '&:hover': {
                      bgcolor: alpha(colors.grey[600], 0.08),
                      color: colors.grey[300]
                    }
                  }}
                >
                  Player Pools
                </Button>
              </>
            )}
            {!userData?.isAdmin && (
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={() => navigate('/leagues/join')}
                sx={{
                  bgcolor: colors.blue.electric,
                  color: 'white',
                  fontWeight: 600,
                  px: 3,
                  py: 1.25,
                  boxShadow: colors.shadows.blue.md,
                  '&:hover': {
                    bgcolor: colors.blue.deep,
                    boxShadow: colors.shadows.blue.lg
                  }
                }}
              >
                Join League
              </Button>
            )}
          </Box>
        </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Leagues Grid */}
      {leaguesWithSquads.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <SportsCricket sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No Leagues Yet
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={3}>
              {userData?.isAdmin ? 'Create your first league or join an existing one to get started!' : 'Join a league to get started!'}
            </Typography>
            <Box display="flex" gap={2} justifyContent="center">
              {userData?.isAdmin && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate('/leagues/create')}
                >
                  Create League
                </Button>
              )}
              <Button
                variant={userData?.isAdmin ? "outlined" : "contained"}
                startIcon={<PersonAdd />}
                onClick={() => navigate('/leagues/join')}
              >
                Join League
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {leaguesWithSquads.map(({ league, squad }) => {
            const status = getSmartStatus(league, squad);
            return (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={league.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  background: colors.background.paper,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    border: `1px solid ${colors.blue.electric}`,
                    boxShadow: colors.shadows.blue.md
                  }
                }}
                onClick={() => navigate(`/leagues/${league.id}`)}
              >
                <CardContent sx={{ flex: 1 }}>
                  {/* League Header */}
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" fontWeight={600} fontSize="1.125rem" noWrap sx={{ flex: 1, mr: 1 }}>
                      {league.name}
                    </Typography>
                    <Chip
                      label={status.label}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: status.color === 'success' ? colors.success.primary :
                                    status.color === 'warning' ? colors.warning.primary :
                                    status.color === 'error' ? colors.error.primary :
                                    colors.grey[600],
                        color: status.color === 'success' ? colors.success.primary :
                               status.color === 'warning' ? colors.warning.primary :
                               status.color === 'error' ? colors.error.primary :
                               colors.grey[400],
                        bgcolor: status.color === 'success' ? alpha(colors.success.primary, 0.12) :
                                status.color === 'warning' ? alpha(colors.warning.primary, 0.12) :
                                status.color === 'error' ? alpha(colors.error.primary, 0.12) :
                                alpha(colors.grey[600], 0.12),
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        borderWidth: 1.5
                      }}
                    />
                  </Box>

                  {/* Tournament Info */}
                  <Typography variant="body2" color="text.secondary" fontSize="0.8125rem" gutterBottom>
                    {league.tournamentName}
                  </Typography>

                  <Chip
                    label={league.format}
                    variant="outlined"
                    size="small"
                    sx={{
                      mb: 2,
                      borderColor: colors.orange.primary,
                      color: colors.orange.primary,
                      fontWeight: 600
                    }}
                  />

                  {/* League Stats */}
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <People fontSize="small" sx={{ color: colors.grey[500] }} />
                    <Typography variant="body2" fontSize="0.75rem" color="text.secondary">
                      {league.participants.length}/{league.maxParticipants} participants
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Schedule fontSize="small" sx={{ color: colors.grey[500] }} />
                    <Typography variant="body2" fontSize="0.75rem" color="text.secondary">
                      Starts {new Date(league.startDate).toLocaleDateString()}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <EmojiEvents fontSize="small" sx={{ color: colors.grey[500] }} />
                    <Typography variant="body2" fontSize="0.75rem" color="text.secondary">
                      {league.maxTransfers} transfers allowed
                    </Typography>
                  </Box>

                  {/* League Code */}
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    gap={1} 
                    sx={{ 
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      p: 1,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.selected'
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyCode(league.code);
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      Code: {league.code}
                    </Typography>
                    <ContentCopy 
                      fontSize="small" 
                      color={copiedCode === league.code ? "success" : "action"}
                    />
                    {copiedCode === league.code && (
                      <Typography variant="caption" color="success.main">
                        Copied!
                      </Typography>
                    )}
                  </Box>
                </CardContent>

                <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 1 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/leagues/${league.id}/squad`);
                    }}
                    sx={{
                      bgcolor: colors.blue.electric,
                      color: 'white',
                      fontWeight: 600,
                      px: 2,
                      py: 0.75,
                      fontSize: '0.8125rem',
                      '&:hover': {
                        bgcolor: colors.blue.deep
                      }
                    }}
                  >
                    Manage Squad
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/leagues/${league.id}/leaderboard`);
                    }}
                    sx={{
                      color: colors.grey[400],
                      fontWeight: 500,
                      fontSize: '0.8125rem',
                      '&:hover': {
                        bgcolor: alpha(colors.grey[600], 0.08),
                        color: colors.grey[300]
                      }
                    }}
                  >
                    Leaderboard
                  </Button>
                  {hasLeagueStarted(league.startDate) && (
                    <Button
                      variant="text"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/leagues/${league.id}/teams`);
                      }}
                      sx={{
                        color: colors.grey[400],
                        fontWeight: 500,
                        fontSize: '0.8125rem',
                        '&:hover': {
                          bgcolor: alpha(colors.grey[600], 0.08),
                          color: colors.grey[300]
                        }
                      }}
                    >
                      Teams
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
            );
          })}
        </Grid>
      )}

      {/* Floating Action Button for Mobile - Admin Only */}
      {userData?.isAdmin && (
        <Fab
          color="primary"
          sx={{ 
            position: 'fixed', 
            bottom: 16, 
            right: 16,
            display: { xs: 'flex', md: 'none' }
          }}
          onClick={() => navigate('/leagues/create')}
        >
          <Add />
        </Fab>
      )}
      </Container>
    </Box>
  );
};

export default LeagueListPage;