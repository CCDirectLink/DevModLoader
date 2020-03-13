
importScripts(
    'js/lib/jszip.min.js',
    'js/packed-mod.js'
);

const packedModManager = new PackedModManager();

self.addEventListener('install', function(event) {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
});

const override = new Map;
let assetsOverride = new Map;
self.addEventListener('message', (event) => {
    const data = event.data;

    switch(data.type) {
        case 'url-override': {
            override.set(data.url, data.html);
            break;
        }
        case 'assets-override': {
            assetsOverride = data.data;
            break;
        }
    }

    if (event.ports.length) {
        event.ports[0].postMessage(true);
    }
});

self.addEventListener('fetch', function(event) {
    let originalUrl = event.request.url;
    
    let url = new URL(originalUrl);

    if (assetsOverride.has(url.pathname)) {
        originalUrl = location.origin + assetsOverride.get(url.pathname);

        url = new URL(originalUrl);
    }

    

    if (override.has(originalUrl)) {
        event.respondWith((async function() {
            return new Response(override.get(originalUrl), {
                status: 200,
                statusText: "Overriden",
                headers: {
                    // TODO: Make this more flexible
                   "Content-Type": "text/html" 
                }
            });
        })());
    } else if (originalUrl.includes(".ccmod")) {
            
        let relativePath = url.pathname;
        
        const relativeUrlStart = relativePath.indexOf(".ccmod") + ".ccmod".length;

        const packedPath = relativePath.substring(0, relativeUrlStart);


        relativePath = relativePath.substring(relativeUrlStart);

        if (relativePath.startsWith('/')) {
            relativePath = relativePath.substring(1);            
        }

        if (event.request.method === "GET") {
            event.respondWith((async function() {
            
                const response = await packedModManager.preload(packedPath);
                if (response) {
                    return response;
                }
    
                return packedModManager.getAsset(packedPath, relativePath);
    
            })());
        } else if (event.request.method === "POST") {
            event.respondWith((async function() {

                const response = await packedModManager.preload(packedPath);
                
                if (response) {
                    return response;
                }

                const relativeDir = event.request.headers.get('x-dir') || '';

                return packedModManager.getAssets(packedPath, relativeDir);
    
            })());          
        }

    } else {
        event.respondWith(fetch(originalUrl));
    }
});