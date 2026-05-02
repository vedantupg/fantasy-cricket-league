import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Avatar,
  Button,
  CircularProgress,
  Grid,
  Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  ArrowBack,
  EmojiEvents,
  LockOutlined,
  WorkspacePremium,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { userService, squadService, leagueService } from '../services/firestore';
import AppHeader from '../components/common/AppHeader';
import type { User, LeagueSquad, League } from '../types/database';
import { colors } from '../theme/colors';

// ─── Achievement config ────────────────────────────────────────────────

interface Achievement {
  id: string;
  name: string;
  description: string;
  earned: boolean;
  icon: string;
  color: string;
  tier: 'legendary' | 'epic' | 'rare';
}

const BADGE_META: Record<string, { color: string; tier: Achievement['tier']; unlockPct: number }> = {
  first_blood:       { color: '#ef4444', tier: 'rare',      unlockPct: 91 },
  squad_master:      { color: '#8b5cf6', tier: 'epic',      unlockPct: 38 },
  league_dominator:  { color: '#f59e0b', tier: 'legendary', unlockPct: 12 },
  top_10:            { color: '#10b981', tier: 'epic',      unlockPct: 54 },
  points_machine:    { color: '#00e5ff', tier: 'epic',      unlockPct: 61 },
  league_veteran:    { color: '#f97316', tier: 'rare',      unlockPct: 18 },
  captain_fantastic: { color: '#ffd700', tier: 'legendary', unlockPct: 43 },
};

const TIER_LABELS: Record<Achievement['tier'], string> = {
  legendary: 'LEGENDARY',
  epic: 'EPIC',
  rare: 'RARE',
};

function calcAchievements(squads: LeagueSquad[], leagues: League[], totalPts: number): Achievement[] {
  return [
    { id: 'first_blood',       name: 'First Blood',      description: 'Joined your first league',            earned: leagues.length > 0,                                   icon: '🎯' },
    { id: 'squad_master',      name: 'Squad Master',     description: 'Submitted 10+ squads',                earned: squads.filter(s => s.isSubmitted).length >= 10,        icon: '👑' },
    { id: 'league_dominator',  name: 'Dominator',        description: 'Won a league (finished #1)',           earned: squads.some(s => s.rank === 1),                        icon: '🏆' },
    { id: 'top_10',            name: 'Top 10',           description: 'Ranked top 10 in any league',         earned: squads.some(s => s.rank && s.rank <= 10),              icon: '🌟' },
    { id: 'points_machine',    name: 'Points Machine',   description: 'Scored 1,000+ total points',          earned: totalPts >= 1000,                                      icon: '⚡' },
    { id: 'league_veteran',    name: 'Veteran',          description: 'Completed 5+ leagues',                earned: leagues.filter(l => l.status === 'completed').length >= 5, icon: '🎖️' },
    { id: 'captain_fantastic', name: 'Captain',          description: 'Captain scored 100+ pts in a season', earned: squads.some(s => (s.captainPoints || 0) >= 100),       icon: '🫡' },
  ].map(a => ({ ...a, color: BADGE_META[a.id].color, tier: BADGE_META[a.id].tier }));
}

// ─── Archetype ────────────────────────────────────────────────────────

interface Archetype { label: string; tagline: string; color: string }

function getArchetype(
  s: { bestRank: number | null; leaguesWon: number; totalCareerPoints: number; totalLeagues: number; averageRank: number | null },
  top10: number,
): Archetype {
  if (s.bestRank === 1)
    return { label: 'League Dominator', tagline: s.leaguesWon > 1 ? `${s.leaguesWon}× Champion · Built for Glory` : 'Proven at the Top · Elite Winner', color: '#ffd700' };
  if (s.leaguesWon > 0)
    return { label: 'League Champion', tagline: `${s.leaguesWon}× Winner · Built for Podiums`, color: '#ffd700' };
  if (s.bestRank && s.bestRank <= 3)
    return { label: 'Podium Finisher', tagline: 'Consistently Top 3 · Near Elite', color: '#c0c0c0' };
  if (s.averageRank && s.averageRank <= 5)
    return { label: 'Elite Strategist', tagline: 'Avg Top 5 · Ruthlessly Consistent', color: '#00e5ff' };
  if (top10 >= 3)
    return { label: 'Top 10 Regular', tagline: `${top10} Top-10 Finishes · Reliable Performer`, color: '#10b981' };
  if (s.averageRank && s.averageRank <= 10)
    return { label: 'Tactical Grinder', tagline: 'Consistent Top 10 · Steady Performer', color: '#10b981' };
  if (s.totalCareerPoints > 10000)
    return { label: 'Points Machine', tagline: 'High Volume Scorer · Never Slows Down', color: '#00e5ff' };
  if (s.totalLeagues >= 5)
    return { label: 'League Veteran', tagline: `${s.totalLeagues} Leagues Deep · Experience Counts`, color: '#f97316' };
  return { label: 'Rising Star', tagline: 'Building the Legacy · Watch this Space', color: '#8b5cf6' };
}

