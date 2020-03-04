import Mod from "./mod.js";

export default class GameMod extends Mod {
    constructor(name, version) {
        super('', {
            name,
            version
        });
    }

    getAssets(folderPath) {
        const assets = [];
        for (const asset of this.assets) {
            if (asset.startsWith(folderPath)) {
                assets.push('assets/' + asset);
            }
        }
        return assets;
    }
}
