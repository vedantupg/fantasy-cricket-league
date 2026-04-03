import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  CircularProgress,
  Alert,
  Typography,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { leagueService, playerPoolService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import LeagueNav from '../components/common/LeagueNav';
import LeagueAssistant from '../components/LeagueAssistant';
import type { League, PlayerPool } from '../types/database';
import { DEFAULT_BATTING_CONFIG, DEFAULT_BOWLING_CONFIG, DEFAULT_FIELDING_CONFIG } from '../utils/pointsCalculation';
import colors from '../theme/colors';
import { alpha } from '@mui/material/styles';

const cardSx = {
  background: `linear-gradient(145deg, ${alpha(colors.blue.navy, 0.95)} 0%, ${alpha('#0A1929', 0.98)} 100%)`,
  border: `1px solid ${colors.border.default}`,
  borderRadius: 4,
  boxShadow: `0 20px 60px rgba(0,0,0,0.4)`,
  overflow: 'hidden',
  position: 'relative' as const,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '1px',
    background: `linear-gradient(90deg, transparent, ${alpha(colors.blue.electric, 0.6)}, transparent)`,
  }
};

// Scoring Configuration Content - Display scoring rules
const ScoringConfigContent: React.FC<{
  pool: PlayerPool;
}> = ({ pool }) => {
  const battingConfig = pool.battingConfig || DEFAULT_BATTING_CONFIG;
  const bowlingConfig = pool.bowlingConfig || DEFAULT_BOWLING_CONFIG;
  const fieldingConfig = pool.fieldingConfig || DEFAULT_FIELDING_CONFIG;
  const scoringMode = pool.scoringMode || 'automated';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Scoring Mode */}
          <Box>
            <Chip
              label={scoringMode === 'automated' ? 'Automated Scoring' : 'Manual Scoring'}
              color={scoringMode === 'automated' ? 'success' : 'default'}
              sx={{ mb: 1 }}
            />
            {pool.format && (
              <Chip
                label={`Format: ${pool.format}`}
                sx={{
                  ml: 1,
                  bgcolor: colors.blue.electric,
                  color: '#fff',
                  '&:hover': {
                    bgcolor: colors.blue.deep
                  }
                }}
              />
            )}
          </Box>

          {scoringMode === 'automated' ? (
            <>
              {/* Batting Configuration */}
              <Box sx={{ p: 2, bgcolor: alpha(colors.blue.electric, 0.08), borderRadius: 2, border: '1px solid', borderColor: alpha(colors.blue.electric, 0.3) }}>
                <Typography variant="h6" gutterBottom sx={{ color: colors.blue.electric, display: 'flex', alignItems: 'center', gap: 1 }}>
                  🏏 Batting Scoring Rules
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Minimum Balls Threshold</Typography>
                    <Typography variant="body1" fontWeight="bold">{battingConfig.minBallsThreshold} balls</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Bonus SR Trigger</Typography>
                    <Typography variant="body1" fontWeight="bold">{battingConfig.bonusSRTrigger}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Bonus SR Baseline</Typography>
                    <Typography variant="body1" fontWeight="bold">{battingConfig.bonusSRBaseline}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Bonus Divisor</Typography>
                    <Typography variant="body1" fontWeight="bold">{battingConfig.bonusDivisor}</Typography>
                  </Box>
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="body2" color="text.secondary">Penalties Enabled</Typography>
                    <Chip
                      label={battingConfig.penaltiesEnabled ? 'Yes' : 'No'}
                      color={battingConfig.penaltiesEnabled ? 'error' : 'default'}
                      size="small"
                    />
                    {battingConfig.penaltiesEnabled && battingConfig.penaltySRThreshold && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        Penalty SR Threshold: <strong>{battingConfig.penaltySRThreshold}</strong>
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Batting Bonus Example */}
                {(() => {
                  // Calculate example values based on config
                  const exampleRuns = 65;
                  const exampleBalls = 40;
                  const exampleSR = (exampleRuns / exampleBalls) * 100;
                  const bonusPoints = (exampleRuns * (exampleSR - battingConfig.bonusSRBaseline)) / battingConfig.bonusDivisor;
                  const totalPoints = exampleRuns + bonusPoints;

                  return (
                    <Box sx={{
                      mt: 3,
                      p: 2.5,
                      background: `linear-gradient(135deg, ${alpha(colors.blue.electric, 0.08)} 0%, ${alpha(colors.blue.electric, 0.03)} 100%)`,
                      borderRadius: 2,
                      border: '2px solid',
                      borderColor: alpha(colors.blue.electric, 0.3),
                      boxShadow: colors.shadows.blue.sm,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: colors.shadows.blue.md,
                        borderColor: alpha(colors.blue.electric, 0.5),
                      }
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Box sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          bgcolor: colors.blue.electric,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(30, 136, 229, 0.3)'
                        }}>
                          <Typography sx={{ fontSize: '1.2rem' }}>💡</Typography>
                        </Box>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ color: colors.blue.electric }}>
                          Example: Bonus Points
                        </Typography>
                      </Box>
                      <Box sx={{
                        p: 2,
                        mb: 2,
                        bgcolor: alpha(colors.blue.electric, 0.15),
                        borderRadius: 1.5,
                        border: `1px solid ${alpha(colors.blue.electric, 0.4)}`
                      }}>
                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                          A player scores <strong style={{ color: '#42A5F5', fontSize: '1.05em' }}>{exampleRuns} runs off {exampleBalls} balls</strong> (SR: <strong style={{ color: '#42A5F5' }}>{exampleSR.toFixed(1)}</strong>)
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: colors.blue.electric }} />
                          <Typography variant="body2" color="text.secondary">
                            Base points: <strong style={{ color: '#1E88E5' }}>{exampleRuns} pts</strong> (1 pt per run)
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: colors.blue.electric }} />
                          <Typography variant="body2" color="text.secondary">
                            Balls faced ≥ {battingConfig.minBallsThreshold}? <strong style={{ color: exampleBalls >= battingConfig.minBallsThreshold ? '#4CAF50' : '#E53935' }}>{exampleBalls >= battingConfig.minBallsThreshold ? '✓ Yes' : '✗ No'}</strong>
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: colors.blue.electric }} />
                          <Typography variant="body2" color="text.secondary">
                            SR ({exampleSR.toFixed(1)}) ≥ Trigger ({battingConfig.bonusSRTrigger})? <strong style={{ color: exampleSR >= battingConfig.bonusSRTrigger ? '#4CAF50' : '#E53935' }}>{exampleSR >= battingConfig.bonusSRTrigger ? '✓ Yes' : '✗ No'}</strong>
                          </Typography>
                        </Box>
                        {exampleSR >= battingConfig.bonusSRTrigger && exampleBalls >= battingConfig.minBallsThreshold && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} />
                            <Typography variant="body2" color="text.secondary">
                              Bonus = ({exampleRuns} × ({exampleSR.toFixed(1)} - {battingConfig.bonusSRBaseline})) / {battingConfig.bonusDivisor} = <strong style={{ color: '#4CAF50', fontSize: '1.05em' }}>+{bonusPoints.toFixed(2)} pts</strong>
                            </Typography>
                          </Box>
                        )}
                        <Box sx={{
                          mt: 1,
                          p: 1.5,
                          bgcolor: alpha(colors.blue.electric, 0.12),
                          borderRadius: 1,
                          border: `1px solid ${alpha(colors.blue.electric, 0.3)}`
                        }}>
                          <Typography variant="body1" fontWeight="bold" sx={{ color: colors.blue.electric, textAlign: 'center' }}>
                            Total Points: {totalPoints.toFixed(2)} pts
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })()}

                {/* Batting Penalty Example */}
                {battingConfig.penaltiesEnabled && battingConfig.penaltySRThreshold && (() => {
                  // Calculate penalty example based on config
                  const exampleRuns = 18;
                  const exampleBalls = 24;
                  const exampleSR = (exampleRuns / exampleBalls) * 100;
                  const penaltyPoints = (exampleRuns * (exampleSR - battingConfig.bonusSRBaseline)) / battingConfig.bonusDivisor;
                  const totalPoints = exampleRuns + penaltyPoints;

                  return (
                    <Box sx={{
                      mt: 2,
                      p: 2.5,
                      background: `linear-gradient(135deg, ${alpha(colors.error.primary, 0.08)} 0%, ${alpha(colors.error.primary, 0.03)} 100%)`,
                      borderRadius: 2,
                      border: '2px solid',
                      borderColor: alpha(colors.error.primary, 0.3),
                      boxShadow: '0 4px 12px rgba(244, 67, 54, 0.15)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 6px 20px rgba(244, 67, 54, 0.25)',
                        borderColor: alpha(colors.error.primary, 0.5),
                      }
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Box sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          bgcolor: 'error.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(244, 67, 54, 0.3)'
                        }}>
                          <Typography sx={{ fontSize: '1.2rem' }}>⚠️</Typography>
                        </Box>
                        <Typography variant="subtitle1" fontWeight="bold" color="error.main">
                          Example: Penalty Points
                        </Typography>
                      </Box>
                      <Box sx={{
                        p: 2,
                        mb: 2,
                        bgcolor: alpha(colors.error.primary, 0.15),
                        borderRadius: 1.5,
                        border: `1px solid ${alpha(colors.error.primary, 0.4)}`
                      }}>
                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                          A player scores <strong style={{ color: '#EF5350', fontSize: '1.05em' }}>{exampleRuns} runs off {exampleBalls} balls</strong> (SR: <strong style={{ color: '#EF5350' }}>{exampleSR.toFixed(1)}</strong>)
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main' }} />
                          <Typography variant="body2" color="text.secondary">
                            Base points: <strong style={{ color: '#E53935' }}>{exampleRuns} pts</strong> (1 pt per run)
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main' }} />
                          <Typography variant="body2" color="text.secondary">
                            Balls faced ≥ {battingConfig.minBallsThreshold}? <strong style={{ color: exampleBalls >= battingConfig.minBallsThreshold ? '#4CAF50' : '#E53935' }}>{exampleBalls >= battingConfig.minBallsThreshold ? '✓ Yes' : '✗ No'}</strong>
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main' }} />
                          <Typography variant="body2" color="text.secondary">
                            SR ({exampleSR.toFixed(1)}) {'<'} Penalty Threshold ({battingConfig.penaltySRThreshold})? <strong style={{ color: exampleSR < battingConfig.penaltySRThreshold ? '#E53935' : '#4CAF50' }}>{exampleSR < battingConfig.penaltySRThreshold ? '✓ Yes' : '✗ No'}</strong>
                          </Typography>
                        </Box>
                        {exampleSR < battingConfig.penaltySRThreshold && exampleBalls >= battingConfig.minBallsThreshold && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'warning.main' }} />
                            <Typography variant="body2" color="text.secondary">
                              Penalty = ({exampleRuns} × ({exampleSR.toFixed(1)} - {battingConfig.bonusSRBaseline})) / {battingConfig.bonusDivisor} = <strong style={{ color: '#FF9800', fontSize: '1.05em' }}>{penaltyPoints.toFixed(2)} pts</strong>
                            </Typography>
                          </Box>
                        )}
                        <Box sx={{
                          mt: 1,
                          p: 1.5,
                          bgcolor: alpha(colors.error.primary, 0.12),
                          borderRadius: 1,
                          border: `1px solid ${alpha(colors.error.primary, 0.3)}`
                        }}>
                          <Typography variant="body1" fontWeight="bold" color="error.main" sx={{ textAlign: 'center' }}>
                            Total Points: {totalPoints.toFixed(2)} pts
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })()}
              </Box>

              {/* Bowling Configuration */}
              <Box sx={{ p: 2, bgcolor: alpha(colors.text.primary, 0.05), borderRadius: 2, border: '1px solid', borderColor: colors.border.subtle }}>
                <Typography variant="h6" gutterBottom sx={{ color: colors.blue.light, display: 'flex', alignItems: 'center', gap: 1 }}>
                  🎾 Bowling Scoring Rules
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Wicket Points</Typography>
                    <Typography variant="body1" fontWeight="bold">{bowlingConfig.wicketPoints} pts</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Economy Bonus Threshold</Typography>
                    <Typography variant="body1" fontWeight="bold">{bowlingConfig.economyBonusThreshold}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Economy Multiplier</Typography>
                    <Typography variant="body1" fontWeight="bold">{bowlingConfig.economyMultiplier}x</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Min Overs for Economy</Typography>
                    <Typography variant="body1" fontWeight="bold">{bowlingConfig.minOversForEconomy}</Typography>
                  </Box>
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="body2" color="text.secondary">Penalties Enabled</Typography>
                    <Chip
                      label={bowlingConfig.penaltiesEnabled ? 'Yes' : 'No'}
                      color={bowlingConfig.penaltiesEnabled ? 'error' : 'default'}
                      size="small"
                    />
                    {bowlingConfig.penaltiesEnabled && bowlingConfig.economyPenaltyThreshold && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        Economy Penalty Threshold: <strong>{bowlingConfig.economyPenaltyThreshold}</strong>
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Bowling Bonus Example */}
                {(() => {
                  // Calculate example values based on config
                  const exampleWickets = 3;
                  const exampleOvers = 4;
                  const exampleRuns = 22;
                  const exampleEconomy = exampleRuns / exampleOvers;
                  const wicketPoints = exampleWickets * bowlingConfig.wicketPoints;
                  const economyDiff = bowlingConfig.economyBonusThreshold - exampleEconomy;
                  const bonusPoints = economyDiff * bowlingConfig.economyMultiplier;
                  const totalPoints = wicketPoints + bonusPoints;

                  return (
                    <Box sx={{
                      mt: 3,
                      p: 2.5,
                      background: `linear-gradient(135deg, ${alpha(colors.blue.electric, 0.08)} 0%, ${alpha(colors.blue.electric, 0.03)} 100%)`,
                      borderRadius: 2,
                      border: '2px solid',
                      borderColor: alpha(colors.blue.electric, 0.3),
                      boxShadow: colors.shadows.blue.sm,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: colors.shadows.blue.md,
                        borderColor: alpha(colors.blue.electric, 0.5),
                      }
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Box sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          bgcolor: colors.blue.electric,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(30, 136, 229, 0.3)'
                        }}>
                          <Typography sx={{ fontSize: '1.2rem' }}>💡</Typography>
                        </Box>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ color: colors.blue.electric }}>
                          Example: Bonus Points
                        </Typography>
                      </Box>
                      <Box sx={{
                        p: 2,
                        mb: 2,
                        bgcolor: alpha(colors.blue.electric, 0.15),
                        borderRadius: 1.5,
                        border: `1px solid ${alpha(colors.blue.electric, 0.4)}`
                      }}>
                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                          A bowler takes <strong style={{ color: '#42A5F5', fontSize: '1.05em' }}>{exampleWickets} wickets</strong>, concedes <strong style={{ color: '#42A5F5', fontSize: '1.05em' }}>{exampleRuns} runs in {exampleOvers} overs</strong> (Economy: <strong style={{ color: '#42A5F5' }}>{exampleEconomy.toFixed(2)}</strong>)
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: colors.blue.electric }} />
                          <Typography variant="body2" color="text.secondary">
                            Wicket points: <strong style={{ color: '#1E88E5' }}>{exampleWickets} × {bowlingConfig.wicketPoints} = {wicketPoints} pts</strong>
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: colors.blue.electric }} />
                          <Typography variant="body2" color="text.secondary">
                            Overs bowled ≥ {bowlingConfig.minOversForEconomy}? <strong style={{ color: exampleOvers >= bowlingConfig.minOversForEconomy ? '#4CAF50' : '#E53935' }}>{exampleOvers >= bowlingConfig.minOversForEconomy ? '✓ Yes' : '✗ No'}</strong>
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: colors.blue.electric }} />
                          <Typography variant="body2" color="text.secondary">
                            Economy ({exampleEconomy.toFixed(2)}) {'<'} Bonus Threshold ({bowlingConfig.economyBonusThreshold})? <strong style={{ color: exampleEconomy < bowlingConfig.economyBonusThreshold ? '#4CAF50' : '#E53935' }}>{exampleEconomy < bowlingConfig.economyBonusThreshold ? '✓ Yes' : '✗ No'}</strong>
                          </Typography>
                        </Box>
                        {exampleEconomy < bowlingConfig.economyBonusThreshold && exampleOvers >= bowlingConfig.minOversForEconomy && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} />
                            <Typography variant="body2" color="text.secondary">
                              Economy bonus: <strong style={{ color: '#4CAF50' }}>({bowlingConfig.economyBonusThreshold} - {exampleEconomy.toFixed(2)}) × {bowlingConfig.economyMultiplier} = +{bonusPoints.toFixed(2)} pts</strong>
                            </Typography>
                          </Box>
                        )}
                        <Box sx={{
                          mt: 1,
                          p: 1.5,
                          bgcolor: alpha(colors.blue.electric, 0.12),
                          borderRadius: 1,
                          border: `1px solid ${alpha(colors.blue.electric, 0.3)}`
                        }}>
                          <Typography variant="body1" fontWeight="bold" sx={{ color: colors.blue.electric, textAlign: 'center' }}>
                            Total Points: {totalPoints.toFixed(2)} pts
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })()}

                {/* Bowling Penalty Example */}
                {bowlingConfig.penaltiesEnabled && bowlingConfig.economyPenaltyThreshold && (() => {
                  // Calculate penalty example based on config
                  const exampleWickets = 1;
                  const exampleOvers = 4;
                  const exampleRuns = 48;
                  const exampleEconomy = exampleRuns / exampleOvers;
                  const wicketPoints = exampleWickets * bowlingConfig.wicketPoints;
                  const economyPenalty = (bowlingConfig.economyPenaltyThreshold - exampleEconomy) * bowlingConfig.economyMultiplier;
                  const totalPoints = wicketPoints + economyPenalty;

                  return (
                    <Box sx={{
                      mt: 3,
                      p: 2.5,
                      background: `linear-gradient(135deg, ${alpha(colors.error.primary, 0.08)} 0%, ${alpha(colors.error.primary, 0.03)} 100%)`,
                      borderRadius: 2,
                      border: '2px solid',
                      borderColor: alpha(colors.error.primary, 0.3),
                      boxShadow: '0 4px 12px rgba(244, 67, 54, 0.15)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 6px 20px rgba(244, 67, 54, 0.25)',
                        borderColor: alpha(colors.error.primary, 0.5),
                      }
                    }}>
                      <Box sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: 'error.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 1.5,
                        boxShadow: '0 2px 8px rgba(244, 67, 54, 0.3)'
                      }}>
                        <Typography sx={{ fontSize: '1.2rem' }}>⚠️</Typography>
                      </Box>

                      <Typography variant="subtitle2" fontWeight="bold" color="error.main" gutterBottom sx={{ mb: 1.5 }}>
                        Example: Penalty Points
                      </Typography>

                      <Box sx={{
                        p: 2,
                        mb: 2,
                        bgcolor: alpha(colors.error.primary, 0.15),
                        borderRadius: 1.5,
                        border: `1px solid ${alpha(colors.error.primary, 0.4)}`
                      }}>
                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                          A bowler takes <strong style={{ color: '#EF5350', fontSize: '1.05em' }}>{exampleWickets} wicket</strong>, concedes <strong style={{ color: '#EF5350', fontSize: '1.05em' }}>{exampleRuns} runs in {exampleOvers} overs</strong> (Economy: <strong style={{ color: '#EF5350' }}>{exampleEconomy.toFixed(2)}</strong>)
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main' }} />
                        <Typography variant="body2" color="text.secondary">
                          Wicket points: <strong style={{ color: '#E53935' }}>{exampleWickets} × {bowlingConfig.wicketPoints} = {wicketPoints} pts</strong>
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main' }} />
                        <Typography variant="body2" color="text.secondary">
                          Overs bowled ≥ {bowlingConfig.minOversForEconomy}? <strong style={{ color: exampleOvers >= bowlingConfig.minOversForEconomy ? '#4CAF50' : '#E53935' }}>{exampleOvers >= bowlingConfig.minOversForEconomy ? '✓ Yes' : '✗ No'}</strong>
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main' }} />
                        <Typography variant="body2" color="text.secondary">
                          Economy ({exampleEconomy.toFixed(2)}) {'>'} Penalty Threshold ({bowlingConfig.economyPenaltyThreshold})? <strong style={{ color: exampleEconomy > bowlingConfig.economyPenaltyThreshold ? '#4CAF50' : '#E53935' }}>{exampleEconomy > bowlingConfig.economyPenaltyThreshold ? '✓ Yes' : '✗ No'}</strong>
                        </Typography>
                      </Box>

                      {exampleEconomy > bowlingConfig.economyPenaltyThreshold && exampleOvers >= bowlingConfig.minOversForEconomy && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main' }} />
                          <Typography variant="body2" color="text.secondary">
                            Economy penalty: <strong style={{ color: '#E53935' }}>({bowlingConfig.economyPenaltyThreshold} - {exampleEconomy.toFixed(2)}) × {bowlingConfig.economyMultiplier} = {economyPenalty.toFixed(2)} pts</strong>
                          </Typography>
                        </Box>
                      )}

                      <Box sx={{
                        mt: 1,
                        p: 1.5,
                        bgcolor: alpha(colors.error.primary, 0.12),
                        borderRadius: 1,
                        border: `1px solid ${alpha(colors.error.primary, 0.3)}`
                      }}>
                        <Typography variant="body1" fontWeight="bold" color="error.main" sx={{ textAlign: 'center' }}>
                          Total Points: {totalPoints.toFixed(2)} pts
                        </Typography>
                      </Box>
                    </Box>
                  );
                })()}
              </Box>

              {/* Fielding Configuration */}
              <Box sx={{ p: 2, bgcolor: alpha(colors.green.primary, 0.08), borderRadius: 2, border: '1px solid', borderColor: alpha(colors.green.primary, 0.3) }}>
                <Typography variant="h6" gutterBottom sx={{ color: colors.green.light, display: 'flex', alignItems: 'center', gap: 1 }}>
                  🧤 Fielding Scoring Rules
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Catch Points</Typography>
                    <Typography variant="body1" fontWeight="bold">{fieldingConfig.catchPoints} pts</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Run Out Points</Typography>
                    <Typography variant="body1" fontWeight="bold">{fieldingConfig.runOutPoints} pts</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Stumping Points</Typography>
                    <Typography variant="body1" fontWeight="bold">{fieldingConfig.stumpingPoints} pts</Typography>
                  </Box>
                </Box>
              </Box>

              {/* Prediction Points */}
              <Box sx={{ p: 2, bgcolor: alpha(colors.warning.primary, 0.08), borderRadius: 2, border: '1px solid', borderColor: alpha(colors.warning.primary, 0.3) }}>
                <Typography variant="h6" gutterBottom sx={{ color: colors.warning.light, display: 'flex', alignItems: 'center', gap: 1 }}>
                  🎯 Prediction Bonus Points
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Highest Run Scorer</Typography>
                    <Typography variant="body1" fontWeight="bold">80 pts</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Highest Wicket Taker</Typography>
                    <Typography variant="body1" fontWeight="bold">80 pts</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Winning Team</Typography>
                    <Typography variant="body1" fontWeight="bold">80 pts</Typography>
                  </Box>
                </Box>
              </Box>
            </>
          ) : (
            <Alert severity="info">
              This player pool uses <strong>Manual Scoring Mode</strong>. Points are added manually by admins rather than being calculated from detailed performance metrics.
            </Alert>
          )}
        </Box>
  );
};

