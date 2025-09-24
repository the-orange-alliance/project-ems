import { useMemo, forwardRef, ReactNode } from 'react';
import {
  Link as RouterLink,
  LinkProps as RouterLinkProps
} from 'react-router-dom';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

interface ListItemLinkProps {
  icon?: ReactNode;
  onClick?: () => void;
  primary: string;
  to: string;
}

export function ListItemLink({
  icon,
  primary,
  to,
  onClick
}: ListItemLinkProps) {
  const renderLink = useMemo(
    () =>
      forwardRef<HTMLAnchorElement, Omit<RouterLinkProps, 'to'>>(
        function Link(itemProps, ref) {
          return (
            <RouterLink to={to} ref={ref} {...itemProps} role={undefined} />
          );
        }
      ),
    [to]
  );

  return (
    <li>
      <ListItem button onClick={onClick} component={renderLink}>
        {icon ? <ListItemIcon>{icon}</ListItemIcon> : null}
        <ListItemText primary={primary} />
      </ListItem>
    </li>
  );
}
