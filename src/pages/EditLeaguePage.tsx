import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Grid,
  FormControlLabel,
  Switch,
  Checkbox
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService, playerPoolService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import LeagueNav from '../components/common/LeagueNav';
import type { League, SquadRules, TransferTypeConfig, PlayerPool } from '../types/database';

// Helper function to format Date for datetime-local input (preserves local timezone)
const formatDateTimeLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const EditLeaguePage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [playerPools, setPlayerPools] = useState<PlayerPool[]>([]);
  const [selectedPlayerPoolId, setSelectedPlayerPoolId] = useState<string>('');
  const [league, setLeague] = useState<League | null>(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [leagueData, setLeagueData] = useState({
    name: '',
    tournament: 'IPL 2024' as string,
    format: 'T20' as 'T20' | 'ODI' | 'Test',
    maxParticipants: 10,
    squadDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    powerplayEnabled: true,
    maxPowerplayMatches: 20,
  });

  const availableTournaments = [
    'IPL',
    'ICC T20 World Cup',
    'ICC ODI World Cup',
    'ICC Champions Trophy',
    'Asia Cup',
    'Test Series',
    'Other'
  ];

  const [squadRules, setSquadRules] = useState<SquadRules>({
    minBatsmen: 3,
    minBowlers: 3,
    minAllrounders: 2,
    minWicketkeepers: 1,
    overseasPlayersEnabled: false,
    maxOverseasPlayers: 4,
    hasBudget: false,
    totalBudget: 100,
  });

  const [squadSize, setSquadSize] = useState(11);

  const [transferTypes, setTransferTypes] = useState<TransferTypeConfig>({
    benchTransfers: {
      enabled: true,
      maxAllowed: 2,
      description: 'Quick substitutions during matches',
      benchSlots: 3
    },
    midSeasonTransfers: {
      enabled: true,
      maxAllowed: 3,
      description: 'Major changes during tournament breaks',
      windowStartDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      windowEndDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000)
    },
    flexibleTransfers: {
      enabled: false,
      maxAllowed: 1,
      description: 'Strategic transfers that can be saved'
    }
  });

  // Admin controls for squad changes
  const [flexibleChangesEnabled, setFlexibleChangesEnabled] = useState(false);
  const [benchChangesEnabled, setBenchChangesEnabled] = useState(false);

  // Load player pools and existing league data
  useEffect(() => {
    const loadData = async () => {
      if (!leagueId) {
        setError('No league ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Load player pools
        const pools = await playerPoolService.getAll();
        setPlayerPools(pools);

        // Load existing league data
        const leagueData = await leagueService.getById(leagueId);
        if (!leagueData) {
          setError('League not found');
          return;
        }

        // Check if user is admin
        const isAdmin = user && (leagueData.creatorId === user.uid || leagueData.adminIds.includes(user.uid));
        if (!isAdmin) {
          setError('You do not have permission to edit this league');
          return;
        }

        setLeague(leagueData);

        // Pre-fill form with existing data
        setLeagueData({
          name: leagueData.name,
          tournament: leagueData.tournamentName,
          format: leagueData.format,
          maxParticipants: leagueData.maxParticipants,
          squadDeadline: new Date(leagueData.squadDeadline),
          startDate: new Date(leagueData.startDate),
          endDate: new Date(leagueData.endDate),
          powerplayEnabled: leagueData.powerplayEnabled || false,
          maxPowerplayMatches: leagueData.maxPowerplayMatches || 20,
        });

        setSelectedPlayerPoolId(leagueData.playerPoolId || '');
        setSquadRules(leagueData.squadRules);
        setSquadSize(leagueData.squadSize);
        if (leagueData.transferTypes) {
          // Ensure dates are properly converted for mid-season window
          const loadedTransferTypes = { ...leagueData.transferTypes };
          if (loadedTransferTypes.midSeasonTransfers) {
            loadedTransferTypes.midSeasonTransfers = {
              ...loadedTransferTypes.midSeasonTransfers,
              windowStartDate: new Date(loadedTransferTypes.midSeasonTransfers.windowStartDate),
              windowEndDate: new Date(loadedTransferTypes.midSeasonTransfers.windowEndDate)
            };
          }
          setTransferTypes(loadedTransferTypes);
        }

        // Load admin control values
        setFlexibleChangesEnabled(leagueData.flexibleChangesEnabled || false);
        setBenchChangesEnabled(leagueData.benchChangesEnabled || false);

      } catch (err: any) {
        console.error('Error loading data:', err);
        setError('Failed to load league data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [leagueId, user]);

  const handleSaveLeague = async () => {
    if (!user || !leagueId) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const updates: Partial<League> = {
        name: leagueData.name,
        format: leagueData.format,
        maxParticipants: leagueData.maxParticipants,
        squadSize: squadSize,
        squadDeadline: leagueData.squadDeadline,
        maxTransfers: (transferTypes.benchTransfers.enabled ? transferTypes.benchTransfers.maxAllowed : 0) +
                     (transferTypes.midSeasonTransfers.enabled ? transferTypes.midSeasonTransfers.maxAllowed : 0) +
                     (transferTypes.flexibleTransfers.enabled ? transferTypes.flexibleTransfers.maxAllowed : 0),
        transferDeadline: leagueData.endDate,
        transferWindow: {
          startDate: leagueData.startDate,
          endDate: leagueData.endDate,
        },
        tournamentName: leagueData.tournament,
        startDate: leagueData.startDate,
        endDate: leagueData.endDate,
        playerPoolId: selectedPlayerPoolId || undefined,
        squadRules,
        powerplayEnabled: leagueData.powerplayEnabled,
        maxPowerplayMatches: leagueData.maxPowerplayMatches,
        transferTypes,
        flexibleChangesEnabled,
        benchChangesEnabled,
      };

      await leagueService.update(leagueId, updates);

      setSuccess('League updated successfully!');

      // Navigate back to league dashboard after a short delay
      setTimeout(() => {
        navigate(`/leagues/${leagueId}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update league');
    } finally {
      setSaving(false);
    }
  };

  const totalMinPlayers = squadRules.minBatsmen + squadRules.minBowlers + squadRules.minAllrounders + squadRules.minWicketkeepers;
  const isValidSquadRules = totalMinPlayers <= squadSize;

  if (loading) {
    return (
      <Box>
        <AppHeader />
        {leagueId && (
          <LeagueNav
            leagueName="Loading..."
            leagueId={leagueId}
            currentPage="Edit League"
          />
        )}
        <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  if (error && !league) {
    return (
      <Box>
        <AppHeader />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <AppHeader />
      {league && leagueId && (
        <LeagueNav
          leagueName={league.name}
          leagueId={leagueId}
          currentPage="Edit League"
        />
      )}

      <Container maxWidth="md" sx={{ py: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        {/* Basic Info */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>

            <Grid container spacing={3}>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="League Name"
                  value={leagueData.name}
                  onChange={(e) => setLeagueData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </Grid>

              <Grid size={12}>
                <FormControl fullWidth required>
                  <InputLabel>Tournament/Season</InputLabel>
                  <Select
                    value={leagueData.tournament}
                    label="Tournament/Season"
                    onChange={(e) => setLeagueData(prev => ({ ...prev, tournament: e.target.value }))}
                  >
                    {availableTournaments.map((tournament) => (
                      <MenuItem key={tournament} value={tournament}>
                        {tournament}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={12}>
                <FormControl fullWidth required>
                  <InputLabel>Player Pool</InputLabel>
                  <Select
                    value={selectedPlayerPoolId}
                    label="Player Pool"
                    onChange={(e) => setSelectedPlayerPoolId(e.target.value)}
                  >
                    {playerPools.map((pool) => (
                      <MenuItem key={pool.id} value={pool.id}>
                        {pool.name} ({pool.players.length} players)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Format</InputLabel>
                  <Select
                    value={leagueData.format}
                    label="Format"
                    onChange={(e) => setLeagueData(prev => ({ ...prev, format: e.target.value as any }))}
                  >
                    <MenuItem value="T20">T20</MenuItem>
                    <MenuItem value="ODI">ODI</MenuItem>
                    <MenuItem value="Test">Test</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Participants"
                  value={leagueData.maxParticipants}
                  onChange={(e) => setLeagueData(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) }))}
                  required
                  inputProps={{ min: 2, max: 20 }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Squad Selection Deadline"
                  value={formatDateTimeLocal(leagueData.squadDeadline)}
                  onChange={(e) => setLeagueData(prev => ({ ...prev, squadDeadline: new Date(e.target.value) }))}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={leagueData.powerplayEnabled}
                      onChange={(e) => setLeagueData(prev => ({ ...prev, powerplayEnabled: e.target.checked }))}
                      color="primary"
                    />
                  }
                  label="Enable Powerplay Matches"
                />
              </Grid>

              {leagueData.powerplayEnabled && (
                <Grid size={12}>
                  <TextField
                    label="Number of Matches for Powerplay"
                    type="number"
                    value={leagueData.maxPowerplayMatches}
                    onChange={(e) => setLeagueData(prev => ({ ...prev, maxPowerplayMatches: parseInt(e.target.value) || 20 }))}
                    fullWidth
                    inputProps={{ min: 1, max: 100 }}
                    helperText="Users can select from Match 1 to this number as their powerplay match"
                  />
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>

        {/* Squad Rules */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Squad Configuration
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Total Squad Size"
                  value={squadSize}
                  onChange={(e) => setSquadSize(parseInt(e.target.value))}
                  inputProps={{ min: 7, max: 15 }}
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ p: 2, bgcolor: isValidSquadRules ? 'success.light' : 'error.light', borderRadius: 1 }}>
                  <Typography variant="body2" fontWeight="bold" color={isValidSquadRules ? 'success.dark' : 'error.dark'}>
                    Minimum Total: {totalMinPlayers} / {squadSize}
                  </Typography>
                  <Typography variant="body2" color={isValidSquadRules ? 'success.dark' : 'error.dark'}>
                    {isValidSquadRules ? '✓ Valid configuration' : '⚠️ Minimum requirements exceed squad size'}
                  </Typography>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Batters"
                  value={squadRules.minBatsmen}
                  onChange={(e) => setSquadRules(prev => ({ ...prev, minBatsmen: parseInt(e.target.value) }))}
                  inputProps={{ min: 1, max: squadSize - 3 }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Bowlers"
                  value={squadRules.minBowlers}
                  onChange={(e) => setSquadRules(prev => ({ ...prev, minBowlers: parseInt(e.target.value) }))}
                  inputProps={{ min: 1, max: squadSize - 3 }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum All-rounders"
                  value={squadRules.minAllrounders}
                  onChange={(e) => setSquadRules(prev => ({ ...prev, minAllrounders: parseInt(e.target.value) }))}
                  inputProps={{ min: 0, max: Math.floor(squadSize / 2) }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Wicket-keepers"
                  value={squadRules.minWicketkeepers}
                  onChange={(e) => setSquadRules(prev => ({ ...prev, minWicketkeepers: parseInt(e.target.value) }))}
                  inputProps={{ min: 0, max: 3 }}
                />
              </Grid>

              {/* Overseas Players Constraint */}
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={squadRules.overseasPlayersEnabled || false}
                      onChange={(e) => setSquadRules(prev => ({ ...prev, overseasPlayersEnabled: e.target.checked }))}
                    />
                  }
                  label="Enable Overseas Player Limit"
                />
                {squadRules.overseasPlayersEnabled && (
                  <Box sx={{ ml: 4, mt: 1 }}>
                    <TextField
                      type="number"
                      label="Max Overseas Players"
                      value={squadRules.maxOverseasPlayers || 4}
                      onChange={(e) => setSquadRules(prev => ({ ...prev, maxOverseasPlayers: parseInt(e.target.value) }))}
                      size="small"
                      inputProps={{ min: 1, max: squadSize }}
                      sx={{ width: 200 }}
                      helperText={`Maximum number of overseas players allowed in squad (e.g., 4)`}
                    />
                  </Box>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Transfer Settings */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Transfer Settings
            </Typography>

            <Grid container spacing={2}>
              {/* Bench Transfers */}
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={transferTypes.benchTransfers.enabled}
                      onChange={(e) => setTransferTypes(prev => ({
                        ...prev,
                        benchTransfers: { ...prev.benchTransfers, enabled: e.target.checked }
                      }))}
                    />
                  }
                  label="Enable Bench Transfers"
                />
                {transferTypes.benchTransfers.enabled && (
                  <Box sx={{ ml: 4, mt: 1 }}>
                    <TextField
                      type="number"
                      label="Max Allowed"
                      value={transferTypes.benchTransfers.maxAllowed}
                      onChange={(e) => setTransferTypes(prev => ({
                        ...prev,
                        benchTransfers: { ...prev.benchTransfers, maxAllowed: parseInt(e.target.value) }
                      }))}
                      size="small"
                      inputProps={{ min: 0, max: 5 }}
                      sx={{ mr: 2, width: 120 }}
                    />
                    <TextField
                      type="number"
                      label="Bench Slots"
                      value={transferTypes.benchTransfers.benchSlots}
                      onChange={(e) => setTransferTypes(prev => ({
                        ...prev,
                        benchTransfers: { ...prev.benchTransfers, benchSlots: parseInt(e.target.value) }
                      }))}
                      size="small"
                      inputProps={{ min: 1, max: Math.floor(squadSize / 2) }}
                      sx={{ width: 120 }}
                    />
                  </Box>
                )}
              </Grid>

              {/* Mid-Season Transfers */}
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={transferTypes.midSeasonTransfers.enabled}
                      onChange={(e) => setTransferTypes(prev => ({
                        ...prev,
                        midSeasonTransfers: { ...prev.midSeasonTransfers, enabled: e.target.checked }
                      }))}
                    />
                  }
                  label="Enable Mid-Season Transfers"
                />
                {transferTypes.midSeasonTransfers.enabled && (
                  <Box sx={{ ml: 4, mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                      type="number"
                      label="Max Allowed"
                      value={transferTypes.midSeasonTransfers.maxAllowed}
                      onChange={(e) => setTransferTypes(prev => ({
                        ...prev,
                        midSeasonTransfers: { ...prev.midSeasonTransfers, maxAllowed: parseInt(e.target.value) }
                      }))}
                      size="small"
                      inputProps={{ min: 0, max: 10 }}
                      sx={{ width: 120 }}
                    />
                    <TextField
                      type="datetime-local"
                      label="Window Start Date"
                      value={formatDateTimeLocal(transferTypes.midSeasonTransfers.windowStartDate)}
                      onChange={(e) => setTransferTypes(prev => ({
                        ...prev,
                        midSeasonTransfers: { ...prev.midSeasonTransfers, windowStartDate: new Date(e.target.value) }
                      }))}
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 220 }}
                    />
                    <TextField
                      type="datetime-local"
                      label="Window End Date"
                      value={formatDateTimeLocal(transferTypes.midSeasonTransfers.windowEndDate)}
                      onChange={(e) => setTransferTypes(prev => ({
                        ...prev,
                        midSeasonTransfers: { ...prev.midSeasonTransfers, windowEndDate: new Date(e.target.value) }
                      }))}
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 220 }}
                    />
                  </Box>
                )}
              </Grid>

              {/* Flexible Transfers */}
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={transferTypes.flexibleTransfers.enabled}
                      onChange={(e) => setTransferTypes(prev => ({
                        ...prev,
                        flexibleTransfers: { ...prev.flexibleTransfers, enabled: e.target.checked }
                      }))}
                    />
                  }
                  label="Enable Flexible Transfers"
                />
                {transferTypes.flexibleTransfers.enabled && (
                  <Box sx={{ ml: 4, mt: 1 }}>
                    <TextField
                      type="number"
                      label="Max Allowed"
                      value={transferTypes.flexibleTransfers.maxAllowed}
                      onChange={(e) => setTransferTypes(prev => ({
                        ...prev,
                        flexibleTransfers: { ...prev.flexibleTransfers, maxAllowed: parseInt(e.target.value) }
                      }))}
                      size="small"
                      inputProps={{ min: 0, max: 5 }}
                      sx={{ width: 120 }}
                    />
                  </Box>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Admin Controls for Squad Changes */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Admin Controls
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Control when users can make flexible and bench changes to their squads
            </Typography>

            <Grid container spacing={2}>
              {/* Flexible Changes Toggle */}
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={flexibleChangesEnabled}
                      onChange={(e) => setFlexibleChangesEnabled(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        Enable Flexible Changes
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Allow users to make flexible changes to their squad (reorder players, change captain/vice-captain/X-factor)
                      </Typography>
                    </Box>
                  }
                />
              </Grid>

              {/* Bench Changes Toggle */}
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={benchChangesEnabled}
                      onChange={(e) => setBenchChangesEnabled(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        Enable Bench Changes
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Allow users to swap players between starting XI and bench
                      </Typography>
                    </Box>
                  }
                />
              </Grid>

              <Grid size={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    These toggles allow you (admin) to control when squad changes are allowed. Toggle them ON when you want users to be able to make changes, and OFF to lock squads. Mid-season transfers (configured above) have their own schedule.
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate(`/leagues/${leagueId}`)}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleSaveLeague}
            disabled={
              saving ||
              !leagueData.name ||
              !leagueData.tournament ||
              !isValidSquadRules
            }
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default EditLeaguePage;
