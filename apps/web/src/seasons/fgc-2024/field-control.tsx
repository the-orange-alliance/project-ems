import { FeedingTheFuture } from '@toa-lib/models';
import { FieldControlCallbacks } from '../index.js';
import { useSocketWorker } from 'src/api/use-socket-worker.js';

export const useFieldControl =
  (): FieldControlCallbacks<FeedingTheFuture.MatchDetails> => {
    const { worker } = useSocketWorker();
    const fieldOptions = {}; // TODO: update for season

    const prestartField = () => {
      worker?.emit('fcs:test', { test: 'test' });
      // console.log('prestartField');
    };

    const cancelPrestartForField = () => {
      // console.log('cancelPrestartForField');
    };

    const prepareField = () => {
      worker?.emit('fcs:prepareField');
      // console.log('prepareField');
    };

    const startField = () => {
      // console.log('startField');
    };

    const abortField = () => {
      // console.log('abortField');
    };

    const clearField = () => {
      worker?.emit('fcs:allClear');
      // console.log('clearField');
    };

    const commitScoresForField = () => {
      // console.log('commitScoresForField');
    };

    const postResultsForField = () => {
      // console.log('postResultsForField');
    };

    const onMatchUpdate = () => {
      // // console.log('onMatchUpdate', match);
    };

    const awardsMode = () => {
      worker?.emit('fcs:awardsMode');
    };

    const updateFieldSettings = () => {
      worker?.emit('fcs:settings', fieldOptions);
      // console.log('updateFieldSettings');
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
      onMatchUpdate,
      updateFieldSettings,
      awardsMode
    };
  };
