import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast, useLocalStorage, useModelState } from 'stremio/common';

type Stream = {
    name?: string,
    description?: string,
    url?: string,
    externalUrl?: string,
    behaviorHints?: { filename?: string },
    deepLinks?: { externalPlayer?: { download?: string, streaming?: string } },
};

type Addon = {
    transportUrl: string,
    manifest?: { name?: string, resources?: (string | { name?: string })[] },
};

type Video = { id: string, title?: string, season?: number, episode?: number };
type Result = { episode: number, title: string, url: string, filename?: string };

const ALL_ADDONS = 'all';
const getBaseUrl = (url: string) => url.replace(/\/manifest\.json\/?$/, '');
const supportsStreams = (addon: Addon) => addon.manifest?.resources?.some((resource) => resource === 'stream' || (typeof resource === 'object' && resource.name === 'stream'));

const fetchStreams = async (addon: Addon, type: string, videoId: string, signal: AbortSignal): Promise<Stream[]> => {
    try {
        const response = await fetch(`${getBaseUrl(addon.transportUrl)}/stream/${type}/${encodeURIComponent(videoId)}.json`, { signal });
        if (!response.ok) return [];
        const data = await response.json() as { streams?: Stream[] };
        return Array.isArray(data.streams) ? data.streams : [];
    } catch {
        return [];
    }
};
const useBatchDownload = ({ videos, type, season }: { videos: Video[], type: string, season: number | null }) => {
    const toast = useToast();
    const addonsAction = useMemo(() => ({
        action: 'Load',
        args: { model: 'InstalledAddonsWithFilters', args: { request: { type: null } } },
    }), []);
    const installedAddons = useModelState({
        model: 'installed_addons',
        action: addonsAction,
    }) as InstalledAddons;
    const [selectedAddon, setSelectedAddon] = useLocalStorage('batch_download_addon', ALL_ADDONS);
    const [releaseName, setReleaseName] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [completed, setCompleted] = useState(0);
    const [results, setResults] = useState<Result[]>([]);
    const cancelRef = useRef(false);
    const controllerRef = useRef<AbortController | null>(null);
    const finishDelayRef = useRef<(() => void) | null>(null);
    const streamAddons = useMemo(() => (installedAddons?.catalog || []).filter(supportsStreams), [installedAddons]);
    const seasonVideos = useMemo(() => videos.filter((video) => video.season === season), [season, videos]);
    const options = useMemo(() => [
        { value: ALL_ADDONS, label: 'All addons' },
        ...streamAddons.map((addon) => ({ value: addon.transportUrl, label: addon.manifest?.name || addon.transportUrl })),
    ], [streamAddons]);

    const start = useCallback(async () => {
        const query = releaseName.trim().toLowerCase();
        if (!query || seasonVideos.length === 0) return;
        const addons = selectedAddon === ALL_ADDONS ? streamAddons : streamAddons.filter((addon) => addon.transportUrl === selectedAddon);
        if (addons.length === 0) {
            toast.show({ type: 'error', title: 'No stream addons available', timeout: 3000 });
            return;
        }

        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        cancelRef.current = false;
        setIsDownloading(true);
        setCompleted(0);
        setResults([]);
        const found: Result[] = [];
        for (const [index, video] of seasonVideos.entries()) {
            if (cancelRef.current) break;
            const streams = (await Promise.all(addons.map((addon) => fetchStreams(addon, type || 'series', video.id, controller.signal)))).flat();
            const stream = streams.find((candidate) => `${candidate.name || ''} ${candidate.description || ''}`.toLowerCase().includes(query));
            const url = stream ? getDownloadUrl(stream) : null;
            if (url) found.push({ episode: video.episode ?? index + 1, title: video.title || '', url, filename: stream?.behaviorHints?.filename });
            setCompleted(index + 1);
            if (index < seasonVideos.length - 1 && !cancelRef.current) {
                await new Promise<void>((resolve) => {
                    const timeout = window.setTimeout(resolve, 2000);
                    finishDelayRef.current = () => {
                        window.clearTimeout(timeout);
                        resolve();
                    };
                });
                finishDelayRef.current = null;
            }
        }
        if (controller.signal.aborted) return;
        setResults(found);
        setIsDownloading(false);
        if (found.length > 0) toast.show({ type: 'success', title: `Found ${found.length} of ${seasonVideos.length} episodes`, timeout: 3000 });
        else if (!cancelRef.current) toast.show({ type: 'error', title: 'No matching streams found', timeout: 3000 });
    }, [releaseName, seasonVideos, selectedAddon, streamAddons, toast, type]);

    const cancel = useCallback(() => {
        cancelRef.current = true;
        controllerRef.current?.abort();
        finishDelayRef.current?.();
        finishDelayRef.current = null;
        setIsDownloading(false);
    }, []);
    useEffect(() => () => {
        cancelRef.current = true;
        controllerRef.current?.abort();
        finishDelayRef.current?.();
    }, []);
    return {
        releaseName,
        setReleaseName,
        options,
        selectedAddon,
        setSelectedAddon,
        isDownloading,
        completed,
        total: seasonVideos.length,
        results,
        start,
        cancel,
        clear: () => setResults([]),
        openAll: () => results.forEach((result) => window.open(result.url, '_blank', 'noopener,noreferrer')),
    };
};

export default useBatchDownload;
