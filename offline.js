import ModManager from "./js/mod-manager.js";
import Patcher from "./js/game/patching/patch.js";

export default class ModManagerOffline {
    constructor() {
        this.modManager = new ModManager;
        this.patcher = new Patcher(this.modManager);
        this.baseURL = '';
    }

    async init() {
        await this.modManager.initMods();
        this.modManager.sortModsByDependencies();
        this.modManager.checkForIssues();
    }

    setBaseURL(url = '') {
        this.baseURL = url;
    }

    getAssetPathOveride(originalPath, includeAssets = false) {
        let baseURL = this.baseURL;
        if (includeAssets) {
            baseURL += 'assets/';
        }
        return baseURL + this.modManager.getAssetPathOveride(originalPath);
    }

    async getAllMaps() {
        const mods = this.modManager.getMods();
        const contexts = [];

        function normalizePath(basePath, str) {
            let relativePath = str.replace(basePath, '');
            relativePath = relativePath.replace('.json', '');
            
            return relativePath.split('/').join('.');
        }

        for (const mod of mods) {
            const baseMapPath = mod.baseDirectory + 'assets/data/maps/';
            const assets = mod.getAssets('data/maps');


            contexts.push({
                name: mod.name,
                path: baseMapPath.replace('assets/', ''),
                children: assets.map(e => normalizePath(baseMapPath, e))
            });
        }

        return contexts;
    }

    async loadJSON(jsonPath) {
        if (typeof jsonPath !== "string") {
            return jsonPath;
        }
        return fetch(this.baseURL + jsonPath).then(e => e.json());
    }

    async patchJSON(jsonData, url) {
        const patchPaths = await this.getModPatchesPaths(url);
        
        for (const {path, mod} of patchPaths) {
            let patch = {};
            try {
                patch = await this.loadJSON(path);
            } catch (e) {
                console.error(e);
                continue;
            }

            try {
                await this.patcher.applyPatch(jsonData, mod, patch);
            } catch (e) {
                console.error(e);
            }
        }
    
        return jsonData;
    }

    getModPatchesPaths(originalPath) {
        return this.modManager.getModPatchesPaths(originalPath);    
    }
}


