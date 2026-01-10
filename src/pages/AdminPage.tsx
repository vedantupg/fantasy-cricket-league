import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Avatar,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  ArrowBack,
  Undo,
  SwapHoriz
} from '@mui/icons-material';
import { leagueService, squadService, playerPoolService, playerPoolSnapshotService, leaderboardSnapshotService, transferService } from '../services/firestore';
import type { League, LeagueSquad, LeaderboardSnapshot, PlayerPool, PlayerPoolSnapshot, Transfer } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  // Transfer Management State
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [squads, setSquads] = useState<LeagueSquad[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    squadId: string;
    transferIndex: number;
    transferData: any;
  }>({ open: false, squadId: '', transferIndex: -1, transferData: null });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Role Fix State
  const [brokenSquads, setBrokenSquads] = useState<Array<{
    squad: LeagueSquad;
    missingRoles: string[];
  }>>([]);
  const [roleFixDialog, setRoleFixDialog] = useState<{
    open: boolean;
    squad: LeagueSquad | null;
    missingRole: 'captain' | 'viceCaptain' | 'xFactor' | null;
  }>({ open: false, squad: null, missingRole: null });
  const [selectedPlayerForRole, setSelectedPlayerForRole] = useState<string>('');

  // Points Recalculation State
  const [recalculating, setRecalculating] = useState(false);
  const [recalcResults, setRecalcResults] = useState<{
    squadName: string;
    oldPoints: number;
    newPoints: number;
    bankedPoints?: number; // Optional: only present for reconstruction results
  }[]>([]);
  const [availableSnapshots, setAvailableSnapshots] = useState<LeaderboardSnapshot[]>([]);
  const [showSnapshotDialog, setShowSnapshotDialog] = useState(false);
  const [snapshotDialogMode, setSnapshotDialogMode] = useState<'restore' | 'recalculate'>('restore');

  // Single Squad Recalculation State
  const [selectedSquadForRecalc, setSelectedSquadForRecalc] = useState<string>('');
  const [customBankedPoints, setCustomBankedPoints] = useState<number | null>(null);
  const [singleSquadRoleFixed, setSingleSquadRoleFixed] = useState<boolean>(false);
  const [customRoleTimestamps, setCustomRoleTimestamps] = useState<{
    captain: number | null;
    viceCaptain: number | null;
    xFactor: number | null;
  }>({ captain: null, viceCaptain: null, xFactor: null });

  // Transfer Investigation State
  const [selectedSquadForInvestigation, setSelectedSquadForInvestigation] = useState<string>('');
  const [expandedTransferIndex, setExpandedTransferIndex] = useState<number | null>(null);
  const [singleSquadRecalcResult, setSingleSquadRecalcResult] = useState<{
    squadName: string;
    oldPoints: number;
    newPoints: number;
    breakdown?: {
      playerBreakdown: Array<{
        name: string;
        points: number;
        pointsAtJoining: number;
        contribution: number;
        role?: string;
        multiplier?: number;
      }>;
      captainPoints: number;
      viceCaptainPoints: number;
      xFactorPoints: number;
      bankedPoints: number;
    };
  } | null>(null);

  // Player Pool History State
  const [playerPools, setPlayerPools] = useState<PlayerPool[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');
  const [poolSnapshots, setPoolSnapshots] = useState<PlayerPoolSnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);

  // Transfer History State
  const [transferHistoryLeagueId, setTransferHistoryLeagueId] = useState<string>('');
  const [transfers, setTransfers] = useState<any[]>([]); // TransferHistoryEntry with additional fields
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [transferSnapshots, setTransferSnapshots] = useState<PlayerPoolSnapshot[]>([]);
  const [playerNameMap, setPlayerNameMap] = useState<Map<string, string>>(new Map());

  // Load leagues on mount
  useEffect(() => {
    const loadLeagues = async () => {
      if (!user) return;
      try {
        const userLeagues = await leagueService.getForUser(user.uid);
        setLeagues(userLeagues);
      } catch (error) {
        console.error('Error loading leagues:', error);
      }
    };
    loadLeagues();
  }, [user]);

  // Load squads when league is selected
  useEffect(() => {
    if (selectedLeagueId) {
      loadSquads();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeagueId]);

  // Load player pools on mount
  useEffect(() => {
    const loadPlayerPools = async () => {
      if (!user) return;
      try {
        const pools = await playerPoolService.getAll();
        setPlayerPools(pools);
      } catch (error) {
        console.error('Error loading player pools:', error);
      }
    };
    loadPlayerPools();
  }, [user]);

  // Load snapshots when pool is selected
  useEffect(() => {
    const loadSnapshots = async () => {
      if (!selectedPoolId) {
        setPoolSnapshots([]);
        return;
      }

      try {
        setLoadingSnapshots(true);
        const snapshots = await playerPoolSnapshotService.getByPoolId(selectedPoolId);
        setPoolSnapshots(snapshots);
      } catch (error) {
        console.error('Error loading snapshots:', error);
      } finally {
        setLoadingSnapshots(false);
      }
    };
    loadSnapshots();
  }, [selectedPoolId]);

  // Load transfers and snapshots for Transfer History tab
  useEffect(() => {
    const loadTransferHistory = async () => {
      if (!transferHistoryLeagueId) {
        setTransfers([]);
        setTransferSnapshots([]);
        setPlayerNameMap(new Map());
        return;
      }

      try {
        setLoadingTransfers(true);

        // Fetch all squads for the league
        console.log('🔍 DEBUG: Fetching squads for league:', transferHistoryLeagueId);
        const leagueSquads = await squadService.getByLeague(transferHistoryLeagueId);
        console.log('🔍 DEBUG: Found squads:', leagueSquads.length);

        // Extract all transfer history entries from all squads
        const allTransfers: any[] = [];
        leagueSquads.forEach(squad => {
          if (squad.transferHistory && squad.transferHistory.length > 0) {
            // Add squad info to each transfer entry
            squad.transferHistory.forEach(transfer => {
              allTransfers.push({
                ...transfer,
                squadId: squad.id,
                userId: squad.userId,
                squadName: squad.squadName,
              });
            });
          }
        });

        console.log('🔍 DEBUG: Found transfer history entries:', allTransfers.length, allTransfers);

        // Sort by timestamp (newest first)
        allTransfers.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setTransfers(allTransfers as any);

        // Fetch the league to get player pool ID
        const league = leagues.find(l => l.id === transferHistoryLeagueId);
        if (league?.playerPoolId) {
          // Fetch player pool snapshots for grouping
          const snapshots = await playerPoolSnapshotService.getByPoolId(league.playerPoolId);
          setTransferSnapshots(snapshots);

          // Fetch player pool to map player IDs to names
          const playerPool = await playerPoolService.getById(league.playerPoolId);
          if (playerPool) {
            const nameMap = new Map<string, string>();
            playerPool.players.forEach(player => {
              nameMap.set(player.playerId, player.name);
            });
            setPlayerNameMap(nameMap);
            console.log('🔍 DEBUG: Created player name map with', nameMap.size, 'players');
          }
        }
      } catch (error) {
        console.error('Error loading transfer history:', error);
        setErrorMessage('Failed to load transfer history');
      } finally {
        setLoadingTransfers(false);
      }
    };
    loadTransferHistory();
  }, [transferHistoryLeagueId, leagues]);

  const loadSquads = async () => {
    if (!selectedLeagueId) return;

    try {
      setLoading(true);
      const leagueSquads = await squadService.getByLeague(selectedLeagueId);
      const selectedLeague = leagues.find(l => l.id === selectedLeagueId);
      const squadSize = selectedLeague?.squadSize || 11;

      // Only show squads with transfer history
      const squadsWithTransfers = leagueSquads.filter(
        s => s.transferHistory && s.transferHistory.length > 0
      );
      setSquads(squadsWithTransfers);

      // Scan for broken squads (missing C/VC/X)
      const broken: Array<{ squad: LeagueSquad; missingRoles: string[] }> = [];
      for (const squad of leagueSquads.filter(s => s.isSubmitted)) {
        const missingRoles: string[] = [];
        const mainSquadPlayerIds = squad.players.slice(0, squadSize).map(p => p.playerId);

        // Check if Captain exists in main squad
        if (!squad.captainId || !mainSquadPlayerIds.includes(squad.captainId)) {
          missingRoles.push('Captain');
        }

        // Check if Vice-Captain exists in main squad
        if (!squad.viceCaptainId || !mainSquadPlayerIds.includes(squad.viceCaptainId)) {
          missingRoles.push('Vice-Captain');
        }

        // Check if X-Factor exists in main squad
        if (!squad.xFactorId || !mainSquadPlayerIds.includes(squad.xFactorId)) {
          missingRoles.push('X-Factor');
        }

        if (missingRoles.length > 0) {
          broken.push({ squad, missingRoles });
        }
      }
      setBrokenSquads(broken);
    } catch (error) {
      console.error('Error loading squads:', error);
      setErrorMessage('Failed to load squads');
    } finally {
      setLoading(false);
    }
  };

  const handleReverseTransferClick = (squadId: string, transferIndex: number, transferData: any) => {
    setConfirmDialog({
      open: true,
      squadId,
      transferIndex,
      transferData
    });
  };

  const handleConfirmReverse = async () => {
    const { squadId, transferIndex, transferData } = confirmDialog;

    try {
      setLoading(true);
      setErrorMessage('');
      setSuccessMessage('');

      const squad = squads.find(s => s.id === squadId);
      if (!squad) {
        throw new Error('Squad not found');
      }

      const league = leagues.find(l => l.id === selectedLeagueId);
      if (!league) {
        throw new Error('League not found');
      }

      // Call the reverse transfer logic
      await reverseTransfer(squad, transferData, transferIndex, league);

      setSuccessMessage('Transfer reversed successfully!');
      setConfirmDialog({ open: false, squadId: '', transferIndex: -1, transferData: null });

      // Reload squads to show updated data
      await loadSquads();
    } catch (error: any) {
      console.error('Error reversing transfer:', error);
      setErrorMessage(error.message || 'Failed to reverse transfer');
    } finally {
      setLoading(false);
    }
  };

  const reverseTransfer = async (
    squad: LeagueSquad,
    transfer: any,
    transferIndex: number,
    league: League
  ) => {
    let updatedPlayers = [...squad.players];
    let updatedCaptainId = squad.captainId;
    let updatedViceCaptainId = squad.viceCaptainId;
    let updatedXFactorId = squad.xFactorId;

    if (transfer.changeType === 'playerSubstitution') {
      const playerOutId = transfer.playerOut;
      const playerInId = transfer.playerIn;

      if (!playerOutId || !playerInId) {
        throw new Error('Invalid transfer: missing player IDs');
      }

      const playerOutIndex = updatedPlayers.findIndex(p => p.playerId === playerOutId);
      const playerInIndex = updatedPlayers.findIndex(p => p.playerId === playerInId);

      if (playerInIndex === -1) {
        throw new Error('Player IN not found in current squad');
      }

      if (transfer.transferType === 'bench') {
        // REVERSE BENCH TRANSFER: Swap them back
        if (playerOutIndex === -1) {
          throw new Error('Player OUT not found in squad');
        }

        // Swap back
        const temp = updatedPlayers[playerOutIndex];
        updatedPlayers[playerOutIndex] = updatedPlayers[playerInIndex];
        updatedPlayers[playerInIndex] = temp;
      } else {
        // REVERSE FLEXIBLE/MID-SEASON: Remove incoming player, need to handle differently
        // The playerOut is NOT in the squad anymore, so we can't swap
        // We need to remove playerIn from the main squad

        if (playerOutIndex !== -1) {
          // playerOut is still in squad (maybe on bench), so we can do a swap-like operation
          // Move playerIn to where playerOut is, then remove playerOut
          const playerIn = updatedPlayers[playerInIndex];
          updatedPlayers = updatedPlayers.filter((p, idx) => idx !== playerInIndex);

          // Find playerOut and swap position
          const newPlayerOutIndex = updatedPlayers.findIndex(p => p.playerId === playerOutId);
          if (newPlayerOutIndex !== -1) {
            // Replace playerOut position with playerIn, move playerOut to bench/removed
            updatedPlayers[newPlayerOutIndex] = playerIn;
          }
        } else {
          // playerOut is completely gone from squad
          // Simply remove playerIn from the squad
          updatedPlayers = updatedPlayers.filter(p => p.playerId !== playerInId);

          // Note: In a real reversal, we'd need to restore playerOut from historical data
          // For now, we'll leave a gap or mark this as a partial reversal
          throw new Error(
            'Cannot fully reverse this transfer: outgoing player data not available. ' +
            'This transfer removed a player from the squad entirely.'
          );
        }
      }

      // Check if roles were auto-assigned during the transfer and need to be restored
      // This is tricky because we don't have the "before" state stored
      // For now, we'll leave roles as-is unless explicitly changed
    } else if (transfer.changeType === 'roleReassignment') {
      // REVERSE ROLE REASSIGNMENT
      // This is complex because we don't know what the previous VC/X was
      // We'd need to look at the transfer history before this point
      // For now, throw an error suggesting manual adjustment
      throw new Error(
        'Role reassignment reversal requires manual adjustment. ' +
        'Please manually set the Vice-Captain and X-Factor back to their previous values.'
      );
    }

    // Decrement transfer counts
    const updatedTransfersUsed = Math.max(0, (squad.transfersUsed || 0) - 1);
    let updatedBenchTransfersUsed = squad.benchTransfersUsed || 0;
    let updatedFlexibleTransfersUsed = squad.flexibleTransfersUsed || 0;
    let updatedMidSeasonTransfersUsed = squad.midSeasonTransfersUsed || 0;

    if (transfer.transferType === 'bench') {
      updatedBenchTransfersUsed = Math.max(0, updatedBenchTransfersUsed - 1);
    } else if (transfer.transferType === 'flexible') {
      updatedFlexibleTransfersUsed = Math.max(0, updatedFlexibleTransfersUsed - 1);
    } else if (transfer.transferType === 'midSeason') {
      updatedMidSeasonTransfersUsed = Math.max(0, updatedMidSeasonTransfersUsed - 1);
    }

    // Calculate points (simplified - actual implementation would need the full calculateSquadPoints function)
    // For now, we'll just keep the existing points structure
    const calculatedPoints = {
      totalPoints: squad.totalPoints,
      captainPoints: squad.captainPoints,
      viceCaptainPoints: squad.viceCaptainPoints,
      xFactorPoints: squad.xFactorPoints
    };

    // Add reversal note to history
    const reversalNote = {
      timestamp: new Date(),
      transferType: 'admin_reversal' as any,
      changeType: 'admin_reversal' as any,
      note: `Transfer #${transferIndex + 1} reversed by admin`,
      reversedTransferIndex: transferIndex
    };

    // Remove the reversed transfer from history and add reversal note
    const updatedHistory = [...(squad.transferHistory || [])];
    updatedHistory.splice(transferIndex, 1); // Remove the reversed transfer
    updatedHistory.push(reversalNote); // Add reversal note

    // Update the squad in Firestore
    await squadService.update(squad.id, {
      players: updatedPlayers,
      captainId: updatedCaptainId,
      viceCaptainId: updatedViceCaptainId,
      xFactorId: updatedXFactorId,
      transfersUsed: updatedTransfersUsed,
      benchTransfersUsed: updatedBenchTransfersUsed,
      flexibleTransfersUsed: updatedFlexibleTransfersUsed,
      midSeasonTransfersUsed: updatedMidSeasonTransfersUsed,
      transferHistory: updatedHistory,
      totalPoints: calculatedPoints.totalPoints,
      captainPoints: calculatedPoints.captainPoints,
      viceCaptainPoints: calculatedPoints.viceCaptainPoints,
      xFactorPoints: calculatedPoints.xFactorPoints,
      lastUpdated: new Date()
    });
  };

  const handleRecalculatePoints = async () => {
    if (!selectedLeagueId) {
      setErrorMessage('Please select a league first');
      return;
    }

    const confirmed = window.confirm(
      'This will:\n' +
      '1. Preserve all user transfers (squad changes)\n' +
      '2. Restore points to baseline (before transfers)\n' +
      '3. Fix the math so transfers are points-neutral\n\n' +
      'You need to select the baseline snapshot (e.g., "ASHES 25/26"). Continue?'
    );
    if (!confirmed) return;

    try {
      setRecalculating(true);
      setErrorMessage('');
      setSuccessMessage('');

      // Show snapshot selection first
      const allSnapshots = await leaderboardSnapshotService.getByLeague(selectedLeagueId);
      if (allSnapshots.length === 0) {
        setErrorMessage('No snapshots available. Please create a snapshot first.');
        return;
      }

      setAvailableSnapshots(allSnapshots);
      setSnapshotDialogMode('recalculate');
      setShowSnapshotDialog(true);
      setErrorMessage('Please select the baseline snapshot (e.g., "ASHES 25/26") to use for recalculation.');
    } catch (error: any) {
      console.error('Error fetching snapshots:', error);
      setErrorMessage(error.message || 'Failed to fetch snapshots');
    } finally {
      setRecalculating(false);
    }
  };

  const handleRestoreFromSnapshot = async () => {
    if (!selectedLeagueId) {
      setErrorMessage('Please select a league first');
      return;
    }

    try {
      setRecalculating(true);
      setErrorMessage('');
      setSuccessMessage('');

      // Get all snapshots for this league
      const allSnapshots = await leaderboardSnapshotService.getByLeague(selectedLeagueId);
      if (allSnapshots.length === 0) {
        setErrorMessage('No snapshots available to restore from.');
        setRecalculating(false);
        return;
      }

      setAvailableSnapshots(allSnapshots);
      setSnapshotDialogMode('restore');
      setShowSnapshotDialog(true);
      setErrorMessage('Select the snapshot you want to restore points from (e.g., your "good" stable leaderboard).');
    } catch (error: any) {
      console.error('Error fetching snapshots:', error);
      setErrorMessage(error.message || 'Failed to fetch snapshots');
      setRecalculating(false);
    }
  };

  const handleRestoreWithSnapshot = async (snapshotId: string) => {
    if (!selectedLeagueId) return;

    try {
      setRecalculating(true);
      setErrorMessage('');
      setSuccessMessage('');
      setShowSnapshotDialog(false);

      const selectedSnapshot = availableSnapshots.find(s => s.id === snapshotId);
      if (!selectedSnapshot) {
        throw new Error('Snapshot not found');
      }

      // Get current squads
      const currentSquads = await squadService.getByLeague(selectedLeagueId);

      let restoredCount = 0;

      // Restore each squad's points from the snapshot
      for (const squad of currentSquads) {
        const snapshotStanding = selectedSnapshot.standings.find(s => s.squadId === squad.id);
        if (!snapshotStanding) {
          console.warn(`Squad ${squad.squadName} not found in snapshot, skipping`);
          continue;
        }

        // Restore the points from snapshot
        await squadService.update(squad.id, {
          totalPoints: snapshotStanding.totalPoints,
          captainPoints: snapshotStanding.captainPoints,
          viceCaptainPoints: snapshotStanding.viceCaptainPoints,
          xFactorPoints: snapshotStanding.xFactorPoints,
          lastUpdated: new Date(),
        });

        restoredCount++;
      }

      setSuccessMessage(`✅ Restored ${restoredCount} squads from snapshot: ${selectedSnapshot.playerPoolVersion || new Date(selectedSnapshot.snapshotDate).toLocaleString()}`);

      // Create a new snapshot with restored data
      await leaderboardSnapshotService.create(selectedLeagueId);

      // Reload squads
      await loadSquads();
    } catch (error: any) {
      console.error('Error restoring from snapshot:', error);
      setErrorMessage(error.message || 'Failed to restore from snapshot');
    } finally {
      setRecalculating(false);
    }
  };

  const handleReconstructBankedPoints = async () => {
    if (!selectedLeagueId) {
      setErrorMessage('Please select a league first');
      return;
    }

    const confirmed = window.confirm(
      'ADD BANKED POINTS TO TOTAL POINTS\n\n' +
      'This will fix the transfer bug by adding existing bankedPoints to totalPoints.\n\n' +
      'For each squad with bankedPoints > 0:\n' +
      '  newTotalPoints = currentTotalPoints + bankedPoints\n\n' +
      'Continue?'
    );
    if (!confirmed) return;

    try {
      setRecalculating(true);
      setErrorMessage('');
      setSuccessMessage('');

      // Get all current squads
      const currentSquads = await squadService.getByLeague(selectedLeagueId);

      let fixedCount = 0;
      const results: { squadName: string; oldPoints: number; newPoints: number; bankedPoints: number }[] = [];

      for (const squad of currentSquads.filter(s => s.isSubmitted)) {
        const bankedPoints = squad.bankedPoints || 0;

        // Only process squads with bankedPoints > 0
        if (bankedPoints > 0) {
          const oldTotal = squad.totalPoints;
          const newTotal = oldTotal + bankedPoints;

          console.log(`📊 ${squad.squadName}:`);
          console.log(`  Current total: ${oldTotal}`);
          console.log(`  Banked points: ${bankedPoints}`);
          console.log(`  New total: ${newTotal}`);

          results.push({
            squadName: squad.squadName,
            oldPoints: oldTotal,
            newPoints: newTotal,
            bankedPoints: bankedPoints
          });

          fixedCount++;
        }
      }

      console.log(`\n📈 Summary: ${fixedCount} squads need bankedPoints added to totalPoints`);

      if (results.length > 0) {
        setRecalcResults(results);
        setSuccessMessage(
          `✅ Found ${fixedCount} squads with bankedPoints to add.\n\n` +
          `Review the results below. Click "Apply Changes" to update Firestore.`
        );
      } else {
        setSuccessMessage('✅ No squads have bankedPoints to add. All totals are correct!');
      }

    } catch (error: any) {
      console.error('Error calculating bankedPoints addition:', error);
      setErrorMessage(error.message || 'Failed to calculate bankedPoints addition');
    } finally {
      setRecalculating(false);
    }
  };

  const handleApplyBankedPointsChanges = async () => {
    if (!selectedLeagueId || recalcResults.length === 0) {
      setErrorMessage('No changes to apply');
      return;
    }

    const confirmed = window.confirm(
      `APPLY BANKED POINTS CHANGES\n\n` +
      `This will update ${recalcResults.length} squads in Firestore with:\n` +
      `✓ Reconstructed bankedPoints\n` +
      `✓ Updated totalPoints (including banked points)\n\n` +
      `This action cannot be undone (but you can restore from a snapshot).\n\n` +
      `Continue?`
    );
    if (!confirmed) return;

    try {
      setRecalculating(true);
      setErrorMessage('');
      setSuccessMessage('');

      // Get all current squads
      const currentSquads = await squadService.getByLeague(selectedLeagueId);

      let appliedCount = 0;

      for (const result of recalcResults) {
        // Find the squad by name
        const squad = currentSquads.find(s => s.squadName === result.squadName);
        if (!squad) {
          console.warn(`Squad ${result.squadName} not found, skipping`);
          continue;
        }

        // Only apply if we have bankedPoints (reconstruction mode)
        if (result.bankedPoints !== undefined) {
          console.log(`📝 Updating ${squad.squadName}:`);
          console.log(`  Old total: ${squad.totalPoints}`);
          console.log(`  New total: ${result.newPoints}`);
          console.log(`  New banked: ${result.bankedPoints}`);

          // Update the squad with new values
          await squadService.update(squad.id, {
            bankedPoints: result.bankedPoints,
            totalPoints: result.newPoints,
            lastUpdated: new Date(),
          });

          appliedCount++;
        }
      }

      console.log(`✅ Applied ${appliedCount} bankedPoints updates`);

      // Create a new snapshot with updated data
      await leaderboardSnapshotService.create(selectedLeagueId);

      setSuccessMessage(
        `✅ Successfully updated ${appliedCount} squads with reconstructed bankedPoints!\n\n` +
        `A new leaderboard snapshot has been created.`
      );

      // Clear the results table
      setRecalcResults([]);

      // Reload squads to show updated values
      await loadSquads();

    } catch (error: any) {
      console.error('Error applying bankedPoints changes:', error);
      setErrorMessage(error.message || 'Failed to apply changes');
    } finally {
      setRecalculating(false);
    }
  };

  const handleRepairAllSquads = async () => {
    if (!selectedLeagueId) {
      setErrorMessage('Please select a league first');
      return;
    }

    const confirmed = window.confirm(
      'REPAIR ALL SQUAD POINTS\n\n' +
      'This will recalculate all squads in the selected league using:\n' +
      '✓ Preserved pointsAtJoining for transferred players\n' +
      '✓ Preserved pointsWhenRoleAssigned for role changes\n' +
      '✓ Preserved bankedPoints from transferred-out players\n\n' +
      'This fixes the bug where transfers caused point losses.\n\n' +
      'Continue?'
    );
    if (!confirmed) return;

    try {
      setRecalculating(true);
      setErrorMessage('');
      setSuccessMessage('');

      const selectedLeague = leagues.find(l => l.id === selectedLeagueId);
      if (!selectedLeague) {
        throw new Error('League not found');
      }
      if (!selectedLeague.playerPoolId) {
        throw new Error('League does not have a player pool associated');
      }

      // Trigger the recalculation using the fixed player pool service
      await playerPoolService.recalculateLeaguesUsingPool(selectedLeague.playerPoolId);

      setSuccessMessage('✅ All squad points have been repaired successfully! Banked points and transfer tracking are now correctly applied.');

      // Reload squads to show updated points
      await loadSquads();
    } catch (error: any) {
      console.error('Error repairing squads:', error);
      setErrorMessage(error.message || 'Failed to repair squad points');
    } finally {
      setRecalculating(false);
    }
  };

  const handleFixMissingRoleTimestamps = async () => {
    if (!selectedLeagueId) {
      setErrorMessage('Please select a league first');
      return;
    }

    try {
      setRecalculating(true);
      setErrorMessage('');
      setSuccessMessage('');

      const selectedLeague = leagues.find(l => l.id === selectedLeagueId);
      if (!selectedLeague) throw new Error('League not found');

      // Get all squads in the league
      const squads = await squadService.getByLeague(selectedLeagueId);
      if (squads.length === 0) {
        setErrorMessage('No squads found in this league');
        return;
      }

      let fixedCount = 0;
      const fixResults: Array<{ squadName: string; fixedPlayers: string[] }> = [];

      for (const squad of squads) {
        const fixedPlayers: string[] = [];
        let needsUpdate = false;

        // Update players array
        const updatedPlayers = squad.players.map(player => {
          // Check if player has a role but missing pointsWhenRoleAssigned
          const hasRole = player.playerId === squad.captainId ||
                         player.playerId === squad.viceCaptainId ||
                         player.playerId === squad.xFactorId;

          if (hasRole && player.pointsWhenRoleAssigned === undefined) {
            // FIX: Set pointsWhenRoleAssigned to current points
            // This assumes the role was just assigned (safest assumption for corrupted data)
            needsUpdate = true;
            const roleName = player.playerId === squad.captainId ? 'Captain' :
                            player.playerId === squad.viceCaptainId ? 'Vice-Captain' : 'X-Factor';
            fixedPlayers.push(`${player.playerName} (${roleName})`);

            return {
              ...player,
              pointsWhenRoleAssigned: player.points
            };
          }

          return player;
        });

        if (needsUpdate) {
          // Update the squad with fixed data
          await squadService.update(squad.id, {
            players: updatedPlayers,
            lastUpdated: new Date()
          });

          fixedCount++;
          fixResults.push({
            squadName: squad.squadName,
            fixedPlayers
          });
        }
      }

      if (fixedCount === 0) {
        setSuccessMessage('✅ All squads already have correct role timestamps! No fixes needed.');
      } else {
        let resultMessage = `✅ Fixed ${fixedCount} squad(s) with missing role timestamps:\n\n`;
        fixResults.forEach(result => {
          resultMessage += `📋 ${result.squadName}:\n`;
          result.fixedPlayers.forEach(player => {
            resultMessage += `  • ${player} - set pointsWhenRoleAssigned to current points\n`;
          });
          resultMessage += '\n';
        });
        resultMessage += '\n🔄 Now run "Recalculate All Squad Points" to update the point calculations!';
        setSuccessMessage(resultMessage);
      }

      // Reload squads to show updated data
      await loadSquads();

    } catch (error: any) {
      console.error('Error fixing role timestamps:', error);
      setErrorMessage(error.message || 'Failed to fix role timestamps');
    } finally {
      setRecalculating(false);
    }
  };

  const handleFixSingleSquadRoleTimestamps = async () => {
    if (!selectedLeagueId || !selectedSquadForRecalc) {
      setErrorMessage('Please select a league and a squad first');
      return;
    }

    try {
      setRecalculating(true);
      setErrorMessage('');
      setSuccessMessage('');
      setSingleSquadRecalcResult(null);

      const squad = await squadService.getById(selectedSquadForRecalc);
      if (!squad) {
        throw new Error('Squad not found');
      }

      const fixedPlayers: string[] = [];
      let needsUpdate = false;

      // Update players array
      const updatedPlayers = squad.players.map(player => {
        // Check if player has a role but missing pointsWhenRoleAssigned
        const hasRole = player.playerId === squad.captainId ||
                       player.playerId === squad.viceCaptainId ||
                       player.playerId === squad.xFactorId;

        if (hasRole && player.pointsWhenRoleAssigned === undefined) {
          // FIX: Set pointsWhenRoleAssigned to current points
          // This assumes the role was just assigned (safest assumption for corrupted data)
          needsUpdate = true;
          const roleName = player.playerId === squad.captainId ? 'Captain' :
                          player.playerId === squad.viceCaptainId ? 'Vice-Captain' : 'X-Factor';
          fixedPlayers.push(`${player.playerName} (${roleName})`);

          return {
            ...player,
            pointsWhenRoleAssigned: player.points
          };
        }

        return player;
      });

      if (needsUpdate) {
        // Update the squad with fixed data
        await squadService.update(squad.id, {
          players: updatedPlayers,
          lastUpdated: new Date()
        });

        let resultMessage = `✅ Fixed missing role timestamps for ${squad.squadName}:\n\n`;
        fixedPlayers.forEach(player => {
          resultMessage += `  • ${player} - set pointsWhenRoleAssigned to current points\n`;
        });
        resultMessage += '\n✅ Step 1 complete! Now click "Step 2: Preview Recalculation" to see the updated points.';
        setSuccessMessage(resultMessage);
        setSingleSquadRoleFixed(true);
      } else {
        setSuccessMessage(`✅ Squad "${squad.squadName}" already has correct role timestamps! No fixes needed.\n\nYou can proceed to Step 2.`);
        setSingleSquadRoleFixed(true);
      }

      // Reload squads to show updated data
      await loadSquads();

    } catch (error: any) {
      console.error('Error fixing single squad role timestamps:', error);
      setErrorMessage(error.message || 'Failed to fix role timestamps');
    } finally {
      setRecalculating(false);
    }
  };

  const handleRecalculateSingleSquad = async () => {
    if (!selectedLeagueId || !selectedSquadForRecalc) {
      setErrorMessage('Please select a league and a squad first');
      return;
    }

    try {
      setRecalculating(true);
      setErrorMessage('');
      setSuccessMessage('');
      setSingleSquadRecalcResult(null);

      const selectedLeague = leagues.find(l => l.id === selectedLeagueId);
      if (!selectedLeague) {
        throw new Error('League not found');
      }
      if (!selectedLeague.playerPoolId) {
        throw new Error('League does not have a player pool associated');
      }

      // Get the squad
      const squad = await squadService.getById(selectedSquadForRecalc);
      if (!squad) {
        throw new Error('Squad not found');
      }

      // Get player pool for current points
      const playerPool = await playerPoolService.getById(selectedLeague.playerPoolId);
      if (!playerPool) {
        throw new Error('Player pool not found');
      }

      const oldPoints = squad.totalPoints || 0;

      // Update all player points from pool AND set pointsWhenRoleAssigned
      const updatedPlayers = squad.players.map(squadPlayer => {
        const poolPlayer = playerPool.players.find(p => p.playerId === squadPlayer.playerId);
        if (poolPlayer) {
          let newPointsWhenRoleAssigned = squadPlayer.pointsWhenRoleAssigned;

          // Apply custom role timestamps if provided
          if (squadPlayer.playerId === squad.captainId && customRoleTimestamps.captain !== null) {
            newPointsWhenRoleAssigned = customRoleTimestamps.captain;
          } else if (squadPlayer.playerId === squad.viceCaptainId && customRoleTimestamps.viceCaptain !== null) {
            newPointsWhenRoleAssigned = customRoleTimestamps.viceCaptain;
          } else if (squadPlayer.playerId === squad.xFactorId && customRoleTimestamps.xFactor !== null) {
            newPointsWhenRoleAssigned = customRoleTimestamps.xFactor;
          } else if (squadPlayer.playerId === squad.captainId ||
                     squadPlayer.playerId === squad.viceCaptainId ||
                     squadPlayer.playerId === squad.xFactorId) {
            // If no custom timestamp provided, default to 0 (role from start)
            newPointsWhenRoleAssigned = newPointsWhenRoleAssigned ?? 0;
          }

          return {
            ...squadPlayer,
            points: poolPlayer.points,
            pointsWhenRoleAssigned: newPointsWhenRoleAssigned
          };
        }
        return squadPlayer;
      });

      // Use custom banked points if provided, otherwise use squad's current value
      const bankedPointsToUse = customBankedPoints !== null ? customBankedPoints : (squad.bankedPoints || 0);

      // Calculate new points with fixed logic
      const calculatedPoints = calculateSquadPointsForRecalc(
        updatedPlayers,
        squad.captainId || null,
        squad.viceCaptainId || null,
        squad.xFactorId || null,
        bankedPointsToUse,
        selectedLeague.squadSize
      );

      // Build detailed breakdown
      const squadSize = selectedLeague.squadSize;
      const startingXI = updatedPlayers.slice(0, squadSize);
      const playerBreakdown = startingXI.map(player => {
        const pointsAtJoining = player.pointsAtJoining ?? 0;
        const effectivePoints = Math.max(0, player.points - pointsAtJoining);

        let contribution = effectivePoints;
        let role = undefined;
        let multiplier = 1.0;

        if (squad.captainId === player.playerId) {
          role = 'Captain';
          multiplier = 2.0;
          const pointsWhenRoleAssigned = player.pointsWhenRoleAssigned ?? pointsAtJoining;
          const basePoints = Math.max(0, pointsWhenRoleAssigned - pointsAtJoining);
          const bonusPoints = Math.max(0, player.points - pointsWhenRoleAssigned);
          contribution = basePoints * 1.0 + bonusPoints * 2.0;
        } else if (squad.viceCaptainId === player.playerId) {
          role = 'Vice-Captain';
          multiplier = 1.5;
          const pointsWhenRoleAssigned = player.pointsWhenRoleAssigned ?? pointsAtJoining;
          const basePoints = Math.max(0, pointsWhenRoleAssigned - pointsAtJoining);
          const bonusPoints = Math.max(0, player.points - pointsWhenRoleAssigned);
          contribution = basePoints * 1.0 + bonusPoints * 1.5;
        } else if (squad.xFactorId === player.playerId) {
          role = 'X-Factor';
          multiplier = 1.25;
          const pointsWhenRoleAssigned = player.pointsWhenRoleAssigned ?? pointsAtJoining;
          const basePoints = Math.max(0, pointsWhenRoleAssigned - pointsAtJoining);
          const bonusPoints = Math.max(0, player.points - pointsWhenRoleAssigned);
          contribution = basePoints * 1.0 + bonusPoints * 1.25;
        }

        return {
          name: player.playerName,
          points: player.points,
          pointsAtJoining,
          contribution,
          role,
          multiplier
        };
      });

      // Show preview first
      setSingleSquadRecalcResult({
        squadName: squad.squadName,
        oldPoints: oldPoints,
        newPoints: calculatedPoints.totalPoints,
        breakdown: {
          playerBreakdown,
          captainPoints: calculatedPoints.captainPoints,
          viceCaptainPoints: calculatedPoints.viceCaptainPoints,
          xFactorPoints: calculatedPoints.xFactorPoints,
          bankedPoints: bankedPointsToUse
        }
      });

      setSuccessMessage(
        `Preview: ${squad.squadName} points will change from ${oldPoints.toFixed(2)} to ${calculatedPoints.totalPoints.toFixed(2)}\n\n` +
        `Review the detailed breakdown below and click "Apply Changes" to update this squad only.`
      );
    } catch (error: any) {
      console.error('Error calculating single squad:', error);
      setErrorMessage(error.message || 'Failed to calculate squad points');
    } finally {
      setRecalculating(false);
    }
  };

  const handleApplySingleSquadRecalc = async () => {
    if (!selectedSquadForRecalc || !singleSquadRecalcResult) {
      setErrorMessage('No changes to apply');
      return;
    }

    const confirmed = window.confirm(
      `APPLY SINGLE SQUAD RECALCULATION\n\n` +
      `Squad: ${singleSquadRecalcResult.squadName}\n` +
      `Old Points: ${singleSquadRecalcResult.oldPoints.toFixed(2)}\n` +
      `New Points: ${singleSquadRecalcResult.newPoints.toFixed(2)}\n\n` +
      `This will ONLY affect this squad. No other squads will be changed.\n\n` +
      `Continue?`
    );
    if (!confirmed) return;

    try {
      setRecalculating(true);
      setErrorMessage('');
      setSuccessMessage('');

      const selectedLeague = leagues.find(l => l.id === selectedLeagueId);
      if (!selectedLeague || !selectedLeague.playerPoolId) {
        throw new Error('League or player pool not found');
      }

      // Get the squad and player pool
      const squad = await squadService.getById(selectedSquadForRecalc);
      if (!squad) {
        throw new Error('Squad not found');
      }

      const playerPool = await playerPoolService.getById(selectedLeague.playerPoolId);
      if (!playerPool) {
        throw new Error('Player pool not found');
      }

      // Update all player points from pool AND set pointsWhenRoleAssigned
      const updatedPlayers = squad.players.map(squadPlayer => {
        const poolPlayer = playerPool.players.find(p => p.playerId === squadPlayer.playerId);
        if (poolPlayer) {
          let newPointsWhenRoleAssigned = squadPlayer.pointsWhenRoleAssigned;

          // Apply custom role timestamps if provided
          if (squadPlayer.playerId === squad.captainId && customRoleTimestamps.captain !== null) {
            newPointsWhenRoleAssigned = customRoleTimestamps.captain;
          } else if (squadPlayer.playerId === squad.viceCaptainId && customRoleTimestamps.viceCaptain !== null) {
            newPointsWhenRoleAssigned = customRoleTimestamps.viceCaptain;
          } else if (squadPlayer.playerId === squad.xFactorId && customRoleTimestamps.xFactor !== null) {
            newPointsWhenRoleAssigned = customRoleTimestamps.xFactor;
          } else if (squadPlayer.playerId === squad.captainId ||
                     squadPlayer.playerId === squad.viceCaptainId ||
                     squadPlayer.playerId === squad.xFactorId) {
            // If no custom timestamp provided, default to 0 (role from start)
            newPointsWhenRoleAssigned = newPointsWhenRoleAssigned ?? 0;
          }

          return {
            ...squadPlayer,
            points: poolPlayer.points,
            pointsWhenRoleAssigned: newPointsWhenRoleAssigned
          };
        }
        return squadPlayer;
      });

      // Use custom banked points if provided, otherwise use squad's current value
      const bankedPointsToUse = customBankedPoints !== null ? customBankedPoints : (squad.bankedPoints || 0);

      // Calculate new points with fixed logic
      const calculatedPoints = calculateSquadPointsForRecalc(
        updatedPlayers,
        squad.captainId || null,
        squad.viceCaptainId || null,
        squad.xFactorId || null,
        bankedPointsToUse,
        selectedLeague.squadSize
      );

      // Clean up players array - remove any undefined fields
      const cleanedPlayers = updatedPlayers.map(player => {
        const cleanPlayer: any = {
          playerId: player.playerId,
          playerName: player.playerName,
          team: player.team,
          role: player.role,
          points: player.points,
          pointsAtJoining: player.pointsAtJoining ?? 0
        };

        // Only add pointsWhenRoleAssigned if it's defined
        if (player.pointsWhenRoleAssigned !== undefined) {
          cleanPlayer.pointsWhenRoleAssigned = player.pointsWhenRoleAssigned;
        }

        return cleanPlayer;
      });

      // Update ONLY this squad in Firestore
      await squadService.update(selectedSquadForRecalc, {
        players: cleanedPlayers,
        bankedPoints: bankedPointsToUse,
        totalPoints: calculatedPoints.totalPoints,
        captainPoints: calculatedPoints.captainPoints,
        viceCaptainPoints: calculatedPoints.viceCaptainPoints,
        xFactorPoints: calculatedPoints.xFactorPoints,
        lastUpdated: new Date()
      });

      setSuccessMessage(
        `✅ Successfully recalculated ${squad.squadName}!\n\n` +
        `Points updated from ${singleSquadRecalcResult.oldPoints.toFixed(2)} to ${calculatedPoints.totalPoints.toFixed(2)}\n\n` +
        `Only this squad was affected. All other squads remain unchanged.`
      );

      // Clear the result
      setSingleSquadRecalcResult(null);
      setSelectedSquadForRecalc('');

      // Reload squads to show updated values
      await loadSquads();
    } catch (error: any) {
      console.error('Error applying single squad recalculation:', error);
      setErrorMessage(error.message || 'Failed to apply changes');
    } finally {
      setRecalculating(false);
    }
  };

  const handleRecalculateWithSnapshot = async (snapshotId: string) => {
    if (!selectedLeagueId) return;

    try {
      setRecalculating(true);
      setErrorMessage('');
      setSuccessMessage('');
      setShowSnapshotDialog(false);
      setRecalcResults([]);

      const selectedLeague = leagues.find(l => l.id === selectedLeagueId);
      if (!selectedLeague) throw new Error('League not found');
      if (!selectedLeague.playerPoolId) {
        throw new Error('League does not have a player pool associated');
      }

      // Get baseline snapshot
      const baselineSnapshot = availableSnapshots.find(s => s.id === snapshotId);
      if (!baselineSnapshot) {
        throw new Error('Baseline snapshot not found');
      }

      // Get current squads and player pool
      const currentSquads = await squadService.getByLeague(selectedLeagueId);
      const playerPool = await playerPoolService.getById(selectedLeague.playerPoolId);
      if (!playerPool) {
        throw new Error('Player pool not found');
      }

      const results: { squadName: string; oldPoints: number; newPoints: number }[] = [];

      for (const squad of currentSquads.filter(s => s.isSubmitted)) {
        const oldPoints = squad.totalPoints || 0;

        // Get baseline points from snapshot
        const baselineStanding = baselineSnapshot.standings.find(st => st.squadId === squad.id);
        if (!baselineStanding) {
          console.warn(`No baseline found for squad ${squad.squadName}, skipping`);
          continue;
        }

        const baselinePoints = baselineStanding.totalPoints;

        let updatedPlayers = [...squad.players];

        // Identify transferred-in players
        const transferredInPlayerIds = new Set<string>();
        if (squad.transferHistory && squad.transferHistory.length > 0) {
          for (const transfer of squad.transferHistory) {
            if (transfer.changeType === 'playerSubstitution' && transfer.playerIn) {
              transferredInPlayerIds.add(transfer.playerIn);
            }
          }
        }

        // Fix pointsAtJoining for all players
        for (const player of updatedPlayers) {
          if (transferredInPlayerIds.has(player.playerId)) {
            // Transferred-in: contribute 0
            player.pointsAtJoining = player.points;
          } else {
            // Original player: contribute all their points
            player.pointsAtJoining = 0;
          }

          // Reset role assignment tracking
          if (player.playerId === squad.captainId ||
              player.playerId === squad.viceCaptainId ||
              player.playerId === squad.xFactorId) {
            player.pointsWhenRoleAssigned = player.points;
          }
        }

        // Use baseline points as the total (transfers should be points-neutral)
        const calculatedPoints = calculateSquadPointsForRecalc(
          updatedPlayers,
          squad.captainId || null,
          squad.viceCaptainId || null,
          squad.xFactorId || null,
          0, // No banking needed - we're using baseline
          selectedLeague.squadSize
        );

        // Update squad in Firestore
        await squadService.update(squad.id, {
          players: updatedPlayers,
          bankedPoints: 0,
          totalPoints: baselinePoints, // Force to baseline
          captainPoints: calculatedPoints.captainPoints,
          viceCaptainPoints: calculatedPoints.viceCaptainPoints,
          xFactorPoints: calculatedPoints.xFactorPoints,
          lastUpdated: new Date()
        });

        results.push({
          squadName: squad.squadName,
          oldPoints: oldPoints,
          newPoints: baselinePoints
        });
      }

      setRecalcResults(results);
      setSuccessMessage(`Successfully fixed points for ${results.length} squads! Transfers preserved, points restored to baseline.`);

      // Reload squads and update leaderboard
      await loadSquads();
      try {
        await leaderboardSnapshotService.create(selectedLeagueId);
      } catch (err) {
        console.error('Error updating leaderboard:', err);
      }
    } catch (error: any) {
      console.error('Error recalculating points:', error);
      setErrorMessage(error.message || 'Failed to recalculate points');
    } finally {
      setRecalculating(false);
    }
  };

  const handleShowSnapshotList = async () => {
    if (!selectedLeagueId) {
      setErrorMessage('Please select a league first');
      return;
    }

    try {
      setErrorMessage('');
      const allSnapshots = await leaderboardSnapshotService.getByLeague(selectedLeagueId);

      if (allSnapshots.length === 0) {
        setErrorMessage('No snapshots available to restore from.');
        return;
      }

      setAvailableSnapshots(allSnapshots);
      setShowSnapshotDialog(true);
    } catch (error: any) {
      console.error('Error fetching snapshots:', error);
      setErrorMessage(error.message || 'Failed to fetch snapshots');
    }
  };

  const calculateSquadPointsForRecalc = (
    players: any[],
    captainId: string | null,
    viceCaptainId: string | null,
    xFactorId: string | null,
    bankedPoints: number,
    squadSize: number
  ): { totalPoints: number; captainPoints: number; viceCaptainPoints: number; xFactorPoints: number } => {
    let totalPoints = 0;
    let captainPoints = 0;
    let viceCaptainPoints = 0;
    let xFactorPoints = 0;

    const mainSquad = players.slice(0, squadSize);

    mainSquad.forEach(player => {
      const pointsAtJoining = player.pointsAtJoining ?? 0;
      const effectivePoints = Math.max(0, player.points - pointsAtJoining);

      let playerPoints = 0;

      if (captainId === player.playerId) {
        const pointsWhenRoleAssigned = player.pointsWhenRoleAssigned ?? pointsAtJoining;
        const basePoints = Math.max(0, pointsWhenRoleAssigned - pointsAtJoining);
        const bonusPoints = Math.max(0, player.points - pointsWhenRoleAssigned);
        captainPoints = basePoints * 1.0 + bonusPoints * 2.0;
        playerPoints = captainPoints;
      } else if (viceCaptainId === player.playerId) {
        const pointsWhenRoleAssigned = player.pointsWhenRoleAssigned ?? pointsAtJoining;
        const basePoints = Math.max(0, pointsWhenRoleAssigned - pointsAtJoining);
        const bonusPoints = Math.max(0, player.points - pointsWhenRoleAssigned);
        viceCaptainPoints = basePoints * 1.0 + bonusPoints * 1.5;
        playerPoints = viceCaptainPoints;
      } else if (xFactorId === player.playerId) {
        const pointsWhenRoleAssigned = player.pointsWhenRoleAssigned ?? pointsAtJoining;
        const basePoints = Math.max(0, pointsWhenRoleAssigned - pointsAtJoining);
        const bonusPoints = Math.max(0, player.points - pointsWhenRoleAssigned);
        xFactorPoints = basePoints * 1.0 + bonusPoints * 1.25;
        playerPoints = xFactorPoints;
      } else {
        playerPoints = effectivePoints;
      }

      totalPoints += playerPoints;
    });

    totalPoints += bankedPoints;

    return { totalPoints, captainPoints, viceCaptainPoints, xFactorPoints };
  };

  const handleRoleFixClick = (squad: LeagueSquad, missingRole: string) => {
    const roleKey = missingRole === 'Captain' ? 'captain' : missingRole === 'Vice-Captain' ? 'viceCaptain' : 'xFactor';
    setRoleFixDialog({
      open: true,
      squad,
      missingRole: roleKey as 'captain' | 'viceCaptain' | 'xFactor'
    });
    setSelectedPlayerForRole('');
  };

  const handleConfirmRoleFix = async () => {
    const { squad, missingRole } = roleFixDialog;
    if (!squad || !missingRole || !selectedPlayerForRole) return;

    try {
      setLoading(true);
      setErrorMessage('');
      setSuccessMessage('');

      const selectedLeague = leagues.find(l => l.id === selectedLeagueId);
      const squadSize = selectedLeague?.squadSize || 11;
      const mainSquadPlayers = squad.players.slice(0, squadSize);

      // Validate the selected player is in main squad
      if (!mainSquadPlayers.some(p => p.playerId === selectedPlayerForRole)) {
        throw new Error('Selected player must be in the main squad');
      }

      // Prepare update payload
      const updatePayload: any = {};

      if (missingRole === 'captain') {
        updatePayload.captainId = selectedPlayerForRole;
        // Set pointsWhenRoleAssigned for the new captain
        const newCaptain = squad.players.find(p => p.playerId === selectedPlayerForRole);
        if (newCaptain) {
          newCaptain.pointsWhenRoleAssigned = newCaptain.points;
          updatePayload.players = squad.players;
        }
      } else if (missingRole === 'viceCaptain') {
        updatePayload.viceCaptainId = selectedPlayerForRole;
        const newVC = squad.players.find(p => p.playerId === selectedPlayerForRole);
        if (newVC) {
          newVC.pointsWhenRoleAssigned = newVC.points;
          updatePayload.players = squad.players;
        }
      } else if (missingRole === 'xFactor') {
        updatePayload.xFactorId = selectedPlayerForRole;
        const newX = squad.players.find(p => p.playerId === selectedPlayerForRole);
        if (newX) {
          newX.pointsWhenRoleAssigned = newX.points;
          updatePayload.players = squad.players;
        }
      }

      updatePayload.lastUpdated = new Date();

      await squadService.update(squad.id, updatePayload);

      setSuccessMessage(`${missingRole === 'captain' ? 'Captain' : missingRole === 'viceCaptain' ? 'Vice-Captain' : 'X-Factor'} assigned successfully!`);
      setRoleFixDialog({ open: false, squad: null, missingRole: null });
      setSelectedPlayerForRole('');

      // Reload squads to update broken squads list
      await loadSquads();
    } catch (error: any) {
      console.error('Error fixing role:', error);
      setErrorMessage(error.message || 'Failed to assign role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/dashboard')}
          >
            Back to My Leagues
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Admin Panel
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/admin/predictions')}
          >
            View Predictions
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/admin/player-pools')}
          >
            Manage Player Pools
          </Button>
        </Box>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Admin Tabs */}
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={(e, newValue) => setTabValue(newValue)}
              aria-label="admin tabs"
            >
              <Tab label="Transfer Management" />
              <Tab label="System Settings" />
              <Tab label="Transfer Investigation" />
              <Tab label="Player Pool History" />
              <Tab label="Squad Changes" />
            </Tabs>
          </Box>

          {/* Transfer Management Tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              Transfer Management
            </Typography>

            {/* Success/Error Messages */}
            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
                {successMessage}
              </Alert>
            )}
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage('')}>
                {errorMessage}
              </Alert>
            )}

            {/* Broken Squads Alert */}
            {brokenSquads.length > 0 && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  ⚠️ {brokenSquads.length} Squad{brokenSquads.length > 1 ? 's' : ''} with Missing Roles Detected!
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  The following squads are missing Captain, Vice-Captain, or X-Factor roles. Click "Fix" to assign missing roles.
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {brokenSquads.map(({ squad, missingRoles }) => (
                    <Card key={squad.id} sx={{ bgcolor: 'rgba(255, 152, 0, 0.1)', border: '1px solid rgba(255, 152, 0, 0.3)' }}>
                      <CardContent sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                              {squad.squadName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Missing: {missingRoles.join(', ')}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {missingRoles.map((role) => (
                              <Button
                                key={role}
                                size="small"
                                variant="contained"
                                color="warning"
                                onClick={() => handleRoleFixClick(squad, role)}
                              >
                                Fix {role}
                              </Button>
                            ))}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Alert>
            )}

            {/* League Selector */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Select League</InputLabel>
              <Select
                value={selectedLeagueId}
                onChange={(e) => setSelectedLeagueId(e.target.value)}
                label="Select League"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {leagues.map((league) => (
                  <MenuItem key={league.id} value={league.id}>
                    {league.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Points Recalculation Tool */}
            {selectedLeagueId && (
              <Card sx={{ mb: 3, bgcolor: 'rgba(255, 152, 0, 0.05)', border: '2px solid', borderColor: 'warning.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                        ⚠️ Points Recalculation Tool
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Fix incorrect points caused by transfer bugs. This will preserve all transfers but recalculate points correctly.
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        color="info"
                        onClick={handleFixMissingRoleTimestamps}
                        disabled={recalculating}
                        sx={{ minWidth: 220 }}
                        startIcon={<span>🔧</span>}
                      >
                        {recalculating ? 'Fixing...' : 'Step 1: Fix Missing Role Data'}
                      </Button>
                      <Button
                        variant="contained"
                        color="warning"
                        onClick={handleRecalculatePoints}
                        disabled={recalculating}
                        sx={{ minWidth: 220 }}
                        startIcon={<span>🔄</span>}
                      >
                        {recalculating ? 'Recalculating...' : 'Step 2: Recalculate All Points'}
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={handleShowSnapshotList}
                        disabled={recalculating}
                        sx={{ minWidth: 200 }}
                      >
                        Choose Snapshot to Restore
                      </Button>
                    </Box>
                  </Box>

                  {recalcResults.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Recalculation Results:
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Squad Name</TableCell>
                              <TableCell align="right">Old Points</TableCell>
                              <TableCell align="right">New Points</TableCell>
                              <TableCell align="right">Difference</TableCell>
                              {recalcResults.some(r => r.bankedPoints !== undefined) && (
                                <TableCell align="right">Banked Points</TableCell>
                              )}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {recalcResults.map((result) => {
                              const diff = result.newPoints - result.oldPoints;
                              return (
                                <TableRow key={result.squadName}>
                                  <TableCell>{result.squadName}</TableCell>
                                  <TableCell align="right">{result.oldPoints.toFixed(2)}</TableCell>
                                  <TableCell align="right">{result.newPoints.toFixed(2)}</TableCell>
                                  <TableCell align="right">
                                    <Chip
                                      label={diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                                      size="small"
                                      color={diff === 0 ? 'default' : diff > 0 ? 'success' : 'error'}
                                    />
                                  </TableCell>
                                  {result.bankedPoints !== undefined && (
                                    <TableCell align="right">
                                      <Chip
                                        label={result.bankedPoints.toFixed(2)}
                                        size="small"
                                        color="info"
                                      />
                                    </TableCell>
                                  )}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      {/* Apply Changes Button - Only show if we have bankedPoints (reconstruction mode) */}
                      {recalcResults.some(r => r.bankedPoints !== undefined) && (
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                          <Button
                            variant="contained"
                            color="success"
                            size="large"
                            onClick={handleApplyBankedPointsChanges}
                            disabled={recalculating}
                          >
                            {recalculating ? 'Applying...' : 'Apply Changes to Firestore'}
                          </Button>
                        </Box>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Loading State */}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {/* Squads with Transfers */}
            {!loading && selectedLeagueId && squads.length === 0 && (
              <Alert severity="info">
                No squads with transfer history found for this league.
              </Alert>
            )}

            {!loading && selectedLeagueId && squads.length > 0 && (
              <Box>
                {squads.map((squad) => (
                  <Card key={squad.id} sx={{ mb: 3 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                          {squad.squadName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {squad.squadName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {squad.transferHistory?.length || 0} transfer(s) made
                          </Typography>
                        </Box>
                      </Box>

                      {/* Transfer History Table */}
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>#</TableCell>
                              <TableCell>Date</TableCell>
                              <TableCell>Type</TableCell>
                              <TableCell>Change</TableCell>
                              <TableCell>Details</TableCell>
                              <TableCell align="center">Action</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {squad.transferHistory?.map((transfer, index) => (
                              <TableRow key={index}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>
                                  {transfer.timestamp instanceof Date
                                    ? transfer.timestamp.toLocaleString()
                                    : new Date(transfer.timestamp).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={transfer.transferType}
                                    size="small"
                                    color={
                                      transfer.transferType === 'bench'
                                        ? 'info'
                                        : transfer.transferType === 'flexible'
                                        ? 'warning'
                                        : 'secondary'
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={transfer.changeType === 'playerSubstitution' ? 'Player Sub' : 'Role Change'}
                                    size="small"
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>
                                  {transfer.playerOut && transfer.playerIn && (
                                    <Typography variant="body2">
                                      <SwapHoriz sx={{ fontSize: 14, verticalAlign: 'middle' }} />
                                      {' OUT: '}
                                      {squad.players.find(p => p.playerId === transfer.playerOut)?.playerName || transfer.playerOut}
                                      {' | IN: '}
                                      {squad.players.find(p => p.playerId === transfer.playerIn)?.playerName || transfer.playerIn}
                                    </Typography>
                                  )}
                                  {transfer.newViceCaptainId && (
                                    <Typography variant="body2">New VC assigned</Typography>
                                  )}
                                  {transfer.newXFactorId && (
                                    <Typography variant="body2">New X-Factor assigned</Typography>
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  <Button
                                    size="small"
                                    startIcon={<Undo />}
                                    color="warning"
                                    variant="outlined"
                                    onClick={() => handleReverseTransferClick(squad.id, index, transfer)}
                                  >
                                    Reverse
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </TabPanel>

          {/* System Settings Tab */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              System Settings
            </Typography>

            {/* League Selector for System Tools */}
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Select League</InputLabel>
                <Select
                  value={selectedLeagueId}
                  onChange={(e) => setSelectedLeagueId(e.target.value)}
                  label="Select League"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {leagues.map((league) => (
                    <MenuItem key={league.id} value={league.id}>
                      {league.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Data Repair & Maintenance
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Fix transfer bug by adding bankedPoints to totalPoints, or restore from a previous snapshot.
                    </Typography>
                    <Button
                      variant="contained"
                      color="success"
                      fullWidth
                      sx={{ mb: 1 }}
                      onClick={handleReconstructBankedPoints}
                      disabled={recalculating || !selectedLeagueId}
                    >
                      {recalculating ? 'Calculating...' : '🔧 Add BankedPoints to Total'}
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      fullWidth
                      sx={{ mb: 1 }}
                      onClick={handleRestoreFromSnapshot}
                      disabled={recalculating || !selectedLeagueId}
                    >
                      {recalculating ? 'Loading...' : 'Restore from Snapshot'}
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      fullWidth
                      sx={{ mb: 1 }}
                      onClick={handleRepairAllSquads}
                      disabled={recalculating || !selectedLeagueId}
                    >
                      {recalculating ? 'Repairing...' : 'Recalculate All Squads'}
                    </Button>
                    {successMessage && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        {successMessage}
                      </Alert>
                    )}
                    {errorMessage && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {errorMessage}
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
                <Card variant="outlined" sx={{ border: '2px solid', borderColor: 'info.main' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="info.main">
                      🎯 Recalculate Single Squad
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Fix points for ONE specific squad only. Other squads will NOT be affected.
                    </Typography>

                    {/* Squad Selector */}
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Select Squad to Fix</InputLabel>
                      <Select
                        value={selectedSquadForRecalc}
                        onChange={(e) => {
                          setSelectedSquadForRecalc(e.target.value);
                          setCustomBankedPoints(null); // Reset custom banked points when changing squad
                          setSingleSquadRoleFixed(false); // Reset Step 1 status
                          setSingleSquadRecalcResult(null); // Clear previous results
                          setCustomRoleTimestamps({ captain: null, viceCaptain: null, xFactor: null }); // Reset role timestamps
                        }}
                        label="Select Squad to Fix"
                        disabled={!selectedLeagueId}
                      >
                        <MenuItem value="">
                          <em>Choose a squad</em>
                        </MenuItem>
                        {squads.filter(s => s.isSubmitted).map((squad) => (
                          <MenuItem key={squad.id} value={squad.id}>
                            {squad.squadName} (Current: {squad.totalPoints?.toFixed(2) || 0} pts)
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Custom Banked Points Input */}
                    {selectedSquadForRecalc && (
                      <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(255, 152, 0, 0.1)', borderRadius: 1, border: '1px solid rgba(255, 152, 0, 0.3)' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>
                          ⚠️ Optional: Override Banked Points
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', mb: 2, color: 'text.secondary' }}>
                          If the transfer reversal corrupted your banked points, enter the correct value here.
                          Current banked points in DB: <strong>{squads.find(s => s.id === selectedSquadForRecalc)?.bankedPoints?.toFixed(2) || 0}</strong>
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                          <Button
                            size="small"
                            variant={customBankedPoints === null ? 'contained' : 'outlined'}
                            onClick={() => setCustomBankedPoints(null)}
                          >
                            Use Current
                          </Button>
                          <Button
                            size="small"
                            variant={customBankedPoints === 0 ? 'contained' : 'outlined'}
                            onClick={() => setCustomBankedPoints(0)}
                          >
                            Reset to 0
                          </Button>
                          <Button
                            size="small"
                            variant={customBankedPoints !== null && customBankedPoints !== 0 ? 'contained' : 'outlined'}
                            onClick={() => {
                              const value = prompt('Enter custom banked points value:', customBankedPoints?.toString() || '');
                              if (value !== null && value !== '') {
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue)) {
                                  setCustomBankedPoints(numValue);
                                }
                              }
                            }}
                          >
                            {customBankedPoints !== null && customBankedPoints !== 0
                              ? `Custom: ${customBankedPoints.toFixed(2)}`
                              : 'Enter Custom...'}
                          </Button>
                        </Box>
                      </Box>
                    )}

                    {/* Manual Role Timestamp Override */}
                    {selectedSquadForRecalc && singleSquadRoleFixed && (() => {
                      const squad = squads.find(s => s.id === selectedSquadForRecalc);
                      if (!squad) return null;

                      const captainPlayer = squad.players.find(p => p.playerId === squad.captainId);
                      const vcPlayer = squad.players.find(p => p.playerId === squad.viceCaptainId);
                      const xFactorPlayer = squad.players.find(p => p.playerId === squad.xFactorId);

                      return (
                        <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(33, 150, 243, 0.1)', borderRadius: 1, border: '1px solid rgba(33, 150, 243, 0.3)' }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1, color: 'info.main' }}>
                            🎯 Advanced: Manual Role Timestamp Override
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', mb: 2, color: 'text.secondary' }}>
                            If a role was NOT assigned from the start, manually set when each role was assigned (in points).
                            Example: If Starc became VC when he had 200 points, set VC timestamp to 200.
                          </Typography>

                          {/* Captain Timestamp */}
                          {captainPlayer && (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
                                Captain: {captainPlayer.playerName} (Current: {captainPlayer.points} pts)
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant={customRoleTimestamps.captain === null ? 'contained' : 'outlined'}
                                  onClick={() => setCustomRoleTimestamps(prev => ({ ...prev, captain: null }))}
                                >
                                  Use Existing ({captainPlayer.pointsWhenRoleAssigned ?? 0})
                                </Button>
                                <Button
                                  size="small"
                                  variant={customRoleTimestamps.captain === 0 ? 'contained' : 'outlined'}
                                  onClick={() => setCustomRoleTimestamps(prev => ({ ...prev, captain: 0 }))}
                                >
                                  From Start (0)
                                </Button>
                                <Button
                                  size="small"
                                  variant={customRoleTimestamps.captain !== null && customRoleTimestamps.captain !== 0 ? 'contained' : 'outlined'}
                                  onClick={() => {
                                    const value = prompt(`When was ${captainPlayer.playerName} assigned Captain? (points at that time):`, customRoleTimestamps.captain?.toString() || '');
                                    if (value !== null && value !== '') {
                                      const numValue = parseFloat(value);
                                      if (!isNaN(numValue)) {
                                        setCustomRoleTimestamps(prev => ({ ...prev, captain: numValue }));
                                      }
                                    }
                                  }}
                                >
                                  {customRoleTimestamps.captain !== null && customRoleTimestamps.captain !== 0
                                    ? `Custom: ${customRoleTimestamps.captain}`
                                    : 'Enter Custom...'}
                                </Button>
                              </Box>
                            </Box>
                          )}

                          {/* Vice-Captain Timestamp */}
                          {vcPlayer && (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
                                Vice-Captain: {vcPlayer.playerName} (Current: {vcPlayer.points} pts)
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant={customRoleTimestamps.viceCaptain === null ? 'contained' : 'outlined'}
                                  onClick={() => setCustomRoleTimestamps(prev => ({ ...prev, viceCaptain: null }))}
                                >
                                  Use Existing ({vcPlayer.pointsWhenRoleAssigned ?? 0})
                                </Button>
                                <Button
                                  size="small"
                                  variant={customRoleTimestamps.viceCaptain === 0 ? 'contained' : 'outlined'}
                                  onClick={() => setCustomRoleTimestamps(prev => ({ ...prev, viceCaptain: 0 }))}
                                >
                                  From Start (0)
                                </Button>
                                <Button
                                  size="small"
                                  variant={customRoleTimestamps.viceCaptain !== null && customRoleTimestamps.viceCaptain !== 0 ? 'contained' : 'outlined'}
                                  onClick={() => {
                                    const value = prompt(`When was ${vcPlayer.playerName} assigned Vice-Captain? (points at that time):`, customRoleTimestamps.viceCaptain?.toString() || '');
                                    if (value !== null && value !== '') {
                                      const numValue = parseFloat(value);
                                      if (!isNaN(numValue)) {
                                        setCustomRoleTimestamps(prev => ({ ...prev, viceCaptain: numValue }));
                                      }
                                    }
                                  }}
                                >
                                  {customRoleTimestamps.viceCaptain !== null && customRoleTimestamps.viceCaptain !== 0
                                    ? `Custom: ${customRoleTimestamps.viceCaptain}`
                                    : 'Enter Custom...'}
                                </Button>
                              </Box>
                            </Box>
                          )}

                          {/* X-Factor Timestamp */}
                          {xFactorPlayer && (
                            <Box sx={{ mb: 0 }}>
                              <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
                                X-Factor: {xFactorPlayer.playerName} (Current: {xFactorPlayer.points} pts)
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant={customRoleTimestamps.xFactor === null ? 'contained' : 'outlined'}
                                  onClick={() => setCustomRoleTimestamps(prev => ({ ...prev, xFactor: null }))}
                                >
                                  Use Existing ({xFactorPlayer.pointsWhenRoleAssigned ?? 0})
                                </Button>
                                <Button
                                  size="small"
                                  variant={customRoleTimestamps.xFactor === 0 ? 'contained' : 'outlined'}
                                  onClick={() => setCustomRoleTimestamps(prev => ({ ...prev, xFactor: 0 }))}
                                >
                                  From Start (0)
                                </Button>
                                <Button
                                  size="small"
                                  variant={customRoleTimestamps.xFactor !== null && customRoleTimestamps.xFactor !== 0 ? 'contained' : 'outlined'}
                                  onClick={() => {
                                    const value = prompt(`When was ${xFactorPlayer.playerName} assigned X-Factor? (points at that time):`, customRoleTimestamps.xFactor?.toString() || '');
                                    if (value !== null && value !== '') {
                                      const numValue = parseFloat(value);
                                      if (!isNaN(numValue)) {
                                        setCustomRoleTimestamps(prev => ({ ...prev, xFactor: numValue }));
                                      }
                                    }
                                  }}
                                >
                                  {customRoleTimestamps.xFactor !== null && customRoleTimestamps.xFactor !== 0
                                    ? `Custom: ${customRoleTimestamps.xFactor}`
                                    : 'Enter Custom...'}
                                </Button>
                              </Box>
                            </Box>
                          )}
                        </Box>
                      );
                    })()}

                    {/* Step 1: Fix Role Data Button */}
                    <Button
                      variant="contained"
                      color={singleSquadRoleFixed ? 'success' : 'warning'}
                      fullWidth
                      sx={{ mb: 1 }}
                      onClick={handleFixSingleSquadRoleTimestamps}
                      disabled={recalculating || !selectedSquadForRecalc}
                      startIcon={singleSquadRoleFixed ? <span>✅</span> : <span>🔧</span>}
                    >
                      {recalculating ? 'Fixing...' : singleSquadRoleFixed ? '✅ Step 1: Role Data Fixed' : 'Step 1: Fix Missing Role Data'}
                    </Button>

                    {/* Step 2: Preview Button */}
                    <Button
                      variant="contained"
                      color="info"
                      fullWidth
                      sx={{ mb: 1 }}
                      onClick={handleRecalculateSingleSquad}
                      disabled={recalculating || !selectedSquadForRecalc || !singleSquadRoleFixed}
                      startIcon={<span>🔄</span>}
                    >
                      {recalculating ? 'Calculating...' : 'Step 2: Preview Recalculation'}
                    </Button>

                    {/* Helper text if Step 1 not done */}
                    {selectedSquadForRecalc && !singleSquadRoleFixed && (
                      <Alert severity="info" sx={{ mb: 1 }}>
                        Please complete Step 1 first to fix any missing role timestamps before recalculating points.
                      </Alert>
                    )}

                    {/* Preview Results */}
                    {singleSquadRecalcResult && (
                      <Card sx={{ mt: 2, bgcolor: 'rgba(33, 150, 243, 0.1)', border: '1px solid', borderColor: 'info.main' }}>
                        <CardContent>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                            Preview for {singleSquadRecalcResult.squadName}:
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Old Points:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {singleSquadRecalcResult.oldPoints.toFixed(2)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">New Points:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                              {singleSquadRecalcResult.newPoints.toFixed(2)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="body2">Difference:</Typography>
                            <Chip
                              label={
                                (singleSquadRecalcResult.newPoints - singleSquadRecalcResult.oldPoints >= 0 ? '+' : '') +
                                (singleSquadRecalcResult.newPoints - singleSquadRecalcResult.oldPoints).toFixed(2)
                              }
                              size="small"
                              color={
                                singleSquadRecalcResult.newPoints - singleSquadRecalcResult.oldPoints === 0
                                  ? 'default'
                                  : singleSquadRecalcResult.newPoints - singleSquadRecalcResult.oldPoints > 0
                                  ? 'success'
                                  : 'error'
                              }
                            />
                          </Box>

                          {/* Detailed Breakdown */}
                          {singleSquadRecalcResult.breakdown && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1, border: '1px solid rgba(0, 0, 0, 0.1)' }}>
                              <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1, color: 'text.primary' }}>
                                Detailed Breakdown:
                              </Typography>

                              {/* Role Summary */}
                              <Box sx={{ mb: 2, p: 1, bgcolor: 'rgba(33, 150, 243, 0.08)', borderRadius: 1, border: '1px solid rgba(33, 150, 243, 0.2)' }}>
                                <Typography variant="caption" display="block" color="text.primary">
                                  Captain Contribution: {singleSquadRecalcResult.breakdown.captainPoints.toFixed(2)}
                                </Typography>
                                <Typography variant="caption" display="block" color="text.primary">
                                  Vice-Captain Contribution: {singleSquadRecalcResult.breakdown.viceCaptainPoints.toFixed(2)}
                                </Typography>
                                <Typography variant="caption" display="block" color="text.primary">
                                  X-Factor Contribution: {singleSquadRecalcResult.breakdown.xFactorPoints.toFixed(2)}
                                </Typography>
                                <Typography variant="caption" display="block" color="text.primary">
                                  Banked Points: {singleSquadRecalcResult.breakdown.bankedPoints.toFixed(2)}
                                </Typography>
                              </Box>

                              {/* Player List */}
                              <TableContainer sx={{ maxHeight: 300 }}>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontSize: '0.75rem' }}>Player</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '0.75rem' }}>Points</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '0.75rem' }}>At Joining</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '0.75rem' }}>Contribution</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {singleSquadRecalcResult.breakdown.playerBreakdown.map((player, idx) => (
                                      <TableRow key={idx} sx={{ bgcolor: player.role ? 'rgba(33, 150, 243, 0.05)' : 'transparent' }}>
                                        <TableCell sx={{ fontSize: '0.75rem' }}>
                                          {player.name}
                                          {player.role && (
                                            <Chip
                                              label={player.role.charAt(0)}
                                              size="small"
                                              color="primary"
                                              sx={{ ml: 0.5, height: 16, fontSize: '0.65rem' }}
                                            />
                                          )}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontSize: '0.75rem' }}>{player.points.toFixed(2)}</TableCell>
                                        <TableCell align="right" sx={{ fontSize: '0.75rem' }}>{player.pointsAtJoining.toFixed(2)}</TableCell>
                                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                                          {player.contribution.toFixed(2)}
                                          {player.multiplier && player.multiplier !== 1.0 && (
                                            <Typography component="span" variant="caption" sx={{ ml: 0.5, color: 'primary.main' }}>
                                              ({player.multiplier}x)
                                            </Typography>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Box>
                          )}

                          <Button
                            variant="contained"
                            color="success"
                            fullWidth
                            sx={{ mt: 2 }}
                            onClick={handleApplySingleSquadRecalc}
                            disabled={recalculating}
                          >
                            {recalculating ? 'Applying...' : 'Apply Changes (This Squad Only)'}
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {successMessage && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        {successMessage}
                      </Alert>
                    )}
                    {errorMessage && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {errorMessage}
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </TabPanel>

          {/* Transfer Investigation Tab */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              🔍 Transfer Investigation & Transparency
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select a league and squad to view all transfer history with complete backend data for investigation and debugging.
            </Typography>

            {/* League Selector */}
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Select League</InputLabel>
                <Select
                  value={selectedLeagueId}
                  onChange={(e) => setSelectedLeagueId(e.target.value)}
                  label="Select League"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {leagues.map((league) => (
                    <MenuItem key={league.id} value={league.id}>
                      {league.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Squad Selector */}
            <FormControl fullWidth sx={{ mb: 3 }} disabled={!selectedLeagueId}>
              <InputLabel>Select Squad to Investigate</InputLabel>
              <Select
                value={selectedSquadForInvestigation}
                onChange={(e) => {
                  setSelectedSquadForInvestigation(e.target.value);
                  setExpandedTransferIndex(null); // Reset expansion
                }}
                label="Select Squad to Investigate"
              >
                <MenuItem value="">
                  <em>Choose a squad</em>
                </MenuItem>
                {squads.map((squad) => (
                  <MenuItem key={squad.id} value={squad.id}>
                    {squad.squadName} ({squad.transferHistory?.length || 0} transfers)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Squad Investigation Display */}
            {selectedSquadForInvestigation && (() => {
              const squad = squads.find(s => s.id === selectedSquadForInvestigation);
              if (!squad) return null;

              return (
                <Box>
                  {/* Squad Summary */}
                  <Card sx={{ mb: 3, bgcolor: 'rgba(33, 150, 243, 0.05)' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                        Squad Summary: {squad.squadName}
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Total Points</Typography>
                          <Typography variant="h6">{((squad.totalPoints || 0) + (squad.predictionBonusPoints || 0)).toFixed(2)}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Banked Points</Typography>
                          <Typography variant="h6">{squad.bankedPoints?.toFixed(2) || 0}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Transfers Made</Typography>
                          <Typography variant="h6">{squad.transferHistory?.length || 0}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Bench Transfers</Typography>
                          <Typography variant="h6">{squad.benchTransfersUsed || 0}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Flexible Transfers</Typography>
                          <Typography variant="h6">{squad.flexibleTransfersUsed || 0}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Mid-Season Transfers</Typography>
                          <Typography variant="h6">{squad.midSeasonTransfersUsed || 0}</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Current Squad Roles */}
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                        Current Roles
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                        <Box sx={{ p: 2, bgcolor: 'rgba(255, 193, 7, 0.1)', borderRadius: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                            ⭐ Captain (2x)
                          </Typography>
                          <Typography variant="body2">
                            {squad.players.find(p => p.playerId === squad.captainId)?.playerName || 'None'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Assigned at: {squad.players.find(p => p.playerId === squad.captainId)?.pointsWhenRoleAssigned ?? 'N/A'} pts
                          </Typography>
                        </Box>
                        <Box sx={{ p: 2, bgcolor: 'rgba(156, 39, 176, 0.1)', borderRadius: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                            👤 Vice-Captain (1.5x)
                          </Typography>
                          <Typography variant="body2">
                            {squad.players.find(p => p.playerId === squad.viceCaptainId)?.playerName || 'None'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Assigned at: {squad.players.find(p => p.playerId === squad.viceCaptainId)?.pointsWhenRoleAssigned ?? 'N/A'} pts
                          </Typography>
                        </Box>
                        <Box sx={{ p: 2, bgcolor: 'rgba(233, 30, 99, 0.1)', borderRadius: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                            ⚡ X-Factor (1.25x)
                          </Typography>
                          <Typography variant="body2">
                            {squad.players.find(p => p.playerId === squad.xFactorId)?.playerName || 'None'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Assigned at: {squad.players.find(p => p.playerId === squad.xFactorId)?.pointsWhenRoleAssigned ?? 'N/A'} pts
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Transfer History */}
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Transfer History ({squad.transferHistory?.length || 0} total)
                  </Typography>

                  {!squad.transferHistory || squad.transferHistory.length === 0 ? (
                    <Alert severity="info">No transfers made yet for this squad.</Alert>
                  ) : (
                    squad.transferHistory.map((transfer, index) => {
                      const isExpanded = expandedTransferIndex === index;
                      const playerOut = squad.players.find(p => p.playerId === transfer.playerOut);
                      const playerIn = squad.players.find(p => p.playerId === transfer.playerIn);

                      return (
                        <Card key={index} sx={{ mb: 2, border: isExpanded ? '2px solid' : '1px solid', borderColor: isExpanded ? 'primary.main' : 'divider' }}>
                          <CardContent>
                            {/* Transfer Header */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: isExpanded ? 2 : 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Chip
                                  label={`#${index + 1}`}
                                  size="small"
                                  color="primary"
                                  sx={{ fontWeight: 'bold' }}
                                />
                                <Chip
                                  label={transfer.transferType || 'Unknown'}
                                  size="small"
                                  color={
                                    transfer.transferType === 'bench' ? 'info' :
                                    transfer.transferType === 'flexible' ? 'warning' :
                                    transfer.transferType === 'midSeason' ? 'secondary' : 'default'
                                  }
                                />
                                <Chip
                                  label={transfer.changeType === 'playerSubstitution' ? 'Player Swap' : 'Role Change'}
                                  size="small"
                                  variant="outlined"
                                />
                                <Typography variant="caption" color="text.secondary">
                                  {transfer.timestamp instanceof Date
                                    ? transfer.timestamp.toLocaleString()
                                    : new Date(transfer.timestamp).toLocaleString()}
                                </Typography>
                              </Box>
                              <Button
                                size="small"
                                onClick={() => setExpandedTransferIndex(isExpanded ? null : index)}
                              >
                                {isExpanded ? 'Hide Details' : 'Show Details'}
                              </Button>
                            </Box>

                            {/* Expanded Details */}
                            {isExpanded && (
                              <Box sx={{ mt: 2 }}>
                                {/* Player Substitution Details */}
                                {transfer.changeType === 'playerSubstitution' && (
                                  <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
                                      🔄 Player Substitution
                                    </Typography>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                                      {/* Player OUT */}
                                      <Box sx={{ p: 2, bgcolor: 'rgba(244, 67, 54, 0.1)', borderRadius: 1, border: '1px solid rgba(244, 67, 54, 0.3)' }}>
                                        <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1, color: 'error.main' }}>
                                          ⬅️ Player OUT
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                          {playerOut?.playerName || transfer.playerOut || 'Unknown'}
                                        </Typography>
                                        {playerOut && (
                                          <>
                                            <Typography variant="caption" display="block">Team: {playerOut.team}</Typography>
                                            <Typography variant="caption" display="block">Role: {playerOut.role}</Typography>
                                            <Typography variant="caption" display="block">Current Points: {playerOut.points}</Typography>
                                            <Typography variant="caption" display="block">Points at Joining: {playerOut.pointsAtJoining ?? 'N/A'}</Typography>
                                            {playerOut.pointsWhenRoleAssigned !== undefined && (
                                              <Typography variant="caption" display="block">
                                                Points When Role Assigned: {playerOut.pointsWhenRoleAssigned}
                                              </Typography>
                                            )}
                                          </>
                                        )}
                                      </Box>

                                      {/* Player IN */}
                                      <Box sx={{ p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 1, border: '1px solid rgba(76, 175, 80, 0.3)' }}>
                                        <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1, color: 'success.main' }}>
                                          ➡️ Player IN
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                          {playerIn?.playerName || transfer.playerIn || 'Unknown'}
                                        </Typography>
                                        {playerIn && (
                                          <>
                                            <Typography variant="caption" display="block">Team: {playerIn.team}</Typography>
                                            <Typography variant="caption" display="block">Role: {playerIn.role}</Typography>
                                            <Typography variant="caption" display="block">Current Points: {playerIn.points}</Typography>
                                            <Typography variant="caption" display="block">Points at Joining: {playerIn.pointsAtJoining ?? 'N/A'}</Typography>
                                            {playerIn.pointsWhenRoleAssigned !== undefined && (
                                              <Typography variant="caption" display="block">
                                                Points When Role Assigned: {playerIn.pointsWhenRoleAssigned}
                                              </Typography>
                                            )}
                                          </>
                                        )}
                                      </Box>
                                    </Box>
                                  </Box>
                                )}

                                {/* Role Reassignment Details */}
                                {transfer.changeType === 'roleReassignment' && (
                                  <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
                                      👤 Role Reassignment
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                      {transfer.newViceCaptainId && (
                                        <Chip
                                          label={`New VC: ${squad.players.find(p => p.playerId === transfer.newViceCaptainId)?.playerName || transfer.newViceCaptainId}`}
                                          color="secondary"
                                        />
                                      )}
                                      {transfer.newXFactorId && (
                                        <Chip
                                          label={`New X-Factor: ${squad.players.find(p => p.playerId === transfer.newXFactorId)?.playerName || transfer.newXFactorId}`}
                                          color="error"
                                        />
                                      )}
                                    </Box>
                                  </Box>
                                )}

                                {/* Raw Backend Data */}
                                <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>
                                    🔧 Complete Backend Data (JSON)
                                  </Typography>
                                  <Box
                                    component="pre"
                                    sx={{
                                      p: 2,
                                      bgcolor: '#1e1e1e',
                                      color: '#d4d4d4',
                                      borderRadius: 1,
                                      overflow: 'auto',
                                      fontSize: '0.75rem',
                                      maxHeight: 400
                                    }}
                                  >
                                    {JSON.stringify(transfer, null, 2)}
                                  </Box>
                                </Box>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </Box>
              );
            })()}
          </TabPanel>

          {/* Player Pool History Tab */}
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              📊 Player Pool Update History
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              View the complete history of player pool updates with point changes for each player.
            </Typography>

            {/* Player Pool Selector */}
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Select Player Pool</InputLabel>
                <Select
                  value={selectedPoolId}
                  onChange={(e) => setSelectedPoolId(e.target.value)}
                  label="Select Player Pool"
                >
                  {playerPools.map((pool) => (
                    <MenuItem key={pool.id} value={pool.id}>
                      {pool.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Loading State */}
            {loadingSnapshots && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {/* Snapshots Display */}
            {!loadingSnapshots && selectedPoolId && poolSnapshots.length === 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    No update history found for this player pool yet. Snapshots are created automatically when you update player points.
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={async () => {
                      try {
                        setLoadingSnapshots(true);
                        const selectedPool = playerPools.find(p => p.id === selectedPoolId);
                        await playerPoolSnapshotService.create(
                          selectedPoolId,
                          `Initial Baseline - ${selectedPool?.name || 'Unknown'}`,
                          user?.uid
                        );
                        // Reload snapshots
                        const snapshots = await playerPoolSnapshotService.getByPoolId(selectedPoolId);
                        setPoolSnapshots(snapshots);
                        setSuccessMessage('✅ Baseline snapshot created successfully!');
                      } catch (error: any) {
                        console.error('Error creating baseline snapshot:', error);
                        setErrorMessage(error.message || 'Failed to create baseline snapshot');
                      } finally {
                        setLoadingSnapshots(false);
                      }
                    }}
                  >
                    Create Baseline Snapshot Now
                  </Button>
                </Box>
              </Alert>
            )}

            {!loadingSnapshots && poolSnapshots.length > 0 && (
              <Box>
                {poolSnapshots.map((snapshot, index) => (
                  <Card key={snapshot.id} sx={{ mb: 3 }}>
                    <CardContent>
                      {/* Snapshot Header */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {snapshot.updateMessage || `Update ${poolSnapshots.length - index}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(snapshot.snapshotDate).toLocaleString()}
                        </Typography>
                      </Box>

                      {/* Point Changes */}
                      {snapshot.changes && snapshot.changes.length > 0 ? (
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell><strong>Player</strong></TableCell>
                                <TableCell><strong>Team</strong></TableCell>
                                <TableCell align="right"><strong>Previous</strong></TableCell>
                                <TableCell align="right"><strong>New</strong></TableCell>
                                <TableCell align="right"><strong>Change</strong></TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {snapshot.changes.map((change) => (
                                <TableRow key={change.playerId}>
                                  <TableCell>{change.name}</TableCell>
                                  <TableCell>
                                    {snapshot.players.find(p => p.playerId === change.playerId)?.team || '-'}
                                  </TableCell>
                                  <TableCell align="right">{change.previousPoints}</TableCell>
                                  <TableCell align="right">{change.newPoints}</TableCell>
                                  <TableCell align="right">
                                    <Chip
                                      label={change.delta > 0 ? `+${change.delta}` : change.delta}
                                      color={change.delta > 0 ? 'success' : change.delta < 0 ? 'error' : 'default'}
                                      size="small"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No point changes in this update (or first snapshot).
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}

            {!selectedPoolId && (
              <Alert severity="info">
                Please select a player pool to view its update history.
              </Alert>
            )}
          </TabPanel>

          {/* Transfer History Tab */}
          <TabPanel value={tabValue} index={4}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              🔄 Squad Changes Timeline
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              View all squad changes (player swaps & role changes) from all users, grouped by player pool updates and sorted chronologically.
            </Typography>

            {/* League Selector */}
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Select League</InputLabel>
                <Select
                  value={transferHistoryLeagueId}
                  onChange={(e) => setTransferHistoryLeagueId(e.target.value)}
                  label="Select League"
                >
                  {leagues.map((league) => (
                    <MenuItem key={league.id} value={league.id}>
                      {league.name} - {league.tournamentName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Loading State */}
            {loadingTransfers && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {/* No League Selected */}
            {!transferHistoryLeagueId && !loadingTransfers && (
              <Alert severity="info">
                Please select a league to view transfer history.
              </Alert>
            )}

            {/* No Transfers Found */}
            {!loadingTransfers && transferHistoryLeagueId && transfers.length === 0 && (
              <Alert severity="info">
                No squad changes found for this league yet. Squad changes will appear here when users make player swaps or role reassignments.
              </Alert>
            )}

            {/* Transfer Timeline */}
            {!loadingTransfers && transferHistoryLeagueId && transfers.length > 0 && (
              <Box>
                {(() => {
                  // Group transfers by PlayerPool snapshot
                  const groupedTransfers: Map<string, any[]> = new Map();

                  // Sort snapshots by date (newest first)
                  const sortedSnapshots = [...transferSnapshots].sort((a, b) =>
                    new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()
                  );

                  // For each transfer, find which snapshot period it belongs to
                  transfers.forEach(transfer => {
                    const transferDate = new Date(transfer.timestamp);

                    // Find the snapshot that this transfer was made after
                    const snapshot = sortedSnapshots.find(s =>
                      new Date(s.snapshotDate) <= transferDate
                    );

                    const key = snapshot?.id || 'before-snapshots';
                    if (!groupedTransfers.has(key)) {
                      groupedTransfers.set(key, []);
                    }
                    groupedTransfers.get(key)!.push(transfer);
                  });

                  return (
                    <Box>
                      {Array.from(groupedTransfers.entries()).map(([snapshotId, snapshotTransfers]) => {
                        const snapshot = sortedSnapshots.find(s => s.id === snapshotId);

                        return (
                          <Card key={snapshotId} sx={{ mb: 3 }}>
                            <CardContent>
                              {/* Snapshot Header */}
                              <Box sx={{ mb: 2, pb: 2, borderBottom: '2px solid', borderColor: 'primary.main' }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                                  📅 {snapshot?.updateMessage || 'Initial Transfers'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {snapshot
                                    ? `Updated on: ${new Date(snapshot.snapshotDate).toLocaleString()}`
                                    : 'Transfers before first player pool update'}
                                </Typography>
                                <Chip
                                  label={`${snapshotTransfers.length} transfer${snapshotTransfers.length !== 1 ? 's' : ''}`}
                                  size="small"
                                  color="primary"
                                  sx={{ mt: 1 }}
                                />
                              </Box>

                              {/* Transfers Table */}
                              <TableContainer>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell><strong>User / Squad</strong></TableCell>
                                      <TableCell><strong>Change Type</strong></TableCell>
                                      <TableCell><strong>Transfer Type</strong></TableCell>
                                      <TableCell><strong>Details</strong></TableCell>
                                      <TableCell><strong>Timestamp</strong></TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {snapshotTransfers
                                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                      .map((transfer, idx) => {
                                        const timeSince = () => {
                                          const now = new Date();
                                          const then = new Date(transfer.timestamp);
                                          const diffMs = now.getTime() - then.getTime();
                                          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                          const diffDays = Math.floor(diffHours / 24);

                                          if (diffDays > 0) return `${diffDays}d ago`;
                                          if (diffHours > 0) return `${diffHours}h ago`;
                                          return 'Just now';
                                        };

                                        return (
                                          <TableRow key={`${transfer.squadId}-${idx}`}>
                                            <TableCell>
                                              <Box display="flex" alignItems="center" gap={1}>
                                                <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
                                                  {transfer.squadName?.slice(0, 2).toUpperCase() || 'U'}
                                                </Avatar>
                                                <Box>
                                                  <Typography variant="body2" fontWeight="medium">
                                                    {transfer.squadName || 'Unknown Squad'}
                                                  </Typography>
                                                  <Typography variant="caption" color="text.secondary">
                                                    {transfer.userId?.slice(0, 8)}
                                                  </Typography>
                                                </Box>
                                              </Box>
                                            </TableCell>
                                            <TableCell>
                                              <Chip
                                                label={transfer.changeType === 'playerSubstitution' ? '🔄 Player Swap' : '👤 Role Change'}
                                                size="small"
                                                color={transfer.changeType === 'playerSubstitution' ? 'primary' : 'secondary'}
                                                variant="outlined"
                                              />
                                            </TableCell>
                                            <TableCell>
                                              <Chip
                                                label={
                                                  transfer.transferType === 'bench' ? 'Bench' :
                                                  transfer.transferType === 'flexible' ? 'Flexible' :
                                                  transfer.transferType === 'midSeason' ? 'Mid-Season' : 'Unknown'
                                                }
                                                size="small"
                                                color={
                                                  transfer.transferType === 'bench' ? 'info' :
                                                  transfer.transferType === 'flexible' ? 'warning' :
                                                  transfer.transferType === 'midSeason' ? 'success' : 'default'
                                                }
                                              />
                                            </TableCell>
                                            <TableCell>
                                              {transfer.changeType === 'playerSubstitution' ? (
                                                <Box display="flex" alignItems="center" gap={1}>
                                                  <Chip
                                                    label={playerNameMap.get(transfer.playerOut) || transfer.playerOut || 'Unknown'}
                                                    size="small"
                                                    color="error"
                                                    variant="outlined"
                                                  />
                                                  <Typography variant="caption">→</Typography>
                                                  <Chip
                                                    label={playerNameMap.get(transfer.playerIn) || transfer.playerIn || 'Unknown'}
                                                    size="small"
                                                    color="success"
                                                    variant="outlined"
                                                  />
                                                </Box>
                                              ) : (
                                                <Box>
                                                  {transfer.newViceCaptainId && (
                                                    <Typography variant="caption" display="block">
                                                      New VC: {playerNameMap.get(transfer.newViceCaptainId) || transfer.newViceCaptainId}
                                                    </Typography>
                                                  )}
                                                  {transfer.newXFactorId && (
                                                    <Typography variant="caption" display="block">
                                                      New X: {playerNameMap.get(transfer.newXFactorId) || transfer.newXFactorId}
                                                    </Typography>
                                                  )}
                                                </Box>
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              <Typography variant="body2">
                                                {new Date(transfer.timestamp).toLocaleString()}
                                              </Typography>
                                              <Typography variant="caption" color="text.secondary">
                                                {timeSince()}
                                              </Typography>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Box>
                  );
                })()}
              </Box>
            )}
          </TabPanel>
        </Card>
      </Container>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, squadId: '', transferIndex: -1, transferData: null })}
      >
        <DialogTitle>Confirm Reverse Transfer</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to reverse this transfer? This action will:
          </Typography>
          <Box component="ul" sx={{ mt: 2 }}>
            <li>Restore the previous squad composition</li>
            <li>Return banked points to the player</li>
            <li>Refund the transfer count</li>
            <li>Add a note to the transfer history</li>
          </Box>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone!
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog({ open: false, squadId: '', transferIndex: -1, transferData: null })}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirmReverse} color="warning" variant="contained" disabled={loading}>
            {loading ? 'Reversing...' : 'Confirm Reverse'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Role Fix Dialog */}
      <Dialog
        open={roleFixDialog.open}
        onClose={() => setRoleFixDialog({ open: false, squad: null, missingRole: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Fix Missing {roleFixDialog.missingRole === 'captain' ? 'Captain' : roleFixDialog.missingRole === 'viceCaptain' ? 'Vice-Captain' : 'X-Factor'}
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom sx={{ mb: 2 }}>
            Select a player from the main squad to assign as the{' '}
            {roleFixDialog.missingRole === 'captain' ? 'Captain' : roleFixDialog.missingRole === 'viceCaptain' ? 'Vice-Captain' : 'X-Factor'}:
          </Typography>

          {roleFixDialog.squad && (
            <FormControl fullWidth>
              <InputLabel>Select Player</InputLabel>
              <Select
                value={selectedPlayerForRole}
                onChange={(e) => setSelectedPlayerForRole(e.target.value)}
                label="Select Player"
              >
                <MenuItem value="">
                  <em>Choose a player</em>
                </MenuItem>
                {(() => {
                  const selectedLeague = leagues.find(l => l.id === selectedLeagueId);
                  const squadSize = selectedLeague?.squadSize || 11;
                  const mainSquadPlayers = roleFixDialog.squad.players.slice(0, squadSize);

                  // Filter out players who already have a role (unless this is fixing that role)
                  return mainSquadPlayers
                    .filter(p => {
                      if (roleFixDialog.missingRole === 'captain') {
                        // Can't select current VC or X
                        return p.playerId !== roleFixDialog.squad!.viceCaptainId && p.playerId !== roleFixDialog.squad!.xFactorId;
                      } else if (roleFixDialog.missingRole === 'viceCaptain') {
                        // Can't select current C or X
                        return p.playerId !== roleFixDialog.squad!.captainId && p.playerId !== roleFixDialog.squad!.xFactorId;
                      } else if (roleFixDialog.missingRole === 'xFactor') {
                        // Can't select current C or VC
                        return p.playerId !== roleFixDialog.squad!.captainId && p.playerId !== roleFixDialog.squad!.viceCaptainId;
                      }
                      return true;
                    })
                    .map(player => (
                      <MenuItem key={player.playerId} value={player.playerId}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                            {player.playerName.charAt(0)}
                          </Avatar>
                          <Typography>{player.playerName}</Typography>
                          <Chip label={player.role} size="small" sx={{ ml: 'auto' }} />
                        </Box>
                      </MenuItem>
                    ));
                })()}
              </Select>
            </FormControl>
          )}

          <Alert severity="info" sx={{ mt: 2 }}>
            This will assign the selected player as the{' '}
            {roleFixDialog.missingRole === 'captain' ? 'Captain' : roleFixDialog.missingRole === 'viceCaptain' ? 'Vice-Captain' : 'X-Factor'}{' '}
            and set their role assignment points to their current points.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRoleFixDialog({ open: false, squad: null, missingRole: null });
              setSelectedPlayerForRole('');
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRoleFix}
            color="warning"
            variant="contained"
            disabled={loading || !selectedPlayerForRole}
          >
            {loading ? 'Assigning...' : 'Assign Role'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snapshot Selection Dialog */}
      <Dialog
        open={showSnapshotDialog}
        onClose={() => setShowSnapshotDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Choose Snapshot</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>Restore:</strong> Replaces squads entirely (loses transfers)<br/>
            <strong>Recalculate:</strong> Keeps transfers, uses snapshot points as baseline
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Created At</TableCell>
                  <TableCell>Player Pool Version</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {availableSnapshots.map((snapshot) => (
                  <TableRow key={snapshot.id}>
                    <TableCell>
                      {snapshot.snapshotDate?.toLocaleString?.() ||
                        new Date(snapshot.snapshotDate).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={snapshot.playerPoolVersion || 'Unknown'}
                        color="primary"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          color={snapshotDialogMode === 'restore' ? 'primary' : 'warning'}
                          onClick={() => {
                            if (snapshotDialogMode === 'restore') {
                              handleRestoreWithSnapshot(snapshot.id);
                            } else {
                              handleRecalculateWithSnapshot(snapshot.id);
                            }
                          }}
                        >
                          {snapshotDialogMode === 'restore' ? 'Restore from This' :
                           'Recalculate with This'}
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSnapshotDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPage;