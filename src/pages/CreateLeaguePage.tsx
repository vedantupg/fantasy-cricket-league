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
  Grid
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
import type { League, SquadRules } from '../types/database';

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
    maxTransfers: 2,
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

  const steps = ['Basic Info', 'Squad Rules', 'Review & Create'];

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
        squadSize: 11,
        squadDeadline: leagueData.squadDeadline,
        maxTransfers: leagueData.maxTransfers,
        transfersUsed: {},
        transferDeadline: leagueData.endDate,
        transferWindow: {
          startDate: leagueData.startDate,
          endDate: leagueData.endDate,
        },
        status: 'squad_selection',
        tournamentStarted: false,
        teamsLocked: false,
        participants: [user.uid],
        squadsSubmitted: [],
        tournamentName: leagueData.tournament,
        startDate: leagueData.startDate,
        endDate: leagueData.endDate,
        playerPool: [], // Will be populated by admin later
        squadRules,
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

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          type="number"
          label="Max Transfers"
          value={leagueData.maxTransfers}
          onChange={(e) => setLeagueData(prev => ({ ...prev, maxTransfers: parseInt(e.target.value) }))}
          required
          inputProps={{ min: 0, max: 10 }}
          helperText="Number of player changes allowed during tournament"
        />
      </Grid>
    </Grid>
  );

  const renderSquadRules = () => (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Typography variant="h6" gutterBottom>
          Minimum Squad Requirements
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Set the minimum number of players required in each role (out of 11 total)
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          type="number"
          label="Minimum Batsmen"
          value={squadRules.minBatsmen}
          onChange={(e) => setSquadRules(prev => ({ ...prev, minBatsmen: parseInt(e.target.value) }))}
          inputProps={{ min: 1, max: 8 }}
          helperText="Minimum batsmen required in squad"
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          type="number"
          label="Minimum Bowlers"
          value={squadRules.minBowlers}
          onChange={(e) => setSquadRules(prev => ({ ...prev, minBowlers: parseInt(e.target.value) }))}
          inputProps={{ min: 1, max: 8 }}
          helperText="Minimum bowlers required in squad"
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          type="number"
          label="Minimum All-rounders"
          value={squadRules.minAllrounders}
          onChange={(e) => setSquadRules(prev => ({ ...prev, minAllrounders: parseInt(e.target.value) }))}
          inputProps={{ min: 0, max: 6 }}
          helperText="Minimum all-rounders required in squad"
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
        />
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
              Transfers Allowed: {leagueData.maxTransfers}
            </Typography>
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
          {activeStep === 2 && renderReview()}

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
                disabled={loading || !leagueData.name || !leagueData.tournament}
                startIcon={loading ? <CircularProgress size={20} /> : <SportsCricket />}
              >
                {loading ? 'Creating...' : 'Create League'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!leagueData.name || !leagueData.tournament}
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