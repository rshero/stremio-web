import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePlatform } from '../Platform';
import useProfile from '../useProfile';
import type { DiscordActivity as Activity } from './activity';

type DiscordContextValue = {
    available: boolean,
    connected: boolean,
    enabled: boolean,
    setActivity: (activity: Activity | null) => void,
};

const DiscordContext = createContext<DiscordContextValue | null>(null);

const sameActivity = (first: Activity | null, second: Activity | null) => {
    return first?.state === second?.state &&
        first?.details === second?.details &&
        first?.image === second?.image &&
        first?.startTimestamp === second?.startTimestamp &&
        first?.endTimestamp === second?.endTimestamp;
};

type Props = {
    children: React.ReactNode,
};

const DiscordProvider = ({ children }: Props) => {
    const { shell } = usePlatform();
    const profile = useProfile();
    const enabled = profile.settings?.discordRpcEnabled === true;
    // The shell owns the RPC connection and uses the discord-presence IPC.
    const available = shell.active === true;
    const [activity, setActivityState] = useState<Activity | null>(null);
    const connected = available && enabled;
    const sentActivity = useRef<Activity | null>(null);
    const shellRef = useRef(shell);
    shellRef.current = shell;

    useEffect(() => {
        if (!available || !enabled) {
            sentActivity.current = null;
        }
    }, [available, enabled]);

    useEffect(() => {
        if (!available || !enabled || !connected) return;

        if (activity === null) {
            if (sentActivity.current !== null) {
                shellRef.current.sendDiscord('discord-presence', 'clear');
                sentActivity.current = null;
            }
            return;
        }

        if (sameActivity(sentActivity.current, activity)) return;

        const startTimestamp = typeof activity.startTimestamp === 'number' ? activity.startTimestamp : null;
        const endTimestamp = typeof activity.endTimestamp === 'number' ? activity.endTimestamp : null;
        const now = Math.floor(Date.now() / 1000);
        const elapsed = startTimestamp === null ? 0 : Math.max(now - startTimestamp, 0);
        const duration = startTimestamp === null || endTimestamp === null ?
            0 : Math.max(endTimestamp - startTimestamp, elapsed);
        const paused = activity.state.startsWith('Paused');

        shellRef.current.sendDiscord(
            'discord-presence',
            'watching',
            'movie',
            activity.details || 'Stremio',
            '',
            '',
            '',
            '',
            activity.image || '',
            `${elapsed}`,
            `${duration}`,
            paused ? 'yes' : 'no',
        );
        sentActivity.current = activity;
    }, [activity, available, connected, enabled]);

    const setActivity = useCallback((nextActivity: Activity | null) => {
        setActivityState((currentActivity) => sameActivity(currentActivity, nextActivity) ? currentActivity : nextActivity);
    }, []);

    const value = useMemo(() => ({
        available,
        connected,
        enabled,
        setActivity,
    }), [available, connected, enabled, setActivity]);

    return (
        <DiscordContext.Provider value={value}>
            {children}
        </DiscordContext.Provider>
    );
};

const useDiscord = () => {
    const value = useContext(DiscordContext);
    if (value === null) {
        throw new Error('useDiscord must be used inside DiscordProvider');
    }
    return value;
};

export {
    DiscordProvider,
    useDiscord,
};