const getAvatarRingColor = (bestRank: number | null) => {
  if (bestRank === 1) return '#ffd700';
  if (bestRank !== null && bestRank <= 3) return '#c0c0c0';
  return colors.blue.electric;
};

const fmtPts = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000)    return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
};

// ─── Badge card ────────────────────────────────────────────────────────

const BadgeCard: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
  const { earned, icon, name, color, tier, id } = achievement;
  const tierGlow =
    tier === 'legendary' ? `0 0 20px ${alpha(color, 0.65)}` :
    tier === 'epic'      ? `0 0 12px ${alpha(color, 0.45)}` :
                           `0 0 8px ${alpha(color, 0.3)}`;
  const unlockPct = BADGE_META[id]?.unlockPct ?? 50;
  const tierColor =
    tier === 'legendary' ? '#ffd700' :
    tier === 'epic'      ? '#8b5cf6' :
                           '#64748b';

  return (
    <Tooltip title={`${achievement.description} · Unlocked by ~${unlockPct}% of players`} placement="top" arrow>
      <Box
        sx={{
          position: 'relative',
          width: 86,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          p: 1.25,
          borderRadius: 2.5,
          border: earned ? `1.5px solid ${alpha(color, 0.6)}` : `1px solid ${alpha('#fff', 0.07)}`,
          background: earned
            ? `linear-gradient(145deg, ${alpha(color, 0.12)} 0%, ${alpha(color, 0.03)} 100%)`
            : alpha('#fff', 0.02),
          boxShadow: earned ? tierGlow : 'none',
          filter: earned ? 'none' : 'grayscale(1) brightness(0.4)',
          opacity: earned ? 1 : 0.5,
          transition: 'all 0.2s ease',
          cursor: 'default',
          ...(earned && tier === 'legendary' && {
            '@keyframes legendaryPulse': {
              '0%, 100%': { boxShadow: `0 0 10px ${alpha(color, 0.5)}, 0 0 22px ${alpha(color, 0.25)}` },
              '50%':       { boxShadow: `0 0 20px ${alpha(color, 0.9)}, 0 0 44px ${alpha(color, 0.5)}` },
            },
            animation: 'legendaryPulse 2.4s ease-in-out infinite',
          }),
          '&:hover': earned ? {
            border: `1.5px solid ${alpha(color, 0.9)}`,
            transform: 'translateY(-2px)',
          } : {},
        }}
      >
        {!earned && (
          <Box sx={{ position: 'absolute', top: 6, right: 6 }}>
            <LockOutlined sx={{ fontSize: 10, color: alpha('#fff', 0.25) }} />
          </Box>
        )}
        {earned && tier === 'legendary' && (
          <Box sx={{ position: 'absolute', top: 4, right: 4 }}>
            <WorkspacePremium sx={{ fontSize: 11, color }} />
          </Box>
        )}
        <Typography sx={{ fontSize: '1.5rem', lineHeight: 1, mb: 0.1 }}>{icon}</Typography>
        <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color: earned ? color : alpha('#fff', 0.35), textAlign: 'center', letterSpacing: '0.03em', lineHeight: 1.2 }}>
          {name}
        </Typography>
        <Typography sx={{ fontSize: '0.48rem', fontWeight: 700, color: earned ? tierColor : alpha('#fff', 0.2), letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {TIER_LABELS[tier]}
        </Typography>
      </Box>
    </Tooltip>
  );
};

// ─── Page ──────────────────────────────────────────────────────────────

