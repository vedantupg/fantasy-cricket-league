import {
  evaluateDisableDecision,
  getDisableBoundaries,
  getMatchDays,
  parseMatchTime,
  shouldDisableNow,
} from '../../../api/transfer-toggle-automator';

type RawMatch = {
  matchNumber: number;
  date: string;
  timeGMT: string;
};

function createSchedule(matches: RawMatch[]) {
  return matches.map((match) => ({
    matchNumber: match.matchNumber,
    date: new Date(match.date),
    timeGMT: match.timeGMT,
  }));
}

describe('transfer-toggle-automator boundary calculation', () => {
  it('parses 12-hour and 24-hour GMT time strings', () => {
    const matchDate = new Date('2026-06-02T00:00:00.000Z');

    expect(parseMatchTime('5:30 AM', matchDate)?.toISOString()).toBe('2026-06-02T05:30:00.000Z');
    expect(parseMatchTime('14:00', matchDate)?.toISOString()).toBe('2026-06-02T14:00:00.000Z');
    expect(parseMatchTime('invalid', matchDate)).toBeNull();
  });

  it('uses parsed next-day time minus 5min buffer when available', () => {
    const schedule = createSchedule([
      { matchNumber: 2, date: '2026-06-02T00:00:00.000Z', timeGMT: '11:30 AM' },
    ]);

    expect(getDisableBoundaries(schedule)[0].toISOString()).toBe('2026-06-02T11:25:00.000Z');
  });

  it('falls back to 10:00 GMT when day has 2+ matches and no parsable times', () => {
    const schedule = createSchedule([
      { matchNumber: 2, date: '2026-06-02T00:00:00.000Z', timeGMT: '' },
      { matchNumber: 3, date: '2026-06-02T00:00:00.000Z', timeGMT: '' },
    ]);

    expect(getDisableBoundaries(schedule)[0].toISOString()).toBe('2026-06-02T09:55:00.000Z');
  });

  it('falls back to 14:00 GMT when day has 1 match and no parsable times', () => {
    const schedule = createSchedule([
      { matchNumber: 2, date: '2026-06-02T00:00:00.000Z', timeGMT: '' },
    ]);

    expect(getDisableBoundaries(schedule)[0].toISOString()).toBe('2026-06-02T13:55:00.000Z');
  });

  it('groups by UTC day keys to avoid timezone drift', () => {
    const schedule = createSchedule([
      { matchNumber: 1, date: '2026-03-30T04:00:00.000Z', timeGMT: '' },
      { matchNumber: 2, date: '2026-03-30T20:00:00.000Z', timeGMT: '' },
    ]);

    const matchDays = getMatchDays(schedule);
    expect(matchDays).toHaveLength(1);
    expect(matchDays[0].date).toBe('2026-03-30');
  });
});

