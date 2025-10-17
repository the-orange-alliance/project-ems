

export enum SocketEvents {
    EcosystemUpdate = "fcs:fgc25:ecosystemUpdate",
    ForceEcosystemUpdate = "fcs:fgc25:forceEcosystemUpdate",
}

export enum Ecosystem {
    RedSide = 0,
    Center = 1,
    BlueSide = 2,
}

export interface EcosystemUpdate {
    ecosystem: Ecosystem;
    position: 0 | 1 | 2 | 3;
}
