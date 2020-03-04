import {patch} from './lib/src/patchsteps.js';
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
                const assetsOverride = this.modManager.getAssetPathOveride(url);
                return fetch('/asset/' + assetsOverride).then(e => e.json());;
            } else {
                // Include (mod file)
                return fetch('/' + mod.baseDirectory + url).then(e => e.json());
            }
        }, this.debugState);
    }

}
