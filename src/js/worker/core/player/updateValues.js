// @flow

import value from "./value";
import type { Player, PlayerWithoutPid } from "../../../common/types";

const updateValues = (p: Player | PlayerWithoutPid) => {
    p.value = value(p);
    p.valueNoPot = value(p, { noPot: true });
    p.valueFuzz = value(p, { fuzz: true });
    p.valueNoPotFuzz = value(p, { noPot: true, fuzz: true });
    p.valueWithContract = value(p, { withContract: true });
};

export default updateValues;
