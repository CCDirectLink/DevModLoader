import Mod from "./mod.js";

export default class FakeMod extends Mod {
    constructor(name, version) {
        super('', {
            name,
            version
        });
    }
}
