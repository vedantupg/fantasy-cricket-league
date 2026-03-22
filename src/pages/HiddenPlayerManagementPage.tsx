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
  Tooltip,
} from '@mui/material';
import { Lock, Save, AutoFixHigh } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService, squadService, leaderboardSnapshotService, playerPoolService } from '../services/firestore';
import type { League, LeagueSquad, PlayerPoolEntry } from '../types/database';
import AppHeader from '../components/common/AppHeader';

const HiddenPlayerManagementPage: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [squads, setSquads] = useState<LeagueSquad[]>([]);
  const [playerPool, setPlayerPool] = useState<PlayerPoolEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingSquads, setFetchingSquads] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hiddenPlayerPoints, setHiddenPlayerPoints] = useState<{ [squadId: string]: string }>({});
  const [saving, setSaving] = useState(false);

  const { user, userData } = useAuth();
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    if (userData && !userData.isAdmin) {
      navigate('/');
    }
  }, [userData, navigate]);

  // Fetch leagues with hiddenPlayerEnabled
  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        setLoading(true);
        setError('');
        const allLeagues = await leagueService.getForUser(user!.uid);
        const hiddenLeagues = allLeagues.filter(l => l.hiddenPlayerEnabled);
        setLeagues(hiddenLeagues);
        if (hiddenLeagues.length > 0) {
          setSelectedLeagueId(hiddenLeagues[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load leagues');
      } finally {
        setLoading(false);
      }
    };

    if (userData?.isAdmin) {
      fetchLeagues();
    }
  }, [user, userData]);

  // Fetch squads and player pool when league is selected
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedLeagueId) return;
      try {
        setFetchingSquads(true);
        setError('');

        const selectedLeague = leagues.find(l => l.id === selectedLeagueId);

        const [leagueSquads, poolData] = await Promise.all([
          squadService.getByLeague(selectedLeagueId),
          selectedLeague?.playerPoolId
            ? playerPoolService.getById(selectedLeague.playerPoolId)
            : Promise.resolve(null),
        ]);

        const withHiddenPlayer = leagueSquads.filter(s => s.isSubmitted && s.hiddenPlayerId);
        setSquads(withHiddenPlayer);
        setPlayerPool(poolData?.players || []);

        // Pre-populate points: use existing saved value, fallback to pool points
        const pool = poolData?.players || [];
        const initialPoints: { [squadId: string]: string } = {};
        withHiddenPlayer.forEach(sq => {
          if (sq.hiddenPlayerPoints !== undefined && sq.hiddenPlayerPoints > 0) {
            initialPoints[sq.id] = sq.hiddenPlayerPoints.toString();
          } else {
            const poolEntry = pool.find(p => p.playerId === sq.hiddenPlayerId);
            if (poolEntry !== undefined) {
              initialPoints[sq.id] = poolEntry.points.toString();
            }
          }
        });
        setHiddenPlayerPoints(initialPoints);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setFetchingSquads(false);
      }
    };

    fetchData();
  }, [selectedLeagueId, leagues]);

  // Auto-fill all fields from player pool points
  const handleAutoFill = () => {
    const filled: { [squadId: string]: string } = {};
    squads.forEach(sq => {
      const poolEntry = playerPool.find(p => p.playerId === sq.hiddenPlayerId);
      filled[sq.id] = poolEntry !== undefined ? poolEntry.points.toString() : '0';
    });
    setHiddenPlayerPoints(filled);
  };

  const handleSaveAll = async () => {
    if (!selectedLeagueId) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const updates: Promise<void>[] = [];
      Object.entries(hiddenPlayerPoints).forEach(([squadId, pts]) => {
        const points = parseFloat(pts || '0');
        if (!isNaN(points) && points >= 0) {
          updates.push(squadService.update(squadId, { hiddenPlayerPoints: points }));
        }
      });

      if (updates.length > 0) {
        await Promise.all(updates);
        await leaderboardSnapshotService.create(selectedLeagueId);
        setSuccess(`Applied hidden player points for ${updates.length} squad(s) and updated the leaderboard.`);
      } else {
        setError('No valid points to save');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save hidden player points');
    } finally {
      setSaving(false);
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

  const selectedLeague = leagues.find(l => l.id === selectedLeagueId);

  return (
    <Box>
      <AppHeader />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box mb={4}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Lock color="warning" />
            <Typography variant="h4" fontWeight="bold">
              Hidden Player Management
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary">
            View each participant's 12th Hidden Player. Points are auto-pulled from the player pool. Apply them all at once at the end of the league.
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

        {leagues.length === 0 ? (
          <Alert severity="info">
            No leagues with the Hidden Player feature enabled. Enable it during league creation.
          </Alert>
        ) : (
          <>
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
                    {leagues.map(league => (
                      <MenuItem key={league.id} value={league.id}>
                        {league.name} · {league.tournamentName} ({league.format})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {selectedLeague && (
                  <Box mt={2} display="flex" gap={2} flexWrap="wrap">
                    <Chip label={`${selectedLeague.participants.length} Participants`} color="primary" variant="outlined" />
                    <Chip label={`${squads.length} Hidden Players Set`} color="warning" variant="outlined" icon={<Lock />} />
                    {playerPool.length > 0 && (
                      <Chip label={`${playerPool.length} Players in Pool`} color="success" variant="outlined" />
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {squads.length > 0 && (
              <Box sx={{ mb: 3, display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <Tooltip title="Fill all point fields with the current pool points for each hidden player">
                  <Button
                    variant="outlined"
                    color="warning"
                    size="large"
                    startIcon={<AutoFixHigh />}
                    onClick={handleAutoFill}
                    disabled={playerPool.length === 0}
                  >
                    Auto-fill from Pool
                  </Button>
                </Tooltip>
                <Button
                  variant="contained"
                  color="warning"
                  size="large"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                  onClick={handleSaveAll}
                  disabled={saving}
                >
                  {saving ? 'Saving & Updating Leaderboard...' : 'Apply All & Update Leaderboard'}
                </Button>
              </Box>
            )}

            {/* Hidden Player Table */}
            {fetchingSquads ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : squads.length === 0 ? (
              <Card>
                <CardContent>
                  <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
                    No participants have selected their hidden player yet.
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <TableContainer component={Paper} elevation={2}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'warning.dark' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>#</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Squad</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Hidden Player</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Role</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Team</TableCell>
                      <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Pool Points</TableCell>
                      <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Points to Apply</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {squads.map((squad, index) => {
                      const poolEntry = playerPool.find(p => p.playerId === squad.hiddenPlayerId);
                      const poolPoints = poolEntry?.points ?? null;
                      const alreadyApplied = squad.hiddenPlayerPoints !== undefined && squad.hiddenPlayerPoints > 0;

                      return (
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
                            {alreadyApplied && (
                              <Chip label={`Applied: ${squad.hiddenPlayerPoints} pts`} size="small" color="success" sx={{ mt: 0.5, fontSize: '0.65rem', height: 18 }} />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {squad.hiddenPlayerName}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={squad.hiddenPlayerRole} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{squad.hiddenPlayerTeam}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            {poolPoints !== null ? (
                              <Typography variant="body2" fontWeight="bold" color="warning.main">
                                {poolPoints}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                Not in pool
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              size="small"
                              type="number"
                              value={hiddenPlayerPoints[squad.id] ?? ''}
                              onChange={(e) =>
                                setHiddenPlayerPoints(prev => ({
                                  ...prev,
                                  [squad.id]: e.target.value,
                                }))
                              }
                              sx={{ width: 110 }}
                              inputProps={{ min: 0, step: 0.5 }}
                              label="Points"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};

export default HiddenPlayerManagementPage;
