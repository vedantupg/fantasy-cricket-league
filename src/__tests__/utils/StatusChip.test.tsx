import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusChip from '../../components/common/StatusChip';

describe('StatusChip', () => {
  const cases: Array<[string, string]> = [
    ['submitted', 'SUBMITTED'],
    ['draft', 'DRAFT'],
    ['locked', 'LOCKED'],
    ['active', 'ACTIVE'],
    ['upcoming', 'UPCOMING'],
    ['completed', 'COMPLETED'],
  ];

  it.each(cases)('renders %s status with label %s', (status, label) => {
    render(<StatusChip status={status as any} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
