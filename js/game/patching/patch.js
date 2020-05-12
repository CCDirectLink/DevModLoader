import { patch } from './lib/src/patchsteps.js';
import PatchDebugger from './patch-debugger.js';


export default class Patcher {
    constructor(modManager) {
        this.debugState = new PatchDebugger;
        this.modManager = modManager;
    }

    async applyPatch(data, mod, patchData) {
        // assume there is no service worker automatically overriding
        // the url
        this.debugState.setBaseDirectory(mod.baseDirectory);
        this.debugState.addFile([true, mod.baseDirectory]);
        await patch(data, patchData, async (fromGame, url) => {
            if (fromGame) {
                let assetsOverride = this.modManager.getAssetPathOveride(url);
                assetsOverride = this.modManager.relativeToFullPath(assetsOverride);
                const jsonData = await fetch(assetsOverride).then(e => e.json());
                return this.loadPatchedJson(jsonData, url);
            } else {
                // Include (mod file)
                const modRelativePath = mod.baseDirectory.replace('assets/', '') + url;
                const fullPath = this.modManager.relativeToFullPath(modRelativePath);
                return fetch(fullPath).then(e => e.json());
            }
        }, this.debugState);
    }

    async loadPatchedJson(jsonData, url) {
        return this.modManager.patchJSON(jsonData, url);
    }
}
