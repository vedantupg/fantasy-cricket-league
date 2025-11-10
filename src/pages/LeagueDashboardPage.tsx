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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider
} from '@mui/material';
import {
  SportsCricket,
  People,
  Schedule,
  EmojiEvents,
  Edit as EditIcon,
  Delete as DeleteIcon
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if current user is admin of this league
  const isAdmin = league && user && (league.creatorId === user.uid || league.adminIds.includes(user.uid));

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