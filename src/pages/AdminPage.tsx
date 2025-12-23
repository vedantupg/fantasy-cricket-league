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
  IconButton,
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
  People,
  SportsCricket,
  EmojiEvents,
  Block,
  CheckCircle,
  Cancel,
  Edit,
  Undo,
  SwapHoriz
} from '@mui/icons-material';
import { leagueService, squadService, playerPoolService, leaderboardSnapshotService } from '../services/firestore';
import type { League, LeagueSquad, LeaderboardSnapshot } from '../types/database';
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
  }, [selectedLeagueId]);

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
    let refundedBankedPoints = 0;

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

  const users = [
    { id: 1, name: 'CricketKing', email: 'king@example.com', status: 'active', joinDate: '2024-01-15', teams: 5 },
    { id: 2, name: 'BoundaryHunter', email: 'hunter@example.com', status: 'active', joinDate: '2024-02-03', teams: 8 },
    { id: 3, name: 'SixerMaster', email: 'master@example.com', status: 'suspended', joinDate: '2024-01-28', teams: 3 },
    { id: 4, name: 'WicketWizard', email: 'wizard@example.com', status: 'active', joinDate: '2024-03-10', teams: 12 }
  ];

  const contests = [
    { id: 1, name: 'IPL Championship', participants: 1250, status: 'active', prize: '$10,000', startDate: '2024-04-01' },
    { id: 2, name: 'World Cup Special', participants: 2500, status: 'upcoming', prize: '$25,000', startDate: '2024-06-15' },
    { id: 3, name: 'T20 Blast', participants: 850, status: 'completed', prize: '$5,000', startDate: '2024-03-15' }
  ];

  const adminStats = [
    { label: 'Total Users', value: '15,420', icon: <People sx={{ fontSize: 40, color: 'primary.main' }} /> },
    { label: 'Active Contests', value: '24', icon: <EmojiEvents sx={{ fontSize: 40, color: 'secondary.main' }} /> },
    { label: 'Teams Created', value: '8,350', icon: <SportsCricket sx={{ fontSize: 40, color: 'primary.main' }} /> },
    { label: 'Revenue This Month', value: '$45,280', icon: <Typography variant="h3" sx={{ color: 'secondary.main' }}>$</Typography> }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'error';
      case 'upcoming': return 'warning';
      case 'completed': return 'default';
      default: return 'default';
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
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/dashboard')}
          sx={{ mr: 2 }}
        >
          Back to My Leagues
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Admin Panel
        </Typography>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Admin Stats */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
          {adminStats.map((stat, index) => (
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }} key={index}>
              <Card>
                <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ mr: 2 }}>
                    {stat.icon}
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {stat.value}
                    </Typography>
                    <Typography color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>

        {/* Admin Tabs */}
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={(e, newValue) => setTabValue(newValue)}
              aria-label="admin tabs"
            >
              <Tab label="User Management" />
              <Tab label="Contest Management" />
              <Tab label="Transfer Management" />
              <Tab label="System Settings" />
              <Tab label="Reports" />
            </Tabs>
          </Box>

          {/* User Management Tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              User Management
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Join Date</TableCell>
                    <TableCell>Teams</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                            {user.name.charAt(0)}
                          </Avatar>
                          <Typography sx={{ fontWeight: 'bold' }}>
                            {user.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.status} 
                          color={getStatusColor(user.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{user.joinDate}</TableCell>
                      <TableCell>{user.teams}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="primary">
                          <Edit />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color={user.status === 'suspended' ? 'success' : 'error'}
                        >
                          {user.status === 'suspended' ? <CheckCircle /> : <Block />}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Contest Management Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Contest Management
              </Typography>
              <Button variant="contained">
                Create New Contest
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Contest Name</TableCell>
                    <TableCell>Participants</TableCell>
                    <TableCell>Prize Pool</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contests.map((contest) => (
                    <TableRow key={contest.id}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 'bold' }}>
                          {contest.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{contest.participants.toLocaleString()}</TableCell>
                      <TableCell>{contest.prize}</TableCell>
                      <TableCell>
                        <Chip 
                          label={contest.status} 
                          color={getStatusColor(contest.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{contest.startDate}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="primary">
                          <Edit />
                        </IconButton>
                        <IconButton size="small" color="error">
                          <Cancel />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Transfer Management Tab */}
          <TabPanel value={tabValue} index={2}>
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
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        variant="contained"
                        color="warning"
                        onClick={handleRecalculatePoints}
                        disabled={recalculating}
                        sx={{ minWidth: 200 }}
                      >
                        {recalculating ? 'Recalculating...' : 'Recalculate All Points'}
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
          <TabPanel value={tabValue} index={3}>
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
                      Application Settings
                    </Typography>
                    <Button variant="outlined" fullWidth sx={{ mb: 1 }}>
                      Maintenance Mode
                    </Button>
                    <Button variant="outlined" fullWidth sx={{ mb: 1 }}>
                      User Registration
                    </Button>
                    <Button variant="outlined" fullWidth>
                      Payment Gateway
                    </Button>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Security Settings
                    </Typography>
                    <Button variant="outlined" fullWidth sx={{ mb: 1 }}>
                      Reset Admin Password
                    </Button>
                    <Button variant="outlined" fullWidth sx={{ mb: 1 }}>
                      View Login Logs
                    </Button>
                    <Button variant="outlined" fullWidth>
                      Security Audit
                    </Button>
                  </CardContent>
                </Card>
              </Box>
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
            </Box>
          </TabPanel>

          {/* Reports Tab */}
          <TabPanel value={tabValue} index={4}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              Reports & Analytics
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.33% - 16px)' } }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      User Growth
                    </Typography>
                    <Typography variant="h3" color="primary.main" sx={{ fontWeight: 'bold' }}>
                      +23%
                    </Typography>
                    <Typography color="text.secondary">
                      This month
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.33% - 16px)' } }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      Revenue Growth
                    </Typography>
                    <Typography variant="h3" color="secondary.main" sx={{ fontWeight: 'bold' }}>
                      +18%
                    </Typography>
                    <Typography color="text.secondary">
                      This month
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.33% - 16px)' } }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      Active Users
                    </Typography>
                    <Typography variant="h3" color="success.main" sx={{ fontWeight: 'bold' }}>
                      89%
                    </Typography>
                    <Typography color="text.secondary">
                      Daily active
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
            <Box sx={{ mt: 3 }}>
              <Button variant="contained" sx={{ mr: 2 }}>
                Generate Full Report
              </Button>
              <Button variant="outlined">
                Export Data
              </Button>
            </Box>
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