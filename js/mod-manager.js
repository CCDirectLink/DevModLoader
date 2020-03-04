import Fs from "./fs.js";
import Mod from "./models/mod.js";
import FakeMod from "./models/fake-mod.js";
import GameMod from "./models/game-mod.js";
import DependencyGraph from "./models/dependency-graph.js";
import MissingMod from "./models/missing-mod.js";
import ErrorMod from "./models/error-mod.js";
import Semver from "./lib/semver/semver.browser.js";

const VERSION = '1.0.0';

export default class ModManager {
    constructor() {
        this.fs = new Fs;
        this.mods = [];
        this.depGraph = new DependencyGraph;
        this.gameMod = null;
    }

    onFrameSet(frame) {
        const window = frame.contentWindow;
        window.registerPlugin = async (name, plugin) => {
            this.addPlugin(name, plugin);
        };
        const modsCopy = this.mods.slice(0);
        window.mods = modsCopy;
        window.activeMods = modsCopy;
        
        window.getAssetPath = (originalPath) => {
            return this.getAssetPathOveride(originalPath);
        }

        window.getModPatches = async (originalPath) => {
            return await this.getModPatches(originalPath);       
        }
    }

    getAssetPathOveride(originalPath) {
        let foundPath = originalPath;
        for(const mod of this.mods) {
            const modPath = mod.getAsset(originalPath);
            if (modPath) {
                foundPath = modPath;
            }
        }
        return foundPath;
    }

    getModPatchesPaths(originalPath) {
        const foundPaths = [];
        for(const mod of this.mods) {
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

    async initMods() {
        this.mods.splice(0);
        
        const mods = [];
        const ccloader = new FakeMod("ccloader", "0.0.0");

        mods.push(ccloader);
        

        const {changelog} = await fetch('/assets/data/changelog.json').then(e => e.json());
        this.gameMod = new GameMod("crosscode", changelog[0].version);
        mods.push(this.gameMod);

        mods.push(new FakeMod("devmodloader", VERSION));

        const packages = await this._getMods();
        
        let disabledMods = localStorage.getItem('disabled-mods') || "{}";
        if (typeof disabledMods === "string") {
            disabledMods = JSON.parse(disabledMods);
        }
        
        for (const {path, error, data} of packages) {
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
                path: modPath,
                error: null
            };
            try {
                packageInfo.data = await fetch(modPath + '/package.json').then(response => response.json());
            } catch (e) {
                packageInfo.error = 'Error while parsing package.json\n' + e.message;
            }
            modPackages.push(packageInfo);

        }
        return modPackages;
    }
}