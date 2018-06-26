// @flow

import { PHASE } from "../../../common";
import { g } from "../../util";
import type {
    Player,
    PlayerContract,
    PlayerWithoutPid,
} from "../../../common/types";

/**
 * Store a contract in a player object.
 *
 * @memberOf core.player
 * @param {Object} p Player object.
 * @param {Object} contract Contract object with two properties,    exp (year) and amount (thousands of dollars).
 * @param {boolean} signed Is this an official signed contract (true), or just part of a negotiation (false)?
 * @return {Object} Updated player object.
 */
const setContract = (
    p: Player | PlayerWithoutPid,
    contract: PlayerContract,
    signed: boolean,
) => {
    p.contract = contract;

    // Only write to salary log if the player is actually signed. Otherwise, we're just generating a value for a negotiation.
    if (signed) {
        // Is this contract beginning with an in-progress season, or next season?
        let start = g.season;
        if (g.phase > PHASE.AFTER_TRADE_DEADLINE) {
            start += 1;
        }

        for (let i = start; i <= p.contract.exp; i++) {
            p.salaries.push({ season: i, amount: contract.amount });
        }
    }
};

export default setContract;
