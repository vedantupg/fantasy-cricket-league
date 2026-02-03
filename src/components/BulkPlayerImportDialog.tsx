import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Chip,
  IconButton,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  ContentPaste,
  Close,
  CheckCircle,
  Warning,
  Delete,
} from '@mui/icons-material';
import type { PlayerPoolEntry } from '../types/database';

interface ParsedPlayer {
  playerId: string;
  name: string;
  team: string;
  role: 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';
  points: number;
  isOverseas: boolean;
  isValid: boolean;
  error?: string;
  isDuplicate?: boolean;
}

interface BulkPlayerImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (players: Omit<PlayerPoolEntry, 'lastUpdated' | 'updatedBy'>[]) => Promise<void>;
  existingPlayerIds: string[];
}

const BulkPlayerImportDialog: React.FC<BulkPlayerImportDialogProps> = ({
  open,
  onClose,
  onImport,
  existingPlayerIds,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [rawText, setRawText] = useState('');
  const [parsedPlayers, setParsedPlayers] = useState<ParsedPlayer[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  const steps = ['Paste Data', 'Preview & Validate', 'Confirm'];

  // Parse the pasted text into player objects
  const parsePlayerData = (text: string): ParsedPlayer[] => {
    const lines = text.trim().split('\n').map(line => line.trim()).filter(line => line);
    const players: ParsedPlayer[] = [];

    let currentTeam = '';
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Check if line is a team name (ends with colon)
      if (line.endsWith(':')) {
        currentTeam = line.slice(0, -1).trim();
        i++;
        continue;
      }

      // Skip role category headers (all caps lines)
      if (line.toUpperCase() === line && line.length > 3) {
        i++;
        continue;
      }

      // Parse player entry (3 lines: slug, name, role)
      if (i + 2 < lines.length) {
        const slug = lines[i];
        const name = lines[i + 1].replace(/\s*\(Captain\)|\(Vice[- ]Captain\)|\(WK\)/gi, '').trim();
        const roleText = lines[i + 2];

        // Map role text to role type
        let role: 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper' = 'batsman';
        let isValid = true;
        let errorMsg = '';

        if (roleText.toLowerCase().includes('batsman') || roleText.toLowerCase().includes('batter')) {
          role = 'batsman';
        } else if (roleText.toLowerCase().includes('allrounder') || roleText.toLowerCase().includes('all-rounder') || roleText.toLowerCase().includes('all rounder')) {
          role = 'allrounder';
        } else if (roleText.toLowerCase().includes('bowler')) {
          role = 'bowler';
        } else if (roleText.toLowerCase().includes('wk') || roleText.toLowerCase().includes('wicket')) {
          role = 'wicketkeeper';
        } else {
          isValid = false;
          errorMsg = `Unknown role: ${roleText}`;
        }

        // Validate required fields
        if (!slug || !name || !currentTeam) {
          isValid = false;
          errorMsg = 'Missing required fields (slug, name, or team)';
        }

        // Check for duplicates
        const isDuplicate = existingPlayerIds.includes(slug);

        players.push({
          playerId: slug,
          name,
          team: currentTeam,
          role,
          points: 0,
          isOverseas: false, // Default to false as per requirements
          isValid: isValid && !isDuplicate,
          error: isDuplicate ? 'Player already exists in pool' : errorMsg,
          isDuplicate,
        });

        i += 3;
      } else {
        i++;
      }
    }

    return players;
  };

  const handlePaste = () => {
    if (!rawText.trim()) {
      setError('Please paste player data');
      return;
    }

    try {
      const parsed = parsePlayerData(rawText);

      if (parsed.length === 0) {
        setError('No valid players found. Please check the format.');
        return;
      }

      setParsedPlayers(parsed);
      setActiveStep(1);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to parse player data');
    }
  };

  const handleRemovePlayer = (index: number) => {
    setParsedPlayers(prev => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    const validPlayers = parsedPlayers.filter(p => p.isValid);

    if (validPlayers.length === 0) {
      setError('No valid players to import');
      return;
    }

    try {
      setImporting(true);
      setError('');

      // Convert to PlayerPoolEntry format (without lastUpdated and updatedBy)
      const playersToImport = validPlayers.map(p => ({
        playerId: p.playerId,
        name: p.name,
        team: p.team,
        role: p.role,
        points: p.points,
        isOverseas: p.isOverseas,
      }));

      await onImport(playersToImport);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import players');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setRawText('');
    setParsedPlayers([]);
    setError('');
    onClose();
  };

  const validCount = parsedPlayers.filter(p => p.isValid).length;
  const duplicateCount = parsedPlayers.filter(p => p.isDuplicate).length;
  const invalidCount = parsedPlayers.filter(p => !p.isValid && !p.isDuplicate).length;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#0b0e1a',
          minHeight: '70vh',
        }
      }}
    >
      <DialogTitle sx={{
        background: 'linear-gradient(135deg, #0b133b 0%, #1E88E5 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <ContentPaste />
          <Typography variant="h6" fontWeight="bold">
            Bulk Import Players
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
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

        {/* Step 1: Paste Data */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Paste player data in the following format:
            </Typography>

            <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(30, 136, 229, 0.05)', border: '1px solid rgba(30, 136, 229, 0.2)' }}>
              <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
{`Team Name:
ROLE CATEGORY
player-slug
Player Name
Role Type

Example:
India:
BATTERS
suryakumar-yadav
Suryakumar Yadav (Captain)
Batsman

tilak-varma
Tilak Varma
Batsman`}
              </Typography>
            </Paper>

            <TextField
              multiline
              rows={15}
              fullWidth
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste your player data here..."
              sx={{
                '& .MuiInputBase-root': {
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                }
              }}
            />
          </Box>
        )}

        {/* Step 2: Preview & Validate */}
        {activeStep === 1 && (
          <Box>
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={<CheckCircle />}
                label={`${validCount} Valid`}
                color="success"
                size="small"
              />
              {duplicateCount > 0 && (
                <Chip
                  icon={<Warning />}
                  label={`${duplicateCount} Duplicates`}
                  color="warning"
                  size="small"
                />
              )}
              {invalidCount > 0 && (
                <Chip
                  icon={<Warning />}
                  label={`${invalidCount} Invalid`}
                  color="error"
                  size="small"
                />
              )}
            </Box>

            <TableContainer component={Paper} sx={{ maxHeight: '50vh' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Player ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Team</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsedPlayers.map((player, index) => (
                    <TableRow
                      key={index}
                      sx={{
                        bgcolor: !player.isValid ? 'rgba(244, 67, 54, 0.08)' : player.isDuplicate ? 'rgba(255, 152, 0, 0.08)' : 'transparent'
                      }}
                    >
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {player.playerId}
                      </TableCell>
                      <TableCell>{player.name}</TableCell>
                      <TableCell>{player.team}</TableCell>
                      <TableCell>
                        <Chip label={player.role} size="small" />
                      </TableCell>
                      <TableCell>
                        {player.isValid ? (
                          <Chip label="Valid" color="success" size="small" />
                        ) : (
                          <Chip
                            label={player.error || 'Invalid'}
                            color={player.isDuplicate ? 'warning' : 'error'}
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleRemovePlayer(index)}
                          color="error"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {duplicateCount > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {duplicateCount} player(s) already exist in the pool and will be skipped during import.
              </Alert>
            )}
          </Box>
        )}

        {/* Step 3: Confirm */}
        {activeStep === 2 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              You are about to import <strong>{validCount} player(s)</strong> to the player pool.
            </Alert>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Summary:
            </Typography>
            <Box sx={{ pl: 2 }}>
              <Typography variant="body2">• Total players: {parsedPlayers.length}</Typography>
              <Typography variant="body2" color="success.main">• Valid players: {validCount}</Typography>
              {duplicateCount > 0 && (
                <Typography variant="body2" color="warning.main">• Duplicates (skipped): {duplicateCount}</Typography>
              )}
              {invalidCount > 0 && (
                <Typography variant="body2" color="error.main">• Invalid (skipped): {invalidCount}</Typography>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {activeStep > 0 && (
          <Button onClick={() => setActiveStep(prev => prev - 1)} disabled={importing}>
            Back
          </Button>
        )}
        <Button onClick={handleClose} disabled={importing}>
          Cancel
        </Button>
        {activeStep === 0 && (
          <Button
            variant="contained"
            onClick={handlePaste}
            disabled={!rawText.trim()}
          >
            Parse Data
          </Button>
        )}
        {activeStep === 1 && (
          <Button
            variant="contained"
            onClick={() => setActiveStep(2)}
            disabled={validCount === 0}
          >
            Continue
          </Button>
        )}
        {activeStep === 2 && (
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={importing || validCount === 0}
            startIcon={!importing ? <CheckCircle /> : undefined}
          >
            {importing ? 'Importing...' : `Import ${validCount} Players`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BulkPlayerImportDialog;
