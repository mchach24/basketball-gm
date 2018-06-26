// @flow

import PropTypes from "prop-types";
import * as React from "react";
import { Provider } from "unstated";
import {
    ads,
    emitter,
    local,
    realtimeUpdate,
    setTitle,
    toWorker,
} from "../util";
import {
    Footer,
    Header,
    LeagueWrapper,
    MultiTeamMenu,
    NagModal,
    NavBar,
} from ".";
import type { GetOutput, PageCtx, UpdateEvents } from "../../common/types";

type Props = {
    Component: any,
    data: any,
    updating: boolean,
};

class LeagueContent extends React.Component<Props> {
    // eslint-disable-next-line class-methods-use-this
    shouldComponentUpdate(nextProps) {
        return !nextProps.updating;
    }

    render() {
        const { Component, data } = this.props;

        return <Component {...data} />;
    }
}

LeagueContent.propTypes = {
    Component: PropTypes.func.isRequired,
    data: PropTypes.object.isRequired,
    updating: PropTypes.bool.isRequired,
};

const showAd = (type: "modal", autoPlaySeasons: number) => {
    if (type === "modal") {
        if (!window.enableLogging) {
            return;
        }

        if (window.inIframe) {
            return;
        }

        // No ads during multi season auto sim
        if (autoPlaySeasons > 0) {
            return;
        }

        // No ads for Gold members
        if (local.state.gold) {
            return;
        }

        const r = Math.random();
        if (r < 0.96) {
            ads.showGcs();
        } else {
            ads.showModal();
        }
    }
};

type Args = {
    Component: any,
    id: string,
    inLeague: boolean,
    get: (ctx: PageCtx) => ?GetOutput,
};

type State = {
    Component: any,
    idLoaded?: string,
    idLoading?: string,
    inLeague: boolean,
    data: { [key: string]: any },
    showNagModal: boolean,
};

class Controller extends React.Component<{}, State> {
    closeNagModal: Function;

    get: Function;

    updatePage: Function;

    updateState: Function;

    constructor(props: {}) {
        super(props);
        this.state = {
            Component: undefined,
            idLoaded: undefined,
            idLoading: undefined,
            inLeague: false,
            data: {},
            showNagModal: false,
        };
        this.closeNagModal = this.closeNagModal.bind(this);
        this.get = this.get.bind(this);
        this.updatePage = this.updatePage.bind(this);
        this.updateState = this.updateState.bind(this);
    }

    componentDidMount() {
        emitter.on("get", this.get);
        emitter.on("showAd", showAd);
        emitter.on("updateState", this.updateState);

        if (local.state.popup && document.body) {
            if (document.body) {
                document.body.style.paddingTop = "0";
            }

            const css = document.createElement("style");
            css.type = "text/css";
            css.innerHTML = ".new_window { display: none }";
            if (document.body) {
                document.body.appendChild(css);
            }
        }
    }

    componentWillUnmount() {
        emitter.removeListener("get", this.get);
        emitter.removeListener("showAd", showAd);
        emitter.removeListener("updateState", this.updateState);
    }

    closeNagModal() {
        this.setState({
            showNagModal: false,
        });
    }

    async get(args: Args, ctx: PageCtx) {
        try {
            const updateEvents =
                ctx !== undefined && ctx.bbgm.updateEvents !== undefined
                    ? ctx.bbgm.updateEvents
                    : [];
            const newLidInt = parseInt(ctx.params.lid, 10);
            const newLid = Number.isNaN(newLidInt) ? undefined : newLidInt;

            if (args.inLeague) {
                if (newLid !== local.state.lid) {
                    await toWorker("beforeViewLeague", newLid, local.state.lid);
                }
            } else {
                // eslint-disable-next-line no-lonely-if
                if (local.state.lid !== undefined) {
                    await toWorker("beforeViewNonLeague");
                    local.updateGameAttributes({
                        lid: undefined,
                    });
                }
            }

            // No good reason for this to be brought back to the UI, since inputs are sent back to the worker below.
            // ctxBBGM is hacky!
            const ctxBBGM = Object.assign({}, ctx.bbgm);
            delete ctxBBGM.cb; // Can't send function to worker
            delete ctxBBGM.err; // Can't send error to worker
            const inputs = await toWorker(
                `processInputs.${args.id}`,
                ctx.params,
                ctxBBGM,
            );

            if (typeof inputs.redirectUrl === "string") {
                await realtimeUpdate([], inputs.redirectUrl);
            } else {
                await this.updatePage(args, inputs, updateEvents);
            }
        } catch (err) {
            ctx.bbgm.err = err;
        }

        if (
            ctx !== undefined &&
            ctx.bbgm !== undefined &&
            ctx.bbgm.cb !== undefined
        ) {
            ctx.bbgm.cb();
        }
    }

