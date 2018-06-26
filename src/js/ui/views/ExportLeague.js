import React from "react";
import { helpers, setTitle, toWorker } from "../util";
import { DownloadDataLink } from "../components";

const categories = [
    {
        objectStores: "players,releasedPlayers,awards",
        name: "Players",
        desc: "All player info, ratings, stats, and awards",
        checked: true,
    },
    {
        objectStores: "teams,teamSeasons,teamStats",
        name: "Teams",
        desc: "All team info and stats.",
        checked: true,
    },
    {
        objectStores: "schedule,playoffSeries",
        name: "Schedule",
        desc: "Current regular season schedule and playoff series.",
        checked: true,
    },
    {
        objectStores: "draftPicks",
        name: "Draft Picks",
        desc: "Traded draft picks.",
        checked: true,
    },
    {
        objectStores:
            "trade,negotiations,gameAttributes,draftLotteryResults,messages,events,playerFeats",
        name: "Game State",
        desc:
            "Interactions with the owner, current contract negotiations, current game phase, etc. Useful for saving or backing up a game, but not for creating custom rosters to share.",
        checked: true,
    },
    {
        objectStores: "games",
        name: "Box Scores",
        desc:
            "Box scores from multiple seasons take up tons of space, but by default only one season is saved.",
        checked: false,
    },
];

class ExportLeague extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data: null,
            filename: null,
            status: null,
        };
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    async handleSubmit(e) {
        e.preventDefault();

        this.setState({
            data: null,
            filename: null,
            status: "Generating...",
        });

        // Get array of object stores to export
        const objectStores = Array.from(e.target.getElementsByTagName("input"))
            .filter(input => input.checked)
            .map(input => input.value)
            .join(",")
            .split(",");

        const { data, filename } = await toWorker("exportLeague", objectStores);
        let json;
        try {
            json = JSON.stringify(data, undefined, 2);
        } catch (err) {
            this.setState({
                data: null,
                filename: null,
                status: (
                    <span className="text-danger">
                        Error converting league to JSON: "{err.message}". You
                        might have to select less things to export or{" "}
                        <a href={helpers.leagueUrl(["delete_old_data"])}>
                            delete old data
                        </a>{" "}
                        before exporting.
                    </span>
                ),
            });
            return;
        }

        this.setState({
            data: json,
            filename,
            status: null,
        });
    }

    render() {
        setTitle("Export League");

        return (
            <div>
                <h1>Export League</h1>

                <p>
                    Here you can export your entire league data to a single
                    League File. A League File can serve many purposes. You can
                    use it as a <b>backup</b>, to{" "}
                    <b>copy a league from one computer to another</b>, or to use
                    as the base for a <b>custom roster file</b> to share with
                    others. Select as much or as little information as you want
                    to export, since any missing information will be filled in
                    with default values when it is used.{" "}
                    <a href="http://basketball-gm.com/manual/customization/">
                        Read the manual for more info.
                    </a>
                </p>

                <form onSubmit={this.handleSubmit}>
                    {categories.map(cat => (
                        <div key={cat.name} className="checkbox">
                            <label>
                                <input
                                    type="checkbox"
                                    value={cat.objectStores}
                                    defaultChecked={cat.checked}
                                />{" "}
                                {cat.name}
                                <p className="help-block">{cat.desc}</p>
                            </label>
                        </div>
                    ))}
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={this.state.generating}
                    >
                        Export League
                    </button>
                </form>

                <p style={{ marginTop: "1em" }}>
                    <DownloadDataLink
                        data={this.state.data}
                        downloadText="Download Exported League File"
                        mimeType="application/json"
                        filename={this.state.filename}
                        status={this.state.status}
                    />
                </p>
            </div>
        );
    }
}

export default ExportLeague;
