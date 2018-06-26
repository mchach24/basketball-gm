// @flow

import { season } from "..";
import { idb } from "../../db";
import { g, genMessage, local } from "../../util";

const newPhaseRegularSeason = async () => {
    const teams = await idb.cache.teams.getAll();
    await season.setSchedule(season.newSchedule(teams));

    if (g.autoDeleteOldBoxScores) {
        await idb.league.tx("games", "readwrite", tx => {
            return tx.games.clear();
        });
    }

    // First message from owner
    if (g.showFirstOwnerMessage) {
        await genMessage({ wins: 0, playoffs: 0, money: 0 });
    } else if (local.autoPlaySeasons === 0) {
        const nagged = await idb.meta.attributes.get("nagged");

        if (g.season === g.startingSeason + 3 && g.lid > 3 && nagged === 0) {
            await idb.meta.attributes.put(1, "nagged");
            await idb.cache.messages.add({
                read: false,
                from: "The Commissioner",
                year: g.season,
                text:
                    '<p>Hi. Sorry to bother you, but I noticed that you\'ve been playing this game a bit. Hopefully that means you like it. Either way, we would really appreciate some feedback so we can make this game better. <a href="mailto:commissioner@basketball-gm.com">Send an email</a> (commissioner@basketball-gm.com) or <a href="http://www.reddit.com/r/BasketballGM/">join the discussion on Reddit</a>.</p>',
            });
        } else if (
            (nagged === 1 && Math.random() < 0.125) ||
            (nagged >= 2 && Math.random() < 0.0125)
        ) {
            await idb.meta.attributes.put(2, "nagged");
            await idb.cache.messages.add({
                read: false,
                from: "The Commissioner",
                year: g.season,
                text:
                    '<p>Hi. Sorry to bother you again, but if you like the game, please share it with your friends! Also:</p><p><a href="https://twitter.com/basketball_gm">Follow Basketball GM on Twitter</a></p><p><a href="https://www.facebook.com/basketball.general.manager">Like Basketball GM on Facebook</a></p><p><a href="http://www.reddit.com/r/BasketballGM/">Discuss Basketball GM on Reddit</a></p><p><a href="https://discord.gg/caPFuM9">Chat with Basketball GM players and devs on Discord</a></p><p>The more people that play Basketball GM, the more motivation I have to continue improving it. So it is in your best interest to help me promote the game! If you have any other ideas, please <a href="mailto:commissioner@basketball-gm.com">email me</a>.</p>',
            });
        } else if (nagged >= 2 && nagged <= 3 && Math.random() < 0.5) {
            // Skipping 3, obsolete
            await idb.meta.attributes.put(4, "nagged");
            await idb.cache.messages.add({
                read: false,
                from: "The Commissioner",
                year: g.season,
                text:
                    '<p>Want to try multiplayer Basketball GM? Some intrepid souls have banded together to form online multiplayer leagues, and <a href="http://basketball-gm.co.nf/">you can find a user-made list of them here</a>.</p>',
            });
        }
    }

    return [undefined, ["playerMovement"]];
};

export default newPhaseRegularSeason;
