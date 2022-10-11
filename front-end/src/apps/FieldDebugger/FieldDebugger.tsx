import {
  FieldControlPacket,
  LED_IDLE,
  MOTOR_DISABLE,
  MOTOR_FORWARD,
  MOTOR_REVERSE
} from '@toa-lib/models';
import { FC, useEffect, useState } from 'react';
import { useSocket } from 'src/api/SocketProvider';
import PaperLayout from 'src/layouts/PaperLayout';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { useRecoilValue } from 'recoil';
import {
  fieldMotorDuration,
  fieldMotorReverseDuration
} from 'src/stores/Recoil';

const FieldDebugger: FC = () => {
  const forwardDuration = useRecoilValue(fieldMotorDuration);
  const reverseDuration = useRecoilValue(fieldMotorReverseDuration);

  const [packets, setPackets] = useState<FieldControlPacket[]>([]);

  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on('fcs:update', updatePackets);
    }
  }, [socket]);

  useEffect(() => {
    return () => {
      socket?.removeListener('fcs:update', updatePackets);
    };
  }, []);

  const updatePackets = (packet: FieldControlPacket) =>
    setPackets((prev) => [...prev, packet]);

  const sendTestPacket = () => socket?.emit('fcs:update', LED_IDLE);
  const sendMotorPacket = () => {
    socket?.emit('fcs:update', MOTOR_FORWARD);
    setTimeout(() => {
      socket?.emit('fcs:update', MOTOR_DISABLE);
    }, forwardDuration);
  };

  const sendRevMotorPacket = () => {
    socket?.emit('fcs:update', MOTOR_REVERSE);
    setTimeout(() => {
      socket?.emit('fcs:update', MOTOR_DISABLE);
    }, reverseDuration);
  };

  return (
    <PaperLayout containerWidth='xl'>
      <Button variant='contained' onClick={sendTestPacket}>
        Send Test Packet
      </Button>
      <Button variant='contained' onClick={sendMotorPacket}>
        Send Motor Packet
      </Button>
      <Button variant='contained' onClick={sendRevMotorPacket}>
        Send Reverse Motor Packet
      </Button>
      <Box sx={{ padding: (theme) => theme.spacing(2) }}>
        {packets.map((p, i) => (
          <div key={`packet-${i}`}>
            <p>{JSON.stringify(p)}</p>
            <Divider />
          </div>
        ))}
      </Box>
    </PaperLayout>
  );
};

export default FieldDebugger;
