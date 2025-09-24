import { FC, useEffect, useState } from 'react';
import { Typography } from '@mui/material';
import { PaperLayout } from '@layouts/paper-layout.js';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField
} from '@mui/material';
import {
  requestAllClientsIdentification,
  requestClientIdentification,
  requestClientRefresh,
  sendUpdateSocketClient
} from 'src/api/use-socket.js';
import {
  Cached,
  ChevronLeft,
  Delete,
  Refresh,
  RemoveRedEye,
  Visibility
} from '@mui/icons-material';
import {
  deleteSocketClient,
  updateSocketClient
} from 'src/api/use-socket-data.js';
import { Link } from 'react-router-dom';

export const AudienceDisplayManager: FC = () => {
  // TODO - Sorry @Soren you'll need to fix this ¯\_(ツ)_/¯
  const [clients, setClients] = useState<any[]>([]);
  // const resetClients = useResetRecoilState(socketClientsSelector);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContext, setDialogContext] = useState<any>(null);

  // Add effect to invalidate the clients atom when the component is unmounted
  useEffect(() => {
    return () => {
      setClients([]);
    };
  }, []);

  const handleClose = () => {
    setDialogOpen(false);
  };

  const openDialog = (context: any) => {
    setDialogOpen(true);
    setDialogContext(context);
  };

  const updateContext = (key: string, value: string | number) => {
    if (!dialogContext) return;
    setDialogContext({ ...dialogContext, [key]: value });
  };

  const saveUpdate = () => {
    if (!dialogContext) return;
    setDialogOpen(false);
    sendUpdateSocketClient(dialogContext);
    updateSocketClient(dialogContext.persistantClientId, dialogContext);
    const cpy = [...clients];
    const id = cpy.findIndex(
      (e) => e.persistantClientId === dialogContext.persistantClientId
    );
    cpy[id] = dialogContext;
    setClients(cpy);
  };

  const refreshClients = async () => {
    setClients([]);
    // resetClients();
  };

  const requestClientToIdentify = (data: any) => {
    requestClientIdentification(data);
  };

  const requestClientToRefresh = (data: any) => {
    requestClientRefresh(data);
  };

  const deleteDevice = (id: string) => {
    deleteSocketClient(id);
    const cpy = [...clients];
    const index = cpy.findIndex((e) => e.persistantClientId === id);
    cpy.splice(index, 1);
    setClients(cpy);
  };

  const idAll = () => {
    requestAllClientsIdentification({ clients });
  };

  return (
    <PaperLayout
      containerWidth='xl'
      header={<Typography variant='h4'>Audience Display Manager</Typography>}
      padding
    >
      <Grid container direction='row' spacing={2}>
        <Grid item>
          <Button startIcon={<ChevronLeft />} component={Link} to='../'>
            Back
          </Button>
        </Grid>
        <Grid item flex={1} />
        <Grid item>
          <Button
            startIcon={<Refresh />}
            variant='contained'
            onClick={refreshClients}
          >
            Refresh Clients
          </Button>
        </Grid>
        <Grid item>
          <Button
            startIcon={<Visibility />}
            variant='contained'
            onClick={idAll}
          >
            Identify All Devices
          </Button>
        </Grid>
      </Grid>
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>Connetcted</TableCell>
              <TableCell>Socket ID</TableCell>
              <TableCell>Last URL</TableCell>
              <TableCell>Chroma Key</TableCell>
              <TableCell>Field Numbers</TableCell>
              <TableCell>Follower Mode Enabled</TableCell>
              <TableCell>Identify</TableCell>
              <TableCell>Force Reload</TableCell>
              <TableCell>Delete</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.map((client) => (
              <TableRow
                key={client.persistantClientId}
                onClick={() => openDialog(client)}
              >
                <TableCell>{client.persistantClientId}</TableCell>
                <TableCell>{client.ipAddress}</TableCell>
                <TableCell>{client.connected ? 'Yes' : 'No'}</TableCell>
                <TableCell>{client.lastSocketId}</TableCell>
                <TableCell>{client.currentUrl}</TableCell>
                <TableCell>
                  {client.audienceDisplayChroma.replaceAll('"', '')}
                </TableCell>
                <TableCell>{client.fieldNumbers}</TableCell>
                <TableCell>{client.followerMode ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <IconButton
                    onClick={(e) => {
                      requestClientToIdentify(client);
                      e.stopPropagation();
                    }}
                  >
                    <RemoveRedEye />
                  </IconButton>
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={(e) => {
                      requestClientRefresh(client);
                      e.stopPropagation();
                    }}
                  >
                    <Cached />
                  </IconButton>
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={(e) => {
                      deleteDevice(client.persistantClientId);
                      e.stopPropagation();
                    }}
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {dialogContext && ( // TODO: make field numbers more pretty
        <Dialog open={dialogOpen} onClose={handleClose}>
          <DialogTitle>Update {dialogContext.persistantClientId}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin='dense'
              id='name'
              label='Audience Display Chroma'
              type='text'
              fullWidth
              defaultValue={dialogContext.audienceDisplayChroma.replaceAll(
                '"',
                ''
              )}
              variant='standard'
              onChange={(e) =>
                updateContext('audienceDisplayChroma', e.target.value)
              }
            />
            <TextField
              autoFocus
              margin='dense'
              id='name'
              label='Field Numbers (Seperated by commas)'
              type='text'
              fullWidth
              defaultValue={dialogContext.fieldNumbers}
              variant='standard'
              onChange={(e) => updateContext('fieldNumbers', e.target.value)}
            />
            <FormControlLabel
              control={
                <Checkbox
                  defaultChecked={!!dialogContext.followerMode}
                  onChange={(e) =>
                    updateContext('followerMode', e.target.checked ? 1 : 0)
                  }
                />
              }
              label='Enable Follower Mode'
            />
            <TextField
              autoFocus
              margin='dense'
              id='name'
              label='Follower API Host (Leave blank for none)'
              type='text'
              fullWidth
              defaultValue={dialogContext.followerApiHost}
              variant='standard'
              onChange={(e) => updateContext('followerApiHost', e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={saveUpdate}>Update</Button>
          </DialogActions>
        </Dialog>
      )}
    </PaperLayout>
  );
};