    async updatePage(
        args: Args,
        inputs: GetOutput,
        updateEvents: UpdateEvents,
    ) {
        let prevData;

        // Reset league content and view model only if it's:
        // (1) if it's not loaded and not loading yet
        // (2) loaded, but loading something else
        if (
            (this.state.idLoaded !== args.id &&
                this.state.idLoading !== args.id) ||
            (this.state.idLoaded === args.id &&
                this.state.idLoading !== args.id &&
                this.state.idLoading !== undefined)
        ) {
            if (!updateEvents.includes("firstRun")) {
                updateEvents.push("firstRun");
            }

            prevData = {};
        } else if (this.state.idLoading === args.id) {
            // If this view is already loading, no need to update (in fact, updating can cause errors because the firstRun updateEvent is not set and thus some first-run-defined view model properties might be accessed).
            return;
        } else {
            prevData = this.state.data;
        }

        this.setState({
            idLoading: args.id,
        });

        // Resolve all the promises before updating the UI to minimize flicker
        const results = await toWorker(
            "runBefore",
            args.id,
            inputs,
            updateEvents,
            prevData,
        );

        // If results is undefined, it means the league wasn't loaded yet at the time of the request, likely because another league was opening in another tab at the same time. So stop now and wait until we get a signal that there is a new league.
        if (results === undefined) {
            this.setState({
                idLoading: undefined,
            });
            return;
        }

        let Component = args.Component;
        for (const result of results) {
            if (
                result &&
                Object.keys(result).length === 1 &&
                result.hasOwnProperty("errorMessage")
            ) {
                Component = ({ errorMessage }: { errorMessage: string }) => {
                    setTitle("Error");
                    return (
                        <div>
                            <h1>Error</h1>
                            <h2>{errorMessage}</h2>
                        </div>
                    );
                };
            }
        }

        const vars = {
            Component,
            inLeague: args.inLeague,
            data: Object.assign(prevData, ...results),
        };

        if (vars.data && vars.data.redirectUrl !== undefined) {
            // Reset idLoading, otherwise it will think loading is already in progress on redirect
            this.setState({
                idLoading: undefined,
            });

            await realtimeUpdate([], vars.data.redirectUrl);
            return;
        }

        this.setState(vars);

        if (this.state.idLoading === args.id) {
            this.setState(
                {
                    idLoaded: args.id,
                    idLoading: undefined,
                },
                () => {
                    // Scroll to top
                    if (
                        updateEvents.length === 1 &&
                        updateEvents[0] === "firstRun"
                    ) {
                        window.scrollTo(window.pageXOffset, 0);
                    }
                },
            );
        }
    }

    updateState(obj: State) {
        this.setState(obj);
    }

    render() {
        const { Component, data, idLoaded, idLoading, inLeague } = this.state;

        const updating = idLoading !== undefined;

        let contents;
        let pageId;
        if (!Component) {
            contents = <h1 style={{ textAlign: "center" }}>Loading...</h1>; // Nice, aligned with splash screen
        } else if (!inLeague) {
            contents = <Component {...data} />;
        } else {
            pageId = idLoading !== undefined ? idLoading : idLoaded;

            contents = (
                <div>
                    <LeagueWrapper lid={local.state.lid} pageId={pageId}>
                        <LeagueContent
                            Component={Component}
                            data={data}
                            updating={updating}
                        />
                    </LeagueWrapper>
                    <MultiTeamMenu />
                </div>
            );
        }

        return (
            <div className="container">
                <Provider>
                    <NavBar pageId={pageId} updating={updating} />
                    <Header />
                    <div
                        id="screenshot-nonleague"
                        style={{ minHeight: "300px" }}
                    >
                        {contents}
                    </div>
                    <Footer />
                    <NagModal
                        close={this.closeNagModal}
                        show={this.state.showNagModal}
                    />
                </Provider>
            </div>
        );
    }
}

export default Controller;
