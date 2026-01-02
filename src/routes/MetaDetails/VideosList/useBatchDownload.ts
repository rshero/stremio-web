// Copyright (C) 2017-2024 Smart code 203358507

import { useState, useCallback, useRef, useEffect } from 'react';
import { useServices } from 'stremio/services';
import { useToast, useLocalStorage } from 'stremio/common';

type Video = {
    id: string;
    title: string;
    season?: number;
    episode?: number;
};

type Stream = {
    name?: string;
    description?: string;
    url?: string;
    externalUrl?: string;
    infoHash?: string;
    fileIdx?: number;
    behaviorHints?: {
        filename?: string;
    };
    deepLinks?: {
        externalPlayer?: {
            download?: string;
            streaming?: string;
        };
    };
};

type Addon = {
    transportUrl: string;
    manifest: {
        name: string;
        resources?: (string | { name: string })[];
    };
};

type DownloadResult = {
    episode: number;
    title: string;
    url: string;
    filename?: string;
};

type UseBatchDownloadProps = {
    metaItem: {
        id?: string;
        type?: string;
        videos?: Video[];
    };
    season: number | null;
};

type UseBatchDownloadReturn = {
    releaseName: string;
    setReleaseName: (name: string) => void;
    selectedAddon: string;
    setSelectedAddon: (addon: string) => void;
    availableAddons: { value: string; label: string }[];
    isDownloading: boolean;
    currentEpisode: number | null;
    totalEpisodes: number;
    completedEpisodes: number;
    downloadResults: DownloadResult[];
    showResults: boolean;
    startBatchDownload: () => Promise<void>;
    cancelDownload: () => void;
    clearResults: () => void;
    openAllDownloads: () => void;
};

const ALL_ADDONS_KEY = 'all';

// Get base URL from addon transport URL (strip /manifest.json suffix)
function getAddonBaseUrl(transportUrl: string): string {
    return transportUrl.replace(/\/manifest\.json\/?$/, '');
}

// Fetch streams from a single addon
async function fetchStreamsFromAddon(
    addonUrl: string,
    type: string,
    videoId: string
): Promise<Stream[]> {
    try {
        const baseUrl = getAddonBaseUrl(addonUrl);
        const url = `${baseUrl}/stream/${type}/${encodeURIComponent(videoId)}.json`;
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        return data.streams || [];
    } catch {
        return [];
    }
}

// Filter addons that support streams
function getStreamAddons(addons: Addon[]): Addon[] {
    return addons.filter((addon) =>
        addon.manifest.resources?.some(
            (r) => r === 'stream' || (typeof r === 'object' && r.name === 'stream')
        )
    );
}

// Fetch streams for a video from specified addons
async function fetchStreamsForVideo(
    addons: Addon[],
    type: string,
    videoId: string
): Promise<Stream[]> {
    const results = await Promise.allSettled(
        addons.map((addon) =>
            fetchStreamsFromAddon(addon.transportUrl, type, videoId)
        )
    );

    return results
        .filter((r): r is PromiseFulfilledResult<Stream[]> => r.status === 'fulfilled')
        .flatMap((r) => r.value);
}

// Find stream matching release name (case-insensitive partial match)
function findMatchingStream(streams: Stream[], releaseName: string): Stream | null {
    const searchLower = releaseName.toLowerCase().trim();
    return streams.find((stream) => {
        const description = (stream.description || '').toLowerCase();
        const name = (stream.name || '').toLowerCase();
        return description.includes(searchLower) || name.includes(searchLower);
    }) || null;
}

// Get download URL from stream
function getDownloadUrl(stream: Stream): string | null {
    return (
        stream.url ||
        stream.externalUrl ||
        stream.deepLinks?.externalPlayer?.download ||
        stream.deepLinks?.externalPlayer?.streaming ||
        null
    );
}

// Get filename from stream
function getFilename(stream: Stream): string | undefined {
    return stream.behaviorHints?.filename;
}

