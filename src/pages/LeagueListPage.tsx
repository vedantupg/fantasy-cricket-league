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
  Avatar,
  IconButton,
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
import { leagueService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import type { League } from '../types/database';

const LeagueListPage: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  const { user, userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadUserLeagues();
  }, [user]);

  const loadUserLeagues = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userLeagues = await leagueService.getForUser(user.uid);
      setLeagues(userLeagues);
    } catch (err: any) {
      setError('Failed to load leagues');
      console.error('Error loading leagues:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: League['status']) => {
    switch (status) {
      case 'squad_selection': return 'warning';
      case 'active': return 'success';
      case 'completed': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status: League['status']) => {
    switch (status) {
      case 'squad_selection': return 'Squad Selection';
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      default: return status;
    }
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

  const isSquadDeadlinePassed = (deadline: Date) => {
    return new Date() > new Date(deadline);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  const headerActions = (
    <Box display="flex" gap={2}>
      <Button
        variant="outlined"
        startIcon={<PersonAdd />}
        onClick={() => navigate('/leagues/join')}
      >
        Join League
      </Button>
      {userData?.isAdmin && (
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/leagues/create')}
        >
          Create League
        </Button>
      )}
    </Box>
  );

  return (
    <Box>
      <AppHeader actions={headerActions} />
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Page Header */}
        <Box mb={4}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            My Leagues
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your fantasy cricket leagues and squads
          </Typography>
        </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Leagues Grid */}
      {leagues.length === 0 ? (
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
          {leagues.map((league) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={league.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    transition: 'transform 0.2s ease-in-out'
                  }
                }}
                onClick={() => navigate(`/leagues/${league.id}`)}
              >
                <CardContent sx={{ flex: 1 }}>
                  {/* League Header */}
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" fontWeight="bold" noWrap>
                      {league.name}
                    </Typography>
                    <Chip 
                      label={getStatusText(league.status)}
                      color={getStatusColor(league.status)}
                      size="small"
                    />
                  </Box>

                  {/* Tournament Info */}
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {league.tournamentName}
                  </Typography>
                  
                  <Chip 
                    label={league.format}
                    variant="outlined"
                    size="small"
                    sx={{ mb: 2 }}
                  />

                  {/* League Stats */}
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <People fontSize="small" color="action" />
                    <Typography variant="body2">
                      {league.participants.length}/{league.maxParticipants} participants
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Schedule fontSize="small" color="action" />
                    <Typography variant="body2">
                      Starts {new Date(league.startDate).toLocaleDateString()}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <EmojiEvents fontSize="small" color="action" />
                    <Typography variant="body2">
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

                <CardActions>
                  <Button 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/leagues/${league.id}/squad`);
                    }}
                  >
                    Manage Squad
                  </Button>
                  <Button 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/leagues/${league.id}/leaderboard`);
                    }}
                  >
                    Leaderboard
                  </Button>
                  {isSquadDeadlinePassed(league.squadDeadline) && (
                    <Button 
                      size="small"
                      startIcon={<Groups />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/leagues/${league.id}/teams`);
                      }}
                    >
                      View Teams
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
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