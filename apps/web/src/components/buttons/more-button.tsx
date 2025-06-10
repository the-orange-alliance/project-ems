import { Button, Dropdown, MenuProps } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import { FC } from 'react';

interface Props {
  menuItems: MenuProps['items'];
}

export const MoreButton: FC<Props> = ({ menuItems }) => {
  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['click']}
      placement='bottomRight'
    >
      <Button
        variant='text'
        size='large'
        shape='circle'
        icon={<MoreOutlined />}
        // style={{ border: 'none' }}
      />
    </Dropdown>
  );
};
