import classNames from "classnames";
import PropTypes from "prop-types";
import React from "react";
import { getCols, helpers, setTitle, toWorker } from "../util";
import {
    DataTable,
    DraftAbbrev,
    NewWindowLink,
    PlayerNameLabels,
} from "../components";

const DraftButtons = ({ userRemaining, usersTurn }) => {
    const untilText = userRemaining ? "your next pick" : "end of draft";
    return (
        <div className="btn-group">
            <button
                className="btn btn-default"
                disabled={usersTurn}
                onClick={async () => {
                    await toWorker("actions.playMenu.onePick");
                }}
            >
                Sim one pick
            </button>
            <button
                className="btn btn-default"
                disabled={usersTurn}
                onClick={async () => {
                    await toWorker("actions.playMenu.untilYourNextPick");
                }}
            >
                Sim until {untilText}
            </button>
        </div>
    );
};

DraftButtons.propTypes = {
    userRemaining: PropTypes.bool.isRequired,
    usersTurn: PropTypes.bool.isRequired,
};

const TradeButton = ({ disabled, dpid, tid, visible }) => {
    return visible ? (
        <button
            className="btn btn-xs btn-default"
            disabled={disabled}
            onClick={async () => {
                await toWorker("actions.tradeFor", { dpid, tid });
            }}
        >
            Trade For Pick
        </button>
    ) : null;
};

TradeButton.propTypes = {
    disabled: PropTypes.bool.isRequired,
    dpid: PropTypes.number.isRequired,
    tid: PropTypes.number.isRequired,
    visible: PropTypes.bool.isRequired,
};

const scrollLeft = (pos: number) => {
    // https://blog.hospodarets.com/native_smooth_scrolling
    if ("scrollBehavior" in document.documentElement.style) {
        window.scrollTo({
            left: pos,
            top: document.body.scrollTop,
            behavior: "smooth",
        });
    } else {
        window.scrollTo(pos, document.body.scrollTop);
    }
};

const viewDrafted = () => {
    scrollLeft(document.body.scrollWidth - document.body.clientWidth);
};
const viewUndrafted = () => {
    scrollLeft(0);
};

