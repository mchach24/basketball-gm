// @flow

/* eslint react/no-find-dom-node: "off" */

import html2canvas from "html2canvas";
import PropTypes from "prop-types";
import * as React from "react";
import Dropdown from "react-bootstrap/lib/Dropdown";
import MenuItem from "react-bootstrap/lib/MenuItem";
import Nav from "react-bootstrap/lib/Nav";
import NavItem from "react-bootstrap/lib/NavItem";
import Navbar from "react-bootstrap/lib/Navbar";
import Overlay from "react-bootstrap/lib/Overlay";
import Popover from "react-bootstrap/lib/Popover";
import ReactDOM from "react-dom";
import { fetchWrapper } from "../../common";
import {
    helpers,
    logEvent,
    realtimeUpdate,
    subscribeLocal,
    toWorker,
} from "../util";

type TopMenuToggleProps = {
    long: string,
    onClick?: (SyntheticEvent<>) => void, // From react-bootstrap Dropdown
    openId?: string,
    short: string,
};

class TopMenuToggle extends React.Component<TopMenuToggleProps> {
    handleClick: Function;

    handleMouseEnter: Function;

    constructor(props: TopMenuToggleProps, context) {
        super(props, context);
        this.handleClick = this.handleClick.bind(this);
        this.handleMouseEnter = this.handleMouseEnter.bind(this);
    }

    handleClick(e) {
        e.preventDefault();
        if (this.props.onClick) {
            this.props.onClick(e);
        }
    }

    handleMouseEnter(e) {
        if (
            this.props.openId !== undefined &&
            this.props.openId !== this.props.long &&
            this.props.onClick
        ) {
            this.props.onClick(e);
        }
    }

    render() {
        return (
            <a
                className="dropdown-toggle"
                onClick={this.handleClick}
                onMouseEnter={this.handleMouseEnter}
            >
                <span className="hidden-sm">
                    {this.props.long} <b className="caret" />
                </span>
                <span className="visible-sm">
                    {this.props.short} <b className="caret" />
                </span>
            </a>
        );
    }
}

TopMenuToggle.propTypes = {
    long: PropTypes.string.isRequired,
    onClick: PropTypes.func, // From react-bootstrap Dropdown
    openId: PropTypes.string,
    short: PropTypes.string.isRequired,
};

const TopMenuDropdown = ({ children, long, short, openId, onToggle }) => {
    return (
        <Dropdown
            componentClass="li"
            id={`top-menu-${long.toLowerCase()}`}
            open={openId === long}
            onToggle={() => onToggle(long)}
        >
            <TopMenuToggle
                bsRole="toggle"
                long={long}
                short={short}
                openId={openId}
            />
            <Dropdown.Menu>
                <MenuItem className="visible-sm" header>
                    {long}
                </MenuItem>
                {children}
            </Dropdown.Menu>
        </Dropdown>
    );
};

TopMenuDropdown.propTypes = {
    children: PropTypes.any,
    long: PropTypes.string.isRequired,
    onToggle: PropTypes.func.isRequired,
    openId: PropTypes.string,
    short: PropTypes.string.isRequired,
};

