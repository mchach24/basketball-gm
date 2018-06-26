// @flow

import { PHASE } from "../../common";
import { draft } from "../core";
import { g, helpers, local, lock, toUI } from ".";

/**
 * Update play menu options based on game state.
 *
 * @memberOf ui
 * @return {Promise}
 */
const updatePlayMenu = async () => {
    // $FlowFixMe
    if (typeof it === "function") {
        return;
    }

    const allOptions: {
        [key: string]: {
            id?: string,
            label: string,
            url?: string,
        },
    } = {
        stop: { label: "Stop" },
        day: { label: "One day" },
        week: { label: "One week" },
        month: { label: "One month" },
        untilPlayoffs: { label: "Until playoffs" },
        throughPlayoffs: { label: "Through playoffs" },
        dayLive: { url: helpers.leagueUrl(["live"]), label: "One day (live)" },
        viewDraftLottery: {
            url: helpers.leagueUrl(["draft_lottery"]),
            label: "View draft lottery",
        },
        untilDraft: { label: "Until draft" },
        onePick: { label: "One pick" },
        untilYourNextPick: { label: "Until your next pick" },
        untilEnd: { label: "Until end of draft" },
        viewDraft: { url: helpers.leagueUrl(["draft"]), label: "View draft" },
        untilResignPlayers: {
            label: "Re-sign players with expiring contracts",
        },
        untilFreeAgency: { label: "Until free agency" },
        untilPreseason: { label: "Until preseason" },
        untilRegularSeason: { label: "Until regular season" },
        contractNegotiation: {
            url: helpers.leagueUrl(["negotiation"]),
            label: "Continue contract negotiation",
        },
        contractNegotiationList: {
            url: helpers.leagueUrl(["negotiation"]),
            label: "Continue re-signing players",
        },
        message: {
            url: helpers.leagueUrl(["message"]),
            label: "Read new message",
        },
        newLeague: { url: "/new_league", label: "Try again in a new league" },
        newTeam: {
            url: helpers.leagueUrl(["new_team"]),
            label: "Try again with a new team",
        },
        stopAuto: {
            label: `Stop auto play (${local.autoPlaySeasons} seasons left)`,
        },
    };

    let keys = [];
    if (g.phase === PHASE.PRESEASON) {
        // Preseason
        keys = ["untilRegularSeason"];
    } else if (g.phase === PHASE.REGULAR_SEASON) {
        // Regular season - pre trading deadline
        keys = ["day", "dayLive", "week", "month", "untilPlayoffs"];
    } else if (g.phase === PHASE.AFTER_TRADE_DEADLINE) {
        // Regular season - post trading deadline
        keys = ["day", "dayLive", "week", "month", "untilPlayoffs"];
    } else if (g.phase === PHASE.PLAYOFFS) {
        // Playoffs
        keys = ["day", "dayLive", "week", "month", "throughPlayoffs"];
    } else if (g.phase === PHASE.DRAFT_LOTTERY) {
        // Offseason - pre draft
        keys = ["viewDraftLottery", "untilDraft"];
    } else if (g.phase === PHASE.DRAFT || g.phase === PHASE.FANTASY_DRAFT) {
        // Draft
        const draftPicks = await draft.getOrder();
        const nextPick = draftPicks[0];
        if (nextPick && g.userTids.includes(nextPick.tid)) {
            keys = ["viewDraft"];
        } else if (draftPicks.some(dp => g.userTids.includes(dp.tid))) {
            keys = ["onePick", "untilYourNextPick", "viewDraft"];
        } else {
            keys = ["onePick", "untilEnd", "viewDraft"];
        }
    } else if (g.phase === PHASE.AFTER_DRAFT) {
        // Offseason - post draft
        keys = ["untilResignPlayers"];
    } else if (g.phase === PHASE.RESIGN_PLAYERS) {
        // Offseason - re-sign players
        keys = ["contractNegotiationList", "untilFreeAgency"];
    } else if (g.phase === PHASE.FREE_AGENCY) {
        // Offseason - free agency
        keys = ["day", "week", "untilPreseason"];
    }

    const unreadMessage = await lock.unreadMessage();
    const negotiationInProgress = await lock.negotiationInProgress();

    if (unreadMessage) {
        keys = ["message"];
    }
    if (lock.get("gameSim")) {
        keys = ["stop"];
    }
    if (negotiationInProgress && g.phase !== PHASE.RESIGN_PLAYERS) {
        keys = ["contractNegotiation"];
    }
    if (lock.get("newPhase")) {
        keys = [];
    }

    // If there is an unread message, it's from the owner saying the player is fired, so let the user see that first.
    if (g.gameOver && !unreadMessage) {
        keys = ["newTeam", "newLeague"];
    }

    if (local.autoPlaySeasons > 0) {
        keys = ["stopAuto"];
    }

    const someOptions = keys.map(id => {
        allOptions[id].id = id;
        return allOptions[id];
    });

    toUI(["updateLocal", { playMenuOptions: someOptions }]);
};

export default updatePlayMenu;
