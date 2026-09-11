import React, { memo } from 'react';
import { t } from 'i18next';
import { Button } from 'stremio/components';
import useBatchDownload from './useBatchDownload';
import styles from './styles.less';

type Video = {
    id: string,
    title?: string,
    season?: number,
    episode?: number,
};

type Props = {
    videos: Video[],
    type: string,
    season: number | null,
};

const translated = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
};

const BatchDownloadControls = memo(({ videos, type, season }: Props) => {
    const batch = useBatchDownload({ videos, type, season });

    return (
        <>
            <div className={styles['batch-download']}>
                <input
                    className={styles['release-input']}
                    value={batch.releaseName}
                    onChange={(event) => batch.setReleaseName(event.currentTarget.value)}
                    placeholder={translated('DOWNLOAD_RELEASE_NAME', 'Release name')}
                    disabled={batch.isDownloading}
                />
                <select
                    className={styles['addon-select']}
                    value={batch.selectedAddon}
                    onChange={(event) => batch.setSelectedAddon(event.currentTarget.value)}
                    disabled={batch.isDownloading}
                >
                    {batch.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <Button className={styles['download-button']} onClick={batch.isDownloading ? batch.cancel : batch.start}>
                    {batch.isDownloading ? translated('CANCEL', 'Cancel') : translated('DOWNLOAD_FETCH', 'Fetch')}
                </Button>
                {batch.results.length > 0 ?
                    <Button className={styles['download-button']} onClick={batch.openAll}>{translated('DOWNLOAD_ALL', 'Download all')}</Button>
                    : null}
            </div>
            {batch.isDownloading ?
                <div className={styles['download-progress']}>{`${translated('DOWNLOADING', 'Fetching')} ${batch.completed}/${batch.total}`}</div>
                : null}
            {batch.results.length > 0 ?
                <div className={styles['download-results']}>
                    {batch.results.map((result) => (
                        <a key={result.episode} href={result.url} target={'_blank'} rel={'noopener noreferrer'}>
                            {`E${result.episode} ${result.filename || result.title}`}
                        </a>
                    ))}
                </div>
                : null}
        </>
    );
});

BatchDownloadControls.displayName = 'BatchDownloadControls';

export default BatchDownloadControls;
