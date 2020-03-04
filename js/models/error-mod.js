import FakeMod from "./fake-mod.js";

export default class ErrorMod extends FakeMod {
    constructor(name, version) {
        super(name, version);
        this.error = "";
    }

    setError(error) {
        this.error = error;
    }

    showError() {
        console.error(this.name, '', this.error);
    }
}