const useBatchDownload = ({ metaItem, season }: UseBatchDownloadProps): UseBatchDownloadReturn => {
    const { core } = useServices();
    const toast = useToast();

    const [releaseName, setReleaseName] = useState('');
    const [selectedAddon, setSelectedAddon] = useLocalStorage('batch_download_addon', ALL_ADDONS_KEY);
    const [availableAddons, setAvailableAddons] = useState<{ value: string; label: string }[]>([]);
    const [isDownloading, setIsDownloading] = useState(false);
    const [currentEpisode, setCurrentEpisode] = useState<number | null>(null);
    const [completedEpisodes, setCompletedEpisodes] = useState(0);
    const [downloadResults, setDownloadResults] = useState<DownloadResult[]>([]);
    const [showResults, setShowResults] = useState(false);

    const cancelRef = useRef(false);
    const addonsRef = useRef<Addon[]>([]);

    const videos = metaItem?.videos?.filter((v) => v.season === season) || [];
    const totalEpisodes = videos.length;

    // Load available addons on mount
    useEffect(() => {
        const loadAddons = async () => {
            try {
                await core.transport.dispatch({
                    action: 'Load',
                    args: {
                        model: 'InstalledAddonsWithFilters',
                        args: { request: { type: null } }
                    }
                }, 'installed_addons');

                await new Promise((resolve) => setTimeout(resolve, 100));

                const state = await core.transport.getState('installed_addons') as { catalog?: Addon[] } | null;
                const allAddons = state?.catalog || [];
                const streamAddons = getStreamAddons(allAddons);

                addonsRef.current = streamAddons;

                const options = [
                    { value: ALL_ADDONS_KEY, label: 'All Addons' },
                    ...streamAddons.map((addon) => ({
                        value: addon.transportUrl,
                        label: addon.manifest.name,
                    })),
                ];
                setAvailableAddons(options);
            } catch {
                // Silently fail
            }
        };

        loadAddons();
    }, [core]);

    const startBatchDownload = useCallback(async () => {
        if (!releaseName.trim()) {
            toast.show({
                type: 'error',
                title: 'Please enter a release name to search for',
                timeout: 3000,
            });
            return;
        }

        if (videos.length === 0) {
            toast.show({
                type: 'error',
                title: 'No episodes found for this season',
                timeout: 3000,
            });
            return;
        }

        const addonsToUse = selectedAddon === ALL_ADDONS_KEY
            ? addonsRef.current
            : addonsRef.current.filter((a) => a.transportUrl === selectedAddon);

        if (addonsToUse.length === 0) {
            toast.show({
                type: 'error',
                title: 'No stream addons available',
                timeout: 3000,
            });
            return;
        }

        setIsDownloading(true);
        setCompletedEpisodes(0);
        setDownloadResults([]);
        setShowResults(false);
        cancelRef.current = false;

        const results: DownloadResult[] = [];
        let failCount = 0;

        for (let i = 0; i < videos.length; i++) {
            if (cancelRef.current) {
                toast.show({
                    type: 'success',
                    title: `Cancelled - Found ${results.length} of ${videos.length} episodes`,
                    timeout: 3000,
                });
                break;
            }

            const video = videos[i];
            const episodeNum = video.episode ?? i + 1;
            setCurrentEpisode(episodeNum);

            // Fetch streams for this episode
            const streams = await fetchStreamsForVideo(
                addonsToUse,
                metaItem.type || 'series',
                video.id
            );

            // Find matching stream
            const matchingStream = findMatchingStream(streams, releaseName);

            if (matchingStream) {
                const downloadUrl = getDownloadUrl(matchingStream);
                if (downloadUrl) {
                    results.push({
                        episode: episodeNum,
                        title: video.title,
                        url: downloadUrl,
                        filename: getFilename(matchingStream),
                    });
                } else {
                    failCount++;
                }
            } else {
                failCount++;
            }

            setCompletedEpisodes(i + 1);

            // Delay between requests to avoid rate limiting (429)
            if (i < videos.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }

        setDownloadResults(results);
        setIsDownloading(false);
        setCurrentEpisode(null);

        if (!cancelRef.current) {
            if (results.length > 0) {
                setShowResults(true);
                toast.show({
                    type: 'success',
                    title: `Found ${results.length}/${videos.length} episodes${failCount > 0 ? `. ${failCount} failed.` : ''}`,
                    timeout: 3000,
                });
            } else {
                toast.show({
                    type: 'error',
                    title: 'No matching streams found for any episode',
                    timeout: 3000,
                });
            }
        }
    }, [releaseName, videos, metaItem, selectedAddon, toast]);

    const cancelDownload = useCallback(() => {
        cancelRef.current = true;
    }, []);

    const clearResults = useCallback(() => {
        setDownloadResults([]);
        setShowResults(false);
    }, []);

    const openAllDownloads = useCallback(() => {
        downloadResults.forEach((result, index) => {
            // Stagger the opens to avoid popup blockers
            setTimeout(() => {
                window.open(result.url, '_blank');
            }, index * 500);
        });
    }, [downloadResults]);

    return {
        releaseName,
        setReleaseName,
        selectedAddon,
        setSelectedAddon,
        availableAddons,
        isDownloading,
        currentEpisode,
        totalEpisodes,
        completedEpisodes,
        downloadResults,
        showResults,
        startBatchDownload,
        cancelDownload,
        clearResults,
        openAllDownloads,
    };
};

export default useBatchDownload;
