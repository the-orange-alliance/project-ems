import {
  AllianceMember,
  ApiResponseError,
  allianceMemberZod
} from '@toa-lib/models';
import useSWR, { SWRResponse } from 'swr';
import { localClient } from './http-clients.js';

export const allianceApi = {
  get: {
    members: (eventKey: string, tournamentKey: string) =>
      localClient.get<AllianceMember[]>(
        `/alliance/${eventKey}/${tournamentKey}`,
        {
          schema: allianceMemberZod.array()
        }
      )
  },
  create: {
    members: (eventKey: string, members: AllianceMember[]) =>
      localClient.post<void>(`/alliance/${eventKey}`, { body: members })
  },
  update: {
    member: (
      eventKey: string,
      tournamentKey: string,
      teamKey: number,
      member: AllianceMember
    ) =>
      localClient.patch<void>(
        `/alliance/${eventKey}/${tournamentKey}/${teamKey}`,
        {
          body: member
        }
      )
  },
  delete: {
    members: (eventKey: string, tournamentKey: string) =>
      localClient.delete<void>(`/alliance/${eventKey}/${tournamentKey}`)
  }
};

export const useAllianceMembers = (
  eventKey: string | null | undefined,
  tournamentKey: string | null | undefined
): SWRResponse<AllianceMember[], ApiResponseError> =>
  useSWR<
    AllianceMember[],
    ApiResponseError,
    readonly [string, string, string] | null
  >(
    eventKey && tournamentKey
      ? (['/alliance', eventKey, tournamentKey] as const)
      : null,
    ([, eKey, tKey]) =>
      allianceApi.get.members(eKey, tKey).then((res) => res ?? []),
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
