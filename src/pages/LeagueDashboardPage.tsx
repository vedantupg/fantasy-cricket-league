import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText
} from '@mui/material';
import {
  People,
  Schedule,
  EmojiEvents,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarMonth
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService, userService, squadService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import type { League, User } from '../types/database';

interface ParticipantInfo {
  userId: string;
  userData: User | null;
  hasSubmittedSquad: boolean;
}

const LeagueDashboardPage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if current user is admin of this league
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

  // Load participant details for admin
  useEffect(() => {
    const loadParticipants = async () => {
      if (!league || !isAdmin || !leagueId) return;

      try {
        setLoadingParticipants(true);

        // Fetch all squads for this league
        const squads = await squadService.getByLeague(leagueId);

        // Fetch user data for each participant
        const participantData = await Promise.all(
          league.participants.map(async (userId) => {
            try {
              const userData = await userService.getById(userId);
              const hasSubmittedSquad = squads.some(squad => squad.userId === userId && squad.isSubmitted);
              return {
                userId,
                userData,
                hasSubmittedSquad
              };
            } catch (err) {
              console.error(`Error fetching user ${userId}:`, err);
              return {
                userId,
                userData: null,
                hasSubmittedSquad: false
              };
            }
          })
        );

        setParticipants(participantData);
      } catch (err: any) {
        console.error('Error loading participants:', err);
      } finally {
        setLoadingParticipants(false);
      }
    };

    loadParticipants();
  }, [league, isAdmin, leagueId]);

  const handleEditLeague = () => {
    navigate(`/leagues/${leagueId}/edit`);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!leagueId) return;

    try {
      setDeleting(true);
      await leagueService.delete(leagueId);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Error deleting league:', err);
      setError('Failed to delete league. Please try again.');
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

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
                sx={{ mb: 2 }}
                startIcon={<CalendarMonth />}
                onClick={() => navigate(`/leagues/${leagueId}/schedule`)}
              >
                Match Schedule
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

          {/* Admin Actions - Only visible to league admins */}
          {isAdmin && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Admin Actions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Manage this league
                </Typography>

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<EditIcon />}
                  sx={{ mb: 2 }}
                  onClick={handleEditLeague}
                >
                  Edit League
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteClick}
                >
                  Delete League
                </Button>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Participants List - Admin Only */}
      {isAdmin && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">
                Participants ({league.participants.length}/{league.maxParticipants})
              </Typography>
              {loadingParticipants && <CircularProgress size={20} />}
            </Box>

            {participants.length === 0 && !loadingParticipants ? (
              <Typography variant="body2" color="text.secondary">
                No participants have joined yet.
              </Typography>
            ) : (
              <List sx={{ p: 0 }}>
                {participants.map((participant, index) => (
                  <ListItem
                    key={participant.userId}
                    sx={{
                      borderBottom: index < participants.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      px: 0,
                      py: 1.5
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={participant.userData?.profilePicUrl}
                        sx={{ bgcolor: 'primary.main' }}
                      >
                        {participant.userData?.displayName?.charAt(0) || '?'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={participant.userData?.displayName || 'Unknown User'}
                      secondary={participant.userData?.email || participant.userId}
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                    <Chip
                      label={participant.hasSubmittedSquad ? 'Squad Submitted' : 'Not Submitted'}
                      color={participant.hasSubmittedSquad ? 'success' : 'default'}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete League?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete "{league?.name}"? This action cannot be undone.
            All squads, leaderboard data, and league information will be permanently deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleting}
            autoFocus
          >
            {deleting ? 'Deleting...' : 'Delete League'}
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </Box>
  );
};

export default LeagueDashboardPage;