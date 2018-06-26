// @flow

import { getAll, idb } from "..";
import { mergeByPk } from "./helpers";
import type { EventBBGM } from "../../../common/types";

const getCopies = async ({
    pid,
    season,
}: {
    pid?: number,
    season?: number,
} = {}): Promise<EventBBGM[]> => {
    if (season !== undefined && pid !== undefined) {
        throw new Error("Can't currently filter by season and pid");
    }

    if (season !== undefined) {
        return mergeByPk(
            await idb.league.events.index("season").getAll(season),
            (await idb.cache.events.getAll()).filter(event => {
                return event.season === season;
            }),
            idb.cache.storeInfos.events.pk,
        );
    }

    if (pid !== undefined) {
        return mergeByPk(
            await idb.league.events.index("pids").getAll(pid),
            (await idb.cache.events.getAll()).filter(event => {
                return event.pids !== undefined && event.pids.includes(pid);
            }),
            idb.cache.storeInfos.events.pk,
        );
    }

    return mergeByPk(
        await getAll(idb.league.events),
        await idb.cache.events.getAll(),
        idb.cache.storeInfos.events.pk,
    );
};

export default getCopies;