const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState({
    totalCareerPoints: 0,
    bestRank: null as number | null,
    leaguesWon: 0,
    totalLeagues: 0,
    totalSquads: 0,
    averageRank: null as number | null,
    top10Finishes: 0,
  });

  const memberSince = profileUser?.createdAt
    ? ((profileUser.createdAt as any).toDate?.() ?? new Date(profileUser.createdAt)).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        setLoading(true);
        const u = await userService.getById(userId);
        if (!u) return;
        setProfileUser(u);

        const userLeagues = await leagueService.getForUser(userId);
        const allSquads: LeagueSquad[] = [];
        for (const league of userLeagues) {
          const sq = await squadService.getByUserAndLeague(userId, league.id);
          if (sq) allSquads.push(sq);
        }

        const totalCareerPoints = allSquads.reduce((s, sq) => s + (sq.totalPoints || 0), 0);
        const leaguesWon = allSquads.filter(s => s.rank === 1).length;
        const ranked = allSquads.filter(s => s.rank && s.rank > 0);
        const bestRank = ranked.length > 0 ? ranked.reduce((b, c) => (c.rank! < b.rank! ? c : b)).rank! : null;
        const averageRank = ranked.length > 0
          ? Math.round(ranked.reduce((s, sq) => s + sq.rank!, 0) / ranked.length)
          : null;
        const top10Finishes = ranked.filter(s => s.rank! <= 10).length;

        setStats({ totalCareerPoints, bestRank, leaguesWon, totalLeagues: userLeagues.length, totalSquads: allSquads.length, averageRank, top10Finishes });
        setAchievements(calcAchievements(allSquads, userLeagues, totalCareerPoints));
      } catch (e) {
        console.error('Error loading user profile:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const earnedCount = achievements.filter(a => a.earned).length;
  const ringColor = getAvatarRingColor(stats.bestRank);
  const archetype = getArchetype(stats, stats.top10Finishes);

  const hasDNA = profileUser?.favoriteBatter || profileUser?.favoriteBowler || profileUser?.favoriteFielder || profileUser?.favoriteIPLTeam;

  const dnaItems = [
    { roleLabel: 'BATTING ICON',   value: profileUser?.favoriteBatter,   subtitle: 'Plays like',  accentColor: '#FFD700' },
    { roleLabel: 'BOWLING MUSE',   value: profileUser?.favoriteBowler,   subtitle: 'Bowls like',  accentColor: '#8b5cf6' },
    { roleLabel: 'FIELD IQ',       value: profileUser?.favoriteFielder,  subtitle: 'Inspired by', accentColor: '#10b981' },
    { roleLabel: 'IPL ALLEGIANCE', value: profileUser?.favoriteIPLTeam,  subtitle: 'Bleeds for',  accentColor: colors.orange.primary },
  ].filter(d => d.value);

  const heroStats = [
    {
      value: stats.bestRank ? `#${stats.bestRank}` : '—',
      label: 'Best Rank',
      color: stats.bestRank === 1 ? '#ffd700' : stats.bestRank && stats.bestRank <= 3 ? '#c0c0c0' : colors.blue.electric,
    },
    {
      value: fmtPts(stats.totalCareerPoints),
      label: 'Points',
      color: colors.blue.electric,
    },
    {
      value: stats.averageRank ? `#${stats.averageRank}` : '—',
      label: 'Avg Rank',
      color: alpha(colors.text.primary, 0.85),
    },
    {
      value: stats.leaguesWon > 0 ? stats.leaguesWon : stats.totalLeagues,
      label: stats.leaguesWon > 0 ? 'Wins' : 'Leagues',
      color: stats.leaguesWon > 0 ? '#ffd700' : '#10b981',
    },
  ];

  const cardBase = {
    borderRadius: 4,
    background: `linear-gradient(145deg, ${alpha(colors.blue.navy, 0.9)} 0%, ${alpha('#08131E', 0.98)} 100%)`,
    border: `1px solid ${alpha(colors.border.default, 0.7)}`,
    boxShadow: `0 16px 48px rgba(0,0,0,0.45)`,
    backdropFilter: 'blur(12px)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.background.default }}>
      <AppHeader />

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={48} sx={{ color: colors.blue.electric }} />
        </Box>
      ) : !profileUser ? (
        <Container maxWidth="sm" sx={{ py: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">Profile not found.</Typography>
          <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>Go Back</Button>
        </Container>
      ) : (
        <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4 }, px: { xs: 2, sm: 3 }, pb: { xs: '88px', md: 4 } }}>

          <Button
            startIcon={<ArrowBack sx={{ fontSize: '1rem' }} />}
            onClick={() => navigate(-1)}
            sx={{ mb: 3, color: alpha(colors.text.primary, 0.45), fontWeight: 500, fontSize: '0.875rem', '&:hover': { color: colors.text.primary, bgcolor: alpha(colors.blue.electric, 0.08) } }}
          >
            Back
          </Button>

          {/* ── Hero card ─────────────────────────────────────────────── */}
          <Card sx={{
            ...cardBase,
            mb: 2.5,
            '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent 0%, ${alpha(ringColor, 0.8)} 50%, transparent 100%)` },
          }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>

              {/* Identity row */}
              <Box display="flex" alignItems="flex-start" gap={{ xs: 2, sm: 3 }}>
                {/* Avatar with rank ring */}
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar
                    src={profileUser.profilePicUrl}
                    slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
                    sx={{
                      width: { xs: 72, sm: 88 },
                      height: { xs: 72, sm: 88 },
                      background: `linear-gradient(135deg, ${colors.blue.deep}, ${colors.blue.electric})`,
                      fontSize: { xs: '1.75rem', sm: '2.2rem' },
                      fontWeight: 800,
                      border: `3px solid ${ringColor}`,
                      boxShadow: `0 0 0 2px ${alpha(ringColor, 0.25)}, 0 0 24px ${alpha(ringColor, 0.35)}`,
                    }}
                  >
                    {profileUser.displayName?.charAt(0)?.toUpperCase() || '?'}
                  </Avatar>
                  {/* Rank 1 crown */}
                  {stats.bestRank === 1 && (
                    <Box sx={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', fontSize: '1.1rem', lineHeight: 1 }}>
                      👑
                    </Box>
                  )}
                </Box>

                {/* Name + archetype */}
                <Box flex={1} minWidth={0}>
                  <Typography variant="h5" fontWeight={800} sx={{
                    fontFamily: '"Montserrat", sans-serif',
                    letterSpacing: '-0.02em',
                    color: colors.text.primary,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    mb: 0.3,
                    fontSize: { xs: '1.3rem', sm: '1.6rem' },
                  }}>
                    {profileUser.displayName || 'Player'}
                  </Typography>

                  {/* Archetype */}
                  <Box sx={{ mb: 0.75 }}>
                    <Typography sx={{
                      display: 'inline-block',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: archetype.color,
                      lineHeight: 1,
                    }}>
                      {archetype.label}
                    </Typography>
                    <Typography sx={{ fontSize: '0.65rem', color: alpha(colors.text.secondary, 0.45), mt: 0.3, lineHeight: 1.3 }}>
                      {archetype.tagline}
                    </Typography>
                  </Box>

                  {memberSince && (
                    <Typography sx={{ fontSize: '0.62rem', color: alpha(colors.text.secondary, 0.35), letterSpacing: '0.04em' }}>
                      Member since {memberSince}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Stats row */}
              <Box sx={{ mt: 3, pt: 2.5, borderTop: `1px solid ${alpha(colors.border.default, 0.45)}` }}>
                <Box display="flex">
                  {heroStats.map(({ value, label, color }, i) => (
                    <React.Fragment key={label}>
                      {i > 0 && <Box sx={{ width: '1px', bgcolor: alpha(colors.border.default, 0.45), flexShrink: 0 }} />}
                      <Box sx={{ flex: 1, textAlign: 'center', py: 0.25 }}>
                        <Typography sx={{
                          fontSize: 'clamp(1.1rem, 3.5vw, 1.7rem)',
                          fontWeight: 800,
                          color,
                          lineHeight: 1,
                          mb: 0.4,
                          fontVariantNumeric: 'tabular-nums',
                          fontFamily: '"Montserrat", sans-serif',
                        }}>
                          {value}
                        </Typography>
                        <Typography sx={{ fontSize: '0.55rem', color: alpha(colors.text.secondary, 0.4), letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
                          {label}
                        </Typography>
                      </Box>
                    </React.Fragment>
                  ))}
                </Box>
              </Box>

            </CardContent>
          </Card>

          {/* ── Main grid ─────────────────────────────────────────────── */}
          <Grid container spacing={2.5}>

            {/* Cricket DNA */}
            {hasDNA && (
              <Grid size={{ xs: 12, md: 5 }}>
                <Card sx={{
                  ...cardBase,
                  height: '100%',
                  '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent 0%, ${alpha('#f59e0b', 0.7)} 50%, transparent 100%)` },
                }}>
                  <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                    <Box mb={2.5}>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: alpha('#f59e0b', 0.7) }}>
                        Cricket DNA
                      </Typography>
                      <Typography sx={{ fontSize: '0.6rem', color: alpha(colors.text.secondary, 0.35), mt: 0.25 }}>
                        Player identity & allegiances
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {dnaItems.map(({ roleLabel, value, subtitle, accentColor }) => (
                        <Box key={roleLabel} sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5,
                          p: '10px 14px', borderRadius: 2,
                          background: alpha(accentColor, 0.05),
                          border: `1px solid ${alpha(accentColor, 0.15)}`,
                        }}>
                          <Box sx={{ width: 3, height: 32, borderRadius: 99, bgcolor: accentColor, flexShrink: 0, opacity: 0.7 }} />
                          <Box minWidth={0}>
                            <Typography sx={{ fontSize: '0.52rem', color: alpha(colors.text.secondary, 0.35), letterSpacing: '0.1em', textTransform: 'uppercase', mb: 0.15 }}>
                              {subtitle}
                            </Typography>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: colors.text.primary, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {value}
                            </Typography>
                            <Typography sx={{ fontSize: '0.52rem', fontWeight: 700, color: accentColor, letterSpacing: '0.08em', textTransform: 'uppercase', mt: 0.1 }}>
                              {roleLabel}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Achievements */}
            <Grid size={{ xs: 12, md: hasDNA ? 7 : 12 }}>
              <Card sx={{
                ...cardBase,
                height: '100%',
                '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent 0%, ${alpha(colors.blue.electric, 0.7)} 50%, transparent 100%)` },
              }}>
                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>

                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: alpha(colors.blue.electric, 0.7) }}>
                        Achievements
                      </Typography>
                      <Typography sx={{ fontSize: '0.6rem', color: alpha(colors.text.secondary, 0.35), mt: 0.25 }}>
                        {earnedCount} of {achievements.length} unlocked
                      </Typography>
                    </Box>
                    <EmojiEvents sx={{ color: alpha('#f59e0b', 0.5), fontSize: '1.4rem' }} />
                  </Box>

                  {/* Progress bar */}
                  <Box sx={{ mb: 2.5, height: 4, borderRadius: 3, bgcolor: alpha(colors.blue.electric, 0.08), overflow: 'hidden' }}>
                    <Box sx={{
                      height: '100%',
                      width: achievements.length > 0 ? `${(earnedCount / achievements.length) * 100}%` : '0%',
                      background: `linear-gradient(90deg, #f59e0b, ${colors.blue.electric})`,
                      borderRadius: 3,
                      transition: 'width 0.8s ease',
                    }} />
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
                    {achievements.map(a => <BadgeCard key={a.id} achievement={a} />)}
                  </Box>

                </CardContent>
              </Card>
            </Grid>

          </Grid>

          {/* ── Secondary stats ───────────────────────────────────────── */}
          <Card sx={{ ...cardBase, mt: 2.5 }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Box display="flex" alignItems="stretch">
                {[
                  { value: stats.totalSquads,    label: 'Squads'    },
                  { value: stats.top10Finishes,  label: 'Top 10s'  },
                  { value: stats.totalLeagues,   label: 'Leagues'   },
                ].map(({ value, label }, i) => (
                  <React.Fragment key={label}>
                    {i > 0 && <Box sx={{ width: '1px', bgcolor: alpha(colors.border.default, 0.4), flexShrink: 0 }} />}
                    <Box sx={{ flex: 1, textAlign: 'center', py: 0.75 }}>
                      <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: colors.text.primary, lineHeight: 1, mb: 0.35, fontFamily: '"Montserrat", sans-serif' }}>
                        {value}
                      </Typography>
                      <Typography sx={{ fontSize: '0.55rem', color: alpha(colors.text.secondary, 0.35), letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
                        {label}
                      </Typography>
                    </Box>
                  </React.Fragment>
                ))}
              </Box>
            </CardContent>
          </Card>

        </Container>
      )}
    </Box>
  );
};

export default UserProfilePage;
