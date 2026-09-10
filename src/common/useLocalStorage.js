// Copyright (C) 2017-2026 Smart code 203358507

const React = require('react');

const STORAGE_KEY_PREFIX = 'stremio_web_';

const readValue = (storageKey, defaultValue) => {
    if (typeof window === 'undefined' || !window.localStorage) {
        return defaultValue;
    }

    try {
        const stored = window.localStorage.getItem(storageKey);
        return stored === null ? defaultValue : JSON.parse(stored);
    } catch (error) {
        console.warn(`Failed to read localStorage key "${storageKey}":`, error);
        return defaultValue;
    }
};

const useLocalStorage = (key, defaultValue) => {
    const storageKey = `${STORAGE_KEY_PREFIX}${key}`;
    const [value, setValue] = React.useState(() => readValue(storageKey, defaultValue));
    const previousStorageKey = React.useRef(storageKey);

    React.useEffect(() => {
        if (previousStorageKey.current !== storageKey) {
            previousStorageKey.current = storageKey;
            setValue(readValue(storageKey, defaultValue));
        }
    }, [storageKey]);

    const setStoredValue = React.useCallback((nextValue) => {
        setValue((currentValue) => {
            const resolvedValue = typeof nextValue === 'function' ? nextValue(currentValue) : nextValue;
            if (typeof window !== 'undefined' && window.localStorage) {
                try {
                    if (resolvedValue === undefined) {
                        window.localStorage.removeItem(storageKey);
                    } else {
                        window.localStorage.setItem(storageKey, JSON.stringify(resolvedValue));
                    }
                } catch (error) {
                    console.warn(`Failed to write localStorage key "${storageKey}":`, error);
                }
            }
            return resolvedValue;
        });
    }, [storageKey]);

    return [value, setStoredValue];
};

module.exports = useLocalStorage;
