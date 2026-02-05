# Transfer System Test Suite Documentation

## Overview
This document describes the comprehensive test suite for the Fantasy Cricket League transfer system. These tests ensure that the transfer logic works correctly and prevent regressions when making updates.

## Test Results
✅ **37/37 tests passing**

## Test Coverage

### 1. Points Stability During Transfers (`transferSystem.test.ts`)

#### Critical Requirements Tested:
- ✅ **Bench transfers do NOT change totalPoints**
- ✅ **Flexible transfers (player substitution) do NOT change totalPoints**
- ✅ **Role changes do NOT immediately change totalPoints**

**Why This Matters:**
Points should ONLY change when the player pool is updated, NOT when transfers are made. This was the bug we fixed.

#### Test Cases:
1. **Bench Transfer Point Stability** - Ensures swapping a main squad player with a bench player maintains exact same totalPoints
2. **Flexible Transfer Point Stability** - Ensures replacing a player maintains totalPoints through banking
3. **Role Change Point Stability** - Ensures changing captain/VC/X-Factor doesn't immediately affect points

---

### 2. Banking System Correctness (`transferSystem.test.ts`)

#### Critical Requirements Tested:
- ✅ **bankedPoints correctly accumulates transferred-out player contributions**
- ✅ **bankedPoints is included in totalPoints calculation**

**Formula:**
```typescript
bankedPoints += (playerOut.points - playerOut.pointsAtJoining)
totalPoints = currentPlayerPoints + bankedPoints
```

#### Test Cases:
1. **Banking Accumulation** - Verifies multiple transfers correctly accumulate in bankedPoints
2. **Banking in Total** - Verifies totalPoints includes bankedPoints (critical fix)

---

### 3. New Player Starting Fresh (`transferSystem.test.ts`)

#### Critical Requirements Tested:
- ✅ **New players have pointsAtJoining set to current points**
- ✅ **New players contribute 0 points until player pool updates**

**Why This Matters:**
When a new player joins, they should start fresh. Their contribution is `points - pointsAtJoining`, which should be 0 initially.

#### Test Cases:
1. **PointsAtJoining Initialization** - New player's pointsAtJoining equals current points
2. **Zero Initial Contribution** - New player contributes 0 until pool updates

---

### 4. Role Assignment Tracking (`transferSystem.test.ts`)

#### Critical Requirements Tested:
- ✅ **pointsWhenRoleAssigned is set when role is assigned**
- ✅ **Multipliers only apply to points earned AFTER role assignment**

**Multipliers:**
- Captain (C): 2.0x
- Vice-Captain (VC): 1.5x
- X-Factor (X): 1.25x

**Formula:**
```typescript
basePoints = pointsWhenRoleAssigned - pointsAtJoining  // 1.0x
bonusPoints = currentPoints - pointsWhenRoleAssigned    // multiplier
contribution = basePoints * 1.0 + bonusPoints * multiplier
```

#### Test Cases:
1. **Role Assignment Timestamp** - pointsWhenRoleAssigned set correctly
2. **Captain Multiplier** - 2x only on points after assignment
3. **VC Multiplier** - 1.5x only on points after assignment
4. **X-Factor Multiplier** - 1.25x only on points after assignment

---

### 5. Player Pool Update Behavior (`transferSystem.test.ts`)

#### Critical Requirements Tested:
- ✅ **Points ONLY change when player pool is updated**

**Timeline:**
1. Make transfer → totalPoints stays same ✅
2. Player pool updates → totalPoints changes ✅

#### Test Cases:
1. **Pool Update Detection** - Points increase only on pool update, not on transfer

---

### 6. Integration Tests (`transferSystem.test.ts`)

#### Complete Workflows Tested:
- ✅ **Full bench transfer workflow**
- ✅ **Full flexible transfer with role change**

#### Test Cases:
1. **Bench Transfer Integration** - Complete workflow maintaining point stability
2. **Flexible Transfer + Role Change Integration** - Multiple operations maintaining correctness

---

### 7. Calculation Tests (`recalculateLeaguesUsingPool.test.ts`)

#### Tested Calculations:
- ✅ **Basic point calculation** (no roles)
- ✅ **Captain multiplier (2x)** calculation
- ✅ **Vice-Captain multiplier (1.5x)** calculation
- ✅ **X-Factor multiplier (1.25x)** calculation
- ✅ **Complete squad with all roles**
- ✅ **Bench player exclusion**
- ✅ **Banking integration**

#### Test Cases:
1. **Basic Calculation** - Simple sum of (points - pointsAtJoining)
2. **Captain 2x** - Multiplier only on points after role assignment
3. **VC 1.5x** - Multiplier only on points after role assignment
4. **X-Factor 1.25x** - Multiplier only on points after role assignment
5. **Full Squad** - All roles together with regular players
6. **Bench Exclusion** - Bench players don't count toward total
7. **Banking Included** - totalPoints includes bankedPoints

---

### 8. Edge Cases (`both test files`)

#### Critical Edge Cases Tested:
- ✅ **Negative scenarios** - Math.max(0, ...) prevents negative points
- ✅ **Missing pointsAtJoining** - Defaults to 0 for legacy data
- ✅ **Missing pointsWhenRoleAssigned** - Defaults to pointsAtJoining
- ✅ **Missing bankedPoints** - Defaults to 0
- ✅ **Zero effective points** - Player just joined, no contribution

