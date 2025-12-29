// Copyright (C) 2017-2023 Smart code 203358507

/**
 * Extract quality/resolution from stream description
 * @param {string} description - Stream description (e.g., "[TORRENT] Comet 2160p")
 * @returns {string|null} - Quality string (e.g., "2160p") or null if not found
 */
const extractStreamQuality = (description) => {
    if (typeof description !== 'string') {
        return null;
    }

    // Match common quality patterns: 2160p, 1080p, 720p, 480p, 360p, 4K, etc.
    const qualityPatterns = [
        /(\d{3,4}p)/i, // Matches 2160p, 1080p, 720p, 480p, etc.
        /(4K|8K|HD|FHD|UHD)/i, // Matches 4K, 8K, HD, FHD, UHD
    ];

    for (const pattern of qualityPatterns) {
        const match = description.match(pattern);
        if (match) {
            const quality = match[1];
            // Normalize: numbers + lowercase 'p' (e.g., "2160p"), but uppercase for text (e.g., "4K", "HD")
            if (/^\d+p$/i.test(quality)) {
                return quality.toLowerCase();
            }
            return quality.toUpperCase();
        }
    }

    return null;
};

module.exports = extractStreamQuality;
