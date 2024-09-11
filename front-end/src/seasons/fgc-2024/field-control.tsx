import { FeedingTheFuture, FieldControlUpdatePacket } from '@toa-lib/models';
import { FieldControlCallbacks } from '..';
import { useSocket } from 'src/api/use-socket';

export const useFieldControl =
  (): FieldControlCallbacks<FeedingTheFuture.MatchDetails> => {
    const [socket] = useSocket();

    const prestartField = () => {
      socket?.emit('fcs:test', { test: 'test' });
      console.log('prestartField');
    };

    const cancelPrestartForField = () => {
      console.log('cancelPrestartForField');
    };

    const prepareField = () => {
      socket?.emit('fcs:update', {
        hubs: {},
        wleds: {
          center: {
            color: 'ffff00',
            targetSegments: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
          },
          red: {
            color: 'ffff00',
            targetSegments: [0, 1, 2, 3, 4, 5]
          },
          blue: {
            color: 'ffff00',
            targetSegments: [0, 1, 2, 3, 4, 5]
          }
        }
      } satisfies FieldControlUpdatePacket);
      console.log('prepareField');
    };

    const startField = () => {
      socket?.emit('fcs:update', {
        hubs: {},
        wleds: {
          center: {
            color: '000000',
            targetSegments: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
          },
          red: {
            color: '000000',
            targetSegments: [0, 1, 2, 3, 4, 5]
          },
          blue: {
            color: '000000',
            targetSegments: [0, 1, 2, 3, 4, 5]
          }
        }
      } satisfies FieldControlUpdatePacket);
      console.log('startField');
    };

    const abortField = () => {
      socket?.emit('fcs:update', {
        hubs: {},
        wleds: {
          center: {
            color: 'ff0000',
            targetSegments: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
          },
          red: {
            color: 'ff0000',
            targetSegments: [0, 1, 2, 3, 4, 5]
          },
          blue: {
            color: 'ff0000',
            targetSegments: [0, 1, 2, 3, 4, 5]
          }
        }
      } satisfies FieldControlUpdatePacket);
      console.log('abortField');
    };

    const clearField = () => {
      socket?.emit('fcs:update', {
        hubs: {},
        wleds: {
          center: {
            color: '00ff00',
            targetSegments: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
          },
          red: {
            color: '00ff00',
            targetSegments: [0, 1, 2, 3, 4, 5]
          },
          blue: {
            color: '00ff00',
            targetSegments: [0, 1, 2, 3, 4, 5]
          }
        }
      } satisfies FieldControlUpdatePacket);
      console.log('clearField');
    };

    const commitScoresForField = () => {
      console.log('commitScoresForField');
    };

    const postResultsForField = () => {
      console.log('postResultsForField');
    };

    const onMatchUpdate = (match: FeedingTheFuture.MatchDetails) => {
      console.log('onMatchUpdate', match);
    };

    return {
      prestartField,
      cancelPrestartForField,
      prepareField,
      startField,
      abortField,
      clearField,
      commitScoresForField,
      postResultsForField,
      onMatchUpdate
    };
  };
