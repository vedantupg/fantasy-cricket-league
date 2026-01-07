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
  Speed,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import AppHeader from '../components/common/AppHeader';
import { playerPoolService, playerPoolSnapshotService } from '../services/firestore';
import type { PlayerPool, PlayerPoolEntry, BattingConfig, BowlingConfig, BattingInnings, BowlingSpell } from '../types/database';
import { DEFAULT_BATTING_CONFIG, DEFAULT_BOWLING_CONFIG, calculateBattingPoints, calculateBowlingPoints } from '../utils/pointsCalculation';

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

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Page Header with Actions */}
        <Box mb={4} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Player Pool Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage player pools and update points
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setCreateDialogOpen(true)}
            startIcon={<Add />}
          >
            Create Player Pool
          </Button>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Left Panel - Player Pools List */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Player Pools ({playerPools.length})
                </Typography>

                {playerPools.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <SportsCricket sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      No player pools created yet
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() => setCreateDialogOpen(true)}
                      sx={{ mt: 2 }}
                      startIcon={<Add />}
                    >
                      Create First Pool
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
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
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {pool.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {pool.players.length} players
                              </Typography>
                            </Box>
                            <Chip
                              label={pool.isActive ? 'Active' : 'Inactive'}
                              color={pool.isActive ? 'success' : 'default'}
                              size="small"
                            />
                          </Box>
                          {pool.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
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
                    await playerPoolService.update(poolToUpdate.id, {
                      players: poolToUpdate.players,
                      lastUpdateMessage: poolToUpdate.lastUpdateMessage,
                      battingConfig: poolToUpdate.battingConfig,
                      bowlingConfig: poolToUpdate.bowlingConfig,
                      updatedAt: new Date()
                    });

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
                <CardContent sx={{ textAlign: 'center', py: 8 }}>
                  <SportsCricket sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Select a Player Pool
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
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
              creatorId: user?.uid || '',
              adminIds: [user?.uid || ''],
              players: [],
              battingConfig: newPool.battingConfig,
              bowlingConfig: newPool.bowlingConfig,
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
  const [addInningsDialogOpen, setAddInningsDialogOpen] = useState(false);
  const [addSpellDialogOpen, setAddSpellDialogOpen] = useState(false);
  const [selectedPlayerForPerformance, setSelectedPlayerForPerformance] = useState<PlayerPoolEntry | null>(null);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Sync editedPlayers when pool changes
  useEffect(() => {
    const playersArray = getPlayersArray(pool.players);
    setEditedPlayers(playersArray);
    setUpdateMessage(pool.lastUpdateMessage || '');
  }, [pool]);

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
                editedPlayers.map((player) => (
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
                    </TableCell>
                    {editMode && (
                      <TableCell align="center">
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleDeletePlayer(player.playerId)}
                        >
                          <Delete />
                        </IconButton>
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

      {/* Add Innings Dialog */}
      {selectedPlayerForPerformance && (
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

      {/* Add Spell Dialog */}
      {selectedPlayerForPerformance && (
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
  const [battingConfig, setBattingConfig] = useState<BattingConfig>(DEFAULT_BATTING_CONFIG);
  const [bowlingConfig, setBowlingConfig] = useState<BowlingConfig>(DEFAULT_BOWLING_CONFIG);
  const { user } = useAuth();

  const handleCreate = () => {
    const newPool: PlayerPool = {
      id: Date.now().toString(),
      name,
      description,
      creatorId: user?.uid || '',
      adminIds: [user?.uid || ''],
      players: [],
      battingConfig,
      bowlingConfig,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };
    onSave(newPool);
    // Reset form
    setName('');
    setDescription('');
    setBattingConfig(DEFAULT_BATTING_CONFIG);
    setBowlingConfig(DEFAULT_BOWLING_CONFIG);
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
            </Box>
          </Box>

          {/* Batting Configuration */}
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

export default PlayerPoolManagementPage;
