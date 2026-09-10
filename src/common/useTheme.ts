import { useCallback, useEffect, useState } from 'react';
import { useServices } from 'stremio/services';

type ThemeState = {
    url: string | null,
    loading: boolean,
    error: Error | null,
    isShell: boolean,
};

type ThemeActions = {
    loadTheme: (url: string) => Promise<void>,
    clearTheme: () => Promise<void>,
    reloadTheme: () => Promise<void>,
};

const useTheme = (): [ThemeState, ThemeActions] => {
    const { theme } = useServices();
    const getState = useCallback(() => ({
        url: theme.url,
        loading: theme.loading,
        error: theme.error,
        isShell: theme.isShell,
    }), [theme]);
    const [state, setState] = useState<ThemeState>(getState);

    useEffect(() => {
        setState(getState());
        const onStateChanged = () => setState(getState());
        theme.on('stateChanged', onStateChanged);
        return () => theme.off('stateChanged', onStateChanged);
    }, [getState, theme]);

    const loadTheme = useCallback((url: string) => theme.load(url), [theme]);
    const clearTheme = useCallback(() => theme.clear(), [theme]);
    const reloadTheme = useCallback(() => theme.reload(), [theme]);

    return [state, { loadTheme, clearTheme, reloadTheme }];
};

export default useTheme;
