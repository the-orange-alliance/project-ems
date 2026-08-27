import { FC, useState } from 'react';
import { Button, Modal, Tooltip, Typography } from 'antd';
import { DriverstationStatus } from '@toa-lib/models';
import {
  CheckCircleOutlined,
  MinusCircleOutlined,
  WifiOutlined,
  DisconnectOutlined
} from '@ant-design/icons';

interface IProps {
  ds: DriverstationStatus;
}

export const TeamRow: FC<IProps> = ({ ds }: IProps) => {
  const [dataOpen, setDataOpen] = useState<boolean>(false);

  const friendlyStation =
    ds.allianceStation < 20
      ? `R${ds.allianceStation - 10}`
      : `B${ds.allianceStation - 20}`;
  const dsTextSplit = ds.robotStatus.versionData.ds.split('>');
  const rioTextSplit = ds.robotStatus.versionData.rio.split('>');
  const dsText = dsTextSplit.length > 1 ? dsTextSplit[1] : ``;
  const rioText = rioTextSplit.length > 1 ? rioTextSplit[1].substring(12) : ``;

  return (
    <div
      style={{
        backgroundColor: ds.robotStatus.brownout
          ? 'brown'
          : ds.allianceStation < 20
          ? '#ff6666'
          : '#6666ff',
        paddingBottom: 8
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          fontSize: '20px',
          alignItems: 'center'
        }}
        onClick={() => setDataOpen(true)}
      >
        {/* Station */}
        <div style={{ fontSize: '40px' }}>{friendlyStation}</div>

        {/* Team Number */}
        <div style={{ fontSize: '30px' }}>{ds.teamKey}</div>

        {/* Driverstation */}
        <div>
          <Status
            status={ds.dsStatus.linked}
            optionalText={dsText}
            textSize='15px'
            title={ds.dsStatus.lastLog.split('<message>')[1]}
          />
        </div>

        {/* Bandwidth Usage */}
        <div>{ds.robotStatus.bandwidth}</div>

        {/* Radio */}
        <div>
          <Status status={ds.apStatus.linked} />
        </div>

        {/* Rio */}
        <div style={{ alignContent: 'center' }}>
          <Status
            status={ds.robotStatus.rioPing && ds.robotStatus.commsActive}
            optionalText={rioText}
            textSize={'10px'}
          />
        </div>

        {/* Battery */}
        <div>{ds.robotStatus.batteryVoltage.toFixed(2)}</div>

        {/* Status */}
        <div style={{ alignContent: 'center' }}>
          <Status
            status={ds.robotStatus.enabled}
            optionalText={ds.robotStatus.mode === 0 ? 'T' : 'A'}
            estop={ds.robotStatus.estop}
          />
        </div>

        {/* Trip Time */}
        <div>{ds.robotStatus.tripTimeMs}</div>

        {/* Missed Packets */}
        <div>
          {ds.dsStatus.missedPacketCount - ds.dsStatus.missedPacketOffset}
        </div>

        {/* Radio Quality */}
        <div>
          {ds.apStatus.quality[0]}/{ds.apStatus.quality[1]}
        </div>

        {/* Radio Signal */}
        <div>
          <WifiQuality signal={ds.apStatus.signal} />
        </div>
      </div>

      <DataPopup open={dataOpen} ds={ds} onClose={() => setDataOpen(false)} />
    </div>
  );
};

const Status = ({
  status,
  optionalText,
  estop,
  textSize,
  title
}: {
  status: boolean;
  optionalText?: string;
  estop?: boolean;
  textSize?: string;
  title?: string;
}) => {
  if (estop)
    return (
      <div
        style={{
          textAlign: 'center',
          background: '#000000',
          height: '52px',
          transform: 'rotate(45deg)',
          marginTop: '10px',
          width: '52px',
          border: '3px solid white',
          margin: '10px auto 0'
        }}
      >
        <Typography.Text
          style={{
            color: '#FFFFFF',
            display: 'table-cell',
            height: '55px',
            transform: 'rotate(-45deg)',
            verticalAlign: 'middle',
            width: '55px',
            fontSize: '35px'
          }}
        >
          E
        </Typography.Text>
      </div>
    );

  // Otherwise show normal status
  return (
    <Tooltip title={title}>
      <div
        style={{
          backgroundColor: status ? 'green' : 'red',
          width: '75px',
          height: '75px',
          borderRadius: status ? '50px' : undefined,
          border: '3px solid black',
          fontSize: textSize ?? '50px',
          textAlign: 'center',
          margin: '0 auto',
          wordBreak: 'break-all',
          alignItems: 'center',
          justifyContent: 'center',
          display: 'flex'
        }}
      >
        {optionalText}
      </div>
    </Tooltip>
  );
};

