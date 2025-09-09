interface AllianceBoxProps {
  children: React.ReactNode;
  allianceColor: 'red' | 'blue';
  borderColor?: string;
}

const AllianceBox: React.FC<AllianceBoxProps> = ({
  children,
  allianceColor,
  borderColor
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        backgroundColor: `${allianceColor === 'red' ? '#f87171' : '#60a5fa'}ca`,
        padding: '0.5rem 1rem',
        borderRadius: '0.75rem',
        border: borderColor ? `5px solid ${borderColor}` : undefined,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}
    >
      {children}
    </div>
  );
};

export default AllianceBox;
