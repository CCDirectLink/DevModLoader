
(async function () {

    Object.freeze(window.preload);
    Object.freeze(window.postload);
    Object.freeze(window.prestart);
    const Plugin = window.Plugin;
    Object.freeze(window.mods);

    for (const mod of mods) {
        if (mod.plugin) {
            const instance = await import(mod.plugin);
            const pluginClass = instance && instance.default;
            if (pluginClass) {
                const pluginInstance = new pluginClass(mod);
                if (pluginInstance instanceof Plugin) {
                    mod.setPlugin(pluginInstance);
                }
            }
        }
    }


    function loadGame() {
        const deferredNodes = Array.from(document.querySelectorAll('script[type="javascript/wait-for-preload"]'));
        for (const node of deferredNodes) {
            const script = document.createElement('script');
            for (const attrib of node.attributes) {
                script.setAttributeNode(attrib.cloneNode());
            }
            script.setAttribute('type', 'text/javascript');
            document.head.appendChild(script);
        }
    }

    // preload 
    preload().then(() => loadGame());

    function setupPostloadStage(ig, oldFunc) {
        ig._DOMReady = function () {
            postload().then(() => oldFunc())
        };
    }

    callWhenIgSet(function (ig) {
        // postload
        setupPostloadStage(ig, ig._DOMReady);
    });


    let startCrossCode = undefined;
    Object.defineProperty(window, 'startCrossCode', {
        set(value) {
            startCrossCode = value;
            // prestart
            prestart().then(() => startCrossCode());
        },
        get() {
            return startCrossCode;
        }
    });


})()