import React from 'react';
import { LiveThreatScanner } from './LiveThreatScanner';

export const AuthorizedScanner = ({ onInvestigateDevice, onScanComplete }) => {
  return (
    <LiveThreatScanner
      onInvestigateDevice={onInvestigateDevice}
      onScanComplete={onScanComplete}
    />
  );
};
