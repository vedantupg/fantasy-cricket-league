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
  Chip,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { Check, Close, Warning } from '@mui/icons-material';
import type { PlayerPoolEntry, BattingConfig, BowlingConfig, FieldingConfig } from '../types/database';
import { calculateBattingPoints, calculateBowlingPoints } from '../utils/pointsCalculation';

interface ParsedBattingPerformance {
  playerName: string;
  runs: number;
  balls: number;
  fours?: number;
  sixes?: number;
  pointsEarned: number;
  matchedPlayer?: PlayerPoolEntry;
}

interface ParsedBowlingPerformance {
  playerName: string;
  overs: number;
  runs: number;
  wickets: number;
  pointsEarned: number;
  matchedPlayer?: PlayerPoolEntry;
}

interface ParsedFieldingPerformance {
  playerName: string;
  catches: number;
  runOuts: number;
  stumpings: number;
  matchedPlayer?: PlayerPoolEntry;
}

interface ScorecardParserDialogProps {
  open: boolean;
  onClose: () => void;
  poolPlayers: PlayerPoolEntry[];
  battingConfig?: BattingConfig;
  bowlingConfig?: BowlingConfig;
  fieldingConfig?: FieldingConfig;
  onApplyUpdates: (
    updates: {
      playerId: string;
      pointsToAdd: number;
      performance: string;
      battingData?: { runs: number; balls: number };
      bowlingData?: { overs: number; runs: number; wickets: number };
    }[],
    matchLabel?: string
  ) => void;
}

