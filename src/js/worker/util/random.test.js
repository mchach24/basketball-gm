// @flow

import assert from "assert";
import { describe, it } from "mocha";
import random from "./random";

describe("worker/util/random", () => {
    describe("choice", () => {
        it("works", () => {
            const x = ["a", "b", "c", "d", "e"];

            const counts = {
                a: 0,
                b: 0,
                c: 0,
                d: 0,
                e: 0,
            };

            const N = 10000;

            for (let i = 0; i < N; i++) {
                const choice = random.choice(x);
                counts[choice] += 1;
            }

            for (const letter of x) {
                assert(counts[letter] > 0.1 * N);
                assert(counts[letter] < 0.3 * N);
            }
        });

        it("works with weight function", () => {
            const x = ["a", "b", "c", "d", "e"];

            const counts = {
                a: 0,
                b: 0,
                c: 0,
                d: 0,
                e: 0,
            };

            const N = 100000;

            const weightFunc = letter => (letter === "e" ? 10 : 1);

            for (let i = 0; i < N; i++) {
                const choice = random.choice(x, weightFunc);
                counts[choice] += 1;
            }

            for (const letter of x) {
                if (letter === "e") {
                    // Should be 10/14 * N
                    assert(counts[letter] > (9.5 / 14) * N);
                    assert(counts[letter] < (10.5 / 14) * N);
                } else {
                    // Should be 1/14 * N
                    assert(counts[letter] > (0.8 / 14) * N);
                    assert(counts[letter] < (1.2 / 14) * N);
                }
            }
        });
    });
});
