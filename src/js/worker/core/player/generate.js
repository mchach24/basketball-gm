// @flow

import faces from "facesjs";
import { PLAYER } from "../../../common";
import genFuzz from "./genFuzz";
import genContract from "./genContract";
import heightToRating from "./heightToRating";
import limitRating from "./limitRating";
import name from "./name";
import pos from "./pos";
import setContract from "./setContract";
import { g, helpers, random } from "../../util";
import type {
    PlayerRatings,
    PlayerWithoutPid,
    RatingKey,
} from "../../../common/types";

const typeFactors: {
    ["point" | "wing" | "big"]: {
        [key: RatingKey]: number,
    },
} = {
    point: {
        jmp: 1.65,
        spd: 1.65,
        drb: 1.5,
        pss: 1.5,
        ft: 1.4,
        fg: 1.4,
        tp: 1.4,
        oiq: 1.2,
        endu: 1.4,
    },
    wing: {
        drb: 1.2,
        dnk: 1.5,
        jmp: 1.4,
        spd: 1.4,
        ft: 1.2,
        fg: 1.2,
        tp: 1.2,
    },
    big: {
        stre: 1.2,
        ins: 1.6,
        dnk: 1.5,
        reb: 1.4,
        ft: 0.8,
        fg: 0.8,
        tp: 0.8,
        diq: 1.2,
    },
};

/**
 * Generate initial ratings for a newly-created player.
 *
 * @param {number} season [description]
 * @param {number} scoutingRank Between 1 and g.numTeams (default 30), the rank of scouting spending, probably over the past 3 years via core.finances.getRankLastThree.
 * @param {number} tid [description]
 * @return {Object} Ratings object
 */
const genRatings = (
    season: number,
    scoutingRank: number,
    tid: number,
    hgt: number,
): PlayerRatings => {
    // Pick type of player (point, wing, or big) based on height
    const randType = Math.random();
    let type;
    if (hgt >= 59) {
        // 6'10" or taller
        if (randType < 0.01) {
            type = "point";
        } else if (randType < 0.05) {
            type = "wing";
        } else {
            type = "big";
        }
    } else if (hgt <= 33) {
        // 6'3" or shorter
        if (randType < 0.1) {
            type = "wing";
        } else {
            type = "point";
        }
    } else {
        // eslint-disable-next-line no-lonely-if
        if (randType < 0.03) {
            type = "point";
        } else if (randType < 0.3) {
            type = "big";
        } else {
            type = "wing";
        }
    }

    // Tall players are less talented, and all tend towards dumb and can't shoot because they are rookies
    const rawRatings = {
        stre: 37,
        spd: 40,
        jmp: 40,
        endu: 17,
        ins: 27,
        dnk: 27,
        ft: 32,
        fg: 32,
        tp: 32,
        oiq: 22,
        diq: 22,
        drb: 37,
        pss: 37,
        reb: 37,
    };

    // For correlation across ratings, to ensure some awesome players, but athleticism and skill are independent to
    // ensure there are some who are elite in one but not the other
    const factorAthleticism = helpers.bound(random.realGauss(1, 0.2), 0.2, 1.2);
    const factorShooting = helpers.bound(random.realGauss(1, 0.2), 0.2, 1.2);
    const factorSkill = helpers.bound(random.realGauss(1, 0.2), 0.2, 1.2);
    const factorIns = helpers.bound(random.realGauss(1, 0.2), 0.2, 1.2);
    const athleticismRatings = ["stre", "spd", "jmp", "endu", "dnk"];
    const shootingRatings = ["ft", "fg", "tp"];
    const skillRatings = ["oiq", "diq", "drb", "pss", "reb"];
    // ins purposely left out

    for (const key of Object.keys(rawRatings)) {
        const typeFactor = typeFactors[type].hasOwnProperty(key)
            ? typeFactors[type][key]
            : 1;

        let factor = factorIns;
        if (athleticismRatings.includes(key)) {
            factor = factorAthleticism;
        } else if (shootingRatings.includes(key)) {
            factor = factorShooting;
        } else if (skillRatings.includes(key)) {
            factor = factorSkill;
        }

        rawRatings[key] = limitRating(
            factor * typeFactor * random.realGauss(rawRatings[key], 3),
        );
    }

    // Small chance of freakish ability in 2 categories
    /*for (let i = 0; i < 2; i++) {
        if (Math.random() < 0.2) {
            const key = random.choice(Object.keys(rawRatings));
            rawRatings[key] = limitRating(rawRatings[key] + random.realGauss(20, 5));
        }
    }*/

    const ratings = {
        stre: rawRatings.stre,
        spd: rawRatings.spd,
        jmp: rawRatings.jmp,
        endu: rawRatings.endu,
        ins: rawRatings.ins,
        dnk: rawRatings.dnk,
        ft: rawRatings.ft,
        fg: rawRatings.fg,
        tp: rawRatings.tp,
        oiq: rawRatings.oiq,
        diq: rawRatings.diq,
        drb: rawRatings.drb,
        pss: rawRatings.pss,
        reb: rawRatings.reb,
        hgt,
        fuzz: genFuzz(scoutingRank),
        ovr: 0,
        pos: "F",
        pot: 0,
        season,
        skills: [],
    };

    // Ugly hack: Tall people can't dribble/pass very well
    /*if (ratings.hgt > 40) {
        ratings.drb = limitRating(ratings.drb - (ratings.hgt - 40));
        ratings.pss = limitRating(ratings.pss - (ratings.hgt - 40));
    } else {
        ratings.drb = limitRating(ratings.drb + 10);
        ratings.pss = limitRating(ratings.pss + 10);
    }*/

    if (tid === PLAYER.UNDRAFTED_2) {
        ratings.fuzz *= Math.sqrt(2);
    } else if (tid === PLAYER.UNDRAFTED_3) {
        ratings.fuzz *= 2;
    }

    ratings.pos = pos(ratings);

    return ratings;
};

