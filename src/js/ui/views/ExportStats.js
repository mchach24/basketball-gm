import PropTypes from "prop-types";
import React from "react";
import { setTitle, toWorker } from "../util";
import { DownloadDataLink } from "../components";

function genFilename(leagueName, season, grouping) {
    const filename = `BBGM_${leagueName.replace(
        /[^a-z0-9]/gi,
        "_",
    )}_${season}_${season === "all" ? "seasons" : "season"}_${
        grouping === "averages" ? "Average_Stats" : "Game_Stats"
    }`;

    return `${filename}.csv`;
}

class ExportStats extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data: null,
            filename: null,
            status: null,
        };
        this.handleSubmit = this.handleSubmit.bind(this);
        this.resetState = this.resetState.bind(this);
    }

    async handleSubmit(e) {
        e.preventDefault();

        this.setState({
            data: null,
            filename: null,
            status: "Generating...",
        });

        // Get array of object stores to export
        const selectEls = e.target.getElementsByTagName("select");
        const grouping = selectEls[0].value;
        const season =
            selectEls[1].value === "all"
                ? "all"
                : parseInt(selectEls[1].value, 10);

        let csvPromise;
        if (grouping === "averages") {
            csvPromise = toWorker("exportPlayerAveragesCsv", season);
        } else if (grouping === "games") {
            csvPromise = toWorker("exportPlayerGamesCsv", season);
        } else {
            this.setState({
                data: null,
                filename: null,
                status: "Invalid grouping selected",
            });
            return;
        }

        const [data, leagueName] = await Promise.all([
            csvPromise,
            toWorker("getLeagueName"),
        ]);

        const filename = genFilename(leagueName, season, grouping);

        this.setState({
            data,
            filename,
            status: null,
        });
    }

    resetState() {
        this.setState({
            data: null,
            filename: null,
            status: null,
        });
    }

    render() {
        setTitle("Export Stats");

        const { seasons } = this.props;

        return (
            <div>
                <h1>Export Stats</h1>

                <p>
                    Here you can export your league's stats to CSV files which
                    can be easily viewed in any spreadsheet program like Excel
                    or{" "}
                    <a href="http://www.libreoffice.org/">LibreOffice Calc</a>.
                </p>

                <h2>Player Stats</h2>

                <form className="form-inline" onSubmit={this.handleSubmit}>
                    <div className="form-group">
                        <select
                            className="form-control"
                            onChange={this.resetState}
                        >
                            <option value="averages">Season Averages</option>
                            <option value="games">Individual Games</option>
                        </select>
                    </div>{" "}
                    <div className="form-group">
                        <select
                            className="form-control"
                            onChange={this.resetState}
                        >
                            {seasons.map(s => {
                                return (
                                    <option key={s.key} value={s.key}>
                                        {s.val}
                                    </option>
                                );
                            })}
                        </select>
                    </div>{" "}
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={this.state.generating}
                    >
                        Export Stats
                    </button>
                </form>

                <p style={{ marginTop: "1em" }}>
                    <DownloadDataLink
                        data={this.state.data}
                        downloadText="Download Exported Stats"
                        filename={this.state.filename}
                        mimeType="text/csv"
                        status={this.state.status}
                    />
                </p>
            </div>
        );
    }
}

ExportStats.propTypes = {
    seasons: PropTypes.arrayOf(
        PropTypes.shape({
            key: PropTypes.string.isRequired,
            val: PropTypes.string.isRequired,
        }),
    ).isRequired,
};

export default ExportStats;
