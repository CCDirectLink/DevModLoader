
import ModManagerOffline from "./../../../offline.js";

const modManager = new ModManagerOffline;
const baseURL = 'http://localhost:4000/assets/';

modManager.setBaseURL(baseURL);
window.addStageScript("preload", async function () {
    await modManager.init();
});

// this injection allows assets url replacement for all non json loadables
callWhenModuleLoaded("impact.base.loader", function () {
    const cacheTypesWhiteList = [
        'Image',
        'MultiAudio',
        'WebAudioBuffer',
        'Video'
    ];
    ig.Loadable.inject({
        init: function (path) {
            if (typeof path === "string") {
                const shouldOverride = cacheTypesWhiteList.some(type => type === this.cacheType);
                if (shouldOverride) {
                    path = modManager.getAssetPathOveride(path.trim(), true);
                }
            }
            this.parent(path);
        }
    });
});

$.ajaxSetup({
    beforeSend: (_, settings) => {
        if (typeof settings.url !== "string") {
            return;
        }

        const originalUrl = settings.url;
        let patchedUrl = modManager.relativeToFullPath(modManager.getAssetPathOveride(originalUrl));
        settings.url = patchedUrl;
        const patchPaths = modManager.getModPatchesPaths(originalUrl);

        if (patchPaths.length) {
            (async function () {
                if (originalUrl.endsWith('.json')) {
                    let successArgs;
                    try {
                        let jsonData = await modManager.loadJSON(patchedUrl);
                        await modManager.patchJSON(jsonData, originalUrl);
                        successArgs = jsonData;
                    } catch (e) {
                        settings.error.apply(settings.context, [e]);
                        return;
                    }

                    settings.success.apply(settings.context, [successArgs]);
                }
            })()
            return false;
        }
    }
});