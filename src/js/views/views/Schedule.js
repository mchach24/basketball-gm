const classNames = require('classnames');
const React = require('react');
const bbgmViewReact = require('../../util/bbgmViewReact');
const {Dropdown, LeagueLink, NewWindowLink} = require('../components/index');

module.exports = ({abbrev, completed, season, upcoming = []}) => {
    bbgmViewReact.title('Schedule');

    return <div>
        <Dropdown view="schedule" fields={["teams"]} values={[abbrev]} />
        <h1>Schedule <NewWindowLink /></h1>

        <div className="row">
            <div className="col-sm-6">
                <h2>Upcoming Games</h2>
                <ul className="list-group">
                    {upcoming.map(({gid, teams}) => <li className="list-group-item schedule-row" key={gid}>
                        <LeagueLink parts={['roster', teams[0].abbrev]}>{teams[0].region}</LeagueLink>
                        <span className="schedule-at"> @ </span>
                        <LeagueLink parts={['roster', teams[1].abbrev]}>{teams[1].region}</LeagueLink>
                    </li>)}
                </ul>
            </div>
            <div className="col-sm-6 hidden-xs">
                <h2>Completed Games</h2>
                <ul className="list-group">
                    {completed === undefined ? 'Loading...' : completed.map(({gid, overtime, score, teams, won}) => {
                        const classes = classNames('list-group-item', 'schedule-row', {
                            'list-group-item-success': won,
                            'list-group-item-danger': !won,
                        });
                        return <li className={classes} key={gid}>
                            <div className="schedule-results">
                                <div className="schedule-wl">{won ? 'W' : 'L'}</div>
                                <div className="schedule-score">
                                    <LeagueLink parts={['game_log', abbrev, season, gid]}>{score}{overtime}</LeagueLink>
                                </div>
                            </div>
                            <LeagueLink parts={['roster', teams[0].abbrev]}>{teams[0].region}</LeagueLink>
                            <span className="schedule-at"> @ </span>
                            <LeagueLink parts={['roster', teams[1].abbrev]}>{teams[1].region}</LeagueLink>
                        </li>;
                    })}
                </ul>
            </div>
        </div>
    </div>;
};
