import { FeedingTheFuture } from '@toa-lib/models';
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
      console.log('prepareField');
    };

    const startField = () => {
      console.log('startField');
    };

    const abortField = () => {
      console.log('abortField');
    };

    const clearField = () => {
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