const handleScreenshotClick = async e => {
    e.preventDefault();

    let contentElTemp = document.getElementById("screenshot-league");
    if (!contentElTemp) {
        contentElTemp = document.getElementById("screenshot-nonleague");
    }
    if (!contentElTemp) {
        throw new Error(
            "Missing DOM element #screenshot-league or #screenshot-nonleague",
        );
    }
    const contentEl = contentElTemp;

    // Add watermark
    const watermark = document.createElement("div");
    const navbarBrands = document.getElementsByClassName("navbar-brand");
    if (navbarBrands.length === 0) {
        return;
    }
    const navbarBrandParent = navbarBrands[0].parentElement;
    if (!navbarBrandParent) {
        return;
    }
    watermark.innerHTML = `<nav class="navbar navbar-default"><div class="container-fluid"><div class="navbar-header">${String(
        navbarBrandParent.innerHTML,
    )}</div><p class="navbar-text navbar-right" style="color: #000; font-weight: bold">Play your own league free at basketball-gm.com</p></div></nav>`;
    contentEl.insertBefore(watermark, contentEl.firstChild);
    contentEl.style.padding = "8px";

    // Add notifications
    const notifications = document
        .getElementsByClassName("notification-container")[0]
        .cloneNode(true);
    notifications.classList.remove("notification-container");
    for (let i = 0; i < notifications.childNodes.length; i++) {
        // Otherwise screeenshot is taken before fade in is complete
        const el = notifications.children[0];
        if (el.classList && typeof el.classList.remove === "function") {
            el.classList.remove("notification-fadein");
        }
    }
    contentEl.appendChild(notifications);

    const canvas = await html2canvas(contentEl, {
        background: "#fff",
    });

    // Remove watermark
    contentEl.removeChild(watermark);
    contentEl.style.padding = "";

    // Remove notifications
    contentEl.removeChild(notifications);

    logEvent({
        type: "screenshot",
        text: `Uploading your screenshot to Imgur...`,
        saveToDb: false,
        showNotification: true,
        persistent: false,
        extraClass: "notification-primary",
    });

    try {
        const data = await fetchWrapper({
            url: "https://imgur-apiv3.p.mashape.com/3/image",
            method: "POST",
            headers: {
                Authorization: "Client-ID c2593243d3ea679",
                "X-Mashape-Key":
                    "H6XlGK0RRnmshCkkElumAWvWjiBLp1ItTOBjsncst1BaYKMS8H",
            },
            data: {
                image: canvas.toDataURL().split(",")[1],
            },
        });

        if (data.data.error) {
            console.log(data.data.error);
            throw new Error(data.data.error.message);
        }

        const url = `http://imgur.com/${data.data.id}`;
        const encodedURL = window.encodeURIComponent(url);

        logEvent({
            type: "screenshot",
            text: `<p><a href="${url}" target="_blank">Click here to view your screenshot.</a></p>
<a href="https://www.reddit.com/r/BasketballGM/submit?url=${encodedURL}">Share on Reddit</a><br>
<a href="https://twitter.com/intent/tweet?url=${encodedURL}&via=basketball_gm">Share on Twitter</a>`,
            saveToDb: false,
            showNotification: true,
            persistent: true,
            extraClass: "notification-primary",
        });
    } catch (err) {
        console.log(err);
        let errorMsg;
        if (
            err &&
            err.responseJSON &&
            err.responseJSON.error &&
            err.responseJSON.error.message
        ) {
            errorMsg = `Error saving screenshot. Error message from Imgur: "${
                err.responseJSON.error.message
            }"`;
        } else if (err.message) {
            errorMsg = `Error saving screenshot. Error message from Imgur: "${
                err.message
            }"`;
        } else {
            errorMsg = "Error saving screenshot.";
        }
        logEvent({
            type: "error",
            text: errorMsg,
            saveToDb: false,
        });
    }
};

const handleToolsClick = async (id, e) => {
    e.preventDefault();
    const response = await toWorker(`actions.toolsMenu.${id}`);
    if (id === "resetDb" && response) {
        window.location.reload();
    }
};

type DropdownLinksProps = {
    godMode: boolean,
    lid: number | void,
};

type DropdownLinksState = {
    openId?: string,
};

class DropdownLinks extends React.Component<
    DropdownLinksProps,
    DropdownLinksState,
