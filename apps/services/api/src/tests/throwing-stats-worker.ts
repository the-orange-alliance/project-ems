// A worker entry that can never start: module evaluation throws before any
// message handler exists, exactly like a broken packaged import would.
throw new Error('fixture import failure');
