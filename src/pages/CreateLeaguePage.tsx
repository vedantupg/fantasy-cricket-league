import React, { useState } from 'react';
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
  Stepper,
  Step,
  StepLabel,
  Grid,
  FormControlLabel,
  Switch,
  Checkbox,
  Divider,
  Chip
} from '@mui/material';
// import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { SportsCricket } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService } from '../services/firestore';
import { generateLeagueCode } from '../utils/leagueCode';
import AppHeader from '../components/common/AppHeader';
import type { League, SquadRules, TransferTypeConfig } from '../types/database';

const CreateLeaguePage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [leagueData, setLeagueData] = useState({
    name: '',
    tournament: 'IPL 2024' as string,
    format: 'T20' as 'T20' | 'ODI' | 'Test',
    maxParticipants: 10,
    squadDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
    endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
    powerplayEnabled: true, // NEW: Default to enabled
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
    hasBudget: false,
    totalBudget: 100,
  });

  const [squadSize, setSquadSize] = useState(11);

  const [transferTypes, setTransferTypes] = useState<TransferTypeConfig>({
    benchTransfers: {
      enabled: true,
      maxAllowed: 2,
      description: 'Quick substitutions during matches',
      benchSlots: 3 // Default 3 bench slots
    },
    midSeasonTransfers: {
      enabled: true,
      maxAllowed: 3,
      description: 'Major changes during tournament breaks',
      windowDurationHours: 24, // Default 24 hours window
      windowStartDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) // Default 3 weeks from now
    },
    flexibleTransfers: {
      enabled: false,
      maxAllowed: 1,
      description: 'Strategic transfers that can be saved',
      canCarryForward: true
    }
  });

  const steps = ['Basic Info', 'Squad Rules', 'Transfer Settings', 'Review & Create'];

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleCreateLeague = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const newLeague: Omit<League, 'id' | 'createdAt'> = {
        name: leagueData.name,
        code: generateLeagueCode(),
        creatorId: user.uid,
        adminIds: [user.uid],
        format: leagueData.format,
        maxParticipants: leagueData.maxParticipants,
        squadSize: squadSize,
        squadDeadline: leagueData.squadDeadline,
        maxTransfers: (transferTypes.benchTransfers.enabled ? transferTypes.benchTransfers.maxAllowed : 0) +
                     (transferTypes.midSeasonTransfers.enabled ? transferTypes.midSeasonTransfers.maxAllowed : 0) +
                     (transferTypes.flexibleTransfers.enabled ? transferTypes.flexibleTransfers.maxAllowed : 0),
        transfersUsed: {},
        transferDeadline: leagueData.endDate,
        transferWindow: {
          startDate: leagueData.startDate,
          endDate: leagueData.endDate,
        },
        status: 'squad_selection',
        tournamentStarted: false,
        teamsLocked: false,
        participants: [], // Admin can join manually if they want to participate
        squadsSubmitted: [],
        tournamentName: leagueData.tournament,
        startDate: leagueData.startDate,
        endDate: leagueData.endDate,
        playerPool: [], // Will be populated by admin later
        squadRules,
        powerplayEnabled: leagueData.powerplayEnabled,
        transferTypes,
      };

      const leagueId = await leagueService.create(newLeague);
      
      // Navigate to the new league
      navigate(`/leagues/${leagueId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create league');
    } finally {
      setLoading(false);
    }
  };

  const renderBasicInfo = () => (
    <Grid container spacing={3}>
      <Grid size={12}>
        <TextField
          fullWidth
          label="League Name"
          value={leagueData.name}
          onChange={(e) => setLeagueData(prev => ({ ...prev, name: e.target.value }))}
          required
          placeholder="e.g., Friends Cricket League"
          helperText="Give your league a unique name that your friends will recognize"
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
          value={leagueData.squadDeadline.toISOString().slice(0, 16)}
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
          label={
            <Box>
              <Typography variant="body1">Enable Powerplay Matches</Typography>
              <Typography variant="body2" color="text.secondary">
                Allow participants to select powerplay matches for bonus points
              </Typography>
            </Box>
          }
        />
      </Grid>
    </Grid>
  );

  const renderSquadRules = () => {
    const totalMinPlayers = squadRules.minBatsmen + squadRules.minBowlers + squadRules.minAllrounders + squadRules.minWicketkeepers;
    const isValidSquadRules = totalMinPlayers <= squadSize;

    return (
      <Grid container spacing={3}>
        <Grid size={12}>
          <Typography variant="h6" gutterBottom>
            Squad Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Configure the total squad size and minimum requirements for each role
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            type="number"
            label="Total Squad Size"
            value={squadSize}
            onChange={(e) => setSquadSize(parseInt(e.target.value))}
            inputProps={{ min: 7, max: 15 }}
            helperText="Total number of players in each squad (7-15)"
            required
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ p: 2, bgcolor: isValidSquadRules ? 'success.light' : 'error.light', borderRadius: 1 }}>
            <Typography variant="body2" fontWeight="bold" color={isValidSquadRules ? 'success.dark' : 'error.dark'}>
              Minimum Total: {totalMinPlayers} / {squadSize}
            </Typography>
            <Typography variant="body2" color={isValidSquadRules ? 'success.dark' : 'error.dark'}>
              {isValidSquadRules
                ? `✓ Valid configuration`
                : `⚠️ Minimum requirements exceed squad size`
              }
            </Typography>
          </Box>
        </Grid>

        <Grid size={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            Minimum Position Requirements
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Set the minimum number of players required in each role (out of {squadSize} total)
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            type="number"
            label="Minimum Batsmen"
            value={squadRules.minBatsmen}
            onChange={(e) => setSquadRules(prev => ({ ...prev, minBatsmen: parseInt(e.target.value) }))}
            inputProps={{ min: 1, max: squadSize - 3 }}
            helperText="Minimum batsmen required in squad"
            error={squadRules.minBatsmen > squadSize - 3}
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
            helperText="Minimum bowlers required in squad"
            error={squadRules.minBowlers > squadSize - 3}
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
            helperText="Minimum all-rounders required in squad"
            error={squadRules.minAllrounders > Math.floor(squadSize / 2)}
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
            helperText="Minimum wicket-keepers required in squad"
            error={squadRules.minWicketkeepers > 3}
          />
        </Grid>

        {!isValidSquadRules && (
          <Grid size={12}>
            <Alert severity="warning" sx={{ mt: 2 }}>
              The minimum position requirements ({totalMinPlayers}) exceed the total squad size ({squadSize}).
              Please adjust either the squad size or the minimum requirements.
            </Alert>
          </Grid>
        )}
      </Grid>
    );
  };

  const renderTransferSettings = () => (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Typography variant="h6" gutterBottom>
          Transfer Types Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Configure different types of transfers available to participants
        </Typography>
      </Grid>

      {/* Bench Transfers */}
      <Grid size={12}>
        <Card variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
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
              label={
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">Bench Transfers</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {transferTypes.benchTransfers.description}
                  </Typography>
                </Box>
              }
            />
          </Box>
          {transferTypes.benchTransfers.enabled && (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <TextField
                type="number"
                label="Max Transfers"
                value={transferTypes.benchTransfers.maxAllowed}
                onChange={(e) => setTransferTypes(prev => ({
                  ...prev,
                  benchTransfers: { ...prev.benchTransfers, maxAllowed: parseInt(e.target.value) }
                }))}
                inputProps={{ min: 0, max: 5 }}
                size="small"
                sx={{ width: 130 }}
              />
              <TextField
                type="number"
                label="Bench Slots"
                value={transferTypes.benchTransfers.benchSlots}
                onChange={(e) => setTransferTypes(prev => ({
                  ...prev,
                  benchTransfers: { ...prev.benchTransfers, benchSlots: parseInt(e.target.value) }
                }))}
                inputProps={{ min: 1, max: Math.floor(squadSize / 2) }}
                size="small"
                sx={{ width: 120 }}
                helperText="Extra players"
              />
              <Box sx={{ p: 1, bgcolor: 'info.light', borderRadius: 1, maxWidth: 200 }}>
                <Typography variant="caption" color="info.dark" display="block" fontWeight="bold">
                  Total Squad Selection:
                </Typography>
                <Typography variant="body2" color="info.dark">
                  {squadSize} main + {transferTypes.benchTransfers.benchSlots} bench = {squadSize + transferTypes.benchTransfers.benchSlots} players
                </Typography>
              </Box>
            </Box>
          )}
        </Card>
      </Grid>

      {/* Mid-Season Transfers */}
      <Grid size={12}>
        <Card variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
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
              label={
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">Mid-Season Transfers</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {transferTypes.midSeasonTransfers.description}
                  </Typography>
                </Box>
              }
            />
          </Box>
          {transferTypes.midSeasonTransfers.enabled && (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <TextField
                type="number"
                label="Maximum Allowed"
                value={transferTypes.midSeasonTransfers.maxAllowed}
                onChange={(e) => setTransferTypes(prev => ({
                  ...prev,
                  midSeasonTransfers: { ...prev.midSeasonTransfers, maxAllowed: parseInt(e.target.value) }
                }))}
                inputProps={{ min: 0, max: 10 }}
                size="small"
                sx={{ width: 150 }}
              />
              <FormControl size="small" sx={{ width: 120 }}>
                <InputLabel>Window Duration</InputLabel>
                <Select
                  value={transferTypes.midSeasonTransfers.windowDurationHours}
                  label="Window Duration"
                  onChange={(e) => setTransferTypes(prev => ({
                    ...prev,
                    midSeasonTransfers: { ...prev.midSeasonTransfers, windowDurationHours: Number(e.target.value) }
                  }))}
                >
                  <MenuItem value={24}>24 Hours</MenuItem>
                  <MenuItem value={36}>36 Hours</MenuItem>
                  <MenuItem value={48}>48 Hours</MenuItem>
                </Select>
              </FormControl>
              <TextField
                type="datetime-local"
                label="Window Start Date"
                value={transferTypes.midSeasonTransfers.windowStartDate.toISOString().slice(0, 16)}
                onChange={(e) => setTransferTypes(prev => ({
                  ...prev,
                  midSeasonTransfers: { ...prev.midSeasonTransfers, windowStartDate: new Date(e.target.value) }
                }))}
                size="small"
                InputLabelProps={{ shrink: true }}
                sx={{ width: 200 }}
              />
              <Box sx={{ p: 1, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Window closes:
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {new Date(
                    transferTypes.midSeasonTransfers.windowStartDate.getTime() +
                    transferTypes.midSeasonTransfers.windowDurationHours * 60 * 60 * 1000
                  ).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          )}
        </Card>
      </Grid>

      {/* Flexible Transfers */}
      <Grid size={12}>
        <Card variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
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
              label={
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">Flexible Transfers</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {transferTypes.flexibleTransfers.description}
                  </Typography>
                </Box>
              }
            />
          </Box>
          {transferTypes.flexibleTransfers.enabled && (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                type="number"
                label="Maximum Allowed"
                value={transferTypes.flexibleTransfers.maxAllowed}
                onChange={(e) => setTransferTypes(prev => ({
                  ...prev,
                  flexibleTransfers: { ...prev.flexibleTransfers, maxAllowed: parseInt(e.target.value) }
                }))}
                inputProps={{ min: 0, max: 5 }}
                size="small"
                sx={{ width: 150 }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={transferTypes.flexibleTransfers.canCarryForward}
                    onChange={(e) => setTransferTypes(prev => ({
                      ...prev,
                      flexibleTransfers: { ...prev.flexibleTransfers, canCarryForward: e.target.checked }
                    }))}
                  />
                }
                label="Can carry forward unused transfers"
              />
            </Box>
          )}
        </Card>
      </Grid>
    </Grid>
  );

  const renderReview = () => (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Typography variant="h6" gutterBottom>
          Review League Details
        </Typography>
      </Grid>

      <Grid size={12}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              {leagueData.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tournament: {leagueData.tournament} ({leagueData.format})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Participants: Up to {leagueData.maxParticipants}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Squad Deadline: {leagueData.squadDeadline.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Transfers Available: {
                (transferTypes.benchTransfers.enabled ? transferTypes.benchTransfers.maxAllowed : 0) +
                (transferTypes.midSeasonTransfers.enabled ? transferTypes.midSeasonTransfers.maxAllowed : 0) +
                (transferTypes.flexibleTransfers.enabled ? transferTypes.flexibleTransfers.maxAllowed : 0)
              } per participant
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Powerplay Matches: {leagueData.powerplayEnabled ? 'Enabled' : 'Disabled'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Squad Size: {squadSize} players
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={12}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Squad Position Requirements
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              <Chip label={`Batsmen: min ${squadRules.minBatsmen}`} color="primary" variant="outlined" />
              <Chip label={`Bowlers: min ${squadRules.minBowlers}`} color="secondary" variant="outlined" />
              <Chip label={`All-rounders: min ${squadRules.minAllrounders}`} color="success" variant="outlined" />
              <Chip label={`Wicket-keepers: min ${squadRules.minWicketkeepers}`} color="info" variant="outlined" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Total minimum: {squadRules.minBatsmen + squadRules.minBowlers + squadRules.minAllrounders + squadRules.minWicketkeepers} / {squadSize} players
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={12}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Transfer Types Configuration
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {transferTypes.benchTransfers.enabled && (
                <Chip
                  label={`Bench: ${transferTypes.benchTransfers.maxAllowed} transfers, ${transferTypes.benchTransfers.benchSlots} slots`}
                  color="primary"
                  variant="outlined"
                />
              )}
              {transferTypes.midSeasonTransfers.enabled && (
                <Chip
                  label={`Mid-Season: ${transferTypes.midSeasonTransfers.maxAllowed} allowed (${transferTypes.midSeasonTransfers.windowDurationHours}h window from ${transferTypes.midSeasonTransfers.windowStartDate.toLocaleDateString()})`}
                  color="secondary"
                  variant="outlined"
                />
              )}
              {transferTypes.flexibleTransfers.enabled && (
                <Chip
                  label={`Flexible: ${transferTypes.flexibleTransfers.maxAllowed} allowed${transferTypes.flexibleTransfers.canCarryForward ? ' (carry forward)' : ''}`}
                  color="success"
                  variant="outlined"
                />
              )}
            </Box>

            {!transferTypes.benchTransfers.enabled && !transferTypes.midSeasonTransfers.enabled && !transferTypes.flexibleTransfers.enabled && (
              <Typography variant="body2" color="text.secondary">
                No additional transfer types enabled (using default transfers only)
              </Typography>
            )}

            {transferTypes.benchTransfers.enabled && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom color="success.dark">
                  🔄 Bench Transfer System:
                </Typography>
                <Typography variant="body2" color="success.dark">
                  • Players must select: {squadSize} main squad + {transferTypes.benchTransfers.benchSlots} bench players = {squadSize + transferTypes.benchTransfers.benchSlots} total
                </Typography>
                <Typography variant="body2" color="success.dark">
                  • Bench transfers allowed: {transferTypes.benchTransfers.maxAllowed} maximum
                </Typography>
                <Typography variant="body2" color="success.dark">
                  • Quick substitutions can be made during active matches
                </Typography>
              </Box>
            )}

            {transferTypes.midSeasonTransfers.enabled && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  📅 Mid-Season Transfer Window Details:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Opens: {transferTypes.midSeasonTransfers.windowStartDate.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Closes: {new Date(
                    transferTypes.midSeasonTransfers.windowStartDate.getTime() +
                    transferTypes.midSeasonTransfers.windowDurationHours * 60 * 60 * 1000
                  ).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Duration: {transferTypes.midSeasonTransfers.windowDurationHours} hours
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Max transfers per participant: {transferTypes.midSeasonTransfers.maxAllowed}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box>
      <AppHeader 
        title="Create New League"
        subtitle="Set up your fantasy cricket league"
        showBack={true}
        backPath="/dashboard"
        backLabel="Back to My Leagues"
      />
      
      <Container maxWidth="md" sx={{ py: 4 }}>

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Form Content */}
      <Card>
        <CardContent sx={{ p: 4 }}>
          {activeStep === 0 && renderBasicInfo()}
          {activeStep === 1 && renderSquadRules()}
          {activeStep === 2 && renderTransferSettings()}
          {activeStep === 3 && renderReview()}

          {/* Navigation Buttons */}
          <Box display="flex" justifyContent="space-between" mt={4}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0}
            >
              Back
            </Button>
            
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleCreateLeague}
                disabled={
                  loading ||
                  !leagueData.name ||
                  !leagueData.tournament ||
                  (squadRules.minBatsmen + squadRules.minBowlers + squadRules.minAllrounders + squadRules.minWicketkeepers) > squadSize
                }
                startIcon={loading ? <CircularProgress size={20} /> : <SportsCricket />}
              >
                {loading ? 'Creating...' : 'Create League'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={
                  !leagueData.name ||
                  !leagueData.tournament ||
                  (activeStep === 1 && (squadRules.minBatsmen + squadRules.minBowlers + squadRules.minAllrounders + squadRules.minWicketkeepers) > squadSize)
                }
              >
                Next
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
      </Container>
    </Box>
  );
};

export default CreateLeaguePage;