> {
    handleTopMenuToggle: Function;

    constructor(props) {
        super(props);
        this.state = {
            openId: undefined,
        };
        this.handleTopMenuToggle = this.handleTopMenuToggle.bind(this);
    }

    shouldComponentUpdate(nextProps, nextState: DropdownLinksState) {
        return (
            this.state.openId !== nextState.openId ||
            this.props.lid !== nextProps.lid ||
            this.props.godMode !== nextProps.godMode
        );
    }

    handleTopMenuToggle(id) {
        this.setState(prevState => ({
            openId: id === prevState.openId ? undefined : id,
        }));
    }

    render() {
        const { godMode, lid } = this.props;

        return (
            <Nav pullRight style={{ marginRight: "0px" }}>
                {window.inIframe && lid !== undefined ? (
                    <NavItem href={helpers.leagueUrl([])}>
                        <span className="hidden-xs">
                            <span className="glyphicon glyphicon-menu-left" />
                        </span>
                        <span className="visible-xs toggle-responsive-menu">
                            <span
                                className="glyphicon glyphicon-menu-left"
                                style={{ marginRight: "5px" }}
                            />Switch League
                        </span>
                    </NavItem>
                ) : null}
                {lid !== undefined ? (
                    <NavItem href={helpers.leagueUrl([])}>
                        <span className="hidden-xs">
                            <span className="glyphicon glyphicon-home" />
                        </span>
                        <span className="visible-xs toggle-responsive-menu">
                            <span
                                className="glyphicon glyphicon-home"
                                style={{ marginRight: "5px" }}
                            />League Dashboard
                        </span>
                    </NavItem>
                ) : null}
                {lid !== undefined ? (
                    <TopMenuDropdown
                        long="League"
                        short="L"
                        openId={this.state.openId}
                        onToggle={this.handleTopMenuToggle}
                    >
                        <MenuItem href={helpers.leagueUrl(["standings"])}>
                            Standings
                        </MenuItem>
                        <MenuItem href={helpers.leagueUrl(["playoffs"])}>
                            Playoffs
                        </MenuItem>
                        <MenuItem href={helpers.leagueUrl(["league_finances"])}>
                            Finances
                        </MenuItem>
                        <MenuItem href={helpers.leagueUrl(["history_all"])}>
                            History
                        </MenuItem>
                        <MenuItem href={helpers.leagueUrl(["power_rankings"])}>
                            Power Rankings
                        </MenuItem>
                        <MenuItem
                            href={helpers.leagueUrl(["transactions", "all"])}
                        >
                            Transactions
                        </MenuItem>
                    </TopMenuDropdown>
                ) : null}
                {lid !== undefined ? (
                    <TopMenuDropdown
                        long="Team"
                        short="T"
                        openId={this.state.openId}
                        onToggle={this.handleTopMenuToggle}
                    >
                        <MenuItem href={helpers.leagueUrl(["roster"])}>
                            Roster
                        </MenuItem>
                        <MenuItem href={helpers.leagueUrl(["schedule"])}>
                            Schedule
                        </MenuItem>
                        <MenuItem href={helpers.leagueUrl(["team_finances"])}>
                            Finances
                        </MenuItem>
                        <MenuItem href={helpers.leagueUrl(["team_history"])}>
                            History
                        </MenuItem>
                        <MenuItem href={helpers.leagueUrl(["transactions"])}>
                            Transactions
                        </MenuItem>
                    </TopMenuDropdown>
                ) : null}
                {lid !== undefined ? (
                    <TopMenuDropdown
                        long="Players"
                        short="P"
                        openId={this.state.openId}
                        onToggle={this.handleTopMenuToggle}
                    >
                        <MenuItem href={helpers.leagueUrl(["free_agents"])}>
                            Free Agents
                        </MenuItem>
                        <MenuItem href={helpers.leagueUrl(["trade"])}>
                            Trade
                        </MenuItem>
                        <MenuItem href={helpers.leagueUrl(["trading_block"])}>
                            Trading Block
                        </MenuItem>
                        <MenuItem href={helpers.leagueUrl(["draft"])}>
                            Draft
                        </MenuItem>
                        <MenuItem href={helpers.leagueUrl(["watch_list"])}>
                            Watch List
                        </MenuItem>
                        <MenuItem href={helpers.leagueUrl(["hall_of_fame"])}>
                            Hall of Fame
                        </MenuItem>
                    </TopMenuDropdown>
                ) : null}
                {lid !== undefined ? (
                    <TopMenuDropdown
                        long="Stats"
                        short="S"
                        openId={this.state.openId}
                        onToggle={this.handleTopMenuToggle}
                    >
                        <MenuItem href={helpers.leagueUrl(["game_log"])}>
                            Game Log
                        </MenuItem>
                        <MenuItem href={helpers.leagueUrl(["leaders"])}>
                            League Leaders
                        </MenuItem>
                        <MenuItem href={helpers.leagueUrl(["player_ratings"])}>
                            Player Ratings
                        </MenuItem>
                        <MenuItem href={helpers.leagueUrl(["player_stats"])}>
                            Player Stats
                        </MenuItem>
                        <MenuItem href={helpers.leagueUrl(["team_stats"])}>
                            Team Stats
                        </MenuItem>
                        <MenuItem href={helpers.leagueUrl(["player_feats"])}>
                            Statistical Feats
                        </MenuItem>
                    </TopMenuDropdown>
                ) : null}
                <TopMenuDropdown
                    long="Tools"
                    short="X"
                    openId={this.state.openId}
                    onToggle={this.handleTopMenuToggle}
                >
                    <MenuItem href="/account">Achievements</MenuItem>
                    {lid !== undefined ? (
                        <MenuItem
                            onClick={e =>
                                handleToolsClick("autoPlaySeasons", e)
                            }
                        >
                            Auto Play Seasons
                        </MenuItem>
                    ) : null}
                    {lid !== undefined && godMode ? (
                        <MenuItem
                            href={helpers.leagueUrl(["customize_player"])}
                            className="god-mode-menu"
                        >
                            Create A Player
                        </MenuItem>
                    ) : null}
                    {lid !== undefined ? (
                        <MenuItem href={helpers.leagueUrl(["delete_old_data"])}>
                            Delete Old Data
                        </MenuItem>
                    ) : null}
                    {lid !== undefined && godMode ? (
                        <MenuItem
                            href={helpers.leagueUrl(["edit_team_info"])}
                            className="god-mode-menu"
                        >
                            Edit Team Info
                        </MenuItem>
                    ) : null}
                    {lid !== undefined ? (
                        <MenuItem href={helpers.leagueUrl(["event_log"])}>
                            Event Log
                        </MenuItem>
                    ) : null}
                    {lid !== undefined ? (
                        <MenuItem href={helpers.leagueUrl(["export_league"])}>
                            Export League
                        </MenuItem>
                    ) : null}
                    {lid !== undefined ? (
                        <MenuItem href={helpers.leagueUrl(["export_stats"])}>
                            Export Stats
                        </MenuItem>
                    ) : null}
                    {lid !== undefined ? (
                        <MenuItem href={helpers.leagueUrl(["fantasy_draft"])}>
                            Fantasy Draft
                        </MenuItem>
                    ) : null}
                    {lid !== undefined ? (
                        <MenuItem href={helpers.leagueUrl(["god_mode"])}>
                            God Mode
                        </MenuItem>
                    ) : null}
                    {lid !== undefined && godMode ? (
                        <MenuItem
                            href={helpers.leagueUrl(["multi_team_mode"])}
                            className="god-mode-menu"
                        >
                            Multi Team Mode
                        </MenuItem>
                    ) : null}
                    {lid !== undefined && godMode ? (
                        <MenuItem
                            href={helpers.leagueUrl(["new_team"])}
                            className="god-mode-menu"
                        >
                            Switch Team
                        </MenuItem>
                    ) : null}
                    {lid !== undefined ? (
                        <MenuItem href={helpers.leagueUrl(["options"])}>
                            Options
                        </MenuItem>
                    ) : null}
                    <MenuItem onClick={handleScreenshotClick}>
                        <span className="glyphicon glyphicon-camera" />{" "}
                        Screenshot
                    </MenuItem>
                    {lid !== undefined ? <li className="divider" /> : null}
                    <li role="presentation" className="dropdown-header">
                        Use at your own risk!
                    </li>
                    {lid !== undefined ? (
                        <MenuItem
                            onClick={e => handleToolsClick("skipToPlayoffs", e)}
                        >
                            Skip To Playoffs
                        </MenuItem>
                    ) : null}
                    {lid !== undefined ? (
                        <MenuItem
                            onClick={e =>
                                handleToolsClick("skipToBeforeDraft", e)
                            }
                        >
                            Skip To Draft Lottery
                        </MenuItem>
                    ) : null}
                    {lid !== undefined ? (
                        <MenuItem
                            onClick={e =>
                                handleToolsClick("skipToAfterDraft", e)
                            }
                        >
                            Skip To After Draft
                        </MenuItem>
                    ) : null}
                    {lid !== undefined ? (
                        <MenuItem
                            onClick={e =>
                                handleToolsClick("skipToPreseason", e)
                            }
                        >
                            Skip To Preseason
                        </MenuItem>
                    ) : null}
                    <MenuItem onClick={e => handleToolsClick("resetDb", e)}>
                        Reset DB
                    </MenuItem>
                </TopMenuDropdown>
                <TopMenuDropdown
                    long="Help"
                    short="?"
                    openId={this.state.openId}
                    onToggle={this.handleTopMenuToggle}
                >
                    <MenuItem
                        href="https://basketball-gm.com/manual/"
                        rel="noopener noreferrer"
                        target="_blank"
                    >
                        Overview
                    </MenuItem>
                    <MenuItem href="/changes">Changes</MenuItem>
                    <MenuItem
                        href="https://basketball-gm.com/manual/customization/"
                        rel="noopener noreferrer"
                        target="_blank"
                    >
                        Custom Rosters
                    </MenuItem>
                    <MenuItem
                        href="https://basketball-gm.com/manual/debugging/"
                        rel="noopener noreferrer"
                        target="_blank"
                    >
                        Debugging
                    </MenuItem>
                </TopMenuDropdown>
            </Nav>
        );
    }
}

