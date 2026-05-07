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
import LiveScorecardStrip from '../components/scorecard/LiveScorecardStrip';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarMonth,
  AdminPanelSettings,
  SwapHoriz as SwapHorizIcon,
  Bolt as BoltIcon,
  LockOutlined,
  LockOpen,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService, userService, squadService, leaderboardSnapshotService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import LeagueNav from '../components/common/LeagueNav';
import LeagueAssistant from '../components/LeagueAssistant';
import type { League, User } from '../types/database';
import colors from '../theme/colors';

interface ParticipantInfo {
  userId: string;
  userData: User | null;
  hasSubmittedSquad: boolean;
  squadId?: string;
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
  const [forcingSubmit, setForcingSubmit] = useState<Set<string>>(new Set());
  const [toggling, setToggling] = useState(false);

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
              const userSquad = squads.find(squad => squad.userId === userId);
              return {
                userId,
                userData,
                hasSubmittedSquad: userSquad?.isSubmitted ?? false,
                squadId: userSquad?.id,
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

  const handleForceSubmit = async (userId: string, squadId: string) => {
    if (!leagueId) return;
    setForcingSubmit(prev => new Set(prev).add(userId));
    try {
      await squadService.update(squadId, { isSubmitted: true, submittedAt: new Date() });
      await leaderboardSnapshotService.create(leagueId);
      setParticipants(prev =>
        prev.map(p => p.userId === userId ? { ...p, hasSubmittedSquad: true } : p)
      );
    } catch (err) {
      console.error('Error force submitting squad:', err);
    } finally {
      setForcingSubmit(prev => { const next = new Set(prev); next.delete(userId); return next; });
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

  const now2 = new Date();
  const midSeasonCfg = league?.transferTypes?.midSeasonTransfers;
  const midSeasonOpen = midSeasonCfg?.enabled &&
    midSeasonCfg.windowStartDate && midSeasonCfg.windowEndDate &&
    now2 >= new Date(midSeasonCfg.windowStartDate) &&
    now2 <= new Date(midSeasonCfg.windowEndDate);
  const transfersOpen = !!(league?.benchChangesEnabled || league?.flexibleChangesEnabled || league?.wildcardChangesEnabled || midSeasonOpen);

  const hasFlexible    = !!league?.transferTypes?.flexibleTransfers?.enabled;
  const hasBench       = !!league?.transferTypes?.benchTransfers?.enabled;
  const hasWildcard    = !!league?.transferTypes?.wildcardTransfers?.enabled;
  const hasPPActivation = !!(league?.powerplayEnabled && league?.ppMatchMode === 'activation');
  const anyOpen = transfersOpen || !!league?.ppActivationEnabled;

  const handleQuickToggle = async () => {
    if (!league || !leagueId) return;
    setToggling(true);
    try {
      const updates: Partial<League> = anyOpen
        ? { flexibleChangesEnabled: false, benchChangesEnabled: false, wildcardChangesEnabled: false, ppActivationEnabled: false }
        : { flexibleChangesEnabled: hasFlexible, benchChangesEnabled: hasBench, wildcardChangesEnabled: hasWildcard, ppActivationEnabled: hasPPActivation };
      await leagueService.update(leagueId, updates);
      setLeague(prev => prev ? { ...prev, ...updates } : prev);
    } catch (e) {
      console.error('Failed to toggle transfers:', e);
    } finally {
      setToggling(false);
    }
  };

  const navActions = (
    <>
      {league?.powerplayEnabled && (() => {
        const ppEnabled = league.ppMatchMode !== 'activation' || !!league.ppActivationEnabled;
        return (
          <Button
            variant="contained"
            size="small"
            disabled={!ppEnabled}
            onClick={() => navigate(`/leagues/${leagueId}/squad`)}
            sx={{
              background: ppEnabled ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : undefined,
              color: ppEnabled ? '#000' : undefined,
              fontWeight: 700,
              fontSize: '0.85rem',
              px: 1.5,
              py: { xs: 0.5, sm: 0.75 },
              borderRadius: 2,
              minWidth: 'auto',
              boxShadow: ppEnabled ? '0 4px 14px rgba(245,158,11,0.4)' : 'none',
              '&:hover': ppEnabled ? {
                background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
                transform: 'translateY(-1px)',
              } : {},
              '&.Mui-disabled': {
                bgcolor: alpha('#F59E0B', 0.18),
                color: alpha('#F59E0B', 0.4),
              },
              transition: 'all 0.2s ease',
            }}
          >
            <BoltIcon sx={{ mr: 0.25, fontSize: '1rem' }} /> PP
          </Button>
        );
      })()}
      <Button
        variant="contained"
        size="small"
        disabled={!transfersOpen}
        startIcon={<SwapHorizIcon />}
        onClick={() => navigate(`/leagues/${leagueId}/squad?openTransfer=true`)}
        sx={{
          fontWeight: 700,
          fontSize: '0.8rem',
          px: 1.5,
          py: { xs: 0.5, sm: 0.75 },
          borderRadius: 2,
          background: transfersOpen ? `linear-gradient(135deg, ${colors.blue.light} 0%, ${colors.blue.electric} 100%)` : undefined,
          color: '#000',
          boxShadow: transfersOpen ? `0 2px 8px ${alpha(colors.blue.electric, 0.4)}` : undefined,
          '&:hover': {
            background: `linear-gradient(135deg, #64B5F6 0%, ${colors.blue.light} 100%)`,
            boxShadow: `0 4px 14px ${alpha(colors.blue.electric, 0.5)}`,
            transform: 'translateY(-1px)',
          },
          '&.Mui-disabled': {
            bgcolor: alpha(colors.blue.electric, 0.18),
            color: alpha('#000', 0.3),
          },
          transition: 'all 0.2s ease',
        }}
      >
        Transfers
      </Button>
    </>
  );

  return (
    <Box>
      <AppHeader />
      <LeagueNav
        leagueName={league.name}
        leagueId={leagueId!}
        currentPage="Overview"
        backPath="/dashboard"
        actions={navActions}
      />
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 }, pb: { xs: '88px', md: 4 } }}>

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
        <Grid size={{ xs: 12 }}>
          <Card sx={cardSx}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2.5 }}>
                League Information
              </Typography>

              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                {[
                  { label: 'PARTICIPANTS', value: `${league.participants.length} / ${league.maxParticipants}` },
                  { label: 'TOURNAMENT', value: `${new Date(league.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(league.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` },
                  { label: 'TRANSFERS', value: `${league.maxTransfers} allowed` },
                  { label: 'FORMAT', value: league.format },
                ].map(({ label, value }) => (
                  <Grid key={label} size={{ xs: 6, sm: 3 }}>
                    <Box sx={{
                      bgcolor: alpha(colors.blue.electric, 0.04),
                      border: `1px solid ${colors.border.subtle}`,
                      borderRadius: 2,
                      p: 1.5,
                    }}>
                      <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', color: alpha(colors.text.secondary, 0.45), textTransform: 'uppercase', mb: 0.5 }}>
                        {label}
                      </Typography>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: colors.text.primary, lineHeight: 1.3 }}>
                        {value}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

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

        {/* Live Scorecard */}
        <Grid size={{ xs: 12 }}>
          <LiveScorecardStrip title="Live Scores" sx={{ mb: 0 }} />
        </Grid>

        {/* Admin Actions - Only visible to league admins */}
        {isAdmin && (
          <Grid size={{ xs: 12, md: 6, lg: 4 }}>
            <Card
              sx={{
                ...cardSx,
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
                  disabled={toggling}
                  startIcon={toggling
                    ? <CircularProgress size={14} sx={{ color: 'inherit' }} />
                    : anyOpen
                      ? <LockOutlined fontSize="small" />
                      : <LockOpen fontSize="small" />}
                  onClick={handleQuickToggle}
                  sx={{
                    mb: 1.5,
                    fontWeight: 600,
                    borderColor: anyOpen ? alpha(colors.warning.primary, 0.6) : alpha(colors.success.primary, 0.6),
                    color: anyOpen ? colors.warning.primary : colors.success.primary,
                    '&:hover': {
                      borderColor: anyOpen ? colors.warning.primary : colors.success.primary,
                      bgcolor: anyOpen ? alpha(colors.warning.primary, 0.08) : alpha(colors.success.primary, 0.08),
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  {toggling
                    ? (anyOpen ? 'Closing…' : 'Opening…')
                    : anyOpen
                      ? 'Close Transfer Window'
                      : 'Open Transfer Window'}
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
          </Grid>
        )}
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                        {participant.squadId && (
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={forcingSubmit.has(participant.userId)}
                            onClick={() => handleForceSubmit(participant.userId, participant.squadId!)}
                            sx={{
                              fontSize: '0.65rem',
                              py: 0.25,
                              px: 1,
                              minWidth: 0,
                              borderColor: alpha(colors.warning.primary, 0.5),
                              color: colors.warning.light,
                              '&:hover': {
                                borderColor: colors.warning.primary,
                                bgcolor: alpha(colors.warning.primary, 0.08),
                              },
                            }}
                          >
                            {forcingSubmit.has(participant.userId) ? 'Submitting…' : 'Force Submit'}
                          </Button>
                        )}
                      </Box>
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