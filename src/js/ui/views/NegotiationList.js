import PropTypes from "prop-types";
import React from "react";
import {
    DataTable,
    NewWindowLink,
    PlayerNameLabels,
    RosterSalarySummary,
} from "../components";
import { getCols, helpers, setTitle, toWorker } from "../util";

const NegotiationList = ({
    capSpace,
    minContract,
    numRosterSpots,
    players,
    userTid,
}) => {
    setTitle("Re-sign Players");

    const cols = getCols(
        "Name",
        "Pos",
        "Age",
        "Ovr",
        "Pot",
        "Min",
        "Pts",
        "Reb",
        "Ast",
        "PER",
        "Asking For",
        "Mood",
        "Negotiate",
    );

    const rows = players.map(p => {
        let negotiateButton;
        if (
            helpers.refuseToNegotiate(
                p.contract.amount * 1000,
                p.freeAgentMood[userTid],
            )
        ) {
            negotiateButton = "Refuses!";
        } else {
            negotiateButton = (
                <button
                    className="btn btn-default btn-xs"
                    onClick={() => toWorker("actions.negotiate", p.pid)}
                >
                    Negotiate
                </button>
            );
        }
        return {
            key: p.pid,
            data: [
                <PlayerNameLabels
                    pid={p.pid}
                    injury={p.injury}
                    skills={p.ratings.skills}
                    watch={p.watch}
                >
                    {p.name}
                </PlayerNameLabels>,
                p.ratings.pos,
                p.age,
                p.ratings.ovr,
                p.ratings.pot,
                p.stats.min.toFixed(1),
                p.stats.pts.toFixed(1),
                p.stats.trb.toFixed(1),
                p.stats.ast.toFixed(1),
                p.stats.per.toFixed(1),
                <span>
                    {helpers.formatCurrency(p.contract.amount, "M")} thru{" "}
                    {p.contract.exp}
                </span>,
                <div
                    title={p.mood.text}
                    style={{
                        width: "100%",
                        height: "21px",
                        backgroundColor: p.mood.color,
                    }}
                >
                    <span style={{ display: "none" }}>
                        {p.freeAgentMood[userTid]}
                    </span>
                </div>,
                negotiateButton,
            ],
        };
    });

    return (
        <div>
            <h1>
                Re-sign Players <NewWindowLink />
            </h1>
            <p>
                More:{" "}
                <a href={helpers.leagueUrl(["upcoming_free_agents"])}>
                    Upcoming Free Agents
                </a>
            </p>

            <p>
                You are allowed to go over the salary cap to re-sign your
                players before they become free agents. If you do not re-sign
                them before free agency begins, they will be free to sign with
                any team, and you won't be able to go over the salary cap to
                sign them.
            </p>

            <RosterSalarySummary
                capSpace={capSpace}
                minContract={minContract}
                numRosterSpots={numRosterSpots}
            />

            <DataTable
                cols={cols}
                defaultSort={[10, "desc"]}
                name="NegotiationList"
                rows={rows}
            />
        </div>
    );
};

NegotiationList.propTypes = {
    capSpace: PropTypes.number.isRequired,
    minContract: PropTypes.number.isRequired,
    numRosterSpots: PropTypes.number.isRequired,
    players: PropTypes.arrayOf(PropTypes.object).isRequired,
    userTid: PropTypes.number.isRequired,
};

export default NegotiationList;
