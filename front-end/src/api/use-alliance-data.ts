import { clientFetcher } from '@toa-lib/client';
import { AllianceMember } from '@toa-lib/models';

export const postAllianceMembers = (
  eventKey: string,
  members: AllianceMember[]
): Promise<void> => clientFetcher(`alliance/${eventKey}`, 'POST', members);
