// Copyright (C) 2017-2025 Smart code 203358507

const EventEmitter = require('eventemitter3');

const STORAGE_KEY = 'stremio_web_theme_url';
const STYLE_ELEMENT_ID = 'stremio-custom-theme';
const FETCH_TIMEOUT = 10000; // 10 second timeout for fetching CSS
const SHELL_IPC_TIMEOUT = 2000; // 2 second timeout for shell IPC

/**
 * Theme service that handles loading and applying custom CSS themes.
 * Uses shell API for file storage when available, falls back to localStorage.
 */
function Theme() {
    let currentUrl = null;
    let loading = false;
    let error = null;
    let css = null;

    const events = new EventEmitter();

    // Check if running in shell with theme API
    const isShell = () => {
        return typeof window !== 'undefined' && 
               window.stremioTheme && 
               window.stremioTheme.isShell === true;
    };

    // Get or create the style element for custom themes
    const getStyleElement = () => {
        let element = document.getElementById(STYLE_ELEMENT_ID);
        if (!element) {
            element = document.createElement('style');
            element.id = STYLE_ELEMENT_ID;
            element.type = 'text/css';
            document.head.appendChild(element);
        }
        return element;
    };

    // Apply CSS to the page
    const applyCSS = (cssContent) => {
        const styleElement = getStyleElement();
        styleElement.textContent = cssContent || '';
        css = cssContent;
    };

    // Remove custom theme
    const removeCSS = () => {
        const styleElement = document.getElementById(STYLE_ELEMENT_ID);
        if (styleElement) {
            styleElement.textContent = '';
        }
        css = null;
    };

    // Fetch CSS from URL with timeout
    const fetchCSS = async (url) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        try {
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Failed to fetch theme: ${response.status} ${response.statusText}`);
            }

            return response.text();
        } catch (e) {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') {
                throw new Error('Theme fetch timed out');
            }
            throw e;
        }
    };

    // Save URL to storage (shell or localStorage)
    const saveUrl = (url) => {
        if (isShell()) {
            try {
                window.stremioTheme.setUrl(url);
            } catch (e) {
                console.warn('Failed to save theme URL to shell:', e);
            }
        }
        // Always save to localStorage as backup
        try {
            if (url) {
                localStorage.setItem(STORAGE_KEY, url);
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (e) {
            console.warn('Failed to save theme URL to localStorage:', e);
        }
    };

    // Load URL from storage - localStorage first (fast), shell as fallback
    const loadStoredUrl = () => {
        // Always use localStorage - it's synchronous and fast
        try {
            return localStorage.getItem(STORAGE_KEY) || null;
        } catch (e) {
            console.warn('Failed to load theme URL from localStorage:', e);
            return null;
        }
    };

    // Load URL from shell storage with timeout
    const loadFromShell = () => {
        return new Promise((resolve) => {
            if (!isShell()) {
                resolve(null);
                return;
            }

            const timeoutId = setTimeout(() => {
                console.warn('Shell theme settings request timed out');
                resolve(null);
            }, SHELL_IPC_TIMEOUT);

            try {
                window.stremioTheme.getSettings()
                    .then((settings) => {
                        clearTimeout(timeoutId);
                        resolve(settings?.url || null);
                    })
                    .catch((e) => {
                        clearTimeout(timeoutId);
                        console.warn('Failed to load theme settings from shell:', e);
                        resolve(null);
                    });
            } catch (e) {
                clearTimeout(timeoutId);
                console.warn('Failed to call shell getSettings:', e);
                resolve(null);
            }
        });
    };

    function onStateChanged() {
        events.emit('stateChanged');
    }

    Object.defineProperties(this, {
        url: {
            configurable: false,
            enumerable: true,
            get: function() {
                return currentUrl;
            }
        },
        loading: {
            configurable: false,
            enumerable: true,
            get: function() {
                return loading;
            }
        },
        error: {
            configurable: false,
            enumerable: true,
            get: function() {
                return error;
            }
        },
        css: {
            configurable: false,
            enumerable: true,
            get: function() {
                return css;
            }
        },
        isShell: {
            configurable: false,
            enumerable: true,
            get: function() {
                return isShell();
            }
        }
    });

    /**
     * Load and apply a theme from a URL
     * @param {string} url - URL to a CSS file
     * @returns {Promise<void>}
     */
    this.load = async function(url) {
        if (!url) {
            return this.clear();
        }

        loading = true;
        error = null;
        onStateChanged();

        try {
            // Validate URL
            new URL(url);
            
            const cssContent = await fetchCSS(url);
            applyCSS(cssContent);
            currentUrl = url;
            saveUrl(url);
            error = null;
        } catch (e) {
            error = e;
            console.error('Failed to load theme:', e);
        } finally {
            loading = false;
            onStateChanged();
        }
    };

    /**
     * Clear the current theme and reset to default
     */
    this.clear = function() {
        removeCSS();
        currentUrl = null;
        error = null;
        saveUrl(null);
        onStateChanged();
    };

    /**
     * Initialize theme service - loads stored theme on startup
     */
    this.init = async function() {
        // First try localStorage (fast, synchronous)
        let storedUrl = loadStoredUrl();
        
        // If no localStorage URL and we're in shell, try shell storage
        if (!storedUrl && isShell()) {
            storedUrl = await loadFromShell();
            // Sync to localStorage if found in shell
            if (storedUrl) {
                try {
                    localStorage.setItem(STORAGE_KEY, storedUrl);
                } catch (e) {
                    // ignore
                }
            }
        }

        if (storedUrl) {
            await this.load(storedUrl);
        }
    };

    /**
     * Reload the current theme (useful if the remote CSS file was updated)
     */
    this.reload = async function() {
        if (currentUrl) {
            await this.load(currentUrl);
        }
    };

    this.on = function(name, listener) {
        events.on(name, listener);
    };

    this.off = function(name, listener) {
        events.off(name, listener);
    };
}

module.exports = Theme;
