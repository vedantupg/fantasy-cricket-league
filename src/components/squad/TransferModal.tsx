import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Alert,
  Stepper,
  Step,
  StepLabel,
  alpha,
  Divider
} from '@mui/material';
import {
  SwapHoriz,
  ArrowDownward,
  ArrowUpward,
  TrendingFlat
} from '@mui/icons-material';
import type { League, Player, LeagueSquad, SquadPlayer } from '../../types/database';

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  league: League;
  existingSquad: LeagueSquad;
  availablePlayers: Player[];
  onSubmitTransfer: (transferData: TransferData) => Promise<void>;
}

export interface TransferData {
  transferType: 'bench' | 'flexible' | 'midSeason';
  changeType: 'playerSubstitution' | 'roleReassignment';

  // Player Substitution fields
  playerOut?: string; // player ID to remove
  playerIn?: string; // player ID to add

  // Role Reassignment fields
  newCaptainId?: string; // Only available for bench transfers
  newViceCaptainId?: string;
  newXFactorId?: string;
}

const TransferModal: React.FC<TransferModalProps> = ({
  open,
  onClose,
  league,
  existingSquad,
  availablePlayers,
  onSubmitTransfer
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTransferType, setSelectedTransferType] = useState<'bench' | 'flexible' | 'midSeason' | null>(null);
  const [selectedChangeType, setSelectedChangeType] = useState<'playerSubstitution' | 'roleReassignment' | null>(null);
  const [playerOut, setPlayerOut] = useState<string>('');
  const [playerIn, setPlayerIn] = useState<string>('');
  const [newCaptain, setNewCaptain] = useState<string>(''); // NEW: Captain reassignment
  const [newViceCaptain, setNewViceCaptain] = useState<string>('');
  const [newXFactor, setNewXFactor] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const steps = ['Select Transfer Type', 'Choose Change', 'Confirm'];

  // Calculate remaining transfers for each type
  const getAvailableTransfers = () => {
    const transfers = league.transferTypes;
    if (!transfers) return { bench: 0, flexible: 0, midSeason: 0 };

    // Track each transfer type separately
    const benchUsed = existingSquad.benchTransfersUsed || 0;
    const flexibleUsed = existingSquad.flexibleTransfersUsed || 0;
    const midSeasonUsed = existingSquad.midSeasonTransfersUsed || 0;

    return {
      bench: transfers.benchTransfers.enabled ? Math.max(0, transfers.benchTransfers.maxAllowed - benchUsed) : 0,
      flexible: transfers.flexibleTransfers.enabled ? Math.max(0, transfers.flexibleTransfers.maxAllowed - flexibleUsed) : 0,
      midSeason: transfers.midSeasonTransfers.enabled ? Math.max(0, transfers.midSeasonTransfers.maxAllowed - midSeasonUsed) : 0
    };
  };

  const availableTransfers = getAvailableTransfers();

  // Check if mid-season window is open
  const isMidSeasonWindowOpen = () => {
    if (!league.transferTypes?.midSeasonTransfers.enabled) return false;
    const now = new Date();
    const windowStart = new Date(league.transferTypes.midSeasonTransfers.windowStartDate);
    const windowEnd = new Date(league.transferTypes.midSeasonTransfers.windowEndDate);
    return now >= windowStart && now <= windowEnd;
  };

  const handleNext = () => {
    setError('');

    if (activeStep === 0 && !selectedTransferType) {
      setError('Please select a transfer type to continue');
      return;
    }

    if (activeStep === 1 && !selectedChangeType) {
      setError('Please choose what you want to change');
      return;
    }

    if (activeStep === 1) {
      // Validate the selected change
      if (selectedChangeType === 'playerSubstitution') {
        if (!playerOut || !playerIn) {
          setError('Select both: which player to remove and which player to bring in');
          return;
        }
        // Validate player substitution rules
        const validationError = validatePlayerSubstitution();
        if (validationError) {
          setError(validationError);
          return;
        }
      } else if (selectedChangeType === 'roleReassignment') {
        // NEW RULES: Exactly ONE role must be reassigned per transfer
        const rolesSelected = [newCaptain, newViceCaptain, newXFactor].filter(Boolean).length;

        if (rolesSelected === 0) {
          setError('Select ONE role to reassign (Captain, Vice-Captain, or X-Factor)');
          return;
        }

        if (rolesSelected > 1) {
          setError('Only ONE role can be changed per transfer. Please deselect the others.');
          return;
        }

        // NEW RULES: Flexible/Mid-Season cannot reassign Captain
        if ((selectedTransferType === 'flexible' || selectedTransferType === 'midSeason') && newCaptain) {
          setError(`Captain can only be changed with a Bench transfer. You have ${availableTransfers.bench} bench transfer${availableTransfers.bench !== 1 ? 's' : ''} available.`);
          return;
        }

        // Bench transfers can reassign any role (C/VC/X), but still only ONE at a time
      }
    }

    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError('');
    setActiveStep((prev) => prev - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setSelectedTransferType(null);
    setSelectedChangeType(null);
    setPlayerOut('');
    setPlayerIn('');
    setNewCaptain(''); // NEW: Reset captain state
    setNewViceCaptain('');
    setNewXFactor('');
    setError('');
  };

  const validatePlayerSubstitution = (): string | null => {
    const playerOutData = existingSquad.players.find(p => p.playerId === playerOut);
    if (!playerOutData) return 'Player not found in your squad';

    // NEW RULES - FLEXIBLE & MID-SEASON: CANNOT remove Captain (but CAN remove VC or X-Factor)
    if (selectedTransferType === 'flexible' || selectedTransferType === 'midSeason') {
      if (playerOut === existingSquad.captainId) {
        const playerName = playerOutData.playerName;
        return `${playerName} is your Captain. Captain cannot be removed with this transfer type. Use a Bench transfer or change Captain first.`;
      }
      // VC and X-Factor CAN be removed with flexible/mid-season transfers
    }

    // NEW RULES - BENCH TRANSFER: Can replace any player including C/VC/X
    if (selectedTransferType === 'bench') {
      // For bench transfers, must use one of the bench players as the incoming player
      const benchPlayers = existingSquad.players.filter((p, index) => index >= league.squadSize);
      const benchPlayerIds = benchPlayers.map(p => p.playerId);
      if (!benchPlayerIds.includes(playerIn)) {
        return 'Bench transfers can only bring in players from your bench. Choose a bench player.';
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');

      const transferData: TransferData = {
        transferType: selectedTransferType!,
        changeType: selectedChangeType!,
        playerOut: selectedChangeType === 'playerSubstitution' ? playerOut : undefined,
        playerIn: selectedChangeType === 'playerSubstitution' ? playerIn : undefined,
        newCaptainId: selectedChangeType === 'roleReassignment' ? newCaptain || undefined : undefined, // NEW
        newViceCaptainId: selectedChangeType === 'roleReassignment' ? newViceCaptain || undefined : undefined,
        newXFactorId: selectedChangeType === 'roleReassignment' ? newXFactor || undefined : undefined
      };

      await onSubmitTransfer(transferData);
      handleReset();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const getPlayerName = (playerId: string | undefined): string => {
    if (!playerId) return '';
    const player = existingSquad.players.find(p => p.playerId === playerId);
    return player?.playerName || playerId;
  };

  const getAvailablePlayersForSelection = (): Player[] => {
    if (selectedTransferType === 'bench') {
      // For bench transfers, return ALL bench players
      const benchPlayersSquad = existingSquad.players.filter((p, index) => index >= league.squadSize);
      const benchPlayers = benchPlayersSquad.map(benchPlayer => {
        return availablePlayers.find(p => p.id === benchPlayer.playerId);
      }).filter((p): p is Player => p !== undefined);
      return benchPlayers;
    }

    // For flexible/mid-season, return available players not in squad + bench players
    const squadPlayerIds = existingSquad.players.map(p => p.playerId);

    // Get bench players
    const benchPlayersSquad = existingSquad.players.filter((p, index) => index >= league.squadSize);
    const benchPlayers = benchPlayersSquad.map(benchPlayer => {
      return availablePlayers.find(p => p.id === benchPlayer.playerId);
    }).filter((p): p is Player => p !== undefined);

    // Get pool players not in squad at all
    const poolPlayers = availablePlayers.filter(p => !squadPlayerIds.includes(p.id));

    // Combine bench players and pool players
    return [...benchPlayers, ...poolPlayers];
  };

  const getPlayersForRemoval = (): SquadPlayer[] => {
    // Return main squad players (exclude bench)
    const mainSquadPlayers = existingSquad.players.slice(0, league.squadSize);

    if (selectedTransferType === 'flexible' || selectedTransferType === 'midSeason') {
      // NEW RULES - FLEXIBLE/MID-SEASON: Cannot remove Captain (but CAN remove VC/X-Factor)
      return mainSquadPlayers.filter(p =>
        p.playerId !== existingSquad.captainId
      );
    } else if (selectedTransferType === 'bench') {
      // NEW RULES - BENCH: Can replace any player including C/VC/X
      return mainSquadPlayers;
    }

    return mainSquadPlayers;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#0b0e1a', // Very dark blue-gray background for better visibility
          borderRadius: 4, // Increased border radius
        }
      }}
    >
      <DialogTitle sx={{
        background: 'linear-gradient(135deg, #0b133b 0%, #1E88E5 100%)',
        color: 'white',
        pb: 3,
        borderRadius: '16px 16px 0 0', // Match dialog border radius at top
      }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1.5}>
            <SwapHoriz sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight="bold">
              Make a Transfer
            </Typography>
          </Box>
          {selectedTransferType && (
            <Chip
              label={
                selectedTransferType === 'bench' ? 'Bench' :
                selectedTransferType === 'flexible' ? 'Flexible' :
                'Mid-Season'
              }
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.25)',
                color: 'white',
                fontWeight: 'bold',
                backdropFilter: 'blur(10px)'
              }}
            />
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{
          mb: 4,
          mt: 2,
          '& .MuiStepLabel-root .Mui-completed': {
            color: '#16a34a', // Green for completed
          },
          '& .MuiStepLabel-root .Mui-active': {
            color: '#1E88E5', // Electric blue for active
          },
          '& .MuiStepIcon-root.Mui-active': {
            color: '#1E88E5',
          },
          '& .MuiStepIcon-root.Mui-completed': {
            color: '#16a34a',
          }
        }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Step 1: Select Transfer Type */}
        {activeStep === 0 && (
          <Box>
            <Typography
              variant="h6"
              fontWeight="bold"
              gutterBottom
              sx={{ mb: 3 }}
            >
              Select Transfer Type
            </Typography>
            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={selectedTransferType || ''}
                onChange={(e) => setSelectedTransferType(e.target.value as any)}
              >
                {league.transferTypes?.benchTransfers.enabled && league.benchChangesEnabled && (
                  <Card
                    sx={{
                      mb: 2,
                      cursor: availableTransfers.bench > 0 ? 'pointer' : 'not-allowed',
                      border: selectedTransferType === 'bench'
                        ? '2px solid #1E88E5'
                        : '1px solid rgba(255, 255, 255, 0.12)',
                      bgcolor: selectedTransferType === 'bench'
                        ? alpha('#1E88E5', 0.08)
                        : 'transparent',
                      transition: 'all 0.3s ease',
                      opacity: availableTransfers.bench === 0 ? 0.5 : 1,
                      borderRadius: 3,
                      '&:hover': availableTransfers.bench > 0 ? {
                        bgcolor: alpha('#1E88E5', 0.05),
                        borderColor: alpha('#1E88E5', 0.5),
                      } : {}
                    }}
                    onClick={() => availableTransfers.bench > 0 && setSelectedTransferType('bench')}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box display="flex" alignItems="start" gap={2}>
                        <FormControlLabel
                          value="bench"
                          control={<Radio sx={{
                            color: 'text.secondary',
                            '&.Mui-checked': { color: '#1E88E5' }
                          }} />}
                          label=""
                          disabled={availableTransfers.bench === 0}
                          sx={{ m: 0 }}
                        />
                        <Box flex={1}>
                          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                            <Typography variant="h6" fontWeight="bold">
                              Bench Change
                            </Typography>
                            <Chip
                              label={`${availableTransfers.bench} available`}
                              color={availableTransfers.bench > 0 ? 'primary' : 'default'}
                              size="small"
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Swap with bench OR reassign any role (C/VC/X). Most powerful option.
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {league.transferTypes?.flexibleTransfers.enabled && league.flexibleChangesEnabled && (
                  <Card
                    sx={{
                      mb: 2,
                      cursor: availableTransfers.flexible > 0 ? 'pointer' : 'not-allowed',
                      border: selectedTransferType === 'flexible'
                        ? '2px solid #1E88E5'
                        : '1px solid rgba(255, 255, 255, 0.12)',
                      bgcolor: selectedTransferType === 'flexible'
                        ? alpha('#1E88E5', 0.08)
                        : 'transparent',
                      transition: 'all 0.3s ease',
                      opacity: availableTransfers.flexible === 0 ? 0.5 : 1,
                      borderRadius: 3,
                      '&:hover': availableTransfers.flexible > 0 ? {
                        bgcolor: alpha('#1E88E5', 0.05),
                        borderColor: alpha('#1E88E5', 0.5),
                      } : {}
                    }}
                    onClick={() => availableTransfers.flexible > 0 && setSelectedTransferType('flexible')}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box display="flex" alignItems="start" gap={2}>
                        <FormControlLabel
                          value="flexible"
                          control={<Radio sx={{
                            color: 'text.secondary',
                            '&.Mui-checked': { color: '#1E88E5' }
                          }} />}
                          label=""
                          disabled={availableTransfers.flexible === 0}
                          sx={{ m: 0 }}
                        />
                        <Box flex={1}>
                          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                            <Typography variant="h6" fontWeight="bold">
                              Flexible Change
                            </Typography>
                            <Chip
                              label={`${availableTransfers.flexible} available`}
                              color={availableTransfers.flexible > 0 ? 'success' : 'default'}
                              size="small"
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Replace any player (except C) OR reassign VC/X. Cannot change Captain.
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {league.transferTypes?.midSeasonTransfers.enabled && (
                  <Card
                    sx={{
                      mb: 2,
                      cursor: (isMidSeasonWindowOpen() && availableTransfers.midSeason > 0) ? 'pointer' : 'not-allowed',
                      border: selectedTransferType === 'midSeason'
                        ? '2px solid #1E88E5'
                        : '1px solid rgba(255, 255, 255, 0.12)',
                      bgcolor: selectedTransferType === 'midSeason'
                        ? alpha('#1E88E5', 0.08)
                        : 'transparent',
                      transition: 'all 0.3s ease',
                      opacity: (!isMidSeasonWindowOpen() || availableTransfers.midSeason === 0) ? 0.5 : 1,
                      borderRadius: 3,
                      '&:hover': (isMidSeasonWindowOpen() && availableTransfers.midSeason > 0) ? {
                        bgcolor: alpha('#1E88E5', 0.05),
                        borderColor: alpha('#1E88E5', 0.5),
                      } : {}
                    }}
                    onClick={() => isMidSeasonWindowOpen() && availableTransfers.midSeason > 0 && setSelectedTransferType('midSeason')}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box display="flex" alignItems="start" gap={2}>
                        <FormControlLabel
                          value="midSeason"
                          control={<Radio sx={{
                            color: 'text.secondary',
                            '&.Mui-checked': { color: '#1E88E5' }
                          }} />}
                          label=""
                          disabled={!isMidSeasonWindowOpen() || availableTransfers.midSeason === 0}
                          sx={{ m: 0 }}
                        />
                        <Box flex={1}>
                          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                            <Typography variant="h6" fontWeight="bold">
                              Mid-Season Change
                            </Typography>
                            <Chip
                              label={`${availableTransfers.midSeason} available`}
                              color={(availableTransfers.midSeason > 0 && isMidSeasonWindowOpen()) ? 'secondary' : 'default'}
                              size="small"
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {isMidSeasonWindowOpen()
                              ? 'Same as Flexible, only during mid-season window'
                              : 'Window closed - not available right now'
                            }
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </RadioGroup>
            </FormControl>
          </Box>
        )}

        {/* Step 2: Choose Change Type */}
        {activeStep === 1 && (
          <Box>
            <Typography
              variant="h6"
              fontWeight="bold"
              gutterBottom
              sx={{ mb: 3 }}
            >
              What would you like to do?
            </Typography>
            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={selectedChangeType || ''}
                onChange={(e) => setSelectedChangeType(e.target.value as any)}
              >
                <Card
                  sx={{
                    mb: 2.5,
                    cursor: 'pointer',
                    border: selectedChangeType === 'playerSubstitution' ? '2px solid #1E88E5' : '1px solid rgba(255, 255, 255, 0.12)',
                    bgcolor: selectedChangeType === 'playerSubstitution' ? alpha('#1E88E5', 0.08) : 'transparent',
                    transition: 'all 0.3s ease',
                    borderRadius: 3,
                    '&:hover': {
                      bgcolor: alpha('#1E88E5', 0.05),
                      borderColor: alpha('#1E88E5', 0.5),
                    }
                  }}
                  onClick={() => setSelectedChangeType('playerSubstitution')}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box display="flex" alignItems="start" gap={2}>
                      <FormControlLabel
                        value="playerSubstitution"
                        control={<Radio sx={{
                          color: 'text.secondary',
                          '&.Mui-checked': { color: '#1E88E5' }
                        }} />}
                        label=""
                        sx={{ m: 0 }}
                      />
                      <Box flex={1}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: 'text.primary' }}>
                          Player Substitution
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={1.5}>
                          Replace a player in your squad with a new player
                        </Typography>
                      </Box>
                    </Box>

                    {selectedChangeType === 'playerSubstitution' && (
                      <Box mt={2.5}>
                        <Divider sx={{ mb: 3, borderColor: alpha('#1E88E5', 0.3) }} />
                        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                          <Box flex={1} minWidth={200}>
                            <Typography variant="body2" gutterBottom fontWeight="600" color="text.secondary">
                              Player Out
                            </Typography>
                            <Select
                              fullWidth
                              value={playerOut}
                              onChange={(e) => setPlayerOut(e.target.value)}
                              size="small"
                              displayEmpty
                            >
                              <MenuItem value="">Select player to remove</MenuItem>
                              {getPlayersForRemoval().map(player => (
                                <MenuItem key={player.playerId} value={player.playerId}>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem' }}>
                                      {player.playerName.charAt(0)}
                                    </Avatar>
                                    <Typography variant="body2">{player.playerName}</Typography>
                                    {player.playerId === existingSquad.captainId && (
                                      <Chip label="C" size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
                                    )}
                                    {player.playerId === existingSquad.viceCaptainId && (
                                      <Chip label="VC" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
                                    )}
                                    {player.playerId === existingSquad.xFactorId && (
                                      <Chip label="X" size="small" color="secondary" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
                                    )}
                                  </Box>
                                </MenuItem>
                              ))}
                            </Select>
                          </Box>

                          <SwapHoriz sx={{ fontSize: 32, color: 'text.secondary', flexShrink: 0, mt: 2 }} />

                          <Box flex={1} minWidth={200}>
                            <Typography variant="body2" gutterBottom fontWeight="600" color="text.secondary">
                              Player In
                            </Typography>
                            <Select
                              fullWidth
                              value={playerIn}
                              onChange={(e) => setPlayerIn(e.target.value)}
                              size="small"
                              displayEmpty
                            >
                              <MenuItem value="">Select player to add</MenuItem>
                              {getAvailablePlayersForSelection().map(player => (
                                <MenuItem key={player.id} value={player.id}>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem' }}>
                                      {player.name.charAt(0)}
                                    </Avatar>
                                    <Typography variant="body2">{player.name}</Typography>
                                    <Chip label={player.role} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                                  </Box>
                                </MenuItem>
                              ))}
                            </Select>
                          </Box>
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>

                {/* NEW RULES: Role Reassignment available for ALL transfer types */}
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: selectedChangeType === 'roleReassignment' ? '2px solid #1E88E5' : '1px solid rgba(255, 255, 255, 0.12)',
                    bgcolor: selectedChangeType === 'roleReassignment' ? alpha('#1E88E5', 0.08) : 'transparent',
                    transition: 'all 0.3s ease',
                    borderRadius: 3,
                    '&:hover': {
                      bgcolor: alpha('#1E88E5', 0.05),
                      borderColor: alpha('#1E88E5', 0.5),
                    }
                  }}
                  onClick={() => setSelectedChangeType('roleReassignment')}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box display="flex" alignItems="start" gap={2}>
                      <FormControlLabel
                        value="roleReassignment"
                        control={<Radio sx={{
                          color: 'text.secondary',
                          '&.Mui-checked': { color: '#1E88E5' }
                        }} />}
                        label=""
                        sx={{ m: 0 }}
                      />
                      <Box flex={1}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: 'text.primary' }}>
                          {selectedTransferType === 'bench'
                            ? 'Reassign Captain, Vice-Captain, or X-Factor'
                            : 'Reassign Vice-Captain or X-Factor'
                          }
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={1.5}>
                          {selectedTransferType === 'bench'
                            ? 'Change any role (Captain, VC, or X-Factor)'
                            : 'Change VC or X-Factor (Captain changes require Bench transfer)'
                          }
                        </Typography>
                      </Box>
                    </Box>

                  {selectedChangeType === 'roleReassignment' && (
                    <Box mt={2.5}>
                      <Divider sx={{ mb: 3 }} />
                      <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography variant="body2">
                          {selectedTransferType === 'bench'
                            ? 'Select ONE role to reassign (Captain, VC, or X-Factor). Each role change consumes one transfer.'
                            : 'Select ONE role to reassign (VC or X-Factor only). Captain changes require a Bench transfer.'
                          }
                        </Typography>
                      </Alert>
                        <Box display="flex" gap={2.5} flexDirection="column">
                          {/* NEW: Captain selection (only for bench transfers) */}
                          {selectedTransferType === 'bench' && (
                            <Box>
                              <Typography variant="body2" gutterBottom fontWeight="600" color="text.secondary">
                                New Captain (Optional)
                              </Typography>
                              <Select
                                fullWidth
                                value={newCaptain}
                                onChange={(e) => {
                                  setNewCaptain(e.target.value);
                                  if (e.target.value) {
                                    setNewViceCaptain('');
                                    setNewXFactor('');
                                  }
                                }}
                                size="small"
                                displayEmpty
                              >
                                <MenuItem value="">No change</MenuItem>
                                {existingSquad.players.slice(0, league.squadSize).map(player => (
                                  <MenuItem
                                    key={player.playerId}
                                    value={player.playerId}
                                    disabled={player.playerId === existingSquad.captainId}
                                  >
                                    <Box display="flex" alignItems="center" gap={1}>
                                      <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem' }}>
                                        {player.playerName.charAt(0)}
                                      </Avatar>
                                      <Typography variant="body2">{player.playerName}</Typography>
                                      {player.playerId === existingSquad.captainId && (
                                        <Chip label="C" size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
                                      )}
                                      {player.playerId === existingSquad.viceCaptainId && (
                                        <Chip label="VC" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
                                      )}
                                      {player.playerId === existingSquad.xFactorId && (
                                        <Chip label="X" size="small" color="secondary" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
                                      )}
                                    </Box>
                                  </MenuItem>
                                ))}
                              </Select>
                            </Box>
                          )}

                          <Box>
                            <Typography variant="body2" gutterBottom fontWeight="600" color="text.secondary">
                              New Vice-Captain (Optional)
                            </Typography>
                            <Select
                              fullWidth
                              value={newViceCaptain}
                              onChange={(e) => {
                                setNewViceCaptain(e.target.value);
                                if (e.target.value) {
                                  setNewCaptain('');
                                  setNewXFactor('');
                                }
                              }}
                              size="small"
                              displayEmpty
                            >
                              <MenuItem value="">No change</MenuItem>
                              {existingSquad.players.slice(0, league.squadSize).map(player => (
                                <MenuItem
                                  key={player.playerId}
                                  value={player.playerId}
                                  disabled={
                                    player.playerId === existingSquad.viceCaptainId ||
                                    (selectedTransferType !== 'bench' && player.playerId === existingSquad.captainId)
                                  }
                                >
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem' }}>
                                      {player.playerName.charAt(0)}
                                    </Avatar>
                                    <Typography variant="body2">{player.playerName}</Typography>
                                    {player.playerId === existingSquad.captainId && (
                                      <Chip label="C" size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
                                    )}
                                    {player.playerId === existingSquad.viceCaptainId && (
                                      <Chip label="VC" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
                                    )}
                                    {player.playerId === existingSquad.xFactorId && (
                                      <Chip label="X" size="small" color="secondary" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
                                    )}
                                  </Box>
                                </MenuItem>
                              ))}
                            </Select>
                          </Box>

                          <Box>
                            <Typography variant="body2" gutterBottom fontWeight="600" color="text.secondary">
                              New X-Factor (Optional)
                            </Typography>
                            <Select
                              fullWidth
                              value={newXFactor}
                              onChange={(e) => {
                                setNewXFactor(e.target.value);
                                if (e.target.value) {
                                  setNewCaptain('');
                                  setNewViceCaptain('');
                                }
                              }}
                              size="small"
                              displayEmpty
                            >
                              <MenuItem value="">No change</MenuItem>
                              {existingSquad.players.slice(0, league.squadSize).map(player => (
                                <MenuItem
                                  key={player.playerId}
                                  value={player.playerId}
                                  disabled={
                                    player.playerId === existingSquad.xFactorId ||
                                    (selectedTransferType !== 'bench' && player.playerId === existingSquad.captainId)
                                  }
                                >
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem' }}>
                                      {player.playerName.charAt(0)}
                                    </Avatar>
                                    <Typography variant="body2">{player.playerName}</Typography>
                                    {player.playerId === existingSquad.captainId && (
                                      <Chip label="C" size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
                                    )}
                                    {player.playerId === existingSquad.viceCaptainId && (
                                      <Chip label="VC" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
                                    )}
                                    {player.playerId === existingSquad.xFactorId && (
                                      <Chip label="X" size="small" color="secondary" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
                                    )}
                                  </Box>
                                </MenuItem>
                              ))}
                            </Select>
                          </Box>
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </RadioGroup>
            </FormControl>
          </Box>
        )}

        {/* Step 3: Confirm */}
        {activeStep === 2 && (
          <Box>
            {/* Transfer Type Badge - Compact */}
            <Box sx={{
              mb: 1,
              display: 'flex',
              justifyContent: 'center',
            }}>
              <Chip
                label={
                  selectedTransferType === 'bench' ? 'Bench Change' :
                  selectedTransferType === 'flexible' ? 'Flexible Change' :
                  'Mid-Season Change'
                }
                size="small"
                sx={{
                  bgcolor: '#1E88E5', // Electric Blue
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.75rem',
                  px: 1.5,
                  height: 28,
                }}
              />
            </Box>

            {selectedChangeType === 'playerSubstitution' ? (
              // PLAYER SUBSTITUTION VIEW
              <Box>
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  gutterBottom
                  sx={{
                    color: 'text.primary',
                    mb: 2
                  }}
                >
                  Player Substitution
                </Typography>

                {/* Before & After Cards */}
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: 2.5,
                  alignItems: 'center',
                  my: 3
                }}>
                  {/* Player Out Card - Neutral Gray (Muted) */}
                  <Card sx={{
                    border: '2px solid',
                    borderColor: 'rgba(120, 120, 120, 0.3)',
                    bgcolor: 'rgba(40, 40, 40, 0.25)',
                    position: 'relative',
                    borderRadius: 3,
                    opacity: 0.85,
                  }}>
                    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                      <Box sx={{
                        position: 'absolute',
                        top: -12,
                        left: 12,
                        bgcolor: 'rgba(100, 100, 100, 0.9)',
                        color: 'white',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1.5,
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}>
                        <ArrowDownward sx={{ fontSize: 14 }} />
                        OUT
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mt: 1.5 }}>
                        <Avatar sx={{
                          width: 56,
                          height: 56,
                          bgcolor: 'rgba(100, 100, 100, 0.6)',
                          fontSize: '1.5rem',
                          fontWeight: 'bold',
                        }}>
                          {getPlayerName(playerOut).charAt(0)}
                        </Avatar>
                        <Typography variant="body1" fontWeight="bold" textAlign="center">
                          {getPlayerName(playerOut)}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                          {playerOut === existingSquad.captainId && (
                            <Chip label="C" size="small" color="warning" sx={{
                              height: 20,
                              fontSize: '0.7rem'
                            }} />
                          )}
                          {playerOut === existingSquad.viceCaptainId && (
                            <Chip label="VC" size="small" color="info" sx={{
                              height: 20,
                              fontSize: '0.7rem'
                            }} />
                          )}
                          {playerOut === existingSquad.xFactorId && (
                            <Chip label="X" size="small" color="secondary" sx={{
                              height: 20,
                              fontSize: '0.7rem'
                            }} />
                          )}
                        </Box>
                        {(() => {
                          const player = existingSquad.players.find(p => p.playerId === playerOut);
                          return player ? (
                            <>
                              <Typography variant="caption" color="text.secondary">
                                {player.team}
                              </Typography>
                              <Chip
                                label={player.role}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: '0.65rem',
                                  bgcolor: 'rgba(100, 100, 100, 0.2)',
                                  color: 'text.secondary',
                                  fontWeight: 600,
                                }}
                              />
                            </>
                          ) : null;
                        })()}
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Swap Indicator - Animated Pill */}
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                  }}>
                    <Chip
                      icon={<TrendingFlat sx={{ fontSize: 18 }} />}
                      label="Swap"
                      sx={{
                        bgcolor: alpha('#1E88E5', 0.15),
                        color: '#1E88E5',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        borderRadius: 2,
                        border: `1px solid ${alpha('#1E88E5', 0.3)}`,
                      }}
                    />
                  </Box>

                  {/* Player In Card - Elevated/Highlighted */}
                  <Card sx={{
                    border: '3px solid #1E88E5',
                    bgcolor: alpha('#1E88E5', 0.08),
                    position: 'relative',
                    borderRadius: 3,
                    boxShadow: `0 0 20px ${alpha('#1E88E5', 0.25)}`,
                  }}>
                    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                      <Box sx={{
                        position: 'absolute',
                        top: -12,
                        left: 12,
                        bgcolor: '#1E88E5',
                        color: 'white',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1.5,
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        boxShadow: `0 4px 12px ${alpha('#1E88E5', 0.4)}`,
                      }}>
                        <ArrowUpward sx={{ fontSize: 14 }} />
                        IN
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mt: 1.5 }}>
                        <Avatar sx={{
                          width: 56,
                          height: 56,
                          bgcolor: '#1E88E5',
                          fontSize: '1.5rem',
                          fontWeight: 'bold',
                          boxShadow: `0 4px 12px ${alpha('#1E88E5', 0.3)}`,
                        }}>
                          {(availablePlayers.find(p => p.id === playerIn)?.name || playerIn).charAt(0)}
                        </Avatar>
                        <Typography variant="body1" fontWeight="bold" textAlign="center">
                          {availablePlayers.find(p => p.id === playerIn)?.name || playerIn}
                        </Typography>
                        {(() => {
                          const player = availablePlayers.find(p => p.id === playerIn);
                          return player ? (
                            <>
                              <Typography variant="caption" color="text.secondary">
                                {player.team}
                              </Typography>
                              <Chip
                                label={player.role}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: '0.65rem',
                                  bgcolor: alpha('#1E88E5', 0.2),
                                  color: '#1E88E5',
                                  fontWeight: 600,
                                }}
                              />
                            </>
                          ) : null;
                        })()}
                      </Box>
                    </CardContent>
                  </Card>
                </Box>

                {/* Squad Validation Status - Moved closer to action */}
                <Card sx={{
                  bgcolor: 'rgba(50, 50, 50, 0.4)',
                  border: `1px solid rgba(120, 120, 120, 0.3)`,
                  mt: 3,
                  borderRadius: 2.5,
                }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                      Squad Composition
                    </Typography>
                    {(() => {
                      const validation = validatePlayerSubstitution();
                      if (validation) {
                        return (
                          <Typography variant="body2" color="error">
                            ⚠️ {validation}
                          </Typography>
                        );
                      }
                      return (
                        <Typography variant="body2" sx={{ color: '#1E88E5' }}>
                          ✓ Squad composition valid
                        </Typography>
                      );
                    })()}
                  </CardContent>
                </Card>
              </Box>
            ) : (
              // ROLE REASSIGNMENT VIEW
              <Box>
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  gutterBottom
                  sx={{
                    color: 'text.primary',
                    mb: 2
                  }}
                >
                  Role Reassignment Summary
                </Typography>

                {/* Comprehensive Before & After View */}
                <Box sx={{ my: 3 }}>
                  <Card sx={{
                    bgcolor: 'rgba(50, 50, 50, 0.4)',
                    border: `1px solid rgba(120, 120, 120, 0.3)`,
                    borderRadius: 3,
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 3, alignItems: 'center' }}>
                        {/* BEFORE Column */}
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, textAlign: 'center', fontWeight: 'bold' }}>
                            BEFORE
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* Captain */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: alpha('#FF9800', 0.08), borderRadius: 2, border: `1px solid ${alpha('#FF9800', 0.3)}` }}>
                              <Chip label="C" size="small" color="warning" sx={{ fontWeight: 'bold', minWidth: 32 }} />
                              <Typography variant="body2" fontWeight="600" sx={{ flex: 1 }}>
                                {getPlayerName(existingSquad.captainId)}
                              </Typography>
                            </Box>
                            {/* Vice-Captain */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: alpha('#1E88E5', 0.08), borderRadius: 2, border: `1px solid ${alpha('#1E88E5', 0.3)}` }}>
                              <Chip label="VC" size="small" color="info" sx={{ fontWeight: 'bold', minWidth: 32 }} />
                              <Typography variant="body2" fontWeight="600" sx={{ flex: 1 }}>
                                {getPlayerName(existingSquad.viceCaptainId)}
                              </Typography>
                            </Box>
                            {/* X-Factor */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: alpha('#9C27B0', 0.08), borderRadius: 2, border: `1px solid ${alpha('#9C27B0', 0.3)}` }}>
                              <Chip label="X" size="small" color="secondary" sx={{ fontWeight: 'bold', minWidth: 32 }} />
                              <Typography variant="body2" fontWeight="600" sx={{ flex: 1 }}>
                                {getPlayerName(existingSquad.xFactorId)}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        {/* Arrow */}
                        <TrendingFlat sx={{ fontSize: 32, color: '#1E88E5' }} />

                        {/* AFTER Column */}
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, textAlign: 'center', fontWeight: 'bold' }}>
                            AFTER
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {(() => {
                              // Calculate new roles after swap
                              let newCaptainAfter = newCaptain || existingSquad.captainId;
                              let newVCAfter = newViceCaptain || existingSquad.viceCaptainId;
                              let newXAfter = newXFactor || existingSquad.xFactorId;

                              // Handle automatic swaps
                              if (newCaptain) {
                                // If new captain was VC, old VC becomes null (needs reassignment)
                                if (newCaptain === existingSquad.viceCaptainId) {
                                  newVCAfter = undefined;
                                }
                                // If new captain was X, old X becomes null (needs reassignment)
                                if (newCaptain === existingSquad.xFactorId) {
                                  newXAfter = undefined;
                                }
                              }

                              if (newViceCaptain) {
                                // If new VC was X, swap old VC to X
                                if (newViceCaptain === existingSquad.xFactorId) {
                                  newXAfter = existingSquad.viceCaptainId;
                                }
                                // If new VC was C (not possible due to validation)
                                if (newViceCaptain === existingSquad.captainId) {
                                  newCaptainAfter = existingSquad.viceCaptainId;
                                }
                              }

                              if (newXFactor) {
                                // If new X was VC, swap old X to VC
                                if (newXFactor === existingSquad.viceCaptainId) {
                                  newVCAfter = existingSquad.xFactorId;
                                }
                                // If new X was C (not possible due to validation)
                                if (newXFactor === existingSquad.captainId) {
                                  newCaptainAfter = existingSquad.xFactorId;
                                }
                              }

                              return (
                                <>
                                  {/* Captain */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: alpha('#FF9800', newCaptain ? 0.15 : 0.08), borderRadius: 2, border: `2px solid ${newCaptain ? '#FF9800' : alpha('#FF9800', 0.3)}` }}>
                                    <Chip label="C" size="small" color="warning" sx={{ fontWeight: 'bold', minWidth: 32 }} />
                                    <Typography variant="body2" fontWeight={newCaptain ? 'bold' : '600'} sx={{ flex: 1 }}>
                                      {getPlayerName(newCaptainAfter)}
                                    </Typography>
                                    {newCaptain && <Chip label="NEW" size="small" sx={{ bgcolor: '#FF9800', color: 'white', fontWeight: 'bold', height: 20, fontSize: '0.65rem' }} />}
                                  </Box>
                                  {/* Vice-Captain */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: alpha('#1E88E5', newViceCaptain ? 0.15 : 0.08), borderRadius: 2, border: `2px solid ${newViceCaptain ? '#1E88E5' : alpha('#1E88E5', 0.3)}` }}>
                                    <Chip label="VC" size="small" color="info" sx={{ fontWeight: 'bold', minWidth: 32 }} />
                                    <Typography variant="body2" fontWeight={newViceCaptain ? 'bold' : '600'} sx={{ flex: 1 }}>
                                      {newVCAfter ? getPlayerName(newVCAfter) : '(Removed)'}
                                    </Typography>
                                    {newViceCaptain && <Chip label="NEW" size="small" sx={{ bgcolor: '#1E88E5', color: 'white', fontWeight: 'bold', height: 20, fontSize: '0.65rem' }} />}
                                  </Box>
                                  {/* X-Factor */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: alpha('#9C27B0', newXFactor ? 0.15 : 0.08), borderRadius: 2, border: `2px solid ${newXFactor ? '#9C27B0' : alpha('#9C27B0', 0.3)}` }}>
                                    <Chip label="X" size="small" color="secondary" sx={{ fontWeight: 'bold', minWidth: 32 }} />
                                    <Typography variant="body2" fontWeight={newXFactor ? 'bold' : '600'} sx={{ flex: 1 }}>
                                      {newXAfter ? getPlayerName(newXAfter) : '(Removed)'}
                                    </Typography>
                                    {newXFactor && <Chip label="NEW" size="small" sx={{ bgcolor: '#9C27B0', color: 'white', fontWeight: 'bold', height: 20, fontSize: '0.65rem' }} />}
                                  </Box>
                                </>
                              );
                            })()}
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>

                {/* OLD Individual Role Change Display - REMOVE THIS */}
                <Box sx={{ display: 'none', flexDirection: 'column', gap: 2, my: 3 }}>
                  {newCaptain && (
                    <Card sx={{
                      border: '2px solid #FF9800',
                      bgcolor: alpha('#FF9800', 0.08),
                      position: 'relative',
                      borderRadius: 3,
                    }}>
                      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                        <Box sx={{
                          position: 'absolute',
                          top: -12,
                          left: 16,
                          bgcolor: '#FF9800',
                          color: 'white',
                          px: 2,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                        }}>
                          CAPTAIN
                        </Box>
                        <Box sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto 1fr',
                          gap: 2,
                          alignItems: 'center',
                          mt: 1
                        }}>
                          {/* Old Captain */}
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                              Previous
                            </Typography>
                            <Avatar sx={{
                              width: 48,
                              height: 48,
                              bgcolor: alpha('#FF9800', 0.3),
                              mx: 'auto',
                              mb: 1,
                            }}>
                              {getPlayerName(existingSquad.captainId).charAt(0)}
                            </Avatar>
                            <Typography variant="body2" fontWeight="600">
                              {getPlayerName(existingSquad.captainId)}
                            </Typography>
                          </Box>

                          <SwapHoriz sx={{ fontSize: 28, color: '#FF9800' }} />

                          {/* New Captain */}
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                              New
                            </Typography>
                            <Avatar sx={{
                              width: 48,
                              height: 48,
                              bgcolor: '#FF9800',
                              mx: 'auto',
                              mb: 1,
                              fontWeight: 'bold',
                            }}>
                              {getPlayerName(newCaptain).charAt(0)}
                            </Avatar>
                            <Typography variant="body2" fontWeight="bold">
                              {getPlayerName(newCaptain)}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  )}

                  {newViceCaptain && (
                    <Card sx={{
                      border: '2px solid #1E88E5',
                      bgcolor: alpha('#1E88E5', 0.08),
                      position: 'relative',
                      borderRadius: 3,
                    }}>
                      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                        <Box sx={{
                          position: 'absolute',
                          top: -12,
                          left: 16,
                          bgcolor: '#1E88E5',
                          color: 'white',
                          px: 2,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                        }}>
                          VICE-CAPTAIN
                        </Box>
                        <Box sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto 1fr',
                          gap: 2,
                          alignItems: 'center',
                          mt: 1
                        }}>
                          {/* Old VC */}
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                              Previous
                            </Typography>
                            <Avatar sx={{
                              width: 48,
                              height: 48,
                              bgcolor: alpha('#1E88E5', 0.3),
                              mx: 'auto',
                              mb: 1,
                            }}>
                              {getPlayerName(existingSquad.viceCaptainId).charAt(0)}
                            </Avatar>
                            <Typography variant="body2" fontWeight="600">
                              {getPlayerName(existingSquad.viceCaptainId)}
                            </Typography>
                          </Box>

                          <SwapHoriz sx={{ fontSize: 28, color: '#1E88E5' }} />

                          {/* New VC */}
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                              New
                            </Typography>
                            <Avatar sx={{
                              width: 48,
                              height: 48,
                              bgcolor: '#1E88E5',
                              mx: 'auto',
                              mb: 1,
                              fontWeight: 'bold',
                            }}>
                              {getPlayerName(newViceCaptain).charAt(0)}
                            </Avatar>
                            <Typography variant="body2" fontWeight="bold">
                              {getPlayerName(newViceCaptain)}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  )}

                  {newXFactor && (
                    <Card sx={{
                      border: '2px solid #9C27B0',
                      bgcolor: alpha('#9C27B0', 0.08),
                      position: 'relative',
                      borderRadius: 3,
                    }}>
                      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                        <Box sx={{
                          position: 'absolute',
                          top: -12,
                          left: 16,
                          bgcolor: '#9C27B0',
                          color: 'white',
                          px: 2,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                        }}>
                          X-FACTOR
                        </Box>
                        <Box sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto 1fr',
                          gap: 2,
                          alignItems: 'center',
                          mt: 1
                        }}>
                          {/* Old X-Factor */}
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                              Previous
                            </Typography>
                            <Avatar sx={{
                              width: 48,
                              height: 48,
                              bgcolor: alpha('#9C27B0', 0.3),
                              mx: 'auto',
                              mb: 1,
                            }}>
                              {getPlayerName(existingSquad.xFactorId).charAt(0)}
                            </Avatar>
                            <Typography variant="body2" fontWeight="600">
                              {getPlayerName(existingSquad.xFactorId)}
                            </Typography>
                          </Box>

                          <SwapHoriz sx={{ fontSize: 28, color: '#9C27B0' }} />

                          {/* New X-Factor */}
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                              New
                            </Typography>
                            <Avatar sx={{
                              width: 48,
                              height: 48,
                              bgcolor: '#9C27B0',
                              mx: 'auto',
                              mb: 1,
                              fontWeight: 'bold',
                            }}>
                              {getPlayerName(newXFactor).charAt(0)}
                            </Avatar>
                            <Typography variant="body2" fontWeight="bold">
                              {getPlayerName(newXFactor)}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  )}
                </Box>
              </Box>
            )}

            {/* Transfer Remaining Alert - Moved closer to action */}
            <Alert
              severity="info"
              sx={{
                mt: 3,
                bgcolor: 'rgba(50, 50, 50, 0.4)',
                border: `1px solid ${alpha('#1E88E5', 0.4)}`,
                borderRadius: 2.5,
                '& .MuiAlert-icon': {
                  color: '#1E88E5'
                }
              }}
            >
              <Typography variant="body2" fontWeight="600">
                After this transfer, you will have{' '}
                <strong>{availableTransfers[selectedTransferType!] - 1}</strong>{' '}
                {selectedTransferType} transfer(s) remaining.
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        {/* Cancel - Quiet text button */}
        <Button
          onClick={onClose}
          disabled={submitting}
          sx={{
            color: 'text.secondary',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.05)'
            }
          }}
        >
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        {/* Back - Outlined button */}
        {activeStep > 0 && (
          <Button
            onClick={handleBack}
            disabled={submitting}
            variant="outlined"
            sx={{
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: 'text.primary'
            }}
          >
            Back
          </Button>
        )}
        {/* Next/Confirm - Solid primary button (loud) */}
        {activeStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            variant="contained"
            color="primary"
            sx={{
              fontWeight: 'bold',
              px: 3
            }}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={submitting}
            sx={{
              fontWeight: 'bold',
              px: 3,
              bgcolor: '#1E88E5',
              '&:hover': {
                bgcolor: '#1565C0'
              }
            }}
          >
            {submitting ? 'Submitting...' : 'Confirm Transfer'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TransferModal;
