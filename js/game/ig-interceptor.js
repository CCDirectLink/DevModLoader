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
})()