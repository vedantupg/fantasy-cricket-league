/**
 * League Assistant - AI-powered chat widget
 * Provides intelligent assistance for fantasy cricket decisions
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Fab,
  IconButton,
  Chip,
  Stack,
  alpha,
  Collapse,
  Alert,
} from '@mui/material';
import {
  Close,
  Send,
  Lightbulb,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';
import { squadService, leagueService, playerPoolService } from '../services/firestore';
import {
  queryAI,
  buildLeagueContext,
  SUGGESTED_QUESTIONS,
  type Message,
  type LeagueContext,
} from '../services/aiService';

interface LeagueAssistantProps {
  leagueId?: string;
}

const LeagueAssistant: React.FC<LeagueAssistantProps> = ({ leagueId }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<LeagueContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadContext = useCallback(async () => {
    if (!user || !leagueId) return;

    setContextLoading(true);
    setError(null);

    try {
      // Fetch all necessary data
      const [userSquad, league, allSquadsData] = await Promise.all([
        squadService.getByUserAndLeague(user.uid, leagueId),
        leagueService.getById(leagueId),
        squadService.getByLeague(leagueId),
      ]);

      if (!userSquad) {
        throw new Error("You haven't created a squad yet");
      }

      if (!league) {
        throw new Error('League not found');
      }

      // Get player pool from league's poolId
      const playerPool = league.playerPoolId
        ? await playerPoolService.getById(league.playerPoolId)
        : null;

      if (!playerPool) {
        throw new Error('Player pool not found');
      }

      const leagueContext = buildLeagueContext(
        userSquad,
        allSquadsData,
        playerPool.players || [],
        league
      );

      setContext(leagueContext);

      // Add welcome message
      if (messages.length === 0) {
        setMessages([
          {
            role: 'assistant',
            content: `👋 Hi ${leagueContext.userSquad.userName}! I'm your AI league assistant.

🎯 You're ranked #${leagueContext.userSquad.rank} with ${leagueContext.userSquad.totalPoints} points.

I can help you with:
• Captain and transfer recommendations
• Squad performance analysis
• Player comparisons
• Strategy suggestions

What would you like to know?`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err: any) {
      console.error('Failed to load context:', err);
      setError(err.message || 'Failed to load your league data');
    } finally {
      setContextLoading(false);
    }
  }, [user, leagueId, messages.length]);

  // Load context when dialog opens
  useEffect(() => {
    if (open && !context && user && leagueId) {
      loadContext();
    }
  }, [open, context, user, leagueId, loadContext]);

  const handleSendMessage = async (questionText?: string) => {
    const question = questionText || input.trim();
    if (!question || loading || !context) return;

    setInput('');
    setShowSuggestions(false);
    setError(null);

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Get AI response
    setLoading(true);
    try {
      const response = await queryAI(question, context, messages);

      // Add AI message
      const aiMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('AI Error:', err);
      setError(err.message || 'Failed to get response. Please try again.');

      // Add error message
      const errorMessage: Message = {
        role: 'assistant',
        content: "I'm sorry, I couldn't process your question. Please try again or rephrase your question.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setShowSuggestions(true);
    loadContext();
  };

  if (!user || !leagueId) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="AI Assistant"
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          bottom: { xs: 16, sm: 24 },
          right: { xs: 16, sm: 24 },
          width: { xs: 56, sm: 64 },
          height: { xs: 56, sm: 64 },
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          '&:hover': {
            background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
            transform: 'scale(1.1) rotate(5deg)',
          },
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.5)}`,
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          '@keyframes pulse': {
            '0%, 100%': {
              boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.5)}`,
            },
            '50%': {
              boxShadow: `0 8px 40px ${alpha(theme.palette.primary.main, 0.7)}`,
            },
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.3)}, ${alpha(theme.palette.secondary.light, 0.3)})`,
            animation: 'ripple 1.5s ease-out infinite',
          },
          '@keyframes ripple': {
            '0%': {
              transform: 'scale(1)',
              opacity: 1,
            },
            '100%': {
              transform: 'scale(1.5)',
              opacity: 0,
            },
          },
        }}
      >
        <Box
          component="img"
          src="/images/gemini-logo.svg"
          alt="Gemini"
          sx={{
            width: { xs: 32, sm: 36 },
            height: { xs: 32, sm: 36 },
            filter: 'brightness(0) invert(1)', // Make it white
          }}
        />
      </Fab>

      {/* Chat Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        TransitionProps={{
          style: {
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          },
        }}
        PaperProps={{
          sx: {
            height: { xs: '100%', sm: '70vh' },
            maxHeight: { xs: '100%', sm: '700px' },
            borderRadius: { xs: 0, sm: 3 },
            overflow: 'hidden',
            backdropFilter: 'blur(10px)',
            boxShadow: `0 20px 60px ${alpha(theme.palette.primary.main, 0.3)}`,
          },
        }}
      >
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              component="img"
              src="/images/gemini-logo.svg"
              alt="Gemini"
              sx={{
                width: 28,
                height: 28,
                filter: 'brightness(0) invert(1)',
              }}
            />
            <Typography variant="h6" fontWeight="bold">
              Gemini
            </Typography>
            <Chip
              label="AI Assistant"
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 'bold',
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={handleReset} sx={{ color: 'white' }} title="Reset conversation">
              <Lightbulb />
            </IconButton>
            <IconButton onClick={() => setOpen(false)} sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent
          sx={{
            p: 2,
            bgcolor: alpha(theme.palette.background.default, 0.5),
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {/* Error Alert */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Context Loading */}
          {contextLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Messages */}
          {!contextLoading && (
            <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {messages.map((msg, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    gap: 1,
                    animation: 'slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    '@keyframes slideIn': {
                      '0%': {
                        opacity: 0,
                        transform: msg.role === 'user' ? 'translateX(20px)' : 'translateX(-20px)',
                      },
                      '100%': {
                        opacity: 1,
                        transform: 'translateX(0)',
                      },
                    },
                  }}
                >
                  {/* AI Avatar */}
                  {msg.role === 'assistant' && (
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        flexShrink: 0,
                        mt: 0.5,
                      }}
                    >
                      <Box
                        component="img"
                        src="/images/gemini-logo.svg"
                        alt="Gemini"
                        sx={{
                          width: 20,
                          height: 20,
                          filter: 'brightness(0) invert(1)',
                        }}
                      />
                    </Box>
                  )}

                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      maxWidth: '80%',
                      position: 'relative',
                      bgcolor: msg.role === 'user'
                        ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                        : alpha(theme.palette.background.paper, 1),
                      background: msg.role === 'user'
                        ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                        : `linear-gradient(145deg, ${alpha('#ffffff', 1)}, ${alpha('#f5f7fa', 1)})`,
                      color: msg.role === 'user'
                        ? 'white'
                        : theme.palette.grey[900],
                      borderRadius: msg.role === 'user'
                        ? '24px 24px 6px 24px'
                        : '24px 24px 24px 6px',
                      border: msg.role === 'assistant'
                        ? `1px solid ${alpha(theme.palette.primary.main, 0.12)}`
                        : 'none',
                      boxShadow: msg.role === 'user'
                        ? `0 8px 32px ${alpha(theme.palette.primary.main, 0.25)}, 0 2px 8px ${alpha(theme.palette.primary.dark, 0.15)}, inset 0 1px 0 ${alpha('#fff', 0.1)}`
                        : `0 8px 24px ${alpha(theme.palette.primary.main, 0.08)}, 0 2px 8px ${alpha('#000', 0.04)}, inset 0 1px 0 ${alpha('#fff', 0.8)}`,
                      backdropFilter: msg.role === 'assistant' ? 'blur(10px)' : 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: msg.role === 'user'
                          ? `0 12px 40px ${alpha(theme.palette.primary.main, 0.3)}, 0 4px 12px ${alpha(theme.palette.primary.dark, 0.2)}, inset 0 1px 0 ${alpha('#fff', 0.15)}`
                          : `0 12px 32px ${alpha(theme.palette.primary.main, 0.12)}, 0 4px 12px ${alpha('#000', 0.06)}, inset 0 1px 0 ${alpha('#fff', 0.9)}`,
                      },
                      '&::before': msg.role === 'assistant' ? {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 'inherit',
                        padding: '1px',
                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.3)}, ${alpha(theme.palette.secondary.main, 0.2)})`,
                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                        pointerEvents: 'none',
                      } : {},
                    }}
                  >
                    <Box
                      sx={{
                        '& p': {
                          margin: '0 0 0.75em 0',
                          lineHeight: 1.8,
                          fontSize: '1.05rem',
                          fontWeight: msg.role === 'assistant' ? 500 : 400,
                          '&:last-child': { marginBottom: 0 },
                        },
                        '& ul, & ol': {
                          margin: '0.5em 0',
                          paddingLeft: '1.5em',
                          fontSize: '1.05rem',
                        },
                        '& li': {
                          margin: '0.4em 0',
                          lineHeight: 1.7,
                        },
                        '& strong': {
                          fontWeight: 700,
                          color: msg.role === 'user' ? 'white' : theme.palette.primary.main,
                        },
                        '& em': {
                          fontStyle: 'italic',
                          color: msg.role === 'user' ? alpha('#fff', 0.95) : theme.palette.grey[700],
                        },
                        '& code': {
                          backgroundColor: msg.role === 'user'
                            ? alpha('#000', 0.2)
                            : alpha(theme.palette.primary.main, 0.08),
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.95em',
                          fontFamily: 'monospace',
                        },
                        '& h1, & h2, & h3': {
                          margin: '0.8em 0 0.4em 0',
                          fontWeight: 700,
                          fontSize: '1.15rem',
                          color: msg.role === 'user' ? 'white' : theme.palette.primary.main,
                        },
                      }}
                    >
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            lineHeight: 1.8,
                            fontSize: '1.05rem',
                            fontWeight: 400,
                            letterSpacing: '0.01em',
                          }}
                        >
                          {msg.content}
                        </Typography>
                      )}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 1.5,
                        opacity: msg.role === 'user' ? 0.85 : 0.5,
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        letterSpacing: '0.03em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Paper>
                </Box>
              ))}

              {/* Loading indicator */}
              {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 1 }}>
                  {/* AI Avatar */}
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      flexShrink: 0,
                      mt: 0.5,
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                      animation: 'pulse 2s ease-in-out infinite',
                      '@keyframes pulse': {
                        '0%, 100%': {
                          transform: 'scale(1)',
                          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                        },
                        '50%': {
                          transform: 'scale(1.05)',
                          boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                        },
                      },
                    }}
                  >
                    <Box
                      component="img"
                      src="/images/gemini-logo.svg"
                      alt="Gemini"
                      sx={{
                        width: 20,
                        height: 20,
                        filter: 'brightness(0) invert(1)',
                      }}
                    />
                  </Box>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      background: `linear-gradient(145deg, ${alpha('#ffffff', 1)}, ${alpha('#f5f7fa', 1)})`,
                      borderRadius: '24px 24px 24px 6px',
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                      boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.08)}, 0 2px 8px ${alpha('#000', 0.04)}, inset 0 1px 0 ${alpha('#fff', 0.8)}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      position: 'relative',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 'inherit',
                        padding: '1px',
                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.3)}, ${alpha(theme.palette.secondary.main, 0.2)})`,
                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                        pointerEvents: 'none',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 0.6,
                        alignItems: 'center',
                      }}
                    >
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                          boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.4)}`,
                          animation: 'bounce 1.4s ease-in-out infinite',
                          '@keyframes bounce': {
                            '0%, 80%, 100%': { transform: 'translateY(0) scale(1)', opacity: 0.7 },
                            '40%': { transform: 'translateY(-8px) scale(1.1)', opacity: 1 },
                          },
                        }}
                      />
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                          boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.4)}`,
                          animation: 'bounce 1.4s ease-in-out 0.2s infinite',
                          '@keyframes bounce': {
                            '0%, 80%, 100%': { transform: 'translateY(0) scale(1)', opacity: 0.7 },
                            '40%': { transform: 'translateY(-8px) scale(1.1)', opacity: 1 },
                          },
                        }}
                      />
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                          boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.4)}`,
                          animation: 'bounce 1.4s ease-in-out 0.4s infinite',
                          '@keyframes bounce': {
                            '0%, 80%, 100%': { transform: 'translateY(0) scale(1)', opacity: 0.7 },
                            '40%': { transform: 'translateY(-8px) scale(1.1)', opacity: 1 },
                          },
                        }}
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        color: theme.palette.primary.main,
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      Analyzing your squad...
                    </Typography>
                  </Paper>
                </Box>
              )}

              <div ref={messagesEndRef} />
            </Box>
          )}

          {/* Suggested Questions */}
          {showSuggestions && messages.length > 0 && !loading && context && (
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1,
                  cursor: 'pointer',
                }}
                onClick={() => setShowSuggestions(!showSuggestions)}
              >
                <Lightbulb color="primary" fontSize="small" />
                <Typography variant="caption" fontWeight="bold">
                  Suggested Questions
                </Typography>
                {showSuggestions ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              </Box>

              <Collapse in={showSuggestions}>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {SUGGESTED_QUESTIONS.slice(0, 4).map((suggestion, idx) => (
                    <Chip
                      key={idx}
                      label={suggestion}
                      size="small"
                      onClick={() => handleSuggestionClick(suggestion)}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        '&:hover': {
                          bgcolor: theme.palette.primary.main,
                          color: 'white',
                          transform: 'translateY(-2px)',
                          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                        },
                        '&:active': {
                          transform: 'translateY(0)',
                        },
                      }}
                    />
                  ))}
                </Stack>
              </Collapse>
            </Box>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            p: 2.5,
            bgcolor: alpha(theme.palette.background.default, 0.8),
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            backdropFilter: 'blur(10px)',
          }}
        >
          <TextField
            fullWidth
            multiline
            maxRows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your league..."
            disabled={loading || contextLoading || !context}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'white',
                borderRadius: 3,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
                },
                '&.Mui-focused': {
                  boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.25)}`,
                },
              },
              '& .MuiOutlinedInput-input': {
                fontSize: '0.95rem',
                color: theme.palette.grey[900],
                '&::placeholder': {
                  color: theme.palette.grey[500],
                  opacity: 1,
                },
              },
              '& textarea': {
                color: theme.palette.grey[900],
              },
            }}
          />
          <Button
            variant="contained"
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || loading || contextLoading || !context}
            endIcon={<Send />}
            sx={{
              minWidth: 100,
              height: 48,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                transform: 'translateY(-2px)',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              fontWeight: 600,
            }}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LeagueAssistant;
