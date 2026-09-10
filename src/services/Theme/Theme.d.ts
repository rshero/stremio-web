declare class Theme {
    readonly url: string | null;
    readonly loading: boolean;
    readonly error: Error | null;
    readonly css: string | null;
    readonly isShell: boolean;

    load(url: string): Promise<void>;
    clear(): Promise<void>;
    init(): Promise<void>;
    reload(): Promise<void>;
    on(name: 'stateChanged', listener: () => void): void;
    off(name: 'stateChanged', listener: () => void): void;
}

export = Theme;
