// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');

const STORAGE_KEY_PREFIX = 'stremio_web_';

/**
 * Custom hook for managing client-side settings in localStorage
 * @param {string} key - The storage key (will be prefixed with 'stremio_web_')
 * @param {*} defaultValue - Default value if not found in storage
 * @returns {[*, function]} - Current value and setter function
 */
const useLocalStorage = (key, defaultValue) => {
    const storageKey = STORAGE_KEY_PREFIX + key;

    const [value, setValue] = React.useState(() => {
        try {
            const stored = window.localStorage.getItem(storageKey);
            if (stored !== null) {
                return JSON.parse(stored);
            }
            return defaultValue;
        } catch (error) {
            console.warn(`Failed to read localStorage key "${storageKey}":`, error);
            return defaultValue;
        }
    });

    const setStoredValue = React.useCallback((newValue) => {
        try {
            const valueToStore = typeof newValue === 'function' ? newValue(value) : newValue;
            setValue(valueToStore);
            window.localStorage.setItem(storageKey, JSON.stringify(valueToStore));
        } catch (error) {
            console.warn(`Failed to write localStorage key "${storageKey}":`, error);
        }
    }, [storageKey, value]);

    return [value, setStoredValue];
};

module.exports = useLocalStorage;
