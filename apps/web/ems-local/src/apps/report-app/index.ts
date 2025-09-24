import { ReactNode } from 'react';
import { Reports } from './reports-app.js';

export interface ReportProps {
  eventKey: string | null | undefined;
  tournamentKey?: string | null | undefined;
  onGenerate: (c: ReactNode) => void;
}

export { Reports };
