
import ModManagerOffline from "./../../../offline.js";
const modManager = new ModManagerOffline;

const requestOverrides = {

};
window.setAjaxOverride = function(path, data) {
    requestOverrides[path] = data;
}
window.addStageScript("preload", async function() {
    await modManager.init();
});


$.ajaxSetup({
    beforeSend: (_, settings) => {
        if (typeof settings.url !== "string") {
            return;
        }

        const originalUrl = settings.url;

        let requestData = requestOverrides[originalUrl];
        const patchPaths = modManager.getModPatchesPaths(originalUrl);

        if (patchPaths.length) {
            (async function() {     
                if (originalUrl.endsWith('.json')) {
                    let successArgs;
                    try {
                        let jsonData = null;
                        if (!requestData) {
                            jsonData = await modManager.loadJSON(originalUrl);
                        }
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
        } else if (requestData) {
            settings.success.apply(settings.context, [JSON.parse(JSON.stringify(requestData))]);;
            return false;
        }
    }
});