import { WledInitParameters, WledUpdateParameters } from '@toa-lib/models';
import { workerData, parentPort } from 'worker_threads';
import { WledController } from './WLEDController.js';

interface UpdateMessage {
  data: WledUpdateParameters;
  type: 'update';
}

interface InitializeMessage {
  type: 'initialize';
  data: WledInitParameters;
}

type Message = UpdateMessage | InitializeMessage;

const wled = new WledController(workerData);
wled.initialize();

wled.eventEmitter.on('status', (status) => {
  if (parentPort) {
    parentPort?.postMessage({ type: 'status', data: status });
  }
});

if (parentPort) {
  parentPort.on('message', (message: Message) => {
    if (message.type === 'update') {
      wled.update(message.data);
    } else if (message.type === 'initialize') {
      wled.initialize(message.data);
    }
  });
}