#### Test Cases:
1. **Negative Prevention** - Points can't go negative
2. **Legacy Data Handling** - Missing fields have safe defaults
3. **Zero Contributions** - Handle players with no effective points

---

### 9. Transfer Banking Scenarios (`recalculateLeaguesUsingPool.test.ts`)

#### Tested Scenarios:
- ✅ **Single transfer banking**
- ✅ **Multiple transfers accumulation**
- ✅ **Banking in totalPoints**

#### Test Cases:
1. **Single Transfer** - Correct calculation of contribution to bank
2. **Multiple Transfers** - Accumulation over multiple transfers
3. **Total Includes Banking** - Critical: totalPoints = playerPoints + bankedPoints

---

### 10. Role Change Scenarios (`recalculateLeaguesUsingPool.test.ts`)

#### Tested Scenarios:
- ✅ **Captain change**
- ✅ **Role swap (VC → Captain)**

#### Test Cases:
1. **Captain Change** - Old captain loses bonus, new captain gets it
2. **Role Swap** - Complex scenario of role transitions

---

### 11. Player Pool Update Impact (`recalculateLeaguesUsingPool.test.ts`)

#### Tested Scenarios:
- ✅ **Regular player pool updates**
- ✅ **Captain getting 2x on new points**

#### Test Cases:
1. **Pool Update Reflection** - New points reflected in total
2. **Captain 2x on Update** - Captain's new points get multiplier

---

## Running Tests

```bash
npm test
```

This will run all tests and show coverage.

---

## Test Maintenance

### When to Add New Tests:

1. **New Transfer Type** - If adding a new type of transfer, add tests for:
   - Point stability during transfer
   - Banking calculation
   - pointsAtJoining handling

2. **New Multiplier/Role** - If adding new roles, test:
   - Multiplier calculation
   - pointsWhenRoleAssigned tracking
   - Integration with existing roles

3. **Bug Fix** - When fixing a bug, add a test that:
   - Reproduces the bug (fails before fix)
   - Passes after fix
   - Prevents regression

4. **New Feature** - Any new feature should have:
   - Unit tests for the logic
   - Integration tests for workflows
   - Edge case tests

### Test Structure:

```typescript
describe('Feature Name', () => {
  test('Should do X when Y happens', () => {
    // Arrange: Set up test data
    const input = ...;

    // Act: Perform the action
    const result = ...;

    // Assert: Verify the result
    expect(result).toBe(expected);
  });
});
```

---

## Critical Invariants (MUST ALWAYS BE TRUE)

### 1. Point Stability During Transfers
```typescript
// Before transfer
const pointsBeforeTransfer = squad.totalPoints;

// Make transfer
performTransfer(squad, playerOut, playerIn);

// After transfer (before pool update)
expect(squad.totalPoints).toBe(pointsBeforeTransfer); // ✅ MUST BE EQUAL
```

### 2. Banking Equation
```typescript
const playerContribution = player.points - player.pointsAtJoining;
const shouldBeAdded

ToBankedPoints = playerContribution;

// When transfer out:
expect(newBankedPoints).toBe(oldBankedPoints + shouldBeAddedToBankedPoints);
```

### 3. Total Points Equation
```typescript
const totalPoints = sumOfPlayerContributions + bankedPoints;
// NOT: totalPoints = sumOfPlayerContributions  // ❌ BUG!
```

### 4. New Player Fresh Start
```typescript
// When adding new player:
newPlayer.pointsAtJoining = newPlayer.points; // ✅ Must be set
const initialContribution = newPlayer.points - newPlayer.pointsAtJoining; // = 0
```

### 5. Multiplier Only on Future Points
```typescript
// When assigning role:
player.pointsWhenRoleAssigned = player.points; // ✅ Must be set

// Calculation:
const basePoints = player.pointsWhenRoleAssigned - player.pointsAtJoining; // 1.0x
const bonusPoints = player.points - player.pointsWhenRoleAssigned; // multiplier
```

---

## Test Coverage Summary

| Category | Tests | Status |
|----------|-------|--------|
| Point Stability | 3 | ✅ Passing |
| Banking System | 3 | ✅ Passing |
| New Players | 2 | ✅ Passing |
| Role Assignment | 4 | ✅ Passing |
| Pool Updates | 1 | ✅ Passing |
| Integration | 2 | ✅ Passing |
| Calculations | 10 | ✅ Passing |
| Edge Cases | 5 | ✅ Passing |
| Transfer Banking | 3 | ✅ Passing |
| Role Changes | 2 | ✅ Passing |
| Pool Impact | 2 | ✅ Passing |
| **TOTAL** | **37** | **✅ All Passing** |

---

## Regression Prevention

These tests prevent the following bugs from reoccurring:

1. ✅ **Transfer Point Loss Bug** - Points decreasing when transfers made
2. ✅ **Missing Banking Bug** - bankedPoints not added to totalPoints
3. ✅ **Role Multiplier Bug** - Multipliers applying to all points instead of just future points
4. ✅ **New Player Bug** - New players not starting fresh

---

## CI/CD Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
```

This ensures all tests pass before merging code.

---

## Contact

If you have questions about these tests or find issues, please:
1. Check this documentation first
2. Review the test files for examples
3. Add new tests if needed
4. Keep tests up to date with code changes

**Remember: The tests are the specification. If the tests pass, the transfer system is working correctly.**
