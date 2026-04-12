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
import { alpha } from '@mui/material/styles';
import {
  People,
  Schedule,
  EmojiEvents,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarMonth,
  ArrowBack,
  AdminPanelSettings,
  SwapHoriz as SwapHorizIcon
} from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService, userService, squadService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import LeagueAssistant from '../components/LeagueAssistant';
import type { League, User } from '../types/database';
import colors from '../theme/colors';

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

  // Derive league status
  const now = new Date();
  const leagueEnded = league.endDate ? now > new Date(league.endDate) : league.status === 'completed';
  const leagueStarted = now > new Date(league.startDate);
  const statusLabel = leagueEnded ? 'Completed' : leagueStarted ? 'In Progress' : 'Upcoming';
  const statusColor = leagueEnded ? colors.grey[500] : leagueStarted ? colors.success.primary : colors.orange.primary;

  // Shared card style
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
      top: 0,
      left: 0,
      right: 0,
      height: '1px',
      background: `linear-gradient(90deg, transparent, ${alpha(colors.blue.electric, 0.6)}, transparent)`,
    }
  };

  return (
    <Box>
      <AppHeader />
      <Container maxWidth="lg" sx={{ py: 4 }}>

      {/* Back navigation */}
      <Button
        variant="text"
        startIcon={<ArrowBack fontSize="small" />}
        onClick={() => navigate('/dashboard')}
        sx={{
          mb: 2,
          color: alpha(colors.text.secondary, 0.7),
          fontWeight: 500,
          fontSize: '0.85rem',
          pl: 0,
          '&:hover': {
            color: colors.text.secondary,
            bgcolor: 'transparent',
          },
        }}
      >
        Back to Leagues
      </Button>

      {/* Header */}
      <Box
        mb={4}
        sx={{
          position: 'relative',
          pl: 3,
          py: 2,
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            borderRadius: '4px',
            background: `linear-gradient(180deg, ${colors.blue.electric}, ${alpha(colors.blue.electric, 0.2)})`,
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5, flexWrap: 'wrap' }}>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{
              fontFamily: '"Montserrat", sans-serif',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              background: `linear-gradient(90deg, ${colors.text.primary} 60%, ${colors.blue.light})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {league.name}
          </Typography>
          {/* Status badge */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.25,
              py: 0.4,
              borderRadius: 1.5,
              border: `1px solid ${alpha(statusColor, 0.4)}`,
              bgcolor: alpha(statusColor, 0.08),
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: statusColor,
                ...(leagueStarted && !leagueEnded && {
                  boxShadow: `0 0 5px ${statusColor}`,
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.4 },
                  }
                })
              }}
            />
            <Typography variant="caption" sx={{ color: statusColor, fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.05em' }}>
              {statusLabel}
            </Typography>
          </Box>
        </Box>
        <Typography variant="body2" sx={{ color: alpha(colors.text.secondary, 0.6), letterSpacing: '0.01em' }}>
          {league.tournamentName} • {league.format}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* League Info */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={cardSx}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight={600} sx={{ mb: 3 }}>
                League Information
              </Typography>

              <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
                <People fontSize="small" sx={{ color: colors.blue.light }} />
                <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                  <Box component="span" sx={{ color: colors.text.primary, fontWeight: 600 }}>
                    {league.participants.length}/{league.maxParticipants}
                  </Box>{' '}participants
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
                <Schedule fontSize="small" sx={{ color: colors.blue.light }} />
                <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                  Tournament:{' '}
                  <Box component="span" sx={{ color: colors.text.primary, fontWeight: 500 }}>
                    {new Date(league.startDate).toLocaleDateString()} – {new Date(league.endDate).toLocaleDateString()}
                  </Box>
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
                <EmojiEvents fontSize="small" sx={{ color: colors.blue.light }} />
                <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                  <Box component="span" sx={{ color: colors.text.primary, fontWeight: 600 }}>
                    {league.maxTransfers}
                  </Box>{' '}transfers allowed
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  pt: 2,
                  borderTop: `1px solid ${colors.border.subtle}`,
                }}
              >
                <CalendarMonth fontSize="small" sx={{ color: alpha(colors.warning.primary, 0.8) }} />
                <Typography variant="body2" sx={{ color: alpha(colors.text.secondary, 0.8) }}>
                  Squad deadline:{' '}
                  <Box component="span" sx={{ color: colors.warning.light, fontWeight: 500 }}>
                    {new Date(league.squadDeadline).toLocaleString()}
                  </Box>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={cardSx}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight={600} sx={{ mb: 2.5 }}>
                Quick Actions
              </Typography>

              {/* Manage Squad — primary CTA */}
              <Button
                fullWidth
                variant="contained"
                sx={{
                  mb: 1.5,
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  bgcolor: colors.blue.electric,
                  boxShadow: `0 4px 14px ${alpha(colors.blue.electric, 0.35)}`,
                  '&:hover': {
                    bgcolor: colors.blue.deep,
                    boxShadow: `0 6px 18px ${alpha(colors.blue.electric, 0.5)}`,
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.2s ease',
                }}
                onClick={() => navigate(`/leagues/${leagueId}/squad`)}
              >
                Manage Squad
              </Button>

              {/* Make Transfer — enabled when any transfer type is active */}
              {(() => {
                const now = new Date();
                const midSeasonCfg = league?.transferTypes?.midSeasonTransfers;
                const midSeasonOpen = midSeasonCfg?.enabled &&
                  midSeasonCfg.windowStartDate &&
                  midSeasonCfg.windowEndDate &&
                  now >= new Date(midSeasonCfg.windowStartDate) &&
                  now <= new Date(midSeasonCfg.windowEndDate);
                const transfersOpen = !!(league?.benchChangesEnabled || league?.flexibleChangesEnabled || midSeasonOpen);
                return (
                  <Tooltip title={transfersOpen ? '' : 'Transfers are currently closed'} placement="top">
                    <span style={{ display: 'block', marginBottom: 12 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        disabled={!transfersOpen}
                        startIcon={<SwapHorizIcon />}
                        sx={{
                          fontWeight: 600,
                          borderColor: transfersOpen ? 'rgba(0,229,255,0.5)' : undefined,
                          color: transfersOpen ? 'rgba(0,229,255,0.9)' : undefined,
                          '&:hover': {
                            borderColor: 'rgba(0,229,255,0.8)',
                            bgcolor: 'rgba(0,229,255,0.08)',
                            transform: 'translateY(-1px)',
                          },
                          transition: 'all 0.2s ease',
                        }}
                        onClick={() => navigate(`/leagues/${leagueId}/squad?openTransfer=true`)}
                      >
                        Make Transfer
                      </Button>
                    </span>
                  </Tooltip>
                );
              })()}

              {/* View Leaderboard — high-value branded destination */}
              <Button
                fullWidth
                variant="outlined"
                sx={{
                  mb: 1.5,
                  fontWeight: 600,
                  borderColor: colors.orange.primary,
                  color: colors.orange.primary,
                  '&:hover': {
                    borderColor: colors.orange.light,
                    bgcolor: alpha(colors.orange.primary, 0.08),
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.2s ease',
                }}
                onClick={() => navigate(`/leagues/${leagueId}/leaderboard`)}
              >
                View Leaderboard
              </Button>

              {/* Match Schedule — informational utility, blue */}
              <Button
                fullWidth
                variant="outlined"
                sx={{
                  mb: 1.5,
                  fontWeight: 600,
                  borderColor: alpha(colors.blue.electric, 0.5),
                  color: colors.blue.light,
                  '&:hover': {
                    borderColor: colors.blue.electric,
                    bgcolor: alpha(colors.blue.electric, 0.08),
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.2s ease',
                }}
                startIcon={<CalendarMonth />}
                onClick={() => navigate(`/leagues/${leagueId}/schedule`)}
              >
                Match Schedule
              </Button>

            </CardContent>
          </Card>

          {/* Admin Actions - Only visible to league admins */}
          {isAdmin && (
            <Card
              sx={{
                ...cardSx,
                mt: 3,
                borderTop: `2px solid ${alpha(colors.warning.primary, 0.4)}`,
                '&::before': {
                  ...cardSx['&::before'],
                  background: `linear-gradient(90deg, transparent, ${alpha(colors.warning.primary, 0.5)}, transparent)`,
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <AdminPanelSettings fontSize="small" sx={{ color: alpha(colors.warning.primary, 0.8) }} />
                  <Typography variant="h6" fontWeight={600}>
                    Admin Actions
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: alpha(colors.text.secondary, 0.5), mb: 2.5, fontSize: '0.8rem' }}>
                  Manage this league
                </Typography>

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<EditIcon />}
                  sx={{
                    mb: 1.5,
                    fontWeight: 600,
                    borderColor: colors.orange.primary,
                    color: colors.orange.primary,
                    '&:hover': {
                      borderColor: colors.orange.light,
                      bgcolor: alpha(colors.orange.primary, 0.08),
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                  onClick={handleEditLeague}
                >
                  Edit League
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  sx={{
                    fontWeight: 600,
                    '&:hover': { transform: 'translateY(-1px)' },
                    transition: 'all 0.2s ease',
                  }}
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
        <Card sx={{ ...cardSx, mt: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2.5}>
              <Typography variant="h6" fontWeight={600}>
                Participants{' '}
                <Box component="span" sx={{ color: alpha(colors.text.secondary, 0.5), fontWeight: 400, fontSize: '0.9rem' }}>
                  ({league.participants.length}/{league.maxParticipants})
                </Box>
              </Typography>
              {loadingParticipants && <CircularProgress size={20} sx={{ color: colors.blue.light }} />}
            </Box>

            {participants.length === 0 && !loadingParticipants ? (
              <Typography variant="body2" sx={{ color: alpha(colors.text.secondary, 0.5) }}>
                No participants have joined yet.
              </Typography>
            ) : (
              <List sx={{ p: 0 }}>
                {participants.map((participant, index) => (
                  <ListItem
                    key={participant.userId}
                    sx={{
                      borderBottom: index < participants.length - 1 ? `1px solid ${colors.border.subtle}` : 'none',
                      px: 0,
                      py: 1.5
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={participant.userData?.profilePicUrl}
                        sx={{
                          background: `linear-gradient(135deg, ${colors.blue.deep} 0%, ${colors.blue.electric} 100%)`,
                          fontWeight: 700,
                          boxShadow: `0 0 0 2px ${alpha(colors.blue.electric, 0.2)}`,
                        }}
                      >
                        {participant.userData?.displayName?.charAt(0) || '?'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={participant.userData?.displayName || 'Unknown User'}
                      secondary={participant.userData?.email || participant.userId}
                      primaryTypographyProps={{ fontWeight: 500 }}
                      secondaryTypographyProps={{ sx: { color: alpha(colors.text.secondary, 0.5), fontSize: '0.75rem' } }}
                    />
                    {participant.hasSubmittedSquad ? (
                      <Chip
                        label="Squad Submitted"
                        size="small"
                        sx={{
                          bgcolor: alpha(colors.green.primary, 0.12),
                          color: colors.green.light,
                          border: `1px solid ${alpha(colors.green.primary, 0.3)}`,
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          boxShadow: `0 0 8px ${alpha(colors.green.primary, 0.15)}`,
                        }}
                      />
                    ) : (
                      <Chip
                        label="Not Submitted"
                        size="small"
                        sx={{
                          bgcolor: alpha(colors.text.secondary, 0.06),
                          color: alpha(colors.text.secondary, 0.45),
                          border: `1px solid ${alpha(colors.text.secondary, 0.12)}`,
                          fontWeight: 500,
                          fontSize: '0.7rem',
                        }}
                      />
                    )}
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

      {/* AI Assistant Widget */}
      <LeagueAssistant leagueId={leagueId} />
    </Box>
  );
};

export default LeagueDashboardPage;