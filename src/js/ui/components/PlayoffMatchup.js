// @flow

import PropTypes from "prop-types";
import * as React from "react";
import { helpers } from "../util";

type SeriesTeam = {
    abbrev: string,
    region: string,
    seed: number,
    tid: number,
    won?: number,
};

const PlayoffMatchup = ({
    season,
    series,
    userTid,
}: {
    season: number,
    series?: {
        away: SeriesTeam,
        home: SeriesTeam,
    },
    userTid: number,
}) => {
    if (
        series === undefined ||
        series.home === undefined ||
        series.home.tid === undefined
    ) {
        return null;
    }

    const homeWon = series.home.hasOwnProperty("won") && series.home.won === 4;
    const awayWon = series.away.hasOwnProperty("won") && series.away.won === 4;

    return (
        <div>
            <span
                className={series.home.tid === userTid ? "bg-info" : ""}
                style={{ fontWeight: homeWon ? "bold" : "normal" }}
            >
                {series.home.seed}.{" "}
                <a
                    href={helpers.leagueUrl([
                        "roster",
                        series.home.abbrev,
                        season,
                    ])}
                >
                    {series.home.region}
                </a>
                {series.home.hasOwnProperty("won") ? (
                    <span> {series.home.won}</span>
                ) : null}
            </span>
            <br />

            <span
                className={series.away.tid === userTid ? "bg-info" : ""}
                style={{ fontWeight: awayWon ? "bold" : "normal" }}
            >
                {series.away.seed}.{" "}
                <a
                    href={helpers.leagueUrl([
                        "roster",
                        series.away.abbrev,
                        season,
                    ])}
                >
                    {series.away.region}
                </a>
                {series.away.hasOwnProperty("won") ? (
                    <span> {series.away.won}</span>
                ) : null}
            </span>
        </div>
    );
};

PlayoffMatchup.propTypes = {
    season: PropTypes.number.isRequired,
    series: PropTypes.shape({
        away: PropTypes.shape({
            abbrev: PropTypes.string.isRequired,
            region: PropTypes.string.isRequired,
            seed: PropTypes.number.isRequired,
            tid: PropTypes.number.isRequired,
            won: PropTypes.number,
        }),
        home: PropTypes.shape({
            abbrev: PropTypes.string.isRequired,
            region: PropTypes.string.isRequired,
            seed: PropTypes.number.isRequired,
            tid: PropTypes.number.isRequired,
            won: PropTypes.number,
        }),
    }),
    userTid: PropTypes.number.isRequired,
};

export default PlayoffMatchup;
