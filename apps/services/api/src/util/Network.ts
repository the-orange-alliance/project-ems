const WHITELISTED_ADDRESSES = ['::1', '::ffff:127.0.0.1', '127.0.0.1'];

function isLocal(address: string): boolean {
  return WHITELISTED_ADDRESSES.indexOf(address) !== -1;
}

export default isLocal;
