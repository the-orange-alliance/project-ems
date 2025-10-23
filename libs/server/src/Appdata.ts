import { platform, homedir } from 'os';
import { join } from 'path';

function getWinPath() {
  return join(homedir(), 'AppData', 'Roaming');
}

function getMacPath() {
  return join(homedir(), 'Library', 'Application Support');
}

function getLinuxPath() {
  return join(homedir(), '.config');
}

function getPlatformPath() {
  switch (platform()) {
    case 'win32':
      return getWinPath();
      break;
    case 'darwin':
      return getMacPath();
      break;
    case 'linux':
      return getLinuxPath();
      break;
    default:
      return platform().indexOf('win') >= 0 ? getWinPath() : getLinuxPath();
  }
}

export default function (app?: string): string {
  const path = process.env.APPDATA || getPlatformPath();

  if (!app) return path;

  return join(path, path !== homedir() ? app : '.' + app);
}
