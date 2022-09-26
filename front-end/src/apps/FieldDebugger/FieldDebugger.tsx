import { FieldControlPacket } from '@toa-lib/models';
import { FC, useEffect, useState } from 'react';
import { useSocket } from 'src/api/SocketProvider';
import PaperLayout from 'src/layouts/PaperLayout';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';

const FieldDebugger: FC = () => {
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

  return (
    <PaperLayout containerWidth='xl'>
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
