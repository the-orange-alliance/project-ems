import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import getAppData from './Appdata.js';

export async function setAll(
  file: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const filePath = join(getAppData('ems'), file);
    await writeFile(filePath, JSON.stringify(data));
    return;
  } catch (e) {
    throw e;
  }
}

export async function getAll(file: string): Promise<Record<string, unknown>> {
  try {
    const filePath = join(getAppData('ems'), file);
    const data = await readFile(filePath);
    return JSON.parse(data.toString());
  } catch (e) {
    throw e;
  }
}

export async function setKey(
  file: string,
  key: string,
  data: any
): Promise<void> {
  try {
    const oldData = await getAll(file);
    if (!oldData[key]) oldData[key] = {};
    oldData[key] = data;
    await setAll(file, oldData);
    return;
  } catch (e) {
    throw e;
  }
}
