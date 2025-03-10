// import { FC } from 'react';
// import ChromaLayout from 'src/layouts/ChromaLayout';
// import { DateTime } from 'luxon';
// import './Display.less';

// import { useRecoilValue } from 'recoil';
// import { currentEventKeyAtom } from 'src/stores/recoil';
// import { isNumber, Match } from '@toa-lib/models';

// import FGC_BG from '../AudienceDisplay/displays/fgc_2023/res/global-bg.png';
// import FGC_LOGO from '../AudienceDisplay/displays/fgc_2023/res/Global_Logo.png';
// import { useSearchParams } from 'react-router-dom';
// import { useMatchesForTournament } from 'src/api/use-match-data';

// const FieldColumn: FC<{ field: number; matches: Match<any>[] }> = ({
//   field,
//   matches
// }) => {
//   const fieldMatches = matches
//     .filter((m) => m.fieldNumber === field && m.result === -1)
//     .slice(0, 6);
//   return (
//     <div id='q-field'>
//       <h2>Field {field}</h2>
//       {fieldMatches?.map((m) => {
//         const params = m.name.split(' ');
//         const matchNumber = isNumber(parseInt(params[2]))
//           ? params[2]
//           : params[3];

//         return (
//           <div key={`${m.eventKey}-${m.tournamentKey}-${m.id}`} id='q-match'>
//             <span className='q-match-name center'>Match {matchNumber}</span>
//             <span className='q-match-number center'>
//               {DateTime.fromISO(m.startTime).toFormat('t')}
//             </span>
//           </div>
//         );
//       })}
//     </div>
//   );
// };

// export const QueueingDisplay: FC = () => {
//   const eventKey = useRecoilValue(currentEventKeyAtom);
//   const [searchParams] = useSearchParams();
//   const tournamentKey = searchParams.get('tournamentKey') ?? null;
//   // TODO - REFRESH EVERY X SECONDS/MINUTES (MUTATE SWR)
//   const { data: matches } = useMatchesForTournament(eventKey, tournamentKey);

//   return (
//     <ChromaLayout>
//       <div id='fgc-body' style={{ backgroundImage: `url(${FGC_BG})` }} />
//       <div id='q-base'>
//         <div id='q-head'>
//           <h1 id='q-head-left'>Upcoming Matches</h1>
//           <img id='q-head-right' className='fit-w' src={FGC_LOGO} />
//         </div>
//         {matches && (
//           <div id='q-field-base'>
//             <FieldColumn
//               field={1}
//               matches={matches.filter((m) => m.fieldNumber === 1)}
//             />
//             <FieldColumn
//               field={2}
//               matches={matches.filter((m) => m.fieldNumber === 2)}
//             />
//             <FieldColumn
//               field={3}
//               matches={matches.filter((m) => m.fieldNumber === 3)}
//             />
//             <FieldColumn
//               field={4}
//               matches={matches.filter((m) => m.fieldNumber === 4)}
//             />
//             <FieldColumn
//               field={5}
//               matches={matches.filter((m) => m.fieldNumber === 5)}
//             />
//           </div>
//         )}
//       </div>
//     </ChromaLayout>
//   );
// };
