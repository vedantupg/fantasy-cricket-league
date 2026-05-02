import React, { useEffect, useState } from 'react';
import {
  Popover,
  Drawer,
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Skeleton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useMediaQuery, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { squadService } from '../../services/firestore';
import type { StandingEntry, LeagueSquad, SquadPlayer } from '../../types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

interface SquadPeekPopoverProps {
  anchor: HTMLElement | null;
  standing: StandingEntry | null;
  leagueId: string;
  squadCache: React.MutableRefObject<Map<string, LeagueSquad>>;
  onClose: () => void;
  squadSize?: number;
}

const ROLE_ORDER = ['wicketkeeper', 'batsman', 'allrounder', 'bowler'] as const;

const ROLE_META: Record<string, { label: string; short: string; color: string; glyph: string }> = {
  wicketkeeper: { label: 'Wicket-Keeper', short: 'WK',  color: '#06b6d4', glyph: '🧤' },
  batsman:      { label: 'Batsmen',        short: 'BAT', color: '#FFD700', glyph: '🏏' },
  allrounder:   { label: 'All-Rounders',   short: 'AR',  color: '#66BB6A', glyph: '⚡' },
  bowler:       { label: 'Bowlers',        short: 'BWL', color: '#FF9800', glyph: '🏐' },
};

const SPECIALS = [
  { key: 'captainId',     label: 'C',  title: 'Captain',       color: '#FFD700', shadow: 'rgba(255,215,0,0.25)' },
  { key: 'viceCaptainId', label: 'VC', title: 'Vice-Captain',  color: '#C0C0C0', shadow: 'rgba(192,192,192,0.2)' },
  { key: 'xFactorId',     label: 'X',  title: 'X-Factor',      color: '#9C27B0', shadow: 'rgba(156,39,176,0.25)' },
] as const;

const getRankColor = (rank: number) => {
  if (rank === 1) return '#FFD700';
  if (rank === 2) return '#C0C0C0';
  if (rank === 3) return '#CD7F32';
  if (rank === 4) return '#1E88E5';
  if (rank === 5) return '#9C27B0';
  return '#757575';
};

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

function groupByRole(players: SquadPlayer[]) {
  const out: Record<string, SquadPlayer[]> = {};
  for (const role of ROLE_ORDER) {
    out[role] = players.filter(p => p.role === role);
  }
  return out;
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────────

const LoadingSkeleton: React.FC = () => (
  <Box sx={{ px: 2, pb: 2.5, pt: 1 }}>
    {/* Specials */}
    {[0, 1, 2].map(i => (
      <Skeleton
        key={i}
        variant="rounded"
        height={44}
        sx={{ mb: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }}
      />
    ))}
    <Box sx={{ my: 1.5, height: '1px', bgcolor: 'rgba(255,255,255,0.06)' }} />
    {/* Role groups */}
    {[0, 1].map(i => (
      <Box key={i} sx={{ mb: 1.5 }}>
        <Skeleton variant="text" width={48} sx={{ mb: 0.75, bgcolor: 'rgba(255,255,255,0.04)' }} />
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          {[...Array(i === 0 ? 3 : 4)].map((_, j) => (
            <Skeleton key={j} variant="rounded" width={80} height={26} sx={{ borderRadius: 99, bgcolor: 'rgba(255,255,255,0.05)' }} />
          ))}
        </Box>
      </Box>
    ))}
  </Box>
);

// ─── Main Content ──────────────────────────────────────────────────────────────

const SquadPeekContent: React.FC<{
  standing: StandingEntry;
  squad: LeagueSquad | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  squadSize: number;
}> = ({ standing, squad, loading, error, onClose, squadSize }) => {
  const navigate = useNavigate();
  const rankColor = getRankColor(standing.rank);
  const playingXI = squad ? squad.players.slice(0, squadSize) : [];
  const bench = squad ? squad.players.slice(squadSize) : [];
  const groupedXI = groupByRole(playingXI);
  const groupedBench = groupByRole(bench);
  const specialIds = new Set([squad?.captainId, squad?.viceCaptainId, squad?.xFactorId].filter(Boolean));

  return (
    <Box sx={{ width: { xs: '100vw', sm: 340 } }}>

      {/* ── Header ── */}
      <Box sx={{
        position: 'relative',
        overflow: 'hidden',
        px: 2.5,
        pt: 2.5,
        pb: 2,
        // layered background: rank-tinted gradient + noise-style micro-texture
        background: `
          linear-gradient(145deg,
            ${rankColor}18 0%,
            rgba(10,25,41,0.0) 55%
          ),
          linear-gradient(180deg, #0D1E30 0%, #0A1929 100%)
        `,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        {/* Rank glow orb — purely decorative */}
        <Box sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${rankColor}22 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.75, position: 'relative' }}>
          {/* Avatar + rank badge */}
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              src={standing.profilePicUrl || undefined}
              sx={{
                width: 52,
                height: 52,
                border: `2.5px solid ${rankColor}`,
                boxShadow: `0 0 12px ${rankColor}40`,
                bgcolor: '#050E18',
              }}
              slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
            >
              <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: rankColor }}>
                {getInitials(standing.displayName)}
              </Typography>
            </Avatar>
            {/* Rank pip */}
            <Box sx={{
              position: 'absolute',
              bottom: -4,
              right: -4,
              width: 22,
              height: 22,
              borderRadius: '50%',
              bgcolor: '#060D17',
              border: `1.5px solid ${rankColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Typography sx={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '0.7rem',
                color: rankColor,
                lineHeight: 1,
                letterSpacing: '0.3px',
              }}>
                #{standing.rank}
              </Typography>
            </Box>
          </Box>

          {/* Name + squad + pts */}
          <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
            <Box display="flex" alignItems="center" gap={0.75} sx={{ overflow: 'hidden' }}>
              <Typography sx={{
                fontFamily: "'Satoshi', sans-serif",
                fontWeight: 800,
                fontSize: '1rem',
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
                color: '#fff',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                flex: 1,
                minWidth: 0,
              }}>
                {squad?.squadName || standing.displayName}
              </Typography>
              <Chip
                label="Profile"
                size="small"
                onClick={() => { onClose(); navigate(`/user/${standing.userId}`); }}
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  bgcolor: 'rgba(255,255,255,0.07)',
                  color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  flexShrink: 0,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', color: '#fff' },
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            </Box>
            {squad?.squadName && squad.squadName !== standing.displayName && (
              <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', mt: 0.15, lineHeight: 1 }}>
                {standing.displayName}
              </Typography>
            )}
            {/* Points pill */}
            <Box sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 0.75,
              px: 1.25,
              py: 0.3,
              borderRadius: 99,
              bgcolor: `${rankColor}15`,
              border: `1px solid ${rankColor}35`,
            }}>
              <Typography sx={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '0.85rem',
                color: rankColor,
                letterSpacing: '0.5px',
                lineHeight: 1,
              }}>
                {standing.totalPoints.toFixed(2)}
              </Typography>
              <Typography sx={{ fontSize: '0.6rem', color: `${rankColor}99`, lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                pts
              </Typography>
            </Box>
          </Box>

          {/* Close */}
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              color: 'rgba(255,255,255,0.6)',
              mt: -0.5,
              mr: -0.5,
              '&:hover': { color: 'rgba(255,255,255,0.7)', bgcolor: 'rgba(255,255,255,0.06)' },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>

      {/* ── Body ── */}
      {loading && <LoadingSkeleton />}

      {error && !loading && (
        <Box sx={{ px: 2.5, py: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '1.5rem', mb: 0.5 }}>😕</Typography>
          <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)' }}>{error}</Typography>
        </Box>
      )}

      {squad && !loading && (
        <Box sx={{ px: 2, pt: 1.75, pb: 2.5 }}>

          {/* ── Captain / VC / X-Factor ── */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
            {SPECIALS.map(({ key, label, title, color, shadow }) => {
              const playerId = squad[key as keyof LeagueSquad] as string | undefined;
              if (!playerId) return null;
              const player = squad.players.find(p => p.playerId === playerId);
              if (!player) return null;

              return (
                <Box
                  key={label}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    px: 1.5,
                    py: 0.9,
                    borderRadius: 2,
                    bgcolor: `${color}0D`,
                    border: `1px solid ${color}28`,
                    boxShadow: `inset 0 1px 0 ${color}15`,
                    transition: 'background 0.15s',
                    '&:hover': { bgcolor: `${color}16` },
                  }}
                >
                  {/* Badge */}
                  <Box sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: `radial-gradient(circle at 35% 35%, ${color}55, ${color}22)`,
                    border: `1.5px solid ${color}80`,
                    boxShadow: `0 2px 8px ${shadow}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Typography sx={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: label === 'VC' ? '0.58rem' : '0.68rem',
                      color,
                      letterSpacing: '0.3px',
                      lineHeight: 1,
                    }}>
                      {label}
                    </Typography>
                  </Box>

                  {/* Player name */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{
                      fontFamily: "'Satoshi', sans-serif",
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      lineHeight: 1.2,
                      color: '#fff',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}>
                      {player.playerName}
                    </Typography>
                    <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1, mt: 0.15 }}>
                      {title}
                    </Typography>
                  </Box>

                  {/* Team tag */}
                  <Typography sx={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    color: `${color}CC`,
                    textTransform: 'uppercase',
                    flexShrink: 0,
                  }}>
                    {player.team}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {/* ── Playing XI ── */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 1.75,
          }}>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.07)' }} />
            <Typography sx={{
              fontSize: '0.55rem',
              fontWeight: 700,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
            }}>
              Playing XI
            </Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.07)' }} />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {ROLE_ORDER.map(role => {
              const players = (groupedXI[role] || []).filter(p => !specialIds.has(p.playerId));
              if (players.length === 0) return null;
              const meta = ROLE_META[role];

              return (
                <Box key={role}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                    <Box sx={{
                      width: 3,
                      height: 12,
                      borderRadius: 99,
                      bgcolor: meta.color,
                      opacity: 0.7,
                      flexShrink: 0,
                    }} />
                    <Typography sx={{
                      fontSize: '0.6rem',
                      fontWeight: 800,
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      color: meta.color,
                      opacity: 0.85,
                    }}>
                      {meta.short}
                    </Typography>
                    <Typography sx={{
                      fontSize: '0.58rem',
                      color: 'rgba(255,255,255,0.5)',
                      ml: 0.25,
                    }}>
                      {players.length}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                    {players.map(p => (
                      <Chip
                        key={p.playerId}
                        label={p.playerName}
                        size="small"
                        sx={{
                          height: 26,
                          fontSize: '0.72rem',
                          fontWeight: 500,
                          fontFamily: "'Satoshi', sans-serif",
                          bgcolor: 'rgba(255,255,255,0.04)',
                          color: 'rgba(255,255,255,0.7)',
                          border: `1px solid rgba(255,255,255,0.09)`,
                          borderRadius: 99,
                          transition: 'all 0.15s',
                          '&:hover': {
                            bgcolor: `${meta.color}18`,
                            borderColor: `${meta.color}50`,
                            color: '#fff',
                          },
                          '& .MuiChip-label': { px: 1.25 },
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* ── Bench ── */}
          {bench.length > 0 && (
            <>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mt: 2,
                mb: 1.75,
              }}>
                <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.05)' }} />
                <Typography sx={{
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.5)',
                }}>
                  Bench
                </Typography>
                <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.05)' }} />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {ROLE_ORDER.map(role => {
                  const players = (groupedBench[role] || []).filter(p => !specialIds.has(p.playerId));
                  if (players.length === 0) return null;
                  const meta = ROLE_META[role];

                  return (
                    <Box key={role}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                        <Box sx={{
                          width: 3,
                          height: 12,
                          borderRadius: 99,
                          bgcolor: meta.color,
                          opacity: 0.4,
                          flexShrink: 0,
                        }} />
                        <Typography sx={{
                          fontSize: '0.6rem',
                          fontWeight: 800,
                          letterSpacing: '1.5px',
                          textTransform: 'uppercase',
                          color: meta.color,
                          opacity: 0.5,
                        }}>
                          {meta.short}
                        </Typography>
                        <Typography sx={{
                          fontSize: '0.58rem',
                          color: 'rgba(255,255,255,0.5)',
                          ml: 0.25,
                        }}>
                          {players.length}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                        {players.map(p => (
                          <Chip
                            key={p.playerId}
                            label={p.playerName}
                            size="small"
                            sx={{
                              height: 26,
                              fontSize: '0.72rem',
                              fontWeight: 500,
                              fontFamily: "'Satoshi', sans-serif",
                              bgcolor: 'rgba(255,255,255,0.02)',
                              color: 'rgba(255,255,255,0.65)',
                              border: `1px solid rgba(255,255,255,0.06)`,
                              borderRadius: 99,
                              opacity: 0.65,
                              transition: 'all 0.15s',
                              '&:hover': {
                                bgcolor: `${meta.color}10`,
                                borderColor: `${meta.color}30`,
                                color: 'rgba(255,255,255,0.65)',
                                opacity: 1,
                              },
                              '& .MuiChip-label': { px: 1.25 },
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </>
          )}

          {/* ── Footer stat row ── */}
          <Box sx={{
            display: 'flex',
            gap: 0,
            mt: 2.5,
            pt: 1.75,
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}>
            {[
              { label: 'Captain', value: standing.captainPoints.toFixed(1), color: '#FFD700' },
              { label: 'VC', value: standing.viceCaptainPoints.toFixed(1), color: '#C0C0C0' },
              { label: 'Today', value: standing.pointsGainedToday !== undefined && standing.pointsGainedToday !== 0 ? (standing.pointsGainedToday > 0 ? '+' : '') + standing.pointsGainedToday.toFixed(1) : '—', color: standing.pointsGainedToday && standing.pointsGainedToday > 0 ? '#66BB6A' : standing.pointsGainedToday && standing.pointsGainedToday < 0 ? '#F44336' : 'rgba(255,255,255,0.3)' },
            ].map(({ label, value, color }, i, arr) => (
              <Box
                key={label}
                sx={{
                  flex: 1,
                  textAlign: 'center',
                  borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                }}
              >
                <Typography sx={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '1rem',
                  letterSpacing: '0.5px',
                  color,
                  lineHeight: 1,
                }}>
                  {value}
                </Typography>
                <Typography sx={{
                  fontSize: '0.58rem',
                  fontWeight: 700,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.55)',
                  mt: 0.4,
                }}>
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>

        </Box>
      )}
    </Box>
  );
};

// ─── Shell (Popover / Drawer) ──────────────────────────────────────────────────

const PAPER_SX = {
  bgcolor: '#07121E',
  backgroundImage: 'none',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 3,
  boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
  overflow: 'hidden',
} as const;

/**
 * Squad peek popover — opens when a leaderboard card is clicked.
 * Popover on desktop, bottom Drawer on mobile.
 */
const SquadPeekPopover: React.FC<SquadPeekPopoverProps> = ({
  anchor,
  standing,
  leagueId,
  squadCache,
  onClose,
  squadSize = 11,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [squad, setSquad] = useState<LeagueSquad | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = Boolean(anchor) && Boolean(standing);

  useEffect(() => {
    if (!open || !standing) return;

    const cached = squadCache.current.get(standing.userId);
    if (cached) {
      setSquad(cached);
      setError(null);
      return;
    }

    setSquad(null);
    setError(null);
    setLoading(true);

    squadService.getByUserAndLeague(standing.userId, leagueId)
      .then(data => {
        if (data) {
          squadCache.current.set(standing.userId, data);
          setSquad(data);
        } else {
          setError('Squad not found');
        }
      })
      .catch(() => setError('Failed to load squad'))
      .finally(() => setLoading(false));
  }, [open, standing, leagueId, squadCache]);

  if (!standing) return null;

  const content = (
    <SquadPeekContent
      standing={standing}
      squad={squad}
      loading={loading}
      error={error}
      onClose={onClose}
      squadSize={squadSize}
    />
  );

  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            ...PAPER_SX,
            borderRadius: '20px 20px 0 0',
            maxHeight: '85vh',
            overflowY: 'auto',
            // drag handle hint
            '&::before': {
              content: '""',
              display: 'block',
              width: 36,
              height: 4,
              borderRadius: 99,
              bgcolor: 'rgba(255,255,255,0.3)',
              mx: 'auto',
              mt: 1.5,
              mb: -1,
            },
          },
        }}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Popover
      open={open}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      slotProps={{ paper: { sx: { ...PAPER_SX, mt: 1 } } }}
    >
      {content}
    </Popover>
  );
};

export default SquadPeekPopover;
