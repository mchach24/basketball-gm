// @flow

import orderBy from "lodash/orderBy";
import { Cache, connectLeague, idb } from "../../db";
import { DIFFICULTY, PHASE, PLAYER } from "../../../common";
import { draft, finances, player, team } from "..";
import setGameAttributes from "./setGameAttributes";
import {
    defaultGameAttributes,
    g,
    helpers,
    local,
    lock,
    random,
    toUI,
    updatePhase,
    updateStatus,
} from "../../util";
import type { Conditions, GameAttributes } from "../../../common/types";

// Creates a league, writing nothing to the database.
export const createWithoutSaving = (
    leagueName: string,
    tid: number,
    leagueFile: Object,
    startingSeason: number,
    randomizeRosters: boolean,
    difficulty: number,
): {
    [key: string]: Object[],
    gameAttributes: GameAttributes,
} => {
    const teamsDefault = helpers.getTeamsDefault();

    // Any custom teams?
    let teamInfos: any;
    if (leagueFile.hasOwnProperty("teams")) {
        if (leagueFile.teams.length <= teamsDefault.length) {
            // This probably shouldn't be here, but oh well, backwards compatibility...
            teamInfos = leagueFile.teams.map((t, i) => {
                // Fill in default values as needed
                const t2 = teamsDefault[i];
                for (const prop of Object.keys(t2)) {
                    if (!t.hasOwnProperty(prop)) {
                        t[prop] = t2[prop];
                    }
                }

                return t;
            });
        } else {
            teamInfos = leagueFile.teams;
        }
        teamInfos = helpers.addPopRank(teamInfos);
    } else {
        teamInfos = teamsDefault;
    }
    const teams = teamInfos.map(t => team.generate(t));

    // Handle random team
    let userTid = tid;
    if (tid === -1 || tid >= teams.length) {
        userTid = random.randInt(0, teams.length - 1);
    }

    const gameAttributes: GameAttributes = Object.assign(
        {},
        defaultGameAttributes,
        {
            userTid,
            userTids: [userTid],
            season: startingSeason,
            startingSeason,
            leagueName,
            teamAbbrevsCache: teams.map(t => t.abbrev),
            teamRegionsCache: teams.map(t => t.region),
            teamNamesCache: teams.map(t => t.name),
            gracePeriodEnd: startingSeason + 2, // Can't get fired for the first two seasons
            numTeams: teams.length, // Will be 30 if the user doesn't supply custom rosters
            difficulty,
        },
    );

    if (leagueFile.hasOwnProperty("gameAttributes")) {
        for (let i = 0; i < leagueFile.gameAttributes.length; i++) {
            // Set default for anything except team ID and name, since they can be overwritten by form input.
            if (
                leagueFile.gameAttributes[i].key !== "userTid" &&
                leagueFile.gameAttributes[i].key !== "leagueName" &&
                leagueFile.gameAttributes[i].key !== "difficulty"
            ) {
                gameAttributes[leagueFile.gameAttributes[i].key] =
                    leagueFile.gameAttributes[i].value;
            }
        }

        // Special case for userTids - don't use saved value if userTid is not in it
        if (!gameAttributes.userTids.includes(gameAttributes.userTid)) {
            gameAttributes.userTids = [gameAttributes.userTid];
        }
    }

    // Extra check for easyDifficultyInPast, so that it won't be overwritten by a league file if the user selects Easy
    // when creating a new league.
    if (difficulty <= DIFFICULTY.Easy) {
        gameAttributes.easyDifficultyInPast = true;
    }

    // Hacky - put gameAttributes in g so they can be seen by functions called from this function. Later will be properly done with setGameAttributes
    helpers.resetG();
    Object.assign(g, gameAttributes);

    // Draft picks for the first 4 years, as those are the ones can be traded initially
    let draftPicks: any;
    if (leagueFile.hasOwnProperty("draftPicks")) {
        draftPicks = leagueFile.draftPicks;
        for (const dp of leagueFile.draftPicks) {
            if (typeof dp.pick !== "number") {
                dp.pick = 0;
            }
        }
    } else {
        draftPicks = [];
        for (let i = 0; i < 4; i++) {
            for (let t = 0; t < teams.length; t++) {
                for (let round = 1; round <= 2; round++) {
                    draftPicks.push({
                        tid: t,
                        originalTid: t,
                        round,
                        pick: 0,
                        season: startingSeason + i,
                    });
                }
            }
        }
    }

    // Import of legacy draftOrder data
    if (
        Array.isArray(leagueFile.draftOrder) &&
        leagueFile.draftOrder.length > 0 &&
        Array.isArray(leagueFile.draftOrder[0].draftOrder) &&
        (g.phase === PHASE.DRAFT_LOTTERY || g.phase === PHASE.DRAFT)
    ) {
        for (const dp of leagueFile.draftOrder[0].draftOrder) {
            if (g.phase === PHASE.FANTASY_DRAFT) {
                dp.season = "fantasy";
            } else {
                dp.season = g.season;
            }
            draftPicks.push(dp);
        }
    }

    const draftLotteryResults: any = leagueFile.hasOwnProperty(
        "draftLotteryResults",
    )
        ? leagueFile.draftLotteryResults
        : [];

    // teams already contains tid, cid, did, region, name, and abbrev. Let's add in the other keys we need for the league, and break out stuff for other object stores
    let scoutingRankTemp;
    const teamSeasons: any = [];
    const teamStats: any = [];
    for (let i = 0; i < teams.length; i++) {
        const t = teams[i];
        const teamInfo = teamInfos[i];

        let teamSeasonsLocal;
        if (teamInfo.hasOwnProperty("seasons")) {
            teamSeasonsLocal = teamInfo.seasons;
        } else {
            teamSeasonsLocal = [team.genSeasonRow(t.tid)];
            teamSeasonsLocal[0].pop = teamInfo.pop;
            teamSeasonsLocal[0].stadiumCapacity = teamInfo.stadiumCapacity;
        }
        for (const teamSeason of teamSeasonsLocal) {
            teamSeason.tid = t.tid;
            if (typeof teamSeason.stadiumCapacity !== "number") {
                teamSeason.stadiumCapacity = 25000;
            }
            teamSeasons.push(teamSeason);
        }

        let teamStatsLocal;
        if (teamInfo.hasOwnProperty("stats")) {
            teamStatsLocal = teamInfo.stats;
        } else {
            teamStatsLocal = [team.genStatsRow(t.tid)];
        }
        for (const ts of teamStatsLocal) {
            ts.tid = t.tid;

            if (ts.hasOwnProperty("ba")) {
                ts.oppBlk = ts.ba;
                delete ts.ba;
            }
            if (typeof ts.oppBlk !== "number" || Number.isNaN(ts.oppBlk)) {
                ts.oppBlk = 0;
            }

            teamStats.push(ts);
        }

        // Save scoutingRank for later
        if (i === userTid) {
            scoutingRankTemp = finances.getRankLastThree(
                teamSeasons,
                "expenses",
                "scouting",
            );
        }
    }
    const scoutingRank = scoutingRankTemp;
    if (scoutingRank === undefined) {
        throw new Error("scoutingRank should be defined");
    }

    let trade = [];
    if (leagueFile.hasOwnProperty("trade")) {
        trade = leagueFile.trade;
    } else {
        trade = [
            {
                rid: 0,
                teams: [
                    {
                        tid: userTid,
                        pids: [],
                        dpids: [],
                    },
                    {
                        tid: userTid === 0 ? 1 : 0, // Load initial trade view with the lowest-numbered non-user team (so, either 0 or 1).
                        pids: [],
                        dpids: [],
                    },
                ],
            },
        ];
    }

    const games = leagueFile.hasOwnProperty("games") ? leagueFile.games : [];
    for (const gm of games) {
        // Fix missing +/-, blocks against in boxscore
        if (!gm.teams[0].hasOwnProperty("ba")) {
            gm.teams[0].ba = 0;
            gm.teams[1].ba = 0;
        }
        for (const t of gm.teams) {
            for (const p of t.players) {
                if (!p.hasOwnProperty("ba")) {
                    p.ba = 0;
                }
                if (!p.hasOwnProperty("pm")) {
                    p.pm = 0;
                }
            }
        }
    }

    // These object stores are blank by default
    const toMaybeAdd = [
        "releasedPlayers",
        "awards",
        "schedule",
        "playoffSeries",
        "negotiations",
        "messages",
        "games",
        "events",
        "playerFeats",
    ];
    const leagueData: any = {};
    for (const store of toMaybeAdd) {
        leagueData[store] = leagueFile.hasOwnProperty(store)
            ? leagueFile[store]
            : [];
    }

    // Do this weird shit rather than genBaseMoods to avoid database access
    const teamSeasonsForBaseMoods = orderBy(
        teamSeasons.filter(ts => ts.season === gameAttributes.season),
        ["tid"],
    );
    const baseMoods = teamSeasonsForBaseMoods.map(ts => player.genBaseMood(ts));

    let players;
    if (leagueFile.hasOwnProperty("players")) {
        // Use pre-generated players, filling in attributes as needed
        if (randomizeRosters) {
            // Assign the team ID of all players to the 'playerTids' array.
            // Check tid to prevent draft prospects from being swapped with established players
            const playerTids = leagueFile.players
                .filter(p => p.tid > PLAYER.FREE_AGENT)
                .map(p => p.tid);

            // Shuffle the teams that players are assigned to.
            random.shuffle(playerTids);
            for (const p of leagueFile.players) {
                if (p.tid > PLAYER.FREE_AGENT) {
                    p.tid = playerTids.pop();
                    if (p.stats && p.stats.length > 0) {
                        p.stats[p.stats.length - 1].tid = p.tid;
                        p.statsTids.push(p.tid);
                    }
                }
            }
        }

        players = leagueFile.players.map(p0 => {
            // Has to be any because I can't figure out how to change PlayerWithoutPidWithStats to Player
            const p: any = player.augmentPartialPlayer(
                p0,
                scoutingRank,
                leagueFile.version,
            );
            player.updateValues(p);

            return p;
        });
    } else {
        players = [];

        // Generate past 20 years of draft classes
        const NUM_PAST_SEASONS = 20;

        let newPlayers = [];
        for (let i = 0; i < NUM_PAST_SEASONS; i++) {
            const draftClass = draft.genPlayersWithoutSaving(
                PLAYER.UNDRAFTED,
                scoutingRank,
            );
            newPlayers = newPlayers.concat(draftClass.players);
        }
        const numPlayersPerSeason = Math.round(
            newPlayers.length / NUM_PAST_SEASONS,
        );

        // Develop players, check retire
        const keptPlayers = [];
        let agingYears = 0;
        for (let i = 0; i < newPlayers.length; i++) {
            if (i % numPlayersPerSeason === 0) {
                agingYears += 1;
            }
            const p = newPlayers[i];
            player.develop(p, agingYears, true);
            p.draft.year -= agingYears;
            player.updateValues(p);

            if (!player.shouldRetire(p)) {
                keptPlayers.push(p);
            }
        }

        // 16 instead of 13 for wiggle room (need min contract FAs sometimes)
        if (keptPlayers.length < 16 * g.numTeams) {
            throw new Error("Not enough players!");
        }

        // Add players to teams or free agency
        keptPlayers.sort((a, b) => b.ratings[0].pot - a.ratings[0].pot);
        const teamPlayers = keptPlayers.slice(0, 13 * g.numTeams);
        const freeAgentPlayers = keptPlayers.slice(
            13 * g.numTeams,
            150 + 13 * g.numTeams,
        ); // Up to 150 free agents
        random.shuffle(teamPlayers);
        let newTid = -1; // So first iteration will be 0
        for (let i = 0; i < teamPlayers.length; i++) {
            if (i % 13 === 0) {
                newTid += 1;
            }
            const p = teamPlayers[i];
            p.tid = newTid;
            player.setContract(p, player.genContract(p, true), true);
            player.addStatsRow(p, g.phase === PHASE.PLAYOFFS);
            players.push(p);
        }
        for (let i = 0; i < freeAgentPlayers.length; i++) {
            const p = freeAgentPlayers[i];
            p.yearsFreeAgent = Math.random() > 0.5 ? 1 : 0; // So half will be eligible to retire after the first season
            player.setContract(p, player.genContract(p, false), false);
            player.addToFreeAgents(p, g.phase, baseMoods);
            players.push(p);
        }
    }

    // See if imported roster has draft picks included. If so, create less than 70 (scaled for number of teams)
    let createUndrafted1 = Math.round((70 * g.numTeams) / 30);
    let createUndrafted2 = Math.round((70 * g.numTeams) / 30);
    let createUndrafted3 = Math.round((70 * g.numTeams) / 30);
    for (const p of players) {
        if (p.tid === PLAYER.UNDRAFTED) {
            createUndrafted1 -= 1;
        } else if (p.tid === PLAYER.UNDRAFTED_2) {
            createUndrafted2 -= 1;
        } else if (p.tid === PLAYER.UNDRAFTED_3) {
            createUndrafted3 -= 1;
        }
    }
    // If the draft has already happened this season but next year's class hasn't been bumped up, don't create any PLAYER.UNDRAFTED
    if (
        createUndrafted1 > 0 &&
        (g.phase <= PHASE.DRAFT_LOTTERY || g.phase >= PHASE.FREE_AGENCY)
    ) {
        const draftClass = draft.genPlayersWithoutSaving(
            PLAYER.UNDRAFTED,
            scoutingRank,
            createUndrafted1,
            true,
        );
        players = players.concat(draftClass.players);
    }
    if (createUndrafted2 > 0) {
        const draftClass = draft.genPlayersWithoutSaving(
            PLAYER.UNDRAFTED_2,
            scoutingRank,
            createUndrafted2,
            true,
        );
        players = players.concat(draftClass.players);
    }
    if (createUndrafted3 > 0) {
        const draftClass = draft.genPlayersWithoutSaving(
            PLAYER.UNDRAFTED_3,
            scoutingRank,
            createUndrafted3,
            true,
        );
        players = players.concat(draftClass.players);
    }

    return Object.assign(leagueData, {
        draftLotteryResults,
        draftPicks,
        gameAttributes,
        players,
        teamSeasons,
        teamStats,
        teams,
        trade,
    });
};