const ScorecardParserDialog: React.FC<ScorecardParserDialogProps> = ({
  open,
  onClose,
  poolPlayers,
  battingConfig,
  bowlingConfig,
  fieldingConfig,
  onApplyUpdates,
}) => {
  const [scorecardText, setScorecardText] = useState('');
  const [parsedBatting, setParsedBatting] = useState<ParsedBattingPerformance[]>([]);
  const [parsedBowling, setParsedBowling] = useState<ParsedBowlingPerformance[]>([]);
  const [parsedFielding, setParsedFielding] = useState<ParsedFieldingPerformance[]>([]);
  const [includeFielding, setIncludeFielding] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [matchLabel, setMatchLabel] = useState('');

  // Smart player name matching with scoring system
  const findMatchingPlayer = (rawName: string): PlayerPoolEntry | undefined => {
    // Step 1: Clean the name - remove role indicators and special characters
    let cleanName = rawName
      .replace(/\s*\(c\)\s*/gi, ' ')       // Captain
      .replace(/\s*\(wk\)\s*/gi, ' ')      // Wicket keeper
      .replace(/\s*\(vc\)\s*/gi, ' ')      // Vice captain
      .replace(/†/g, '')                    // Wicket keeper symbol
      .replace(/\*/g, '')                   // Captain symbol
      .replace(/\s+/g, ' ')                 // Multiple spaces to single
      .trim();

    const normalized = cleanName.toLowerCase();

    // Step 2: Try exact match first (fastest path)
    const exactMatch = poolPlayers.find(p => p.name.toLowerCase() === normalized);
    if (exactMatch) return exactMatch;

    // Step 3: Calculate match scores for all players
    const inputParts = normalized.split(' ').filter(p => p.length > 0);
    if (inputParts.length === 0) return undefined;

    const inputFirst = inputParts[0];
    const inputLast = inputParts[inputParts.length - 1];

    const scores = poolPlayers.map(player => {
      const poolName = player.name.toLowerCase();
      const poolParts = poolName.split(' ').filter(p => p.length > 0);

      if (poolParts.length === 0) return { player, score: 0 };

      const poolFirst = poolParts[0];
      const poolLast = poolParts[poolParts.length - 1];

      let score = 0;

      // Exact match (already checked, but included for completeness)
      if (poolName === normalized) {
        score = 1000;
      }
      // Perfect match: First name AND last name both match exactly
      else if (inputFirst === poolFirst && inputLast === poolLast) {
        // Check if middle names/initials also match or are compatible
        if (inputParts.length === poolParts.length &&
            inputParts.every((part, idx) => part === poolParts[idx])) {
          score = 950; // All parts match in order
        } else if (inputParts.every(part => poolParts.includes(part))) {
          score = 900; // All input parts present in pool (handles reordering)
        } else {
          score = 850; // First and last match, middle names differ
        }
      }
      // Last name match + First name initial match (e.g., "H Kaur" matches "Harmanpreet Kaur")
      else if (inputLast === poolLast && inputFirst[0] === poolFirst[0]) {
        score = 700;
      }
      // First name match + Last name initial match (e.g., "Harmanpreet K" matches "Harmanpreet Kaur")
      else if (inputFirst === poolFirst && inputLast[0] === poolLast[0]) {
        score = 650;
      }
      // All input words found in pool name (handles middle names/initials)
      else if (inputParts.every(part =>
        poolParts.some(poolPart => poolPart.startsWith(part) || part.startsWith(poolPart))
      )) {
        score = 600;
      }
      // Last name exact match only (LOWER PRIORITY to avoid false positives like "Kaur")
      else if (inputLast === poolLast && inputLast.length > 3) {
        // Only consider if last name is reasonably unique (> 3 chars)
        // and there's some similarity in other parts
        const firstCharMatch = inputFirst[0] === poolFirst[0];
        if (firstCharMatch) {
          score = 400; // Some first name similarity
        } else {
          score = 100; // Only last name match - very low priority
        }
      }
      // First name exact match only
      else if (inputFirst === poolFirst) {
        score = 200;
      }
      // Substring match (one name is substring of the other)
      else if (poolName.includes(normalized) || normalized.includes(poolName)) {
        score = 300;
      }

      return { player, score };
    });

    // Step 4: Sort by score descending and get best match
    scores.sort((a, b) => b.score - a.score);

    const bestMatch = scores[0];

    // Step 5: Only return if score meets minimum threshold
    // Threshold of 400 ensures we need at least:
    // - First + Last name match, OR
    // - Last name + First initial match
    // This prevents false positives like "Amanjot Kaur" -> "Harmanpreet Kaur"
    const MIN_SCORE_THRESHOLD = 400;

    if (bestMatch && bestMatch.score >= MIN_SCORE_THRESHOLD) {
      return bestMatch.player;
    }

    return undefined;
  };

  const parseScorecardText = () => {
    setParsing(true);
    setError('');
    setParsedBatting([]);
    setParsedBowling([]);
    setParsedFielding([]);

    try {
      const lines = scorecardText.split('\n').map(l => l.trim()).filter(l => l);
      const batting: ParsedBattingPerformance[] = [];
      const bowling: ParsedBowlingPerformance[] = [];
      const fielding: ParsedFieldingPerformance[] = [];

      // Try to detect table format
      const hasTableHeaders = lines.some(line =>
        line.match(/^(Batter|Batsman)/i) ||
        line.match(/^Bowler/i)
      );

      if (hasTableHeaders) {
        // Parse table format
        parseTableFormat(lines, batting, bowling, fielding);
      } else {
        // Parse inline format
        parseInlineFormat(lines, batting, bowling, fielding);
      }

      if (batting.length === 0 && bowling.length === 0) {
        setError('No cricket statistics found. Please paste the scorecard text and try again.');
      } else {
        setParsedBatting(batting);
        setParsedBowling(bowling);
        setParsedFielding(fielding);
      }
    } catch (err: any) {
      console.error('Parse error:', err);
      setError(err.message || 'Failed to parse scorecard');
    } finally {
      setParsing(false);
    }
  };

  // Helper function to extract fielding credits from dismissal text
  const extractFieldingCredits = (dismissalText: string, fieldingMap: Map<string, ParsedFieldingPerformance>) => {
    if (!dismissalText) return;

    // Pattern for catches: "c Fielder b Bowler" or "c & b Bowler" or "c Fielder1/Fielder2 b Bowler"
    const catchPattern = /c\s+([^b]+?)\s+b\s+(.+?)(?:\s|$)/i;
    const catchMatch = dismissalText.match(catchPattern);

    if (catchMatch) {
      let fielderName = catchMatch[1].trim();
      const bowlerName = catchMatch[2].trim();

      // Handle "c & b" (caught and bowled) - bowler gets the catch
      if (fielderName === '&') {
        fielderName = bowlerName;
      } else {
        // Handle substitutes or multiple fielders (take first name)
        fielderName = fielderName.split('/')[0].trim();
        fielderName = fielderName.replace(/\(sub\)/gi, '').trim();
      }

      // Add or update fielder
      const existing = fieldingMap.get(fielderName.toLowerCase());
      if (existing) {
        existing.catches++;
      } else {
        const matchedPlayer = findMatchingPlayer(fielderName);
        fieldingMap.set(fielderName.toLowerCase(), {
          playerName: fielderName,
          catches: 1,
          runOuts: 0,
          stumpings: 0,
          matchedPlayer,
        });
      }
    }

    // Pattern for run outs: "run out (Fielder)" or "run out (Fielder1/Fielder2)"
    const runOutPattern = /run out\s*\(([^)]+)\)/i;
    const runOutMatch = dismissalText.match(runOutPattern);

    if (runOutMatch) {
      const fielders = runOutMatch[1].split('/').map(f => f.trim());

      // Credit each fielder involved in the run out
      fielders.forEach(fielderName => {
        fielderName = fielderName.replace(/\(sub\)/gi, '').trim();

        const existing = fieldingMap.get(fielderName.toLowerCase());
        if (existing) {
          existing.runOuts++;
        } else {
          const matchedPlayer = findMatchingPlayer(fielderName);
          fieldingMap.set(fielderName.toLowerCase(), {
            playerName: fielderName,
            catches: 0,
            runOuts: 1,
            stumpings: 0,
            matchedPlayer,
          });
        }
      });
    }

    // Pattern for stumpings: "st Keeper b Bowler"
    const stumpingPattern = /st\s+([^b]+?)\s+b\s+/i;
    const stumpingMatch = dismissalText.match(stumpingPattern);

    if (stumpingMatch) {
      let keeperName = stumpingMatch[1].trim();
      keeperName = keeperName.replace(/\(sub\)/gi, '').trim();

      const existing = fieldingMap.get(keeperName.toLowerCase());
      if (existing) {
        existing.stumpings++;
      } else {
        const matchedPlayer = findMatchingPlayer(keeperName);
        fieldingMap.set(keeperName.toLowerCase(), {
          playerName: keeperName,
          catches: 0,
          runOuts: 0,
          stumpings: 1,
          matchedPlayer,
        });
      }
    }
  };

  const parseTableFormat = (lines: string[], batting: ParsedBattingPerformance[], bowling: ParsedBowlingPerformance[], fielding: ParsedFieldingPerformance[]) => {
    let i = 0;

    // Known column headers to skip
    const battingColumnHeaders = /^(R|B|4s|6s|SR|Runs|Balls|Strike Rate|S\.R\.|M|Minutes)$/i;
    const bowlingColumnHeaders = /^(O|M|R|W|NB|WD|ECO|Overs|Maidens|Runs|Wickets|Economy|No Balls|Wides)$/i;

    // Track fielding performances
    const fieldingMap = new Map<string, ParsedFieldingPerformance>();

    while (i < lines.length) {
      const line = lines[i];

      // Check for batting table header
      if (line.match(/^(Batter|Batsman)/i)) {
        i++; // Skip header row

        // Skip column header rows (R, B, 4s, 6s, SR, etc.)
        while (i < lines.length && lines[i].match(battingColumnHeaders)) {
          i++;
        }

        // Parse batting rows
        while (i < lines.length) {
          // Stop if we hit a new section header
          if (lines[i].match(/^(Bowler|Bowling|Extras|Total)/i)) {
            break;
          }

          // Try to parse a batting entry
          // Format: Name, Dismissal (optional), R, B, 4s, 6s, SR
          const playerName = lines[i];
          if (!playerName || playerName.match(/^[\d.]+$/) || playerName.match(battingColumnHeaders)) {
            i++;
            continue;
          }

          i++;

          // Check if next line is dismissal info
          let dismissalLine = '';
          if (i < lines.length && !lines[i].match(/^\d+$/)) {
            dismissalLine = lines[i];
            i++;

            // Extract fielding credits from dismissal info
            extractFieldingCredits(dismissalLine, fieldingMap);
          }

          // Next lines should be: R, B, 4s, 6s, SR
          if (i + 4 < lines.length) {
            const runs = parseInt(lines[i++]);
            const balls = parseInt(lines[i++]);
            const fours = parseInt(lines[i++]);
            const sixes = parseInt(lines[i++]);
            i++; // Skip SR line, we calculate it ourselves

            if (!isNaN(runs) && !isNaN(balls) && battingConfig) {
              const pointsEarned = calculateBattingPoints(runs, balls, battingConfig);
              const matchedPlayer = findMatchingPlayer(playerName);

              batting.push({
                playerName,
                runs,
                balls,
                fours: isNaN(fours) ? 0 : fours,
                sixes: isNaN(sixes) ? 0 : sixes,
                pointsEarned,
                matchedPlayer,
              });
            }
          }
        }
      }

      // Check for bowling table header
      else if (line.match(/^Bowler/i)) {
        i++; // Skip header row

        // Skip column header rows (O, M, R, W, NB, WD, ECO, etc.)
        while (i < lines.length && lines[i].match(bowlingColumnHeaders)) {
          i++;
        }

        // Parse bowling rows
        while (i < lines.length) {
          // Stop if we hit a new section
          if (lines[i].match(/^(Batter|Batsman|Extras|Total)/i)) {
            break;
          }

          // Try to parse a bowling entry
          // Format: Name, O, M, R, W, NB, WD, ECO
          const playerName = lines[i];
          if (!playerName || playerName.match(/^[\d.]+$/) || playerName.match(bowlingColumnHeaders)) {
            i++;
            continue;
          }

          i++;

          // Next lines should be: O, M, R, W, NB, WD, ECO
          if (i + 6 < lines.length) {
            const overs = parseFloat(lines[i++]);
            i++; // Skip maidens
            const runs = parseInt(lines[i++]);
            const wickets = parseInt(lines[i++]);
            i++; // Skip no balls
            i++; // Skip wides
            i++; // Skip economy, we calculate it ourselves

            if (!isNaN(overs) && !isNaN(runs) && !isNaN(wickets) && bowlingConfig) {
              const pointsEarned = calculateBowlingPoints(overs, runs, wickets, bowlingConfig);
              const matchedPlayer = findMatchingPlayer(playerName);

              bowling.push({
                playerName,
                overs,
                runs,
                wickets,
                pointsEarned,
                matchedPlayer,
              });
            }
          }
        }
      } else {
        i++;
      }
    }

    // Convert fielding map to array
    fielding.push(...Array.from(fieldingMap.values()));
  };

  const parseInlineFormat = (lines: string[], batting: ParsedBattingPerformance[], bowling: ParsedBowlingPerformance[], fielding: ParsedFieldingPerformance[]) => {
    // Parse inline format (original logic)
    // Patterns to match:
    // "Player Name  45 (32)  [6x4, 2x6]"
    // "Player Name  not out  67 (45)  [8x4, 1x6]"
    // "Player Name  c Fielder b Bowler  34 (28)  [4x4, 1x6]"
    const battingPattern = /^([A-Za-z\s.'-]+?)\s+(c\s+[\w\s]+\s+b\s+[\w\s]+|b\s+[\w\s]+|lbw\s+b\s+[\w\s]+|run out\s*\([^)]+\)|st\s+[\w\s]+\s+b\s+[\w\s]+|not out|retired)?\s*(\d+)\s*\((\d+)\)(?:\s*\[(\d+)x4(?:,\s*(\d+)x6)?\])?/i;

    // Parse bowling performances
    // Patterns to match:
    // "Player Name  4-0-25-2"
    // "Player Name  3.5-0-30-1"
    const bowlingPattern = /^([A-Za-z\s.'-]+?)\s+([\d.]+)-(\d+)-(\d+)-(\d+)/i;

    // Track fielding performances
    const fieldingMap = new Map<string, ParsedFieldingPerformance>();

    for (const line of lines) {
      if (!line) continue;

      // Try batting pattern
      const battingMatch = line.match(battingPattern);
      if (battingMatch && battingConfig) {
        const playerName = battingMatch[1].trim();
        const dismissalInfo = battingMatch[2] || '';
        const runs = parseInt(battingMatch[3]);
        const balls = parseInt(battingMatch[4]);
        const fours = battingMatch[5] ? parseInt(battingMatch[5]) : 0;
        const sixes = battingMatch[6] ? parseInt(battingMatch[6]) : 0;

        // Extract fielding credits from dismissal info
        if (dismissalInfo) {
          extractFieldingCredits(dismissalInfo, fieldingMap);
        }

        const pointsEarned = calculateBattingPoints(runs, balls, battingConfig);

        const matchedPlayer = findMatchingPlayer(playerName);

        batting.push({
          playerName,
          runs,
          balls,
          fours,
          sixes,
          pointsEarned,
          matchedPlayer,
        });
        continue;
      }

      // Try bowling pattern
      const bowlingMatch = line.match(bowlingPattern);
      if (bowlingMatch && bowlingConfig) {
        const playerName = bowlingMatch[1].trim();
        const overs = parseFloat(bowlingMatch[2]);
        // bowlingMatch[3] is maidens - we don't use it
        const runs = parseInt(bowlingMatch[4]);
        const wickets = parseInt(bowlingMatch[5]);

        const pointsEarned = calculateBowlingPoints(overs, runs, wickets, bowlingConfig);

        const matchedPlayer = findMatchingPlayer(playerName);

        bowling.push({
          playerName,
          overs,
          runs,
          wickets,
          pointsEarned,
          matchedPlayer,
        });
      }
    }

    // Convert fielding map to array
    fielding.push(...Array.from(fieldingMap.values()));
  };

  const handleApply = () => {
    const updates: {
      playerId: string;
      pointsToAdd: number;
      performance: string;
      battingData?: { runs: number; balls: number };
      bowlingData?: { overs: number; runs: number; wickets: number };
    }[] = [];

    parsedBatting.forEach((perf) => {
      if (perf.matchedPlayer) {
        updates.push({
          playerId: perf.matchedPlayer.playerId,
          pointsToAdd: perf.pointsEarned,
          performance: `${perf.runs}(${perf.balls}) [${perf.fours || 0}x4, ${perf.sixes || 0}x6]`,
          battingData: { runs: perf.runs, balls: perf.balls },
        });
      }
    });

    parsedBowling.forEach((perf) => {
      if (perf.matchedPlayer) {
        const existing = updates.find(u => u.playerId === perf.matchedPlayer!.playerId);
        if (existing) {
          existing.pointsToAdd += perf.pointsEarned;
          existing.performance += `, ${perf.overs}-${perf.wickets}-${perf.runs}`;
          existing.bowlingData = { overs: perf.overs, runs: perf.runs, wickets: perf.wickets };
        } else {
          updates.push({
            playerId: perf.matchedPlayer.playerId,
            pointsToAdd: perf.pointsEarned,
            performance: `${perf.overs}-${perf.wickets}-${perf.runs}`,
            bowlingData: { overs: perf.overs, runs: perf.runs, wickets: perf.wickets },
          });
        }
      }
    });

    // Include fielding if enabled
    if (includeFielding) {
      // Use fielding config or default values
      const CATCH_POINTS = fieldingConfig?.catchPoints ?? 5;
      const RUNOUT_POINTS = fieldingConfig?.runOutPoints ?? 5;
      const STUMPING_POINTS = fieldingConfig?.stumpingPoints ?? 5;

      parsedFielding.forEach((perf) => {
        if (perf.matchedPlayer) {
          const existing = updates.find(u => u.playerId === perf.matchedPlayer!.playerId);
          const fieldingParts = [];

          // Calculate fielding points
          let fieldingPoints = 0;
          if (perf.catches > 0) {
            fieldingParts.push(`${perf.catches} catch${perf.catches > 1 ? 'es' : ''}`);
            fieldingPoints += perf.catches * CATCH_POINTS;
          }
          if (perf.runOuts > 0) {
            fieldingParts.push(`${perf.runOuts} run out${perf.runOuts > 1 ? 's' : ''}`);
            fieldingPoints += perf.runOuts * RUNOUT_POINTS;
          }
          if (perf.stumpings > 0) {
            fieldingParts.push(`${perf.stumpings} stumping${perf.stumpings > 1 ? 's' : ''}`);
            fieldingPoints += perf.stumpings * STUMPING_POINTS;
          }
          const fieldingStr = fieldingParts.join(', ');

          if (existing) {
            existing.performance += `, ${fieldingStr}`;
            existing.pointsToAdd += fieldingPoints;
          } else {
            updates.push({
              playerId: perf.matchedPlayer.playerId,
              pointsToAdd: fieldingPoints,
              performance: fieldingStr,
            });
          }
        }
      });
    }

    onApplyUpdates(updates, matchLabel.trim() || undefined);
    handleClose();
  };

  const handleClose = () => {
    setScorecardText('');
    setParsedBatting([]);
    setParsedBowling([]);
    setParsedFielding([]);
    setIncludeFielding(false);
    setError('');
    setMatchLabel('');
    onClose();
  };

  const totalMatched = parsedBatting.filter(p => p.matchedPlayer).length +
                        parsedBowling.filter(p => p.matchedPlayer).length +
                        parsedFielding.filter(p => p.matchedPlayer).length;
  const totalParsed = parsedBatting.length + parsedBowling.length + parsedFielding.length;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Quick Update from Scorecard</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Paste the scorecard text from Cricbuzz, ESPNCricinfo, or any cricket website.
            The parser will automatically extract batting, bowling, and fielding statistics (catches, run-outs, stumpings).
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={10}
            placeholder={`Supports both inline and table formats:

INLINE FORMAT:
Harmanpreet Kaur  c Smith b Ecclestone  45 (32)  [6x4, 2x6]
Sophie Ecclestone  4-0-25-2

TABLE FORMAT (copy from website):
Batter    R    B    4s   6s
Nat Sciver-Brunt
not out
65
43
9
1

Bowler    O    M    R    W
Sophie Ecclestone
4
0
25
2`}
            value={scorecardText}
            onChange={(e) => setScorecardText(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />

          <TextField
            fullWidth
            label="Match Label (Optional)"
            placeholder="e.g., Test 1 - Day 1, Match 5"
            value={matchLabel}
            onChange={(e) => setMatchLabel(e.target.value)}
            helperText="Label to identify this match in performance history. Also displayed on leaderboard."
            variant="outlined"
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            onClick={parseScorecardText}
            disabled={!scorecardText.trim() || parsing}
            fullWidth
          >
            {parsing ? <CircularProgress size={20} /> : 'Parse Scorecard'}
          </Button>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {!battingConfig && !bowlingConfig && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This player pool uses manual scoring mode. Points will need to be calculated manually.
            </Alert>
          )}

          {(parsedBatting.length > 0 || parsedBowling.length > 0) && (
            <Box sx={{ mt: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Parsed Performances ({totalMatched}/{totalParsed} matched)
                </Typography>
                {parsedFielding.length > 0 && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={includeFielding}
                        onChange={(e) => setIncludeFielding(e.target.checked)}
                        color="success"
                      />
                    }
                    label="Include Fielding Stats"
                  />
                )}
              </Box>

              {parsedBatting.length > 0 && (
                <>
                  <Typography variant="subtitle2" color="primary" sx={{ mt: 2, mb: 1 }}>
                    Batting
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Player</TableCell>
                          <TableCell align="center">Runs (Balls)</TableCell>
                          <TableCell align="center">4s/6s</TableCell>
                          <TableCell align="center">Points</TableCell>
                          <TableCell align="center">Match</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {parsedBatting.map((perf, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{perf.playerName}</TableCell>
                            <TableCell align="center">{perf.runs} ({perf.balls})</TableCell>
                            <TableCell align="center">{perf.fours || 0} / {perf.sixes || 0}</TableCell>
                            <TableCell align="center">
                              <Chip label={`+${perf.pointsEarned.toFixed(1)}`} size="small" color="success" />
                            </TableCell>
                            <TableCell align="center">
                              {perf.matchedPlayer ? (
                                <Chip icon={<Check />} label="Matched" size="small" color="success" />
                              ) : (
                                <Chip icon={<Warning />} label="Not Found" size="small" color="warning" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {parsedBowling.length > 0 && (
                <>
                  <Typography variant="subtitle2" color="secondary" sx={{ mt: 2, mb: 1 }}>
                    Bowling
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Player</TableCell>
                          <TableCell align="center">Overs</TableCell>
                          <TableCell align="center">Runs</TableCell>
                          <TableCell align="center">Wickets</TableCell>
                          <TableCell align="center">Points</TableCell>
                          <TableCell align="center">Match</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {parsedBowling.map((perf, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{perf.playerName}</TableCell>
                            <TableCell align="center">{perf.overs}</TableCell>
                            <TableCell align="center">{perf.runs}</TableCell>
                            <TableCell align="center">{perf.wickets}</TableCell>
                            <TableCell align="center">
                              <Chip label={`+${perf.pointsEarned.toFixed(1)}`} size="small" color="success" />
                            </TableCell>
                            <TableCell align="center">
                              {perf.matchedPlayer ? (
                                <Chip icon={<Check />} label="Matched" size="small" color="success" />
                              ) : (
                                <Chip icon={<Warning />} label="Not Found" size="small" color="warning" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {parsedFielding.length > 0 && (
                <>
                  <Typography variant="subtitle2" color="success" sx={{ mt: 2, mb: 1 }}>
                    Fielding
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Player</TableCell>
                          <TableCell align="center">Catches</TableCell>
                          <TableCell align="center">Run Outs</TableCell>
                          <TableCell align="center">Stumpings</TableCell>
                          <TableCell align="center">Match</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {parsedFielding.map((perf, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{perf.playerName}</TableCell>
                            <TableCell align="center">
                              {perf.catches > 0 ? (
                                <Chip label={perf.catches} size="small" color="info" />
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell align="center">
                              {perf.runOuts > 0 ? (
                                <Chip label={perf.runOuts} size="small" color="warning" />
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell align="center">
                              {perf.stumpings > 0 ? (
                                <Chip label={perf.stumpings} size="small" color="secondary" />
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell align="center">
                              {perf.matchedPlayer ? (
                                <Chip icon={<Check />} label="Matched" size="small" color="success" />
                              ) : (
                                <Chip icon={<Warning />} label="Not Found" size="small" color="warning" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {totalMatched === 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  No players were matched with your pool. Check player names and try again.
                </Alert>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} startIcon={<Close />}>
          Cancel
        </Button>
        <Button
          onClick={handleApply}
          variant="contained"
          color="primary"
          disabled={totalMatched === 0}
          startIcon={<Check />}
        >
          Apply Updates ({totalMatched} players)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScorecardParserDialog;
