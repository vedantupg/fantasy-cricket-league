/**
 * Admin Tool: Transfer Data Audit & Repair
 *
 * This tool helps admins identify and fix squads that were corrupted by the old
 * transfer banking bugs. It can:
 * 1. Audit all squads to find data corruption
 * 2. Show detailed analysis of each issue
 * 3. Provide safe fixes for corrupted data
 * 4. Allow manual review before applying fixes
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  AlertTitle,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  Refresh,
} from '@mui/icons-material';
import { leagueService, squadService } from '../../services/firestore';
import { validateRoleTimestamp } from '../../utils/pointsCalculation';
import type { League, LeagueSquad } from '../../types/database';

interface SquadIssue {
  squadId: string;
  squadName: string;
  userId: string;
  leagueId: string;
  leagueName: string;
  issues: string[];
  severity: 'critical' | 'warning' | 'info';
  suggestedFix?: string;
}

interface AuditReport {
  totalSquads: number;
  squadsWithIssues: number;
  criticalIssues: number;
  warnings: number;
  issues: SquadIssue[];
  timestamp: Date;
}

const TransferDataAuditTool: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<SquadIssue | null>(null);
  const [fixDialogOpen, setFixDialogOpen] = useState(false);
  const [fixing, setFixing] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    try {
      console.log('🔍 Starting transfer data audit...');

      // Get all leagues
      const leaguesQuery = await leagueService.getAll();
      const leagues: League[] = leaguesQuery || [];

      console.log(`Found ${leagues.length} leagues to audit`);

      const allIssues: SquadIssue[] = [];
      let totalSquads = 0;

      // Audit each league
      for (const league of leagues) {
        console.log(`Auditing league: ${league.name}`);

        // Get all squads in this league
        const squads = await squadService.getByLeague(league.id);
        totalSquads += squads.length;

        // Audit each squad
        for (const squad of squads) {
          const squadIssues = auditSquad(squad, league);
          if (squadIssues.issues.length > 0) {
            allIssues.push(squadIssues);
          }
        }
      }

      // Generate report
      const criticalIssues = allIssues.filter(i => i.severity === 'critical').length;
      const warnings = allIssues.filter(i => i.severity === 'warning').length;

      const report: AuditReport = {
        totalSquads,
        squadsWithIssues: allIssues.length,
        criticalIssues,
        warnings,
        issues: allIssues,
        timestamp: new Date(),
      };

      setAuditReport(report);
      console.log('✅ Audit complete:', report);
    } catch (error) {
      console.error('Error running audit:', error);
      alert('Failed to run audit. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const auditSquad = (squad: LeagueSquad, league: League): SquadIssue => {
    const issues: string[] = [];
    let severity: 'critical' | 'warning' | 'info' = 'info';
    let suggestedFix = '';

    // Check 1: Missing pointsWhenRoleAssigned for C/VC/X
    const captain = squad.players.find(p => p.playerId === squad.captainId);
    const vc = squad.players.find(p => p.playerId === squad.viceCaptainId);
    const xFactor = squad.players.find(p => p.playerId === squad.xFactorId);

    if (captain) {
      const validation = validateRoleTimestamp(captain, 'captain');
      if (!validation.valid) {
        issues.push(`Captain (${captain.playerName}): ${validation.warning}`);
        severity = 'critical';
      }
    }

    if (vc) {
      const validation = validateRoleTimestamp(vc, 'viceCaptain');
      if (!validation.valid) {
        issues.push(`Vice-Captain (${vc.playerName}): ${validation.warning}`);
        severity = 'critical';
      }
    }

    if (xFactor) {
      const validation = validateRoleTimestamp(xFactor, 'xFactor');
      if (!validation.valid) {
        issues.push(`X-Factor (${xFactor.playerName}): ${validation.warning}`);
        severity = 'critical';
      }
    }

    // Check 2: Suspicious bankedPoints values
    if (squad.bankedPoints && squad.bankedPoints < 0) {
      issues.push(`Negative banked points: ${squad.bankedPoints.toFixed(2)}`);
      severity = 'critical';
    }

    // Check 3: Transfer history inconsistencies
    if (squad.transferHistory && squad.transferHistory.length > 0) {
      const totalTransfers = squad.transferHistory.length;
      const declaredTransfers = (squad.benchTransfersUsed || 0) +
                               (squad.flexibleTransfersUsed || 0) +
                               (squad.midSeasonTransfersUsed || 0);

      if (totalTransfers !== declaredTransfers) {
        issues.push(
          `Transfer count mismatch: ${totalTransfers} in history vs ${declaredTransfers} declared`
        );
        if (severity === 'info') severity = 'warning';
      }
    }

    // Check 4: Players with pointsAtJoining > current points
    squad.players.forEach(player => {
      const pointsAtJoining = player.pointsAtJoining ?? 0;
      if (pointsAtJoining > player.points) {
        issues.push(
          `${player.playerName}: pointsAtJoining (${pointsAtJoining}) > current points (${player.points})`
        );
        if (severity === 'info') severity = 'warning';
      }
    });

    // Check 5: Very high banked points (possible corruption from old bug)
    if (squad.bankedPoints && squad.bankedPoints > squad.totalPoints * 0.5) {
      issues.push(
        `Suspiciously high banked points: ${squad.bankedPoints.toFixed(2)} ` +
        `(${((squad.bankedPoints / squad.totalPoints) * 100).toFixed(1)}% of total)`
      );
      if (severity === 'info') severity = 'warning';
    }

    // Generate suggested fix
    if (issues.length > 0) {
      // Count how many roles are missing timestamps
      const missingRoles: string[] = [];
      if (captain && !captain.pointsWhenRoleAssigned) missingRoles.push('Captain');
      if (vc && !vc.pointsWhenRoleAssigned) missingRoles.push('VC');
      if (xFactor && !xFactor.pointsWhenRoleAssigned) missingRoles.push('X-Factor');

      if (missingRoles.length > 0) {
        suggestedFix = `Set pointsWhenRoleAssigned to pointsAtJoining for ${missingRoles.join(', ')} (conservative fix)`;
      } else {
        suggestedFix = 'Manual review required';
      }
    }

    return {
      squadId: squad.id,
      squadName: squad.squadName,
      userId: squad.userId,
      leagueId: league.id,
      leagueName: league.name,
      issues,
      severity,
      suggestedFix,
    };
  };

  const handleFixIssue = async (issue: SquadIssue) => {
    setSelectedIssue(issue);
    setFixDialogOpen(true);
  };

  const applyFix = async () => {
    if (!selectedIssue) return;

    setFixing(true);
    try {
      console.log(`🔧 Applying fix for squad ${selectedIssue.squadId}`);

      // Get the squad
      const squad = await squadService.getById(selectedIssue.squadId);
      if (!squad) {
        throw new Error('Squad not found');
      }

      // Apply fix: Set missing pointsWhenRoleAssigned to pointsAtJoining (conservative)
      const updatedPlayers = squad.players.map(player => {
        const isRole = player.playerId === squad.captainId ||
                      player.playerId === squad.viceCaptainId ||
                      player.playerId === squad.xFactorId;

        if (isRole && player.pointsWhenRoleAssigned === undefined) {
          console.log(
            `  Fixing ${player.playerName}: setting pointsWhenRoleAssigned to ${player.pointsAtJoining ?? 0}`
          );
          return {
            ...player,
            pointsWhenRoleAssigned: player.pointsAtJoining ?? 0,
          };
        }
        return player;
      });

      // Update the squad
      await squadService.update(selectedIssue.squadId, {
        players: updatedPlayers,
      });

      console.log('✅ Fix applied successfully');
      alert('Fix applied successfully! Re-run audit to verify.');

      setFixDialogOpen(false);
      setSelectedIssue(null);
    } catch (error) {
      console.error('Error applying fix:', error);
      alert('Failed to apply fix. Check console for details.');
    } finally {
      setFixing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            🔍 Transfer Data Audit Tool
          </Typography>

          <Typography variant="body2" color="text.secondary" paragraph>
            This tool scans all squads for data corruption caused by the old transfer bugs.
            It checks for missing role timestamps, suspicious banking values, and other issues.
          </Typography>

          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
            onClick={runAudit}
            disabled={loading}
            sx={{ mb: 3 }}
          >
            {loading ? 'Running Audit...' : 'Run Full Audit'}
          </Button>

          {auditReport && (
            <>
              <Alert
                severity={auditReport.criticalIssues > 0 ? 'error' : auditReport.warnings > 0 ? 'warning' : 'success'}
                sx={{ mb: 3 }}
              >
                <AlertTitle>
                  {auditReport.criticalIssues > 0
                    ? '🚨 Critical Issues Found'
                    : auditReport.warnings > 0
                    ? '⚠️ Warnings Found'
                    : '✅ No Critical Issues'}
                </AlertTitle>
                <Typography variant="body2">
                  Scanned {auditReport.totalSquads} squads •{' '}
                  {auditReport.squadsWithIssues} with issues •{' '}
                  {auditReport.criticalIssues} critical •{' '}
                  {auditReport.warnings} warnings
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Last run: {auditReport.timestamp.toLocaleString()}
                </Typography>
              </Alert>

              {auditReport.issues.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Issues Found
                  </Typography>

                  {auditReport.issues.map((issue, index) => (
                    <Accordion key={issue.squadId} sx={{ mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <Chip
                            icon={
                              issue.severity === 'critical' ? <ErrorIcon /> :
                              issue.severity === 'warning' ? <Warning /> :
                              <CheckCircle />
                            }
                            label={issue.severity.toUpperCase()}
                            color={getSeverityColor(issue.severity) as any}
                            size="small"
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1">
                              {issue.squadName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {issue.leagueName} • {issue.issues.length} issue(s)
                            </Typography>
                          </Box>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            Issues:
                          </Typography>
                          <ul>
                            {issue.issues.map((msg, i) => (
                              <li key={i}>
                                <Typography variant="body2">{msg}</Typography>
                              </li>
                            ))}
                          </ul>

                          {issue.suggestedFix && (
                            <>
                              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                                Suggested Fix:
                              </Typography>
                              <Typography variant="body2" color="text.secondary" paragraph>
                                {issue.suggestedFix}
                              </Typography>

                              <Button
                                variant="contained"
                                color="primary"
                                onClick={() => handleFixIssue(issue)}
                                size="small"
                              >
                                Apply Fix
                              </Button>
                            </>
                          )}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Fix Confirmation Dialog */}
      <Dialog open={fixDialogOpen} onClose={() => setFixDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Confirm Fix</DialogTitle>
        <DialogContent>
          {selectedIssue && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <AlertTitle>Conservative Fix Approach</AlertTitle>
                This fix will set missing <code>pointsWhenRoleAssigned</code> values to{' '}
                <code>pointsAtJoining</code>. This is a conservative approach that prevents
                over-counting points but may under-count slightly.
              </Alert>

              <Typography variant="subtitle1" gutterBottom>
                Squad: {selectedIssue.squadName}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                League: {selectedIssue.leagueName}
              </Typography>

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                Issues to fix:
              </Typography>
              <ul>
                {selectedIssue.issues.map((issue, i) => (
                  <li key={i}>
                    <Typography variant="body2">{issue}</Typography>
                  </li>
                ))}
              </ul>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <strong>Warning:</strong> This action cannot be undone. Make sure to back up
                the squad data before proceeding.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFixDialogOpen(false)} disabled={fixing}>
            Cancel
          </Button>
          <Button
            onClick={applyFix}
            variant="contained"
            color="primary"
            disabled={fixing}
            startIcon={fixing ? <CircularProgress size={20} /> : undefined}
          >
            {fixing ? 'Applying...' : 'Apply Fix'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransferDataAuditTool;
