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
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <SportsCricket color="primary" />
            <Typography variant="h6" fontWeight="bold">
              League Information
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">League Name</Typography>
              <Typography variant="body1" fontWeight="medium">{league.name}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">Tournament</Typography>
              <Typography variant="body1" fontWeight="medium">{league.tournamentName}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">Format</Typography>
              <Chip label={league.format} size="small" color="primary" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">Status</Typography>
              <Chip label={league.status.replace('_', ' ')} size="small" />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Important Dates */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <CalendarMonth color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Important Dates
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">League Start Date</Typography>
              <Typography variant="body1" fontWeight="medium">
                {new Date(league.startDate).toLocaleString()}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">Squad Selection Deadline</Typography>
              <Typography variant="body1" fontWeight="medium">
                {new Date(league.squadDeadline).toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Squad Rules */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <People color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Squad Rules
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">Squad Size</Typography>
              <Typography variant="body1" fontWeight="medium">
                {league.squadSize} players
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">Max Participants</Typography>
              <Typography variant="body1" fontWeight="medium">
                {league.maxParticipants} teams
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">Min Batsmen</Typography>
              <Typography variant="body1" fontWeight="medium">
                {league.squadRules.minBatsmen}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">Min Bowlers</Typography>
              <Typography variant="body1" fontWeight="medium">
                {league.squadRules.minBowlers}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">Min All-rounders</Typography>
              <Typography variant="body1" fontWeight="medium">
                {league.squadRules.minAllrounders}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">Min Wicketkeepers</Typography>
              <Typography variant="body1" fontWeight="medium">
                {league.squadRules.minWicketkeepers}
              </Typography>
            </Grid>
            {league.squadRules.hasBudget && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary">Budget</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {league.squadRules.totalBudget} credits
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Transfer Settings */}
      {league.transferTypes && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <SwapHoriz color="primary" />
              <Typography variant="h6" fontWeight="bold">
                Transfer Settings
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" mb={2}>
              Total transfers allowed: {' '}
              {(league.transferTypes.benchTransfers.enabled ? league.transferTypes.benchTransfers.maxAllowed : 0) +
               (league.transferTypes.midSeasonTransfers.enabled ? league.transferTypes.midSeasonTransfers.maxAllowed : 0) +
               (league.transferTypes.flexibleTransfers.enabled ? league.transferTypes.flexibleTransfers.maxAllowed : 0)}
            </Typography>

            <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
              {league.transferTypes.benchTransfers.enabled && (
                <Chip
                  label={`Bench: ${league.transferTypes.benchTransfers.maxAllowed} allowed`}
                  color="primary"
                  variant="outlined"
                />
              )}
              {league.transferTypes.midSeasonTransfers.enabled && (
                <Chip
                  label={`Mid-Season: ${league.transferTypes.midSeasonTransfers.maxAllowed} allowed`}
                  color="secondary"
                  variant="outlined"
                />
              )}
              {league.transferTypes.flexibleTransfers.enabled && (
                <Chip
                  label={`Flexible: ${league.transferTypes.flexibleTransfers.maxAllowed} allowed`}
                  color="success"
                  variant="outlined"
                />
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Bench Transfers Details */}
            {league.transferTypes.benchTransfers.enabled && (
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={12}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Bench Transfer System
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Bench Slots</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {league.transferTypes.benchTransfers.benchSlots}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Max Bench Transfers</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {league.transferTypes.benchTransfers.maxAllowed}
                  </Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="body2" color="text.secondary">Description</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {league.transferTypes.benchTransfers.description}
                  </Typography>
                </Grid>
              </Grid>
            )}

            {/* Mid-Season Transfers Details */}
            {league.transferTypes.midSeasonTransfers.enabled && (
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={12}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Mid-Season Transfer Window
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Window Opens</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {new Date(league.transferTypes.midSeasonTransfers.windowStartDate).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Window Closes</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {new Date(league.transferTypes.midSeasonTransfers.windowEndDate).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Max Transfers</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {league.transferTypes.midSeasonTransfers.maxAllowed}
                  </Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="body2" color="text.secondary">Description</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {league.transferTypes.midSeasonTransfers.description}
                  </Typography>
                </Grid>
              </Grid>
            )}

            {/* Flexible Transfers Details */}
            {league.transferTypes.flexibleTransfers.enabled && (
              <Grid container spacing={2}>
                <Grid size={12}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Flexible Transfers
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Max Allowed</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {league.transferTypes.flexibleTransfers.maxAllowed}
                  </Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="body2" color="text.secondary">Description</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {league.transferTypes.flexibleTransfers.description}
                  </Typography>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scoring & Additional Rules */}
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Schedule color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Additional Rules
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">Captain Points</Typography>
              <Typography variant="body1" fontWeight="medium">
                2x multiplier
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">Vice-Captain Points</Typography>
              <Typography variant="body1" fontWeight="medium">
                1.5x multiplier
              </Typography>
            </Grid>
            {league.powerplayEnabled && (
              <Grid size={12}>
                <Typography variant="body2" color="text.secondary">Powerplay Bonus</Typography>
                <Typography variant="body1" fontWeight="medium">
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
