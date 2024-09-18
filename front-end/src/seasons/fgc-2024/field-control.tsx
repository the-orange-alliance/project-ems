import { FeedingTheFuture, FeedingTheFutureFCS } from '@toa-lib/models';
import { FieldControlCallbacks } from '..';
import { useSocket } from 'src/api/use-socket';
import { useRecoilValue } from 'recoil';
import { fieldOptionsSelector } from './stores/settings-store';

export const useFieldControl =
  (): FieldControlCallbacks<FeedingTheFuture.MatchDetails> => {
    const [socket] = useSocket();
    const fieldOptions: FeedingTheFutureFCS.FieldOptions =
      useRecoilValue(fieldOptionsSelector);

    const prestartField = () => {
      socket?.emit('fcs:test', { test: 'test' });
      console.log('prestartField');
    };

    const cancelPrestartForField = () => {
      console.log('cancelPrestartForField');
    };

    const prepareField = () => {
      // Keep field options up to date
      socket?.emit('fcs:settings', fieldOptions);
      socket?.emit('fcs:prepareField');
      console.log('prepareField');
    };

    const startField = () => {
      console.log('startField');
    };

    const abortField = () => {
      console.log('abortField');
    };

    const clearField = () => {
      socket?.emit('fcs:allClear');
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
