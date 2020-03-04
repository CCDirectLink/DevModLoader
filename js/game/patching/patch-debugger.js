import {DebugState} from './lib/src/patchsteps.js';

export default class PatchDebugger extends DebugState {
	/**
	 * Sets current patch for context url resolving
	 * @param {{mod: Mod, path: string}} currentPatch 
	 */
	setBaseDirectory(baseDirectory) {
		this.baseDirectory = baseDirectory;
	}

	/**
	 * Prints current context file stack.
	 * @param {{path: string, stack: string[]}} file
	 */
	printFileInfo(file) {
		// resolve the urls
		let [protocol, path] = file.path.split(":");
		const newFile = Object.assign({},file);
		if (protocol === "mod") {
			newFile.path = this.baseDirectory + path;
		} else if (protocol === "game") {
			newFile.path = 'assets/' + path;
		}
		super.printFileInfo(newFile);
	}
}
