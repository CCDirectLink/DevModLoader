import Fs from "./fs.js";

export default class ModFs extends Fs {
    constructor(baseDirectory) {
        super();
        this.baseDirectory = baseDirectory;
    }

    async getAssets(relativePath, fileExtensions) {
        let foundAssets = [];
        if (this.isNw()) {
            const targetFolder = this.path.join(process.cwd(), this.baseDirectory, relativePath + '/');
            if (this.fs.existsSync(targetFolder)) {
                const assets = await this._recursiveFind(targetFolder, fileExtensions);
                foundAssets = assets.map(path => path.replace(process.cwd(), '').substr(8));
                if (navigator.platform === "Win32") {
                    foundAssets = foundAssets.map(path => path.replace(/\\/g, '/'));
                }
            }
        }
        return foundAssets;
    }

    async _recursiveFind(folderPath, fileExtensions) {
        const files = [];
        if (this.isNw()) {
            const filesInFolder = this.fs.readdirSync(folderPath);

            for (const file of filesInFolder) {
                const filePath = this.path.join(folderPath, file);
                if (this.fs.statSync(filePath).isFile()) {
                    const fileExtension = file.split('.').slice(-1).pop();
                    if (Array.isArray(fileExtensions)) {
                        if (fileExtensions.some(e => e === fileExtension)) {
                            files.push(filePath);
                        }
                    } else {
                        files.push(filePath);
                    }
                } else {
                    files.push(filePath + '/');
                    files.push(...await this._recursiveFind(filePath, fileExtensions));
                }
            }
        }
        return files;
    }
}