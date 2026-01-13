// Copyright (C) 2017-2025 Smart code 203358507

import { useCallback, useEffect, useState } from 'react';
import { useServices } from 'stremio/services';

type ThemeState = {
    url: string | null;
    loading: boolean;
    error: Error | null;
    isShell: boolean;
};

type UseThemeReturn = [
    ThemeState,
    {
        loadTheme: (url: string) => Promise<void>;
        clearTheme: () => void;
        reloadTheme: () => Promise<void>;
    }
];

const useTheme = (): UseThemeReturn => {
    const { theme } = useServices();
    
    const [state, setState] = useState<ThemeState>({
        url: theme.url,
        loading: theme.loading,
        error: theme.error,
        isShell: theme.isShell,
    });

    useEffect(() => {
        const onStateChanged = () => {
            setState({
                url: theme.url,
                loading: theme.loading,
                error: theme.error,
                isShell: theme.isShell,
            });
        };

        theme.on('stateChanged', onStateChanged);
        return () => {
            theme.off('stateChanged', onStateChanged);
        };
    }, [theme]);

    const loadTheme = useCallback(async (url: string) => {
        await theme.load(url);
    }, [theme]);

    const clearTheme = useCallback(() => {
        theme.clear();
    }, [theme]);

    const reloadTheme = useCallback(async () => {
        await theme.reload();
    }, [theme]);

    return [
        state,
        {
            loadTheme,
            clearTheme,
            reloadTheme,
        }
    ];
};

export default useTheme;
