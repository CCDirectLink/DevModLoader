import Fs from "./fs.js";
import Mod from "./models/mod.js";
import FakeMod from "./models/fake-mod.js";
import GameMod from "./models/game-mod.js";
import DependencyGraph from "./models/dependency-graph.js";
import MissingMod from "./models/missing-mod.js";
import ErrorMod from "./models/error-mod.js";
import Semver from "./lib/semver/semver.browser.js";
import { VERSION } from './version.js';

import Patcher from "./game/patching/patch.js";

export default class ModManagerOffline {
    constructor() {
        this.patcher = new Patcher(this);
        this.baseURL = '';
        this.fs = new Fs;
        this.mods = [];
        this.depGraph = new DependencyGraph;
        this.gameMod = null;

    }

    async initMods() {
        this.mods.splice(0);

        const mods = [];

        const { changelog } = await fetch('/assets/data/changelog.json').then(e => e.json());
        this.gameMod = new GameMod("crosscode", changelog[0].version);
        mods.push(this.gameMod);

        mods.push(new FakeMod("devmodloader", VERSION));

        const packages = await this._getMods();

        let disabledMods = localStorage.getItem('disabled-mods') || "{}";
        if (typeof disabledMods === "string") {
            disabledMods = JSON.parse(disabledMods);
        }

        for (const { path, error, data } of packages) {
            if (error) {
                const mod = new ErrorMod(path + '/package.json', "0.0.0");
                mod.setError(error);
                mods.push(mod);
            } else {
                const mod = new Mod(path, data);
                mods.push(mod);
                if (disabledMods[data.name]) {
                    mod.disabled = true;
                }
            }
        }


        const missing = {};
        const notMissing = {};
        mods.forEach(mod => notMissing[mod.name] = true);
        for (const mod of mods) {
            const dependencies = Object.keys(mod.dependencies);
            for (const dependency of dependencies) {
                if (notMissing[dependency]) {
                    continue;
                }

                if (!missing[dependency]) {
                    missing[dependency] = true;
                    mods.push(new MissingMod(dependency, ""));
                }
            }
        }

        for (const mod of mods) {
            if (!(mod instanceof FakeMod)) {
                const assets = await mod.getFs().getAssets('assets', ['png', 'json', 'patch', 'ogg']);
                mod.addAssets(assets);
            }
        }

        this.mods.push(...mods);

        const graph = this.depGraph;

        graph.reset();
        for (const mod of mods) {
            const node = mod.getDependencyNode();
            graph.addNode(node);

            for (const depKey of Object.keys(mod.dependencies)) {
                const depMod = this.findMod(depKey);
                if (depMod) {
                    const depNode = depMod.getDependencyNode();
                    depNode.addDependent(node);
                }
            }
        }
    }

    findMod(name) {
        for (const mod of this.mods) {
            if (mod.name === name) {
                return mod;
            }
        }
        return null;
    }

    sortModsByDependencies() {
        const graph = this.depGraph;
        this.mods.splice(0);
        graph.sort();


        this.mods.push(...graph.getNodes().map(node => node.getInstance()));

    }

    checkForIssues() {
        const graph = this.depGraph;
        for (const node of graph.getNodes()) {
            if (node.getInstance() instanceof ErrorMod) {
                for (const dependentName of Object.keys(node.dependent)) {
                    const dependent = node.dependent[dependentName];
                    const instance = dependent.getInstance();
                    if (!(instance instanceof ErrorMod)) {
                        const reason = `${dependentName} relies on ${node.name} which encountered an error while loading.`;
                        const errorInstance = new ErrorMod(instance.name, instance.version);
                        errorInstance.setError(reason);
                        errorInstance.package.ccmodDependencies = instance.dependencies;
                        dependent.setInstance(errorInstance);
                    }
                }
            } else {
                for (const dependentName of Object.keys(node.dependent)) {
                    const dependent = node.dependent[dependentName];
                    const instance = dependent.getInstance();
                    const versionToCheck = instance.dependencies[node.name];

                    if (!Semver.satisfies(node.version, versionToCheck)) {
                        const reason = `${dependentName} expects ${node.name} to be ${versionToCheck}, but it is ${node.version}.`;
                        const errorInstance = new ErrorMod(instance.name, instance.version);
                        errorInstance.setError(reason);
                        dependent.setInstance(errorInstance);
                    }
                }
            }
        }

        const validMods = [];
        for (const node of graph.getNodes()) {
            const instance = node.getInstance();
            if (instance instanceof ErrorMod) {
                instance.showError();
            } else if (!(instance instanceof FakeMod)) {
                validMods.push(instance);
            }
        }

        this.mods.splice(0);
        this.mods.push(...validMods);
    }

    getAllAssetsOverrides() {
        const overrides = new Map;

        for (const mod of this.mods) {
            const modOverrides = mod.getAssetOverrides();

            for (const [key, value] of modOverrides) {
                overrides.set(key, value);
            }
        }
        return overrides;
    }

    getMods() {
        return this.mods;
    }

    async _getMods() {
        const modPaths = await this.fs.getModPaths();
        const modPackages = [];
        for (const modPath of modPaths) {
            const packageInfo = {
                path: this.relativeToFullPath(modPath.replace(location.origin + '/assets/', '')),
                error: null
            };
            try {
                packageInfo.data = await fetch(packageInfo.path + '/package.json').then(response => response.json());
            } catch (e) {
                packageInfo.error = 'Error while parsing package.json\n' + e.message;
            }
            modPackages.push(packageInfo);

        }
        return modPackages;
    }

    getModPatchesPaths(originalPath) {
        const foundPaths = [];
        for (const mod of this.mods) {
            if (!(mod instanceof GameMod)) {
                const modPath = mod.getAsset(originalPath + '.patch');
                if (modPath) {
                    const patchInfo = {
                        mod: mod,
                        path: modPath
                    };
                    foundPaths.push(patchInfo);
                }
            }
        }
        return foundPaths;
    }


    onFrameSet(frame) {
        const window = frame.contentWindow;
        const modsCopy = this.mods.slice(0);
        window.mods = modsCopy;
        window.activeMods = modsCopy;
    }

    async init() {
        await this.initMods();
        this.sortModsByDependencies();
        this.checkForIssues();
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

    /**
     * 
     * @param {string} originalPath
     * @returns override path relative to /assets/ 
     */
    getAssetPathOveride(originalPath) {
        let foundPath = originalPath;
        for (const mod of this.mods) {
            const modPath = mod.getAsset(originalPath);
            if (modPath) {
                foundPath = modPath;
            }
        }
        return foundPath;
    }

    /**
     * 
     */
    async getAllMaps() {
        const mods = this.getMods();
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

    /**
     * 
     * @param {string} url to json resource
     * @returns {any} 
     */
    async loadJSON(url) {
        if (typeof url !== "string") {
            return url;
        }

        return fetch(url).then(e => e.json());
    }

    relativeToFullPath(path) {
        return this.baseURL + path;
    }

    /**
     * 
     * @param {any} jsonData to patch 
     * @param {string} url to match for patch files 
     */
    async patchJSON(jsonData, url) {
        const patchPaths = await this.getModPatchesPaths(url);
        for (const { path, mod } of patchPaths) {
            let patch = {};
            try {
                let fullPath = this.relativeToFullPath(path);
                patch = await this.loadJSON(fullPath);
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
}


