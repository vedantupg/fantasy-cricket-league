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
  FormLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Alert,
  Stepper,
  Step,
  StepLabel,
  useTheme,
  alpha,
  Divider
} from '@mui/material';
import {
  SwapHoriz,
  Star,
  PersonAdd,
  Close
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
  playerOut?: string; // player ID to remove
  playerIn?: string; // player ID to add
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
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTransferType, setSelectedTransferType] = useState<'bench' | 'flexible' | 'midSeason' | null>(null);
  const [selectedChangeType, setSelectedChangeType] = useState<'playerSubstitution' | 'roleReassignment' | null>(null);
  const [playerOut, setPlayerOut] = useState<string>('');
  const [playerIn, setPlayerIn] = useState<string>('');
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
      setError('Please select a transfer type');
      return;
    }

    if (activeStep === 1 && !selectedChangeType) {
      setError('Please select a change type');
      return;
    }

    if (activeStep === 1) {
      // Validate the selected change
      if (selectedChangeType === 'playerSubstitution') {
        if (!playerOut || !playerIn) {
          setError('Please select both players to swap');
          return;
        }
        // Validate player substitution rules
        const validationError = validatePlayerSubstitution();
        if (validationError) {
          setError(validationError);
          return;
        }
      } else if (selectedChangeType === 'roleReassignment') {
        if (!newViceCaptain && !newXFactor) {
          setError('Please select a new Vice-Captain or X-Factor');
          return;
        }
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
    setNewViceCaptain('');
    setNewXFactor('');
    setError('');
  };

  const validatePlayerSubstitution = (): string | null => {
    const playerOutData = existingSquad.players.find(p => p.playerId === playerOut);
    if (!playerOutData) return 'Invalid player selection';

    // FLEXIBLE & MID-SEASON RULES: Cannot remove Captain or Vice-Captain
    if (selectedTransferType === 'flexible' || selectedTransferType === 'midSeason') {
      if (playerOut === existingSquad.captainId) {
        return 'Cannot remove the Captain in a Flexible/Mid-Season change';
      }
      if (playerOut === existingSquad.viceCaptainId) {
        return 'Cannot remove the Vice-Captain in a Flexible/Mid-Season change';
      }
    }

    // BENCH TRANSFER RULES: Can replace any player including C/VC/X
    if (selectedTransferType === 'bench') {
      // For bench transfers, must use one of the bench players as the incoming player
      const benchPlayers = existingSquad.players.filter((p, index) => index >= league.squadSize);
      const benchPlayerIds = benchPlayers.map(p => p.playerId);
      if (!benchPlayerIds.includes(playerIn)) {
        return 'Bench transfer must use one of your bench players';
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

  const getPlayerName = (playerId: string): string => {
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

    // For flexible/mid-season, return all available players not in squad
    const squadPlayerIds = existingSquad.players.map(p => p.playerId);
    return availablePlayers.filter(p => !squadPlayerIds.includes(p.id));
  };

  const getPlayersForRemoval = (): SquadPlayer[] => {
    // Return main squad players (exclude bench)
    const mainSquadPlayers = existingSquad.players.slice(0, league.squadSize);

    if (selectedTransferType === 'flexible' || selectedTransferType === 'midSeason') {
      // FLEXIBLE/MID-SEASON: Cannot remove Captain or Vice-Captain
      return mainSquadPlayers.filter(p =>
        p.playerId !== existingSquad.captainId &&
        p.playerId !== existingSquad.viceCaptainId
      );
    } else if (selectedTransferType === 'bench') {
      // BENCH: Can replace any player including C/VC/X
      return mainSquadPlayers;
    }

    return mainSquadPlayers;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <SwapHoriz color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Make a Transfer
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
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
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend" sx={{ mb: 2 }}>
                Select Transfer Type
              </FormLabel>
              <RadioGroup
                value={selectedTransferType || ''}
                onChange={(e) => setSelectedTransferType(e.target.value as any)}
              >
                {league.transferTypes?.benchTransfers.enabled && league.benchChangesEnabled && (
                  <Card
                    sx={{
                      mb: 2,
                      cursor: 'pointer',
                      border: selectedTransferType === 'bench' ? `2px solid ${theme.palette.primary.main}` : '1px solid rgba(255,255,255,0.12)',
                      bgcolor: selectedTransferType === 'bench' ? alpha(theme.palette.primary.main, 0.1) : 'transparent'
                    }}
                    onClick={() => availableTransfers.bench > 0 && setSelectedTransferType('bench')}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center" gap={2}>
                          <FormControlLabel
                            value="bench"
                            control={<Radio />}
                            label=""
                            disabled={availableTransfers.bench === 0}
                          />
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              Bench Change
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Replace any player including C/VC/X. Pure substitution. No VC/X changes.
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={`${availableTransfers.bench} available`}
                          color={availableTransfers.bench > 0 ? 'primary' : 'default'}
                          size="small"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {league.transferTypes?.flexibleTransfers.enabled && league.flexibleChangesEnabled && (
                  <Card
                    sx={{
                      mb: 2,
                      cursor: 'pointer',
                      border: selectedTransferType === 'flexible' ? `2px solid ${theme.palette.primary.main}` : '1px solid rgba(255,255,255,0.12)',
                      bgcolor: selectedTransferType === 'flexible' ? alpha(theme.palette.primary.main, 0.1) : 'transparent'
                    }}
                    onClick={() => availableTransfers.flexible > 0 && setSelectedTransferType('flexible')}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center" gap={2}>
                          <FormControlLabel
                            value="flexible"
                            control={<Radio />}
                            label=""
                            disabled={availableTransfers.flexible === 0}
                          />
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              Flexible Change
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Replace any player (except C & VC) or reassign VC/X. Full flexibility except C.
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={`${availableTransfers.flexible} available`}
                          color={availableTransfers.flexible > 0 ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {league.transferTypes?.midSeasonTransfers.enabled && (
                  <Card
                    sx={{
                      mb: 2,
                      cursor: 'pointer',
                      border: selectedTransferType === 'midSeason' ? `2px solid ${theme.palette.primary.main}` : '1px solid rgba(255,255,255,0.12)',
                      bgcolor: selectedTransferType === 'midSeason' ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                      opacity: !isMidSeasonWindowOpen() ? 0.5 : 1
                    }}
                    onClick={() => isMidSeasonWindowOpen() && availableTransfers.midSeason > 0 && setSelectedTransferType('midSeason')}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center" gap={2}>
                          <FormControlLabel
                            value="midSeason"
                            control={<Radio />}
                            label=""
                            disabled={!isMidSeasonWindowOpen() || availableTransfers.midSeason === 0}
                          />
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              Mid-Season Change
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {isMidSeasonWindowOpen()
                                ? 'Same as Flexible, only during mid-season window'
                                : 'Window closed'
                              }
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={`${availableTransfers.midSeason} available`}
                          color={availableTransfers.midSeason > 0 && isMidSeasonWindowOpen() ? 'secondary' : 'default'}
                          size="small"
                        />
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
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend" sx={{ mb: 2 }}>
                What would you like to do?
              </FormLabel>
              <RadioGroup
                value={selectedChangeType || ''}
                onChange={(e) => setSelectedChangeType(e.target.value as any)}
              >
                <Card
                  sx={{
                    mb: 2,
                    cursor: 'pointer',
                    border: selectedChangeType === 'playerSubstitution' ? `2px solid ${theme.palette.primary.main}` : '1px solid rgba(255,255,255,0.12)',
                    bgcolor: selectedChangeType === 'playerSubstitution' ? alpha(theme.palette.primary.main, 0.1) : 'transparent'
                  }}
                  onClick={() => setSelectedChangeType('playerSubstitution')}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2}>
                      <FormControlLabel
                        value="playerSubstitution"
                        control={<Radio />}
                        label=""
                      />
                      <Box flex={1}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Player Substitution
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Replace a player in your squad
                        </Typography>
                      </Box>
                    </Box>

                    {selectedChangeType === 'playerSubstitution' && (
                      <Box mt={2}>
                        <Divider sx={{ mb: 2 }} />
                        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                          <Box flex={1} minWidth={200}>
                            <Typography variant="body2" gutterBottom fontWeight="bold">
                              Player Out
                            </Typography>
                            <Select
                              fullWidth
                              value={playerOut}
                              onChange={(e) => setPlayerOut(e.target.value)}
                              size="small"
                            >
                              <MenuItem value="">Select player to remove</MenuItem>
                              {getPlayersForRemoval().map(player => (
                                <MenuItem key={player.playerId} value={player.playerId}>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                                      {player.playerName.charAt(0)}
                                    </Avatar>
                                    <Typography variant="body2">{player.playerName}</Typography>
                                    {player.playerId === existingSquad.captainId && (
                                      <Chip label="C" size="small" color="warning" sx={{ height: 18, fontSize: '0.65rem' }} />
                                    )}
                                    {player.playerId === existingSquad.viceCaptainId && (
                                      <Chip label="VC" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                                    )}
                                    {player.playerId === existingSquad.xFactorId && (
                                      <Chip label="X" size="small" color="secondary" sx={{ height: 18, fontSize: '0.65rem' }} />
                                    )}
                                  </Box>
                                </MenuItem>
                              ))}
                            </Select>
                          </Box>

                          <SwapHoriz color="primary" />

                          <Box flex={1} minWidth={200}>
                            <Typography variant="body2" gutterBottom fontWeight="bold">
                              Player In
                            </Typography>
                            <Select
                              fullWidth
                              value={playerIn}
                              onChange={(e) => setPlayerIn(e.target.value)}
                              size="small"
                            >
                              <MenuItem value="">Select player to add</MenuItem>
                              {getAvailablePlayersForSelection().map(player => (
                                <MenuItem key={player.id} value={player.id}>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                                      {player.name.charAt(0)}
                                    </Avatar>
                                    <Typography variant="body2">{player.name}</Typography>
                                    <Chip label={player.role} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
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

                {/* Role Reassignment is NOT allowed for Bench transfers */}
                {selectedTransferType !== 'bench' && (
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: selectedChangeType === 'roleReassignment' ? `2px solid ${theme.palette.primary.main}` : '1px solid rgba(255,255,255,0.12)',
                      bgcolor: selectedChangeType === 'roleReassignment' ? alpha(theme.palette.primary.main, 0.1) : 'transparent'
                    }}
                    onClick={() => setSelectedChangeType('roleReassignment')}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2}>
                        <FormControlLabel
                          value="roleReassignment"
                          control={<Radio />}
                          label=""
                        />
                        <Box flex={1}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            Reassign Vice-Captain or X-Factor
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Change your VC or X-Factor without swapping players
                          </Typography>
                        </Box>
                      </Box>

                    {selectedChangeType === 'roleReassignment' && (
                      <Box mt={2}>
                        <Divider sx={{ mb: 2 }} />
                        <Box display="flex" gap={2} flexWrap="wrap">
                          <Box flex={1} minWidth={200}>
                            <Typography variant="body2" gutterBottom fontWeight="bold">
                              New Vice-Captain
                            </Typography>
                            <Select
                              fullWidth
                              value={newViceCaptain}
                              onChange={(e) => setNewViceCaptain(e.target.value)}
                              size="small"
                            >
                              <MenuItem value="">No change</MenuItem>
                              {existingSquad.players.slice(0, league.squadSize).map(player => (
                                <MenuItem
                                  key={player.playerId}
                                  value={player.playerId}
                                  disabled={player.playerId === existingSquad.captainId}
                                >
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                                      {player.playerName.charAt(0)}
                                    </Avatar>
                                    <Typography variant="body2">{player.playerName}</Typography>
                                    {player.playerId === existingSquad.captainId && (
                                      <Chip label="C" size="small" color="warning" sx={{ height: 18, fontSize: '0.65rem' }} />
                                    )}
                                    {player.playerId === existingSquad.viceCaptainId && (
                                      <Chip label="Current VC" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                                    )}
                                  </Box>
                                </MenuItem>
                              ))}
                            </Select>
                          </Box>

                          <Box flex={1} minWidth={200}>
                            <Typography variant="body2" gutterBottom fontWeight="bold">
                              New X-Factor
                            </Typography>
                            <Select
                              fullWidth
                              value={newXFactor}
                              onChange={(e) => setNewXFactor(e.target.value)}
                              size="small"
                            >
                              <MenuItem value="">No change</MenuItem>
                              {existingSquad.players.slice(0, league.squadSize).map(player => (
                                <MenuItem key={player.playerId} value={player.playerId}>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                                      {player.playerName.charAt(0)}
                                    </Avatar>
                                    <Typography variant="body2">{player.playerName}</Typography>
                                    {player.playerId === existingSquad.xFactorId && (
                                      <Chip label="Current X" size="small" color="secondary" sx={{ height: 18, fontSize: '0.65rem' }} />
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
                )}
              </RadioGroup>
            </FormControl>
          </Box>
        )}

        {/* Step 3: Confirm */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Confirm Transfer
            </Typography>
            <Card sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Transfer Type
                </Typography>
                <Typography variant="body1" fontWeight="bold" gutterBottom>
                  {selectedTransferType === 'bench' ? 'Bench Change' :
                   selectedTransferType === 'flexible' ? 'Flexible Change' :
                   'Mid-Season Change'}
                </Typography>

                <Divider sx={{ my: 2 }} />

                {selectedChangeType === 'playerSubstitution' ? (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Player Substitution
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2} my={1}>
                      <Chip
                        label={getPlayerName(playerOut)}
                        onDelete={() => {}}
                        deleteIcon={<Close />}
                        color="error"
                      />
                      <SwapHoriz />
                      <Chip
                        label={availablePlayers.find(p => p.id === playerIn)?.name || playerIn}
                        icon={<PersonAdd />}
                        color="success"
                      />
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Role Reassignment
                    </Typography>
                    {newViceCaptain && (
                      <Box display="flex" alignItems="center" gap={1} my={1}>
                        <Star color="info" fontSize="small" />
                        <Typography variant="body2">
                          New Vice-Captain: <strong>{getPlayerName(newViceCaptain)}</strong>
                        </Typography>
                      </Box>
                    )}
                    {newXFactor && (
                      <Box display="flex" alignItems="center" gap={1} my={1}>
                        <Star color="secondary" fontSize="small" />
                        <Typography variant="body2">
                          New X-Factor: <strong>{getPlayerName(newXFactor)}</strong>
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>

            <Alert severity="warning" sx={{ mt: 2 }}>
              This action cannot be undone. You will have{' '}
              {availableTransfers[selectedTransferType!] - 1} {selectedTransferType} transfer(s) remaining.
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={submitting}>
            Back
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button onClick={handleNext} variant="contained">
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Confirm Transfer'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TransferModal;
