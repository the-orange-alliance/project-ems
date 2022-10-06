import { ReactNode } from 'react';
import Reports from './Reports';

export interface ReportProps {
  onGenerate: (c: ReactNode) => void;
}

export default Reports;
