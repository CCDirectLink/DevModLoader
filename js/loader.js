import HtmlPatcher from "./html-patcher.js";

function sendMessage(message, serviceWorker) {
    const channel = new MessageChannel();

    return new Promise((resolve) => {
        channel.port1.onmessage = function() {
            resolve()
        };
        serviceWorker.postMessage(message, [channel.port2]);
    });

}

export default class Loader {
    constructor(modManager, stageLoader) {
        this.sw = null;
        this.htmlPatcher = new HtmlPatcher;
        this.modManager = modManager;
        this.stageLoader = stageLoader;
        this.frame = null;
    }

    setServiceWorker(sw) {
        this.sw = sw;
    }
    
    setFrame(frame) {
        this.frame = frame;

        this.onFrameSet(frame);
    }
    
    onFrameSet(frame) {
        const frameWindow = frame.contentWindow;
        frameWindow.preload = async () => {
            await this.loadStage('preload');
        }
    
        frameWindow.postload = async () => {
            await this.loadStage('postload');
        };
    
        frameWindow.prestart = async () => {
            await this.loadStage('prestart');
        };

        this.modManager.onFrameSet(frame);
        this.stageLoader.onFrameSet(frame);
    }

    async init() {
        await this.htmlPatcher.createCustomGameHtml();
        const prettyHtml = this.htmlPatcher.toString();
        await sendMessage({
            type: 'url-override',
            url: this.getBaseUrl() + '/template.html',
            html: prettyHtml
        }, this.sw);

        await sendMessage({
            type: 'clear',
            clear: true,
        }, this.sw);

        await this._initMods();
    }

    async loadStage(stageName) {
        await this.stageLoader.load(stageName);
    }

    async _initMods() {
        await this.modManager.initMods();
        this.modManager.sortModsByDependencies();
        this.modManager.checkForIssues();

        // get all assets override urls
        const assetsOverrides = this.modManager.getAllAssetsOverrides();
        assetsOverrides.set('/assets/mod/icon.png', location.href.split('/').slice(0, -1).concat(['media', 'icon.png']).join('/'));
        await sendMessage({
            type: 'assets-override',
            data: assetsOverrides
        }, this.sw);

        this.stageLoader.setMods(this.modManager.getMods());
    }

    getBaseUrl() {
        return location.href.split('/').slice(0, -1).join('/');
    }


}