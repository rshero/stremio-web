const React = require('react');
const { useShell } = require('stremio/common');

const ActivityTracker = () => {
    const shell = useShell();

    React.useEffect(() => {
        const handleHashChange = () => {
            if (!shell.active || !shell.sendDiscord) {
                return;
            }

            const path = window.location.hash.slice(1); // remove '#' from '#/addons'

            // Routes handled in src -> /player | /metadetails
            if (path.startsWith('/player') || path.startsWith('/metadetails')) {
                return;
            }

            if (path.startsWith('/discover')) {
                shell.sendDiscord('discord-presence', 'discover');
            } else if (path.startsWith('/library')) {
                shell.sendDiscord('discord-presence', 'library');
            } else if (path.startsWith('/calendar')) {
                shell.sendDiscord('discord-presence', 'calendar');
            } else if (path.startsWith('/addons')) {
                shell.sendDiscord('discord-presence', 'addons');
            } else if (path.startsWith('/settings')) {
                shell.sendDiscord('discord-presence', 'settings');
            } else if (path.startsWith('/search')) {
                shell.sendDiscord('discord-presence', 'search');
            } else if (path === '/' || path.startsWith('/board')) {
                shell.sendDiscord('discord-presence', 'board');
            } else {
                shell.sendDiscord('discord-presence', 'board');
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();

        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [shell]);

    return null;
};

module.exports = ActivityTracker;
