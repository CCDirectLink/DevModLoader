import DependencyNode from "./dependency-node.js";
import ModFs from "../mod-fs.js";

export default class Mod {
    constructor(path, packageData){
        this.path = path;
        if (!packageData.ccmodDependencies) {
            packageData.ccmodDependencies = {};
        }

        if (packageData.name !== 'crosscode') {
            if (!packageData.ccmodDependencies['crosscode']) {
                packageData.ccmodDependencies['crosscode'] = 'x.x.x';
            }
        }

        this.package = packageData;
        this.pluginInstance = null; 

        this.dependencyNode = new DependencyNode(this);
        this.pathname = "";
        
        if (path) {
            this.pathname = new URL(path).pathname.substr(1) + '/';
        }

        this.fs = new ModFs(this.pathname);  
        
        this.assets = [];
    }

    getFs() {
        return this.fs;
    }

    getAsset(filePath) {
        for (const asset of this.assets) {
            if (asset.endsWith(filePath)) {
                return asset;
            }
        }
        return null;
    }

    // filter 
    getAssets(folderPath) {
        const assets = [];
        const basePath = this.baseDirectory.replace("assets/", "") + 'assets/';
        for (const asset of this.assets) {
            if (asset.startsWith(basePath + folderPath)) {
                assets.push('assets/' + asset);
            }
        }
        return assets;
    }

    addAssets(assets) {
        if (assets.length) {
            const uniqueAssets = new Set([...this.assets,...assets]);
            this.assets.push(...Array.from(uniqueAssets));
        }
    }

    getAssetOverrides() {
        const overrides = new Map;
        const relativeModPath = this.baseDirectory.substring(7);

        for (const asset of this.assets) {
            overrides.set('/' + asset.replace(relativeModPath, ''), '/assets/' + asset);
        }
        return overrides;
    }
    
    async executeScriptStage(name, document) {
        switch(name) {
            case "preload":{
                if (this.preload) {
                    await this._loadScript(this.preload, document, this.isModule);
                } 
                break; 
            }
            case "postload": {
                if (this.postload) {
                    await this._loadScript(this.postload, document, this.isModule);
                }
                break;
            }
            case "prestart": {
                if (this.prestart) {
                    await this._loadScript(this.prestart, document, this.isModule);
                }
                break;
            }
        }
    }

    async executePluginStage(name) {
        if (!this.pluginInstance)
            return;
        
        switch(name) {
            case "preload":{
                this.pluginInstance.preload();
                break; 
            }
            case "postload": {
                this.pluginInstance.postload();
                break;
            }
            case "prestart": {
                this.pluginInstance.prestart();
                break;
            }
        }
    }

    _loadScript(path, document, isModule = false) {
        const script = document.createElement('script');
        script.type = isModule? "module": "text/javascript";
        script.src = path;
        return new Promise((resolve, reject) => {

            script.onload = () => resolve();
            script.onerror = (err) => reject(err);

            document.head.appendChild(script);
        });
    }

    get isModule() {
        return this.getPackageData('module') || false;
    }

    getDependencyNode() {
        return this.dependencyNode;
    }

    get baseDirectory() {
        return this.pathname;
    }

    setPlugin(instance) {
        this.pluginInstance = instance;
    }

    get dependencies() {
        return this.getPackageData('ccmodDependencies') || {};
    }

    get description() {
        return this.getPackageData('description') || "";
    }

    get version() {
        return this.getPackageData('version') || '0.0.0';
    }

    get name() {
        return this.package.name;
    }

    get plugin() {
        return this.getPackageData('plugin');
    }
    
    get preload() {
        return this.getPackageData('preload');
    }

    get postload() {
        return this.getPackageData('postload');
    }

    get prestart() {
        return this.getPackageData('prestart');
    }

    getPackageData(key) {
        const scripts = ['preload', 'postload', 'prestart', 'main', 'plugin'];

        if (scripts.includes(key)) {
            if (typeof this.package[key] === "string") {
                return this.path + '/' + this.package[key];
            }
        }
        return this.package[key];
    }
}