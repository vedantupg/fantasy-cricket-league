import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Grid,
  Snackbar,
  FormControlLabel,
  Checkbox,
  Collapse
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Save,
  Cancel,
  SportsCricket,
  PersonAdd,
  Flight,
  SportsBaseball,
  ExpandMore,
  ExpandLess,
  ContentPaste,
  InfoOutlined
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import AppHeader from '../components/common/AppHeader';
import ScorecardParserDialog from '../components/ScorecardParserDialog';
import BulkPlayerImportDialog from '../components/BulkPlayerImportDialog';
import { playerPoolService, playerPoolSnapshotService } from '../services/firestore';
import type { PlayerPool, PlayerPoolEntry, BattingConfig, BowlingConfig, FieldingConfig, BattingInnings, BowlingSpell } from '../types/database';
import { DEFAULT_BATTING_CONFIG, DEFAULT_BOWLING_CONFIG, DEFAULT_FIELDING_CONFIG, calculateBattingPoints, calculateBowlingPoints } from '../utils/pointsCalculation';

const PlayerPoolManagementPage: React.FC = () => {
  const [playerPools, setPlayerPools] = useState<PlayerPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPool, setSelectedPool] = useState<PlayerPool | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [error, setError] = useState<string>('');

  const { user } = useAuth();

  useEffect(() => {
    const loadPlayerPools = async () => {
      try {
        setLoading(true);
        setError('');
        const pools = await playerPoolService.getAll();
        // Ensure each pool has a players array
        const poolsWithPlayers = pools.map(pool => ({
          ...pool,
          players: pool.players || []
        }));
        setPlayerPools(poolsWithPlayers);
      } catch (error: any) {
        console.error('Error loading player pools:', error);
        setError(error?.message || 'Failed to load player pools. Please check your Firestore permissions.');
      } finally {
        setLoading(false);
      }
    };

    loadPlayerPools();
  }, []);

  // TODO: Add proper admin check when User type includes isAdmin property
  // For now, all logged-in users can access player pool management

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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader />

      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
        {/* Page Header with Actions */}
        <Box mb={{ xs: 2, sm: 3, md: 4 }} display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} flexWrap="wrap" gap={{ xs: 1.5, sm: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
              Player Pool Management
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              Manage player pools and update points
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setCreateDialogOpen(true)}
            startIcon={<Add />}
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' },
              py: { xs: 0.75, sm: 1 },
              px: { xs: 1.5, sm: 2 },
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            Create Player Pool
          </Button>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mb: { xs: 2, sm: 3 }, fontSize: { xs: '0.875rem', sm: '1rem' } }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {/* Left Panel - Player Pools List */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  Player Pools ({playerPools.length})
                </Typography>

                {playerPools.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: { xs: 3, sm: 4 } }}>
                    <SportsCricket sx={{ fontSize: { xs: 48, sm: 60 }, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      No player pools created yet
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() => setCreateDialogOpen(true)}
                      sx={{ mt: 2, fontSize: { xs: '0.875rem', sm: '1rem' } }}
                      startIcon={<Add />}
                    >
                      Create First Pool
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 }, mt: { xs: 1.5, sm: 2 } }}>
                    {playerPools.map((pool) => (
                      <Card
                        key={pool.id}
                        sx={{
                          cursor: 'pointer',
                          border: selectedPool?.id === pool.id ? '2px solid' : '1px solid',
                          borderColor: selectedPool?.id === pool.id ? 'primary.main' : 'divider',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                        onClick={() => setSelectedPool(pool)}
                      >
                        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 1 }}>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                {pool.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                                {pool.players.length} players
                              </Typography>
                            </Box>
                            <Chip
                              label={pool.isActive ? 'Active' : 'Inactive'}
                              color={pool.isActive ? 'success' : 'default'}
                              size="small"
                              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: 20, sm: 24 }, flexShrink: 0 }}
                            />
                          </Box>
                          {pool.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                              {pool.description}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Right Panel - Selected Pool Details */}
          <Grid size={{ xs: 12, md: 8 }}>
            {selectedPool ? (
              <PlayerPoolDetails
                pool={{
                  ...selectedPool,
                  // Ensure configs exist for backward compatibility
                  battingConfig: selectedPool.battingConfig || DEFAULT_BATTING_CONFIG,
                  bowlingConfig: selectedPool.bowlingConfig || DEFAULT_BOWLING_CONFIG,
                }}
                onUpdate={async (updatedPool) => {
                  try {
                    // Ensure players is an array
                    const poolToUpdate = {
                      ...updatedPool,
                      players: updatedPool.players || [],
                      // Ensure configs exist (for backward compatibility with old pools)
                      battingConfig: updatedPool.battingConfig || DEFAULT_BATTING_CONFIG,
                      bowlingConfig: updatedPool.bowlingConfig || DEFAULT_BOWLING_CONFIG,
                    };

                    console.log('Updating player pool with', poolToUpdate.players.length, 'players...');
                    console.log('Players array:', JSON.stringify(poolToUpdate.players, null, 2));

                    // Directly update the entire players array in Firestore
                    // This handles both adding new players and updating existing ones
                    const updateData: any = {
                      players: poolToUpdate.players,
                      battingConfig: poolToUpdate.battingConfig,
                      bowlingConfig: poolToUpdate.bowlingConfig,
                      updatedAt: new Date()
                    };

                    // Only include lastUpdateMessage if it's defined (Firestore doesn't allow undefined)
                    if (poolToUpdate.lastUpdateMessage !== undefined) {
                      updateData.lastUpdateMessage = poolToUpdate.lastUpdateMessage;
                    }

                    await playerPoolService.update(poolToUpdate.id, updateData);

                    console.log('✅ Player pool updated in Firestore successfully');

                    // Create a snapshot to track point changes
                    try {
                      await playerPoolSnapshotService.create(
                        poolToUpdate.id,
                        poolToUpdate.lastUpdateMessage,
                        user?.uid
                      );
                      console.log('✅ Player pool snapshot created successfully');
                    } catch (snapshotError) {
                      console.error('Error creating snapshot:', snapshotError);
                      // Don't fail the update if snapshot creation fails
                    }

                    // Then trigger recalculation for all leagues using this pool
                    await playerPoolService.recalculateLeaguesUsingPool(poolToUpdate.id);

                    console.log('Player pool updated, snapshot created, and leagues recalculated successfully');

                    // Update local state
                    setPlayerPools(prev =>
                      prev.map(p => p.id === poolToUpdate.id ? poolToUpdate : p)
                    );
                    setSelectedPool(poolToUpdate);

                    setSnackbarMessage('Player pool updated and all leaderboards recalculated!');
                    setSnackbarOpen(true);
                  } catch (error: any) {
                    console.error('Error updating player pool:', error);
                    console.error('Error details:', error?.message, error?.code);
                    setSnackbarMessage(`Failed to update player pool: ${error?.message || 'Unknown error'}`);
                    setSnackbarOpen(true);
                  }
                }}
                onDelete={async () => {
                  try {
                    await playerPoolService.delete(selectedPool.id);
                    setPlayerPools(prev => prev.filter(p => p.id !== selectedPool.id));
                    setSelectedPool(null);
                  } catch (error) {
                    console.error('Error deleting player pool:', error);
                  }
                }}
              />
            ) : (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: { xs: 5, sm: 6, md: 8 }, p: { xs: 2, sm: 3 } }}>
                  <SportsCricket sx={{ fontSize: { xs: 60, sm: 70, md: 80 }, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                    Select a Player Pool
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    Choose a player pool from the list to view and edit player points
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* Create Pool Dialog */}
      <CreatePlayerPoolDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSave={async (newPool) => {
          try {
            const poolId = await playerPoolService.create({
              name: newPool.name,
              description: newPool.description,
              format: newPool.format,
              scoringMode: newPool.scoringMode,
              creatorId: user?.uid || '',
              adminIds: [user?.uid || ''],
              players: [],
              ...(newPool.scoringMode === 'automated' && {
                battingConfig: newPool.battingConfig,
                bowlingConfig: newPool.bowlingConfig,
              }),
              isActive: true,
            });

            const createdPool: PlayerPool = {
              ...newPool,
              id: poolId,
              players: newPool.players || [] // Ensure players array exists
            };

            setPlayerPools(prev => [...prev, createdPool]);
            setCreateDialogOpen(false);
            setSelectedPool(createdPool);
            setSnackbarMessage(`Pool "${newPool.name}" created successfully! You can now add players.`);
            setSnackbarOpen(true);
          } catch (error) {
            console.error('Error creating player pool:', error);
            setSnackbarMessage('Failed to create player pool. Please try again.');
            setSnackbarOpen(true);
          }
        }}
      />

      {/* Success Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

// Player Pool Details Component
const PlayerPoolDetails: React.FC<{
  pool: PlayerPool;
  onUpdate: (pool: PlayerPool) => void;
  onDelete: () => void;
}> = ({ pool, onUpdate, onDelete }) => {
  const { user } = useAuth();
  const [editMode, setEditMode] = useState(false);

  // Convert role to display text
  const getRoleDisplayText = (role: string): string => {
    switch (role) {
      case 'batsman': return 'Batter';
      case 'bowler': return 'Bowler';
      case 'allrounder': return 'All-rounder';
      case 'wicketkeeper': return 'Wicket-keeper';
      default: return role;
    }
  };

  // Ensure players is always an array
  const getPlayersArray = (players: any): PlayerPoolEntry[] => {
    if (!players) {
      return [];
    }

    if (Array.isArray(players)) {
      return players;
    }

    // If players is an object (like {0: player1, 1: player2}), convert to array
    if (typeof players === 'object') {
      return Object.values(players) as PlayerPoolEntry[];
    }

    return [];
  };

  const [editedPlayers, setEditedPlayers] = useState<PlayerPoolEntry[]>(getPlayersArray(pool.players));
  const [updateMessage, setUpdateMessage] = useState(pool.lastUpdateMessage || '');
  const [addPlayerDialogOpen, setAddPlayerDialogOpen] = useState(false);
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [addInningsDialogOpen, setAddInningsDialogOpen] = useState(false);
  const [addSpellDialogOpen, setAddSpellDialogOpen] = useState(false);
  const [selectedPlayerForPerformance, setSelectedPlayerForPerformance] = useState<PlayerPoolEntry | null>(null);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [manualPoints, setManualPoints] = useState<{ [playerId: string]: string }>({});
  const [scorecardDialogOpen, setScorecardDialogOpen] = useState(false);
  const [scoringConfigDialogOpen, setScoringConfigDialogOpen] = useState(false);
  const [editPlayerDialogOpen, setEditPlayerDialogOpen] = useState(false);
  const [selectedPlayerForEdit, setSelectedPlayerForEdit] = useState<PlayerPoolEntry | null>(null);


  // Sync editedPlayers when pool changes
  useEffect(() => {
    const playersArray = getPlayersArray(pool.players);
    setEditedPlayers(playersArray);
    setUpdateMessage(pool.lastUpdateMessage || '');

    // Initialize all teams as expanded
    const teams = new Set(playersArray.map(p => p.team));
    setExpandedTeams(teams);
  }, [pool]);

  // Group players by team
  const groupPlayersByTeam = () => {
    const grouped: { [team: string]: PlayerPoolEntry[] } = {};
    editedPlayers.forEach(player => {
      if (!grouped[player.team]) {
        grouped[player.team] = [];
      }
      grouped[player.team].push(player);
    });
    return grouped;
  };

  // Toggle team expand/collapse
  const toggleTeam = (team: string) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(team)) {
      newExpanded.delete(team);
    } else {
      newExpanded.add(team);
    }
    setExpandedTeams(newExpanded);
  };

  const handleSavePoints = () => {
    const updatedPool = {
      ...pool,
      players: editedPlayers,
      lastUpdateMessage: updateMessage.trim() || undefined,
      updatedAt: new Date()
    };
    onUpdate(updatedPool);
    setEditMode(false);
    setSnackbarMessage('Player points updated successfully!');
    setSnackbarOpen(true);
  };

  const handleCancelEdit = () => {
    setEditedPlayers(pool.players);
    setEditMode(false);
  };

  const handlePointsChange = (playerId: string, newPoints: number) => {
    setEditedPlayers(prev =>
      prev.map(p =>
        p.playerId === playerId
          ? { ...p, points: newPoints, lastUpdated: new Date() }
          : p
      )
    );
  };

  const handleDeletePlayer = (playerId: string) => {
    setEditedPlayers(prev => prev.filter(p => p.playerId !== playerId));
  };

  const handleEditPlayer = (player: PlayerPoolEntry) => {
    setSelectedPlayerForEdit(player);
    setEditPlayerDialogOpen(true);
  };

  const handleSaveEditedPlayer = (updatedPlayer: PlayerPoolEntry) => {
    setEditedPlayers(prev =>
      prev.map(p =>
        p.playerId === updatedPlayer.playerId ? updatedPlayer : p
      )
    );

    // Auto-save to Firestore
    const updatedPool = {
      ...pool,
      players: editedPlayers.map(p =>
        p.playerId === updatedPlayer.playerId ? updatedPlayer : p
      ),
      updatedAt: new Date()
    };
    onUpdate(updatedPool);

    setSnackbarMessage(`${updatedPlayer.name} updated successfully!`);
    setSnackbarOpen(true);
  };

  const handleDeleteBattingInnings = async (playerId: string, inningsId: string) => {
    if (!window.confirm('Are you sure you want to delete this batting innings? This action cannot be undone.')) {
      return;
    }

    try {
      // Find the player in edited players
      const player = editedPlayers.find(p => p.playerId === playerId);
      if (!player || !player.battingInnings) return;

      // Find the innings to delete
      const innings = player.battingInnings.find(i => i.id === inningsId);
      if (!innings) return;

      // Remove the innings from the player
      const updatedBattingInnings = player.battingInnings.filter(i => i.id !== inningsId);

      // Recalculate total points (batting + bowling)
      const battingPoints = updatedBattingInnings.reduce((sum, i) => sum + i.pointsEarned, 0);
      const bowlingPoints = player.bowlingSpells?.reduce((sum, s) => sum + s.pointsEarned, 0) || 0;

      // Update edited players with the new data
      const updatedPlayers = editedPlayers.map(p =>
        p.playerId === playerId
          ? {
              ...p,
              battingInnings: updatedBattingInnings,
              points: battingPoints + bowlingPoints,
              lastUpdated: new Date()
            }
          : p
      );

      // Update local state
      setEditedPlayers(updatedPlayers);

      // Auto-save to database
      const updatedPool = {
        ...pool,
        players: updatedPlayers,
        lastUpdateMessage: `Deleted batting innings for ${player.name}`,
        updatedAt: new Date()
      };
      await onUpdate(updatedPool);

      setSnackbarMessage(`Deleted batting innings for ${player.name}`);
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error deleting batting innings:', error);
      setSnackbarMessage('Failed to delete batting innings');
      setSnackbarOpen(true);
    }
  };

  const handleDeleteBowlingSpell = async (playerId: string, spellId: string) => {
    if (!window.confirm('Are you sure you want to delete this bowling spell? This action cannot be undone.')) {
      return;
    }

    try {
      // Find the player in edited players
      const player = editedPlayers.find(p => p.playerId === playerId);
      if (!player || !player.bowlingSpells) return;

      // Find the spell to delete
      const spell = player.bowlingSpells.find(s => s.id === spellId);
      if (!spell) return;

      // Remove the spell from the player
      const updatedBowlingSpells = player.bowlingSpells.filter(s => s.id !== spellId);

      // Recalculate total points (batting + bowling)
      const battingPoints = player.battingInnings?.reduce((sum, i) => sum + i.pointsEarned, 0) || 0;
      const bowlingPoints = updatedBowlingSpells.reduce((sum, s) => sum + s.pointsEarned, 0);

      // Update edited players with the new data
      const updatedPlayers = editedPlayers.map(p =>
        p.playerId === playerId
          ? {
              ...p,
              bowlingSpells: updatedBowlingSpells,
              points: battingPoints + bowlingPoints,
              lastUpdated: new Date()
            }
          : p
      );

      // Update local state
      setEditedPlayers(updatedPlayers);

      // Auto-save to database
      const updatedPool = {
        ...pool,
        players: updatedPlayers,
        lastUpdateMessage: `Deleted bowling spell for ${player.name}`,
        updatedAt: new Date()
      };
      await onUpdate(updatedPool);

      setSnackbarMessage(`Deleted bowling spell for ${player.name}`);
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error deleting bowling spell:', error);
      setSnackbarMessage('Failed to delete bowling spell');
      setSnackbarOpen(true);
    }
  };

  const handleAddManualPoints = (playerId: string) => {
    const pointsToAdd = parseFloat(manualPoints[playerId] || '0');
    if (isNaN(pointsToAdd) || pointsToAdd < 0) {
      setSnackbarMessage('Please enter a valid number of points (0 or greater)');
      setSnackbarOpen(true);
      return;
    }

    setEditedPlayers(prev =>
      prev.map(p =>
        p.playerId === playerId
          ? { ...p, points: p.points + pointsToAdd, lastUpdated: new Date() }
          : p
      )
    );
    setManualPoints({ ...manualPoints, [playerId]: '' });
    setSnackbarMessage(`Added ${pointsToAdd} points to ${editedPlayers.find(p => p.playerId === playerId)?.name}`);
    setSnackbarOpen(true);
  };

  const handleApplyScorecardUpdates = (
    updates: {
      playerId: string;
      pointsToAdd: number;
      performance: string;
      battingData?: { runs: number; balls: number };
      bowlingData?: { overs: number; runs: number; wickets: number };
    }[],
    matchLabel?: string
  ) => {
    // Apply points from parsed scorecard to edited players and create innings/spell records
    setEditedPlayers(prev =>
      prev.map(player => {
        const update = updates.find(u => u.playerId === player.playerId);
        if (update) {
          const updatedPlayer = { ...player };

          // Create batting innings record if batting data exists
          if (update.battingData) {
            const newInnings: BattingInnings = {
              id: `${Date.now()}-${player.playerId}-bat`,
              matchLabel: matchLabel || undefined,
              runs: update.battingData.runs,
              ballsFaced: update.battingData.balls,
              pointsEarned: update.battingData.runs > 0 || update.battingData.balls > 0
                ? calculateBattingPoints(update.battingData.runs, update.battingData.balls, pool.battingConfig!)
                : 0,
              date: new Date(),
              addedBy: user?.uid
            };
            updatedPlayer.battingInnings = [...(player.battingInnings || []), newInnings];
          }

          // Create bowling spell record if bowling data exists
          if (update.bowlingData) {
            const newSpell: BowlingSpell = {
              id: `${Date.now()}-${player.playerId}-bowl`,
              matchLabel: matchLabel || undefined,
              overs: update.bowlingData.overs,
              runsConceded: update.bowlingData.runs,
              wickets: update.bowlingData.wickets,
              pointsEarned: update.bowlingData.overs > 0
                ? calculateBowlingPoints(update.bowlingData.overs, update.bowlingData.runs, update.bowlingData.wickets, pool.bowlingConfig!)
                : 0,
              date: new Date(),
              addedBy: user?.uid
            };
            updatedPlayer.bowlingSpells = [...(player.bowlingSpells || []), newSpell];
          }

          // Update total points
          updatedPlayer.points = player.points + update.pointsToAdd;
          updatedPlayer.lastUpdated = new Date();
          updatedPlayer.updatedBy = user?.uid;

          return updatedPlayer;
        }
        return player;
      })
    );

    // Set the match label as the update message if provided
    if (matchLabel) {
      setUpdateMessage(matchLabel);
    }

    // Enable edit mode if not already enabled
    if (!editMode) {
      setEditMode(true);
    }

    // Show success message
    const totalPoints = updates.reduce((sum, u) => sum + u.pointsToAdd, 0);
    setSnackbarMessage(
      `Updated ${updates.length} player(s) from scorecard. Total points added: ${totalPoints.toFixed(1)}. Review and click "Save Changes" to apply.`
    );
    setSnackbarOpen(true);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 3 }}>
          <Box>
            <Typography variant="h5" gutterBottom>
              {pool.name}
            </Typography>
            {pool.description && (
              <Typography variant="body2" color="text.secondary">
                {pool.description}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Chip label={`${pool.players.length} players`} size="small" />
              <Chip
                label={pool.isActive ? 'Active' : 'Inactive'}
                color={pool.isActive ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {editMode ? (
              <>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleSavePoints}
                  startIcon={<Save />}
                >
                  Save Changes
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleCancelEdit}
                  startIcon={<Cancel />}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="contained"
                  onClick={() => setEditMode(true)}
                  startIcon={<Edit />}
                >
                  Edit Points
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setAddPlayerDialogOpen(true)}
                  startIcon={<PersonAdd />}
                >
                  Add Player
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => setBulkImportDialogOpen(true)}
                  startIcon={<ContentPaste />}
                >
                  Bulk Import Players
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => setScorecardDialogOpen(true)}
                  startIcon={<ContentPaste />}
                >
                  Quick Update from Scorecard
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* Update Message Field - Only visible in edit mode */}
        {editMode && (
          <Box sx={{ mb: 3 }}>
            <TextField
              label="Update Message (Optional)"
              placeholder="e.g., Test 1 - Day 1"
              value={updateMessage}
              onChange={(e) => setUpdateMessage(e.target.value)}
              fullWidth
              helperText="Add a version label for this points update. This will be displayed on the leaderboard."
              variant="outlined"
            />
          </Box>
        )}

        {/* Players Table */}
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Player Name</strong></TableCell>
                <TableCell><strong>Team</strong></TableCell>
                <TableCell><strong>Role</strong></TableCell>
                <TableCell><strong>Overseas</strong></TableCell>
                <TableCell><strong>Points</strong></TableCell>
                <TableCell><strong>Last Updated</strong></TableCell>
                <TableCell align="center"><strong>Performance</strong></TableCell>
                {editMode && <TableCell align="center"><strong>Actions</strong></TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {editedPlayers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={editMode ? 7 : 6} align="center">
                    <Box sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No players in this pool yet
                      </Typography>
                      <Button
                        variant="outlined"
                        onClick={() => setAddPlayerDialogOpen(true)}
                        sx={{ mt: 2 }}
                        startIcon={<PersonAdd />}
                      >
                        Add First Player
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                Object.entries(groupPlayersByTeam()).map(([team, teamPlayers]) => (
                  <React.Fragment key={team}>
                    {/* Team Header Row */}
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell colSpan={editMode ? 8 : 7}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton size="small" onClick={() => toggleTeam(team)}>
                            {expandedTeams.has(team) ? <ExpandLess /> : <ExpandMore />}
                          </IconButton>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {team}
                          </Typography>
                          <Chip
                            label={`${teamPlayers.length} player${teamPlayers.length !== 1 ? 's' : ''}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                      </TableCell>
                    </TableRow>

                    {/* Team Players - Only show when team is expanded */}
                    {expandedTeams.has(team) && teamPlayers.map((player) => (
                      <React.Fragment key={player.playerId}>
                        <TableRow>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {/* Expand/Collapse button for performance history */}
                          <IconButton
                            size="small"
                            onClick={() => setExpandedPlayerId(expandedPlayerId === player.playerId ? null : player.playerId)}
                          >
                            {expandedPlayerId === player.playerId ? <ExpandLess /> : <ExpandMore />}
                          </IconButton>
                          {player.name}
                        </Box>
                      </TableCell>
                    <TableCell>{player.team}</TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleDisplayText(player.role)}
                        size="small"
                        color={
                          player.role === 'batsman' ? 'success' :
                          player.role === 'bowler' ? 'primary' :
                          player.role === 'allrounder' ? 'secondary' :
                          'warning'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {player.isOverseas ? (
                        <Chip icon={<Flight />} label="Yes" size="small" color="info" />
                      ) : (
                        <Chip label="No" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      {editMode ? (
                        <TextField
                          type="number"
                          value={player.points}
                          onChange={(e) => handlePointsChange(player.playerId, Number(e.target.value))}
                          size="small"
                          sx={{ width: 100 }}
                        />
                      ) : (
                        <Typography variant="body1" fontWeight="bold">
                          {player.points}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(player.lastUpdated).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {pool.scoringMode === 'manual' ? (
                        // Manual point input interface for Test format
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', alignItems: 'center' }}>
                          <TextField
                            size="small"
                            type="number"
                            placeholder="Add points"
                            value={manualPoints[player.playerId] || ''}
                            onChange={(e) => setManualPoints({ ...manualPoints, [player.playerId]: e.target.value })}
                            sx={{ width: 100 }}
                            inputProps={{ min: 0, step: 1 }}
                            disabled={!editMode}
                          />
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleAddManualPoints(player.playerId)}
                            title="Add Points"
                            disabled={!editMode}
                          >
                            <Add />
                          </IconButton>
                        </Box>
                      ) : (
                        // Automated mode: performance tracking buttons
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          {/* Show batting button for all players */}
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedPlayerForPerformance(player);
                              setAddInningsDialogOpen(true);
                            }}
                            title="Add Innings"
                          >
                            <SportsCricket />
                          </IconButton>
                          {/* Show bowling button for all players */}
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => {
                              setSelectedPlayerForPerformance(player);
                              setAddSpellDialogOpen(true);
                            }}
                            title="Add Spell"
                          >
                            <SportsBaseball />
                          </IconButton>
                        </Box>
                      )}
                    </TableCell>
                    {editMode && (
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => handleEditPlayer(player)}
                            title="Edit Player"
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleDeletePlayer(player.playerId)}
                            title="Delete Player"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>

                  {/* Expandable Performance History */}
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={editMode ? 8 : 7}>
                      <Collapse in={expandedPlayerId === player.playerId} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                          <Typography variant="h6" gutterBottom component="div">
                            Performance History
                          </Typography>

                          {/* Batting Innings */}
                          {player.battingInnings && player.battingInnings.length > 0 && (
                            <Box sx={{ mb: 3 }}>
                              <Typography variant="subtitle2" color="primary" gutterBottom>
                                ⚾ Batting Innings ({player.battingInnings.length})
                              </Typography>
                              <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Date</TableCell>
                                      <TableCell>Match</TableCell>
                                      <TableCell align="right">Runs</TableCell>
                                      <TableCell align="right">Balls</TableCell>
                                      <TableCell align="right">SR</TableCell>
                                      <TableCell align="right">Points</TableCell>
                                      <TableCell align="center">Actions</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {player.battingInnings.map((innings) => (
                                      <TableRow key={innings.id}>
                                        <TableCell>{new Date(innings.date).toLocaleDateString()}</TableCell>
                                        <TableCell>{innings.matchLabel || '-'}</TableCell>
                                        <TableCell align="right">{innings.runs}</TableCell>
                                        <TableCell align="right">{innings.ballsFaced}</TableCell>
                                        <TableCell align="right">
                                          {innings.ballsFaced > 0
                                            ? ((innings.runs / innings.ballsFaced) * 100).toFixed(2)
                                            : '-'}
                                        </TableCell>
                                        <TableCell align="right">
                                          <strong>{innings.pointsEarned.toFixed(2)}</strong>
                                        </TableCell>
                                        <TableCell align="center">
                                          <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteBattingInnings(player.playerId, innings.id)}
                                            title="Delete innings"
                                          >
                                            <Delete fontSize="small" />
                                          </IconButton>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Box>
                          )}

                          {/* Bowling Spells */}
                          {player.bowlingSpells && player.bowlingSpells.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" color="secondary" gutterBottom>
                                💨 Bowling Spells ({player.bowlingSpells.length})
                              </Typography>
                              <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Date</TableCell>
                                      <TableCell>Match</TableCell>
                                      <TableCell align="right">Overs</TableCell>
                                      <TableCell align="right">Runs</TableCell>
                                      <TableCell align="right">Wickets</TableCell>
                                      <TableCell align="right">Econ</TableCell>
                                      <TableCell align="right">Points</TableCell>
                                      <TableCell align="center">Actions</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {player.bowlingSpells.map((spell) => {
                                      const balls = Math.floor(spell.overs) * 6 + (Math.ceil(spell.overs * 10) % 10);
                                      const economy = balls > 0 ? (spell.runsConceded / balls) * 6 : 0;
                                      return (
                                        <TableRow key={spell.id}>
                                          <TableCell>{new Date(spell.date).toLocaleDateString()}</TableCell>
                                          <TableCell>{spell.matchLabel || '-'}</TableCell>
                                          <TableCell align="right">{spell.overs}</TableCell>
                                          <TableCell align="right">{spell.runsConceded}</TableCell>
                                          <TableCell align="right">{spell.wickets}</TableCell>
                                          <TableCell align="right">{economy.toFixed(2)}</TableCell>
                                          <TableCell align="right">
                                            <strong>{spell.pointsEarned.toFixed(2)}</strong>
                                          </TableCell>
                                          <TableCell align="center">
                                            <IconButton
                                              size="small"
                                              color="error"
                                              onClick={() => handleDeleteBowlingSpell(player.playerId, spell.id)}
                                              title="Delete spell"
                                            >
                                              <Delete fontSize="small" />
                                            </IconButton>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Box>
                          )}

                          {/* No performance data message */}
                          {(!player.battingInnings || player.battingInnings.length === 0) &&
                           (!player.bowlingSpells || player.bowlingSpells.length === 0) && (
                            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                              No performance data recorded yet. Use the action buttons to add innings or spells.
                            </Typography>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </React.Fragment>
          ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>

      {/* Add Player Dialog */}
      <AddPlayerDialog
        open={addPlayerDialogOpen}
        onClose={() => setAddPlayerDialogOpen(false)}
        onAdd={(newPlayer) => {
          const updatedPlayers = [...editedPlayers, newPlayer];
          setEditedPlayers(updatedPlayers);
          const updatedPool = {
            ...pool,
            players: updatedPlayers,
            updatedAt: new Date()
          };
          onUpdate(updatedPool);
          setAddPlayerDialogOpen(false);
          setSnackbarMessage(`${newPlayer.name} added to pool successfully!`);
          setSnackbarOpen(true);
        }}
      />

      {/* Bulk Import Player Dialog */}
      <BulkPlayerImportDialog
        open={bulkImportDialogOpen}
        onClose={() => setBulkImportDialogOpen(false)}
        existingPlayerIds={editedPlayers.map(p => p.playerId)}
        onImport={async (players) => {
          const playersWithTimestamps = players.map(p => ({
            ...p,
            lastUpdated: new Date(),
          }));
          const updatedPlayers = [...editedPlayers, ...playersWithTimestamps];
          setEditedPlayers(updatedPlayers);
          const updatedPool = {
            ...pool,
            players: updatedPlayers,
            updatedAt: new Date()
          };
          onUpdate(updatedPool);
          setSnackbarMessage(`${players.length} player(s) imported successfully!`);
          setSnackbarOpen(true);
        }}
      />

      {/* Edit Player Dialog */}
      {selectedPlayerForEdit && (
        <EditPlayerDialog
          open={editPlayerDialogOpen}
          onClose={() => {
            setEditPlayerDialogOpen(false);
            setSelectedPlayerForEdit(null);
          }}
          player={selectedPlayerForEdit}
          onSave={handleSaveEditedPlayer}
        />
      )}

      {/* Add Innings Dialog - Only for automated mode */}
      {selectedPlayerForPerformance && pool.battingConfig && (
        <AddInningsDialog
          open={addInningsDialogOpen}
          onClose={() => {
            setAddInningsDialogOpen(false);
            setSelectedPlayerForPerformance(null);
          }}
          player={selectedPlayerForPerformance}
          battingConfig={pool.battingConfig}
          onSave={(updatedPlayer) => {
            const updatedPlayers = editedPlayers.map(p =>
              p.playerId === updatedPlayer.playerId ? updatedPlayer : p
            );
            setEditedPlayers(updatedPlayers);
            const updatedPool = {
              ...pool,
              players: updatedPlayers,
              updatedAt: new Date()
            };
            onUpdate(updatedPool);
            setAddInningsDialogOpen(false);
            setSelectedPlayerForPerformance(null);
            setSnackbarMessage(`Innings added for ${updatedPlayer.name}!`);
            setSnackbarOpen(true);
          }}
        />
      )}

      {/* Add Spell Dialog - Only for automated mode */}
      {selectedPlayerForPerformance && pool.bowlingConfig && (
        <AddSpellDialog
          open={addSpellDialogOpen}
          onClose={() => {
            setAddSpellDialogOpen(false);
            setSelectedPlayerForPerformance(null);
          }}
          player={selectedPlayerForPerformance}
          bowlingConfig={pool.bowlingConfig}
          onSave={(updatedPlayer) => {
            const updatedPlayers = editedPlayers.map(p =>
              p.playerId === updatedPlayer.playerId ? updatedPlayer : p
            );
            setEditedPlayers(updatedPlayers);
            const updatedPool = {
              ...pool,
              players: updatedPlayers,
              updatedAt: new Date()
            };
            onUpdate(updatedPool);
            setAddSpellDialogOpen(false);
            setSelectedPlayerForPerformance(null);
            setSnackbarMessage(`Spell added for ${updatedPlayer.name}!`);
            setSnackbarOpen(true);
          }}
        />
      )}

      {/* Scorecard Parser Dialog */}
      <ScorecardParserDialog
        open={scorecardDialogOpen}
        onClose={() => setScorecardDialogOpen(false)}
        poolPlayers={editedPlayers}
        battingConfig={pool.battingConfig}
        bowlingConfig={pool.bowlingConfig}
        fieldingConfig={pool.fieldingConfig}
        onApplyUpdates={handleApplyScorecardUpdates}
      />

      {/* Scoring Configuration Dialog */}
      <ScoringConfigDialog
        open={scoringConfigDialogOpen}
        onClose={() => setScoringConfigDialogOpen(false)}
        pool={pool}
      />

      {/* Success Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Card>
  );
};

// Create Player Pool Dialog
const CreatePlayerPoolDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSave: (pool: PlayerPool) => void;
}> = ({ open, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState<'T20' | 'ODI' | 'Test'>('T20');
  const [battingConfig, setBattingConfig] = useState<BattingConfig>(DEFAULT_BATTING_CONFIG);
  const [bowlingConfig, setBowlingConfig] = useState<BowlingConfig>(DEFAULT_BOWLING_CONFIG);
  const [fieldingConfig, setFieldingConfig] = useState<FieldingConfig>(DEFAULT_FIELDING_CONFIG);
  const { user } = useAuth();

  // Auto-determine scoring mode based on format
  const scoringMode: 'automated' | 'manual' = format === 'Test' ? 'manual' : 'automated';

  const handleCreate = () => {
    const newPool: PlayerPool = {
      id: Date.now().toString(),
      name,
      description,
      format,
      scoringMode,
      creatorId: user?.uid || '',
      adminIds: [user?.uid || ''],
      players: [],
      // Only include configs for automated mode
      ...(scoringMode === 'automated' && {
        battingConfig,
        bowlingConfig,
        fieldingConfig,
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };
    onSave(newPool);
    // Reset form
    setName('');
    setDescription('');
    setFormat('T20');
    setBattingConfig(DEFAULT_BATTING_CONFIG);
    setBowlingConfig(DEFAULT_BOWLING_CONFIG);
    setFieldingConfig(DEFAULT_FIELDING_CONFIG);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Create New Player Pool</DialogTitle>
      <DialogContent dividers sx={{ maxHeight: '70vh' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Pool Details */}
          <Box>
            <Typography variant="h6" gutterBottom>Pool Details</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Pool Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
                placeholder="e.g., IPL 2024"
              />
              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                rows={2}
                placeholder="Brief description of this player pool"
              />
              <FormControl fullWidth required>
                <InputLabel>Format</InputLabel>
                <Select
                  value={format}
                  label="Format"
                  onChange={(e) => setFormat(e.target.value as 'T20' | 'ODI' | 'Test')}
                >
                  <MenuItem value="T20">T20 (Automated Scoring)</MenuItem>
                  <MenuItem value="ODI">ODI (Automated Scoring)</MenuItem>
                  <MenuItem value="Test">Test (Manual Scoring)</MenuItem>
                </Select>
              </FormControl>
              {scoringMode === 'manual' && (
                <Alert severity="info">
                  <strong>Manual Scoring Mode:</strong> For Test format, you'll manually add points to each player rather than tracking detailed performance metrics.
                </Alert>
              )}
            </Box>
          </Box>

          {/* Batting Configuration - Only for Automated Mode */}
          {scoringMode === 'automated' && (
          <>
          <Box>
            <Typography variant="h6" gutterBottom color="primary">⚾ Batting Scoring Rules</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pl: 2 }}>
              <TextField
                label="Minimum Balls for Bonus"
                type="number"
                value={battingConfig.minBallsThreshold}
                onChange={(e) => setBattingConfig(prev => ({ ...prev, minBallsThreshold: parseInt(e.target.value) || 0 }))}
                size="small"
                inputProps={{ min: 0 }}
                helperText="Minimum balls faced to calculate strike rate bonus"
              />
              <TextField
                label="Strike Rate Bonus Trigger"
                type="number"
                value={battingConfig.bonusSRTrigger}
                onChange={(e) => setBattingConfig(prev => ({ ...prev, bonusSRTrigger: parseInt(e.target.value) || 0 }))}
                size="small"
                inputProps={{ min: 0 }}
                helperText="SR above this gets bonus (e.g., 150)"
              />
              <TextField
                label="Strike Rate Baseline"
                type="number"
                value={battingConfig.bonusSRBaseline}
                onChange={(e) => setBattingConfig(prev => ({ ...prev, bonusSRBaseline: parseInt(e.target.value) || 0 }))}
                size="small"
                inputProps={{ min: 0 }}
                helperText="Baseline for bonus calculation (e.g., 130)"
              />
              <TextField
                label="Bonus Divisor"
                type="number"
                value={battingConfig.bonusDivisor}
                onChange={(e) => setBattingConfig(prev => ({ ...prev, bonusDivisor: parseInt(e.target.value) || 1 }))}
                size="small"
                inputProps={{ min: 1 }}
                helperText="Divisor for bonus formula (e.g., 200)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={battingConfig.penaltiesEnabled}
                    onChange={(e) => setBattingConfig(prev => ({ ...prev, penaltiesEnabled: e.target.checked }))}
                  />
                }
                label="Enable Strike Rate Penalties"
              />
              {battingConfig.penaltiesEnabled && (
                <TextField
                  label="Penalty SR Threshold"
                  type="number"
                  value={battingConfig.penaltySRThreshold || 120}
                  onChange={(e) => setBattingConfig(prev => ({ ...prev, penaltySRThreshold: parseInt(e.target.value) || 120 }))}
                  size="small"
                  inputProps={{ min: 0 }}
                  helperText="SR below this gets penalty (e.g., 120)"
                />
              )}
            </Box>
          </Box>

          {/* Bowling Configuration */}
          <Box>
            <Typography variant="h6" gutterBottom color="secondary">💨 Bowling Scoring Rules</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pl: 2 }}>
              <TextField
                label="Points Per Wicket"
                type="number"
                value={bowlingConfig.wicketPoints}
                onChange={(e) => setBowlingConfig(prev => ({ ...prev, wicketPoints: parseInt(e.target.value) || 0 }))}
                size="small"
                inputProps={{ min: 0 }}
                helperText="Base points for each wicket (e.g., 25)"
              />
              <TextField
                label="Economy Bonus Threshold"
                type="number"
                value={bowlingConfig.economyBonusThreshold}
                onChange={(e) => setBowlingConfig(prev => ({ ...prev, economyBonusThreshold: parseFloat(e.target.value) || 0 }))}
                size="small"
                inputProps={{ min: 0, step: 0.1 }}
                helperText="Economy below this gets bonus (e.g., 7.0)"
              />
              <TextField
                label="Economy Multiplier"
                type="number"
                value={bowlingConfig.economyMultiplier}
                onChange={(e) => setBowlingConfig(prev => ({ ...prev, economyMultiplier: parseInt(e.target.value) || 1 }))}
                size="small"
                inputProps={{ min: 1 }}
                helperText="Multiplier for economy bonus (e.g., 5)"
              />
              <TextField
                label="Min Overs for Economy"
                type="number"
                value={bowlingConfig.minOversForEconomy}
                onChange={(e) => setBowlingConfig(prev => ({ ...prev, minOversForEconomy: parseFloat(e.target.value) || 0 }))}
                size="small"
                inputProps={{ min: 0, step: 0.1 }}
                helperText="Minimum overs to calculate economy (e.g., 1)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={bowlingConfig.penaltiesEnabled}
                    onChange={(e) => setBowlingConfig(prev => ({ ...prev, penaltiesEnabled: e.target.checked }))}
                  />
                }
                label="Enable Economy Penalties"
              />
              {bowlingConfig.penaltiesEnabled && (
                <TextField
                  label="Penalty Economy Threshold"
                  type="number"
                  value={bowlingConfig.economyPenaltyThreshold || 8}
                  onChange={(e) => setBowlingConfig(prev => ({ ...prev, economyPenaltyThreshold: parseFloat(e.target.value) || 8 }))}
                  size="small"
                  inputProps={{ min: 0, step: 0.1 }}
                  helperText="Economy above this gets penalty (e.g., 8.0)"
                />
              )}
            </Box>
          </Box>

          {/* Fielding Scoring Rules */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              ⚾ Fielding Scoring Rules
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Catch Points"
                type="number"
                value={fieldingConfig.catchPoints}
                onChange={(e) => setFieldingConfig(prev => ({ ...prev, catchPoints: parseInt(e.target.value) || 5 }))}
                size="small"
                inputProps={{ min: 0, step: 1 }}
                helperText="Points awarded per catch (default: 5)"
              />
              <TextField
                label="Run Out Points"
                type="number"
                value={fieldingConfig.runOutPoints}
                onChange={(e) => setFieldingConfig(prev => ({ ...prev, runOutPoints: parseInt(e.target.value) || 5 }))}
                size="small"
                inputProps={{ min: 0, step: 1 }}
                helperText="Points awarded per run out (default: 5)"
              />
              <TextField
                label="Stumping Points"
                type="number"
                value={fieldingConfig.stumpingPoints}
                onChange={(e) => setFieldingConfig(prev => ({ ...prev, stumpingPoints: parseInt(e.target.value) || 5 }))}
                size="small"
                inputProps={{ min: 0, step: 1 }}
                helperText="Points awarded per stumping (default: 5)"
              />
            </Box>
          </Box>
          </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={!name.trim()}
        >
          Create Pool
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Add Player Dialog
const AddPlayerDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onAdd: (player: PlayerPoolEntry) => void;
}> = ({ open, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [role, setRole] = useState<'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper'>('batsman');
  const [points, setPoints] = useState(0);
  const [isOverseas, setIsOverseas] = useState(false);

  const handleAdd = () => {
    const newPlayer: PlayerPoolEntry = {
      playerId: Date.now().toString(),
      name,
      team,
      role,
      points,
      isOverseas,
      lastUpdated: new Date()
    };
    onAdd(newPlayer);
    // Reset form
    setName('');
    setTeam('');
    setRole('batsman');
    setPoints(0);
    setIsOverseas(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Player to Pool</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label="Player Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Team"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            fullWidth
            required
          />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              value={role}
              label="Role"
              onChange={(e) => setRole(e.target.value as any)}
            >
              <MenuItem value="batsman">Batter</MenuItem>
              <MenuItem value="bowler">Bowler</MenuItem>
              <MenuItem value="allrounder">All-rounder</MenuItem>
              <MenuItem value="wicketkeeper">Wicket-keeper</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Initial Points"
            type="number"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            fullWidth
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={isOverseas}
                onChange={(e) => setIsOverseas(e.target.checked)}
              />
            }
            label="Overseas Player"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleAdd}
          variant="contained"
          disabled={!name.trim() || !team.trim()}
        >
          Add Player
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Edit Player Dialog
const EditPlayerDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  player: PlayerPoolEntry;
  onSave: (updatedPlayer: PlayerPoolEntry) => void;
}> = ({ open, onClose, player, onSave }) => {
  const [name, setName] = useState(player.name);
  const [role, setRole] = useState<'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper'>(player.role);

  // Update state when player changes
  useEffect(() => {
    setName(player.name);
    setRole(player.role);
  }, [player]);

  const handleSave = () => {
    const updatedPlayer: PlayerPoolEntry = {
      ...player,
      name: name.trim(),
      role,
      lastUpdated: new Date()
    };
    onSave(updatedPlayer);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Player</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label="Player Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              value={role}
              label="Role"
              onChange={(e) => setRole(e.target.value as any)}
            >
              <MenuItem value="batsman">Batter</MenuItem>
              <MenuItem value="bowler">Bowler</MenuItem>
              <MenuItem value="allrounder">All-rounder</MenuItem>
              <MenuItem value="wicketkeeper">Wicket-keeper</MenuItem>
            </Select>
          </FormControl>
          <Alert severity="info">
            Team and points cannot be edited here. Use the point management features to update points.
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!name.trim()}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Add Innings Dialog
const AddInningsDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  player: PlayerPoolEntry;
  battingConfig: BattingConfig;
  onSave: (updatedPlayer: PlayerPoolEntry) => void;
}> = ({ open, onClose, player, battingConfig, onSave }) => {
  const [runs, setRuns] = useState(0);
  const [ballsFaced, setBallsFaced] = useState(0);
  const [matchLabel, setMatchLabel] = useState('');
  const { user } = useAuth();

  const calculatedPoints = calculateBattingPoints(runs, ballsFaced, battingConfig);

  const handleAdd = () => {
    const newInnings: BattingInnings = {
      id: Date.now().toString(),
      matchLabel: matchLabel.trim() || undefined,
      runs,
      ballsFaced,
      pointsEarned: calculatedPoints,
      date: new Date(),
      addedBy: user?.uid
    };

    const updatedPlayer: PlayerPoolEntry = {
      ...player,
      battingInnings: [...(player.battingInnings || []), newInnings],
      points: player.points + calculatedPoints,
      lastUpdated: new Date(),
      updatedBy: user?.uid
    };

    onSave(updatedPlayer);

    // Reset form
    setRuns(0);
    setBallsFaced(0);
    setMatchLabel('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Batting Innings - {player.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label="Match Label (Optional)"
            value={matchLabel}
            onChange={(e) => setMatchLabel(e.target.value)}
            fullWidth
            placeholder="e.g., Test 1 - Day 1, Match 5"
            helperText="Optional label to identify this innings"
          />
          <TextField
            label="Runs"
            type="number"
            value={runs}
            onChange={(e) => setRuns(parseInt(e.target.value) || 0)}
            fullWidth
            required
            inputProps={{ min: 0 }}
          />
          <TextField
            label="Balls Faced"
            type="number"
            value={ballsFaced}
            onChange={(e) => setBallsFaced(parseInt(e.target.value) || 0)}
            fullWidth
            required
            inputProps={{ min: 0 }}
          />

          {/* Calculated Points Preview */}
          <Box sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: 1, border: '1px solid', borderColor: 'primary.main' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Calculated Points
            </Typography>
            <Typography variant="h4" color="primary.main" fontWeight="bold">
              {calculatedPoints.toFixed(2)}
            </Typography>
            {ballsFaced > 0 && (
              <Typography variant="caption" color="text.secondary">
                Strike Rate: {((runs / ballsFaced) * 100).toFixed(2)}
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleAdd}
          variant="contained"
          disabled={ballsFaced < 0 || runs < 0}
        >
          Add Innings
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Add Spell Dialog
const AddSpellDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  player: PlayerPoolEntry;
  bowlingConfig: BowlingConfig;
  onSave: (updatedPlayer: PlayerPoolEntry) => void;
}> = ({ open, onClose, player, bowlingConfig, onSave }) => {
  const [overs, setOvers] = useState(0);
  const [runsConceded, setRunsConceded] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [matchLabel, setMatchLabel] = useState('');
  const { user } = useAuth();

  const calculatedPoints = calculateBowlingPoints(overs, runsConceded, wickets, bowlingConfig);

  const handleAdd = () => {
    const newSpell: BowlingSpell = {
      id: Date.now().toString(),
      matchLabel: matchLabel.trim() || undefined,
      overs,
      runsConceded,
      wickets,
      pointsEarned: calculatedPoints,
      date: new Date(),
      addedBy: user?.uid
    };

    const updatedPlayer: PlayerPoolEntry = {
      ...player,
      bowlingSpells: [...(player.bowlingSpells || []), newSpell],
      points: player.points + calculatedPoints,
      lastUpdated: new Date(),
      updatedBy: user?.uid
    };

    onSave(updatedPlayer);

    // Reset form
    setOvers(0);
    setRunsConceded(0);
    setWickets(0);
    setMatchLabel('');
  };

  // Calculate economy for display
  const balls = Math.floor(overs) * 6 + (Math.ceil(overs * 10) % 10);
  const economy = balls > 0 ? (runsConceded / balls) * 6 : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Bowling Spell - {player.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label="Match Label (Optional)"
            value={matchLabel}
            onChange={(e) => setMatchLabel(e.target.value)}
            fullWidth
            placeholder="e.g., Test 1 - Day 1, Match 5"
            helperText="Optional label to identify this spell"
          />
          <TextField
            label="Overs"
            type="number"
            value={overs}
            onChange={(e) => setOvers(parseFloat(e.target.value) || 0)}
            fullWidth
            required
            inputProps={{ min: 0, step: 0.1 }}
            helperText="e.g., 3.2 for 3 overs 2 balls"
          />
          <TextField
            label="Runs Conceded"
            type="number"
            value={runsConceded}
            onChange={(e) => setRunsConceded(parseInt(e.target.value) || 0)}
            fullWidth
            required
            inputProps={{ min: 0 }}
          />
          <TextField
            label="Wickets"
            type="number"
            value={wickets}
            onChange={(e) => setWickets(parseInt(e.target.value) || 0)}
            fullWidth
            required
            inputProps={{ min: 0 }}
          />

          {/* Calculated Points Preview */}
          <Box sx={{ p: 2, bgcolor: 'secondary.lighter', borderRadius: 1, border: '1px solid', borderColor: 'secondary.main' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Calculated Points
            </Typography>
            <Typography variant="h4" color="secondary.main" fontWeight="bold">
              {calculatedPoints.toFixed(2)}
            </Typography>
            {overs > 0 && (
              <Typography variant="caption" color="text.secondary">
                Economy: {economy.toFixed(2)}
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleAdd}
          variant="contained"
          disabled={overs < 0 || runsConceded < 0 || wickets < 0}
        >
          Add Spell
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Scoring Configuration Content - Reusable component to display scoring rules
const ScoringConfigContent: React.FC<{
  pool: PlayerPool;
}> = ({ pool }) => {
  const battingConfig = pool.battingConfig || DEFAULT_BATTING_CONFIG;
  const bowlingConfig = pool.bowlingConfig || DEFAULT_BOWLING_CONFIG;
  const fieldingConfig = pool.fieldingConfig || DEFAULT_FIELDING_CONFIG;
  const scoringMode = pool.scoringMode || 'automated';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Scoring Mode */}
          <Box>
            <Chip
              label={scoringMode === 'automated' ? 'Automated Scoring' : 'Manual Scoring'}
              color={scoringMode === 'automated' ? 'success' : 'default'}
              sx={{ mb: 1 }}
            />
            {pool.format && (
              <Chip
                label={`Format: ${pool.format}`}
                sx={{
                  ml: 1,
                  bgcolor: '#1E88E5',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: '#016293'
                  }
                }}
              />
            )}
          </Box>

          {scoringMode === 'automated' ? (
            <>
              {/* Batting Configuration */}
              <Box sx={{ p: 2, bgcolor: 'rgba(30, 136, 229, 0.08)', borderRadius: 2, border: '1px solid', borderColor: 'rgba(30, 136, 229, 0.3)' }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#1E88E5', display: 'flex', alignItems: 'center', gap: 1 }}>
                  ⚾ Batting Scoring Rules
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Minimum Balls Threshold</Typography>
                    <Typography variant="body1" fontWeight="bold">{battingConfig.minBallsThreshold} balls</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Bonus SR Trigger</Typography>
                    <Typography variant="body1" fontWeight="bold">{battingConfig.bonusSRTrigger}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Bonus SR Baseline</Typography>
                    <Typography variant="body1" fontWeight="bold">{battingConfig.bonusSRBaseline}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Bonus Divisor</Typography>
                    <Typography variant="body1" fontWeight="bold">{battingConfig.bonusDivisor}</Typography>
                  </Box>
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="body2" color="text.secondary">Penalties Enabled</Typography>
                    <Chip
                      label={battingConfig.penaltiesEnabled ? 'Yes' : 'No'}
                      color={battingConfig.penaltiesEnabled ? 'error' : 'default'}
                      size="small"
                    />
                    {battingConfig.penaltiesEnabled && battingConfig.penaltySRThreshold && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        Penalty SR Threshold: <strong>{battingConfig.penaltySRThreshold}</strong>
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Batting Bonus Example */}
                {(() => {
                  // Calculate example values based on config
                  const exampleRuns = 65;
                  const exampleBalls = 40;
                  const exampleSR = (exampleRuns / exampleBalls) * 100;
                  const bonusPoints = (exampleRuns * (exampleSR - battingConfig.bonusSRBaseline)) / battingConfig.bonusDivisor;
                  const totalPoints = exampleRuns + bonusPoints;

                  return (
                    <Box sx={{
                      mt: 3,
                      p: 2.5,
                      background: 'linear-gradient(135deg, rgba(30, 136, 229, 0.08) 0%, rgba(30, 136, 229, 0.03) 100%)',
                      borderRadius: 2,
                      border: '2px solid',
                      borderColor: 'rgba(30, 136, 229, 0.3)',
                      boxShadow: '0 4px 12px rgba(30, 136, 229, 0.15)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 6px 20px rgba(30, 136, 229, 0.25)',
                        borderColor: 'rgba(30, 136, 229, 0.5)',
                      }
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Box sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          bgcolor: '#1E88E5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(30, 136, 229, 0.3)'
                        }}>
                          <Typography sx={{ fontSize: '1.2rem' }}>💡</Typography>
                        </Box>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#1E88E5' }}>
                          Example: Bonus Points
                        </Typography>
                      </Box>
                      <Box sx={{
                        p: 2,
                        mb: 2,
                        bgcolor: 'rgba(30, 136, 229, 0.15)',
                        borderRadius: 1.5,
                        border: '1px solid rgba(30, 136, 229, 0.4)'
                      }}>
                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                          A player scores <strong style={{ color: '#90caf9', fontSize: '1.05em' }}>{exampleRuns} runs off {exampleBalls} balls</strong> (SR: <strong style={{ color: '#90caf9' }}>{exampleSR.toFixed(1)}</strong>)
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#1E88E5' }} />
                          <Typography variant="body2" color="text.secondary">
                            Base points: <strong style={{ color: '#1E88E5' }}>{exampleRuns} pts</strong> (1 pt per run)
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#1E88E5' }} />
                          <Typography variant="body2" color="text.secondary">
                            Balls faced ≥ {battingConfig.minBallsThreshold}? <strong style={{ color: exampleBalls >= battingConfig.minBallsThreshold ? '#4caf50' : '#f44336' }}>{exampleBalls >= battingConfig.minBallsThreshold ? '✓ Yes' : '✗ No'}</strong>
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#1E88E5' }} />
                          <Typography variant="body2" color="text.secondary">
                            SR ({exampleSR.toFixed(1)}) ≥ Trigger ({battingConfig.bonusSRTrigger})? <strong style={{ color: exampleSR >= battingConfig.bonusSRTrigger ? '#4caf50' : '#f44336' }}>{exampleSR >= battingConfig.bonusSRTrigger ? '✓ Yes' : '✗ No'}</strong>
                          </Typography>
                        </Box>
                        {exampleSR >= battingConfig.bonusSRTrigger && exampleBalls >= battingConfig.minBallsThreshold && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} />
                            <Typography variant="body2" color="text.secondary">
                              Bonus = ({exampleRuns} × ({exampleSR.toFixed(1)} - {battingConfig.bonusSRBaseline})) / {battingConfig.bonusDivisor} = <strong style={{ color: '#4caf50', fontSize: '1.05em' }}>+{bonusPoints.toFixed(2)} pts</strong>
                            </Typography>
                          </Box>
                        )}
                        <Box sx={{
                          mt: 1,
                          p: 1.5,
                          bgcolor: 'rgba(30, 136, 229, 0.12)',
                          borderRadius: 1,
                          border: '1px solid rgba(30, 136, 229, 0.3)'
                        }}>
                          <Typography variant="body1" fontWeight="bold" sx={{ color: '#1E88E5', textAlign: 'center' }}>
                            Total Points: {totalPoints.toFixed(2)} pts
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })()}

                {/* Batting Penalty Example */}
                {battingConfig.penaltiesEnabled && battingConfig.penaltySRThreshold && (() => {
                  // Calculate penalty example based on config
                  const exampleRuns = 18;
                  const exampleBalls = 24;
                  const exampleSR = (exampleRuns / exampleBalls) * 100;
                  const penaltyPoints = (exampleRuns * (exampleSR - battingConfig.bonusSRBaseline)) / battingConfig.bonusDivisor;
                  const totalPoints = exampleRuns + penaltyPoints;

                  return (
                    <Box sx={{
                      mt: 2,
                      p: 2.5,
                      background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.08) 0%, rgba(244, 67, 54, 0.03) 100%)',
                      borderRadius: 2,
                      border: '2px solid',
                      borderColor: 'rgba(244, 67, 54, 0.3)',
                      boxShadow: '0 4px 12px rgba(244, 67, 54, 0.15)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 6px 20px rgba(244, 67, 54, 0.25)',
                        borderColor: 'rgba(244, 67, 54, 0.5)',
                      }
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Box sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          bgcolor: 'error.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(244, 67, 54, 0.3)'
                        }}>
                          <Typography sx={{ fontSize: '1.2rem' }}>⚠️</Typography>
                        </Box>
                        <Typography variant="subtitle1" fontWeight="bold" color="error.main">
                          Example: Penalty Points
                        </Typography>
                      </Box>
                      <Box sx={{
                        p: 2,
                        mb: 2,
                        bgcolor: 'rgba(244, 67, 54, 0.15)',
                        borderRadius: 1.5,
                        border: '1px solid rgba(244, 67, 54, 0.4)'
                      }}>
                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                          A player scores <strong style={{ color: '#ef5350', fontSize: '1.05em' }}>{exampleRuns} runs off {exampleBalls} balls</strong> (SR: <strong style={{ color: '#ef5350' }}>{exampleSR.toFixed(1)}</strong>)
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main' }} />
                          <Typography variant="body2" color="text.secondary">
                            Base points: <strong style={{ color: '#f44336' }}>{exampleRuns} pts</strong> (1 pt per run)
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main' }} />
                          <Typography variant="body2" color="text.secondary">
                            Balls faced ≥ {battingConfig.minBallsThreshold}? <strong style={{ color: exampleBalls >= battingConfig.minBallsThreshold ? '#4caf50' : '#f44336' }}>{exampleBalls >= battingConfig.minBallsThreshold ? '✓ Yes' : '✗ No'}</strong>
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main' }} />
                          <Typography variant="body2" color="text.secondary">
                            SR ({exampleSR.toFixed(1)}) {'<'} Penalty Threshold ({battingConfig.penaltySRThreshold})? <strong style={{ color: exampleSR < battingConfig.penaltySRThreshold ? '#f44336' : '#4caf50' }}>{exampleSR < battingConfig.penaltySRThreshold ? '✓ Yes' : '✗ No'}</strong>
                          </Typography>
                        </Box>
                        {exampleSR < battingConfig.penaltySRThreshold && exampleBalls >= battingConfig.minBallsThreshold && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'warning.main' }} />
                            <Typography variant="body2" color="text.secondary">
                              Penalty = ({exampleRuns} × ({exampleSR.toFixed(1)} - {battingConfig.bonusSRBaseline})) / {battingConfig.bonusDivisor} = <strong style={{ color: '#ff9800', fontSize: '1.05em' }}>{penaltyPoints.toFixed(2)} pts</strong>
                            </Typography>
                          </Box>
                        )}
                        <Box sx={{
                          mt: 1,
                          p: 1.5,
                          bgcolor: 'rgba(244, 67, 54, 0.12)',
                          borderRadius: 1,
                          border: '1px solid rgba(244, 67, 54, 0.3)'
                        }}>
                          <Typography variant="body1" fontWeight="bold" color="error.main" sx={{ textAlign: 'center' }}>
                            Total Points: {totalPoints.toFixed(2)} pts
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })()}
              </Box>

              {/* Bowling Configuration */}
              <Box sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 2, border: '1px solid', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#90caf9', display: 'flex', alignItems: 'center', gap: 1 }}>
                  💨 Bowling Scoring Rules
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Wicket Points</Typography>
                    <Typography variant="body1" fontWeight="bold">{bowlingConfig.wicketPoints} pts</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Economy Bonus Threshold</Typography>
                    <Typography variant="body1" fontWeight="bold">{bowlingConfig.economyBonusThreshold}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Economy Multiplier</Typography>
                    <Typography variant="body1" fontWeight="bold">{bowlingConfig.economyMultiplier}x</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Min Overs for Economy</Typography>
                    <Typography variant="body1" fontWeight="bold">{bowlingConfig.minOversForEconomy}</Typography>
                  </Box>
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="body2" color="text.secondary">Penalties Enabled</Typography>
                    <Chip
                      label={bowlingConfig.penaltiesEnabled ? 'Yes' : 'No'}
                      color={bowlingConfig.penaltiesEnabled ? 'error' : 'default'}
                      size="small"
                    />
                    {bowlingConfig.penaltiesEnabled && bowlingConfig.economyPenaltyThreshold && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        Economy Penalty Threshold: <strong>{bowlingConfig.economyPenaltyThreshold}</strong>
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Bowling Bonus Example */}
                {(() => {
                  // Calculate example values based on config
                  const exampleWickets = 3;
                  const exampleOvers = 4;
                  const exampleRuns = 22;
                  const exampleEconomy = exampleRuns / exampleOvers;
                  const wicketPoints = exampleWickets * bowlingConfig.wicketPoints;
                  const economyDiff = bowlingConfig.economyBonusThreshold - exampleEconomy;
                  const bonusPoints = economyDiff * bowlingConfig.economyMultiplier;
                  const totalPoints = wicketPoints + bonusPoints;

                  return (
                    <Box sx={{
                      mt: 3,
                      p: 2.5,
                      background: 'linear-gradient(135deg, rgba(30, 136, 229, 0.08) 0%, rgba(30, 136, 229, 0.03) 100%)',
                      borderRadius: 2,
                      border: '2px solid',
                      borderColor: 'rgba(30, 136, 229, 0.3)',
                      boxShadow: '0 4px 12px rgba(30, 136, 229, 0.15)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 6px 20px rgba(30, 136, 229, 0.25)',
                        borderColor: 'rgba(30, 136, 229, 0.5)',
                      }
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Box sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          bgcolor: '#1E88E5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(30, 136, 229, 0.3)'
                        }}>
                          <Typography sx={{ fontSize: '1.2rem' }}>💡</Typography>
                        </Box>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#1E88E5' }}>
                          Example: Bonus Points
                        </Typography>
                      </Box>
                      <Box sx={{
                        p: 2,
                        mb: 2,
                        bgcolor: 'rgba(30, 136, 229, 0.15)',
                        borderRadius: 1.5,
                        border: '1px solid rgba(30, 136, 229, 0.4)'
                      }}>
                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                          A bowler takes <strong style={{ color: '#90caf9', fontSize: '1.05em' }}>{exampleWickets} wickets, {exampleRuns} runs in {exampleOvers} overs</strong> (Economy: <strong style={{ color: '#90caf9' }}>{exampleEconomy.toFixed(2)}</strong>)
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#1E88E5' }} />
                          <Typography variant="body2" color="text.secondary">
                            Wicket points: <strong style={{ color: '#1E88E5' }}>{exampleWickets} × {bowlingConfig.wicketPoints} = {wicketPoints} pts</strong>
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#1E88E5' }} />
                          <Typography variant="body2" color="text.secondary">
                            Overs bowled ≥ {bowlingConfig.minOversForEconomy}? <strong style={{ color: exampleOvers >= bowlingConfig.minOversForEconomy ? '#4caf50' : '#f44336' }}>{exampleOvers >= bowlingConfig.minOversForEconomy ? '✓ Yes' : '✗ No'}</strong>
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#1E88E5' }} />
                          <Typography variant="body2" color="text.secondary">
                            Economy ({exampleEconomy.toFixed(2)}) {'<'} Threshold ({bowlingConfig.economyBonusThreshold})? <strong style={{ color: exampleEconomy < bowlingConfig.economyBonusThreshold ? '#4caf50' : '#f44336' }}>{exampleEconomy < bowlingConfig.economyBonusThreshold ? '✓ Yes' : '✗ No'}</strong>
                          </Typography>
                        </Box>
                        {exampleEconomy < bowlingConfig.economyBonusThreshold && exampleOvers >= bowlingConfig.minOversForEconomy && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} />
                            <Typography variant="body2" color="text.secondary">
                              Bonus = ({bowlingConfig.economyBonusThreshold} - {exampleEconomy.toFixed(2)}) × {bowlingConfig.economyMultiplier} = <strong style={{ color: '#4caf50', fontSize: '1.05em' }}>+{bonusPoints.toFixed(2)} pts</strong>
                            </Typography>
                          </Box>
                        )}
                        <Box sx={{
                          mt: 1,
                          p: 1.5,
                          bgcolor: 'rgba(30, 136, 229, 0.12)',
                          borderRadius: 1,
                          border: '1px solid rgba(30, 136, 229, 0.3)'
                        }}>
                          <Typography variant="body1" fontWeight="bold" sx={{ color: '#1E88E5', textAlign: 'center' }}>
                            Total Points: {totalPoints.toFixed(2)} pts
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })()}

                {/* Bowling Penalty Example */}
                {bowlingConfig.penaltiesEnabled && bowlingConfig.economyPenaltyThreshold && (() => {
                  // Calculate penalty example based on config
                  const exampleWickets = 1;
                  const exampleOvers = 4;
                  const exampleRuns = 48;
                  const exampleEconomy = exampleRuns / exampleOvers;
                  const wicketPoints = exampleWickets * bowlingConfig.wicketPoints;
                  const economyPenalty = (bowlingConfig.economyPenaltyThreshold - exampleEconomy) * bowlingConfig.economyMultiplier;
                  const totalPoints = wicketPoints + economyPenalty;

                  return (
                    <Box sx={{
                      mt: 3,
                      p: 2.5,
                      background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.08) 0%, rgba(244, 67, 54, 0.03) 100%)',
                      borderRadius: 2,
                      border: '2px solid',
                      borderColor: 'rgba(244, 67, 54, 0.3)',
                      boxShadow: '0 4px 12px rgba(244, 67, 54, 0.15)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 6px 20px rgba(244, 67, 54, 0.25)',
                        borderColor: 'rgba(244, 67, 54, 0.5)',
                      }
                    }}>
                      <Box sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: 'error.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 1.5,
                        boxShadow: '0 2px 8px rgba(244, 67, 54, 0.3)'
                      }}>
                        <Typography sx={{ fontSize: '1.2rem' }}>⚠️</Typography>
                      </Box>

                      <Typography variant="subtitle2" fontWeight="bold" color="error.main" gutterBottom sx={{ mb: 1.5 }}>
                        Example: Penalty Points
                      </Typography>

                      <Box sx={{
                        p: 2,
                        mb: 2,
                        bgcolor: 'rgba(244, 67, 54, 0.15)',
                        borderRadius: 1.5,
                        border: '1px solid rgba(244, 67, 54, 0.4)'
                      }}>
                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                          A bowler takes <strong style={{ color: '#ef5350', fontSize: '1.05em' }}>{exampleWickets} wicket</strong>, concedes <strong style={{ color: '#ef5350', fontSize: '1.05em' }}>{exampleRuns} runs in {exampleOvers} overs</strong> (Economy: <strong style={{ color: '#ef5350' }}>{exampleEconomy.toFixed(2)}</strong>)
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main' }} />
                        <Typography variant="body2" color="text.secondary">
                          Wicket points: <strong style={{ color: '#f44336' }}>{exampleWickets} × {bowlingConfig.wicketPoints} = {wicketPoints} pts</strong>
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main' }} />
                        <Typography variant="body2" color="text.secondary">
                          Overs bowled ≥ {bowlingConfig.minOversForEconomy}? <strong style={{ color: exampleOvers >= bowlingConfig.minOversForEconomy ? '#4caf50' : '#f44336' }}>{exampleOvers >= bowlingConfig.minOversForEconomy ? '✓ Yes' : '✗ No'}</strong>
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main' }} />
                        <Typography variant="body2" color="text.secondary">
                          Economy ({exampleEconomy.toFixed(2)}) {'>'} Penalty Threshold ({bowlingConfig.economyPenaltyThreshold})? <strong style={{ color: exampleEconomy > bowlingConfig.economyPenaltyThreshold ? '#4caf50' : '#f44336' }}>{exampleEconomy > bowlingConfig.economyPenaltyThreshold ? '✓ Yes' : '✗ No'}</strong>
                        </Typography>
                      </Box>

                      {exampleEconomy > bowlingConfig.economyPenaltyThreshold && exampleOvers >= bowlingConfig.minOversForEconomy && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main' }} />
                          <Typography variant="body2" color="text.secondary">
                            Economy penalty: <strong style={{ color: '#f44336' }}>({bowlingConfig.economyPenaltyThreshold} - {exampleEconomy.toFixed(2)}) × {bowlingConfig.economyMultiplier} = {economyPenalty.toFixed(2)} pts</strong>
                          </Typography>
                        </Box>
                      )}

                      <Box sx={{
                        mt: 1,
                        p: 1.5,
                        bgcolor: 'rgba(244, 67, 54, 0.12)',
                        borderRadius: 1,
                        border: '1px solid rgba(244, 67, 54, 0.3)'
                      }}>
                        <Typography variant="body1" fontWeight="bold" color="error.main" sx={{ textAlign: 'center' }}>
                          Total Points: {totalPoints.toFixed(2)} pts
                        </Typography>
                      </Box>
                    </Box>
                  );
                })()}
              </Box>

              {/* Fielding Configuration */}
              <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 2, border: '1px solid', borderColor: 'success.main' }}>
                <Typography variant="h6" color="success.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  🧤 Fielding Scoring Rules
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Catch Points</Typography>
                    <Typography variant="body1" fontWeight="bold">{fieldingConfig.catchPoints} pts</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Run Out Points</Typography>
                    <Typography variant="body1" fontWeight="bold">{fieldingConfig.runOutPoints} pts</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Stumping Points</Typography>
                    <Typography variant="body1" fontWeight="bold">{fieldingConfig.stumpingPoints} pts</Typography>
                  </Box>
                </Box>
              </Box>
            </>
          ) : (
            <Alert severity="info">
              This player pool uses <strong>Manual Scoring Mode</strong>. Points are added manually by admins rather than being calculated from detailed performance metrics.
            </Alert>
          )}
        </Box>
  );
};

// Scoring Configuration Dialog - Display scoring rules for a player pool
const ScoringConfigDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  pool: PlayerPool;
}> = ({ open, onClose, pool }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoOutlined color="info" />
          <Typography variant="h6">Scoring Configuration - {pool.name}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <ScoringConfigContent pool={pool} />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            bgcolor: '#1E88E5',
            '&:hover': {
              bgcolor: '#016293'
            }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlayerPoolManagementPage;
