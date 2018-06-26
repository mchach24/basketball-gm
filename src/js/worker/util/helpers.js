// @flow

import orderBy from "lodash/orderBy";
import { PLAYER, helpers as commonHelpers } from "../../common";
import { g } from ".";
import type {
    DraftPick,
    GameProcessed,
    GameProcessedCompleted,
    PlayoffSeriesTeam,
} from "../../common/types";

const augmentSeries = (
    series: {| away: PlayoffSeriesTeam, home: PlayoffSeriesTeam |}[][],
) => {
    for (const round of series) {
        for (const matchup of round) {
            matchup.away.abbrev = g.teamAbbrevsCache[matchup.away.tid];
            matchup.away.region = g.teamRegionsCache[matchup.away.tid];
            matchup.home.abbrev = g.teamAbbrevsCache[matchup.home.tid];
            matchup.home.region = g.teamRegionsCache[matchup.home.tid];
        }
    }
};

// Used to fix links in the event log, which will be wrong if a league is exported and then imported. Would be better to do this on import!
const correctLinkLid = (lid: number, event: { text: string }) => {
    event.text = event.text.replace(/\/l\/\d+\//g, `/l/${lid}/`);
};

const formatCompletedGame = (game: GameProcessed): GameProcessedCompleted => {
    // If not specified, assume user's team is playing
    game.tid = game.tid !== undefined ? game.tid : g.userTid;

    // team0 and team1 are different than they are above! Here it refers to user and opponent, not home and away
    const team0 = {
        tid: game.tid,
        abbrev: g.teamAbbrevsCache[game.tid],
        region: g.teamRegionsCache[game.tid],
        name: g.teamNamesCache[game.tid],
        pts: game.pts,
    };
    const team1 = {
        tid: game.oppTid,
        abbrev: g.teamAbbrevsCache[game.oppTid],
        region: g.teamRegionsCache[game.oppTid],
        name: g.teamNamesCache[game.oppTid],
        pts: game.oppPts,
    };

    return {
        gid: game.gid,
        overtime: game.overtime,
        score: game.won
            ? `${team0.pts}-${team1.pts}`
            : `${team1.pts}-${team0.pts}`,
        teams: game.home ? [team1, team0] : [team0, team1],
        won: game.won,
    };
};

// Calculate the number of games that team is behind team0
type teamWonLost = { lost: number, won: number };
const gb = (team0: teamWonLost, team: teamWonLost) => {
    return (team0.won - team0.lost - (team.won - team.lost)) / 2;
};

/**
 * Get the team abbreviation for a team ID.
 *
 * For instance, team ID 0 is Atlanta, which has an abbreviation of ATL.
 *
 * @memberOf util.helpers
 * @param {number|string} tid Integer team ID.
 * @return {string} Abbreviation
 */
const getAbbrev = (tid: number | string): string => {
    tid = parseInt(tid, 10);

    if (tid === PLAYER.FREE_AGENT) {
        return "FA";
    }
    if (tid < 0 || Number.isNaN(tid)) {
        // Draft prospect or retired
        return "";
    }
    if (tid >= g.teamAbbrevsCache.length) {
        tid = g.userTid;
    }

    return g.teamAbbrevsCache[tid];
};

const leagueUrl = (components: (number | string)[]): string =>
    commonHelpers.leagueUrlFactory(g.lid, components);

/**
 * Pad an array with nulls or truncate it so that it has a fixed length.
 *
 * @memberOf util.helpers
 * @param {Array} array Input array.
 * @param {number} length Desired length.
 * @return {Array} Original array padded with null or truncated so that it has the required length.
 */
function nullPad<T>(array: (?T)[], length: number): (?T)[] {
    if (array.length > length) {
        return array.slice(0, length);
    }

    while (array.length < length) {
        array.push(null);
    }

    return array;
}

const orderByWinp = <T: { seasonAttrs: { winp: number, won: number } }>(
    teams: T[],
): T[] => {
    return orderBy(
        teams,
        [
            t => (t.seasonAttrs ? t.seasonAttrs.winp : 0),
            t => (t.seasonAttrs ? t.seasonAttrs.won : 0),
        ],
        ["desc", "desc"],
    );
};

const overtimeCounter = (n: number): string => {
    switch (n) {
        case 1:
            return "";
        case 2:
            return "double";
        case 3:
            return "triple";
        case 4:
            return "quadruple";
        case 5:
            return "quintuple";
        case 6:
            return "sextuple";
        case 7:
            return "septuple";
        case 8:
            return "octuple";
        default:
            return `a ${commonHelpers.ordinal(n)}`;
    }
};

const pickDesc = (dp: DraftPick): string => {
    const season = dp.season === "fantasy" ? "Fantasy draft" : dp.season;
    let desc = `${season} ${commonHelpers.ordinal(dp.round)} round pick`;

    const extras = [];
    if (dp.pick > 0) {
        extras.push(
            commonHelpers.ordinal((dp.round - 1) * g.numTeams + dp.pick),
        );
    }
    if (dp.tid !== dp.originalTid) {
        extras.push(`from ${g.teamAbbrevsCache[dp.originalTid]}`);
    }

    if (extras.length > 0) {
        desc += ` (${extras.join(", ")})`;
    }

    return desc;
};

/**
 * Delete all the things from the global variable g that are not stored in league databases.
 *
 * This is used to clear out values from other leagues, to ensure that the appropriate values are updated in the database when calling league.setGameAttributes.
 *
 * @memberOf util.helpers
 */
const resetG = () => {
    for (const key of commonHelpers.keys(g)) {
        if (key !== "lid") {
            delete g[key];
        }
    }
};

// x is value, a controls sharpness, b controls center
const sigmoid = (x: number, a: number, b: number): number => {
    return 1 / (1 + Math.exp(-(a * (x - b))));
};

const helpers = Object.assign({}, commonHelpers, {
    augmentSeries,
    correctLinkLid,
    formatCompletedGame,
    gb,
    getAbbrev,
    leagueUrl,
    nullPad,
    orderByWinp,
    overtimeCounter,
    pickDesc,
    resetG,
    sigmoid,
});

export default helpers;
