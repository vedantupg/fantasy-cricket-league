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
  Snackbar
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Save,
  Cancel,
  SportsCricket,
  PersonAdd
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import AppHeader from '../components/common/AppHeader';
import { playerPoolService, playerPoolSnapshotService } from '../services/firestore';
import type { PlayerPool, PlayerPoolEntry } from '../types/database';

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
                pool={selectedPool}
                onUpdate={async (updatedPool) => {
                  try {
                    // Ensure players is an array
                    const poolToUpdate = {
                      ...updatedPool,
                      players: updatedPool.players || []
                    };

                    console.log('Updating player pool with', poolToUpdate.players.length, 'players...');

                    // Directly update the entire players array in Firestore
                    // This handles both adding new players and updating existing ones
                    await playerPoolService.update(poolToUpdate.id, {
                      players: poolToUpdate.players,
                      lastUpdateMessage: poolToUpdate.lastUpdateMessage,
                      updatedAt: new Date()
                    });

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
                  } catch (error) {
                    console.error('Error updating player pool:', error);
                    setSnackbarMessage('Failed to update player pool');
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
                <TableCell><strong>Points</strong></TableCell>
                <TableCell><strong>Last Updated</strong></TableCell>
                {editMode && <TableCell align="center"><strong>Actions</strong></TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {editedPlayers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={editMode ? 6 : 5} align="center">
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
                  <TableRow key={player.playerId}>
                    <TableCell>{player.name}</TableCell>
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
  const { user } = useAuth();

  const handleCreate = () => {
    const newPool: PlayerPool = {
      id: Date.now().toString(),
      name,
      description,
      creatorId: user?.uid || '',
      adminIds: [user?.uid || ''],
      players: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };
    onSave(newPool);
    setName('');
    setDescription('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Player Pool</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
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
            rows={3}
            placeholder="Brief description of this player pool"
          />
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

  const handleAdd = () => {
    const newPlayer: PlayerPoolEntry = {
      playerId: Date.now().toString(),
      name,
      team,
      role,
      points,
      lastUpdated: new Date()
    };
    onAdd(newPlayer);
    // Reset form
    setName('');
    setTeam('');
    setRole('batsman');
    setPoints(0);
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

export default PlayerPoolManagementPage;
