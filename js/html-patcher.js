import DocumentManager from "./document-manager.js";

export default class HtmlPatcher {
    constructor() {
        this.gameWindow = document.implementation.createHTMLDocument();
        
        this.docManager = new DocumentManager(this.gameWindow);
    }


    async getGameHtml() {
        const text = await fetch('/assets/node-webkit.html').then(e => e.text());
        return (new DOMParser).parseFromString(text, 'text/html');
    }

    async createCustomGameHtml() {
        const html = await this.getGameHtml();
        
        this.docManager.mergeGameHtml(html);

        const script = this.docManager.findScriptWithText(`window['process']`);
        script.innerHTML = `
    const oldProcess = window.process;
    window.process = {
        once: function() {
            console.log('Hijacked');
        }
    };
${script.innerHTML}
    window.process = oldProcess;
`;


        this.docManager.deferGameScriptCall();
        
        const patchHelperPath = this.getBaseUrl() + '/js/game/patching/patch-override.js';
        const patchHelperScript = this.docManager.createScript(patchHelperPath, true);
        this.docManager.insertBefore(patchHelperScript, this.docManager.findGameScript());

        const stageHelperPath = this.getBaseUrl() + '/js/game/stage-helper.js';
        const stageHelperScript = this.docManager.createScript(stageHelperPath, true);
        this.docManager.insertBefore(stageHelperScript, this.docManager.findGameScript());
    

        
        this.docManager.injectPrestart();
        this.docManager.injectBase();


    }

    getBaseUrl() {
        return location.href.split('/').slice(0, -1).join('/');
    }

    toString() {
        return html_beautify(this.docManager.documentToString())
    }
}