/**
 * Create a new league.
 *
 * @memberOf core.league
 * @param {string} name The name of the league.
 * @param {number} tid The team ID for the team the user wants to manage (or -1 for random).
 */
const create = async (
    name: string,
    tid: number,
    leagueFile: Object = {},
    startingSeason: number,
    randomizeRosters: boolean = false,
    difficulty: number,
    conditions: Conditions,
): Promise<number> => {
    await idb.meta.attributes.put(tid, "lastSelectedTid");

    const leagueData = createWithoutSaving(
        name,
        tid,
        leagueFile,
        startingSeason,
        randomizeRosters,
        difficulty,
    );

    let phaseText;
    if (
        leagueFile.hasOwnProperty("meta") &&
        leagueFile.meta.hasOwnProperty("phaseText")
    ) {
        phaseText = leagueFile.meta.phaseText;
    } else {
        phaseText = "";
    }

    const userTid = leagueData.gameAttributes.userTid;

    const lid = await idb.meta.leagues.add({
        name,
        tid: userTid,
        phaseText,
        teamName: leagueData.teams[userTid].name,
        teamRegion: leagueData.teams[userTid].region,
        heartbeatID: undefined,
        heartbeatTimestamp: undefined,
        difficulty,
    });
    idb.league = await connectLeague(lid);

    // These wouldn't be needed here, except the beforeView logic is fucked up
    lock.reset();
    local.reset();

    // Clear old game attributes from g, to make sure the new ones are saved to the db in setGameAttributes
    helpers.resetG();
    g.lid = lid;
    await toUI(["resetLeague"]);

    if (idb.cache) {
        idb.cache.stopAutoFlush();
    }
    idb.cache = new Cache();
    idb.cache.newLeague = true;
    await idb.cache.fill(leagueData.gameAttributes.season);

    // Handle gameAttributes special, to get extra functionality from setGameAttributes and because it's not in
    // the database native format in leagueData (object, not array like others).
    await setGameAttributes(leagueData.gameAttributes);

    for (const [store, records] of Object.entries(leagueData)) {
        if (store === "gameAttributes" || !Array.isArray(records)) {
            continue;
        }

        for (const record of records) {
            // $FlowFixMe
            await idb.cache[store].put(record);
        }
    }

    // If no players were uploaded in custom league file, add some relatives!
    if (leagueFile.players === undefined) {
        const players = await idb.cache.players.getAll();
        for (const p of players) {
            await player.addRelatives(p);
        }
    }

    const skipNewPhase = leagueFile.hasOwnProperty("gameAttributes")
        ? leagueFile.gameAttributes.some(ga => ga.key === "phase")
        : false;
    if (!skipNewPhase) {
        await updatePhase();
        await updateStatus("Idle");

        // Auto sort rosters
        await Promise.all(
            leagueData.teams.map(t => team.rosterAutoSort(t.tid)),
        );
    }

    await idb.cache.flush();
    idb.cache.startAutoFlush();
    local.leagueLoaded = true;

    toUI(["bbgmPing", "league", lid], conditions);

    return lid;
};

export default create;
