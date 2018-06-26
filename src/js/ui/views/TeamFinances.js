import PropTypes from "prop-types";
import React from "react";
import { getCols, helpers, logEvent, setTitle, toWorker } from "../util";
import {
    BarGraph,
    DataTable,
    Dropdown,
    HelpPopover,
    NewWindowLink,
    PlayerNameLabels,
} from "../components";

class FinancesForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            dirty: false,
            coaching: props.t.budget.coaching.amount,
            facilities: props.t.budget.facilities.amount,
            health: props.t.budget.health.amount,
            saving: false,
            scouting: props.t.budget.scouting.amount,
            ticketPrice: props.t.budget.ticketPrice.amount,
        };
        this.handleChanges = {
            coaching: this.handleChange.bind(this, "coaching"),
            facilities: this.handleChange.bind(this, "facilities"),
            health: this.handleChange.bind(this, "health"),
            scouting: this.handleChange.bind(this, "scouting"),
            ticketPrice: this.handleChange.bind(this, "ticketPrice"),
        };
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        if (!prevState.dirty) {
            return {
                coaching: nextProps.t.budget.coaching.amount,
                facilities: nextProps.t.budget.facilities.amount,
                health: nextProps.t.budget.health.amount,
                scouting: nextProps.t.budget.scouting.amount,
                ticketPrice: nextProps.t.budget.ticketPrice.amount,
            };
        }
    }

    handleChange(name, e) {
        this.setState({
            dirty: true,
            [name]: e.target.value,
        });
    }

    async handleSubmit(e) {
        e.preventDefault();

        this.setState({ saving: true });

        const budgetAmounts = {
            // Convert from [millions of dollars] to [thousands of dollars] rounded to the nearest $10k
            coaching: helpers.bound(
                Math.round(this.state.coaching * 100) * 10,
                0,
                Infinity,
            ),
            facilities: helpers.bound(
                Math.round(this.state.facilities * 100) * 10,
                0,
                Infinity,
            ),
            health: helpers.bound(
                Math.round(this.state.health * 100) * 10,
                0,
                Infinity,
            ),
            scouting: helpers.bound(
                Math.round(this.state.scouting * 100) * 10,
                0,
                Infinity,
            ),

            // Already in [dollars]
            ticketPrice: helpers.bound(
                parseFloat(parseFloat(this.state.ticketPrice).toFixed(2)),
                0,
                Infinity,
            ),
        };

        await toWorker("updateBudget", budgetAmounts);

        logEvent({
            type: "success",
            text: "Team finances updated.",
            saveToDb: false,
        });

        this.setState({
            dirty: false,
            saving: false,
        });
    }

    render() {
        const { gamesInProgress, t, tid, userTid } = this.props;

        const warningMessage = (
            <p className="text-danger">
                {gamesInProgress && tid === userTid
                    ? "Stop game simulation to edit."
                    : null}
            </p>
        );

        const formDisabled = gamesInProgress || tid !== userTid;

        return (
            <form onSubmit={this.handleSubmit}>
                <h4>
                    Revenue Settings{" "}
                    <HelpPopover placement="bottom" title="Revenue Settings">
                        Set your ticket price too high, and attendance will
                        decrease and some fans will resent you for it. Set it
                        too low, and you're not maximizing your profit.
                    </HelpPopover>
                </h4>
                {warningMessage}
                <div className="row">
                    <div className="pull-left finances-settings-label">
                        Ticket Price
                    </div>
                    <div className="input-group input-group-sm pull-left finances-settings-field">
                        <span className="input-group-addon">$</span>
                        <input
                            type="text"
                            className="form-control"
                            disabled={formDisabled}
                            onChange={this.handleChanges.ticketPrice}
                            value={this.state.ticketPrice}
                        />
                    </div>
                    <div className="pull-left finances-settings-text">
                        Leaguewide rank: #{t.budget.ticketPrice.rank}
                    </div>
                </div>
                <p />
                <h4>
                    Expense Settings{" "}
                    <HelpPopover placement="bottom" title="Expense Settings">
                        <p>
                            Scouting: Controls the accuracy of displayed player
                            ratings.
                        </p>
                        <p>
                            Coaching: Better coaches mean better player
                            development.
                        </p>
                        <p>
                            Health: A good team of doctors speeds recovery from
                            injuries.
                        </p>
                        <p>
                            Facilities: Better training facilities make your
                            players happier and other players envious; stadium
                            renovations increase attendance.
                        </p>
                    </HelpPopover>
                </h4>
                {warningMessage}
                <div className="row">
                    <div className="pull-left finances-settings-label">
                        Scouting
                    </div>
                    <div className="input-group input-group-sm pull-left finances-settings-field">
                        <span className="input-group-addon">$</span>
                        <input
                            type="text"
                            className="form-control"
                            disabled={formDisabled}
                            onChange={this.handleChanges.scouting}
                            value={this.state.scouting}
                        />
                        <span className="input-group-addon">M</span>
                    </div>
                    <div className="pull-left finances-settings-text-small">
                        Current spending rate: #{t.budget.scouting.rank}
                        <br />Spent this season: #{
                            t.seasonAttrs.expenses.scouting.rank
                        }
                    </div>
                </div>
                <div className="row">
                    <div className="pull-left finances-settings-label">
                        Coaching
                    </div>
                    <div className="input-group input-group-sm pull-left finances-settings-field">
                        <span className="input-group-addon">$</span>
                        <input
                            type="text"
                            className="form-control"
                            disabled={formDisabled}
                            onChange={this.handleChanges.coaching}
                            value={this.state.coaching}
                        />
                        <span className="input-group-addon">M</span>
                    </div>
                    <div className="pull-left finances-settings-text-small">
                        Current spending rate: #{t.budget.coaching.rank}
                        <br />Spent this season: #{
                            t.seasonAttrs.expenses.coaching.rank
                        }
                    </div>
                </div>
                <div className="row">
                    <div className="pull-left finances-settings-label">
                        Health
                    </div>
                    <div className="input-group input-group-sm pull-left finances-settings-field">
                        <span className="input-group-addon">$</span>
                        <input
                            type="text"
                            className="form-control"
                            disabled={formDisabled}
                            onChange={this.handleChanges.health}
                            value={this.state.health}
                        />
                        <span className="input-group-addon">M</span>
                    </div>
                    <div className="pull-left finances-settings-text-small">
                        Current spending rate: #{t.budget.health.rank}
                        <br />Spent this season: #{
                            t.seasonAttrs.expenses.health.rank
                        }
                    </div>
                </div>
                <div className="row">
                    <div className="pull-left finances-settings-label">
                        Facilities
                    </div>
                    <div className="input-group input-group-sm pull-left finances-settings-field">
                        <span className="input-group-addon">$</span>
                        <input
                            type="text"
                            className="form-control"
                            disabled={formDisabled}
                            onChange={this.handleChanges.facilities}
                            value={this.state.facilities}
                        />
                        <span className="input-group-addon">M</span>
                    </div>
                    <div className="pull-left finances-settings-text-small">
                        Current spending rate: #{t.budget.facilities.rank}
                        <br />Spent this season: #{
                            t.seasonAttrs.expenses.facilities.rank
                        }
                    </div>
                </div>
                <br />
                {tid === userTid ? (
                    <div className="row">
                        <div className="pull-left finances-settings-label">
                            &nbsp;
                        </div>
                        <div className="input-group input-group-sm pull-left finances-settings-field">
                            <button
                                className="btn btn-large btn-primary"
                                disabled={formDisabled || this.state.saving}
                                style={{ lineHeight: "1.5em" }}
                            >
                                <span>
                                    Save Revenue and<br />Expense Settings
                                </span>
                            </button>
                        </div>
                    </div>
                ) : null}
            </form>
        );
    }
}

