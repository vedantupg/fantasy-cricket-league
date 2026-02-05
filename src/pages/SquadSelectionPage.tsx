import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Paper,
  IconButton,
  Chip,
  Grid,
  Alert,
  TextField,
  InputAdornment,
  useTheme,
  alpha
} from '@mui/material';
import {
  PersonAdd,
  Close,
  SwapHoriz,
  Star,
  Search
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppHeader from '../components/common/AppHeader';
import LeagueNav from '../components/common/LeagueNav';
import TransferModal, { TransferData } from '../components/squad/TransferModal';
import { playerPoolService, leagueService, squadService, squadPlayerUtils, leaderboardSnapshotService } from '../services/firestore';
import type { League, Player, SquadPlayer, LeagueSquad } from '../types/database';
import { deleteField } from 'firebase/firestore';
import { performAutoSlot } from '../utils/slotManagement';
import { calculatePlayerContribution as calculatePlayerContributionUtil, calculateSquadPoints as calculateSquadPointsUtil } from '../utils/pointsCalculation';
import themeColors from '../theme/colors';
import { formatMatchForDropdown } from '../utils/scheduleParser';
import EnhancedAlert, { SquadStatusItem, EnhancedAlertAction } from '../components/common/EnhancedAlert';

interface SelectedPlayer extends Player {
  position: 'regular' | 'bench';
  isOverseas: boolean;
}

const SquadSelectionPage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState<League | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);
  const [xFactorId, setXFactorId] = useState<string | null>(null);
  const [powerplayMatch, setPowerplayMatch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Enhanced error state
  const [enhancedError, setEnhancedError] = useState<{
    severity: 'error' | 'warning' | 'info';
    title: string;
    message: string;
    squadStatus?: SquadStatusItem[];
    suggestions?: string[];
    actions?: EnhancedAlertAction[];
    errorCode?: string;
    isCriticalError?: boolean;
  } | null>(null);

  const [existingSquad, setExistingSquad] = useState<LeagueSquad | null>(null);
  const [isDeadlinePassed, setIsDeadlinePassed] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [isLeagueStarted, setIsLeagueStarted] = useState(false);
  const [canMakeTransfer, setCanMakeTransfer] = useState(false);

  // Predictions state
  const [topRunScorer, setTopRunScorer] = useState('');
  const [topWicketTaker, setTopWicketTaker] = useState('');
  const [winningTeam, setWinningTeam] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadLeagueAndPlayers = async () => {
      if (!leagueId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Load league from Firestore
        const league = await leagueService.getById(leagueId);

        if (!league) {
          console.error('League not found');
          setLoading(false);
          return;
        }

        setLeague(league);

        // Check if deadline has passed
        const deadlinePassed = new Date() > new Date(league.squadDeadline);
        setIsDeadlinePassed(deadlinePassed);

        // Check if league has started
        const now = new Date();
        const leagueStarted = league.status === 'active' ||
                             league.tournamentStarted === true ||
                             now >= new Date(league.startDate);
        setIsLeagueStarted(leagueStarted);

        // Check if transfers can be made
        const isMidSeasonWindowOpen = !!(league.transferTypes?.midSeasonTransfers.enabled &&
          now >= new Date(league.transferTypes.midSeasonTransfers.windowStartDate) &&
          now <= new Date(league.transferTypes.midSeasonTransfers.windowEndDate));

        const transfersEnabled = !!(leagueStarted && (
          league.flexibleChangesEnabled === true ||
          league.benchChangesEnabled === true ||
          isMidSeasonWindowOpen
        ));
        setCanMakeTransfer(transfersEnabled);

        // Load existing squad if user has one
        if (user) {
          try {
            const userSquad = await squadService.getByUserAndLeague(user.uid, leagueId);
            setExistingSquad(userSquad);
          } catch (err) {
            setExistingSquad(null);
          }
        }

        // Fetch player pool if league has a playerPoolId
        if (league.playerPoolId) {
          try {
            const playerPool = await playerPoolService.getById(league.playerPoolId);

            if (playerPool && playerPool.players.length > 0) {
              // Convert PlayerPoolEntry to Player format with points included
              const playersFromPool = playerPool.players.map(entry => ({
                id: entry.playerId,
                name: entry.name,
                team: entry.team,
                country: 'India',
                role: entry.role,
                isActive: true,
                availability: 'available' as const,
                isOverseas: entry.isOverseas,
                stats: {
                  T20: { matches: 0, runs: 0, wickets: 0, economy: 0, strikeRate: 0, catches: 0, recentForm: entry.points },
                  ODI: { matches: 0, runs: 0, wickets: 0, economy: 0, strikeRate: 0, catches: 0, recentForm: entry.points },
                  Test: { matches: 0, runs: 0, wickets: 0, economy: 0, strikeRate: 0, catches: 0, recentForm: entry.points }
                },
                createdAt: new Date(),
                updatedAt: new Date()
              }));
              setAvailablePlayers(playersFromPool);
            } else {
              console.error('Player pool not found or empty');
              setAvailablePlayers([]);
            }
          } catch (error) {
            console.error('Error fetching player pool:', error);
            setAvailablePlayers([]);
          }
        } else {
          // No pool selected - show empty state
          setAvailablePlayers([]);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading league data:', error);
        setLoading(false);
      }
    };

    loadLeagueAndPlayers();
  }, [leagueId, user]);

  // Populate selectedPlayers from existing squad after players are loaded
  useEffect(() => {
    if (!existingSquad || !availablePlayers.length || !league) return;


    // Restore captain, vice-captain, and X-factor IDs
    setCaptainId(existingSquad.captainId || null);
    setViceCaptainId(existingSquad.viceCaptainId || null);
    setXFactorId(existingSquad.xFactorId || null);

    // Load powerplay match number if it exists
    if (existingSquad.powerplayMatchNumber) {
      setPowerplayMatch(existingSquad.powerplayMatchNumber.toString());
    }

    // Load predictions if they exist
    if (existingSquad.predictions) {
      setTopRunScorer(existingSquad.predictions.topRunScorer || '');
      setTopWicketTaker(existingSquad.predictions.topWicketTaker || '');
      setWinningTeam(existingSquad.predictions.winningTeam || '');
    }

    // Convert SquadPlayer[] to SelectedPlayer[]
    const squadPlayers: SelectedPlayer[] = existingSquad.players.map((squadPlayer, index) => {
      // Find the full player data from availablePlayers
      const fullPlayer = availablePlayers.find(p => p.id === squadPlayer.playerId);

      if (!fullPlayer) {
        // If player not found in pool, create a basic player object
        return {
          id: squadPlayer.playerId,
          name: squadPlayer.playerName,
          team: squadPlayer.team,
          country: 'India',
          role: squadPlayer.role,
          isActive: true,
          availability: 'available' as const,
          isOverseas: false, // Default to false if player not found in pool
          stats: {
            T20: { matches: 0, runs: 0, wickets: 0, economy: 0, strikeRate: 0, catches: 0, recentForm: squadPlayer.points },
            ODI: { matches: 0, runs: 0, wickets: 0, economy: 0, strikeRate: 0, catches: 0, recentForm: squadPlayer.points },
            Test: { matches: 0, runs: 0, wickets: 0, economy: 0, strikeRate: 0, catches: 0, recentForm: squadPlayer.points }
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          position: index >= league.squadSize ? 'bench' : 'regular'
        };
      }

      // Determine position (only regular or bench)
      const position: 'regular' | 'bench' = index >= league.squadSize ? 'bench' : 'regular';

      return {
        ...fullPlayer,
        isOverseas: fullPlayer.isOverseas ?? false, // Ensure isOverseas is always a boolean
        position
      };
    });

    setSelectedPlayers(squadPlayers);
  }, [existingSquad, availablePlayers, league]);

  const getPositionCounts = () => {
    const counts = {
      batsman: selectedPlayers.filter(p => p.role === 'batsman' && p.position !== 'bench').length,
      bowler: selectedPlayers.filter(p => p.role === 'bowler' && p.position !== 'bench').length,
      allrounder: selectedPlayers.filter(p => p.role === 'allrounder' && p.position !== 'bench').length,
      wicketkeeper: selectedPlayers.filter(p => p.role === 'wicketkeeper' && p.position !== 'bench').length,
      bench: selectedPlayers.filter(p => p.position === 'bench').length,
    };
    return counts;
  };

  const isSquadValid = () => {
    if (!league) return false;
    const counts = getPositionCounts();
    const mainSquadCount = counts.batsman + counts.bowler + counts.allrounder + counts.wicketkeeper;
    const benchRequired = league.transferTypes?.benchTransfers?.enabled ? league.transferTypes.benchTransfers.benchSlots : 0;

    // Check overseas player limit if enabled
    let overseasValid = true;
    if (league.squadRules.overseasPlayersEnabled) {
      const mainSquadPlayers = selectedPlayers.filter(p => p.position !== 'bench');
      const overseasCount = mainSquadPlayers.filter((p: any) => p.isOverseas).length;
      const maxOverseas = league.squadRules.maxOverseasPlayers || 4;
      overseasValid = overseasCount <= maxOverseas;
    }

    // Check powerplay match selection if powerplay is enabled
    let powerplayValid = true;
    if (league.powerplayEnabled) {
      powerplayValid = powerplayMatch.trim() !== '';
    }

    return mainSquadCount === league.squadSize &&
           counts.batsman >= league.squadRules.minBatsmen &&
           counts.bowler >= league.squadRules.minBowlers &&
           counts.wicketkeeper >= league.squadRules.minWicketkeepers &&
           counts.bench >= benchRequired &&
           overseasValid &&
           powerplayValid &&
           captainId !== null &&
           viceCaptainId !== null &&
           xFactorId !== null &&
           captainId !== viceCaptainId &&
           captainId !== xFactorId &&
           viceCaptainId !== xFactorId &&
           topRunScorer.trim() !== '' &&
           topWicketTaker.trim() !== '' &&
           winningTeam.trim() !== '';
  };

  // Get detailed validation errors for enhanced error display
  const getDetailedValidationErrors = (): {
    squadStatus: SquadStatusItem[];
    suggestions: string[];
    isValid: boolean;
  } => {
    if (!league) return { squadStatus: [], suggestions: [], isValid: false };

    const counts = getPositionCounts();
    const mainSquadCount = counts.batsman + counts.bowler + counts.allrounder + counts.wicketkeeper;
    const benchRequired = league.transferTypes?.benchTransfers?.enabled ? league.transferTypes.benchTransfers.benchSlots : 0;

    const mainSquadPlayers = selectedPlayers.filter(p => p.position !== 'bench');
    const overseasCount = mainSquadPlayers.filter((p: any) => p.isOverseas).length;
    const maxOverseas = league.squadRules.maxOverseasPlayers || 4;

    const squadStatus: SquadStatusItem[] = [
      {
        label: 'Main Squad',
        current: mainSquadCount,
        required: league.squadSize,
        isValid: mainSquadCount === league.squadSize
      },
      {
        label: 'Batsmen',
        current: counts.batsman,
        required: league.squadRules.minBatsmen,
        isValid: counts.batsman >= league.squadRules.minBatsmen
      },
      {
        label: 'Bowlers',
        current: counts.bowler,
        required: league.squadRules.minBowlers,
        isValid: counts.bowler >= league.squadRules.minBowlers
      },
      {
        label: 'Wicketkeepers',
        current: counts.wicketkeeper,
        required: league.squadRules.minWicketkeepers,
        isValid: counts.wicketkeeper >= league.squadRules.minWicketkeepers
      }
    ];

    if (benchRequired > 0) {
      squadStatus.push({
        label: 'Bench',
        current: counts.bench,
        required: benchRequired,
        isValid: counts.bench >= benchRequired
      });
    }

    if (league.squadRules.overseasPlayersEnabled) {
      squadStatus.push({
        label: 'Overseas',
        current: overseasCount,
        required: maxOverseas,
        isValid: overseasCount <= maxOverseas
      });
    }

    // Build suggestions
    const suggestions: string[] = [];

    if (mainSquadCount < league.squadSize) {
      suggestions.push(`Add ${league.squadSize - mainSquadCount} more player${league.squadSize - mainSquadCount > 1 ? 's' : ''} to main squad`);
    } else if (mainSquadCount > league.squadSize) {
      suggestions.push(`Remove ${mainSquadCount - league.squadSize} player${mainSquadCount - league.squadSize > 1 ? 's' : ''} from main squad or move to bench`);
    }

    if (counts.batsman < league.squadRules.minBatsmen) {
      suggestions.push(`Add ${league.squadRules.minBatsmen - counts.batsman} more batsmen`);
    }

    if (counts.bowler < league.squadRules.minBowlers) {
      suggestions.push(`Add ${league.squadRules.minBowlers - counts.bowler} more bowler${league.squadRules.minBowlers - counts.bowler > 1 ? 's' : ''}`);
    }

    if (counts.wicketkeeper < league.squadRules.minWicketkeepers) {
      suggestions.push(`Add ${league.squadRules.minWicketkeepers - counts.wicketkeeper} more wicketkeeper${league.squadRules.minWicketkeepers - counts.wicketkeeper > 1 ? 's' : ''}`);
    }

    if (benchRequired > 0 && counts.bench < benchRequired) {
      suggestions.push(`Add ${benchRequired - counts.bench} more bench player${benchRequired - counts.bench > 1 ? 's' : ''}`);
    }

    if (league.squadRules.overseasPlayersEnabled && overseasCount > maxOverseas) {
      suggestions.push(`Remove ${overseasCount - maxOverseas} overseas player${overseasCount - maxOverseas > 1 ? 's' : ''} or replace with local player${overseasCount - maxOverseas > 1 ? 's' : ''}`);
    }

    if (!captainId) {
      suggestions.push('Select a Captain');
    }

    if (!viceCaptainId) {
      suggestions.push('Select a Vice-Captain');
    }

    if (!xFactorId) {
      suggestions.push('Select an X-Factor');
    }

    if (league.powerplayEnabled && powerplayMatch.trim() === '') {
      suggestions.push('Select a Powerplay match');
    }

    if (topRunScorer.trim() === '') {
      suggestions.push('Enter your Top Run Scorer prediction');
    }

    if (topWicketTaker.trim() === '') {
      suggestions.push('Enter your Top Wicket Taker prediction');
    }

    if (winningTeam.trim() === '') {
      suggestions.push('Enter your Winning Team prediction');
    }

    return {
      squadStatus,
      suggestions,
      isValid: isSquadValid()
    };
  };

  // Use shared calculation utility for consistency across the app
  const calculateSquadPoints = (
    players: SquadPlayer[],
    captainId: string | null,
    viceCaptainId: string | null,
    xFactorId: string | null,
    bankedPoints: number = 0
  ): { totalPoints: number; captainPoints: number; viceCaptainPoints: number; xFactorPoints: number } => {
    const squadSize = league?.squadSize || 11;
    return calculateSquadPointsUtil(
      players,
      squadSize,
      captainId || undefined,
      viceCaptainId || undefined,
      xFactorId || undefined,
      bankedPoints
    );
  };

  const handleSubmitSquad = async () => {
    if (!user || !league || !leagueId) return;

    // Show detailed validation errors if squad is not valid
    if (!isSquadValid()) {
      const validationResult = getDetailedValidationErrors();
      setEnhancedError({
        severity: 'error',
        title: 'Cannot Submit Squad',
        message: 'Your squad doesn\'t meet the requirements. Please fix the issues below:',
        squadStatus: validationResult.squadStatus,
        suggestions: validationResult.suggestions
      });
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError('');
      setEnhancedError(null);

      // Sort players: main squad first, then bench
      // This ensures consistent order for loading
      const sortedPlayers = [
        ...selectedPlayers.filter(p => p.position !== 'bench'),
        ...selectedPlayers.filter(p => p.position === 'bench')
      ];

      // Convert selected players to SquadPlayer format using utility function
      const squadPlayers: SquadPlayer[] = sortedPlayers.map(player => {
        const squadPlayer = squadPlayerUtils.createInitialSquadPlayer({
          playerId: player.id,
          playerName: player.name,
          team: player.team,
          role: player.role,
          points: player.stats[league.format].recentForm || 0, // Use current points from stats
        });

        // Set pointsWhenRoleAssigned for C/VC/X at squad creation
        if (player.id === captainId || player.id === viceCaptainId || player.id === xFactorId) {
          squadPlayer.pointsWhenRoleAssigned = squadPlayer.points;
        }

        return squadPlayer;
      });

      // Calculate total points based on current player points and multipliers
      const calculatedPoints = calculateSquadPoints(squadPlayers, captainId, viceCaptainId, xFactorId);

      // Check if squad already exists
      const existingSquad = await squadService.getByUserAndLeague(user.uid, leagueId);

      if (existingSquad) {
        // Update existing squad
        const updateData: any = {
          players: squadPlayers,
          captainId: captainId || undefined,
          viceCaptainId: viceCaptainId || undefined,
          xFactorId: xFactorId || undefined,
          totalPoints: calculatedPoints.totalPoints,
          captainPoints: calculatedPoints.captainPoints,
          viceCaptainPoints: calculatedPoints.viceCaptainPoints,
          xFactorPoints: calculatedPoints.xFactorPoints,
          powerplayMatchNumber: powerplayMatch ? parseInt(powerplayMatch) : undefined,
          predictions: {
            topRunScorer: topRunScorer.trim(),
            topWicketTaker: topWicketTaker.trim(),
            winningTeam: winningTeam.trim(),
          },
          isSubmitted: true,
          lastUpdated: new Date(),
        };

        // Only set submittedAt if not already submitted
        if (!existingSquad.isSubmitted) {
          updateData.submittedAt = new Date();
        }

        await squadService.update(existingSquad.id, updateData);

        // Update local state to reflect the changes
        setExistingSquad({
          ...existingSquad,
          ...updateData
        });
      } else {
        // Create new squad
        const squadData: any = {
          userId: user.uid,
          leagueId: leagueId,
          squadName: user.displayName || 'User',
          players: squadPlayers,
          isSubmitted: true,
          submittedAt: new Date(),
          totalPoints: calculatedPoints.totalPoints,
          captainPoints: calculatedPoints.captainPoints,
          viceCaptainPoints: calculatedPoints.viceCaptainPoints,
          xFactorPoints: calculatedPoints.xFactorPoints,
          powerplayMatchNumber: powerplayMatch ? parseInt(powerplayMatch) : undefined,
          predictions: {
            topRunScorer: topRunScorer.trim(),
            topWicketTaker: topWicketTaker.trim(),
            winningTeam: winningTeam.trim(),
          },
          rank: 0,
          matchPoints: {},
          transfersUsed: 0,
          benchTransfersUsed: 0,
          flexibleTransfersUsed: 0,
          midSeasonTransfersUsed: 0,
          transferHistory: [],
          bankedPoints: 0, // Initialize banked points to 0
          isValid: true,
          validationErrors: [],
          captainId: captainId || undefined,
          viceCaptainId: viceCaptainId || undefined,
          xFactorId: xFactorId || undefined,
        };

        const squadId = await squadService.create(squadData);

        // Update local state with the newly created squad
        setExistingSquad({
          ...squadData,
          id: squadId,
          createdAt: new Date()
        });
      }

      // Create/update leaderboard snapshot for this league
      try {
        await leaderboardSnapshotService.create(leagueId);
      } catch (snapshotError) {
        console.error('Error creating leaderboard snapshot:', snapshotError);
        // Don't fail the submission if snapshot creation fails
      }

      // Navigate to league dashboard
      navigate(`/leagues/${leagueId}`);
    } catch (error: any) {
      console.error('Error submitting squad:', error);

      // Check if it's a network/connection error
      const isNetworkError = error.code === 'unavailable' || error.message?.toLowerCase().includes('network') || error.message?.toLowerCase().includes('connection');

      setEnhancedError({
        severity: 'error',
        title: isNetworkError ? 'Connection Error' : 'Failed to Submit Squad',
        message: isNetworkError
          ? 'We couldn\'t save your squad due to a network issue.'
          : 'An error occurred while submitting your squad.',
        suggestions: isNetworkError
          ? [
              'Check your internet connection',
              'Try again in a moment',
              'Your squad data is safe - just resubmit when ready'
            ]
          : [
              'Try submitting again',
              'If the problem persists, contact the league admin',
              'Your progress has been saved as a draft'
            ],
        actions: [
          {
            label: 'Try Again',
            onClick: () => {
              setEnhancedError(null);
              handleSubmitSquad();
            },
            variant: 'contained',
            color: 'primary'
          },
          {
            label: 'Save Draft Instead',
            onClick: () => {
              setEnhancedError(null);
              handleSaveDraft();
            },
            variant: 'outlined'
          }
        ]
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!user || !league || !leagueId) return;

    // Require at least one player to save draft
    if (selectedPlayers.length === 0) {
      setSubmitError('Please select at least one player before saving draft');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError('');

      // Sort players: main squad first, then bench
      const sortedPlayers = [
        ...selectedPlayers.filter(p => p.position !== 'bench'),
        ...selectedPlayers.filter(p => p.position === 'bench')
      ];

      // Convert selected players to SquadPlayer format
      const squadPlayers: SquadPlayer[] = sortedPlayers.map(player => {
        const squadPlayer = squadPlayerUtils.createInitialSquadPlayer({
          playerId: player.id,
          playerName: player.name,
          team: player.team,
          role: player.role,
          points: player.stats[league.format].recentForm || 0,
        });

        // Set pointsWhenRoleAssigned for C/VC/X if assigned
        if (player.id === captainId || player.id === viceCaptainId || player.id === xFactorId) {
          squadPlayer.pointsWhenRoleAssigned = squadPlayer.points;
        }

        return squadPlayer;
      });

      // Calculate points (even if squad is incomplete)
      const calculatedPoints = calculateSquadPoints(squadPlayers, captainId, viceCaptainId, xFactorId);

      // Check if squad already exists
      const existingSquad = await squadService.getByUserAndLeague(user.uid, leagueId);

      if (existingSquad) {
        // Update existing draft
        await squadService.update(existingSquad.id, {
          players: squadPlayers,
          captainId: captainId || undefined,
          viceCaptainId: viceCaptainId || undefined,
          xFactorId: xFactorId || undefined,
          totalPoints: calculatedPoints.totalPoints,
          captainPoints: calculatedPoints.captainPoints,
          viceCaptainPoints: calculatedPoints.viceCaptainPoints,
          xFactorPoints: calculatedPoints.xFactorPoints,
          powerplayMatchNumber: powerplayMatch ? parseInt(powerplayMatch) : undefined,
          predictions: {
            topRunScorer: topRunScorer.trim(),
            topWicketTaker: topWicketTaker.trim(),
            winningTeam: winningTeam.trim(),
          },
          isSubmitted: false, // Keep as draft
          lastUpdated: new Date(),
        });

        setExistingSquad({
          ...existingSquad,
          players: squadPlayers,
          captainId: captainId || undefined,
          viceCaptainId: viceCaptainId || undefined,
          xFactorId: xFactorId || undefined,
          totalPoints: calculatedPoints.totalPoints,
          isSubmitted: false,
        });

        setSubmitError(''); // Clear any errors
        alert('✅ Draft saved successfully! You can continue editing or submit when ready.');
      } else {
        // Create new draft
        const squadData: any = {
          userId: user.uid,
          leagueId: leagueId,
          squadName: user.displayName || 'User',
          players: squadPlayers,
          isSubmitted: false, // Save as draft
          totalPoints: calculatedPoints.totalPoints,
          captainPoints: calculatedPoints.captainPoints,
          viceCaptainPoints: calculatedPoints.viceCaptainPoints,
          xFactorPoints: calculatedPoints.xFactorPoints,
          powerplayMatchNumber: powerplayMatch ? parseInt(powerplayMatch) : undefined,
          predictions: {
            topRunScorer: topRunScorer.trim(),
            topWicketTaker: topWicketTaker.trim(),
            winningTeam: winningTeam.trim(),
          },
          rank: 0,
          matchPoints: {},
          transfersUsed: 0,
          benchTransfersUsed: 0,
          flexibleTransfersUsed: 0,
          midSeasonTransfersUsed: 0,
          transferHistory: [],
          bankedPoints: 0,
          isValid: false, // Draft may not be valid yet
          validationErrors: [],
          captainId: captainId || undefined,
          viceCaptainId: viceCaptainId || undefined,
          xFactorId: xFactorId || undefined,
        };

        const squadId = await squadService.create(squadData);

        setExistingSquad({
          ...squadData,
          id: squadId,
          createdAt: new Date()
        });

        setSubmitError(''); // Clear any errors
        alert('✅ Draft saved successfully! You can continue editing or submit when ready.');
      }
    } catch (error: any) {
      console.error('Error saving draft:', error);
      setSubmitError(error.message || 'Failed to save draft');
    } finally {
      setSubmitting(false);
    }
  };

  // Use shared utility for calculating player contribution
  // This ensures consistency across transfers and pool updates
  const calculatePlayerContribution = calculatePlayerContributionUtil;

  const handleTransferSubmit = async (transferData: TransferData) => {
    if (!user || !league || !leagueId || !existingSquad) return;

    try {
      // CRITICAL: Create a DEEP copy of players array to avoid mutating original objects
      // Shallow copy [...array] only copies the array, not the objects inside!
      let updatedPlayers: SquadPlayer[] = existingSquad.players.map(player => {
        const playerCopy: SquadPlayer = {
          ...player,
          // Preserve all fields including optional ones
          pointsAtJoining: player.pointsAtJoining ?? 0,
        };

        // CRITICAL: Always preserve pointsWhenRoleAssigned if it exists
        // NEVER automatically set it - it should only be set when role is FIRST assigned
        if (player.pointsWhenRoleAssigned !== undefined) {
          playerCopy.pointsWhenRoleAssigned = player.pointsWhenRoleAssigned;
        }
        // DO NOT auto-set for missing values - admin must fix via admin panel

        return playerCopy;
      });
      let updatedCaptainId = existingSquad.captainId;
      let updatedViceCaptainId = existingSquad.viceCaptainId;
      let updatedXFactorId = existingSquad.xFactorId;
      let additionalBankedPoints = 0; // Track points to bank from this transfer

      // Process the transfer based on change type
      if (transferData.changeType === 'playerSubstitution' && transferData.playerOut && transferData.playerIn) {
        if (transferData.transferType === 'bench') {
          // BENCH TRANSFER: Swap a main squad player with a bench player
          const playerOutIndex = updatedPlayers.findIndex(p => p.playerId === transferData.playerOut);
          const playerInIndex = updatedPlayers.findIndex(p => p.playerId === transferData.playerIn);

          if (playerOutIndex === -1) {
            throw new Error('Transfer failed: The player you want to remove is no longer in your squad. Please refresh and try again.');
          }
          if (playerInIndex === -1) {
            throw new Error('Transfer failed: The bench player is no longer available. Please refresh and try again.');
          }

          // Calculate points to bank from the player moving to bench
          const playerMovingToBench = updatedPlayers[playerOutIndex];
          let playerRole: 'captain' | 'viceCaptain' | 'xFactor' | 'regular' = 'regular';
          if (playerMovingToBench.playerId === existingSquad.captainId) playerRole = 'captain';
          else if (playerMovingToBench.playerId === existingSquad.viceCaptainId) playerRole = 'viceCaptain';
          else if (playerMovingToBench.playerId === existingSquad.xFactorId) playerRole = 'xFactor';


          additionalBankedPoints = calculatePlayerContribution(playerMovingToBench, playerRole);

          // Swap the players - simple array swap
          const temp = updatedPlayers[playerOutIndex];
          updatedPlayers[playerOutIndex] = updatedPlayers[playerInIndex];
          updatedPlayers[playerInIndex] = temp;

          // CRITICAL FIX: Reset pointsAtJoining for bench player moving to main squad
          // This ensures their contribution starts at 0, preventing immediate point changes
          const playerMovingToMain = updatedPlayers[playerOutIndex];
          playerMovingToMain.pointsAtJoining = playerMovingToMain.points;

          // AUTO-ASSIGN roles to incoming player if swapping out C/VC/X
          const incomingPlayerId = transferData.playerIn;

          if (transferData.playerOut === existingSquad.captainId) {
            // Incoming player becomes Captain
            // Check if incoming player already has a role (VC or X) - if so, old Captain takes that role (SWAP)
            if (incomingPlayerId === existingSquad.viceCaptainId) {
              // Incoming player is current VC → Swap: incoming becomes C, old C becomes VC
              updatedViceCaptainId = existingSquad.captainId;
            } else if (incomingPlayerId === existingSquad.xFactorId) {
              // Incoming player is current X-Factor → Swap: incoming becomes C, old C becomes X
              updatedXFactorId = existingSquad.captainId;
            } else {
              // Incoming player has no role → Just assign Captain (old Captain loses role)
            }

            updatedCaptainId = incomingPlayerId;
            const newCaptain = updatedPlayers.find(p => p.playerId === incomingPlayerId);
            if (newCaptain) {
              // CRITICAL: Reset BOTH baselines when assigning role
              newCaptain.pointsAtJoining = newCaptain.points;
              newCaptain.pointsWhenRoleAssigned = newCaptain.points;
            }

            // Reset baselines for old Captain (now on bench with new role or no role)
            const oldCaptain = updatedPlayers.find(p => p.playerId === existingSquad.captainId);
            if (oldCaptain) {
              oldCaptain.pointsAtJoining = oldCaptain.points;
              oldCaptain.pointsWhenRoleAssigned = oldCaptain.points;
            }
          }

          if (transferData.playerOut === existingSquad.viceCaptainId) {
            // Incoming player becomes Vice-Captain
            // Check if incoming player already has a role (C or X) - if so, old VC takes that role (SWAP)
            if (incomingPlayerId === existingSquad.captainId) {
              // Incoming player is current C → Swap: incoming becomes VC, old VC becomes C
              updatedCaptainId = existingSquad.viceCaptainId;
            } else if (incomingPlayerId === existingSquad.xFactorId) {
              // Incoming player is current X-Factor → Swap: incoming becomes VC, old VC becomes X
              updatedXFactorId = existingSquad.viceCaptainId;
            } else {
              // Incoming player has no role → Just assign VC (old VC loses role)
            }

            updatedViceCaptainId = incomingPlayerId;
            const newVC = updatedPlayers.find(p => p.playerId === incomingPlayerId);
            if (newVC) {
              // CRITICAL: Reset BOTH baselines when assigning role
              newVC.pointsAtJoining = newVC.points;
              newVC.pointsWhenRoleAssigned = newVC.points;
            }

            // Reset baselines for old VC (now on bench with new role or no role)
            const oldVC = updatedPlayers.find(p => p.playerId === existingSquad.viceCaptainId);
            if (oldVC) {
              oldVC.pointsAtJoining = oldVC.points;
              oldVC.pointsWhenRoleAssigned = oldVC.points;
            }
          }

          if (transferData.playerOut === existingSquad.xFactorId) {
            // Incoming player becomes X-Factor
            // Check if incoming player already has a role (C or VC) - if so, old X takes that role (SWAP)
            if (incomingPlayerId === existingSquad.captainId) {
              // Incoming player is current C → Swap: incoming becomes X, old X becomes C
              updatedCaptainId = existingSquad.xFactorId;
            } else if (incomingPlayerId === existingSquad.viceCaptainId) {
              // Incoming player is current VC → Swap: incoming becomes X, old X becomes VC
              updatedViceCaptainId = existingSquad.xFactorId;
            } else {
              // Incoming player has no role → Just assign X (old X loses role)
            }

            updatedXFactorId = incomingPlayerId;
            const newX = updatedPlayers.find(p => p.playerId === incomingPlayerId);
            if (newX) {
              // CRITICAL: Reset BOTH baselines when assigning role
              newX.pointsAtJoining = newX.points;
              newX.pointsWhenRoleAssigned = newX.points;
            }

            // Reset baselines for old X-Factor (now on bench with new role or no role)
            const oldX = updatedPlayers.find(p => p.playerId === existingSquad.xFactorId);
            if (oldX) {
              oldX.pointsAtJoining = oldX.points;
              oldX.pointsWhenRoleAssigned = oldX.points;
            }
          }
        } else {
          // FLEXIBLE/MID-SEASON TRANSFER: Replace with a player from pool OR bench
          const playerOutIndex = updatedPlayers.findIndex(p => p.playerId === transferData.playerOut);
          if (playerOutIndex === -1) {
            throw new Error('Transfer failed: The player you want to remove is no longer in your squad. Please refresh and try again.');
          }

          // Check if incoming player is from bench
          const benchPlayerIds = updatedPlayers.slice(league.squadSize).map(p => p.playerId);
          const isIncomingPlayerFromBench = benchPlayerIds.includes(transferData.playerIn);

          if (isIncomingPlayerFromBench) {
            // BENCH PLAYER TO MAIN SQUAD: Use auto-slotting to place bench player, remove from bench
            const playerInIndex = updatedPlayers.findIndex(p => p.playerId === transferData.playerIn);
            if (playerInIndex === -1) {
              throw new Error('Transfer failed: The bench player is no longer available. Please refresh and try again.');
            }

            // Calculate points to bank from the player leaving the squad
            const playerLeaving = updatedPlayers[playerOutIndex];
            let playerRole: 'captain' | 'viceCaptain' | 'xFactor' | 'regular' = 'regular';
            if (playerLeaving.playerId === existingSquad.captainId) playerRole = 'captain';
            else if (playerLeaving.playerId === existingSquad.viceCaptainId) playerRole = 'viceCaptain';
            else if (playerLeaving.playerId === existingSquad.xFactorId) playerRole = 'xFactor';

            additionalBankedPoints = calculatePlayerContribution(playerLeaving, playerRole);

            // Get the bench player to be promoted
            const benchPlayer = updatedPlayers[playerInIndex];

            // CRITICAL FIX: Reset pointsAtJoining for bench player being promoted
            // This ensures their contribution starts at 0, preventing immediate point changes
            benchPlayer.pointsAtJoining = benchPlayer.points;

            // Separate main squad and bench
            const mainSquad = updatedPlayers.slice(0, league.squadSize);
            const benchSection = updatedPlayers.slice(league.squadSize);

            // Remove the promoted player from bench
            const updatedBench = benchSection.filter(p => p.playerId !== transferData.playerIn);

            // Use auto-slotting algorithm on main squad only
            const updatedMainSquad = performAutoSlot(
              mainSquad,
              transferData.playerOut,
              benchPlayer,
              league
            );

            // Combine updated main squad with updated bench
            updatedPlayers = [...updatedMainSquad, ...updatedBench];

            // AUTO-ASSIGN roles if the outgoing player had C/VC/X
            if (playerRole === 'captain') {
              updatedCaptainId = benchPlayer.playerId;
              // CRITICAL: Reset BOTH baselines when assigning role
              benchPlayer.pointsAtJoining = benchPlayer.points;
              benchPlayer.pointsWhenRoleAssigned = benchPlayer.points;
            } else if (playerRole === 'viceCaptain') {
              updatedViceCaptainId = benchPlayer.playerId;
              // CRITICAL: Reset BOTH baselines when assigning role
              benchPlayer.pointsAtJoining = benchPlayer.points;
              benchPlayer.pointsWhenRoleAssigned = benchPlayer.points;
            } else if (playerRole === 'xFactor') {
              updatedXFactorId = benchPlayer.playerId;
              // CRITICAL: Reset BOTH baselines when assigning role
              benchPlayer.pointsAtJoining = benchPlayer.points;
              benchPlayer.pointsWhenRoleAssigned = benchPlayer.points;
            }
          } else {
            // POOL PLAYER: Replace with a new player from outside the squad
            // Calculate points to bank from the player leaving the squad
            const playerLeaving = updatedPlayers[playerOutIndex];
            let playerRole: 'captain' | 'viceCaptain' | 'xFactor' | 'regular' = 'regular';
            if (playerLeaving.playerId === existingSquad.captainId) playerRole = 'captain';
            else if (playerLeaving.playerId === existingSquad.viceCaptainId) playerRole = 'viceCaptain';
            else if (playerLeaving.playerId === existingSquad.xFactorId) playerRole = 'xFactor';

            additionalBankedPoints = calculatePlayerContribution(playerLeaving, playerRole);

            // Get the full player data for the incoming player
            const incomingPlayer = availablePlayers.find(p => p.id === transferData.playerIn);
            if (!incomingPlayer) {
              throw new Error('Transfer failed: The player you selected is no longer available. Please refresh and try again.');
            }

            // Create new squad player using transfer method (snapshots current points)
            const newSquadPlayer = squadPlayerUtils.createTransferSquadPlayer({
              playerId: incomingPlayer.id,
              playerName: incomingPlayer.name,
              team: incomingPlayer.team,
              role: incomingPlayer.role,
              points: incomingPlayer.stats[league.format].recentForm || 0,
              isOverseas: incomingPlayer.isOverseas,
            });

            // Use auto-slotting algorithm to intelligently place the new player
            updatedPlayers = performAutoSlot(
              updatedPlayers,
              transferData.playerOut,
              newSquadPlayer,
              league
            );

            // AUTO-ASSIGN roles if the outgoing player had C/VC/X
            if (playerRole === 'captain') {
              updatedCaptainId = newSquadPlayer.playerId;
              // CRITICAL: Reset BOTH baselines when assigning role (even though createTransferSquadPlayer already set pointsAtJoining)
              newSquadPlayer.pointsAtJoining = newSquadPlayer.points;
              newSquadPlayer.pointsWhenRoleAssigned = newSquadPlayer.points;
            } else if (playerRole === 'viceCaptain') {
              updatedViceCaptainId = newSquadPlayer.playerId;
              // CRITICAL: Reset BOTH baselines when assigning role
              newSquadPlayer.pointsAtJoining = newSquadPlayer.points;
              newSquadPlayer.pointsWhenRoleAssigned = newSquadPlayer.points;
            } else if (playerRole === 'xFactor') {
              updatedXFactorId = newSquadPlayer.playerId;
              // CRITICAL: Reset BOTH baselines when assigning role
              newSquadPlayer.pointsAtJoining = newSquadPlayer.points;
              newSquadPlayer.pointsWhenRoleAssigned = newSquadPlayer.points;
            }
          }
        }
      } else if (transferData.changeType === 'roleReassignment') {
        /**
         * ═══════════════════════════════════════════════════════════════════════════
         * ROLE REASSIGNMENT WITH AUTOMATIC SWAPPING
         * ═══════════════════════════════════════════════════════════════════════════
         *
         * CRITICAL INVARIANT FOR ALL ROLE CHANGES:
         * ─────────────────────────────────────────
         * ANY time a player's role changes (C/VC/X/regular), we MUST:
         *
         * 1️⃣ Bank old role contribution:
         *    bankedPoints += (currentPoints - pointsWhenRoleAssigned) × oldMultiplier
         *
         * 2️⃣ Update role assignment:
         *    player.role = newRole (via updatedCaptainId/updatedViceCaptainId/updatedXFactorId)
         *
         * 3️⃣ RESET BOTH BASELINES (NO EXCEPTIONS):
         *    player.pointsAtJoining = currentPoints
         *    player.pointsWhenRoleAssigned = currentPoints
         *
         *    ⚠️ CRITICAL: Must reset BOTH fields to prevent basePoints leak!
         *    If we only reset pointsWhenRoleAssigned, the calculation will still count
         *    (pointsWhenRoleAssigned - pointsAtJoining) as basePoints at 1x multiplier,
         *    causing phantom points to appear in the total.
         *
         * This ensures:
         * ✅ Past contributions are preserved in bankedPoints
         * ✅ Future points get the NEW role multiplier
         * ✅ Total points remain stable (teamTotal_before === teamTotal_after)
         * ✅ No basePoints leak from old pointsAtJoining values
         *
         * No exceptions. No special cases. Every role change gets this treatment.
         * ═══════════════════════════════════════════════════════════════════════════
         */

        // ═══ CAPTAIN REASSIGNMENT ═══
        if (transferData.newCaptainId && transferData.newCaptainId !== existingSquad.captainId) {
          // STEP 1: Bank old Captain's contribution (if they exist)
          if (existingSquad.captainId) {
            const oldCaptain = updatedPlayers.find(p => p.playerId === existingSquad.captainId);
            if (oldCaptain) {
              const captainContribution = calculatePlayerContribution(oldCaptain, 'captain');
              additionalBankedPoints += captainContribution;

              // STEP 2: Reset old Captain's baseline (they're losing Captain role)
              // CRITICAL: Reset BOTH pointsAtJoining AND pointsWhenRoleAssigned to prevent basePoints leak
              oldCaptain.pointsAtJoining = oldCaptain.points;
              oldCaptain.pointsWhenRoleAssigned = oldCaptain.points;
            }
          }

          // STEP 3: Check if new Captain currently has another role (VC or X-Factor)
          // If yes, bank that role's contribution too
          if (transferData.newCaptainId === existingSquad.viceCaptainId) {
            // New Captain is current VC → Bank VC contribution, then old Captain becomes VC
            const playerBecomingCaptain = updatedPlayers.find(p => p.playerId === transferData.newCaptainId);
            if (playerBecomingCaptain) {
              const vcContribution = calculatePlayerContribution(playerBecomingCaptain, 'viceCaptain');
              additionalBankedPoints += vcContribution;
            }

            // Old Captain gets the VC role
            if (existingSquad.captainId) {
              updatedViceCaptainId = existingSquad.captainId;
            }
          } else if (transferData.newCaptainId === existingSquad.xFactorId) {
            // New Captain is current X-Factor → Bank X-Factor contribution, then old Captain becomes X-Factor
            const playerBecomingCaptain = updatedPlayers.find(p => p.playerId === transferData.newCaptainId);
            if (playerBecomingCaptain) {
              const xContribution = calculatePlayerContribution(playerBecomingCaptain, 'xFactor');
              additionalBankedPoints += xContribution;
            }

            // Old Captain gets the X-Factor role
            if (existingSquad.captainId) {
              updatedXFactorId = existingSquad.captainId;
            }
          }
          // If new Captain has NO role, old Captain just loses Captain role (no swap needed)

          // STEP 4: Assign new Captain and ALWAYS reset baseline
          const newCaptain = updatedPlayers.find(p => p.playerId === transferData.newCaptainId);
          if (newCaptain) {
            // CRITICAL: Reset BOTH to ensure zero contribution until new points are earned
            newCaptain.pointsAtJoining = newCaptain.points;
            newCaptain.pointsWhenRoleAssigned = newCaptain.points;
          }

          updatedCaptainId = transferData.newCaptainId;
        }

        // ═══ VICE-CAPTAIN REASSIGNMENT ═══
        if (transferData.newViceCaptainId && transferData.newViceCaptainId !== existingSquad.viceCaptainId) {
          // STEP 1: Bank old VC's contribution (if they exist)
          if (existingSquad.viceCaptainId) {
            const oldVC = updatedPlayers.find(p => p.playerId === existingSquad.viceCaptainId);
            if (oldVC) {
              const vcContribution = calculatePlayerContribution(oldVC, 'viceCaptain');
              additionalBankedPoints += vcContribution;

              // STEP 2: Reset old VC's baseline (they're losing VC role)
              // CRITICAL: Reset BOTH pointsAtJoining AND pointsWhenRoleAssigned to prevent basePoints leak
              oldVC.pointsAtJoining = oldVC.points;
              oldVC.pointsWhenRoleAssigned = oldVC.points;
            }
          }

          // STEP 3: Check if new VC currently has another role (Captain or X-Factor)
          if (transferData.newViceCaptainId === existingSquad.captainId) {
            // New VC is current Captain → Bank Captain contribution, then old VC becomes Captain
            const playerBecomingVC = updatedPlayers.find(p => p.playerId === transferData.newViceCaptainId);
            if (playerBecomingVC) {
              const captainContribution = calculatePlayerContribution(playerBecomingVC, 'captain');
              additionalBankedPoints += captainContribution;
            }

            // Old VC gets the Captain role
            if (existingSquad.viceCaptainId) {
              updatedCaptainId = existingSquad.viceCaptainId;
            }
          } else if (transferData.newViceCaptainId === existingSquad.xFactorId) {
            // New VC is current X-Factor → Bank X-Factor contribution, then old VC becomes X-Factor
            const playerBecomingVC = updatedPlayers.find(p => p.playerId === transferData.newViceCaptainId);
            if (playerBecomingVC) {
              const xContribution = calculatePlayerContribution(playerBecomingVC, 'xFactor');
              additionalBankedPoints += xContribution;
            }

            // Old VC gets the X-Factor role
            if (existingSquad.viceCaptainId) {
              updatedXFactorId = existingSquad.viceCaptainId;
            }
          }
          // If new VC has NO role, old VC just loses VC role (no swap needed)

          // STEP 4: Assign new VC and ALWAYS reset baseline
          const newVC = updatedPlayers.find(p => p.playerId === transferData.newViceCaptainId);
          if (newVC) {
            // CRITICAL: Reset BOTH to ensure zero contribution until new points are earned
            newVC.pointsAtJoining = newVC.points;
            newVC.pointsWhenRoleAssigned = newVC.points;
          }

          updatedViceCaptainId = transferData.newViceCaptainId;
        }

        // ═══ X-FACTOR REASSIGNMENT ═══
        if (transferData.newXFactorId && transferData.newXFactorId !== existingSquad.xFactorId) {
          // STEP 1: Bank old X-Factor's contribution (if they exist)
          if (existingSquad.xFactorId) {
            const oldX = updatedPlayers.find(p => p.playerId === existingSquad.xFactorId);
            if (oldX) {
              const xContribution = calculatePlayerContribution(oldX, 'xFactor');
              additionalBankedPoints += xContribution;

              // STEP 2: Reset old X-Factor's baseline (they're losing X-Factor role)
              // CRITICAL: Reset BOTH pointsAtJoining AND pointsWhenRoleAssigned to prevent basePoints leak
              oldX.pointsAtJoining = oldX.points;
              oldX.pointsWhenRoleAssigned = oldX.points;
            }
          }

          // STEP 3: Check if new X-Factor currently has another role (Captain or VC)
          if (transferData.newXFactorId === existingSquad.captainId) {
            // New X-Factor is current Captain → Bank Captain contribution, then old X-Factor becomes Captain
            const playerBecomingX = updatedPlayers.find(p => p.playerId === transferData.newXFactorId);
            if (playerBecomingX) {
              const captainContribution = calculatePlayerContribution(playerBecomingX, 'captain');
              additionalBankedPoints += captainContribution;
            }

            // Old X-Factor gets the Captain role
            if (existingSquad.xFactorId) {
              updatedCaptainId = existingSquad.xFactorId;
            }
          } else if (transferData.newXFactorId === existingSquad.viceCaptainId) {
            // New X-Factor is current VC → Bank VC contribution, then old X-Factor becomes VC
            const playerBecomingX = updatedPlayers.find(p => p.playerId === transferData.newXFactorId);
            if (playerBecomingX) {
              const vcContribution = calculatePlayerContribution(playerBecomingX, 'viceCaptain');
              additionalBankedPoints += vcContribution;
            }

            // Old X-Factor gets the VC role
            if (existingSquad.xFactorId) {
              updatedViceCaptainId = existingSquad.xFactorId;
            }
          }
          // If new X-Factor has NO role, old X-Factor just loses X-Factor role (no swap needed)

          // STEP 4: Assign new X-Factor and ALWAYS reset baseline
          const newX = updatedPlayers.find(p => p.playerId === transferData.newXFactorId);
          if (newX) {
            // CRITICAL: Reset BOTH to ensure zero contribution until new points are earned
            newX.pointsAtJoining = newX.points;
            newX.pointsWhenRoleAssigned = newX.points;
          }

          updatedXFactorId = transferData.newXFactorId;
        }
      }

      // VALIDATION: Check if the transfer maintains minimum squad requirements
      // Only validate for player substitutions (not role reassignments)
      if (transferData.changeType === 'playerSubstitution') {
        const mainSquad = updatedPlayers.slice(0, league.squadSize);
        const roleCounts = {
          batsman: mainSquad.filter(p => p.role === 'batsman').length,
          bowler: mainSquad.filter(p => p.role === 'bowler').length,
          allrounder: mainSquad.filter(p => p.role === 'allrounder').length,
          wicketkeeper: mainSquad.filter(p => p.role === 'wicketkeeper').length
        };

        const violations: string[] = [];

        if (roleCounts.batsman < league.squadRules.minBatsmen) {
          violations.push(`This transfer would leave you with only ${roleCounts.batsman} batsman${roleCounts.batsman !== 1 ? 's' : ''} (minimum ${league.squadRules.minBatsmen} required)`);
        }
        if (roleCounts.bowler < league.squadRules.minBowlers) {
          violations.push(`This transfer would leave you with only ${roleCounts.bowler} bowler${roleCounts.bowler !== 1 ? 's' : ''} (minimum ${league.squadRules.minBowlers} required)`);
        }
        if (roleCounts.allrounder < league.squadRules.minAllrounders) {
          violations.push(`This transfer would leave you with only ${roleCounts.allrounder} allrounder${roleCounts.allrounder !== 1 ? 's' : ''} (minimum ${league.squadRules.minAllrounders} required)`);
        }
        if (roleCounts.wicketkeeper < league.squadRules.minWicketkeepers) {
          violations.push(`This transfer would leave you with only ${roleCounts.wicketkeeper} wicketkeeper${roleCounts.wicketkeeper !== 1 ? 's' : ''} (minimum ${league.squadRules.minWicketkeepers} required)`);
        }

        // Check overseas player limit if enabled
        if (league.squadRules.overseasPlayersEnabled) {
          const overseasCount = mainSquad.filter((p: any) => p.isOverseas).length;
          const maxOverseas = league.squadRules.maxOverseasPlayers || 4;
          if (overseasCount > maxOverseas) {
            violations.push(`This transfer would give you ${overseasCount} overseas players (maximum ${maxOverseas} allowed)`);
          }
        }

        if (violations.length > 0) {
          throw new Error(violations.join('. '));
        }
      }

      // Calculate new banked points total
      const newBankedPoints = (existingSquad.bankedPoints || 0) + additionalBankedPoints;

      // ENHANCEMENT: Create pre-transfer snapshot for rollback capability
      const preTransferSnapshot = {
        players: JSON.parse(JSON.stringify(existingSquad.players)), // Deep copy
        captainId: existingSquad.captainId || null,
        viceCaptainId: existingSquad.viceCaptainId || null,
        xFactorId: existingSquad.xFactorId || null,
        bankedPoints: existingSquad.bankedPoints || 0,
        totalPoints: 0, // Will be calculated below
        timestamp: new Date(),
      };

      // Calculate OLD points for verification (before changes)
      const oldCalculatedPoints = calculateSquadPoints(
        existingSquad.players,
        existingSquad.captainId || null,
        existingSquad.viceCaptainId || null,
        existingSquad.xFactorId || null,
        existingSquad.bankedPoints || 0
      );

      // Store total points in snapshot
      preTransferSnapshot.totalPoints = oldCalculatedPoints.totalPoints;

      // Calculate new points (including banked points)
      const calculatedPoints = calculateSquadPoints(
        updatedPlayers,
        updatedCaptainId || null,
        updatedViceCaptainId || null,
        updatedXFactorId || null,
        newBankedPoints
      );


      // CRITICAL VALIDATION: For bench transfers, points should be stable
      if (transferData.transferType === 'bench') {
        const pointsDifference = Math.abs(calculatedPoints.totalPoints - oldCalculatedPoints.totalPoints);
        // Increased tolerance to 1.0 to account for floating-point rounding
        if (pointsDifference > 1.0) {
          console.error('🚨 BENCH TRANSFER POINT STABILITY VIOLATION 🚨');
          console.error(`Old Total: ${oldCalculatedPoints.totalPoints}`);
          console.error(`New Total: ${calculatedPoints.totalPoints}`);
          console.error(`Difference: ${calculatedPoints.totalPoints - oldCalculatedPoints.totalPoints}`);
          console.error(`Old Banked: ${existingSquad.bankedPoints || 0}`);
          console.error(`New Banked: ${newBankedPoints}`);
          console.error(`Additional Banked: ${additionalBankedPoints}`);
          console.error('Player Out:', transferData.playerOut);
          console.error('Player In:', transferData.playerIn);

          // Log detailed player breakdown
          console.error('Starting XI after transfer:');
          const startingXI = updatedPlayers.slice(0, league.squadSize);
          startingXI.forEach((p, idx) => {
            console.error(`  ${idx + 1}. ${p.playerName}: points=${p.points}, atJoining=${p.pointsAtJoining}, whenRole=${p.pointsWhenRoleAssigned}`);
          });

          throw new Error(
            `SYSTEM_ERROR:POINT_STABILITY:A point calculation error was detected. Your squad has not been changed. Please contact the league admin with error code PT-001.`
          );
        }
      }

      // CRITICAL VALIDATION: For role reassignments, points should also be stable
      // Role swaps should only move points between banked/active, not change total
      if (transferData.changeType === 'roleReassignment') {
        const pointsDifference = Math.abs(calculatedPoints.totalPoints - oldCalculatedPoints.totalPoints);
        // Increased tolerance to 1.0 to account for floating-point rounding
        if (pointsDifference > 1.0) {
          console.error('🚨 ROLE REASSIGNMENT POINT STABILITY VIOLATION 🚨');
          console.error(`Old Total: ${oldCalculatedPoints.totalPoints}`);
          console.error(`New Total: ${calculatedPoints.totalPoints}`);
          console.error(`Difference: ${calculatedPoints.totalPoints - oldCalculatedPoints.totalPoints}`);
          console.error(`Old Banked: ${existingSquad.bankedPoints || 0}`);
          console.error(`New Banked: ${newBankedPoints}`);
          console.error(`Additional Banked: ${additionalBankedPoints}`);
          console.error('Old Captain:', existingSquad.captainId);
          console.error('New Captain:', transferData.newCaptainId);
          console.error('Old VC:', existingSquad.viceCaptainId);
          console.error('New VC:', transferData.newViceCaptainId);
          console.error('Old X-Factor:', existingSquad.xFactorId);
          console.error('New X-Factor:', transferData.newXFactorId);

          // Log detailed role breakdown
          console.error('Role changes:');
          const oldC = existingSquad.players.find(p => p.playerId === existingSquad.captainId);
          const oldVC = existingSquad.players.find(p => p.playerId === existingSquad.viceCaptainId);
          const oldX = existingSquad.players.find(p => p.playerId === existingSquad.xFactorId);
          const newC = updatedPlayers.find(p => p.playerId === updatedCaptainId);
          const newVC = updatedPlayers.find(p => p.playerId === updatedViceCaptainId);
          const newX = updatedPlayers.find(p => p.playerId === updatedXFactorId);

          console.error(`  Old C: ${oldC?.playerName} (pts=${oldC?.points}, whenRole=${oldC?.pointsWhenRoleAssigned})`);
          console.error(`  New C: ${newC?.playerName} (pts=${newC?.points}, whenRole=${newC?.pointsWhenRoleAssigned})`);
          console.error(`  Old VC: ${oldVC?.playerName} (pts=${oldVC?.points}, whenRole=${oldVC?.pointsWhenRoleAssigned})`);
          console.error(`  New VC: ${newVC?.playerName} (pts=${newVC?.points}, whenRole=${newVC?.pointsWhenRoleAssigned})`);
          console.error(`  Old X: ${oldX?.playerName} (pts=${oldX?.points}, whenRole=${oldX?.pointsWhenRoleAssigned})`);
          console.error(`  New X: ${newX?.playerName} (pts=${newX?.points}, whenRole=${newX?.pointsWhenRoleAssigned})`);

          throw new Error(
            `SYSTEM_ERROR:ROLE_REASSIGNMENT:A role banking error was detected. Your squad has not been changed. Please contact the league admin with error code PT-002.`
          );
        }
      }

      // Create transfer history entry (only include defined values)
      const transferHistoryEntry: any = {
        timestamp: new Date(),
        transferType: transferData.transferType,
        changeType: transferData.changeType,
      };

      // Only add fields that have values (avoid undefined)
      if (transferData.playerOut) transferHistoryEntry.playerOut = transferData.playerOut;
      if (transferData.playerIn) transferHistoryEntry.playerIn = transferData.playerIn;
      if (transferData.newViceCaptainId) transferHistoryEntry.newViceCaptainId = transferData.newViceCaptainId;
      if (transferData.newXFactorId) transferHistoryEntry.newXFactorId = transferData.newXFactorId;

      // ENHANCEMENT #2: Add banking amount tracking (Added 2026-02-03)
      transferHistoryEntry.bankedAmount = additionalBankedPoints;
      transferHistoryEntry.totalBankedAfter = newBankedPoints;
      transferHistoryEntry.pointsBefore = oldCalculatedPoints.totalPoints;
      transferHistoryEntry.pointsAfter = calculatedPoints.totalPoints;

      // ENHANCEMENT #3: Add pre-transfer snapshot for rollback (Added 2026-02-03)
      transferHistoryEntry.preTransferSnapshot = preTransferSnapshot;


      // CRITICAL: Clean up players array before saving to Firebase
      // Firebase strips undefined fields, so we need to ensure all fields are defined
      const cleanedPlayers = updatedPlayers.map(player => {
        const cleanPlayer: any = {
          playerId: player.playerId,
          playerName: player.playerName,
          team: player.team,
          role: player.role,
          points: player.points,
          pointsAtJoining: player.pointsAtJoining ?? 0,
        };

        // Only include pointsWhenRoleAssigned if it's defined
        if (player.pointsWhenRoleAssigned !== undefined) {
          cleanPlayer.pointsWhenRoleAssigned = player.pointsWhenRoleAssigned;
        }

        // Include isOverseas property if defined
        if (player.isOverseas !== undefined) {
          cleanPlayer.isOverseas = player.isOverseas;
        }

        return cleanPlayer;
      });

      // Update the squad
      const updatePayload: any = {
        players: cleanedPlayers,
        totalPoints: calculatedPoints.totalPoints,
        captainPoints: calculatedPoints.captainPoints,
        viceCaptainPoints: calculatedPoints.viceCaptainPoints,
        xFactorPoints: calculatedPoints.xFactorPoints,
        bankedPoints: newBankedPoints,
        transfersUsed: (existingSquad.transfersUsed || 0) + 1,
        // Increment the specific transfer counter based on type
        benchTransfersUsed: transferData.transferType === 'bench'
          ? (existingSquad.benchTransfersUsed || 0) + 1
          : (existingSquad.benchTransfersUsed || 0),
        flexibleTransfersUsed: transferData.transferType === 'flexible'
          ? (existingSquad.flexibleTransfersUsed || 0) + 1
          : (existingSquad.flexibleTransfersUsed || 0),
        midSeasonTransfersUsed: transferData.transferType === 'midSeason'
          ? (existingSquad.midSeasonTransfersUsed || 0) + 1
          : (existingSquad.midSeasonTransfersUsed || 0),
        transferHistory: [...(existingSquad.transferHistory || []), transferHistoryEntry],
        lastUpdated: new Date()
      };

      // Handle Captain, VC and X-Factor updates
      if (updatedCaptainId) {
        updatePayload.captainId = updatedCaptainId;
      }

      if (updatedViceCaptainId === 'DELETE') {
        updatePayload.viceCaptainId = deleteField();
      } else if (updatedViceCaptainId) {
        updatePayload.viceCaptainId = updatedViceCaptainId;
      }

      if (updatedXFactorId === 'DELETE') {
        updatePayload.xFactorId = deleteField();
      } else if (updatedXFactorId) {
        updatePayload.xFactorId = updatedXFactorId;
      }

      await squadService.update(existingSquad.id, updatePayload);

      // Reload the squad
      const updatedSquad = await squadService.getByUserAndLeague(user.uid, leagueId);
      setExistingSquad(updatedSquad);

      // Update leaderboard snapshot
      try {
        await leaderboardSnapshotService.create(leagueId);
      } catch (snapshotError) {
        console.error('Error creating leaderboard snapshot:', snapshotError);
      }

      // Show success message
      setSubmitError('');
      setEnhancedError(null);
    } catch (error: any) {
      console.error('Error submitting transfer:', error);

      // Check if it's a critical system error
      const errorMessage = error.message || '';
      const isCriticalError = errorMessage.startsWith('SYSTEM_ERROR:');

      if (isCriticalError) {
        // Parse the error: SYSTEM_ERROR:ERROR_TYPE:User message
        const parts = errorMessage.split(':');
        const errorCode = parts[1] || 'UNKNOWN';
        const userMessage = parts.slice(2).join(':') || 'A system error occurred. Please contact the admin.';

        setEnhancedError({
          severity: 'error',
          title: 'System Error Detected',
          message: userMessage,
          suggestions: [
            'Your squad has not been changed',
            'This error has been logged for the admin',
            'Try refreshing the page'
          ],
          errorCode,
          isCriticalError: true
        });
        return; // Don't re-throw, we've handled it
      }

      // For other errors, re-throw to let the modal handle it
      throw error;
    }
  };

  const addPlayerToSquad = (player: Player, targetPosition: 'regular' | 'bench') => {
    if (!league) return;

    const benchRequired = league.transferTypes?.benchTransfers?.enabled ? league.transferTypes.benchTransfers.benchSlots : 0;

    // Use functional setState to ensure we check against the LATEST state
    setSelectedPlayers(prev => {
      // Check if player is already selected (using latest state) - CRITICAL for preventing duplicates/stacking
      const existingPlayer = prev.find(p => p.id === player.id);
      if (existingPlayer) {
        console.warn(`Player ${player.name} is already in the squad at position ${existingPlayer.position}`);
        setSubmitError(`${player.name} is already selected`);
        setTimeout(() => setSubmitError(''), 3000);
        return prev; // Don't add duplicate
      }

      // Calculate current counts from LATEST state
      const currentMainSquad = prev.filter(p => p.position !== 'bench').length;
      const currentBench = prev.filter(p => p.position === 'bench').length;

      // Validate squad limits with latest state
      if (targetPosition === 'bench') {
        if (currentBench >= benchRequired) {
          setSubmitError(`Maximum ${benchRequired} bench players allowed`);
          setTimeout(() => setSubmitError(''), 3000);
          return prev; // Don't add, return unchanged state
        }
      } else {
        if (currentMainSquad >= league.squadSize) {
          setSubmitError(`Maximum ${league.squadSize} main squad players allowed (excluding bench)`);
          setTimeout(() => setSubmitError(''), 3000);
          return prev; // Don't add, return unchanged state
        }

        // Check if there's an available slot for this specific role
        // This prevents the issue where players stack in the same slot
        const mainSquadPlayers = prev.filter(p => p.position !== 'bench');

        // Count players of each role
        const roleCounts = {
          batsman: mainSquadPlayers.filter(p => p.role === 'batsman').length,
          bowler: mainSquadPlayers.filter(p => p.role === 'bowler').length,
          allrounder: mainSquadPlayers.filter(p => p.role === 'allrounder').length,
          wicketkeeper: mainSquadPlayers.filter(p => p.role === 'wicketkeeper').length
        };

        const role = player.role as 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';
        const minRequired = league.squadRules[
          role === 'batsman' ? 'minBatsmen' :
          role === 'bowler' ? 'minBowlers' :
          role === 'allrounder' ? 'minAllrounders' :
          'minWicketkeepers'
        ];

        // Check if there's space in required slots for this role
        const hasRequiredSlot = roleCounts[role] < minRequired;

        // Calculate how many flexible slots are available
        const totalRequiredSlots = league.squadRules.minBatsmen + league.squadRules.minBowlers +
                                   league.squadRules.minAllrounders + league.squadRules.minWicketkeepers;
        const totalFlexibleSlots = league.squadSize - totalRequiredSlots;

        // Count how many players are currently occupying flexible slots
        const playersInFlexible =
          Math.max(0, roleCounts.batsman - league.squadRules.minBatsmen) +
          Math.max(0, roleCounts.bowler - league.squadRules.minBowlers) +
          Math.max(0, roleCounts.allrounder - league.squadRules.minAllrounders) +
          Math.max(0, roleCounts.wicketkeeper - league.squadRules.minWicketkeepers);

        const hasFlexibleSlot = playersInFlexible < totalFlexibleSlots;

        // Player must have either a required slot OR a flexible slot available
        if (!hasRequiredSlot && !hasFlexibleSlot) {
          const roleDisplayName = role === 'batsman' ? 'batter' : role;
          setSubmitError(`No available slot for this ${roleDisplayName}. Fill required positions first or free up flexible slots.`);
          setTimeout(() => setSubmitError(''), 3000);
          return prev;
        }
      }

      // All validations passed, add the player
      const newPlayer: SelectedPlayer = { ...player, isOverseas: player.isOverseas ?? false, position: targetPosition };
      return [...prev, newPlayer];
    });
  };

  const removePlayerFromSquad = (playerId: string) => {
    // Clear special roles if this player had any
    if (captainId === playerId) setCaptainId(null);
    if (viceCaptainId === playerId) setViceCaptainId(null);
    if (xFactorId === playerId) setXFactorId(null);

    setSelectedPlayers(prev => prev.filter(p => p.id !== playerId));
  };

  const setPlayerAsSpecialRole = (playerId: string, role: 'captain' | 'vice_captain' | 'x_factor' | null) => {
    // Can only set special roles for main squad players (not bench)
    const player = selectedPlayers.find(p => p.id === playerId);
    if (!player || player.position === 'bench') return;

    // If this player already has a different role, remove it first
    if (captainId === playerId && role !== 'captain') {
      setCaptainId(null);
    }
    if (viceCaptainId === playerId && role !== 'vice_captain') {
      setViceCaptainId(null);
    }
    if (xFactorId === playerId && role !== 'x_factor') {
      setXFactorId(null);
    }

    // Toggle off if clicking the same player with the same role
    // Otherwise, set the new role
    if (role === 'captain') {
      setCaptainId(captainId === playerId ? null : playerId);
    } else if (role === 'vice_captain') {
      setViceCaptainId(viceCaptainId === playerId ? null : playerId);
    } else if (role === 'x_factor') {
      setXFactorId(xFactorId === playerId ? null : playerId);
    }
  };

  const updatePlayerPosition = (playerId: string, newPosition: 'regular' | 'bench') => {
    // If moving to bench, clear any special roles
    if (newPosition === 'bench') {
      if (captainId === playerId) setCaptainId(null);
      if (viceCaptainId === playerId) setViceCaptainId(null);
      if (xFactorId === playerId) setXFactorId(null);
    }

    setSelectedPlayers(prev => prev.map(p =>
      p.id === playerId ? { ...p, position: newPosition } : p
    ));
  };

  const getSubmitButtonText = () => {
    if (submitting) return 'Saving...';
    if (isDeadlinePassed) return 'Deadline Passed';
    if (existingSquad?.isSubmitted) return 'Update Squad';
    return 'Submit Squad';
  };

  const quickActions = (
    <Box display="flex" gap={{ xs: 1, sm: 2 }} alignItems="center" flexWrap="wrap">
      {/* Transfer Info if deadline passed */}
      {isDeadlinePassed && league && league.transferTypes && (
        <Box display="flex" gap={{ xs: 0.5, sm: 1 }} flexWrap="wrap">
          {league.transferTypes.benchTransfers.enabled && (
            <Chip
              label={`${league.transferTypes.benchTransfers.maxAllowed - (existingSquad?.benchTransfersUsed || 0)} Bench Available`}
              size="small"
              variant="outlined"
              sx={{
                fontSize: { xs: '0.65rem', sm: '0.75rem' },
                height: { xs: 20, sm: 24 },
                borderColor: '#9C27B0', // Purple - premium/informational
                color: '#9C27B0'
              }}
            />
          )}
          {league.transferTypes.flexibleTransfers.enabled && (
            <Chip
              label={`${league.transferTypes.flexibleTransfers.maxAllowed - (existingSquad?.flexibleTransfersUsed || 0)} Flexible Available`}
              size="small"
              variant="outlined"
              sx={{
                fontSize: { xs: '0.65rem', sm: '0.75rem' },
                height: { xs: 20, sm: 24 },
                borderColor: '#2196F3', // Blue - flexible/dynamic
                color: '#2196F3'
              }}
            />
          )}
          {league.transferTypes.midSeasonTransfers.enabled && (
            <Chip
              label={`Mid-Season Available`}
              size="small"
              variant="outlined"
              sx={{
                fontSize: { xs: '0.65rem', sm: '0.75rem' },
                height: { xs: 20, sm: 24 },
                borderColor: '#7B1FA2', // Purple - premium/informational
                color: '#7B1FA2'
              }}
            />
          )}
        </Box>
      )}
      {isDeadlinePassed && existingSquad ? (
        <Button
          variant="contained"
          color="primary"
          startIcon={<SwapHoriz />}
          onClick={() => setTransferModalOpen(true)}
          disabled={!canMakeTransfer}
          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1.5, sm: 2 }, py: { xs: 0.5, sm: 1 } }}
        >
          Make Transfer
        </Button>
      ) : (
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            disabled={selectedPlayers.length === 0 || submitting || isDeadlinePassed}
            onClick={handleSaveDraft}
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.5, sm: 1 },
              borderColor: themeColors.orange.primary,
              color: themeColors.orange.primary,
              fontWeight: 500,
              '&:hover': {
                borderColor: themeColors.orange.dark,
                bgcolor: alpha(themeColors.orange.primary, 0.08)
              }
            }}
          >
            Save Draft
          </Button>
          <Button
            variant="contained"
            disabled={!isSquadValid() || submitting || isDeadlinePassed}
            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Star />}
            onClick={handleSubmitSquad}
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.5, sm: 1 },
              bgcolor: isDeadlinePassed ? themeColors.grey[700] : themeColors.blue.electric,
              color: 'white',
              fontWeight: 600,
              '&:hover': {
                bgcolor: isDeadlinePassed ? themeColors.grey[600] : themeColors.blue.deep
              }
            }}
          >
            {getSubmitButtonText()}
          </Button>
        </Box>
      )}
    </Box>
  );

  if (loading || !league) {
    return (
      <Box>
        <AppHeader />
        {leagueId && (
          <LeagueNav
            leagueName="Loading..."
            leagueId={leagueId}
            currentPage="Squad Selection"
          />
        )}
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <CircularProgress size={60} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader />
      {league && leagueId && (
        <LeagueNav
          leagueName={league.name}
          leagueId={leagueId}
          currentPage="Squad Selection"
          actions={quickActions}
        />
      )}

      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
        {/* Status Alerts */}
        {existingSquad?.isSubmitted && !isDeadlinePassed && (
          <Box sx={{ mb: { xs: 1.5, sm: 2 } }}>
            <Alert severity="success" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 0.5, sm: 1 } }}>
              Squad Submitted! You can modify your squad freely until the deadline: {new Date(league.squadDeadline).toLocaleString()}
            </Alert>
          </Box>
        )}

        {isDeadlinePassed && (
          <Box sx={{ mb: { xs: 1.5, sm: 2 } }}>
            {canMakeTransfer ? (
              <Alert severity="info" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 0.5, sm: 1 } }}>
                Squad Deadline Passed. Your squad is locked. You can only make changes using available transfers.
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 0.5, sm: 1 } }}>
                Transfers are currently disabled.
                {!isLeagueStarted && ' The league has not started yet.'}
                {isLeagueStarted && !league?.flexibleChangesEnabled && !league?.benchChangesEnabled && ' No transfer types are enabled by the league admin.'}
                {isLeagueStarted && (league?.flexibleChangesEnabled || league?.benchChangesEnabled) && league?.transferTypes?.midSeasonTransfers.enabled && ' Mid-season transfer window is closed.'}
              </Alert>
            )}
          </Box>
        )}

        {!existingSquad?.isSubmitted && !isDeadlinePassed && (
          <Box sx={{ mb: { xs: 1.5, sm: 2 } }}>
            <Alert severity="warning" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 0.5, sm: 1 } }}>
              Squad Not Submitted. Please submit your squad before the deadline: {new Date(league.squadDeadline).toLocaleString()}
            </Alert>
          </Box>
        )}

        {/* Enhanced Error Alert */}
        {enhancedError && (
          <Box sx={{ mb: { xs: 2, sm: 3 } }}>
            <EnhancedAlert
              open={true}
              onClose={() => setEnhancedError(null)}
              severity={enhancedError.severity}
              title={enhancedError.title}
              message={enhancedError.message}
              squadStatus={enhancedError.squadStatus}
              suggestions={enhancedError.suggestions}
              actions={enhancedError.actions}
              errorCode={enhancedError.errorCode}
              isCriticalError={enhancedError.isCriticalError}
            />
          </Box>
        )}

        {/* Simple Error Alert (backward compatibility) */}
        {submitError && !enhancedError && (
          <Box sx={{ mb: { xs: 2, sm: 3 } }}>
            <Alert severity="error" onClose={() => setSubmitError('')} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 0.5, sm: 1 } }}>
              {submitError}
            </Alert>
          </Box>
        )}

        {/* Squad Summary - Moved to top */}
        <Card sx={{
          mb: { xs: 2, sm: 3 },
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          borderRadius: 2,
          boxShadow: `0 4px 16px ${alpha('#000', 0.3)}`,
          opacity: 0.94, // Subtle opacity to reduce visual weight
          transition: 'opacity 0.3s ease',
          '&:hover': { opacity: 1 } // Full opacity on hover
        }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}>
                Squad Summary
              </Typography>
              {existingSquad && (
                <Chip
                  label={existingSquad.isSubmitted ? "Submitted" : "Draft"}
                  color={existingSquad.isSubmitted ? "success" : "warning"}
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 1.5 } }}>
              <Chip
                label={`Players: ${selectedPlayers.filter(p => p.position !== 'bench').length}/${league?.squadSize || 0}`}
                variant="outlined"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                  height: { xs: 28, sm: 32 },
                  borderColor: theme.palette.primary.main,
                  color: 'text.primary',
                  bgcolor: alpha(theme.palette.primary.main, 0.05)
                }}
              />
              {league?.squadRules?.overseasPlayersEnabled && (
                <Chip
                  label={`Overseas: ${selectedPlayers.filter(p => p.position !== 'bench' && p.isOverseas).length}/${league.squadRules.maxOverseasPlayers || 4}`}
                  variant="outlined"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                    height: { xs: 28, sm: 32 },
                    borderColor: selectedPlayers.filter(p => p.position !== 'bench' && p.isOverseas).length > (league.squadRules.maxOverseasPlayers || 4)
                      ? theme.palette.error.main
                      : theme.palette.info.main,
                    color: selectedPlayers.filter(p => p.position !== 'bench' && p.isOverseas).length > (league.squadRules.maxOverseasPlayers || 4)
                      ? theme.palette.error.main
                      : 'text.primary',
                    bgcolor: alpha(
                      selectedPlayers.filter(p => p.position !== 'bench' && p.isOverseas).length > (league.squadRules.maxOverseasPlayers || 4)
                        ? theme.palette.error.main
                        : theme.palette.info.main,
                      0.05
                    )
                  }}
                />
              )}
              {league?.transferTypes?.benchTransfers?.enabled && (
                <Chip
                  label={
                    isDeadlinePassed
                      ? `${league.transferTypes.benchTransfers.maxAllowed - (existingSquad?.benchTransfersUsed || 0)} Bench Transfer${league.transferTypes.benchTransfers.maxAllowed - (existingSquad?.benchTransfersUsed || 0) === 1 ? '' : 's'} Available`
                      : `Bench: ${selectedPlayers.filter(p => p.position === 'bench').length}/${league.transferTypes.benchTransfers.benchSlots}`
                  }
                  variant="outlined"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                    height: { xs: 28, sm: 32 },
                    borderColor: theme.palette.secondary.main,
                    color: 'text.primary',
                    bgcolor: alpha(theme.palette.secondary.main, 0.05)
                  }}
                />
              )}
              {league?.transferTypes?.flexibleTransfers?.enabled && isDeadlinePassed && (
                <Chip
                  label={`${league.transferTypes.flexibleTransfers.maxAllowed - (existingSquad?.flexibleTransfersUsed || 0)} Flexible Transfer${league.transferTypes.flexibleTransfers.maxAllowed - (existingSquad?.flexibleTransfersUsed || 0) === 1 ? '' : 's'} Available`}
                  variant="outlined"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                    height: { xs: 28, sm: 32 },
                    borderColor: theme.palette.info.main,
                    color: 'text.primary',
                    bgcolor: alpha(theme.palette.info.main, 0.05)
                  }}
                />
              )}
              <Chip
                icon={captainId ? <Star sx={{ fontSize: 18, color: theme.palette.primary.main }} /> : undefined}
                label="Captain"
                variant={captainId ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                  height: { xs: 28, sm: 32 },
                  bgcolor: captainId ? alpha(theme.palette.primary.main, 0.15) : 'transparent',
                  borderColor: captainId ? theme.palette.primary.main : alpha(theme.palette.text.secondary, 0.3),
                  color: captainId ? theme.palette.primary.main : 'text.secondary'
                }}
              />
              <Chip
                icon={viceCaptainId ? <Star sx={{ fontSize: 18, color: theme.palette.secondary.main }} /> : undefined}
                label="Vice Captain"
                variant={viceCaptainId ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                  height: { xs: 28, sm: 32 },
                  bgcolor: viceCaptainId ? alpha(theme.palette.secondary.main, 0.15) : 'transparent',
                  borderColor: viceCaptainId ? theme.palette.secondary.main : alpha(theme.palette.text.secondary, 0.3),
                  color: viceCaptainId ? theme.palette.secondary.main : 'text.secondary'
                }}
              />
              <Chip
                icon={xFactorId ? <Star sx={{ fontSize: 18, color: theme.palette.primary.main }} /> : undefined}
                label="X-Factor"
                variant={xFactorId ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                  height: { xs: 28, sm: 32 },
                  bgcolor: xFactorId ? alpha(theme.palette.primary.main, 0.15) : 'transparent',
                  borderColor: xFactorId ? theme.palette.primary.main : alpha(theme.palette.text.secondary, 0.3),
                  color: xFactorId ? theme.palette.primary.main : 'text.secondary'
                }}
              />
              <Chip
                label={`Predictions: ${topRunScorer && topWicketTaker && winningTeam ? 'Complete' : 'Incomplete'}`}
                variant={topRunScorer && topWicketTaker && winningTeam ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                  height: { xs: 28, sm: 32 },
                  bgcolor: topRunScorer && topWicketTaker && winningTeam ? alpha(theme.palette.secondary.main, 0.15) : 'transparent',
                  borderColor: topRunScorer && topWicketTaker && winningTeam ? theme.palette.secondary.main : alpha(theme.palette.text.secondary, 0.3),
                  color: topRunScorer && topWicketTaker && winningTeam ? theme.palette.secondary.main : 'text.secondary'
                }}
              />
              {league?.powerplayEnabled && (
                <Chip
                  label={`PP Match: ${powerplayMatch.trim() !== '' ? `Match ${powerplayMatch}` : 'Not Selected'}`}
                  variant={powerplayMatch.trim() !== '' ? 'filled' : 'outlined'}
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                    height: { xs: 28, sm: 32 },
                    bgcolor: powerplayMatch.trim() !== '' ? alpha(theme.palette.warning.main, 0.15) : 'transparent',
                    borderColor: powerplayMatch.trim() !== '' ? theme.palette.warning.main : alpha(theme.palette.text.secondary, 0.3),
                    color: powerplayMatch.trim() !== '' ? theme.palette.warning.main : 'text.secondary'
                  }}
                />
              )}
            </Box>
          </CardContent>
        </Card>

        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {/* Left Panel - Squad Formation */}
          <Grid size={{ xs: 12, lg: (isDeadlinePassed && !canMakeTransfer) ? 12 : 8 }}>
            <CricketPitchFormation
              league={league}
              selectedPlayers={selectedPlayers}
              onRemovePlayer={removePlayerFromSquad}
              onUpdatePosition={updatePlayerPosition}
              powerplayMatch={powerplayMatch}
              setPowerplayMatch={setPowerplayMatch}
              maxPowerplayMatches={league.maxPowerplayMatches || 20}
              captainId={captainId}
              viceCaptainId={viceCaptainId}
              xFactorId={xFactorId}
              onSetSpecialRole={setPlayerAsSpecialRole}
              existingSquad={existingSquad}
              calculatePlayerContribution={calculatePlayerContribution}
              readOnly={isDeadlinePassed && !canMakeTransfer}
            />
          </Grid>

          {/* Right Panel - Player Selection */}
          {!(isDeadlinePassed && !canMakeTransfer) && (
            <Grid size={{ xs: 12, lg: 4 }}>
              <PlayerSelectionPanel
                availablePlayers={availablePlayers}
                selectedPlayers={selectedPlayers}
                onAddPlayer={addPlayerToSquad}
                filterRole={filterRole}
                setFilterRole={setFilterRole}
                league={league}
              />
            </Grid>
          )}
        </Grid>

        {/* Predictions Section */}
        <Card sx={{ mt: { xs: 2, sm: 3 }, background: 'linear-gradient(135deg, rgba(255, 0, 93, 0.1), rgba(0, 229, 255, 0.05))' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Make Your Predictions *
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {existingSquad?.isSubmitted
                  ? 'Your predictions are locked after squad submission and cannot be changed.'
                  : 'Predict the top performers and series outcome. All predictions are required to submit your squad.'}
              </Typography>
            </Box>

            <Grid container spacing={{ xs: 2, sm: 3 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  required
                  label="Top Run Scorer"
                  placeholder="e.g., Virat Kohli"
                  value={topRunScorer}
                  onChange={(e) => setTopRunScorer(e.target.value)}
                  variant="outlined"
                  size="small"
                  disabled={existingSquad?.isSubmitted}
                  error={!existingSquad?.isSubmitted && topRunScorer.trim() === ''}
                  helperText={!existingSquad?.isSubmitted && topRunScorer.trim() === '' ? 'Required' : ''}
                  InputProps={{
                    startAdornment: <Box sx={{ mr: 1, color: 'warning.main' }}>🏏</Box>
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  required
                  label="Top Wicket Taker"
                  placeholder="e.g., Jasprit Bumrah"
                  value={topWicketTaker}
                  onChange={(e) => setTopWicketTaker(e.target.value)}
                  variant="outlined"
                  size="small"
                  disabled={existingSquad?.isSubmitted}
                  error={!existingSquad?.isSubmitted && topWicketTaker.trim() === ''}
                  helperText={!existingSquad?.isSubmitted && topWicketTaker.trim() === '' ? 'Required' : ''}
                  InputProps={{
                    startAdornment: <Box sx={{ mr: 1, color: 'error.main' }}>⚡</Box>
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  required
                  label="Winning Team Prediction"
                  placeholder="e.g., India or Australia"
                  value={winningTeam}
                  onChange={(e) => setWinningTeam(e.target.value)}
                  variant="outlined"
                  size="small"
                  disabled={existingSquad?.isSubmitted}
                  error={!existingSquad?.isSubmitted && winningTeam.trim() === ''}
                  helperText={!existingSquad?.isSubmitted && winningTeam.trim() === '' ? 'Required' : ''}
                  InputProps={{
                    startAdornment: <Box sx={{ mr: 1, color: 'success.main' }}>🏆</Box>
                  }}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 2 }}>
              <Alert severity="warning" sx={{ fontSize: '0.875rem' }}>
                <Typography variant="caption" display="block">
                  All predictions are mandatory. Your predictions will be saved with your squad and can be updated anytime before the deadline.
                </Typography>
              </Alert>
            </Box>
          </CardContent>
        </Card>
      </Container>

      {/* Transfer Modal */}
      {isDeadlinePassed && existingSquad && league && (
        <TransferModal
          open={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          league={league}
          existingSquad={existingSquad}
          availablePlayers={availablePlayers}
          onSubmitTransfer={handleTransferSubmit}
        />
      )}
    </Box>
  );
};

// Cricket Pitch Formation Component
const CricketPitchFormation: React.FC<{
  league: League;
  selectedPlayers: SelectedPlayer[];
  onRemovePlayer: (playerId: string) => void;
  onUpdatePosition: (playerId: string, position: 'regular' | 'bench') => void;
  powerplayMatch: string;
  setPowerplayMatch: (match: string) => void;
  maxPowerplayMatches: number;
  captainId: string | null;
  viceCaptainId: string | null;
  xFactorId: string | null;
  onSetSpecialRole: (playerId: string, role: 'captain' | 'vice_captain' | 'x_factor' | null) => void;
  existingSquad: LeagueSquad | null;
  calculatePlayerContribution: (player: SquadPlayer, role: 'captain' | 'viceCaptain' | 'xFactor' | 'regular') => number;
  readOnly: boolean;
}> = ({ league, selectedPlayers, onRemovePlayer, onUpdatePosition, powerplayMatch, setPowerplayMatch, maxPowerplayMatches, captainId, viceCaptainId, xFactorId, onSetSpecialRole, existingSquad, calculatePlayerContribution, readOnly }) => {

  // Helper function to get player points for display
  const getPlayerPointsDisplay = (player: SelectedPlayer, slotType: 'required' | 'flexible' | 'bench') => {
    // Get raw points from player stats (points are stored in recentForm)
    const rawPoints = player.stats?.[league.format]?.recentForm || 0;

    if (!existingSquad || slotType === 'bench') {
      // No existing squad or bench players - show raw points
      return { points: rawPoints, label: 'pts' };
    }

    // Main squad player - check if they exist in the existing squad
    const squadPlayer = existingSquad.players.find((p: SquadPlayer) => p.playerId === player.id);

    if (!squadPlayer) {
      // New player being added - show raw points
      return { points: rawPoints, label: 'pts' };
    }

    // Existing squad player - calculate contribution based on their role
    const isCaptain = captainId === player.id;
    const isViceCaptain = viceCaptainId === player.id;
    const isXFactor = xFactorId === player.id;

    const role = isCaptain ? 'captain' : isViceCaptain ? 'viceCaptain' : isXFactor ? 'xFactor' : 'regular';
    const contribution = calculatePlayerContribution(squadPlayer, role);

    return { points: contribution, label: 'contrib' };
  };

  const getRequiredSlots = () => {
    const { squadRules } = league;
    return {
      batsmen: Array(squadRules.minBatsmen).fill(null),
      bowlers: Array(squadRules.minBowlers).fill(null),
      allrounders: Array(0).fill(null), // No minimum all-rounders required
      wicketkeepers: Array(squadRules.minWicketkeepers).fill(null),
      flexible: Array(league.squadSize - squadRules.minBatsmen - squadRules.minBowlers - squadRules.minWicketkeepers).fill(null), // Removed minAllrounders from calculation
      bench: league.transferTypes?.benchTransfers?.enabled ? Array(league.transferTypes.benchTransfers.benchSlots).fill(null) : []
    };
  };

  const requiredSlots = getRequiredSlots();

  // Pre-calculate player assignments to prevent any duplication or stacking
  const mainSquadPlayers = selectedPlayers.filter(p => p.position !== 'bench');
  const benchPlayers = selectedPlayers.filter(p => p.position === 'bench');

  // Assign players to slots preserving the order they were added
  // This prevents players from "jumping" between slots when new players are added
  const slotAssignments = {
    batsman: [] as (SelectedPlayer | undefined)[],
    bowler: [] as (SelectedPlayer | undefined)[],
    allrounder: [] as (SelectedPlayer | undefined)[],
    wicketkeeper: [] as (SelectedPlayer | undefined)[],
    flexible: [] as SelectedPlayer[]
  };

  // Track how many players of each role we've assigned to required slots
  const roleCounters = {
    batsman: 0,
    bowler: 0,
    allrounder: 0,
    wicketkeeper: 0
  };

  // Go through players in the order they were added
  mainSquadPlayers.forEach(player => {
    const role = player.role as 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';
    const minRequired = league.squadRules[
      role === 'batsman' ? 'minBatsmen' :
      role === 'bowler' ? 'minBowlers' :
      role === 'allrounder' ? 'minAllrounders' :
      'minWicketkeepers'
    ];

    // If this role still has required slots available, assign to required slot
    if (roleCounters[role] < minRequired) {
      slotAssignments[role][roleCounters[role]] = player;
      roleCounters[role]++;
    } else {
      // Otherwise, assign to flexible slot (in order added)
      slotAssignments.flexible.push(player);
    }
  });

  // For backwards compatibility with existing slot rendering
  const playersByRole = {
    batsman: slotAssignments.batsman.filter((p): p is SelectedPlayer => p !== undefined),
    bowler: slotAssignments.bowler.filter((p): p is SelectedPlayer => p !== undefined),
    allrounder: slotAssignments.allrounder.filter((p): p is SelectedPlayer => p !== undefined),
    wicketkeeper: slotAssignments.wicketkeeper.filter((p): p is SelectedPlayer => p !== undefined)
  };

  const flexiblePlayersList = slotAssignments.flexible;

  const getRoleDisplayText = (role?: string): string => {
    if (!role) return '';
    switch (role) {
      case 'batsman': return 'Batter';
      case 'bowler': return 'Bowler';
      case 'allrounder': return 'Allrounder';
      case 'wicketkeeper': return 'Wicketkeeper';
      default: return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  const getSlotColors = (slotType: 'required' | 'flexible' | 'bench', role?: string) => {
    if (slotType === 'required') {
      switch (role) {
        case 'batsman': return { bg: '#E8F5E9', border: '#66BB6A' }; // Muted green
        case 'bowler': return { bg: '#EDE7F6', border: '#7B1FA2' }; // Purple
        case 'allrounder': return { bg: '#E1F5FE', border: '#29B6F6' }; // Light blue
        case 'wicketkeeper': return { bg: '#FFF9C4', border: '#FFC107' }; // Amber for special role
        default: return { bg: '#ECEFF1', border: '#78909C' };
      }
    } else if (slotType === 'flexible') {
      return { bg: '#E8EAF6', border: '#5C6BC0' }; // Indigo
    } else {
      return { bg: '#F3E5F5', border: '#9C27B0' }; // Light purple for bench (premium/informational)
    }
  };

  const PlayerSlot: React.FC<{
    player?: SelectedPlayer;
    role?: string;
    slotType: 'required' | 'flexible' | 'bench';
    position: number;
  }> = ({ player, role, slotType, position }) => {
    const [showRoleMenu, setShowRoleMenu] = useState(false);
    const [hideTimeout, setHideTimeout] = React.useState<NodeJS.Timeout | null>(null);
    const colors = getSlotColors(slotType, role);

    const isCaptain = player && captainId === player.id;
    const isViceCaptain = player && viceCaptainId === player.id;
    const isXFactor = player && xFactorId === player.id;
    const canAssignRoles = player && slotType !== 'bench' && !readOnly;

    const handleMouseEnter = () => {
      if (canAssignRoles) {
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          setHideTimeout(null);
        }
        setShowRoleMenu(true);
      }
    };

    const handleMouseLeave = () => {
      const timeout = setTimeout(() => {
        setShowRoleMenu(false);
      }, 300); // 300ms delay before hiding
      setHideTimeout(timeout);
    };

    return (
      <Paper
        elevation={player ? 8 : 2}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{
          p: { xs: 1, sm: 1.5, md: 2 },
          minHeight: { xs: 80, sm: 90, md: 100 },
          width: '100%',
          maxWidth: { xs: 100, sm: 120, md: 140 },
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: player ? 'none' : `2px dashed ${colors.border}`,
          borderRadius: { xs: 2, sm: 3 },
          bgcolor: player ? '#1a2332' : colors.bg,
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: player ? '0 6px 18px rgba(0,0,0,0.35)' : 'none', // Enhanced micro elevation
          '&:hover': {
            bgcolor: player ? '#222b3d' : colors.bg,
            transform: player ? 'translateY(-6px) scale(1.03)' : 'translateY(-2px)', // Enhanced hover lift
            boxShadow: player ? '0 12px 28px rgba(0,0,0,0.4)' : `0 8px 16px ${colors.border}55`
          }
        }}
      >
        {player ? (
          <>
            {!readOnly && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePlayer(player.id);
                }}
                sx={{ position: 'absolute', top: { xs: -6, sm: -8 }, right: { xs: -6, sm: -8 }, bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' }, zIndex: 10, width: { xs: 20, sm: 24 }, height: { xs: 20, sm: 24 } }}
              >
                <Close sx={{ fontSize: { xs: 14, sm: 18 } }} />
              </IconButton>
            )}

            <Avatar sx={{ width: { xs: 24, sm: 28, md: 32 }, height: { xs: 24, sm: 28, md: 32 }, mb: 0.5, bgcolor: '#090b47', color: 'white', fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, fontWeight: 700 }}>
              {player.name.charAt(0)}
            </Avatar>

            <Typography variant="caption" fontWeight="bold" textAlign="center" sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' } }} noWrap>
              {player.name.split(' ').pop()}
            </Typography>

            <Chip
              size="small"
              label={player.team}
              sx={{ fontSize: { xs: '0.55rem', sm: '0.6rem' }, height: { xs: 14, sm: 16 }, mt: 0.5 }}
            />

            {/* Points Display */}
            {(() => {
              const pointsData = getPlayerPointsDisplay(player, slotType);
              return (
                <Typography
                  variant="caption"
                  fontWeight="bold"
                  textAlign="center"
                  sx={{
                    fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' },
                    mt: 0.5,
                    color: pointsData.label === 'contrib' ? 'success.main' : 'primary.main'
                  }}
                >
                  {pointsData.points.toFixed(2)}
                </Typography>
              );
            })()}

            {/* Captain/Vice Captain/X-Factor badges with special glows */}
            {isCaptain && (
              <Box sx={{ position: 'absolute', top: { xs: -4, sm: -5 }, left: { xs: -4, sm: -5 } }}>
                <Chip
                  label="C"
                  size="small"
                  sx={{
                    fontSize: { xs: '0.6rem', sm: '0.7rem' },
                    height: { xs: 16, sm: 18 },
                    fontWeight: 'bold',
                    bgcolor: '#090b47',
                    color: themeColors.gold,
                    boxShadow: `0 0 10px ${alpha(themeColors.gold, 0.6)}, 0 0 20px ${alpha(themeColors.gold, 0.3)}`,
                    animation: 'pulse-gold 2s ease-in-out infinite',
                    '@keyframes pulse-gold': {
                      '0%, 100%': { boxShadow: `0 0 10px ${alpha(themeColors.gold, 0.6)}, 0 0 20px ${alpha(themeColors.gold, 0.3)}` },
                      '50%': { boxShadow: `0 0 15px ${alpha(themeColors.gold, 0.8)}, 0 0 30px ${alpha(themeColors.gold, 0.4)}` }
                    }
                  }}
                />
              </Box>
            )}
            {isViceCaptain && (
              <Box sx={{ position: 'absolute', top: { xs: -4, sm: -5 }, left: { xs: -4, sm: -5 } }}>
                <Chip
                  label="VC"
                  size="small"
                  sx={{
                    fontSize: { xs: '0.6rem', sm: '0.7rem' },
                    height: { xs: 16, sm: 18 },
                    fontWeight: 'bold',
                    bgcolor: '#090b47',
                    color: themeColors.gold,
                    boxShadow: `0 0 10px ${alpha(themeColors.gold, 0.6)}, 0 0 20px ${alpha(themeColors.gold, 0.3)}`
                  }}
                />
              </Box>
            )}
            {isXFactor && (
              <Box sx={{ position: 'absolute', top: { xs: -4, sm: -5 }, left: { xs: -4, sm: -5 } }}>
                <Chip
                  label="X"
                  size="small"
                  sx={{
                    fontSize: { xs: '0.6rem', sm: '0.7rem' },
                    height: { xs: 16, sm: 18 },
                    fontWeight: 'bold',
                    bgcolor: '#090b47',
                    color: themeColors.gold,
                    boxShadow: `0 0 10px ${alpha(themeColors.gold, 0.6)}, 0 0 20px ${alpha(themeColors.gold, 0.3)}`,
                    animation: 'pulse-gold-x 3s ease-in-out infinite',
                    '@keyframes pulse-gold-x': {
                      '0%, 100%': { boxShadow: `0 0 8px ${alpha(themeColors.gold, 0.5)}, 0 0 16px ${alpha(themeColors.gold, 0.2)}` },
                      '50%': { boxShadow: `0 0 12px ${alpha(themeColors.gold, 0.7)}, 0 0 24px ${alpha(themeColors.gold, 0.35)}` }
                    }
                  }}
                />
              </Box>
            )}

            {/* Hover menu for assigning roles */}
            {canAssignRoles && showRoleMenu && (
              <Box
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                sx={{
                  position: 'absolute',
                  bottom: -40,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: 0.5,
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  p: 0.5,
                  boxShadow: 3,
                  zIndex: 100,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetSpecialRole(player.id, 'captain');
                  }}
                  sx={{
                    bgcolor: isCaptain ? 'warning.main' : 'action.hover',
                    color: isCaptain ? 'warning.contrastText' : 'text.primary',
                    '&:hover': { bgcolor: isCaptain ? 'warning.dark' : 'warning.light' },
                    width: 28,
                    height: 28
                  }}
                >
                  <Typography variant="caption" fontWeight="bold">C</Typography>
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetSpecialRole(player.id, 'vice_captain');
                  }}
                  sx={{
                    bgcolor: isViceCaptain ? '#7B1FA2' : 'action.hover', // Purple for premium
                    color: isViceCaptain ? 'white' : 'text.primary',
                    '&:hover': { bgcolor: isViceCaptain ? '#6A1B9A' : 'rgba(123, 31, 162, 0.1)' },
                    width: 28,
                    height: 28
                  }}
                >
                  <Typography variant="caption" fontWeight="bold" fontSize="0.65rem">VC</Typography>
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetSpecialRole(player.id, 'x_factor');
                  }}
                  sx={{
                    bgcolor: isXFactor ? '#9C27B0' : 'action.hover', // Light Purple for accent
                    color: isXFactor ? 'white' : 'text.primary',
                    '&:hover': { bgcolor: isXFactor ? '#7B1FA2' : 'rgba(156, 39, 176, 0.1)' },
                    width: 28,
                    height: 28
                  }}
                >
                  <Typography variant="caption" fontWeight="bold">X</Typography>
                </IconButton>
              </Box>
            )}
          </>
        ) : (
          <>
            <PersonAdd sx={{ fontSize: 32, color: colors.border, mb: 1, opacity: 0.7 }} />
            <Typography
              variant="caption"
              textAlign="center"
              sx={{
                color: colors.border,
                fontWeight: 'bold',
                fontSize: '0.75rem',
                textShadow: '0 1px 2px rgba(255,255,255,0.8)'
              }}
            >
              {role ? getRoleDisplayText(role) : `Player ${position + 1}`}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: colors.border,
                fontSize: '0.65rem',
                fontWeight: 600,
                opacity: 0.8,
                textShadow: '0 1px 2px rgba(255,255,255,0.8)'
              }}
            >
              {slotType === 'required' ? 'Required' : slotType === 'flexible' ? 'Any Role' : 'Bench'}
            </Typography>
          </>
        )}
      </Paper>
    );
  };

  return (
    <Card>
      <CardContent sx={{ px: { xs: 1, sm: 1.5, md: 2, lg: 3 }, py: { xs: 1, sm: 1.5, md: 2, lg: 2.5 } }}>
        {/* Powerplay Selection */}
        {league.powerplayEnabled && (
          <Box sx={{ mb: { xs: 1.5, sm: 2, md: 3 } }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' } }}>
              Powerplay Match Selection
            </Typography>
            <FormControl fullWidth>
              <InputLabel sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>Select Powerplay Match</InputLabel>
              <Select
                value={powerplayMatch}
                label="Select Powerplay Match"
                onChange={(e) => setPowerplayMatch(e.target.value)}
                disabled={isDeadlinePassed}
                sx={{
                  fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
                  bgcolor: '#1a2332',
                  '& .MuiSelect-select': {
                    py: 1.5
                  }
                }}
              >
                {league.matchSchedule && league.matchSchedule.length > 0 ? (
                  // If match schedule exists, show detailed match info
                  league.matchSchedule
                    .filter(match => match.matchNumber <= maxPowerplayMatches)
                    .map((match) => (
                      <MenuItem
                        key={match.matchNumber}
                        value={match.matchNumber.toString()}
                        sx={{
                          fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
                          py: 1.5,
                          '&:hover': {
                            bgcolor: alpha(themeColors.blue.electric, 0.08)
                          }
                        }}
                      >
                        <Box>
                          <Typography variant="body2" fontWeight={600} fontSize="0.875rem">
                            {formatMatchForDropdown(match)}
                          </Typography>
                          {match.team1 !== 'TBC' && match.team2 !== 'TBC' && (
                            <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
                              {match.timeGMT} GMT • {match.stadium}
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))
                ) : (
                  // Fallback to simple match numbers if no schedule
                  Array.from({ length: maxPowerplayMatches }, (_, i) => i + 1).map((matchNumber) => (
                    <MenuItem key={matchNumber} value={matchNumber.toString()} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>
                      Match {matchNumber}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Box>
        )}

        {/* Cricket Field Background */}
        <Box
          sx={{
            background: 'linear-gradient(180deg, #32883A 0%, #1F6B27 100%)', // Brightened by ~8%
            borderRadius: { xs: 1.5, sm: 2, md: 3 },
            position: 'relative',
            overflow: 'visible',
            boxShadow: '0 12px 40px rgba(0,0,0,0.3), 0 0 60px rgba(46, 125, 50, 0.4)', // Added glow
            minHeight: { xs: 500, sm: 600, md: 700, lg: 800 },
            pb: { xs: 1.5, sm: 2, md: 3 },
            // Outer boundary rope with enhanced visibility
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '40px',
              left: '5%',
              right: '5%',
              bottom: '40px',
              borderRadius: '50%',
              border: '4px solid #FFFFFF',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2), 0 0 15px rgba(255,255,255,0.6)', // Enhanced glow
              zIndex: 0,
            },
            // Inner 30-yard circle
            '&::after': {
              content: '""',
              position: 'absolute',
              top: '15%',
              left: '20%',
              right: '20%',
              bottom: '15%',
              borderRadius: '50%',
              border: '3px dashed rgba(255,255,255,0.5)',
              zIndex: 0,
            }
          }}
        >
          {/* Cricket Pitch */}
          <Box sx={{
            position: 'absolute',
            top: '80px',
            left: '38%',
            right: '38%',
            bottom: '80px',
            background: 'linear-gradient(180deg, #D4AF76 0%, #C9A76B 25%, #C9A76B 75%, #D4AF76 100%)',
            borderRadius: '8px',
            border: '3px solid rgba(180, 150, 100, 0.9)',
            boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.2), 0 0 0 3px rgba(255,255,255,0.4)',
            zIndex: 0,
          }} />
          {/* Batting End - Top with crease and stumps */}
          <Box sx={{
            position: 'absolute',
            top: '85px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            {/* Batting Crease */}
            <Box sx={{
              width: '120px',
              height: '5px',
              bgcolor: '#FFFFFF',
              borderRadius: '2px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              border: '1px solid #DDD'
            }} />
            {/* Stumps */}
            <Box sx={{ display: 'flex', gap: '6px', mt: '4px' }}>
              {[1,2,3].map(i => (
                <Box key={i} sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: '#8B4513',
                  border: '2px solid #5D3A1A',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
                }} />
              ))}
            </Box>
          </Box>

          {/* Bowling End - Bottom with stumps and crease */}
          <Box sx={{
            position: 'absolute',
            bottom: '85px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            {/* Stumps */}
            <Box sx={{ display: 'flex', gap: '6px' }}>
              {[1,2,3].map(i => (
                <Box key={i} sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: '#8B4513',
                  border: '2px solid #5D3A1A',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
                }} />
              ))}
            </Box>
            {/* Bowling Crease */}
            <Box sx={{
              width: '120px',
              height: '5px',
              bgcolor: '#FFFFFF',
              borderRadius: '2px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              border: '1px solid #DDD',
              mt: '4px'
            }} />
          </Box>

          <Typography variant="h6" color="white" textAlign="center" pt={{ xs: 1, sm: 1.5, md: 2 }} pb={{ xs: 0.5, sm: 1 }} sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)', position: 'relative', zIndex: 2, fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' } }}>
            Squad Formation
          </Typography>

          {/* Cricket Field Formation Layout */}
          <Box sx={{ zIndex: 2, position: 'relative', px: { xs: 1, sm: 2, md: 3 } }}>

            {/* Wicket-keepers - ABOVE the batting end stumps and crease */}
            {league.squadRules.minWicketkeepers > 0 && (
              <Box sx={{
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'rgba(255, 255, 255, 0.3)',
                  zIndex: 1
                }
              }}>
                <Box sx={{ textAlign: 'center', py: { xs: 1, sm: 1.5, md: 2 } }}>
                  <Box sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: { xs: 0.5, sm: 1 },
                    bgcolor: 'rgba(76, 175, 80, 0.7)',
                    px: { xs: 1.5, sm: 2, md: 2.5 },
                    py: { xs: 0.5, sm: 0.75 },
                    borderRadius: '20px',
                    mb: { xs: 1, sm: 1.5, md: 2 },
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}>
                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>
                      🥅 Wicket-Keepers
                    </Typography>
                    <Chip
                      label={`${league.squadRules.minWicketkeepers} Required`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.9)',
                        color: '#2E7D32',
                        fontWeight: 'bold',
                        fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
                        height: { xs: 18, sm: 20, md: 22 }
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5, md: 2 }, justifyContent: 'center', flexWrap: 'wrap', pb: { xs: 1, sm: 1.5, md: 2 } }}>
                    {requiredSlots.wicketkeepers.map((_, index) => (
                      <PlayerSlot
                        key={`wicketkeeper-${index}`}
                        player={playersByRole.wicketkeeper[index]}
                        role="wicketkeeper"
                        slotType="required"
                        position={index}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
            )}

            {/* Batters - Near the batting end */}
            <Box sx={{
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'rgba(255, 255, 255, 0.3)',
                zIndex: 1
              }
            }}>
              <Box sx={{ textAlign: 'center', py: { xs: 1, sm: 1.5, md: 2 }, pt: { xs: 1.5, sm: 2, md: 3 } }}>
                <Box sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: { xs: 0.5, sm: 1 },
                  background: `linear-gradient(135deg, ${themeColors.blue.electric}, ${themeColors.blue.deep})`,
                  px: { xs: 1.5, sm: 2, md: 2.5 },
                  py: { xs: 0.5, sm: 0.75 },
                  borderRadius: '20px',
                  mb: { xs: 1, sm: 1.5, md: 2 },
                  boxShadow: `0 4px 12px ${alpha(themeColors.blue.electric, 0.4)}, 0 2px 4px ${alpha(themeColors.blue.deep, 0.2)}`
                }}>
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                    Batters
                  </Typography>
                  <Chip
                    label={`${league.squadRules.minBatsmen} Required`}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.95)',
                      color: themeColors.blue.deep,
                      fontWeight: 'bold',
                      fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
                      height: { xs: 18, sm: 20, md: 22 },
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5, md: 2 }, justifyContent: 'center', flexWrap: 'wrap', pb: { xs: 1, sm: 1.5, md: 2 } }}>
                  {requiredSlots.batsmen.map((_, index) => (
                    <PlayerSlot
                      key={`batsman-${index}`}
                      player={playersByRole.batsman[index]}
                      role="batsman"
                      slotType="required"
                      position={index}
                    />
                  ))}
                </Box>
              </Box>
            </Box>

            {/* Bowlers - Near the bowling end */}
            <Box sx={{
              position: 'relative',
              '&::after': requiredSlots.flexible.length > 0 ? {
                content: '""',
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'rgba(255, 255, 255, 0.3)',
                zIndex: 1
              } : {}
            }}>
              <Box sx={{ textAlign: 'center', py: { xs: 1, sm: 1.5, md: 2 } }}>
                <Box sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: { xs: 0.5, sm: 1 },
                  background: `linear-gradient(135deg, ${themeColors.blue.electric}, ${themeColors.blue.deep})`,
                  px: { xs: 1.5, sm: 2, md: 2.5 },
                  py: { xs: 0.5, sm: 0.75 },
                  borderRadius: '20px',
                  mb: { xs: 1, sm: 1.5, md: 2 },
                  boxShadow: `0 4px 12px ${alpha(themeColors.blue.electric, 0.4)}, 0 2px 4px ${alpha(themeColors.blue.deep, 0.2)}`
                }}>
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                    Bowlers
                  </Typography>
                  <Chip
                    label={`${league.squadRules.minBowlers} Required`}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.95)',
                      color: themeColors.blue.deep,
                      fontWeight: 'bold',
                      fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
                      height: { xs: 18, sm: 20, md: 22 },
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5, md: 2 }, justifyContent: 'center', flexWrap: 'wrap', pb: { xs: 1, sm: 1.5, md: 2 } }}>
                  {requiredSlots.bowlers.map((_, index) => (
                    <PlayerSlot
                      key={`bowler-${index}`}
                      player={playersByRole.bowler[index]}
                      role="bowler"
                      slotType="required"
                      position={index}
                    />
                  ))}
                </Box>
              </Box>
            </Box>

            {/* Flexible Slots - Inside field, below pitch */}
            {requiredSlots.flexible.length > 0 && (
              <Box sx={{ py: { xs: 1.5, sm: 2, md: 3 }, pb: { xs: 2, sm: 3, md: 4 } }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: { xs: 0.5, sm: 1 },
                    background: `linear-gradient(135deg, ${themeColors.blue.electric}, ${themeColors.blue.deep})`,
                    px: { xs: 1.5, sm: 2, md: 2.5 },
                    py: { xs: 0.5, sm: 0.75 },
                    borderRadius: '20px',
                    mb: { xs: 1, sm: 1.5, md: 2 },
                    boxShadow: `0 4px 12px ${alpha(themeColors.blue.electric, 0.4)}, 0 2px 4px ${alpha(themeColors.blue.deep, 0.2)}`
                  }}>
                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                      Flexible Positions (Any Role)
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5, md: 2 }, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {requiredSlots.flexible.map((_, index) => (
                      <PlayerSlot
                        key={`flexible-${index}`}
                        player={flexiblePlayersList[index]}
                        slotType="flexible"
                        position={index}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        {/* Outside Field - Bench Slots */}
        {requiredSlots.bench.length > 0 && (
          <Box sx={{ mt: { xs: 2, sm: 2.5, md: 3 } }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'warning.main', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                Bench Players (Outside Field)
              </Typography>
              <Box sx={{
                display: 'flex',
                gap: { xs: 1, sm: 1.5, md: 2 },
                justifyContent: 'center',
                flexWrap: 'wrap',
                p: { xs: 1.5, sm: 2, md: 3 },
                bgcolor: 'rgba(255, 152, 0, 0.15)',
                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                border: '2px solid rgba(255, 152, 0, 0.4)',
                boxShadow: '0 4px 12px rgba(255, 152, 0, 0.2)'
              }}>
                {requiredSlots.bench.map((_, index) => (
                  <PlayerSlot
                    key={`bench-${index}`}
                    player={benchPlayers[index]}
                    slotType="bench"
                    position={index}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        )}

      </CardContent>
    </Card>
  );
};

// Player Selection Panel Component
const PlayerSelectionPanel: React.FC<{
  availablePlayers: Player[];
  selectedPlayers: SelectedPlayer[];
  onAddPlayer: (player: Player, position: 'regular' | 'bench') => void;
  filterRole: string;
  setFilterRole: (role: string) => void;
  league: League;
}> = ({ availablePlayers, selectedPlayers, onAddPlayer, filterRole, setFilterRole, league }) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredPlayers = availablePlayers.filter(player => {
    const isSelected = selectedPlayers.find(p => p.id === player.id);
    const roleMatch = filterRole === 'all' || player.role === filterRole;

    // Search functionality - match against name, team, or role
    const searchMatch = !searchQuery ||
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.role.toLowerCase().includes(searchQuery.toLowerCase());

    return !isSelected && roleMatch && searchMatch;
  });

  const PlayerCard: React.FC<{ player: Player }> = ({ player }) => (
    <Card sx={{ mb: { xs: 0.75, sm: 1 }, cursor: 'pointer', bgcolor: '#1a2332', '&:hover': { bgcolor: '#222b3d', transform: 'translateY(-1px)', boxShadow: 3 }, transition: 'all 0.2s ease' }}>
      <CardContent sx={{ p: { xs: 1, sm: 1.5, md: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 0.75, sm: 1 }, gap: { xs: 1, sm: 2 } }}>
          <Avatar sx={{ width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 }, bgcolor: '#090b47', color: 'white', fontSize: { xs: '0.875rem', sm: '1rem' }, fontWeight: 700 }}>
            {player.name.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' }, letterSpacing: '0.01em' }} noWrap>
              {player.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, opacity: 0.8 }} noWrap>
              {player.team} • {player.role}
            </Typography>
          </Box>
          <Chip
            label={player.stats[league.format].recentForm}
            size="small"
            color={player.stats[league.format].recentForm > 80 ? 'success' : player.stats[league.format].recentForm > 60 ? 'warning' : 'error'}
            sx={{
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
              height: { xs: 20, sm: 22 },
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums'
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 } }}>
          <Button
            size="small"
            variant="contained"
            onClick={() => onAddPlayer(player, 'regular')}
            sx={{
              minWidth: 'auto',
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.6, sm: 0.8 },
              width: league.transferTypes?.benchTransfers?.enabled ? '65%' : '100%',
              bgcolor: themeColors.blue.electric,
              color: 'white',
              '&:hover': {
                bgcolor: themeColors.blue.deep,
                transform: 'translateY(-1px)',
                boxShadow: themeColors.shadows.blue.md
              },
              transition: 'all 0.2s ease'
            }}
          >
            <PersonAdd sx={{ fontSize: { xs: 18, sm: 20 } }} />
          </Button>
          {league.transferTypes?.benchTransfers?.enabled && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => onAddPlayer(player, 'bench')}
              startIcon={<SwapHoriz sx={{ fontSize: { xs: 14, sm: 16 } }} />}
              sx={{
                fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.8rem' },
                fontWeight: 500,
                px: { xs: 0.75, sm: 1 },
                py: { xs: 0.4, sm: 0.6 },
                width: '35%',
                borderColor: themeColors.orange.primary,
                color: themeColors.orange.primary,
                '&:hover': {
                  borderColor: themeColors.orange.dark,
                  bgcolor: alpha(themeColors.orange.primary, 0.08),
                  color: themeColors.orange.dark
                }
              }}
            >
              Bench
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Card sx={{ opacity: 0.94, transition: 'opacity 0.3s ease', '&:hover': { opacity: 1 } }}>
      <CardContent sx={{ px: { xs: 1, sm: 1.5, md: 2 }, py: { xs: 1, sm: 1.5, md: 2 } }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }, fontWeight: 600, letterSpacing: '0.02em' }}>
          Player Selection
        </Typography>

        {/* Search Bar */}
        <TextField
          fullWidth
          placeholder="Search by name, team, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: { xs: 1.5, sm: 2 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')}>
                  <Close fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Role Filter */}
        <FormControl fullWidth sx={{ mb: { xs: 1.5, sm: 2 } }}>
          <InputLabel sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>Filter by Role</InputLabel>
          <Select
            value={filterRole}
            label="Filter by Role"
            onChange={(e) => setFilterRole(e.target.value)}
            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}
          >
            <MenuItem value="all" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>All Players</MenuItem>
            <MenuItem value="batsman" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>Batters</MenuItem>
            <MenuItem value="bowler" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>Bowlers</MenuItem>
            <MenuItem value="allrounder" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>All-rounders</MenuItem>
            <MenuItem value="wicketkeeper" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>Wicket-keepers</MenuItem>
          </Select>
        </FormControl>

        {/* Available Players */}
        <Box sx={{ maxHeight: { xs: 400, sm: 500, md: 600 }, overflow: 'auto' }}>
          {filteredPlayers.length > 0 ? (
            filteredPlayers.map(player => (
              <PlayerCard key={player.id} player={player} />
            ))
          ) : (
            <Box sx={{ textAlign: 'center', py: { xs: 3, sm: 4 } }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                No players available for selection
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default SquadSelectionPage;