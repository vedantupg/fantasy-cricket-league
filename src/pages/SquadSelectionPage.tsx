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
  Badge,
  Paper,
  IconButton,
  Chip,
  Grid,
  Alert
} from '@mui/material';
import {
  PersonAdd,
  Star,
  StarBorder,
  Close,
  SwapHoriz
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppHeader from '../components/common/AppHeader';
import LeagueNav from '../components/common/LeagueNav';
import { playerPoolService, leagueService, squadService, squadPlayerUtils } from '../services/firestore';
import type { League, Player, SquadPlayer } from '../types/database';

interface SelectedPlayer extends Player {
  position: 'captain' | 'vice_captain' | 'regular' | 'bench';
}

const SquadSelectionPage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState<League | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>([]);
  const [powerplayMatch, setPowerplayMatch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

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
  }, [leagueId]);

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
           counts.allrounder >= league.squadRules.minAllrounders &&
           counts.wicketkeeper >= league.squadRules.minWicketkeepers &&
           counts.bench >= benchRequired &&
           selectedPlayers.filter(p => p.position === 'captain').length === 1 &&
           selectedPlayers.filter(p => p.position === 'vice_captain').length === 1;
  };

  const handleSubmitSquad = async () => {
    if (!user || !league || !leagueId) return;
    if (!isSquadValid()) return;

    try {
      setSubmitting(true);
      setSubmitError('');

      // Find captain and vice-captain
      const captain = selectedPlayers.find(p => p.position === 'captain');
      const viceCaptain = selectedPlayers.find(p => p.position === 'vice_captain');

      // Convert selected players to SquadPlayer format using utility function
      const squadPlayers: SquadPlayer[] = selectedPlayers.map(player => {
        const squadPlayer = squadPlayerUtils.createInitialSquadPlayer({
          playerId: player.id,
          playerName: player.name,
          team: player.team,
          role: player.role,
          points: player.stats[league.format].recentForm || 0, // Use current points from stats
        });
        return squadPlayer;
      });

      // Check if squad already exists
      const existingSquad = await squadService.getByUserAndLeague(user.uid, leagueId);

      if (existingSquad) {
        // Update existing squad
        await squadService.update(existingSquad.id, {
          players: squadPlayers,
          ...(captain?.id && { captainId: captain.id }),
          ...(viceCaptain?.id && { viceCaptainId: viceCaptain.id }),
          isSubmitted: true,
          submittedAt: new Date(),
          lastUpdated: new Date(),
        });
      } else {
        // Create new squad
        const squadData: any = {
          userId: user.uid,
          leagueId: leagueId,
          squadName: `${user.displayName || 'User'}'s Squad`,
          players: squadPlayers,
          isSubmitted: true,
          submittedAt: new Date(),
          totalPoints: 0,
          captainPoints: 0,
          viceCaptainPoints: 0,
          rank: 0,
          matchPoints: {},
          transfersUsed: 0,
          transferHistory: [],
          isValid: true,
          validationErrors: [],
        };

        // Only add captain/vice-captain if they exist
        if (captain?.id) squadData.captainId = captain.id;
        if (viceCaptain?.id) squadData.viceCaptainId = viceCaptain.id;

        await squadService.create(squadData);
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

  const addPlayerToSquad = (player: Player, targetPosition: 'captain' | 'vice_captain' | 'regular' | 'bench') => {
    if (selectedPlayers.find(p => p.id === player.id)) return;

    const newPlayer: SelectedPlayer = { ...player, position: targetPosition };
    setSelectedPlayers(prev => [...prev, newPlayer]);
  };

  const removePlayerFromSquad = (playerId: string) => {
    setSelectedPlayers(prev => prev.filter(p => p.id !== playerId));
  };

  const updatePlayerPosition = (playerId: string, newPosition: 'captain' | 'vice_captain' | 'regular' | 'bench') => {
    setSelectedPlayers(prev => prev.map(p =>
      p.id === playerId ? { ...p, position: newPosition } : p
    ));
  };

  const quickActions = (
    <Button
      variant="contained"
      color="success"
      disabled={!isSquadValid() || submitting}
      startIcon={submitting ? <CircularProgress size={20} /> : <Star />}
      onClick={handleSubmitSquad}
    >
      {submitting ? 'Submitting...' : 'Submit Squad'}
    </Button>
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

      <Container maxWidth="xl" sx={{ py: 2 }}>
        {submitError && (
          <Box sx={{ mb: 3 }}>
            <Alert severity="error" onClose={() => setSubmitError('')}>
              {submitError}
            </Alert>
          </Box>
        )}

        <Grid container spacing={3}>
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
      </Container>
    </Box>
  );
};

// Cricket Pitch Formation Component
const CricketPitchFormation: React.FC<{
  league: League;
  selectedPlayers: SelectedPlayer[];
  onRemovePlayer: (playerId: string) => void;
  onUpdatePosition: (playerId: string, position: 'captain' | 'vice_captain' | 'regular' | 'bench') => void;
  powerplayMatch: string;
  setPowerplayMatch: (match: string) => void;
  powerplayMatches: any[];
}> = ({ league, selectedPlayers, onRemovePlayer, onUpdatePosition, powerplayMatch, setPowerplayMatch, powerplayMatches }) => {

  const getRequiredSlots = () => {
    const { squadRules } = league;
    return {
      batsmen: Array(squadRules.minBatsmen).fill(null),
      bowlers: Array(squadRules.minBowlers).fill(null),
      allrounders: Array(squadRules.minAllrounders).fill(null),
      wicketkeepers: Array(squadRules.minWicketkeepers).fill(null),
      flexible: Array(league.squadSize - squadRules.minBatsmen - squadRules.minBowlers - squadRules.minAllrounders - squadRules.minWicketkeepers).fill(null),
      bench: league.transferTypes?.benchTransfers?.enabled ? Array(league.transferTypes.benchTransfers.benchSlots).fill(null) : []
    };
  };

  const requiredSlots = getRequiredSlots();

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
    const colors = getSlotColors(slotType, role);

    return (
      <Paper
        elevation={player ? 8 : 2}
        sx={{
          p: 2,
          minHeight: 100,
          width: '100%',
          maxWidth: 140,
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: player ? 'none' : `2px dashed ${colors.border}`,
          borderRadius: 3,
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
              onClick={() => onRemovePlayer(player.id)}
              sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } }}
            >
              <Close fontSize="small" />
            </IconButton>

            <Avatar sx={{ width: 32, height: 32, mb: 0.5, bgcolor: 'primary.main' }}>
              {player.name.charAt(0)}
            </Avatar>

            <Typography variant="caption" fontWeight="bold" textAlign="center">
              {player.name.split(' ').pop()}
            </Typography>

            <Chip
              size="small"
              label={player.team}
              sx={{ fontSize: '0.6rem', height: 16, mt: 0.5 }}
            />

            {/* Captain/Vice Captain badges */}
            {player.position === 'captain' && (
              <Badge sx={{ position: 'absolute', top: -5, left: -5 }}>
                <Chip label="C" size="small" color="warning" sx={{ fontSize: '0.7rem', height: 18 }} />
              </Badge>
            )}
            {player.position === 'vice_captain' && (
              <Badge sx={{ position: 'absolute', top: -5, left: -5 }}>
                <Chip label="VC" size="small" color="info" sx={{ fontSize: '0.7rem', height: 18 }} />
              </Badge>
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
      <CardContent>
        {/* Powerplay Selection */}
        {league.powerplayEnabled && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              ⚡ Powerplay Match Selection
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Select Powerplay Match</InputLabel>
              <Select
                value={powerplayMatch}
                label="Select Powerplay Match"
                onChange={(e) => setPowerplayMatch(e.target.value)}
              >
                {powerplayMatches.map((match) => (
                  <MenuItem key={match.id} value={match.id}>
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
            borderRadius: 3,
            position: 'relative',
            overflow: 'visible',
            boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
            minHeight: 800,
            pb: 3,
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

          <Typography variant="h6" color="white" textAlign="center" pt={2} pb={1} sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)', position: 'relative', zIndex: 2 }}>
            🏟️ Squad Formation
          </Typography>

          {/* Cricket Field Formation Layout */}
          <Box sx={{ zIndex: 2, position: 'relative', px: 3 }}>

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
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Box sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: 'rgba(76, 175, 80, 0.7)',
                    px: 2.5,
                    py: 0.75,
                    borderRadius: '20px',
                    mb: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}>
                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold', fontSize: '1rem' }}>
                      🥅 Wicket-Keepers
                    </Typography>
                    <Chip
                      label={`${league.squadRules.minWicketkeepers} Required`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.9)',
                        color: '#2E7D32',
                        fontWeight: 'bold',
                        fontSize: '0.75rem'
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', pb: 2 }}>
                    {requiredSlots.wicketkeepers.map((_, index) => {
                      const players = selectedPlayers.filter(p => p.role === 'wicketkeeper' && p.position !== 'bench');
                      return (
                        <PlayerSlot
                          key={`wicketkeeper-${index}`}
                          player={players[index]}
                          role="wicketkeeper"
                          slotType="required"
                          position={index}
                        />
                      );
                    })}
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
              <Box sx={{ textAlign: 'center', py: 2, pt: 3 }}>
                <Box sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: 'rgba(76, 175, 80, 0.7)',
                  px: 2.5,
                  py: 0.75,
                  borderRadius: '20px',
                  mb: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}>
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold', fontSize: '1rem' }}>
                    🏏 Batters
                  </Typography>
                  <Chip
                    label={`${league.squadRules.minBatsmen} Required`}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.9)',
                      color: '#2E7D32',
                      fontWeight: 'bold',
                      fontSize: '0.75rem'
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', pb: 2 }}>
                  {requiredSlots.batsmen.map((_, index) => {
                    const players = selectedPlayers.filter(p => p.role === 'batsman' && p.position !== 'bench');
                    return (
                      <PlayerSlot
                        key={`batsman-${index}`}
                        player={players[index]}
                        role="batsman"
                        slotType="required"
                        position={index}
                      />
                    );
                  })}
                </Box>
              </Box>
            </Box>

            {/* All-rounders - Middle of pitch */}
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
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: 'rgba(76, 175, 80, 0.7)',
                  px: 2.5,
                  py: 0.75,
                  borderRadius: '20px',
                  mb: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}>
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold', fontSize: '1rem' }}>
                    ⚡ All-Rounders
                  </Typography>
                  <Chip
                    label={`${league.squadRules.minAllrounders} Required`}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.9)',
                      color: '#2E7D32',
                      fontWeight: 'bold',
                      fontSize: '0.75rem'
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', pb: 2 }}>
                  {requiredSlots.allrounders.map((_, index) => {
                    const players = selectedPlayers.filter(p => p.role === 'allrounder' && p.position !== 'bench');
                    return (
                      <PlayerSlot
                        key={`allrounder-${index}`}
                        player={players[index]}
                        role="allrounder"
                        slotType="required"
                        position={index}
                      />
                    );
                  })}
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
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: 'rgba(76, 175, 80, 0.7)',
                  px: 2.5,
                  py: 0.75,
                  borderRadius: '20px',
                  mb: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}>
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold', fontSize: '1rem' }}>
                    🎯 Bowlers
                  </Typography>
                  <Chip
                    label={`${league.squadRules.minBowlers} Required`}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.9)',
                      color: '#2E7D32',
                      fontWeight: 'bold',
                      fontSize: '0.75rem'
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', pb: 2 }}>
                  {requiredSlots.bowlers.map((_, index) => {
                    const players = selectedPlayers.filter(p => p.role === 'bowler' && p.position !== 'bench');
                    return (
                      <PlayerSlot
                        key={`bowler-${index}`}
                        player={players[index]}
                        role="bowler"
                        slotType="required"
                        position={index}
                      />
                    );
                  })}
                </Box>
              </Box>
            </Box>

            {/* Flexible Slots - Inside field, below pitch */}
            {requiredSlots.flexible.length > 0 && (
              <Box sx={{ py: 3, pb: 4 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: 'rgba(96, 125, 139, 0.8)',
                    px: 2.5,
                    py: 0.75,
                    borderRadius: '20px',
                    mb: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}>
                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold', fontSize: '1rem' }}>
                      ⚡ Flexible Positions (Any Role)
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {requiredSlots.flexible.map((_, index) => {
                      const mainSquadPlayers = selectedPlayers.filter(p => p.position !== 'bench');
                      const allSelectedByRole = {
                        batsman: mainSquadPlayers.filter(p => p.role === 'batsman'),
                        bowler: mainSquadPlayers.filter(p => p.role === 'bowler'),
                        allrounder: mainSquadPlayers.filter(p => p.role === 'allrounder'),
                        wicketkeeper: mainSquadPlayers.filter(p => p.role === 'wicketkeeper')
                      };

                      const flexiblePlayers = [
                        ...allSelectedByRole.batsman.slice(league.squadRules.minBatsmen),
                        ...allSelectedByRole.bowler.slice(league.squadRules.minBowlers),
                        ...allSelectedByRole.allrounder.slice(league.squadRules.minAllrounders),
                        ...allSelectedByRole.wicketkeeper.slice(league.squadRules.minWicketkeepers)
                      ];

                      return (
                        <PlayerSlot
                          key={`flexible-${index}`}
                          player={flexiblePlayers[index]}
                          slotType="flexible"
                          position={index}
                        />
                      );
                    })}
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        {/* Outside Field - Bench Slots */}
        {requiredSlots.bench.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                🪑 Bench Players (Outside Field)
              </Typography>
              <Box sx={{
                display: 'flex',
                gap: 2,
                justifyContent: 'center',
                flexWrap: 'wrap',
                p: 3,
                bgcolor: 'rgba(255, 152, 0, 0.15)',
                borderRadius: 3,
                border: '2px solid rgba(255, 152, 0, 0.4)',
                boxShadow: '0 4px 12px rgba(255, 152, 0, 0.2)'
              }}>
                {requiredSlots.bench.map((_, index) => {
                  const benchPlayers = selectedPlayers.filter(p => p.position === 'bench');
                  return (
                    <PlayerSlot
                      key={`bench-${index}`}
                      player={benchPlayers[index]}
                      slotType="bench"
                      position={index}
                    />
                  );
                })}
              </Box>
            </Box>
          </Box>
        )}

        {/* Modern Squad Summary */}
        <Box sx={{
          mt: 4,
          p: 3,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <Typography variant="h6" gutterBottom color="white" sx={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)', fontWeight: 'bold' }}>
            📊 Squad Summary
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <Chip
              label={`Players: ${selectedPlayers.filter(p => p.position !== 'bench').length}/${league.squadSize}`}
              color="primary"
              variant="filled"
              sx={{ fontWeight: 'bold' }}
            />
            {requiredSlots.bench.length > 0 && (
              <Chip
                label={`Bench: ${selectedPlayers.filter(p => p.position === 'bench').length}/${requiredSlots.bench.length}`}
                color="secondary"
                variant="filled"
                sx={{ fontWeight: 'bold' }}
              />
            )}
            <Chip
              label={`Captain: ${selectedPlayers.filter(p => p.position === 'captain').length ? '✓' : '✗'}`}
              color={selectedPlayers.filter(p => p.position === 'captain').length ? 'success' : 'error'}
              variant="filled"
              sx={{ fontWeight: 'bold' }}
            />
            <Chip
              label={`Vice Captain: ${selectedPlayers.filter(p => p.position === 'vice_captain').length ? '✓' : '✗'}`}
              color={selectedPlayers.filter(p => p.position === 'vice_captain').length ? 'success' : 'error'}
              variant="filled"
              sx={{ fontWeight: 'bold' }}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// Player Selection Panel Component
const PlayerSelectionPanel: React.FC<{
  availablePlayers: Player[];
  selectedPlayers: SelectedPlayer[];
  onAddPlayer: (player: Player, position: 'captain' | 'vice_captain' | 'regular' | 'bench') => void;
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
    <Card sx={{ mb: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Avatar sx={{ width: 40, height: 40, mr: 2, bgcolor: 'primary.main' }}>
            {player.name.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold">
              {player.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {player.team} • {player.role}
            </Typography>
          </Box>
          <Chip
            label={player.stats[league.format].recentForm}
            size="small"
            color={player.stats[league.format].recentForm > 80 ? 'success' : player.stats[league.format].recentForm > 60 ? 'warning' : 'error'}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => onAddPlayer(player, 'regular')}
            startIcon={<PersonAdd />}
          >
            Add
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            onClick={() => onAddPlayer(player, 'captain')}
            startIcon={<Star />}
          >
            Captain
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="info"
            onClick={() => onAddPlayer(player, 'vice_captain')}
            startIcon={<StarBorder />}
          >
            VC
          </Button>
          {league.transferTypes?.benchTransfers?.enabled && (
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              onClick={() => onAddPlayer(player, 'bench')}
              startIcon={<SwapHoriz />}
            >
              Bench
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          🎯 Player Selection
        </Typography>

        {/* Role Filter */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Filter by Role</InputLabel>
          <Select
            value={filterRole}
            label="Filter by Role"
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <MenuItem value="all">All Players</MenuItem>
            <MenuItem value="batsman">Batters</MenuItem>
            <MenuItem value="bowler">Bowlers</MenuItem>
            <MenuItem value="allrounder">All-rounders</MenuItem>
            <MenuItem value="wicketkeeper">Wicket-keepers</MenuItem>
          </Select>
        </FormControl>

        {/* Available Players */}
        <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
          {filteredPlayers.length > 0 ? (
            filteredPlayers.map(player => (
              <PlayerCard key={player.id} player={player} />
            ))
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
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