FinancesForm.propTypes = {
    gamesInProgress: PropTypes.bool.isRequired,
    t: PropTypes.object.isRequired,
    tid: PropTypes.number.isRequired,
    userTid: PropTypes.number.isRequired,
};

const TeamFinances = ({
    abbrev,
    barData,
    barSeasons,
    contractTotals,
    contracts,
    gamesInProgress,
    luxuryPayroll,
    luxuryTax,
    maxStadiumCapacity,
    minContract,
    minPayroll,
    numGames,
    payroll,
    salariesSeasons,
    salaryCap,
    show,
    t,
    tid,
    userTid,
}) => {
    setTitle(`${t.region} ${t.name} Finances`);

    const cols = getCols("Name").concat(
        salariesSeasons.map(season => {
            return {
                title: String(season),
                sortSequence: ["desc", "asc"],
                sortType: "currency",
            };
        }),
    );

    const rows = contracts.map(p => {
        const data = [
            <PlayerNameLabels
                injury={p.injury}
                pid={p.pid}
                skills={p.skills}
                style={{ fontStyle: p.released ? "italic" : "normal" }}
                watch={p.watch}
            >
                {p.firstName} {p.lastName}
            </PlayerNameLabels>,
        ];

        // Loop through the salaries for the next five years for this player.
        for (let i = 0; i < 5; i++) {
            if (p.amounts[i]) {
                const formattedAmount = helpers.formatCurrency(
                    p.amounts[i],
                    "M",
                );

                if (p.released) {
                    data.push(<i>{formattedAmount}</i>);
                } else {
                    data.push(formattedAmount);
                }
            } else {
                data.push(null);
            }
        }

        return {
            key: p.pid,
            data,
        };
    });

    function highlightZeroNegative(amount) {
        const formattedValue = helpers.formatCurrency(amount, "M");

        if (amount === 0) {
            return { classNames: "text-muted", value: formattedValue };
        }
        if (amount < 0) {
            return { classNames: "text-danger", value: formattedValue };
        }

        return formattedValue;
    }

    const footer = [
        ["Totals"].concat(
            contractTotals.map(amount => highlightZeroNegative(amount)),
        ),
        ["Free Cap Space"].concat(
            contractTotals.map(amount =>
                highlightZeroNegative(salaryCap - amount),
            ),
        ),
    ];

    return (
        <div>
            <Dropdown
                view="team_finances"
                fields={["teams", "shows"]}
                values={[abbrev, show]}
            />
            <h1>
                {t.region} {t.name} Finances <NewWindowLink />
            </h1>

            <p>
                More: <a href={helpers.leagueUrl(["roster", abbrev])}>Roster</a>{" "}
                | <a href={helpers.leagueUrl(["game_log", abbrev])}>Game Log</a>{" "}
                |{" "}
                <a href={helpers.leagueUrl(["team_history", abbrev])}>
                    History
                </a>{" "}
                |{" "}
                <a href={helpers.leagueUrl(["transactions", abbrev])}>
                    Transactions
                </a>
            </p>

            <p className="clearfix">
                The current payroll (<b>
                    {helpers.formatCurrency(payroll, "M")}
                </b>) is {payroll > minPayroll ? "above" : "below"} the minimum
                payroll limit (<b>{helpers.formatCurrency(minPayroll, "M")}</b>),{" "}
                {payroll > salaryCap ? "above" : "below"} the salary cap (<b>
                    {helpers.formatCurrency(salaryCap, "M")}
                </b>), and {payroll > luxuryPayroll ? "above" : "below"} the
                luxury tax limit (<b>
                    {helpers.formatCurrency(luxuryPayroll, "M")}
                </b>).{" "}
                <HelpPopover placement="bottom" title="Payroll Limits">
                    The salary cap is a soft cap, meaning that you can exceed it
                    to re-sign your own players or to sign free agents to
                    minimum contracts (${minContract}k/year); however, you
                    cannot exceed the salary cap to sign a free agent for more
                    than the minimum. Teams with payrolls below the minimum
                    payroll limit will be assessed a fine equal to the
                    difference at the end of the season. Teams with payrolls
                    above the luxury tax limit will be assessed a fine equal to{" "}
                    {luxuryTax} times the difference at the end of the season.
                </HelpPopover>
            </p>

            <div className="row">
                <div className="col-md-3 col-sm-2">
                    <h4>Wins</h4>
                    <div className="bar-graph-small">
                        <BarGraph
                            data={barData.won}
                            labels={barSeasons}
                            ylim={[0, numGames]}
                        />
                    </div>
                    <br />
                    <br />
                    <h4>
                        Hype{" "}
                        <HelpPopover placement="right" title="Hype">
                            "Hype" refers to fans' interest in your team. If
                            your team is winning or improving, then hype
                            increases; if your team is losing or stagnating,
                            then hype decreases. Hype influences attendance,
                            various revenue sources such as merchandising, and
                            the attitude players have towards your organization.
                        </HelpPopover>
                    </h4>
                    <div id="bar-graph-hype" className="bar-graph-small">
                        <BarGraph
                            data={barData.hype}
                            labels={barSeasons}
                            tooltipCb={val => val.toFixed(2)}
                            ylim={[0, 1]}
                        />
                    </div>
                    <br />
                    <br />
                    <h4>Region Population</h4>
                    <div id="bar-graph-pop" className="bar-graph-small">
                        <BarGraph
                            data={barData.pop}
                            labels={barSeasons}
                            tooltipCb={val => `${val.toFixed(1)}M`}
                            ylim={[0, 20]}
                        />
                    </div>
                    <br />
                    <br />
                    <h4>Average Attendance</h4>
                    <div id="bar-graph-att" className="bar-graph-small">
                        <BarGraph
                            data={barData.att}
                            labels={barSeasons}
                            tooltipCb={val =>
                                helpers.numberWithCommas(Math.round(val))
                            }
                            ylim={[0, maxStadiumCapacity]}
                        />
                    </div>
                </div>
                <div className="col-md-4 col-sm-4">
                    <h4>Revenue</h4>
                    <div id="bar-graph-revenue" className="bar-graph-large">
                        <BarGraph
                            data={[
                                barData.revenues.nationalTv,
                                barData.revenues.localTv,
                                barData.revenues.ticket,
                                barData.revenues.sponsor,
                                barData.revenues.merch,
                                barData.revenues.luxuryTaxShare,
                            ]}
                            labels={[
                                barSeasons,
                                [
                                    "national TV revenue",
                                    "local TV revenue",
                                    "ticket revenue",
                                    "corporate sponsorship revenue",
                                    "merchandising revenue",
                                    "luxury tax share revenue",
                                ],
                            ]}
                            tooltipCb={val =>
                                helpers.formatCurrency(val / 1000, "M", 1)
                            }
                        />
                    </div>
                    <br />
                    <br />
                    <h4>Expenses</h4>
                    <div id="bar-graph-expenses" className="bar-graph-large">
                        <BarGraph
                            data={[
                                barData.expenses.salary,
                                barData.expenses.minTax,
                                barData.expenses.luxuryTax,
                                barData.expenses.scouting,
                                barData.expenses.coaching,
                                barData.expenses.health,
                                barData.expenses.facilities,
                            ]}
                            labels={[
                                barSeasons,
                                [
                                    "player salaries",
                                    "minimum payroll tax",
                                    "luxury tax",
                                    "scouting",
                                    "coaching",
                                    "health",
                                    "facilities",
                                ],
                            ]}
                            tooltipCb={val =>
                                helpers.formatCurrency(val / 1000, "M", 1)
                            }
                        />
                    </div>
                    <br />
                    <br />
                    <h4>Cash (cumulative)</h4>
                    <div id="bar-graph-cash" className="bar-graph-medium">
                        <BarGraph
                            data={barData.cash}
                            labels={barSeasons}
                            tooltipCb={val =>
                                helpers.formatCurrency(val, "M", 1)
                            }
                        />
                    </div>
                </div>
                <div className="col-md-5 col-sm-6">
                    <FinancesForm
                        gamesInProgress={gamesInProgress}
                        t={t}
                        tid={tid}
                        userTid={userTid}
                    />
                </div>
            </div>
            <p className="clearfix" />

            <h2>Player Salaries</h2>

            <p>
                You can release players from{" "}
                <a href={helpers.leagueUrl(["roster"])}>your roster</a>.
                Released players who are still owed money are{" "}
                <i>shown in italics</i>.
            </p>

            <DataTable
                cols={cols}
                defaultSort={[1, "desc"]}
                name="TeamFinances"
                footer={footer}
                rows={rows}
            />
        </div>
    );
};

TeamFinances.propTypes = {
    abbrev: PropTypes.string.isRequired,
    barData: PropTypes.object.isRequired,
    barSeasons: PropTypes.arrayOf(PropTypes.number).isRequired,
    contractTotals: PropTypes.arrayOf(PropTypes.number).isRequired,
    contracts: PropTypes.arrayOf(PropTypes.object).isRequired,
    gamesInProgress: PropTypes.bool.isRequired,
    luxuryPayroll: PropTypes.number.isRequired,
    luxuryTax: PropTypes.number.isRequired,
    maxStadiumCapacity: PropTypes.number.isRequired,
    minContract: PropTypes.number.isRequired,
    minPayroll: PropTypes.number.isRequired,
    numGames: PropTypes.number.isRequired,
    payroll: PropTypes.number.isRequired,
    salariesSeasons: PropTypes.arrayOf(PropTypes.number).isRequired,
    salaryCap: PropTypes.number.isRequired,
    show: PropTypes.oneOf(["10", "all"]).isRequired,
    t: PropTypes.object.isRequired,
    tid: PropTypes.number.isRequired,
    userTid: PropTypes.number.isRequired,
};

export default TeamFinances;