describe('transfer-toggle-automator self-healing dedupe', () => {
  // IPL-style schedule: every day has 1 match -> fallback boundary 13:55 UTC
  const schedule = createSchedule([
    { matchNumber: 1, date: '2026-04-29T00:00:00.000Z', timeGMT: '' },
    { matchNumber: 2, date: '2026-04-30T00:00:00.000Z', timeGMT: '' },
    { matchNumber: 3, date: '2026-05-01T00:00:00.000Z', timeGMT: '' },
  ]);

  it('does NOT disable before the first boundary', () => {
    const beforeFirst = new Date('2026-04-29T13:54:00.000Z');
    const decision = evaluateDisableDecision(schedule, beforeFirst, null, null, false);
    expect(decision.shouldDisable).toBe(false);
    expect(decision.reason).toBe('no_boundary_reached_yet');
  });

  it('disables exactly at boundary when not yet processed', () => {
    const atBoundary = new Date('2026-04-29T13:55:00.000Z');
    const decision = evaluateDisableDecision(schedule, atBoundary, null, null, false);
    expect(decision.shouldDisable).toBe(true);
    expect(decision.reason).toBe('boundary_reached_and_not_yet_processed');
  });

  it('skips when already disabled past the latest boundary AND toggles are off', () => {
    const after = new Date('2026-04-29T14:30:00.000Z');
    const lastUpdate = new Date('2026-04-29T14:00:00.000Z');
    const decision = evaluateDisableDecision(schedule, after, lastUpdate, 'disabled', false);
    expect(decision.shouldDisable).toBe(false);
    expect(decision.reason).toBe('already_disabled_for_latest_boundary');
  });

  it('SELF-HEALS when admin re-enabled toggles after a disabled boundary', () => {
    // Scenario: cron disabled at 14:00, admin re-enabled flexible at 16:00,
    // next cron at 16:05 should re-disable instead of skipping.
    const cronTime = new Date('2026-04-29T16:05:00.000Z');
    const lastUpdate = new Date('2026-04-29T14:00:00.000Z');
    const decision = evaluateDisableDecision(schedule, cronTime, lastUpdate, 'disabled', true);
    expect(decision.shouldDisable).toBe(true);
    expect(decision.reason).toBe('reopened_after_boundary_self_heal');
  });

  it('handles new boundary the next day', () => {
    // Yesterday processed, today not yet
    const todayMidday = new Date('2026-04-30T13:55:00.000Z');
    const lastUpdate = new Date('2026-04-29T14:00:00.000Z');
    const decision = evaluateDisableDecision(schedule, todayMidday, lastUpdate, 'disabled', false);
    expect(decision.shouldDisable).toBe(true);
    expect(decision.reason).toBe('boundary_reached_and_not_yet_processed');
  });

  it('shouldDisableNow back-compat: legacy callers without togglesCurrentlyOn still work', () => {
    // Before boundary
    expect(shouldDisableNow(schedule, new Date('2026-04-29T13:54:00.000Z'), null, null)).toBe(false);
    // At boundary, not yet processed
    expect(shouldDisableNow(schedule, new Date('2026-04-29T13:55:00.000Z'), null, null)).toBe(true);
    // After boundary, already processed (no togglesCurrentlyOn arg = legacy false)
    expect(
      shouldDisableNow(
        schedule,
        new Date('2026-04-29T14:10:00.000Z'),
        new Date('2026-04-29T14:00:00.000Z'),
        'disabled'
      )
    ).toBe(false);
  });
});

