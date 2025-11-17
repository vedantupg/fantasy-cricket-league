import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Divider
} from '@mui/material';
import {
  People,
  SportsCricket,
  SwapHoriz,
  CalendarMonth,
  Schedule
} from '@mui/icons-material';
import type { League } from '../../types/database';

interface LeagueRulesDisplayProps {
  league: League;
}

const LeagueRulesDisplay: React.FC<LeagueRulesDisplayProps> = ({ league }) => {
  return (
    <Box>
      {/* Basic Info */}
      <Card sx={{ mb: { xs: 2, sm: 3 } }}>
        <CardContent sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 1.5, sm: 2, md: 2.5 } }}>
          <Box display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }} mb={{ xs: 1.5, sm: 2 }}>
            <SportsCricket color="primary" sx={{ fontSize: { xs: 20, sm: 24 } }} />
            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              League Information
            </Typography>
          </Box>
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>League Name</Typography>
              <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{league.name}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Tournament</Typography>
              <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{league.tournamentName}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Format</Typography>
              <Chip label={league.format} size="small" color="primary" sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' }, height: { xs: 20, sm: 24 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Status</Typography>
              <Chip label={league.status.replace('_', ' ')} size="small" sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' }, height: { xs: 20, sm: 24 } }} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Important Dates */}
      <Card sx={{ mb: { xs: 2, sm: 3 } }}>
        <CardContent sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 1.5, sm: 2, md: 2.5 } }}>
          <Box display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }} mb={{ xs: 1.5, sm: 2 }}>
            <CalendarMonth color="primary" sx={{ fontSize: { xs: 20, sm: 24 } }} />
            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Important Dates
            </Typography>
          </Box>
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>League Start Date</Typography>
              <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                {new Date(league.startDate).toLocaleString()}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Squad Selection Deadline</Typography>
              <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                {new Date(league.squadDeadline).toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Squad Rules */}
      <Card sx={{ mb: { xs: 2, sm: 3 } }}>
        <CardContent sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 1.5, sm: 2, md: 2.5 } }}>
          <Box display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }} mb={{ xs: 1.5, sm: 2 }}>
            <People color="primary" sx={{ fontSize: { xs: 20, sm: 24 } }} />
            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Squad Rules
            </Typography>
          </Box>
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Squad Size</Typography>
              <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                {league.squadSize} players
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Max Participants</Typography>
              <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                {league.maxParticipants} teams
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Min Batsmen</Typography>
              <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                {league.squadRules.minBatsmen}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Min Bowlers</Typography>
              <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                {league.squadRules.minBowlers}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Min All-rounders</Typography>
              <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                {league.squadRules.minAllrounders}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Min Wicketkeepers</Typography>
              <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                {league.squadRules.minWicketkeepers}
              </Typography>
            </Grid>
            {league.squadRules.hasBudget && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Budget</Typography>
                <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  {league.squadRules.totalBudget} credits
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Transfer Settings */}
      {league.transferTypes && (
        <Card sx={{ mb: { xs: 2, sm: 3 } }}>
          <CardContent sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 1.5, sm: 2, md: 2.5 } }}>
            <Box display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }} mb={{ xs: 1.5, sm: 2 }}>
              <SwapHoriz color="primary" sx={{ fontSize: { xs: 20, sm: 24 } }} />
              <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Transfer Settings
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" mb={{ xs: 1.5, sm: 2 }} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              Total transfers allowed: {' '}
              {(league.transferTypes.benchTransfers.enabled ? league.transferTypes.benchTransfers.maxAllowed : 0) +
               (league.transferTypes.midSeasonTransfers.enabled ? league.transferTypes.midSeasonTransfers.maxAllowed : 0) +
               (league.transferTypes.flexibleTransfers.enabled ? league.transferTypes.flexibleTransfers.maxAllowed : 0)}
            </Typography>

            <Box display="flex" flexWrap="wrap" gap={{ xs: 0.75, sm: 1 }} mb={{ xs: 1.5, sm: 2 }}>
              {league.transferTypes.benchTransfers.enabled && (
                <Chip
                  label={`Bench: ${league.transferTypes.benchTransfers.maxAllowed} allowed`}
                  color="primary"
                  variant="outlined"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
                />
              )}
              {league.transferTypes.midSeasonTransfers.enabled && (
                <Chip
                  label={`Mid-Season: ${league.transferTypes.midSeasonTransfers.maxAllowed} allowed`}
                  color="secondary"
                  variant="outlined"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
                />
              )}
              {league.transferTypes.flexibleTransfers.enabled && (
                <Chip
                  label={`Flexible: ${league.transferTypes.flexibleTransfers.maxAllowed} allowed`}
                  color="success"
                  variant="outlined"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
                />
              )}
            </Box>

            <Divider sx={{ my: { xs: 1.5, sm: 2 } }} />

            {/* Bench Transfers Details */}
            {league.transferTypes.benchTransfers.enabled && (
              <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, mb: 1 }}>
                  Bench Change
                </Typography>
                <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 1 }}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Bench Slots</Typography>
                    <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      {league.transferTypes.benchTransfers.benchSlots}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Max Bench Transfers</Typography>
                    <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      {league.transferTypes.benchTransfers.maxAllowed}
                    </Typography>
                  </Grid>
                </Grid>
                <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, mb: 1.5, lineHeight: 1.6 }}>
                  You can make <strong>ONE</strong> of the following two changes:
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, mb: 0.5 }}>
                    A. Bench Player Substitution
                  </Typography>
                  <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 3 }}>
                    <Typography component="li" variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mb: 0.5, lineHeight: 1.6 }}>
                      Bring in your bench player for anyone in your starting XI, except your Captain (C)
                    </Typography>
                    <Typography component="li" variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mb: 0.5, lineHeight: 1.6 }}>
                      You can replace the Vice-Captain (VC) using a bench change
                    </Typography>
                    <Typography component="li" variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mb: 0.5, lineHeight: 1.6 }}>
                      The player who comes in from the bench automatically becomes the new Vice-Captain (VC)
                    </Typography>
                    <Typography component="li" variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mb: 0.5, lineHeight: 1.6 }}>
                      <strong>Restrictions:</strong> Cannot replace the Captain or bring in someone who is not your designated bench player
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, mb: 0.5 }}>
                    B. Reassign Vice-Captain or X-Factor
                  </Typography>
                  <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 3 }}>
                    <Typography component="li" variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mb: 0.5, lineHeight: 1.6 }}>
                      Keep all players the same, but change your Vice-Captain or X-Factor
                    </Typography>
                    <Typography component="li" variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mb: 0.5, lineHeight: 1.6 }}>
                      Choose any player already in your team to become the new VC or X-Factor
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Mid-Season Transfers Details */}
            {league.transferTypes.midSeasonTransfers.enabled && (
              <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, mb: 1 }}>
                  Mid-Season Change
                </Typography>
                <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 1 }}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Window Opens</Typography>
                    <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      {new Date(league.transferTypes.midSeasonTransfers.windowStartDate).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Window Closes</Typography>
                    <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      {new Date(league.transferTypes.midSeasonTransfers.windowEndDate).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Max Transfers</Typography>
                    <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      {league.transferTypes.midSeasonTransfers.maxAllowed}
                    </Typography>
                  </Grid>
                </Grid>
                <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, mb: 1.5, lineHeight: 1.6 }}>
                  A Mid-Season Change works exactly like a Flexible Change, but with a timing restriction.
                </Typography>
                <Box component="ul" sx={{ mt: 1, mb: 0, pl: 3 }}>
                  <Typography component="li" variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mb: 0.5, lineHeight: 1.6 }}>
                    Follows all the same rules as a Flexible Change (see below)
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mb: 0.5, lineHeight: 1.6 }}>
                    <strong>Timing restriction:</strong> Only allowed during the specific mid-season window announced by the league
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mb: 0.5, lineHeight: 1.6 }}>
                    Helps teams rebalance mid-tournament based on player form and injuries
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Flexible Transfers Details */}
            {league.transferTypes.flexibleTransfers.enabled && (
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, mb: 1 }}>
                  Flexible Change
                </Typography>
                <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 1 }}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Max Allowed</Typography>
                    <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      {league.transferTypes.flexibleTransfers.maxAllowed}
                    </Typography>
                  </Grid>
                </Grid>
                <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, mb: 1.5, lineHeight: 1.6 }}>
                  You can make <strong>ONE</strong> of the following two changes:
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, mb: 0.5 }}>
                    A. Player Substitution
                  </Typography>
                  <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 3 }}>
                    <Typography component="li" variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mb: 0.5, lineHeight: 1.6 }}>
                      Replace any player in your squad with another eligible player from the remaining pool
                    </Typography>
                    <Typography component="li" variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mb: 0.5, lineHeight: 1.6 }}>
                      <strong>Captain (C) and Vice-Captain (VC) cannot be removed</strong>
                    </Typography>
                    <Typography component="li" variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mb: 0.5, lineHeight: 1.6 }}>
                      All team configuration rules must still be satisfied
                    </Typography>
                    <Typography component="li" variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mb: 0.5, lineHeight: 1.6 }}>
                      <em>Example: Swap a bowler or batsman based on form, injuries, or match-ups</em>
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, mb: 0.5 }}>
                    B. Reassign Vice-Captain or X-Factor
                  </Typography>
                  <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 3 }}>
                    <Typography component="li" variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mb: 0.5, lineHeight: 1.6 }}>
                      Keep all players the same, but change your Vice-Captain or X-Factor
                    </Typography>
                    <Typography component="li" variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mb: 0.5, lineHeight: 1.6 }}>
                      Choose any player already in your team to become the new VC or X-Factor
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scoring & Additional Rules */}
      <Card>
        <CardContent sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 1.5, sm: 2, md: 2.5 } }}>
          <Box display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }} mb={{ xs: 1.5, sm: 2 }}>
            <Schedule color="primary" sx={{ fontSize: { xs: 20, sm: 24 } }} />
            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Additional Rules
            </Typography>
          </Box>
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Captain Points</Typography>
              <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                2x multiplier
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Vice-Captain Points</Typography>
              <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                1.5x multiplier
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>X-Factor Points</Typography>
              <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                1.25x multiplier
              </Typography>
            </Grid>
            {league.powerplayEnabled && (
              <Grid size={12}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Powerplay Bonus</Typography>
                <Typography variant="body1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  Enabled - Select one match for bonus points
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LeagueRulesDisplay;
