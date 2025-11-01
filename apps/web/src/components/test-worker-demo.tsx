import { FC, useState } from 'react';
import { Button, Space, Typography, Card } from 'antd';
import { useTestWorker } from '../api/use-test-worker.js';

export const TestWorkerDemo: FC = () => {
  const { service, isReady } = useTestWorker();
  const [counter, setCounter] = useState(0);

  const handleIncrement = async () => {
    if (service) {
      try {
        await service.inc();
        // Get the updated counter value
        const newCounter = await service.getCounter();
        setCounter(newCounter);
        console.log('Counter incremented to:', newCounter);
      } catch (error) {
        console.error('Failed to increment counter:', error);
      }
    }
  };

  const handleGetCounter = async () => {
    if (service) {
      try {
        const currentCounter = await service.getCounter();
        setCounter(currentCounter);
        console.log('Current counter:', currentCounter);
      } catch (error) {
        console.error('Failed to get counter:', error);
      }
    }
  };

  return (
    <Card
      title='Test Worker Demo'
      style={{ maxWidth: 400, margin: '20px auto' }}
    >
      <Space direction='vertical' style={{ width: '100%' }}>
        <Typography.Text>
          Worker Status: {isReady ? '✅ Ready' : '⏳ Loading...'}
        </Typography.Text>

        <Typography.Text>
          Counter Value: <strong>{counter}</strong>
        </Typography.Text>

        <Space>
          <Button
            type='primary'
            onClick={handleIncrement}
            disabled={!isReady || !service}
          >
            Increment Counter
          </Button>

          <Button onClick={handleGetCounter} disabled={!isReady || !service}>
            Get Counter
          </Button>
        </Space>

        <Typography.Text type='secondary' style={{ fontSize: '12px' }}>
          Open DevTools Console to see logs
        </Typography.Text>
      </Space>
    </Card>
  );
};
