import ErrorMod from "./error-mod.js";

export default class MissingMod extends ErrorMod {
    constructor(name) {
        super(name, "");
        this.setError(`${name} is missing.`);
    }
}