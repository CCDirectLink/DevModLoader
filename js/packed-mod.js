class ZipHandler {
    constructor(zip) {
        this.zip = zip;
    }


    async loadZip(zipPath, obj) {
        const root = this._createFolders(this.zip, zipPath.split('/'));
        await root.loadAsync(obj, {createFolders: true});
    }

    listFiles(zipPath) {
        const filePaths = [];
        const folderEntry = this._createFolders(this.zip, zipPath.split('/'));
        folderEntry.forEach((relativePath, file) => {
            if (!file.dir) {
                filePaths.push(zipPath + relativePath);
            }
        });
        return filePaths;
    }

    async getAsset(zipPath, type = 'arraybuffer') {
        const resource = this.zip.files[zipPath];
        if (!resource) {
            return undefined;
        }
        return resource.async(type);
    }

    hasPath(aPath) {
        return !!this.zip.files[aPath];
    }

    _createFolders(root, folderArr) {
        for (const folder of folderArr) {
            root = root.folder(folder);
        }
        return root;
    }

    clear() {
        const files = Object.keys(this.zip.files);

        if (files.length) {
            this.zip.remove(files[0]);

        }
    }

}

class PackedModManager {
    constructor() {
        this.zipHandler = new ZipHandler(new JSZip);
        this.preloadAttempted = {};
    }


    _zipFriendlyPath(path) {
        if (path.startsWith('/')) {
            path = path.substring(1);
        }

        if(!path.endsWith('/')) {
            path = path + '/';
        }

        return path;
    }

    async preload(zipPath) {

        const fakePath = this._zipFriendlyPath(zipPath);
        if (this.hasZip(fakePath)) {
            return null;
        }

        if (!this.preloadAttempted[zipPath]) {
            this.preloadAttempted[zipPath] = true;
                let blob = null;
                try {
                    blob = await fetch(zipPath).then((res) => res.arrayBuffer());
                } catch (e) {
                    console.log(e);
                }

                if (blob) {
                    try {
                        await this.zipHandler.loadZip(fakePath, blob);
                    } catch (e) {
                        console.log(e);
                        return new Response(null, {
                            status: 504,
                            statusText: 'Internal Error'
                        });
                    }
                    return null;
                }
        }

        return new Response(null, {
            status: 404,
            statusText: 'Zip File Not Found'
        });
    }

    async getAssets(zipPath, relativePath = 'assets/') {
        const fakePath = this._zipFriendlyPath(zipPath);
        if (!this.hasZip(fakePath)) {
            new Response(null, {
                status: 404,
                statusText: 'Folder Not Found'
            });
        }

        const fakeFullPath = this._zipFriendlyPath(fakePath + relativePath);
        
        let results = [];

        if (this.zipHandler.hasPath(fakeFullPath)) {
            results = this.zipHandler.listFiles(fakeFullPath);
        }

        return new Response(JSON.stringify(results), {
            status: 200,
            statusText: 'Okay'
        });
    }


    hasZip(zipPath) {
        return this.zipHandler.hasPath(zipPath);
    }

    async getAsset(zipPath, relativePath) {
        const fakePath = this._zipFriendlyPath(zipPath);

        if (!this.hasZip(fakePath)) {
            return new Response(null, {
                status: 404,
                statusText: 'Zip File Not Found'
            });
        }



        const zipPathToAsset = fakePath + relativePath;
    
        if (!this.zipHandler.hasPath(zipPathToAsset)) {
            return new Response(null, {
                status: 404,
                statusText: 'File Not Found'
            });
        }

        const result = await this.zipHandler.getAsset(zipPathToAsset, 'arraybuffer');

        return new Response(result, {
            status: 200,
            headers: {
				'Content-Type': this.getFileMime(relativePath)
			}
        });
    }

    // TODO
    clear() {
        this.preloadAttempted = {};
        this.zipHandler.clear();
    }

    /**
     * Allow users to specify custom extensions
     */
    getFileMime(fileName) {
        if (fileName.endsWith('png')) {
            return 'image/png';
        } else if (fileName.endsWith('jpg') || fileName.endsWith('jpeg')) {
            return 'image/jpeg';
        } else if (fileName.endsWith('ogg')) {
            return 'audio/ogg';
        } else if (fileName.endsWith('json')) {
            return 'application/json';
        } else if (fileName.endsWith('js')) {
            return 'application/javascript';
        }
        return "text/plain";
    }
}