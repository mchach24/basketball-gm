// @flow

import { idb } from "../db";
import { g } from "../util";
import type { GetOutput, UpdateEvents } from "../../common/types";

async function updatePowerRankings(
    inputs: GetOutput,
    updateEvents: UpdateEvents,
): void | { [key: string]: any } {
    if (updateEvents.includes("firstRun") || updateEvents.includes("gameSim")) {
        const [teams, players] = await Promise.all([
            idb.getCopies.teamsPlus({
                attrs: ["tid", "abbrev", "region", "name"],
                seasonAttrs: ["won", "lost", "lastTen"],
                stats: ["gp", "mov"],
                season: g.season,
            }),
            idb.cache.players.indexGetAll("playersByTid", [0, Infinity]),
        ]);

        // Array of arrays, containing the values for each player on each team
        const playerValuesByTid = [];

        for (let i = 0; i < g.numTeams; i++) {
            playerValuesByTid[i] = [];
            teams[i].talent = 0;
        }

        // TALENT
        // Get player values and sort by tid
        for (let i = 0; i < players.length; i++) {
            playerValuesByTid[players[i].tid].push(players[i].valueNoPot);
        }
        // Sort and weight the values - doesn't matter how good your 12th man is
        const weights = [
            2,
            1.5,
            1.25,
            1.1,
            1,
            0.9,
            0.8,
            0.7,
            0.6,
            0.4,
            0.2,
            0.1,
        ];
        for (let i = 0; i < playerValuesByTid.length; i++) {
            playerValuesByTid[i].sort((a, b) => b - a);

            for (let j = 0; j < playerValuesByTid[i].length; j++) {
                if (j < weights.length) {
                    teams[i].talent += weights[j] * playerValuesByTid[i][j];
                }
            }
        }

        // PERFORMANCE
        for (let i = 0; i < g.numTeams; i++) {
            playerValuesByTid[i] = [];
            // Modulate point differential by recent record: +5 for 10-0 in last 10 and -5 for 0-10
            teams[i].performance =
                teams[i].stats.mov -
                5 +
                (5 * parseInt(teams[i].seasonAttrs.lastTen.split("-")[0], 10)) /
                    10;
        }

        // RANKS
        teams.sort((a, b) => b.talent - a.talent);
        for (let i = 0; i < teams.length; i++) {
            teams[i].talentRank = i + 1;
        }
        teams.sort((a, b) => b.performance - a.performance);
        for (let i = 0; i < teams.length; i++) {
            teams[i].performanceRank = i + 1;
        }

        // OVERALL RANK
        // Weighted average depending on GP
        const overallRankMetric = t => {
            if (t.stats.gp < 10) {
                return (
                    (t.performanceRank * 4 * t.stats.gp) / 10 +
                    (t.talentRank * (30 - t.stats.gp)) / 10
                );
            }

            return t.performanceRank * 4 + t.talentRank * 2;
        };
        teams.sort((a, b) => overallRankMetric(a) - overallRankMetric(b));
        for (let i = 0; i < teams.length; i++) {
            teams[i].overallRank = i + 1;
        }

        return {
            teams,
            userTid: g.userTid,
        };
    }
}

export default {
    runBefore: [updatePowerRankings],
};
