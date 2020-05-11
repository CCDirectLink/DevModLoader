(function () {
    const igCallbacks = [];
    Object.defineProperty(window, 'callWhenIgSet', {
        value: function (func) {
            igCallbacks.push(func);
        },
        writable: false
    });

    let ig = undefined;
    Object.defineProperty(window, 'ig', {
        set(value) {
            if (ig !== value) {
                ig = value;
                igCallbacks.forEach(e => e(value));
            }
        },
        get() {
            return ig;
        }
    });

    const moduleCallbacks = new Map;
    Object.defineProperty(window, 'callWhenModuleLoaded', {
        value: function (moduleName, func) {
            if (!moduleCallbacks.has(moduleName)) {
                moduleCallbacks.set(moduleName, []);
            }
            moduleCallbacks.get(moduleName).push(func);
        },
        writable: false
    });


    callWhenIgSet(function (ig) {
        const old_defines = ig.defines;
        ig.defines = function (body) {
            const name = ig._current.name;
            old_defines(function () {
                body();
                const callbacks = moduleCallbacks.get(name) || [];
                callbacks.forEach(callback => callback());
            });
        }
    });

})()