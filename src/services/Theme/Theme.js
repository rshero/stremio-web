// Copyright (C) 2017-2026 Smart code 203358507

const EventEmitter = require('eventemitter3');

const STORAGE_KEY = 'stremio_web_theme_url';
const STYLE_ELEMENT_ID = 'stremio-custom-theme';
const FETCH_TIMEOUT = 10000;

const Theme = function() {
    let currentUrl = null;
    let loading = false;
    let error = null;
    let css = null;
    const events = new EventEmitter();

    const shellTheme = () => typeof window !== 'undefined' ? window.stremioTheme : null;
    const isShell = () => shellTheme()?.isShell === true;

    const emit = () => events.emit('stateChanged');

    const applyCSS = (value) => {
        let element = document.getElementById(STYLE_ELEMENT_ID);
        if (!element) {
            element = document.createElement('style');
            element.id = STYLE_ELEMENT_ID;
            document.head.appendChild(element);
        }
        element.textContent = value || '';
        css = value || null;
    };

    const clearCSS = () => {
        const element = document.getElementById(STYLE_ELEMENT_ID);
        element?.remove();
        css = null;
    };

    const fetchCSS = async (url) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
        try {
            const response = await fetch(url, { signal: controller.signal, cache: 'no-cache' });
            if (!response.ok) {
                throw new Error(`Failed to fetch theme: ${response.status} ${response.statusText}`);
            }
            return await response.text();
        } catch (cause) {
            if (cause?.name === 'AbortError') {
                throw new Error('Theme fetch timed out');
            }
            throw cause;
        } finally {
            clearTimeout(timeout);
        }
    };

    const saveUrl = (url) => {
        const api = shellTheme();
        try {
            if (api?.setUrl) {
                api.setUrl(url);
            }
        } catch (cause) {
            console.warn('Failed to save theme URL to shell:', cause);
        }
        try {
            if (url) {
                localStorage.setItem(STORAGE_KEY, url);
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (cause) {
            console.warn('Failed to save theme URL to localStorage:', cause);
        }
    };

    const loadStoredUrl = async () => {
        try {
            const localUrl = localStorage.getItem(STORAGE_KEY);
            if (localUrl) return localUrl;
        } catch (cause) {
            console.warn('Failed to load theme URL from localStorage:', cause);
        }

        const api = shellTheme();
        if (!api?.getSettings) return null;
        try {
            const settings = await Promise.race([
                Promise.resolve(api.getSettings()),
                new Promise((resolve) => setTimeout(() => resolve(null), 2000)),
            ]);
            return settings?.url || null;
        } catch (cause) {
            console.warn('Failed to load theme settings from shell:', cause);
            return null;
        }
    };

    Object.defineProperties(this, {
        url: { enumerable: true, get: () => currentUrl },
        loading: { enumerable: true, get: () => loading },
        error: { enumerable: true, get: () => error },
        css: { enumerable: true, get: () => css },
        isShell: { enumerable: true, get: isShell },
    });

    this.load = async (url) => {
        const nextUrl = typeof url === 'string' ? url.trim() : '';
        if (!nextUrl) {
            return this.clear();
        }

        loading = true;
        error = null;
        emit();
        try {
            const parsed = new URL(nextUrl);
            if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
                throw new Error('Theme URL must use HTTP or HTTPS');
            }
            const value = await fetchCSS(nextUrl);
            applyCSS(value);
            currentUrl = nextUrl;
            saveUrl(nextUrl);
        } catch (cause) {
            error = cause instanceof Error ? cause : new Error(String(cause));
            console.error('Failed to load theme:', error);
        } finally {
            loading = false;
            emit();
        }
    };

    this.clear = async () => {
        clearCSS();
        currentUrl = null;
        error = null;
        saveUrl(null);
        emit();
    };

    this.init = async () => {
        const storedUrl = await loadStoredUrl();
        if (storedUrl) await this.load(storedUrl);
    };

    this.reload = async () => {
        if (currentUrl) await this.load(currentUrl);
    };

    this.on = (name, listener) => events.on(name, listener);
    this.off = (name, listener) => events.off(name, listener);
};

module.exports = Theme;
