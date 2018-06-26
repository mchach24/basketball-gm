// @flow

import { PHASE, PLAYER } from "../../../common";
import { freeAgents } from "..";
import { idb } from "../../db";
import { g, helpers, lock, updatePlayMenu, updateStatus } from "../../util";

/**
 * Start a new contract negotiation with a player.
 *
 * @memberOf core.contractNegotiation
 * @param {number} pid An integer that must correspond with the player ID of a free agent.
 * @param {boolean} resigning Set to true if this is a negotiation for a contract extension, which will allow multiple simultaneous negotiations. Set to false otherwise.
 * @param {number=} tid Team ID the contract negotiation is with. This only matters for Multi Team Mode. If undefined, defaults to g.userTid.
 * @return {Promise.<string=>)} If an error occurs, resolve to a string error message.
 */
const create = async (
    pid: number,
    resigning: boolean,
    tid: number = g.userTid,
): Promise<string | void> => {
    if (
        g.phase >= PHASE.AFTER_TRADE_DEADLINE &&
        g.phase <= PHASE.RESIGN_PLAYERS &&
        !resigning
    ) {
        return "You're not allowed to sign free agents now.";
    }

    const canStartNegotiation = await lock.canStartNegotiation();
    if (!canStartNegotiation) {
        return "You cannot initiate a new negotiaion while game simulation is in progress or a previous contract negotiation is in process.";
    }

    const playersOnRoster = await idb.cache.players.indexGetAll(
        "playersByTid",
        g.userTid,
    );
    if (playersOnRoster.length >= g.maxRosterSize && !resigning) {
        return "Your roster is full. Before you can sign a free agent, you'll have to release or trade away one of your current players.";
    }

    const p = await idb.cache.players.get(pid);
    if (p.tid !== PLAYER.FREE_AGENT) {
        return `${p.firstName} ${p.lastName} is not a free agent.`;
    }

    // Initial player proposal;
    const playerAmount = freeAgents.amountWithMood(
        p.contract.amount,
        p.freeAgentMood[g.userTid],
    );
    let playerYears = p.contract.exp - g.season;
    // Adjust to account for in-season signings;
    if (g.phase <= PHASE.AFTER_TRADE_DEADLINE) {
        playerYears += 1;
    }

    if (helpers.refuseToNegotiate(playerAmount, p.freeAgentMood[g.userTid])) {
        return `<a href="${helpers.leagueUrl(["player", p.pid])}">${
            p.firstName
        } ${
            p.lastName
        }</a> refuses to sign with you, no matter what you offer.`;
    }

    const negotiation = {
        pid,
        tid,
        team: { amount: playerAmount, years: playerYears },
        player: { amount: playerAmount, years: playerYears },
        orig: { amount: playerAmount, years: playerYears },
        resigning,
    };

    await idb.cache.negotiations.add(negotiation);
    await updateStatus("Contract negotiation");
    await updatePlayMenu();
};

export default create;
