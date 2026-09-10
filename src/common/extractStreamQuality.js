// Copyright (C) 2017-2026 Smart code 203358507

const QUALITY_PATTERN = /(?:^|[\s._()[\]-])(2160|1440|1080|720|576|480|360|240)p(?:$|[\s._()[\]-])/i;
const LABEL_PATTERN = /(?:^|[\s._()[\]-])(8k|4k|uhd|fhd|hd)(?:$|[\s._()[\]-])/i;

const extractStreamQuality = (description) => {
    if (typeof description !== 'string') {
        return null;
    }

    const pixelMatch = description.match(QUALITY_PATTERN);
    if (pixelMatch) {
        return `${pixelMatch[1]}p`.toLowerCase();
    }

    const labelMatch = description.match(LABEL_PATTERN);
    return labelMatch ? labelMatch[1].toUpperCase() : null;
};

module.exports = extractStreamQuality;
