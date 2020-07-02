export default class Fs {
    constructor() {
        this.fs = this.isNw() ? require('fs') : null;
        this.path = this.isNw() ? require('path') : null;
    }

    async getModPaths() {
        const mods = [];

        if (this.isNw()) {
            const modsFolder = this.path.join(process.cwd(), 'assets/', 'mods');
            if (this.fs.existsSync(modsFolder)) {
                const modsFolders = this.fs.readdirSync(modsFolder);
                for (const modFolder of modsFolders) {
                    let modExists = this.fs.existsSync(this.path.join(modsFolder, modFolder, 'package.json'));;
                    if (modExists) {
                        mods.push(location.origin + '/assets/mods/' + modFolder);
                    }
                }
            }

        } else {

        }

        return mods;
    }

    isNw() {
        return typeof nw !== 'undefined' && nw.require;
    }
}