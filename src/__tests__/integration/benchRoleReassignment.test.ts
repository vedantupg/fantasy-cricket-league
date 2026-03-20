/**
 * Integration Test: Bench Transfer + Role Reassignment
 *
 * This test reproduces the PT-001 error that occurs when a user:
 * 1. Selects "Make a transfer"
 * 2. Selects "Bench transfer" (transferType === 'bench')
 * 3. Selects "Reassign Roles" (changeType === 'roleReassignment')
 * 4. Selects a regular player to become Captain
 * 5. Confirms the transfer
 *
 * Expected: Points should remain stable (no PT-001 error)
 * Actual: PT-001 error occurs due to point instability
 */

import { calculatePlayerContribution, calculateSquadPoints } from '../../utils/pointsCalculation';
import type { SquadPlayer } from '../../types/database';

describe('Bench Transfer + Role Reassignment - PT-001 Bug', () => {
  // Helper to create a test player
  const createPlayer = (
    id: string,
    name: string,
    points: number,
    pointsAtJoining: number = 0,
    pointsWhenRoleAssigned?: number
  ): SquadPlayer => ({
    playerId: id,
    playerName: name,
    team: 'Test Team',
    role: 'batsman',
    points,
    pointsAtJoining,
    pointsWhenRoleAssigned,
    matchPerformances: {},
  });

  it('should maintain point stability when reassigning captain to regular player (bench transfer)', () => {
    // SCENARIO: User has a captain and wants to make a regular player the new captain
    // Using a BENCH transfer slot (not flexible transfer)
    // NO player substitution - ONLY role reassignment

    const squadSize = 11;

    // Create 11 players
    const players: SquadPlayer[] = [];
    for (let i = 1; i <= 11; i++) {
      players.push(createPlayer(`p${i}`, `Player ${i}`, 50, 0));
    }

    // Player 1 is current Captain: joined at 0, assigned captain at 100, now has 200 points
    // Captain contribution: (100-0)*1.0 + (200-100)*2.0 = 100 + 200 = 300
    players[0] = createPlayer('p1', 'Current Captain', 200, 0, 100);

    // Player 2 is a regular player with points: joined at 0, now has 150 points
    // Regular contribution: 150 - 0 = 150
    players[1] = createPlayer('p2', 'Regular Player', 150, 0); // NO pointsWhenRoleAssigned!

    const captainId = 'p1';
    const bankedPoints = 100;

    // Calculate BEFORE role reassignment
    const beforePoints = calculateSquadPoints(
      players,
      squadSize,
      captainId,
      undefined,
      undefined,
      bankedPoints
    );

    console.log('Before role reassignment:', beforePoints);

    // SIMULATE THE TRANSFER (this is what SquadSelectionPage does)
    // Step 1: Create deep copy of players
    const updatedPlayers = players.map(p => ({ ...p }));
    let additionalBankedPoints = 0;

    // Step 2: Bank old Captain's contribution
    const oldCaptain = updatedPlayers.find(p => p.playerId === 'p1');
    if (oldCaptain) {
      const captainContribution = calculatePlayerContribution(oldCaptain, 'captain');
      additionalBankedPoints += captainContribution;
      console.log('Old captain contribution banked:', captainContribution);

      // Reset old Captain's baseline
      oldCaptain.pointsAtJoining = oldCaptain.points;
      oldCaptain.pointsWhenRoleAssigned = oldCaptain.points;
    }

    // Step 3: Bank new Captain's contribution as a regular player (THIS IS THE FIX!)
    const newCaptain = updatedPlayers.find(p => p.playerId === 'p2');
    if (newCaptain) {
      const regularContribution = calculatePlayerContribution(newCaptain, 'regular');
      additionalBankedPoints += regularContribution;
      console.log('New captain regular contribution banked:', regularContribution);

      // Reset new Captain's baseline
      newCaptain.pointsAtJoining = newCaptain.points;
      newCaptain.pointsWhenRoleAssigned = newCaptain.points;
      console.log('New captain baseline reset to:', newCaptain.points);
    }

    const newBankedPoints = bankedPoints + additionalBankedPoints;

    // Calculate AFTER role reassignment
    const afterPoints = calculateSquadPoints(
      updatedPlayers,
      squadSize,
      'p2', // New captain
      undefined,
      undefined,
      newBankedPoints
    );

    console.log('After role reassignment:', afterPoints);
    console.log('Old banked:', bankedPoints, '→ New banked:', newBankedPoints);

    // CRITICAL: Total points must remain stable
    const pointsDifference = Math.abs(afterPoints.totalPoints - beforePoints.totalPoints);
    console.log('Points difference:', pointsDifference);

    expect(afterPoints.totalPoints).toBeCloseTo(beforePoints.totalPoints, 2);
  });

  it('should handle reassigning captain when old captain had existing pointsAtJoining', () => {
    // More realistic scenario: Captain joined mid-season
    const squadSize = 11;

    const players: SquadPlayer[] = [];
    for (let i = 1; i <= 11; i++) {
      players.push(createPlayer(`p${i}`, `Player ${i}`, 50, 0));
    }

    // Player 1: Joined at 50 points, assigned captain at 150, now has 300 points
    // Contribution: (150-50)*1.0 + (300-150)*2.0 = 100 + 300 = 400
    players[0] = createPlayer('p1', 'Current Captain', 300, 50, 150);

    // Player 2: Regular player, joined at 20, now has 180 points
    // Contribution: 180 - 20 = 160
    players[1] = createPlayer('p2', 'Regular Player', 180, 20);

    const beforePoints = calculateSquadPoints(players, squadSize, 'p1', undefined, undefined, 200);

    // Simulate transfer
    const updatedPlayers = players.map(p => ({ ...p }));
    let additionalBankedPoints = 0;

    // Bank old captain
    const oldCaptain = updatedPlayers[0];
    additionalBankedPoints += calculatePlayerContribution(oldCaptain, 'captain');
    oldCaptain.pointsAtJoining = oldCaptain.points; // Reset to 300
    oldCaptain.pointsWhenRoleAssigned = oldCaptain.points; // Reset to 300

    // Bank new captain's regular contribution
    const newCaptain = updatedPlayers[1];
    additionalBankedPoints += calculatePlayerContribution(newCaptain, 'regular');

    // Assign new captain and reset
    newCaptain.pointsAtJoining = newCaptain.points; // Reset to 180
    newCaptain.pointsWhenRoleAssigned = newCaptain.points; // Reset to 180

    const newBankedPoints = 200 + additionalBankedPoints;
    const afterPoints = calculateSquadPoints(updatedPlayers, squadSize, 'p2', undefined, undefined, newBankedPoints);

    expect(afterPoints.totalPoints).toBeCloseTo(beforePoints.totalPoints, 2);
  });

  it('should handle reassigning captain when regular player had undefined pointsWhenRoleAssigned', () => {
    // Edge case: Regular player never had a role before (pointsWhenRoleAssigned is undefined)
    const squadSize = 11;

    const players: SquadPlayer[] = [];
    for (let i = 1; i <= 11; i++) {
      players.push(createPlayer(`p${i}`, `Player ${i}`, 50, 0));
    }

    players[0] = createPlayer('p1', 'Current Captain', 250, 0, 120);
    // Player 2: Regular player with pointsWhenRoleAssigned === undefined
    players[1] = {
      playerId: 'p2',
      playerName: 'Regular Player',
      team: 'Test Team',
      role: 'batsman',
      points: 175,
      pointsAtJoining: 0,
      // pointsWhenRoleAssigned is undefined
      matchPerformances: {},
    };

    const beforePoints = calculateSquadPoints(players, squadSize, 'p1', undefined, undefined, 150);

    const updatedPlayers = players.map(p => ({ ...p }));
    let additionalBankedPoints = 0;

    // Bank old captain
    const oldCaptain = updatedPlayers[0];
    additionalBankedPoints += calculatePlayerContribution(oldCaptain, 'captain');
    oldCaptain.pointsAtJoining = oldCaptain.points;
    oldCaptain.pointsWhenRoleAssigned = oldCaptain.points;

    // Bank new captain's regular contribution
    const newCaptain = updatedPlayers[1];
    additionalBankedPoints += calculatePlayerContribution(newCaptain, 'regular');

    // Assign new captain and reset
    newCaptain.pointsAtJoining = newCaptain.points;
    newCaptain.pointsWhenRoleAssigned = newCaptain.points;

    const newBankedPoints = 150 + additionalBankedPoints;
    const afterPoints = calculateSquadPoints(updatedPlayers, squadSize, 'p2', undefined, undefined, newBankedPoints);

    expect(afterPoints.totalPoints).toBeCloseTo(beforePoints.totalPoints, 2);
  });
});
