import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  Button,
  Checkbox,
} from '@mui/material';
import { FlashOn, Save } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService, squadService, leaderboardSnapshotService } from '../services/firestore';
import type { League, LeagueSquad } from '../types/database';
import AppHeader from '../components/common/AppHeader';

const PowerplayManagementPage: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [squads, setSquads] = useState<LeagueSquad[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingSquads, setFetchingSquads] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [powerplayData, setPowerplayData] = useState<{
    [squadId: string]: { points: string; completed: boolean };
  }>({});
  const [savingAll, setSavingAll] = useState(false);

  const { user, userData } = useAuth();
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    if (userData && !userData.isAdmin) {
      navigate('/');
    }
  }, [userData, navigate]);

  // Fetch all leagues
  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        setLoading(true);
        setError('');

        // Get all leagues (for admins, we'll show all)
        const allLeagues = await leagueService.getForUser(user!.uid);
        setLeagues(allLeagues);

        if (allLeagues.length > 0) {
          setSelectedLeagueId(allLeagues[0].id);
        }
      } catch (err: any) {
        console.error('Error fetching leagues:', err);
        setError(err.message || 'Failed to load leagues');
      } finally {
        setLoading(false);
      }
    };

    if (userData?.isAdmin) {
      fetchLeagues();
    }
  }, [user, userData]);

  // Fetch squads when league is selected
  useEffect(() => {
    const fetchSquads = async () => {
      if (!selectedLeagueId) return;

      try {
        setFetchingSquads(true);
        setError('');

        const leagueSquads = await squadService.getByLeague(selectedLeagueId);
        setSquads(leagueSquads);

        // Initialize powerplayData with existing values
        const initialData: { [squadId: string]: { points: string; completed: boolean } } = {};
        leagueSquads.forEach((squad) => {
          if (squad.powerplayMatchNumber) {
            initialData[squad.id] = {
              points: squad.powerplayPoints?.toString() || '',
              completed: squad.powerplayCompleted || false,
            };
          }
        });
        setPowerplayData(initialData);
      } catch (err: any) {
        console.error('Error fetching squads:', err);
        setError(err.message || 'Failed to load squads');
      } finally {
        setFetchingSquads(false);
      }
    };

    fetchSquads();
  }, [selectedLeagueId]);

  // Function to save all powerplay data and update leaderboard
  const handleSaveAllPowerplayData = async () => {
    if (!selectedLeagueId) {
      setError('No league selected');
      return;
    }

    try {
      setSavingAll(true);
      setError('');
      setSuccess('');

      // Collect all squads that have powerplay data to update
      const updates: Promise<void>[] = [];
      const updatedSquads = [...squads];

      Object.entries(powerplayData).forEach(([squadId, data]) => {
        const points = parseFloat(data.points || '0');

        if (!isNaN(points) && points >= 0) {
          // Create update promise
          updates.push(
            squadService.update(squadId, {
              powerplayPoints: points,
              powerplayCompleted: data.completed,
            })
          );

          // Update local state
          const squadIndex = updatedSquads.findIndex((s) => s.id === squadId);
          if (squadIndex !== -1) {
            updatedSquads[squadIndex] = {
              ...updatedSquads[squadIndex],
              powerplayPoints: points,
              powerplayCompleted: data.completed,
            };
          }
        }
      });

      // Wait for all updates to complete
      if (updates.length > 0) {
        await Promise.all(updates);

        // Update local state
        setSquads(updatedSquads);

        // Create new leaderboard snapshot with updated points
        await leaderboardSnapshotService.create(selectedLeagueId);

        setSuccess(`Successfully updated ${updates.length} squad(s) and refreshed the leaderboard!`);
      } else {
        setError('No valid powerplay data to save');
      }
    } catch (err: any) {
      console.error('Error saving powerplay data:', err);
      setError(err.message || 'Failed to save powerplay data');
    } finally {
      setSavingAll(false);
    }
  };

  if (!userData?.isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Box>
        <AppHeader />
        <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  const selectedLeague = leagues.find((l) => l.id === selectedLeagueId);
  const submittedSquads = squads.filter((s) => s.isSubmitted);
  const squadsWithPowerplay = submittedSquads.filter((s) => s.powerplayMatchNumber);

  return (
    <Box>
      <AppHeader />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box mb={4}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Powerplay Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Award powerplay points and mark matches as completed for the selected league
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* League Selector */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <FormControl fullWidth>
              <InputLabel>Select League</InputLabel>
              <Select
                value={selectedLeagueId}
                label="Select League"
                onChange={(e) => setSelectedLeagueId(e.target.value)}
              >
                {leagues.map((league) => (
                  <MenuItem key={league.id} value={league.id}>
                    {league.name} - {league.tournamentName} ({league.format})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedLeague && (
              <Box mt={2} display="flex" gap={2} flexWrap="wrap">
                <Chip
                  label={`${selectedLeague.participants.length} Participants`}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={`${squadsWithPowerplay.length} Powerplay Matches Selected`}
                  color="warning"
                  variant="outlined"
                />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Save All Button */}
        {submittedSquads.length > 0 && (
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={savingAll ? <CircularProgress size={20} color="inherit" /> : <Save />}
              onClick={handleSaveAllPowerplayData}
              disabled={savingAll || Object.keys(powerplayData).length === 0}
            >
              {savingAll ? 'Saving & Updating Leaderboard...' : 'Save All & Update Leaderboard'}
            </Button>
          </Box>
        )}

        {/* Powerplay Table */}
        {fetchingSquads ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : submittedSquads.length === 0 ? (
          <Card>
            <CardContent>
              <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
                No squads submitted yet for this league
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper} elevation={2}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>#</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Squad Name</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <FlashOn fontSize="small" />
                      Powerplay Match
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>PP Points</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Completed</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Total Points</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submittedSquads.map((squad, index) => (
                  <TableRow
                    key={squad.id}
                    sx={{
                      '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                      '&:hover': { bgcolor: 'action.selected' },
                    }}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="600" color="primary">
                        {squad.squadName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`Match ${squad.powerplayMatchNumber}`}
                        size="small"
                        color="warning"
                        variant="outlined"
                        icon={<FlashOn />}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        placeholder={squad.powerplayPoints ? `Current: ${squad.powerplayPoints}` : '0'}
                        value={powerplayData[squad.id]?.points || ''}
                        onChange={(e) =>
                          setPowerplayData({
                            ...powerplayData,
                            [squad.id]: {
                              points: e.target.value,
                              completed: powerplayData[squad.id]?.completed || false,
                            },
                          })
                        }
                        sx={{ width: 120 }}
                        inputProps={{ min: 0, step: 1 }}
                        label="PP Points"
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={powerplayData[squad.id]?.completed || false}
                        onChange={(e) =>
                          setPowerplayData({
                            ...powerplayData,
                            [squad.id]: {
                              points: powerplayData[squad.id]?.points || '',
                              completed: e.target.checked,
                            },
                          })
                        }
                        color="success"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold" color="text.primary">
                        {(
                          (squad.totalPoints || 0) +
                          (squad.predictionBonusPoints || 0) +
                          (squad.powerplayPoints || 0)
                        ).toFixed(2)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Summary Statistics */}
        {submittedSquads.length > 0 && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Summary
              </Typography>
              <Box display="flex" gap={3} flexWrap="wrap">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Squads
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary.main">
                    {submittedSquads.length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Powerplay Selected
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="warning.main">
                    {squadsWithPowerplay.length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Completed Matches
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {submittedSquads.filter((s) => s.powerplayCompleted).length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Pending Matches
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="error.main">
                    {squadsWithPowerplay.filter((s) => s.powerplayMatchNumber && !s.powerplayCompleted).length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Container>
    </Box>
  );
};

export default PowerplayManagementPage;
