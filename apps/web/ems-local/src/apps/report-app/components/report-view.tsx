import { FC, ReactNode, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button, Space } from 'antd';
import { ViewReturn } from 'src/components/buttons/view-return.js';

interface Props {
  onReturn: () => void;
  children?: ReactNode;
}

export const ReportView: FC<Props> = ({ onReturn, children }) => {
  const reportRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    bodyClass: 'print-base'
  });

  return (
    <Space direction='vertical' size='large' style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <ViewReturn title='Reports' onClick={onReturn} />
        <Button type='primary' onClick={() => handlePrint()}>
          Print Report
        </Button>
      </div>
      <div ref={reportRef}>{children}</div>
    </Space>
  );
};