describe('transfer-toggle-automator multi-cycle cron simulation', () => {
  /**
   * Simulates the cron running every 5 minutes against a stable schedule and
   * tracks state changes the same way the real handler would.
   */
  type LeagueState = {
    flexibleChangesEnabled: boolean;
    benchChangesEnabled: boolean;
    ppActivationEnabled: boolean;
    managesPowerplayActivation: boolean;
    lastAutoToggleAction: 'disabled' | null;
    lastAutoToggleUpdate: Date | null;
  };

  function runCron(state: LeagueState, schedule: any[], now: Date): LeagueState {
    const togglesOn =
      state.flexibleChangesEnabled ||
      state.benchChangesEnabled ||
      (state.managesPowerplayActivation && state.ppActivationEnabled);

    const decision = evaluateDisableDecision(
      schedule,
      now,
      state.lastAutoToggleUpdate,
      state.lastAutoToggleAction,
      togglesOn
    );

    if (!decision.shouldDisable) return state;

    const needsTransferUpdate =
      state.flexibleChangesEnabled || state.benchChangesEnabled;
    const needsPpUpdate =
      state.managesPowerplayActivation && state.ppActivationEnabled;

    if (!needsTransferUpdate && !needsPpUpdate) {
      // Mark processed even without writes so we don't loop infinitely
      // (mirrors real handler: it would log no_change and skip update)
      return state;
    }

    return {
      ...state,
      flexibleChangesEnabled: false,
      benchChangesEnabled: false,
      ppActivationEnabled: state.managesPowerplayActivation ? false : state.ppActivationEnabled,
      lastAutoToggleAction: 'disabled',
      lastAutoToggleUpdate: now,
    };
  }

  function* every5Min(start: Date, end: Date) {
    for (let t = start.getTime(); t <= end.getTime(); t += 5 * 60_000) {
      yield new Date(t);
    }
  }

  const schedule = createSchedule([
    { matchNumber: 1, date: '2026-04-29T00:00:00.000Z', timeGMT: '' },
    { matchNumber: 2, date: '2026-04-30T00:00:00.000Z', timeGMT: '' },
    { matchNumber: 3, date: '2026-05-01T00:00:00.000Z', timeGMT: '' },
  ]);

  it('disables exactly at the first cron tick at-or-after the boundary', () => {
    let state: LeagueState = {
      flexibleChangesEnabled: true,
      benchChangesEnabled: true,
      ppActivationEnabled: false,
      managesPowerplayActivation: false,
      lastAutoToggleAction: null,
      lastAutoToggleUpdate: null,
    };
    const ticks = Array.from(
      every5Min(new Date('2026-04-29T13:30:00.000Z'), new Date('2026-04-29T14:30:00.000Z'))
    );
    const transitions: { tick: string; flex: boolean }[] = [];
    for (const tick of ticks) {
      const before = state.flexibleChangesEnabled;
      state = runCron(state, schedule, tick);
      if (before !== state.flexibleChangesEnabled) {
        transitions.push({ tick: tick.toISOString(), flex: state.flexibleChangesEnabled });
      }
    }
    expect(transitions).toHaveLength(1);
    // Boundary is 13:55, our 5-min ticks are :30, :35, :40, :45, :50, :55, :00
    // So the first tick AT-OR-AFTER 13:55 is exactly 13:55.
    expect(transitions[0].tick).toBe('2026-04-29T13:55:00.000Z');
    expect(transitions[0].flex).toBe(false);
  });

  it('re-disables when admin re-enables transfers between boundaries', () => {
    let state: LeagueState = {
      flexibleChangesEnabled: true,
      benchChangesEnabled: false,
      ppActivationEnabled: false,
      managesPowerplayActivation: false,
      lastAutoToggleAction: null,
      lastAutoToggleUpdate: null,
    };

    // Cron disables at 13:55
    state = runCron(state, schedule, new Date('2026-04-29T13:55:00.000Z'));
    expect(state.flexibleChangesEnabled).toBe(false);
    expect(state.lastAutoToggleAction).toBe('disabled');

    // Admin re-enables at 16:00 (without clearing lastAutoToggleAction — old buggy path)
    state.flexibleChangesEnabled = true;

    // Next cron at 16:05 — with self-healing, this should re-disable.
    state = runCron(state, schedule, new Date('2026-04-29T16:05:00.000Z'));
    expect(state.flexibleChangesEnabled).toBe(false);

    // And it stays off through subsequent ticks.
    state = runCron(state, schedule, new Date('2026-04-29T18:00:00.000Z'));
    expect(state.flexibleChangesEnabled).toBe(false);
  });

  it('handles a multi-day window: disable on day 1, admin re-enables, day 2 disables again', () => {
    let state: LeagueState = {
      flexibleChangesEnabled: true,
      benchChangesEnabled: true,
      ppActivationEnabled: false,
      managesPowerplayActivation: false,
      lastAutoToggleAction: null,
      lastAutoToggleUpdate: null,
    };

    // Day 1 boundary
    state = runCron(state, schedule, new Date('2026-04-29T13:55:00.000Z'));
    expect(state.flexibleChangesEnabled).toBe(false);

    // Admin re-enables at 19:00 day 1 for next squad day
    state.flexibleChangesEnabled = true;
    state.benchChangesEnabled = true;

    // Self-heal cron at 19:05 immediately re-disables (because lastAuto is still 'disabled')
    state = runCron(state, schedule, new Date('2026-04-29T19:05:00.000Z'));
    expect(state.flexibleChangesEnabled).toBe(false);

    // To genuinely allow toggles to remain on, admin must clear lastAutoToggleAction
    // (which is exactly what the new EditLeaguePage save logic does).
    state.flexibleChangesEnabled = true;
    state.benchChangesEnabled = true;
    state.lastAutoToggleAction = null;
    state.lastAutoToggleUpdate = null;

    // Cron at 20:00 day 1 — boundary already past but action cleared, should re-disable
    // because boundary_reached_and_not_yet_processed.
    state = runCron(state, schedule, new Date('2026-04-29T20:00:00.000Z'));
    expect(state.flexibleChangesEnabled).toBe(false);
    expect(state.lastAutoToggleAction).toBe('disabled');

    // Admin properly re-enables for tomorrow's squad-selection window by clearing the marker.
    // This must be done AFTER day 2's boundary is in the past in clock terms only —
    // i.e. ANY past boundary will get re-applied as soon as cron runs. To keep toggles
    // on, admin must wait until shortly before the next boundary OR rely on the new
    // EditLeaguePage save logic which clears + assumes admin will toggle off later.
    //
    // For this test, we instead simulate admin re-enabling right after day 2's boundary,
    // and confirm cron immediately re-disables it (production-correct behavior).
    state.flexibleChangesEnabled = true;
    state.benchChangesEnabled = true;
    state.lastAutoToggleAction = null;
    state.lastAutoToggleUpdate = null;

    // Cron at day 2 boundary
    state = runCron(state, schedule, new Date('2026-04-30T13:55:00.000Z'));
    expect(state.flexibleChangesEnabled).toBe(false);
    expect(state.benchChangesEnabled).toBe(false);
    expect(state.lastAutoToggleAction).toBe('disabled');
  });

  it('reproduces the production stuck-league bug and confirms it is fixed', () => {
    // Simulates "Second Innings - IPL 26'" from the diagnostic:
    // - Last cron disabled at 12:50:43 UTC
    // - Latest boundary: 13:55 UTC  
    // - In the OLD code, lastAutoToggleUpdate=12:50 < latest=13:55 means
    //   "not yet processed" -> would re-disable. So that's not the stuck case.
    //
    // The TRUE stuck case from production:
    // - Cron disabled at 14:00 (after boundary 13:55)
    // - Admin re-enabled at 16:00
    // - lastAutoToggleAction='disabled', lastAutoToggleUpdate=14:00 >= 13:55
    // - Old code: skip silently. BUG.
    // - New code: see toggles ON, re-disable. FIXED.
    let state: LeagueState = {
      flexibleChangesEnabled: false,
      benchChangesEnabled: false,
      ppActivationEnabled: false,
      managesPowerplayActivation: false,
      lastAutoToggleAction: 'disabled',
      lastAutoToggleUpdate: new Date('2026-04-29T14:00:00.000Z'),
    };

    // Admin re-enables
    state.flexibleChangesEnabled = true;
    state.benchChangesEnabled = true;

    // Cron 5 min later
    state = runCron(state, schedule, new Date('2026-04-29T16:00:00.000Z'));
    expect(state.flexibleChangesEnabled).toBe(false);
    expect(state.benchChangesEnabled).toBe(false);
  });

  it('does not flap: once disabled, stays disabled across many cron ticks', () => {
    let state: LeagueState = {
      flexibleChangesEnabled: true,
      benchChangesEnabled: false,
      ppActivationEnabled: false,
      managesPowerplayActivation: false,
      lastAutoToggleAction: null,
      lastAutoToggleUpdate: null,
    };

    let writes = 0;
    let prevAction = state.lastAutoToggleAction;
    const ticks = Array.from(
      every5Min(new Date('2026-04-29T13:50:00.000Z'), new Date('2026-04-29T20:00:00.000Z'))
    );
    for (const tick of ticks) {
      state = runCron(state, schedule, tick);
      if (state.lastAutoToggleAction !== prevAction || (state.lastAutoToggleUpdate?.toISOString() === tick.toISOString())) {
        if (state.lastAutoToggleUpdate?.toISOString() === tick.toISOString()) writes++;
        prevAction = state.lastAutoToggleAction;
      }
    }
    expect(writes).toBe(1);
    expect(state.flexibleChangesEnabled).toBe(false);
  });

  it('manages powerplay activation for activation-mode leagues', () => {
    let state: LeagueState = {
      flexibleChangesEnabled: false,
      benchChangesEnabled: false,
      ppActivationEnabled: true,
      managesPowerplayActivation: true,
      lastAutoToggleAction: null,
      lastAutoToggleUpdate: null,
    };

    state = runCron(state, schedule, new Date('2026-04-29T13:55:00.000Z'));
    expect(state.ppActivationEnabled).toBe(false);
    expect(state.lastAutoToggleAction).toBe('disabled');
  });
});
