import { apiFetcher } from '@toa-lib/client';
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

export const useAllianceMember = (
  eventKey: string,
  tournamentKey: string | null | undefined,
  teamKey: number
): AllianceMember | undefined => {
  const { data: members } = useAllianceMembers(eventKey, tournamentKey);
  return members?.find((m) => m.teamKey === teamKey);
};

export const postAllianceMembers = (
  eventKey: string,
  members: AllianceMember[]
): Promise<void> => apiFetcher(`alliance/${eventKey}`, 'POST', members);

export const patchAllianceMember = (
  eventKey: string,
  tournamentKey: string,
  teamKey: number,
  member: AllianceMember
): Promise<void> =>
  apiFetcher(
    `alliance/${eventKey}/${tournamentKey}/${teamKey}`,
    'PATCH',
    member
  );

export const deleteAllianceMembers = (
  eventKey: string,
  tournamentKey: string
): Promise<void> =>
  apiFetcher(`alliance/${eventKey}/${tournamentKey}`, 'DELETE');
