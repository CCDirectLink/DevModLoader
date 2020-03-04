export default class StageLoader {
    constructor() {
        this.mods = [];
        this.frame = null;
        this.stages = {};
    }

    setMods(mods) {
        this.mods.splice(0);
        this.mods.push(...mods);
    }

    onFrameSet(frame) {
        this.frame = frame;
        
        const window = frame.contentWindow;
        window.addStageScript = (stageName, cb) => {
            if (!this.stages[stageName]) {
                this.stages[stageName] = [];
            }
            this.stages[stageName].push(cb);
        }
    }

    async load(stageName) {
        if (Array.isArray(this.stages[stageName])) {
            for (const stageScript of this.stages[stageName]) {
                try {
                    await stageScript();
                } catch (e) {}
            }
        }

        for (const mod of this.mods) {
            try {
                await mod.executeScriptStage(stageName, this.frame.contentDocument);
            } catch (e) {}
            try {
                await mod.executePluginStage(stageName);
            } catch (e) {}
        }
    }

}