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
  useTheme,
  alpha
} from '@mui/material';
import {
  PersonAdd,
  Close,
  SwapHoriz,
  Star
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

interface SelectedPlayer extends Player {
  position: 'regular' | 'bench';
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
  const [existingSquad, setExistingSquad] = useState<LeagueSquad | null>(null);
  const [isDeadlinePassed, setIsDeadlinePassed] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [isLeagueStarted, setIsLeagueStarted] = useState(false);
  const [canMakeTransfer, setCanMakeTransfer] = useState(false);

  // Predictions state
  const [topRunScorer, setTopRunScorer] = useState('');
  const [topWicketTaker, setTopWicketTaker] = useState('');
  const [seriesScoreline, setSeriesScoreline] = useState('');

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
            console.log('No existing squad found or error loading:', err);
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

    console.log('Loading existing squad:', existingSquad.id);
    console.log('Squad predictions:', existingSquad.predictions);

    // Restore captain, vice-captain, and X-factor IDs
    setCaptainId(existingSquad.captainId || null);
    setViceCaptainId(existingSquad.viceCaptainId || null);
    setXFactorId(existingSquad.xFactorId || null);

    // Load predictions if they exist
    if (existingSquad.predictions) {
      setTopRunScorer(existingSquad.predictions.topRunScorer || '');
      setTopWicketTaker(existingSquad.predictions.topWicketTaker || '');
      setSeriesScoreline(existingSquad.predictions.seriesScoreline || '');
      console.log('Predictions loaded:', {
        topRunScorer: existingSquad.predictions.topRunScorer,
        topWicketTaker: existingSquad.predictions.topWicketTaker,
        seriesScoreline: existingSquad.predictions.seriesScoreline
      });
    } else {
      console.log('No predictions found in existing squad');
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

    return mainSquadCount === league.squadSize &&
           counts.batsman >= league.squadRules.minBatsmen &&
           counts.bowler >= league.squadRules.minBowlers &&
           counts.wicketkeeper >= league.squadRules.minWicketkeepers &&
           counts.bench >= benchRequired &&
           captainId !== null &&
           viceCaptainId !== null &&
           xFactorId !== null &&
           captainId !== viceCaptainId &&
           captainId !== xFactorId &&
           viceCaptainId !== xFactorId &&
           topRunScorer.trim() !== '' &&
           topWicketTaker.trim() !== '' &&
           seriesScoreline.trim() !== '';
  };

  const calculateSquadPoints = (
    players: SquadPlayer[],
    captainId: string | null,
    viceCaptainId: string | null,
    xFactorId: string | null,
    bankedPoints: number = 0
  ): { totalPoints: number; captainPoints: number; viceCaptainPoints: number; xFactorPoints: number } => {
    let totalPoints = 0;
    let captainPoints = 0;
    let viceCaptainPoints = 0;
    let xFactorPoints = 0;

    players.forEach(player => {
      // Calculate effective points: only count points earned while in this squad
      const pointsAtJoining = player.pointsAtJoining ?? 0;
      const effectivePoints = Math.max(0, player.points - pointsAtJoining);

      let playerPoints = 0;

      if (captainId === player.playerId) {
        // Captain gets 2x points
        // Apply multiplier only to points earned AFTER becoming captain
        const pointsWhenRoleAssigned = player.pointsWhenRoleAssigned ?? pointsAtJoining;
        const basePoints = Math.max(0, pointsWhenRoleAssigned - pointsAtJoining); // Points before role
        const bonusPoints = Math.max(0, player.points - pointsWhenRoleAssigned); // Points after role

        const baseContribution = basePoints * 1.0;
        const bonusContribution = bonusPoints * 2.0;

        captainPoints = baseContribution + bonusContribution;
        playerPoints = captainPoints;
      } else if (viceCaptainId === player.playerId) {
        // Vice-captain gets 1.5x points
        const pointsWhenRoleAssigned = player.pointsWhenRoleAssigned ?? pointsAtJoining;
        const basePoints = Math.max(0, pointsWhenRoleAssigned - pointsAtJoining);
        const bonusPoints = Math.max(0, player.points - pointsWhenRoleAssigned);

        const baseContribution = basePoints * 1.0;
        const bonusContribution = bonusPoints * 1.5;

        viceCaptainPoints = baseContribution + bonusContribution;
        playerPoints = viceCaptainPoints;
      } else if (xFactorId === player.playerId) {
        // X-Factor gets 1.25x points
        const pointsWhenRoleAssigned = player.pointsWhenRoleAssigned ?? pointsAtJoining;
        const basePoints = Math.max(0, pointsWhenRoleAssigned - pointsAtJoining);
        const bonusPoints = Math.max(0, player.points - pointsWhenRoleAssigned);

        const baseContribution = basePoints * 1.0;
        const bonusContribution = bonusPoints * 1.25;

        xFactorPoints = baseContribution + bonusContribution;
        playerPoints = xFactorPoints;
      } else {
        // Regular player (no multiplier)
        playerPoints = effectivePoints;
      }

      totalPoints += playerPoints;
    });

    // Add banked points from previous transfers
    totalPoints += bankedPoints;

    return { totalPoints, captainPoints, viceCaptainPoints, xFactorPoints };
  };

  const handleSubmitSquad = async () => {
    if (!user || !league || !leagueId) return;
    if (!isSquadValid()) return;

    try {
      setSubmitting(true);
      setSubmitError('');

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
          predictions: {
            topRunScorer: topRunScorer.trim(),
            topWicketTaker: topWicketTaker.trim(),
            seriesScoreline: seriesScoreline.trim(),
          },
          isSubmitted: true,
          lastUpdated: new Date(),
        };

        // Only set submittedAt if not already submitted
        if (!existingSquad.isSubmitted) {
          updateData.submittedAt = new Date();
        }

        console.log('Updating squad with predictions:', updateData.predictions);
        await squadService.update(existingSquad.id, updateData);
        console.log('Squad updated successfully');

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
          predictions: {
            topRunScorer: topRunScorer.trim(),
            topWicketTaker: topWicketTaker.trim(),
            seriesScoreline: seriesScoreline.trim(),
          },
          rank: 0,
          matchPoints: {},
          transfersUsed: 0,
          transferHistory: [],
          bankedPoints: 0, // Initialize banked points to 0
          isValid: true,
          validationErrors: [],
          captainId: captainId || undefined,
          viceCaptainId: viceCaptainId || undefined,
          xFactorId: xFactorId || undefined,
        };

        console.log('Creating new squad with predictions:', squadData.predictions);
        const squadId = await squadService.create(squadData);
        console.log('Squad created successfully with ID:', squadId);

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
        console.log('Leaderboard snapshot created/updated after squad submission');
      } catch (snapshotError) {
        console.error('Error creating leaderboard snapshot:', snapshotError);
        // Don't fail the submission if snapshot creation fails
      }

      // Navigate to league dashboard
      navigate(`/leagues/${leagueId}`);
    } catch (error: any) {
      console.error('Error submitting squad:', error);
      setSubmitError(error.message || 'Failed to submit squad');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to calculate a player's current contribution (including role multiplier)
  const calculatePlayerContribution = (
    player: SquadPlayer,
    role: 'captain' | 'viceCaptain' | 'xFactor' | 'regular'
  ): number => {
    const pointsAtJoining = player.pointsAtJoining ?? 0;
    const pointsWhenRoleAssigned = player.pointsWhenRoleAssigned ?? pointsAtJoining;

    const basePoints = Math.max(0, pointsWhenRoleAssigned - pointsAtJoining);
    const bonusPoints = Math.max(0, player.points - pointsWhenRoleAssigned);

    if (role === 'captain') {
      return basePoints * 1.0 + bonusPoints * 2.0;
    } else if (role === 'viceCaptain') {
      return basePoints * 1.0 + bonusPoints * 1.5;
    } else if (role === 'xFactor') {
      return basePoints * 1.0 + bonusPoints * 1.25;
    } else {
      return Math.max(0, player.points - pointsAtJoining);
    }
  };

  const handleTransferSubmit = async (transferData: TransferData) => {
    if (!user || !league || !leagueId || !existingSquad) return;

    try {
      // Create a copy of the existing squad to modify
      let updatedPlayers = [...existingSquad.players];
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

          if (playerOutIndex === -1) throw new Error('Player to remove not found');
          if (playerInIndex === -1) throw new Error('Bench player not found');

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

          // AUTO-ASSIGN roles to incoming player if swapping out C/VC/X
          const incomingPlayerId = transferData.playerIn;

          if (transferData.playerOut === existingSquad.captainId) {
            // Incoming player becomes Captain
            updatedCaptainId = incomingPlayerId;
            const newCaptain = updatedPlayers.find(p => p.playerId === incomingPlayerId);
            if (newCaptain) {
              newCaptain.pointsWhenRoleAssigned = newCaptain.points;
            }
          }

          if (transferData.playerOut === existingSquad.viceCaptainId) {
            // Incoming player becomes Vice-Captain
            updatedViceCaptainId = incomingPlayerId;
            const newVC = updatedPlayers.find(p => p.playerId === incomingPlayerId);
            if (newVC) {
              newVC.pointsWhenRoleAssigned = newVC.points;
            }
          }

          if (transferData.playerOut === existingSquad.xFactorId) {
            // Incoming player becomes X-Factor
            updatedXFactorId = incomingPlayerId;
            const newX = updatedPlayers.find(p => p.playerId === incomingPlayerId);
            if (newX) {
              newX.pointsWhenRoleAssigned = newX.points;
            }
          }
        } else {
          // FLEXIBLE/MID-SEASON TRANSFER: Replace with a new player from outside the squad
          const playerOutIndex = updatedPlayers.findIndex(p => p.playerId === transferData.playerOut);
          if (playerOutIndex === -1) throw new Error('Player to remove not found');

          // Calculate points to bank from the player leaving the squad
          const playerLeaving = updatedPlayers[playerOutIndex];
          let playerRole: 'captain' | 'viceCaptain' | 'xFactor' | 'regular' = 'regular';
          if (playerLeaving.playerId === existingSquad.captainId) playerRole = 'captain';
          else if (playerLeaving.playerId === existingSquad.viceCaptainId) playerRole = 'viceCaptain';
          else if (playerLeaving.playerId === existingSquad.xFactorId) playerRole = 'xFactor';

          additionalBankedPoints = calculatePlayerContribution(playerLeaving, playerRole);

          // Get the full player data for the incoming player
          const incomingPlayer = availablePlayers.find(p => p.id === transferData.playerIn);
          if (!incomingPlayer) throw new Error('Incoming player not found');

          // Create new squad player using transfer method (snapshots current points)
          const newSquadPlayer = squadPlayerUtils.createTransferSquadPlayer({
            playerId: incomingPlayer.id,
            playerName: incomingPlayer.name,
            team: incomingPlayer.team,
            role: incomingPlayer.role,
            points: incomingPlayer.stats[league.format].recentForm || 0,
          });

          // Use auto-slotting algorithm to intelligently place the new player
          updatedPlayers = performAutoSlot(
            updatedPlayers,
            transferData.playerOut,
            newSquadPlayer,
            league
          );
        }
      } else if (transferData.changeType === 'roleReassignment') {
        // ROLE REASSIGNMENT: Change VC or X-Factor

        // Handle VC reassignment
        if (transferData.newViceCaptainId && transferData.newViceCaptainId !== existingSquad.viceCaptainId) {
          // Bank the multiplier bonus from the old VC
          if (existingSquad.viceCaptainId) {
            const oldVC = updatedPlayers.find(p => p.playerId === existingSquad.viceCaptainId);
            if (oldVC) {
              const pointsAtJoining = oldVC.pointsAtJoining ?? 0;
              const effectivePoints = Math.max(0, oldVC.points - pointsAtJoining);
              const multiplierBonus = effectivePoints * (1.5 - 1.0); // 0.5
              additionalBankedPoints += multiplierBonus;
            }
          }

          // Set pointsWhenRoleAssigned for the new VC
          const newVC = updatedPlayers.find(p => p.playerId === transferData.newViceCaptainId);
          if (newVC) {
            newVC.pointsWhenRoleAssigned = newVC.points;
          }

          updatedViceCaptainId = transferData.newViceCaptainId;
        }

        // Handle X-Factor reassignment
        if (transferData.newXFactorId && transferData.newXFactorId !== existingSquad.xFactorId) {
          // Bank the multiplier bonus from the old X
          if (existingSquad.xFactorId) {
            const oldX = updatedPlayers.find(p => p.playerId === existingSquad.xFactorId);
            if (oldX) {
              const pointsAtJoining = oldX.pointsAtJoining ?? 0;
              const effectivePoints = Math.max(0, oldX.points - pointsAtJoining);
              const multiplierBonus = effectivePoints * (1.25 - 1.0); // 0.25
              additionalBankedPoints += multiplierBonus;
            }
          }

          // Set pointsWhenRoleAssigned for the new X
          const newX = updatedPlayers.find(p => p.playerId === transferData.newXFactorId);
          if (newX) {
            newX.pointsWhenRoleAssigned = newX.points;
          }

          updatedXFactorId = transferData.newXFactorId;
        }
      }

      // Calculate new banked points total
      const newBankedPoints = (existingSquad.bankedPoints || 0) + additionalBankedPoints;

      // Calculate new points (including banked points)
      const calculatedPoints = calculateSquadPoints(
        updatedPlayers,
        updatedCaptainId || null,
        updatedViceCaptainId || null,
        updatedXFactorId || null,
        newBankedPoints
      );

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

      // Update the squad
      const updatePayload: any = {
        players: updatedPlayers,
        totalPoints: calculatedPoints.totalPoints,
        captainPoints: calculatedPoints.captainPoints,
        viceCaptainPoints: calculatedPoints.viceCaptainPoints,
        xFactorPoints: calculatedPoints.xFactorPoints,
        bankedPoints: newBankedPoints,
        transfersUsed: (existingSquad.transfersUsed || 0) + 1,
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
    } catch (error: any) {
      console.error('Error submitting transfer:', error);
      throw error; // Re-throw to let the modal handle it
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
      const newPlayer: SelectedPlayer = { ...player, position: targetPosition };
      console.log(`Adding player ${player.name} to ${targetPosition} position. Total main squad: ${currentMainSquad + (targetPosition === 'regular' ? 1 : 0)}/${league.squadSize}`);
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
              label={`${league.transferTypes.benchTransfers.maxAllowed - (existingSquad?.transfersUsed || 0)} Bench Available`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: 20, sm: 24 } }}
            />
          )}
          {league.transferTypes.midSeasonTransfers.enabled && (
            <Chip
              label={`Mid-Season Available`}
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: 20, sm: 24 } }}
            />
          )}
          {league.transferTypes.flexibleTransfers.enabled && (
            <Chip
              label={`Flexible Available`}
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: 20, sm: 24 } }}
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
        <Button
          variant="contained"
          color={isDeadlinePassed ? "inherit" : "success"}
          disabled={!isSquadValid() || submitting || isDeadlinePassed}
          startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Star />}
          onClick={handleSubmitSquad}
          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1.5, sm: 2 }, py: { xs: 0.5, sm: 1 } }}
        >
          {getSubmitButtonText()}
        </Button>
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

        {submitError && (
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
          boxShadow: `0 4px 16px ${alpha('#000', 0.3)}`
        }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' }, mb: 2 }}>
              Squad Summary
            </Typography>
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
              {league?.transferTypes?.benchTransfers?.enabled && (
                <Chip
                  label={
                    isDeadlinePassed
                      ? `${league.transferTypes.benchTransfers.maxAllowed - (existingSquad?.transfersUsed || 0)} Bench Transfer${league.transferTypes.benchTransfers.maxAllowed - (existingSquad?.transfersUsed || 0) === 1 ? '' : 's'} Available`
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
                label={`Predictions: ${topRunScorer && topWicketTaker && seriesScoreline ? 'Complete' : 'Incomplete'}`}
                variant={topRunScorer && topWicketTaker && seriesScoreline ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                  height: { xs: 28, sm: 32 },
                  bgcolor: topRunScorer && topWicketTaker && seriesScoreline ? alpha(theme.palette.secondary.main, 0.15) : 'transparent',
                  borderColor: topRunScorer && topWicketTaker && seriesScoreline ? theme.palette.secondary.main : alpha(theme.palette.text.secondary, 0.3),
                  color: topRunScorer && topWicketTaker && seriesScoreline ? theme.palette.secondary.main : 'text.secondary'
                }}
              />
            </Box>
          </CardContent>
        </Card>

        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {/* Left Panel - Squad Formation */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <CricketPitchFormation
              league={league}
              selectedPlayers={selectedPlayers}
              onRemovePlayer={removePlayerFromSquad}
              onUpdatePosition={updatePlayerPosition}
              powerplayMatch={powerplayMatch}
              setPowerplayMatch={setPowerplayMatch}
              powerplayMatches={[]}
              captainId={captainId}
              viceCaptainId={viceCaptainId}
              xFactorId={xFactorId}
              onSetSpecialRole={setPlayerAsSpecialRole}
            />
          </Grid>

          {/* Right Panel - Player Selection */}
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
        </Grid>

        {/* Predictions Section */}
        <Card sx={{ mt: { xs: 2, sm: 3 }, background: 'linear-gradient(135deg, rgba(255, 0, 93, 0.1), rgba(0, 229, 255, 0.05))' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Make Your Predictions *
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Predict the top performers and series outcome. All predictions are required to submit your squad.
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
                  error={topRunScorer.trim() === ''}
                  helperText={topRunScorer.trim() === '' ? 'Required' : ''}
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
                  error={topWicketTaker.trim() === ''}
                  helperText={topWicketTaker.trim() === '' ? 'Required' : ''}
                  InputProps={{
                    startAdornment: <Box sx={{ mr: 1, color: 'error.main' }}>⚡</Box>
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  required
                  label="Series Scoreline"
                  placeholder="e.g., 3-1 or 2-2"
                  value={seriesScoreline}
                  onChange={(e) => setSeriesScoreline(e.target.value)}
                  variant="outlined"
                  size="small"
                  error={seriesScoreline.trim() === ''}
                  helperText={seriesScoreline.trim() === '' ? 'Required' : ''}
                  InputProps={{
                    startAdornment: <Box sx={{ mr: 1, color: 'success.main' }}>📊</Box>
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
  powerplayMatches: any[];
  captainId: string | null;
  viceCaptainId: string | null;
  xFactorId: string | null;
  onSetSpecialRole: (playerId: string, role: 'captain' | 'vice_captain' | 'x_factor' | null) => void;
}> = ({ league, selectedPlayers, onRemovePlayer, onUpdatePosition, powerplayMatch, setPowerplayMatch, powerplayMatches, captainId, viceCaptainId, xFactorId, onSetSpecialRole }) => {

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
        case 'batsman': return { bg: '#E8F5E9', border: '#4CAF50' };
        case 'bowler': return { bg: '#E3F2FD', border: '#2196F3' };
        case 'allrounder': return { bg: '#F3E5F5', border: '#9C27B0' };
        case 'wicketkeeper': return { bg: '#FFF9C4', border: '#FFC107' };
        default: return { bg: '#ECEFF1', border: '#607D8B' };
      }
    } else if (slotType === 'flexible') {
      return { bg: '#E8EAF6', border: '#3F51B5' };
    } else {
      return { bg: '#FFF3E0', border: '#FF9800' };
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
    const canAssignRoles = player && slotType !== 'bench';

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
          bgcolor: player ? 'background.paper' : colors.bg,
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            bgcolor: player ? 'action.hover' : colors.bg,
            transform: 'translateY(-4px) scale(1.02)',
            boxShadow: player ? '0 12px 24px rgba(0,0,0,0.15)' : `0 8px 16px ${colors.border}55`
          }
        }}
      >
        {player ? (
          <>
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

            <Avatar sx={{ width: { xs: 24, sm: 28, md: 32 }, height: { xs: 24, sm: 28, md: 32 }, mb: 0.5, bgcolor: 'primary.main', fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>
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

            {/* Captain/Vice Captain/X-Factor badges */}
            {isCaptain && (
              <Box sx={{ position: 'absolute', top: { xs: -4, sm: -5 }, left: { xs: -4, sm: -5 } }}>
                <Chip label="C" size="small" color="warning" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, height: { xs: 16, sm: 18 }, fontWeight: 'bold' }} />
              </Box>
            )}
            {isViceCaptain && (
              <Box sx={{ position: 'absolute', top: { xs: -4, sm: -5 }, left: { xs: -4, sm: -5 } }}>
                <Chip label="VC" size="small" color="info" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, height: { xs: 16, sm: 18 }, fontWeight: 'bold' }} />
              </Box>
            )}
            {isXFactor && (
              <Box sx={{ position: 'absolute', top: { xs: -4, sm: -5 }, left: { xs: -4, sm: -5 } }}>
                <Chip label="X" size="small" color="secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, height: { xs: 16, sm: 18 }, fontWeight: 'bold' }} />
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
                    bgcolor: isViceCaptain ? 'info.main' : 'action.hover',
                    color: isViceCaptain ? 'info.contrastText' : 'text.primary',
                    '&:hover': { bgcolor: isViceCaptain ? 'info.dark' : 'info.light' },
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
                    bgcolor: isXFactor ? 'secondary.main' : 'action.hover',
                    color: isXFactor ? 'secondary.contrastText' : 'text.primary',
                    '&:hover': { bgcolor: isXFactor ? 'secondary.dark' : 'secondary.light' },
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
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}
              >
                {powerplayMatches.map((match) => (
                  <MenuItem key={match.id} value={match.id} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>
                    {match.name} - {match.date}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        {/* Cricket Field Background */}
        <Box
          sx={{
            background: 'linear-gradient(180deg, #2E7D32 0%, #1B5E20 100%)',
            borderRadius: { xs: 1.5, sm: 2, md: 3 },
            position: 'relative',
            overflow: 'visible',
            boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
            minHeight: { xs: 500, sm: 600, md: 700, lg: 800 },
            pb: { xs: 1.5, sm: 2, md: 3 },
            // Outer boundary rope
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '40px',
              left: '5%',
              right: '5%',
              bottom: '40px',
              borderRadius: '50%',
              border: '4px solid #FFFFFF',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2), 0 0 10px rgba(255,255,255,0.5)',
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
                  bgcolor: 'rgba(76, 175, 80, 0.7)',
                  px: { xs: 1.5, sm: 2, md: 2.5 },
                  py: { xs: 0.5, sm: 0.75 },
                  borderRadius: '20px',
                  mb: { xs: 1, sm: 1.5, md: 2 },
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}>
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>
                    Batters
                  </Typography>
                  <Chip
                    label={`${league.squadRules.minBatsmen} Required`}
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
                  bgcolor: 'rgba(76, 175, 80, 0.7)',
                  px: { xs: 1.5, sm: 2, md: 2.5 },
                  py: { xs: 0.5, sm: 0.75 },
                  borderRadius: '20px',
                  mb: { xs: 1, sm: 1.5, md: 2 },
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}>
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>
                    Bowlers
                  </Typography>
                  <Chip
                    label={`${league.squadRules.minBowlers} Required`}
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
                    bgcolor: 'rgba(96, 125, 139, 0.8)',
                    px: { xs: 1.5, sm: 2, md: 2.5 },
                    py: { xs: 0.5, sm: 0.75 },
                    borderRadius: '20px',
                    mb: { xs: 1, sm: 1.5, md: 2 },
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}>
                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>
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

  const filteredPlayers = availablePlayers.filter(player => {
    const isSelected = selectedPlayers.find(p => p.id === player.id);
    const roleMatch = filterRole === 'all' || player.role === filterRole;
    return !isSelected && roleMatch;
  });

  const PlayerCard: React.FC<{ player: Player }> = ({ player }) => (
    <Card sx={{ mb: { xs: 0.75, sm: 1 }, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
      <CardContent sx={{ p: { xs: 1, sm: 1.5, md: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 0.75, sm: 1 }, gap: { xs: 1, sm: 2 } }}>
          <Avatar sx={{ width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 }, bgcolor: 'primary.main', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            {player.name.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} noWrap>
              {player.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }} noWrap>
              {player.team} • {player.role}
            </Typography>
          </Box>
          <Chip
            label={player.stats[league.format].recentForm}
            size="small"
            color={player.stats[league.format].recentForm > 80 ? 'success' : player.stats[league.format].recentForm > 60 ? 'warning' : 'error'}
            sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: 18, sm: 20 } }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="contained"
            onClick={() => onAddPlayer(player, 'regular')}
            startIcon={<PersonAdd sx={{ fontSize: { xs: 14, sm: 16 } }} />}
            sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.875rem' }, px: { xs: 0.75, sm: 1 }, py: { xs: 0.25, sm: 0.5 } }}
          >
            Add to Squad
          </Button>
          {league.transferTypes?.benchTransfers?.enabled && (
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              onClick={() => onAddPlayer(player, 'bench')}
              startIcon={<SwapHoriz sx={{ fontSize: { xs: 14, sm: 16 } }} />}
              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.875rem' }, px: { xs: 0.75, sm: 1 }, py: { xs: 0.25, sm: 0.5 } }}
            >
              Add to Bench
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardContent sx={{ px: { xs: 1, sm: 1.5, md: 2 }, py: { xs: 1, sm: 1.5, md: 2 } }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' } }}>
          Player Selection
        </Typography>

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