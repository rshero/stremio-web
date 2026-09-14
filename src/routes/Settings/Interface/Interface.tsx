import React, { forwardRef, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlatform, useTheme, useToast } from 'stremio/common';
import { Button, MultiselectMenu, TextInput, Toggle } from 'stremio/components';
import { Section, Option } from '../components';
import useInterfaceOptions from './useInterfaceOptions';
import styles from './Interface.less';

const fallback = {
    SETTINGS_THEME_URL: 'Custom theme URL',
    SETTINGS_THEME_URL_PLACEHOLDER: 'https://example.com/theme.css',
    SETTINGS_THEME_APPLY: 'Apply theme',
    SETTINGS_THEME_CLEAR: 'Reset theme',
    SETTINGS_THEME_CURRENT: 'Current theme',
    SETTINGS_THEME_ERROR: 'Theme error',
    SETTINGS_THEME_HINT: 'Enter a URL to a CSS file. The theme is saved on this device.',
    LOADING: 'Loading…',
};

type Props = {
    profile: Profile,
};

const Interface = forwardRef<HTMLDivElement, Props>(({ profile }: Props, ref) => {
    const { t: translate } = useTranslation();
    const { shell } = usePlatform();
    const toast = useToast();
    const [themeState, { loadTheme, clearTheme }] = useTheme();
    const [inputUrl, setInputUrl] = useState(themeState.url || '');
    const t = useCallback((key: keyof typeof fallback) => {
        const translated = translate(key);
        return translated === key ? fallback[key] : translated;
    }, [translate]);

    const {
        interfaceLanguageSelect,
        quitOnCloseToggle,
        escExitFullscreenToggle,
        hideSpoilersToggle,
        gamepadSupportToggle,
    } = useInterfaceOptions(profile);

    useEffect(() => {
        setInputUrl(themeState.url || '');
    }, [themeState.url]);

    const apply = useCallback(async () => {
        const url = inputUrl.trim();
        if (!url) return;
        try {
            const parsed = new URL(url);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('invalid protocol');
        } catch {
            toast.show({ type: 'error', title: t('SETTINGS_THEME_ERROR'), message: 'Enter a valid HTTP(S) URL.', timeout: 3000 });
            return;
        }
        await loadTheme(url);
    }, [inputUrl, loadTheme, t, toast]);

    useEffect(() => {
        if (themeState.error) {
            toast.show({ type: 'error', title: t('SETTINGS_THEME_ERROR'), message: themeState.error.message, timeout: 5000 });
        }
    }, [t, themeState.error, toast]);

    const clear = useCallback(async () => {
        await clearTheme();
        setInputUrl('');
    }, [clearTheme]);

    return (
        <Section ref={ref} label={'INTERFACE'}>
            <Option label={'SETTINGS_UI_LANGUAGE'}>
                <MultiselectMenu
                    className={'multiselect'}
                    {...interfaceLanguageSelect}
                />
            </Option>
            {
                shell.active &&
                    <Option label={'SETTINGS_QUIT_ON_CLOSE'}>
                        <Toggle
                            tabIndex={-1}
                            {...quitOnCloseToggle}
                        />
                    </Option>
            }
            {
                shell.active &&
                    <Option label={'SETTINGS_FULLSCREEN_EXIT'}>
                        <Toggle
                            tabIndex={-1}
                            {...escExitFullscreenToggle}
                        />
                    </Option>
            }
            <Option label={'SETTINGS_BLUR_UNWATCHED_IMAGE'}>
                <Toggle
                    tabIndex={-1}
                    {...hideSpoilersToggle}
                />
            </Option>
            <Option label={'SETTINGS_GAMEPAD'}>
                <Toggle
                    tabIndex={-1}
                    {...gamepadSupportToggle}
                />
            </Option>
            <Option label={t('SETTINGS_THEME_URL')}>
                <TextInput
                    value={inputUrl}
                    className={styles['input']}
                    onChange={(event) => setInputUrl(event.currentTarget.value)}
                    onSubmit={apply}
                    placeholder={t('SETTINGS_THEME_URL_PLACEHOLDER')}
                    aria-label={t('SETTINGS_THEME_URL')}
                    name={'theme-url'}
                    type={'url'}
                    autoComplete={'off'}
                    disabled={themeState.loading}
                />
            </Option>
            <div className={styles['actions']}>
                <Button className={styles['button']} onClick={apply} disabled={themeState.loading || !inputUrl.trim()}>
                    {themeState.loading ? t('LOADING') : t('SETTINGS_THEME_APPLY')}
                </Button>
                <Button className={styles['button']} onClick={clear} disabled={themeState.loading || !themeState.url}>
                    {t('SETTINGS_THEME_CLEAR')}
                </Button>
            </div>
            {themeState.url && !themeState.error ? <div className={styles['current']} aria-live={'polite'}>{t('SETTINGS_THEME_CURRENT')}: {themeState.url}</div> : null}
            <div className={styles['hint']}>{t('SETTINGS_THEME_HINT')}</div>
        </Section>
    );
});

export default Interface;