class Draft extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            drafting: false,
        };
    }

    async draftUser(pid, simToNextUserPick = false) {
        this.setState({ drafting: true });
        await toWorker("draftUser", pid);
        this.setState({ drafting: false });

        if (simToNextUserPick) {
            await toWorker("actions.playMenu.untilYourNextPick");
        }
    }

    render() {
        const { drafted, fantasyDraft, undrafted, userTids } = this.props;

        setTitle("Draft");

        const remainingPicks = drafted.filter(p => p.pid < 0);
        const nextPick = remainingPicks[0];
        const usersTurn = nextPick && userTids.includes(nextPick.draft.tid);
        const userRemaining = remainingPicks.some(p =>
            userTids.includes(p.draft.tid),
        );

        const colsUndrafted = getCols(
            "Name",
            "Pos",
            "Age",
            "Ovr",
            "Pot",
            "Draft",
        );
        colsUndrafted[0].width = "100%";

        if (fantasyDraft) {
            colsUndrafted.splice(5, 0, ...getCols("Contract", "PER", "EWA"));
        }

        const rowsUndrafted = undrafted.map(p => {
            const data = [
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
                <div className="btn-group" style={{ display: "flex" }}>
                    <button
                        className="btn btn-xs btn-primary"
                        disabled={!usersTurn || this.state.drafting}
                        onClick={() => this.draftUser(p.pid)}
                        title="Draft player"
                    >
                        Draft
                    </button>
                    <button
                        className="btn btn-xs btn-default"
                        disabled={!usersTurn || this.state.drafting}
                        onClick={() => this.draftUser(p.pid, true)}
                        title="Draft player and sim to your next pick or end of draft"
                    >
                        And Sim
                    </button>
                </div>,
            ];

            if (fantasyDraft) {
                data.splice(
                    5,
                    0,
                    `${helpers.formatCurrency(p.contract.amount, "M")} thru ${
                        p.contract.exp
                    }`,
                    p.stats.per.toFixed(1),
                    p.stats.ewa.toFixed(1),
                );
            }

            return {
                key: p.pid,
                data,
            };
        });

        const colsDrafted = getCols("Pick", "Team").concat(
            colsUndrafted.slice(0, -1),
        );

        const rowsDrafted = drafted.map((p, i) => {
            const data = [
                `${p.draft.round}-${p.draft.pick}`,
                <DraftAbbrev
                    originalTid={p.draft.originalTid}
                    tid={p.draft.tid}
                >
                    {p.draft.tid} {p.draft.originalTid}
                </DraftAbbrev>,
                p.pid >= 0 ? (
                    <PlayerNameLabels
                        pid={p.pid}
                        injury={p.injury}
                        skills={p.ratings.skills}
                        watch={p.watch}
                    >
                        {p.name}
                    </PlayerNameLabels>
                ) : (
                    <TradeButton
                        dpid={p.draft.dpid}
                        disabled={this.state.drafting}
                        tid={p.draft.tid}
                        visible={
                            !fantasyDraft && !userTids.includes(p.draft.tid)
                        }
                    />
                ),
                p.pid >= 0 ? p.ratings.pos : null,
                p.pid >= 0 ? p.age : null,
                p.pid >= 0 ? p.ratings.ovr : null,
                p.pid >= 0 ? p.ratings.pot : null,
            ];

            if (fantasyDraft) {
                data.splice(
                    7,
                    0,
                    p.pid >= 0
                        ? `${helpers.formatCurrency(
                              p.contract.amount,
                              "M",
                          )} thru ${p.contract.exp}`
                        : null,
                    // Not sure why these extra checks for PER and EWA being numeric are needed, bug Bugsnag showed errors
                    p.pid >= 0 && p.stats && typeof p.stats.per === "number"
                        ? p.stats.per.toFixed(1)
                        : null,
                    p.pid >= 0 && p.stats && typeof p.stats.ewa === "number"
                        ? p.stats.ewa.toFixed(1)
                        : null,
                );
            }

            return {
                key: i,
                data,
                classNames: { info: userTids.includes(p.draft.tid) },
            };
        });

        const buttonClasses = classNames("btn", "btn-info", "btn-xs", {
            "visible-xs": !fantasyDraft,
        });

        const wrapperClasses = classNames(
            "row",
            "row-offcanvas",
            "row-offcanvas-right",
            {
                "row-offcanvas-force": fantasyDraft,
                "row-offcanvas-right-force": fantasyDraft,
            },
        );

        const colClass = fantasyDraft ? "col-xs-12" : "col-sm-6";
        const undraftedColClasses = classNames(colClass);
        const draftedColClasses = classNames("sidebar-offcanvas", colClass, {
            "sidebar-offcanvas-force": fantasyDraft,
        });

        return (
            <div>
                <h1>
                    Draft <NewWindowLink />
                </h1>

                <p>
                    More:{" "}
                    <a href={helpers.leagueUrl(["draft_scouting"])}>
                        Future Draft Scouting
                    </a>{" "}
                    |{" "}
                    <a href={helpers.leagueUrl(["draft_summary"])}>
                        Draft Summary
                    </a>{" "}
                    |{" "}
                    <a href={helpers.leagueUrl(["draft_lottery"])}>
                        Draft Lottery
                    </a>{" "}
                    |{" "}
                    <a href={helpers.leagueUrl(["draft_team_history"])}>
                        Team History
                    </a>
                </p>

                <p>
                    When your turn in the draft comes up, select from the list
                    of available players on the left.
                </p>

                <DraftButtons
                    userRemaining={userRemaining}
                    usersTurn={usersTurn}
                />

                <div className={wrapperClasses}>
                    <div className={undraftedColClasses}>
                        <h2>
                            Undrafted Players
                            <span className="pull-right">
                                <button
                                    type="button"
                                    className={buttonClasses}
                                    onClick={viewDrafted}
                                >
                                    View Drafted
                                </button>
                            </span>
                        </h2>

                        <DataTable
                            cols={colsUndrafted}
                            defaultSort={[4, "desc"]}
                            name="Draft:Undrafted"
                            rows={rowsUndrafted}
                        />
                    </div>
                    <div className={draftedColClasses}>
                        <h2>
                            Draft Results
                            <span className="pull-right">
                                <button
                                    type="button"
                                    className={buttonClasses}
                                    onClick={viewUndrafted}
                                >
                                    View Undrafted
                                </button>
                            </span>
                        </h2>

                        <DataTable
                            cols={colsDrafted}
                            defaultSort={[0, "asc"]}
                            name="Draft:Drafted"
                            rows={rowsDrafted}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

Draft.propTypes = {
    drafted: PropTypes.arrayOf(PropTypes.object).isRequired,
    fantasyDraft: PropTypes.bool.isRequired,
    undrafted: PropTypes.arrayOf(PropTypes.object).isRequired,
    userTids: PropTypes.arrayOf(PropTypes.number).isRequired,
};

export default Draft;
