
/**
 * This converts an EMS station to an FMS Station
 * Ex. 11 = Red Alliance 1, Which will become Station 0
 * Ex. 23 = Blue Alliance 3, Which will become Station 5
 * @param station Station to convert
 * @returns FMS Station
 */
export const convertEMSStationToFMS = (station: number): number => {
    switch (station) {
        case 11: return 0;
        case 12: return 1;
        case 13: return 2;
        case 21: return 3;
        case 22: return 4;
        case 23: return 5;
        default: return 0;
    }
}