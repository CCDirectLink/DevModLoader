export default class DependencyNode {
    constructor(mod) {
        this.setInstance(mod);
        this.name = mod.name;
        this.version = mod.version;
        this.dependent = {};
    }

    reset() {
        this.dependent = {};

    }

    addDependent(node) {
        this.dependent[node.name] = node;
    }

    getDependents() {
        return this.dependent;
    }

    setInstance(instance) {
        this.instance = instance;
    }


    getInstance() {
        return this.instance;
    }
}