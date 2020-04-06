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

    /**
     * 
     * @param {string} path relative to executable path
     */

    async makeDir(path) {
        if (window.nw) {
            const fs = require('fs');
            try {
                fs.mkdirSync(process.cwd() + '/' + path);
            } catch (e) {
                return false;
            }

        } else {

            try {
                const url = new URL(this.baseURL).origin;
                await fetch(url + '/api/make-dir/' + path, {
                    method: "POST"
                });
                return true;
            } catch (e) {
                console.error(e);
                return false;
            }

        }
    }

    /**
     * 
     * @param {string} path relative to executable path 
     * @param {any} data 
     */
    async save(path, data) {
        if (window.nw) {
            const fs = require('fs');
            try {
                fs.writeFileSync(process.cwd() + '/' + path, data);
            } catch (e) {
                return false;
            }

        } else {

            try {
                const url = new URL(this.baseURL).origin;
                await fetch(url + '/api/save/' + path, {
                    method: "POST",
                    body: data
                });
                return true;
            } catch (e) {
                console.error(e);
                return false;
            }

        }
        return true;
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

        for (const mod of mods) {
            const baseMapPath = mod.baseDirectory + 'assets/data/maps/';
            const assets = mod.getAssets('data/maps');



            contexts.push({
                name: mod.name,
                path: baseMapPath.replace('assets/', ''),
                children: assets.map(e => e.replace(baseMapPath, ''))
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

        for (const { path, mod } of patchPaths) {
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


