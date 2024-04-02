import { FC, useState } from 'react';
import Typography from '@mui/material/Typography';
import PaperLayout from '@layouts/PaperLayout';
import { useRecoilState } from 'recoil';
import { socketClientsAtom } from 'src/stores/NewRecoil';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Table,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField
} from '@mui/material';
import {
  requestAllClientsIdentification,
  requestClientIdentification,
  sendUpdateSocketClient
} from 'src/api/use-socket';
import { Delete, RemoveRedEye } from '@mui/icons-material';
import {
  deleteSocketClient,
  updateSocketClient
} from 'src/api/use-socket-data';

const AudienceDisplayManager: FC = () => {
  const [clients, setClients] = useRecoilState(socketClientsAtom);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContext, setDialogContext] = useState<any>(null);

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

  const requestClientToIdentify = (data: any) => {
    requestClientIdentification(data);
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
      <Button variant='contained' onClick={idAll}>
        Identify All Devices
      </Button>
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
              <TableCell>Delete</TableCell>
            </TableRow>
          </TableHead>
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
                <IconButton>
                  <RemoveRedEye
                    onClick={(e) => {
                      requestClientToIdentify(client);
                      e.stopPropagation();
                    }}
                  />
                </IconButton>
              </TableCell>
              <TableCell>
                <IconButton>
                  <Delete
                    onClick={(e) => {
                      deleteDevice(client.persistantClientId);
                      e.stopPropagation();
                    }}
                  />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
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

export default AudienceDisplayManager;
