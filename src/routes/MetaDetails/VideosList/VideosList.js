// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { t } = require('i18next');
const { useServices } = require('stremio/services');
const { useProfile } = require('stremio/common');
const { Image, SearchBar, Toggle, Video, Button, MultiselectMenu } = require('stremio/components');
const { default: Icon } = require('@stremio/stremio-icons/react');
const SeasonsBar = require('./SeasonsBar');
const { default: EpisodePicker } = require('../EpisodePicker');
const { default: useBatchDownload } = require('./useBatchDownload');
const styles = require('./styles');

const VideosList = ({ className, metaItem, libraryItem, season, seasonOnSelect, selectedVideoId, toggleNotifications }) => {
    const { core } = useServices();
    const profile = useProfile();

    const showNotificationsToggle = React.useMemo(() => {
        return metaItem?.content?.content?.inLibrary && metaItem?.content?.content?.videos?.length;
    }, [metaItem]);

    // Batch download hook - extract metaItem content for the hook
    const metaItemForDownload = React.useMemo(() => {
        if (metaItem?.content?.type === 'Ready') {
            return {
                id: metaItem.content.content.id,
                type: metaItem.content.content.type,
                videos: metaItem.content.content.videos,
            };
        }
        return { videos: [] };
    }, [metaItem]);
    const videos = React.useMemo(() => {
        return metaItem && metaItem.content.type === 'Ready' ?
            metaItem.content.content.videos
            :
            [];
    }, [metaItem]);
    const seasons = React.useMemo(() => {
        return videos
            .map(({ season }) => season)
            .filter((season, index, seasons) => {
                return season !== null &&
                    !isNaN(season) &&
                    typeof season === 'number' &&
                    seasons.indexOf(season) === index;
            })
            .sort((a, b) => (a || Number.MAX_SAFE_INTEGER) - (b || Number.MAX_SAFE_INTEGER));
    }, [videos]);
    const selectedSeason = React.useMemo(() => {
        if (seasons.includes(season)) {
            return season;
        }

        const video = videos?.find((video) => video.id === libraryItem?.state.video_id);

        if (video && video.season && seasons.includes(video.season)) {
            return video.season;
        }

        const nonSpecialSeasons = seasons.filter((season) => season !== 0);
        if (nonSpecialSeasons.length > 0) {
            return nonSpecialSeasons[0];
        }

        if (seasons.length > 0) {
            return seasons[0];
        }

        return null;
    }, [seasons, season, videos, libraryItem]);
    const videosForSeason = React.useMemo(() => {
        return videos
            .filter((video) => {
                return selectedSeason === null || video.season === selectedSeason;
            })
            .sort((a, b) => {
                return a.episode - b.episode;
            });
    }, [videos, selectedSeason]);

    const seasonWatched = React.useMemo(() => {
        return videosForSeason.every((video) => video.watched);
    }, [videosForSeason]);

    const [search, setSearch] = React.useState('');
    const searchInputOnChange = React.useCallback((event) => {
        setSearch(event.currentTarget.value);
    }, []);

    // Batch download
    const {
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
    } = useBatchDownload({
        metaItem: metaItemForDownload,
        season: selectedSeason,
    });

    const onReleaseNameChange = React.useCallback((event) => {
        setReleaseName(event.currentTarget.value);
    }, [setReleaseName]);

    const onAddonSelect = React.useCallback((value) => {
        setSelectedAddon(value);
    }, [setSelectedAddon]);

    const selectedAddonLabel = React.useMemo(() => {
        const found = availableAddons.find((a) => a.value === selectedAddon);
        return found?.label || 'Select Addon';
    }, [availableAddons, selectedAddon]);

    const onMarkVideoAsWatched = (video, watched) => {
        core.transport.dispatch({
            action: 'MetaDetails',
            args: {
                action: 'MarkVideoAsWatched',
                args: [video, !watched]
            }
        });
    };

    const onMarkSeasonAsWatched = (season, watched) => {
        core.transport.dispatch({
            action: 'MetaDetails',
            args: {
                action: 'MarkSeasonAsWatched',
                args: [season, !watched]
            }
        });
    };

    const onSeasonSearch = (value) => {
        if (value) {
            seasonOnSelect({
                type: 'select',
                value,
            });
        }
    };

    return (
        <div className={classnames(className, styles['videos-list-container'])}>
            {
                !metaItem || metaItem.content.type === 'Loading' ?
                    <React.Fragment>
                        <SeasonsBar.Placeholder className={styles['seasons-bar']} />
                        <SearchBar.Placeholder className={styles['search-bar']} title={t('SEARCH_VIDEOS')} />
                        <div className={styles['videos-scroll-container']}>
                            <Video.Placeholder />
                            <Video.Placeholder />
                            <Video.Placeholder />
                            <Video.Placeholder />
                            <Video.Placeholder />
                        </div>
                    </React.Fragment>
                    :
                    metaItem.content.type === 'Err' || videosForSeason.length === 0 ?
                        <div className={styles['message-container']}>
                            <EpisodePicker className={styles['episode-picker']} onSubmit={onSeasonSearch} />
                            <Image className={styles['image']} src={require('/images/empty.png')} alt={' '} />
                            <div className={styles['label']}>{t('ERR_NO_VIDEOS_FOR_META')}</div>
                        </div>
                        :
                        <React.Fragment>
                            {
                                showNotificationsToggle && libraryItem ?
                                    <Toggle className={styles['notifications-toggle']} checked={!libraryItem.state.noNotif} onClick={toggleNotifications}>
                                        {t('DETAIL_RECEIVE_NOTIF_SERIES')}
                                    </Toggle>
                                    :
                                    null
                            }
                            {
                                seasons.length > 0 ?
                                    <SeasonsBar
                                        className={styles['seasons-bar']}
                                        season={selectedSeason}
                                        seasons={seasons}
                                        onSelect={seasonOnSelect}
                                    />
                                    :
                                    null
                            }
                            <SearchBar
                                className={styles['search-bar']}
                                title={t('SEARCH_VIDEOS')}
                                value={search}
                                onChange={searchInputOnChange}
                            />
                            <div className={styles['batch-download-section']}>
                                <div className={styles['batch-download-row']}>
                                    <input
                                        className={styles['release-input']}
                                        type="text"
                                        placeholder={'Release name...'}
                                        value={releaseName}
                                        onChange={onReleaseNameChange}
                                        disabled={isDownloading}
                                    />
                                    <MultiselectMenu
                                        className={styles['addon-select']}
                                        title={selectedAddonLabel}
                                        options={availableAddons}
                                        value={selectedAddon}
                                        disabled={isDownloading || availableAddons.length === 0}
                                        onSelect={onAddonSelect}
                                    />
                                    {isDownloading ? (
                                        <Button className={styles['action-button']} onClick={cancelDownload}>
                                            <Icon className={styles['icon']} name={'close'} />
                                            <div className={styles['label']}>{'Cancel'}</div>
                                        </Button>
                                    ) : (
                                        <Button
                                            className={classnames(styles['action-button'], { 'disabled': !releaseName.trim() })}
                                            onClick={startBatchDownload}
                                        >
                                            <Icon className={styles['icon']} name={'download'} />
                                            <div className={styles['label']}>{'Fetch'}</div>
                                        </Button>
                                    )}
                                </div>
                                {isDownloading && (
                                    <div className={styles['download-progress']}>
                                        <div className={styles['progress-text']}>
                                            {`Fetching episode ${currentEpisode} (${completedEpisodes}/${totalEpisodes})`}
                                        </div>
                                        <div className={styles['progress-bar-container']}>
                                            <div
                                                className={styles['progress-bar']}
                                                style={{ width: `${(completedEpisodes / totalEpisodes) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                                {showResults && downloadResults.length > 0 && (
                                    <div className={styles['download-results']}>
                                        <div className={styles['results-header']}>
                                            <span className={styles['results-count']}>{`Found ${downloadResults.length} episodes`}</span>
                                            <div className={styles['results-actions']}>
                                                <Button className={styles['action-button']} onClick={openAllDownloads}>
                                                    <Icon className={styles['icon']} name={'download'} />
                                                    <div className={styles['label']}>{'Download All'}</div>
                                                </Button>
                                                <Button className={styles['close-button']} onClick={clearResults}>
                                                    <Icon className={styles['icon']} name={'close'} />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className={styles['results-list']}>
                                            {downloadResults.map((result) => (
                                                <a
                                                    key={result.episode}
                                                    className={styles['result-item']}
                                                    href={result.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <span className={styles['episode-number']}>E{result.episode}</span>
                                                    <span className={styles['episode-title']}>{result.filename || result.title}</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className={styles['videos-container']}>
                                {
                                    videosForSeason
                                        .filter((video) => {
                                            return search.length === 0 ||
                                                (
                                                    (typeof video.title === 'string' && video.title.toLowerCase().includes(search.toLowerCase())) ||
                                                    (!isNaN(video.released.getTime()) && video.released.toLocaleString(profile.settings.interfaceLanguage, { year: '2-digit', month: 'short', day: 'numeric' }).toLowerCase().includes(search.toLowerCase()))
                                                );
                                        })
                                        .map((video, index) => (
                                            <Video
                                                key={index}
                                                id={video.id}
                                                title={video.title}
                                                thumbnail={video.thumbnail}
                                                season={video.season}
                                                episode={video.episode}
                                                released={video.released}
                                                upcoming={video.upcoming}
                                                watched={video.watched}
                                                progress={video.progress}
                                                deepLinks={video.deepLinks}
                                                scheduled={video.scheduled}
                                                seasonWatched={seasonWatched}
                                                selected={video.id === selectedVideoId}
                                                onMarkVideoAsWatched={onMarkVideoAsWatched}
                                                onMarkSeasonAsWatched={onMarkSeasonAsWatched}
                                            />
                                        ))
                                }
                            </div>
                        </React.Fragment>
            }
        </div>
    );
};

VideosList.propTypes = {
    className: PropTypes.string,
    metaItem: PropTypes.object,
    libraryItem: PropTypes.object,
    season: PropTypes.number,
    selectedVideoId: PropTypes.string,
    seasonOnSelect: PropTypes.func,
    toggleNotifications: PropTypes.func,
};

module.exports = VideosList;