const ScoringSystemPage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [playerPool, setPlayerPool] = useState<PlayerPool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!leagueId) return;

      try {
        setLoading(true);
        const leagueData = await leagueService.getById(leagueId);

        if (leagueData) {
          setLeague(leagueData);

          // Load player pool for the league
          if (leagueData.playerPoolId) {
            const poolData = await playerPoolService.getById(leagueData.playerPoolId);
            if (poolData) {
              setPlayerPool(poolData);
            } else {
              setError('Player pool not found for this league');
            }
          } else {
            setError('This league does not have a player pool configured');
          }
        } else {
          setError('League not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (leagueId) {
      loadData();
    }
  }, [leagueId]);

  if (loading) {
    return (
      <Box>
        <AppHeader />
        {leagueId && (
          <LeagueNav
            leagueName="Loading..."
            leagueId={leagueId}
            currentPage="Scoring System"
          />
        )}
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <CircularProgress size={60} />
        </Box>
      </Box>
    );
  }

  if (error || !league || !playerPool) {
    return (
      <Box>
        <AppHeader />
        {leagueId && league && (
          <LeagueNav
            leagueName={league.name}
            leagueId={leagueId}
            currentPage="Scoring System"
          />
        )}
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3, md: 4 } }}>
          <Alert severity="error">{error || 'Data not found'}</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader />
      {leagueId && (
        <LeagueNav
          leagueName={league.name}
          leagueId={leagueId}
          currentPage="Scoring System"
        />
      )}

      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3, md: 4 } }}>
        <Box sx={{
          position: 'relative', pl: 3, py: 2, mb: 4,
          '&::before': {
            content: '""', position: 'absolute',
            left: 0, top: 0, bottom: 0, width: '4px', borderRadius: '4px',
            background: `linear-gradient(180deg, ${colors.blue.electric}, ${alpha(colors.blue.electric, 0.2)})`,
          }
        }}>
          <Typography variant="h4" fontWeight={800} sx={{
            letterSpacing: '-0.02em',
            background: `linear-gradient(90deg, ${colors.text.primary} 60%, ${colors.blue.light})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Scoring System
          </Typography>
          <Typography variant="body2" sx={{ color: alpha(colors.text.secondary, 0.6), mt: 0.4 }}>
            {playerPool.name} • {league.tournamentName}
          </Typography>
        </Box>
        <Card sx={cardSx}>
          <CardContent sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 1.5, sm: 2, md: 2.5 } }}>
            <ScoringConfigContent pool={playerPool} />
          </CardContent>
        </Card>
      </Container>
      <LeagueAssistant leagueId={leagueId} />
    </Box>
  );
};

export default ScoringSystemPage;
