import Loader from "./js/loader.js";
import ModManager from "./js/mod-manager.js";

import Plugin from "./js/models/plugin.js";
import StageLoader from "./js/stage-loader.js";

window.addEventListener('INJECTION_DONE', async () => {
    const loader = new Loader(new ModManager, new StageLoader);
    
    window.loader = loader;
    const serviceWorker = await navigator.serviceWorker.register('serviceworker.js');

    if (!serviceWorker.active) {
        location.reload();
    }

    loader.setServiceWorker(serviceWorker.active);
    
    await loader.init();
    
    const iframe = document.createElement('iframe');
    iframe.src = "template.html";
    document.body.appendChild(iframe);

    loader.setFrame(iframe);

    const frameWindow = iframe.contentWindow;
    frameWindow.parent = null;

    Object.defineProperty(frameWindow, 'ToolsApi', {
        value: window.ToolsApi,
        writable: false
    });

    frameWindow.CURRENT_TOOL = window.CURRENT_TOOL;

    frameWindow.Plugin = Plugin;
});
