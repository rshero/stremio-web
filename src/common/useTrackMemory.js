// Copyright (C) 2017-2026 Smart code 203358507

const React = require('react');
const useLocalStorage = require('./useLocalStorage');

const useTrackMemory = (contentId, contentType) => {
    const enabled = contentType === 'series' && typeof contentId === 'string' && contentId.length > 0;
    const [memory, setMemory] = useLocalStorage(`track_memory_${enabled ? contentId : 'disabled'}`, null);

    const saveTrackSelection = React.useCallback((selection) => {
        if (!enabled || !selection || typeof selection !== 'object') {
            return;
        }

        setMemory((current) => ({
            ...(current && typeof current === 'object' ? current : {}),
            ...selection,
        }));
    }, [enabled, setMemory]);

    return {
        memory: enabled && memory && typeof memory === 'object' ? memory : null,
        saveTrackSelection,
    };
};

module.exports = useTrackMemory;
