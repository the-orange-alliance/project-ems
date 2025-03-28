import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

interface Props {
  title: string;
  onClick?: () => void;
  href?: string;
  className?: string;
}

export const ViewReturn = ({ title, onClick, href, className }: Props) => {
  const buttonContent = (
    <Button
      type='link'
      className={className}
      icon={<ArrowLeftOutlined />}
      style={{ padding: 0 }}
      size='large'
      onClick={onClick}
    >
      {title}
    </Button>
  );

  return href ? <Link to={href}>{buttonContent}</Link> : buttonContent;
};