DropdownLinks.propTypes = {
    godMode: PropTypes.bool.isRequired,
    lid: PropTypes.number,
};

type LogoAndTextProps = {
    lid: number | void,
    updating: boolean,
};

class LogoAndText extends React.Component<LogoAndTextProps> {
    shouldComponentUpdate(nextProps) {
        return (
            this.props.lid !== nextProps.lid ||
            this.props.updating !== nextProps.updating
        );
    }

    render() {
        const { lid, updating } = this.props;

        return (
            <a
                className={
                    window.inIframe && lid !== undefined
                        ? "navbar-brand hidden-md hidden-sm hidden-xs"
                        : "navbar-brand"
                }
                href="/"
            >
                <img
                    alt=""
                    className="spin"
                    width="18"
                    height="18"
                    src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAAN1wAADdcBQiibeAAAAAd0SU1FB9wIFRUXBgiS2qAAAAN8SURBVDjLbZRdTFtlGMd/b885PaXfYOk2vqHODWFsZIqySGLMdJsx2SQGdZk3uzIaL4war0282LUX3ng7WLLdSEzcZqJxKmXOSLbBBoJaoBDWQktLP0/POT1etHSV7E3e5D0neX75///P+7yCJ6zeVuW9Vwc9r4eCSo9TtgVspo1Mzty+fi+bWUro1/6Na1/vrRH1H8+F3P2vHHdcOjPkfi2eNBSbBacH3LhtNtAADcandvTx31Nzq1vWxQebubu7tdLuYeSo69SH53zjn5x/aqirTZH6QirPtNm5OZMDAQGPDMBAiyp1+pQDflWMysKa/yepL9VAve32/o/fbJq4cNrfjR2wAzLYJMHhNpX1LYNbD/L0taoIoMOvsJY0XIMHHCPRtPnLelrfkAAuvOy//NlY4DgyoFRBSlWqBft9MgGXxNXwDh1NCk7FxtaOwYl2py+a0HvCq4XL0vBB5xtfng9+GvBLMjao7SqEMmCCW7Ux2O5geqHAXFQjUyzz7f0MA/scndGUMS8/36W+3aRKju/CGewNAkkVIINVbUPQK9HZpOBXJIQNTh5xVYIvglwWnDvokW4vF0bl7Ux5aGapwMkBNw0e8dhWtQ3xpMFfyyVSaRMMKGvQ5lE40qzW+t7hV7rlYy0O6dQhd8VGsWrFqIIEBJ0ywZBc+acDJVjd0Pl+Nks4kqfTreCyi2bZJYmK1Lo8aopEXVZmFWRUuqa0CholCQm4s1Zwytm8FUcjVIOYdYr2hB7bNphayIMBkbjOR8NN2E1BX8ARlZc3SxGKDNcgZhVSBW3nTW7MZdF1aPHJnDnsoUEIvvopyfWHWc4+7WE1U1qUp9e0a5GYPtYdUORdNUXL4lYkx6OMQaNLYrTPiyqJivUybCQMjgYdbGdNFh5p2p1V7aoAeKffGx7t9Q5bgIGFqgpe6nGyzys/tgc10MSfad7t97EYK/HFz5vTV+bSJ2SASMp830JMjj3r6aJ+CovVwOtCv71SYLDZgTDgj/XCym8ruc9rs7a+o8eSudKsJWwjx/Y7Gvfe6t29ENNI5E2GWhqYmE0tfzOT+uB+XPvxf9MfSRuR+U3th8Wt0qGeRntrwCnJ9U/Mjb+zZEoWoUa7fmkqcfPKvdzF6fVc+Inv0e56ocV59sX2hrfavErXwpbWrpmW6PAp0UTBXPw1mp18GCtN7q35D5RXZnIkhyKSAAAAAElFTkSuQmCC"
                    style={{
                        animationPlayState: updating ? "running" : "paused",
                        WebkitAnimationPlayState: updating
                            ? "running"
                            : "paused",
                    }}
                />
                <span className="hidden-md hidden-sm hidden-xs">
                    Basketball GM
                </span>
                {lid === undefined ? (
                    <span className="visible-md visible-sm visible-xs">
                        Basketball GM
                    </span>
                ) : null}
            </a>
        );
    }
}