const WifiQuality = ({ signal }: { signal: string }) => {
  const GetIcon = () => {
    // If unknown, show no data
    if (signal.indexOf('unknown') > -1)
      return <DisconnectOutlined style={{ fontSize: '50px' }} />;

    // Parse quality
    const s = parseInt(signal.substring(0, signal.length - 4));
    const opacity =
      s <= -90 ? 0.2 : s <= -80 ? 0.4 : s <= -70 ? 0.6 : s <= -60 ? 0.8 : 1;

    return <WifiOutlined style={{ fontSize: '50px', opacity }} />;
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <GetIcon />
      <Typography.Text>{signal}</Typography.Text>
    </div>
  );
};

const DataPopup = ({
  ds,
  open,
  onClose
}: {
  ds: DriverstationStatus;
  open: boolean;
  onClose: () => void;
}) => {
  const BooleanIndicator = ({ bool }: { bool: boolean }) =>
    bool ? <CheckCircleOutlined /> : <MinusCircleOutlined />;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width='90%'
      title={`${ds.teamKey} Status`}
      footer={[
        <Button key='close' type='primary' onClick={onClose}>
          Close
        </Button>
      ]}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {/* Robot Indicators */}
        <div>
          <Typography.Title
            level={5}
            style={{ textDecoration: 'underline' }}
          >
            Robot
          </Typography.Title>
          <Typography.Paragraph>
            <b>Connected:</b>{' '}
            <BooleanIndicator bool={ds.robotStatus.rioPing} />
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Comms Active: </b>{' '}
            <BooleanIndicator bool={ds.robotStatus.commsActive} />
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Rio Version:</b> {ds.robotStatus.versionData.rio.split('>')[1]}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Brownout:</b>{' '}
            <BooleanIndicator bool={ds.robotStatus.brownout} />
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Robot EStopped: </b>{' '}
            <BooleanIndicator bool={ds.robotStatus.estop} />
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Trip Time: </b> {ds.robotStatus.tripTimeMs}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>DS Disable/Robot Disable:</b>
            <BooleanIndicator bool={ds.robotStatus.additionalData.dsDisable} />
            <BooleanIndicator
              bool={ds.robotStatus.additionalData.robotDisable}
            />
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>DS Teleop/Robot Auto:</b>
            <BooleanIndicator bool={ds.robotStatus.additionalData.dsAuto} />
            <BooleanIndicator bool={ds.robotStatus.additionalData.dsAuto} />
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>DS Teleop/Robot Teleop:</b>
            <BooleanIndicator bool={ds.robotStatus.additionalData.dsTele} />
            <BooleanIndicator bool={ds.robotStatus.additionalData.robotTele} />
          </Typography.Paragraph>
        </div>

        {/* FMS Commands / AP Statuses */}
        <div>
          {/* FMS Commands */}
          <Typography.Title
            level={5}
            style={{ textDecoration: 'underline' }}
          >
            FMS Commands
          </Typography.Title>
          <Typography.Paragraph>
            <b>Bypassed:</b> <BooleanIndicator bool={ds.fmsStatus.bypassed} />
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>FMS Commanding Auto:</b>{' '}
            <BooleanIndicator bool={ds.fmsStatus.auto} />
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>FMS Commanding Enable:</b>{' '}
            <BooleanIndicator bool={ds.fmsStatus.enabled} />
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>FMS Commanding EStop:</b>{' '}
            <BooleanIndicator bool={ds.fmsStatus.estop} />
          </Typography.Paragraph>

          {/* AP Statuses */}
          <Typography.Title
            level={5}
            style={{ textDecoration: 'underline', marginTop: 8 }}
          >
            AP Statuses
          </Typography.Title>
          <Typography.Paragraph>
            <b>Linked: </b> <BooleanIndicator bool={ds.apStatus.linked} />
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Quality: </b> {ds.apStatus.quality[0]}/{ds.apStatus.quality[1]}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>Signal: </b> {ds.apStatus.signal}
          </Typography.Paragraph>
        </div>
      </div>

      {/* Driverstation Indicators */}
      <Typography.Title level={5} style={{ textDecoration: 'underline', marginTop: 16 }}>
        Driverstation
      </Typography.Title>
      <Typography.Paragraph>
        <b>Connected:</b> <BooleanIndicator bool={ds.dsStatus.linked} />
      </Typography.Paragraph>
      <Typography.Paragraph>
        <b>Version:</b> {ds.robotStatus.versionData.ds.split('>')[1]}
      </Typography.Paragraph>
      <Typography.Paragraph>
        <b>PC CPU Utilization:</b> {ds.dsStatus.computerCpuPercent}%
      </Typography.Paragraph>
      <Typography.Paragraph>
        <b>PC Battery:</b> {ds.dsStatus.computerBatteryPercent}%
      </Typography.Paragraph>
      <Typography.Paragraph>
        <b>IP Address:</b> {ds.dsStatus.ipAddress}
      </Typography.Paragraph>
      <Typography.Paragraph>
        <b>Missed Packet Count:</b> {ds.dsStatus.missedPacketCount}
      </Typography.Paragraph>
      <Typography.Paragraph>
        <b>Last Log:</b>
      </Typography.Paragraph>
      <Typography.Paragraph>
        {ds.dsStatus.lastLog.split('<message>')[1]}
      </Typography.Paragraph>
    </Modal>
  );
};
