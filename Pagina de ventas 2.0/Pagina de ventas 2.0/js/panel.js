(function () {
    if (window.__NOVAGEST_PANEL_BOOTSTRAPPED__) {
        return;
    }

    const scriptSources = [
        'js/panel-core.js',
        'js/panel-renderers.js',
        'js/panel-actions.js',
        'js/panel-events.js'
    ];

    let currentIndex = 0;

    function loadNextScript() {
        if (currentIndex >= scriptSources.length) {
            window.__NOVAGEST_PANEL_BOOTSTRAPPED__ = true;
            return;
        }

        const src = scriptSources[currentIndex];
        currentIndex += 1;

        const alreadyLoaded = document.querySelector("script[data-panel-split='" + src + "']");
        if (alreadyLoaded) {
            loadNextScript();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.defer = false;
        script.dataset.panelSplit = src;
        script.onload = loadNextScript;
        script.onerror = function () {
            console.error('No se pudo cargar el archivo:', src);
        };

        (document.body || document.documentElement).appendChild(script);
    }

    loadNextScript();
})();