export default class DocumentManager {
    constructor(doc) {
        this.doc = doc;
    }

    mergeGameHtml(gameHtml) {
        for (const headChild of gameHtml.head.children) {
            this.doc.head.appendChild(headChild.cloneNode(true));
        }
        
        for (const bodyChild of gameHtml.body.children) {
            this.doc.body.appendChild(bodyChild.cloneNode(true));
        }
    }

    findScriptWithText(text) {
        const scripts = this.doc.getElementsByTagName('script');
        for(const script of scripts) {
            const trimSrc = script.innerHTML.trim();
            if (trimSrc) {
                if (trimSrc.includes(text)) {
                    return script;
                }
            }
        }
        return null;
    }

    injectBase() {
        const doc = this.doc;
        const base = doc.createElement('base');
        base.href = "/assets/";
        doc.head.insertBefore(base, doc.head.firstElementChild);
    }

    insertBefore(newNode, refNode) {
        refNode.parentElement.insertBefore(newNode, refNode);
    }

    createScript(src, isModule = false) {
        const script = this.doc.createElement('script');
        script.src = src;
        script.type = isModule? "module": "text/javascript";
        return script;
    }

    deferGameScriptCall() {
        let element = this.findGameScript();
        
        while (element !== null) {
            if (element instanceof HTMLScriptElement) {
                element.type = 'javascript/wait-for-preload';
            }
            const nextElementSibling = element.nextElementSibling;
            element = nextElementSibling;
        }
    }

    findGameScript() {
        for (const element of this.doc.head.children) {
            if (element instanceof HTMLScriptElement) {
                if (element.src && element.src.endsWith("js/game.compiled.js")) {
                    return element;
                } 
            }
        }
        return null;
    }

    injectPrestart() {
        const doc = this.doc;
        const script = doc.createElement('script');
        script.text = 'window.onload = null;';
        
        doc.body.appendChild(script);
    }

    documentToString() {
        return this.doc.documentElement.outerHTML;
    }
}