LogoAndText.propTypes = {
    lid: PropTypes.number,
    updating: PropTypes.bool.isRequired,
};

const handleOptionClick = (option, e) => {
    if (!option.url) {
        e.preventDefault();
        toWorker(`actions.playMenu.${option.id}`);
    }
};

type PlayMenuProps = {
    lid: number | void,
    options: {
        id: string,
        label: string,
        url?: string,
    }[],
};

class PlayMenu extends React.Component<PlayMenuProps> {
    handleAltP: Function;

    constructor(props) {
        super(props);
        this.handleAltP = this.handleAltP.bind(this);
    }

    componentDidMount() {
        document.addEventListener("keyup", this.handleAltP);
    }

    componentWillUnmount() {
        document.removeEventListener("keyup", this.handleAltP);
    }

    handleAltP(e: SyntheticKeyboardEvent<>) {
        // alt + p
        if (e.altKey && e.keyCode === 80) {
            const option = this.props.options[0];

            if (!option) {
                return;
            }

            if (option.url) {
                realtimeUpdate([], option.url);
            } else {
                toWorker(`actions.playMenu.${option.id}`);
            }
        }
    }

    render() {
        const { lid, options } = this.props;

        if (lid === undefined) {
            return <div />;
        }

        return (
            <ul className="nav navbar-nav-no-collapse">
                <Dropdown componentClass="li" id="play-menu">
                    <Dropdown.Toggle className="play-button" useAnchor>
                        <span className="hidden-xs">Play</span>
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                        {options.map((option, i) => {
                            return (
                                <MenuItem
                                    key={i}
                                    href={option.url}
                                    onClick={e => handleOptionClick(option, e)}
                                >
                                    {option.label}
                                    {i === 0 ? (
                                        <span className="text-muted kbd">
                                            Alt+P
                                        </span>
                                    ) : null}
                                </MenuItem>
                            );
                        })}
                    </Dropdown.Menu>
                </Dropdown>
            </ul>
        );
    }
}

