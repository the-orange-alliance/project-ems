import { apiFetcher, clientFetcher } from '@toa-lib/client';
import { AllianceMember, allianceMemberZod } from '@toa-lib/models';
import useSWR from 'swr';

export const useAllianceMembers = (
  eventKey: string | null | undefined,
  tournamentKey: string | null | undefined
) =>
  useSWR<AllianceMember[]>(
    eventKey && tournamentKey
      ? `alliance/${eventKey}/${tournamentKey}`
      : undefined,
    (url) => apiFetcher(url, 'GET', undefined, allianceMemberZod.array().parse),
    { revalidateOnFocus: false }
  );

export const postAllianceMembers = (
  eventKey: string,
  members: AllianceMember[]
): Promise<void> => clientFetcher(`alliance/${eventKey}`, 'POST', members);

export const patchAllianceMember = (
  eventKey: string,
  tournamentKey: string,
  teamKey: number,
  member: AllianceMember
): Promise<void> =>
  clientFetcher(
    `alliance/${eventKey}/${tournamentKey}/${teamKey}`,
    'PATCH',
    member
  );

export const deleteAllianceMembers = (
  eventKey: string,
  tournamentKey: string
): Promise<void> =>
  clientFetcher(`alliance/${eventKey}/${tournamentKey}`, 'DELETE');
