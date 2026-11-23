const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../assets/app.in.js"), "utf8");

function loadApp(fetchImpl = async () => {}) {
    let nextTimer = 0;
    const timers = new Map();
    const cleared = [];
    const visibleErrors = [];
    const msgLine = {
        classList: { toggle() {}, remove() {} },
        set innerHTML(value) { visibleErrors.push(value); },
    };
    const msgRoot = { classList: { toggle() {} } };
    const context = {
        document: {
            addEventListener() {},
            querySelector(selector) {
                return selector === "#msg .msg" ? msgLine : msgRoot;
            },
            querySelectorAll() { return []; },
        },
        fetch: fetchImpl,
        AbortController,
        structuredClone,
        setTimeout(callback, delay) {
            const id = ++nextTimer;
            timers.set(id, { callback, delay });
            return id;
        },
        clearTimeout(id) { cleared.push(id); timers.delete(id); },
        console,
        localStorage: { setItem() {} },
        location: { reload() {} },
        setInterval,
        clearInterval,
    };
    vm.createContext(context);
    vm.runInContext(source, context, { filename: "app.in.js" });
    return {
        context,
        fireTimeout() {
            const timer = [...timers.values()].find(({ delay }) => delay === 15000);
            assert.ok(timer, "expected a 15-second timeout");
            timer.callback();
        },
        cleared,
        visibleErrors,
    };
}

test("prepareData sorts route rows without mutating API data and preserves empty results", () => {
    const { context } = loadApp();
    const rows = [
        { marsh: "10", minutes: 3, gosnum: "A", kod: "261" },
        { marsh: "2", minutes: 4, gosnum: "B", kod: "261" },
        { marsh: "1т", minutes: 5, gosnum: "C", kod: "261" },
    ];
    const prepared = context.prepareData(rows);
    assert.deepEqual(Array.from(prepared.train, (row) => row.marsh), ["2", "10", "1т"]);
    assert.equal(rows[0].marsh, "10");
    assert.equal(context.prepareData([]).train.length, 0);
    assert.equal(context.prepareData([
        { marsh: "3", minutes: "2", gosnum: null, kod: "261" },
    ]).train[0].minutes, "2 мин.");
    assert.equal(context.prepareData([
        { marsh: "4", minutes: 1, kod: "261" },
    ]).train[0].gosnum, undefined);
});

test("route trust boundary rejects malformed data and HTML remains escaped", () => {
    const { context } = loadApp();
    for (const invalid of [null, {}, [{ kod: "261" }], [{ marsh: "1", minutes: 2, gosnum: "x", kod: "999" }]]) {
        assert.throws(() => context.prepareData(invalid));
    }
    assert.equal(
        context.formatGosnum({ gosnum: `<img src=x onerror="alert(1)"> 43` }),
        '<span class="bus-registration-main">&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</span><span class="bus-registration-region">43</span>',
    );
});

test("getData applies one timeout to fetch and body, aborts, and clears the timer", async () => {
    let signal;
    const { context, fireTimeout, cleared } = loadApp((_url, options) => {
        signal = options.signal;
        return new Promise(() => {});
    });
    const result = context.getData("/api");
    fireTimeout();
    await assert.rejects(result, /15 секунд/);
    assert.equal(signal.aborted, true);
    assert.deepEqual(cleared, [1]);
});

test("getData reports malformed JSON without duplicate UI side effects", async () => {
    const { context, cleared } = loadApp(async () => ({
        ok: true,
        json: async () => { throw new SyntaxError("Unexpected token"); },
    }));
    await assert.rejects(context.getData("/api"), /Unexpected token/);
    assert.deepEqual(cleared, [1]);
});

test("update reports one visible error and unlocks after HTTP, invalid top-level, and body timeout", async () => {
    for (const fetchImpl of [
        async () => ({ ok: false, status: 503, statusText: "Unavailable" }),
        async () => ({ ok: true, json: async () => ({ not: "an array" }) }),
    ]) {
        const { context, visibleErrors } = loadApp(fetchImpl);
        await context.update();
        assert.equal(visibleErrors.length, 1);
        assert.equal(vm.runInContext("updateInFlight", context), false);
    }

    let markBodyStarted;
    const bodyStarted = new Promise((resolve) => { markBodyStarted = resolve; });
    const { context, fireTimeout, visibleErrors } = loadApp(async () => ({
        ok: true,
        json: () => {
            markBodyStarted();
            return new Promise(() => {});
        },
    }));
    const updating = context.update();
    await bodyStarted;
    fireTimeout();
    await updating;
    assert.equal(visibleErrors.length, 1);
    assert.match(visibleErrors[0], /15 секунд/);
    assert.equal(vm.runInContext("updateInFlight", context), false);
});