PlayMenu.propTypes = {
    lid: PropTypes.number,
    options: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
            url: PropTypes.string,
        }),
    ).isRequired,
};

type Props = {
    pageId?: string,
    updating: boolean,
};

class NavBar extends React.Component<Props> {
    playMenu: ?PlayMenu;

    // Workaround for https://github.com/react-bootstrap/react-bootstrap/issues/1301 based on https://github.com/react-bootstrap/react-router-bootstrap/issues/112#issuecomment-142599003
    componentDidMount() {
        const navBar = ReactDOM.findDOMNode(this);
        if (!navBar) {
            return;
        }
        // $FlowFixMe
        const collapsibleNav = navBar.querySelector("div.navbar-collapse");
        if (!collapsibleNav) {
            return;
        }
        // $FlowFixMe
        const btnToggle = navBar.querySelector("button.navbar-toggle");
        if (!btnToggle) {
            return;
        }

        navBar.addEventListener(
            "click",
            (evt: MouseEvent) => {
                const target = evt.target;
                if (!(target instanceof HTMLElement)) {
                    throw new Error("Invalid event target");
                }

                if (
                    target.classList.contains("dropdown-toggle") ||
                    !collapsibleNav.classList.contains("in")
                ) {
                    return;
                }

                if (
                    target.tagName === "A" ||
                    target.classList.contains("toggle-responsive-menu")
                ) {
                    btnToggle.click();
                }
            },
            false,
        );
    }