const MIN_WEIGHT = 155;
const MAX_WEIGHT = 305;

const generate = (
    tid: number,
    age: number,
    draftYear: number,
    newLeague: boolean,
    scoutingRank: number,
): PlayerWithoutPid => {
    // RealHeight is drawn from a custom probability distribution and then offset by a fraction of an inch either way
    let realHeight = Math.random() - 0.5; // Fraction of an inch
    realHeight += random.heightDist();

    const wingspanAdjust = realHeight + random.randInt(-1, 1);

    // hgt 0-100 corresponds to height 5'6" to 7'9" (Anything taller or shorter than the extremes will just get 100/0)
    const predetHgt = heightToRating(wingspanAdjust);
    realHeight = Math.round(realHeight);

    let ratings;
    if (newLeague) {
        // Create player for new league
        ratings = genRatings(g.startingSeason, scoutingRank, tid, predetHgt);
    } else {
        // Create player to be drafted
        ratings = genRatings(draftYear, scoutingRank, tid, predetHgt);
    }

    const nameInfo = name();

    const p = {
        awards: [],
        born: {
            year: g.season - age,
            loc: nameInfo.country,
        },
        college: "",
        contract: {
            // Will be set by setContract below
            amount: 0,
            exp: 0,
        },
        draft: {
            round: 0,
            pick: 0,
            tid: -1,
            originalTid: -1,
            year: draftYear,
            pot: 0,
            ovr: 0,
            skills: [],
        },
        face: faces.generate(),
        firstName: nameInfo.firstName,
        freeAgentMood: Array(g.numTeams).fill(0),
        gamesUntilTradable: 0,
        hgt: realHeight,
        hof: false,
        imgURL: "", // Custom rosters can define player image URLs to be used rather than vector faces
        injury: { type: "Healthy", gamesRemaining: 0 },
        lastName: nameInfo.lastName,
        ptModifier: 1,
        relatives: [],
        ratings: [ratings],
        retiredYear: Infinity,
        rosterOrder: 666, // Will be set later
        salaries: [],
        stats: [],
        statsTids: [],
        tid,
        watch: false,
        weight: Math.round(
            random.randInt(-20, 20) +
                ((ratings.hgt + 0.5 * ratings.stre) *
                    (MAX_WEIGHT - MIN_WEIGHT)) /
                    150 +
                MIN_WEIGHT,
        ), // Weight in pounds (from minWeight to maxWeight)
        yearsFreeAgent: 0,

        // These should be set by updateValues after player is completely done (automatic in develop)
        value: 0,
        valueNoPot: 0,
        valueFuzz: 0,
        valueNoPotFuzz: 0,
        valueWithContract: 0,
    };

    setContract(p, genContract(p), false);

    return p;
};

export default generate;
