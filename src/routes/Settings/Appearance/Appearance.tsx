// Copyright (C) 2017-2025 Smart code 203358507

import React, { forwardRef, useCallback, useState, ChangeEvent, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, TextInput } from 'stremio/components';
import { useTheme, useToast } from 'stremio/common';
import { Section, Option } from '../components';
import styles from './Appearance.less';

// Fallback translations for theme settings (until added to stremio-translations)
const FALLBACK_TRANSLATIONS: Record<string, string> = {
    'SETTINGS_NAV_APPEARANCE': 'Appearance',
    'SETTINGS_SECTION_APPEARANCE': 'Appearance',
    'SETTINGS_THEME_URL': 'Custom Theme URL',
    'SETTINGS_THEME_URL_PLACEHOLDER': 'https://example.com/theme.css',
    'SETTINGS_THEME_URL_EMPTY': 'Please enter a theme URL',
    'SETTINGS_THEME_URL_INVALID': 'Invalid URL format',
    'SETTINGS_THEME_APPLY': 'Apply Theme',
    'SETTINGS_THEME_CLEAR': 'Reset to Default',
    'SETTINGS_THEME_APPLIED': 'Theme applied successfully',
    'SETTINGS_THEME_CLEARED': 'Theme reset to default',
    'SETTINGS_THEME_ERROR': 'Error loading theme',
    'SETTINGS_THEME_CURRENT': 'Current theme',
    'SETTINGS_THEME_HINT': 'Enter a URL to a CSS file to customize the appearance. The CSS will override default styles using CSS custom properties.',
    'LOADING': 'Loading...',
};

const Appearance = forwardRef<HTMLDivElement>((_, ref) => {
    const { t: translate } = useTranslation();
    const toast = useToast();
    const [themeState, { loadTheme, clearTheme }] = useTheme();
    const [inputUrl, setInputUrl] = useState(themeState.url || '');

    // Translation helper with fallback
    const t = (key: string) => {
        const translated = translate(key);
        // If translation returns the key itself, use fallback
        return translated === key ? (FALLBACK_TRANSLATIONS[key] || key) : translated;
    };

    // Sync input with theme state when it changes externally
    useEffect(() => {
        if (themeState.url !== null && themeState.url !== inputUrl) {
            setInputUrl(themeState.url);
        }
    }, [themeState.url]);

    const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setInputUrl(event.target.value);
    }, []);

    const handleApplyTheme = useCallback(async () => {
        const url = inputUrl.trim();
        if (!url) {
            toast.show({
                type: 'error',
                title: t('SETTINGS_THEME_URL_EMPTY'),
                timeout: 3000
            });
            return;
        }

        try {
            new URL(url);
        } catch {
            toast.show({
                type: 'error',
                title: t('SETTINGS_THEME_URL_INVALID'),
                timeout: 3000
            });
            return;
        }

        await loadTheme(url);
    }, [inputUrl, loadTheme, toast]);

    // Show success/error toast after theme state changes
    useEffect(() => {
        if (themeState.error) {
            toast.show({
                type: 'error',
                title: `${t('SETTINGS_THEME_ERROR')}: ${themeState.error.message}`,
                timeout: 5000
            });
        }
    }, [themeState.error]);

    const handleClearTheme = useCallback(async () => {
        await clearTheme();
        setInputUrl('');
        toast.show({
            type: 'success',
            title: t('SETTINGS_THEME_CLEARED'),
            timeout: 3000
        });
    }, [clearTheme, toast]);

    const handleInputSubmit = useCallback(() => {
        handleApplyTheme();
    }, [handleApplyTheme]);

    return (
        <div ref={ref} className={styles['appearance-section']}>
            <div className={styles['section-header']}>
                {t('SETTINGS_SECTION_APPEARANCE')}
            </div>
            <div className={styles['option-container']}>
                <div className={styles['option-label']}>
                    {t('SETTINGS_THEME_URL')}
                </div>
                <div className={styles['theme-input-container']}>
                    <TextInput
                        className={styles['theme-input']}
                        value={inputUrl}
                        onChange={handleInputChange}
                        onSubmit={handleInputSubmit}
                        placeholder={t('SETTINGS_THEME_URL_PLACEHOLDER')}
                        disabled={themeState.loading}
                    />
                </div>
            </div>
            <div className={styles['theme-actions']}>
                <Button
                    className={styles['apply-button']}
                    onClick={handleApplyTheme}
                    disabled={themeState.loading || !inputUrl.trim()}
                >
                    {themeState.loading ? t('LOADING') : t('SETTINGS_THEME_APPLY')}
                </Button>
                <Button
                    className={styles['clear-button']}
                    onClick={handleClearTheme}
                    disabled={themeState.loading || !themeState.url}
                >
                    {t('SETTINGS_THEME_CLEAR')}
                </Button>
            </div>
            {
                themeState.url && !themeState.error &&
                    <div className={styles['current-theme']}>
                        {t('SETTINGS_THEME_CURRENT')}: {themeState.url}
                    </div>
            }
            <div className={styles['theme-hint']}>
                {t('SETTINGS_THEME_HINT')}
            </div>
        </div>
    );
});

export default Appearance;
