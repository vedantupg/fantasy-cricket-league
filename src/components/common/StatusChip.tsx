import React from 'react';
import { Chip } from '@mui/material';

type StatusType = 'submitted' | 'draft' | 'locked' | 'active' | 'upcoming' | 'completed';

interface StatusChipProps {
  status: StatusType;
}

const STATUS_CONFIG: Record<StatusType, { label: string; bgcolor: string; color: string; borderColor: string }> = {
  submitted: {
    label: 'SUBMITTED',
    bgcolor: 'rgba(46,125,50,0.12)',
    color: '#4CAF50',
    borderColor: 'rgba(76,175,80,0.35)',
  },
  draft: {
    label: 'DRAFT',
    bgcolor: 'rgba(237,108,2,0.12)',
    color: '#FF9800',
    borderColor: 'rgba(255,152,0,0.35)',
  },
  locked: {
    label: 'LOCKED',
    bgcolor: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.6)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  active: {
    label: 'ACTIVE',
    bgcolor: 'rgba(33,150,243,0.12)',
    color: '#2196F3',
    borderColor: 'rgba(33,150,243,0.35)',
  },
  upcoming: {
    label: 'UPCOMING',
    bgcolor: 'rgba(156,39,176,0.12)',
    color: '#9C27B0',
    borderColor: 'rgba(156,39,176,0.35)',
  },
  completed: {
    label: 'COMPLETED',
    bgcolor: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.5)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
};

/**
 * Enterprise-style status chip with consistent visual language across the app.
 */
const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  return (
    <Chip
      label={config.label}
      size="small"
      sx={{
        bgcolor: config.bgcolor,
        color: config.color,
        border: `1px solid ${config.borderColor}`,
        borderRadius: '4px',
        fontWeight: 600,
        fontSize: '0.6875rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        height: 22,
      }}
    />
  );
};

export default StatusChip;
