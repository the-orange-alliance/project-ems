import { execFile } from 'child_process';

export const getArgFromQualityStr = (quality: string): string => {
  switch (quality) {
    case 'fair':
      return '-f';
    case 'good':
      return '-g';
    case 'best':
      return '-b';
    default:
      return '-b';
  }
};

export const executeMatchMaker = async (path: string, args: string[]) => {
  return new Promise((resolve, reject) => {
    execFile(path, args, (error: any, stdout: any, stderr: any) => {
      if (error) {
        reject(error);
      } else {
      }
    });
  });
};
