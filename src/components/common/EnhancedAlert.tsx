import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Typography,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';

export interface EnhancedAlertAction {
  label: string;
  onClick: () => void;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

export interface SquadStatusItem {
  label: string;
  current: number;
  required: number;
  isValid: boolean;
}

export interface EnhancedAlertProps {
  open: boolean;
  onClose: () => void;
  severity: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;

  // Optional contextual information
  squadStatus?: SquadStatusItem[];
  suggestions?: string[];
  actions?: EnhancedAlertAction[];

  // Error code for admin reference (hidden from user for critical bugs)
  errorCode?: string;
  isCriticalError?: boolean;
}

const EnhancedAlert: React.FC<EnhancedAlertProps> = ({
  open,
  onClose,
  severity,
  title,
  message,
  squadStatus,
  suggestions,
  actions,
  errorCode,
  isCriticalError = false
}) => {
  const getIcon = () => {
    switch (severity) {
      case 'error': return <ErrorIcon />;
      case 'warning': return <WarningIcon />;
      case 'info': return <InfoIcon />;
      case 'success': return <CheckCircleIcon />;
    }
  };

  const getEmoji = () => {
    if (isCriticalError) return '⚠️';
    switch (severity) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'success': return '✅';
    }
  };

  return (
    <Collapse in={open}>
      <Alert
        severity={severity}
        onClose={onClose}
        icon={getIcon()}
        sx={{
          mb: 2,
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
        action={
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={onClose}
          >
            <CloseIcon fontSize="inherit" />
          </IconButton>
        }
      >
        <AlertTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <span>{getEmoji()}</span>
          {title}
        </AlertTitle>

        {/* Main message */}
        <Typography variant="body2" sx={{ mb: squadStatus || suggestions ? 2 : 0 }}>
          {message}
        </Typography>

        {/* Squad status breakdown */}
        {squadStatus && squadStatus.length > 0 && (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body2" fontWeight="600" gutterBottom>
              📊 Current Squad:
            </Typography>
            <List dense disablePadding sx={{ pl: 2 }}>
              {squadStatus.map((item, index) => (
                <ListItem key={index} disablePadding sx={{ py: 0.25 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    {item.isValid ? (
                      <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    ) : (
                      <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2">
                        {item.label}: <strong>{item.current}/{item.required}</strong>
                        {!item.isValid && (
                          <span style={{ color: 'inherit', marginLeft: 4 }}>
                            (Need {item.required - item.current} more)
                          </span>
                        )}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Suggestions for fixing */}
        {suggestions && suggestions.length > 0 && (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body2" fontWeight="600" gutterBottom>
              💡 {isCriticalError ? 'What You Can Do:' : 'To Fix:'}
            </Typography>
            <List dense disablePadding sx={{ pl: 2 }}>
              {suggestions.map((suggestion, index) => (
                <ListItem key={index} disablePadding sx={{ py: 0.25 }}>
                  <ListItemText
                    primary={
                      <Typography variant="body2">
                        • {suggestion}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Error code for critical bugs (for admin reference) */}
        {isCriticalError && errorCode && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
              Error Code: {errorCode}
            </Typography>
          </Box>
        )}

        {/* Action buttons */}
        {actions && actions.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'outlined'}
                color={action.color || 'primary'}
                size="small"
                onClick={() => {
                  action.onClick();
                  onClose();
                }}
                sx={{ textTransform: 'none' }}
              >
                {action.label}
              </Button>
            ))}
          </Box>
        )}
      </Alert>
    </Collapse>
  );
};

export default EnhancedAlert;
