/**
 * League Assistant - AI-powered chat widget
 * Provides intelligent assistance for fantasy cricket decisions
 */

import React, { useState, useEffect, useRef } from 'react';
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
  SmartToy,
  Close,
  Send,
  AutoAwesome,
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
  getSmartSuggestion,
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

  // Load context when dialog opens
  useEffect(() => {
    if (open && !context && user && leagueId) {
      loadContext();
    }
  }, [open, user, leagueId]);

  const loadContext = async () => {
    if (!user || !leagueId) return;

    setContextLoading(true);
    setError(null);

    try {
      // Fetch all necessary data
      const [userSquad, league, allSquadsData, playerPool] = await Promise.all([
        squadService.getByUserId(user.uid),
        leagueService.getById(leagueId),
        squadService.getByLeagueId(leagueId),
        playerPoolService.getByLeagueId(leagueId),
      ]);

      if (!userSquad) {
        throw new Error("You haven't created a squad yet");
      }

      if (!playerPool) {
        throw new Error('Player pool not found');
      }

      // Build context
      const leagueContext = buildLeagueContext(
        userSquad,
        allSquadsData,
        playerPool.players,
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
  };

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
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          '&:hover': {
            background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
            transform: 'scale(1.05)',
          },
          transition: 'all 0.3s ease',
          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
        }}
      >
        <SmartToy />
      </Fab>

      {/* Chat Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: { xs: '100%', sm: '80vh' },
            maxHeight: { xs: '100%', sm: '80vh' },
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome />
            <Typography variant="h6" fontWeight="bold">
              League Assistant
            </Typography>
            <Chip
              label="AI"
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
                  }}
                >
                  <Paper
                    elevation={2}
                    sx={{
                      p: 2,
                      maxWidth: '80%',
                      bgcolor: msg.role === 'user' ? theme.palette.primary.main : 'white',
                      color: msg.role === 'user' ? 'white' : 'text.primary',
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {msg.content}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 0.5,
                        opacity: 0.7,
                        fontSize: '0.7rem',
                      }}
                    >
                      {msg.timestamp.toLocaleTimeString()}
                    </Typography>
                  </Paper>
                </Box>
              ))}

              {/* Loading indicator */}
              {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 2,
                      bgcolor: 'white',
                      borderRadius: 2,
                    }}
                  >
                    <CircularProgress size={20} />
                    <Typography variant="body2" sx={{ ml: 2, display: 'inline' }}>
                      Thinking...
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
                        '&:hover': {
                          bgcolor: theme.palette.primary.light,
                          color: 'white',
                        },
                      }}
                    />
                  ))}
                </Stack>
              </Collapse>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
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
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'white',
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
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
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