    render() {
        return subscribeLocal(local => {
            const { pageId, updating } = this.props;

            const {
                lid,
                godMode,
                hasViewedALeague,
                phaseText,
                playMenuOptions,
                popup,
                statusText,
                username,
            } = local.state;

            if (popup) {
                return <div />;
            }

            let userBlock = username ? (
                <a className="navbar-link user-menu" href="/account">
                    <span className="glyphicon glyphicon-user" />{" "}
                    <span className="visible-lg">{username}</span>
                </a>
            ) : (
                <a
                    className="navbar-link user-menu"
                    href="/account/login_or_register"
                >
                    <span className="glyphicon glyphicon-user" />{" "}
                    <span className="visible-lg">Login/Register</span>
                </a>
            );

            if (window.inIframe) {
                userBlock = (
                    <a
                        className="navbar-link user-menu"
                        href={window.location.href}
                        rel="noopener noreferrer"
                        target="_blank"
                    >
                        <img
                            alt="Open In New Window"
                            title="Open In New Window"
                            height="16"
                            width="16"
                            src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA0AAAANABeWPPlAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFOSURBVDiNlZS9isJAFIU/F6s0m0VYYiOrhVukWQsbK4t9CDtbexGs8xY+ghY+QRBsbKcTAjZaqKyGXX2Bs00S1AwBD1yYOXPvmXvv/CAJSQAuoGetzAPCMKRSqTzSOURRRK/Xo1wqldyEewXwfR/P8zLHIAhYr9fZ3BjDeDym1WoBUAZ+i3ZaLBYsl8s7zhiTCbwk3DfwaROYz+fsdjs6nU7GOY6TjVOBGPixCbiuy2g0YrVa0Ww2c+svlpg7DAYDptMp3W6XyWRi9RHwRXKMh8NBKYbDoQC1221dr1dtNhv1+33NZjMZY9KjtAsEQSBAvu/rfD7rEYUC2+1WjuOo0Whov9/ngm8FchcJoFarEYYhnudRrVYLe5QTOJ1OANTrdQCOx6M1MI5jexOftdsMLsBbYb7wDkTAR+KflWC9hRakr+wi6e+2hGfNTb+Bf9965Lxmndc1AAAAAElFTkSuQmCC"
                        />{" "}
                    </a>
                );
            }

            // Hide phase and status, to prevent revealing that the playoffs has ended, thus spoiling a 3-0/3-1/3-2 finals
            // game. This is needed because game sim happens before the results are displayed in liveGame.
            const phaseStatusBlock =
                pageId === "liveGame" ? (
                    <p className="navbar-text-two-line-no-collapse">
                        Live game<br />in progress
                    </p>
                ) : (
                    <p className="navbar-text-two-line-no-collapse">
                        {phaseText}
                        <br />
                        {statusText}
                    </p>
                );

            return (
                <Navbar fixedTop>
                    <div className="pull-right">{userBlock}</div>
                    <Navbar.Header>
                        <LogoAndText lid={lid} updating={updating} />
                        <PlayMenu
                            lid={lid}
                            options={playMenuOptions}
                            ref={c => {
                                this.playMenu = c;
                            }}
                        />
                        <Overlay
                            onHide={() => {
                                local.update({ hasViewedALeague: true });
                                localStorage.setItem(
                                    "hasViewedALeague",
                                    "true",
                                );
                            }}
                            placement="bottom"
                            rootClose
                            show={!hasViewedALeague && lid === 1}
                            target={() => ReactDOM.findDOMNode(this.playMenu)}
                        >
                            <Popover
                                id="popover-welcome"
                                title="Welcome to Basketball GM!"
                            >
                                To advance through the game, use the Play button
                                at the top. The options shown will change
                                depending on the current state of the game.
                            </Popover>
                        </Overlay>
                        {lid !== undefined ? phaseStatusBlock : null}
                        <Navbar.Toggle />
                    </Navbar.Header>
                    <Navbar.Collapse>
                        <DropdownLinks godMode={godMode} lid={lid} />
                    </Navbar.Collapse>
                </Navbar>
            );
        });
    }
}

NavBar.propTypes = {
    pageId: PropTypes.string,
    updating: PropTypes.bool.isRequired,
};

export default NavBar;
