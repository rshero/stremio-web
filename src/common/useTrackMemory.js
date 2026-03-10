// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const useLocalStorage = require('./useLocalStorage');

/**
 * Hook for remembering audio/subtitle track selections per series.
 * When watching a TV series, this remembers your track choices so the next episode
 * automatically uses the same audio/subtitle tracks (if available).
 * 
 * @param {string} seriesId - The series ID (from urlParams.id)
 * @param {string} type - Content type ("series" or "movie")
 * @returns {{ memory: object|null, saveTrackSelection: function }}
 */
const useTrackMemory = (seriesId, type) => {
    // Only enable for series, not movies
    const isEnabled = type === 'series' && typeof seriesId === 'string' && seriesId.length > 0;
    const storageKey = isEnabled ? `track_memory_${seriesId}` : null;

    const [memory, setMemory] = useLocalStorage(storageKey, null);

    const saveTrackSelection = React.useCallback((audioTrackId, subtitlesTrackId, extraSubtitlesTrackId) => {
        if (!isEnabled) return;
        setMemory({
            audioTrackId: audioTrackId ?? null,
            subtitlesTrackId: subtitlesTrackId ?? null,
            extraSubtitlesTrackId: extraSubtitlesTrackId ?? null,
        });
    }, [isEnabled, setMemory]);

    return {
        memory: isEnabled ? memory : null,
        saveTrackSelection,
    };
};

module.exports = useTrackMemory;
