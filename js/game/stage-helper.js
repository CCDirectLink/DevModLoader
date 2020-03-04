
(async function() {

    Object.freeze(window.preload);
    Object.freeze(window.postload);
    Object.freeze(window.prestart);
    const Plugin = window.Plugin;
    Object.freeze(window.mods);

    for(const mod of mods) {
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



    preload().then(() => loadGame());

    let ig = undefined;
    
    function setupPostloadStage(ig, oldFunc) {
        ig._DOMReady = function() {
            postload().then(() => oldFunc())
        };
    }

    let startCrossCode = undefined;
    Object.defineProperty(window, 'startCrossCode', {
        set(value) {
            startCrossCode = value;
            prestart().then(() => startCrossCode());
        },
        get() {
            return startCrossCode;
        }
    });

    const igCallbacks = [];
    
    window.callWhenIgSet = function(func) {
        igCallbacks.push(func);
    }

    Object.defineProperty(window, 'ig', {
        set(value) {
            if (ig !== value) {
                ig = value;
                igCallbacks.forEach(e => e(value));
                setupPostloadStage(ig, ig._DOMReady);
            }
        },
        get() {
            return ig;
        }
    });


    function loadGame() {
        const deferredNodes = Array.from(document.querySelectorAll('script[type="javascript/wait-for-preload"]'));
        for (const node of deferredNodes) {
            const script = document.createElement('script');
            for(const attrib of node.attributes) {
                script.setAttributeNode(attrib.cloneNode());
            }
            script.setAttribute('type', 'text/javascript');
            document.head.appendChild(script);
        }
    }
})()