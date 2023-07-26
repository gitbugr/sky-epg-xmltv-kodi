import os from 'os';
import Gist from 'gist-client'
import xmlbuilder from 'xmlbuilder'
import axios from 'axios'
import fs from 'fs';
import path from 'path';

import SkyEPGResponseBuilder, { SkyEPGExceptions } from './skyEPGResponseBuilder'
import channelNameSubstitutions from './channelNameSubstitutions.json'

const startDate = new Date();

/**
 * @const {Object}
 */
const supportedOutputTypes = {
    'none': {},
    'stdout': {},
    'gist': {
        requirements: {
            environmentVariables: [
                'GIST_ID',
                'GIST_TOKEN',
                'GIST_FILENAME',
            ],
        },
    },
    'file': {
        requirements: {
            environmentVariables: [
                'OUTPUT_DIRECTORY',
                'OUTPUT_FILENAME',
            ],
        },
    },
};

/**
 * @const {Object}
 */
const skyHeaders = {
    'User-Agent': 'Super Agent/0.0.1',
    'Content-Type': 'application/x-www-form-urlencoded'
}

const skyUrls = {
    channelIndex: 'https://awk.epgsky.com/hawk/linear/services/4101/1',
    programmeInfo: (channel, scheduleDate) => `https://awk.epgsky.com/hawk/linear/schedule/${scheduleDate}/${channel}`,
}

/**
 * @class SkyEPGScraper
 */
export default class SkyEPGScraper {
    /**
     * constructor
     *
     * @param {String=} [outputType='none']
     */
    constructor(outputType = 'none') {
        this.channels = {};
        this.programmeInfo = {};
        this.channelNameSubstitutions = channelNameSubstitutions;

        // validate output type
        const outputTypeValid = this.validateOutputType(outputType);
        if (outputTypeValid.status === 1) {
            this.output = outputType;
        } else {
            process.stderr.write(JSON.stringify(outputTypeValid) + os.EOL);
            process.exit()
        }
        // initialise xml builder
        this.xml = xmlbuilder.create('tv', {
            updated: new Date()
        });
    }

    /*
     * setChannelNameSubstitutions
     *
     * @param {Object} object
     */
    // noinspection JSUnusedGlobalSymbols
    setChannelNameSubstitutions(object) {
        this.channelNameSubstitutions = object;
    }

    /*
     * validates that output type is supported and requirements are met
     *
     * @param {String} outputType
     * @return {String} outputType
     */
    validateOutputType(outputType) {
        const responseBuilder = new SkyEPGResponseBuilder();

        if (outputType in supportedOutputTypes) {
            if ('requirements' in supportedOutputTypes[outputType]) {
                Object.entries(supportedOutputTypes[outputType].requirements).forEach(([requirementType, requirementValue]) => {
                    switch (requirementType) {
                        case 'environmentVariables':
                            requirementValue.every((environmentVariable) => environmentVariable in process.env);
                            break;
                    }
                });
            }
        } else {
            responseBuilder.error(SkyEPGExceptions.OUTPUT_TYPE_NOT_SUPPORTED(outputType));
        }

        return responseBuilder.result;
    }

    /*
     * fetches channel titles and metadata
     *
     * @return {Promise}
     */
    async getChannels() {
        const responseBuilder = new SkyEPGResponseBuilder();
        try {
            const response = await axios({
                url: skyUrls.channelIndex,
                method: 'GET',
                headers: skyHeaders
            });

            if (response.status === 200) {
                const channels = response.data;
                channels.services.forEach((channel) => {
                    this.channels[channel.c] = {
                        title: channel.t,
                        sid: channel.sid,
                    };
                });
            } else {
                throw SkyEPGExceptions.SKY_API_FAIL_CHANNELS();
            }

        } catch (error) {
            responseBuilder.error(error);
        }
        return responseBuilder.result;
    }

    /*
     * fetches the programme data for specified channel
     *
     * @param {Number} channelNumber
     * @param {Date} scheduleDate
     * @return {Promise}
     */
    async getProgrammeInfo(channelNumber, scheduleDate) {
        const responseBuilder = new SkyEPGResponseBuilder();
        const channelsEntries = Object.entries(this.channels);
        if (channelNumber < channelsEntries.length) {
            const channel = channelsEntries[channelNumber];
            // if first request for channel, initialise key
            if (!(channel[0] in this.programmeInfo)) {
                this.programmeInfo[channel[0]] = [];
            }
            try {
                const response = await axios({
                    url: skyUrls.programmeInfo(channel[1].sid, `${scheduleDate.getFullYear()}${('0' + (scheduleDate.getMonth() + 1)).slice(-2)}${('0' + scheduleDate.getDate()).slice(-2)}`),
                    method: 'GET',
                    headers: skyHeaders
                });

                if (response.status === 200) {
                    const listings = response.data.schedule.find(el => el.sid === channel[1].sid).events;
                    for (const listing of listings) {
                        const startTime = new Date(listing.st * 1000);
                        const endTime = new Date((listing.st + listing.d) * 1000);
                        this.programmeInfo[channel[0]].push({
                            startTime: this.dateTimeFormatXMLTV(startTime),
                            endTime: this.dateTimeFormatXMLTV(endTime),
                            runTime: listing.d / 60,
                            title: listing.t,
                            description: listing.sy,
                            icon: listing.programmeuuid ? `https://images.metadata.sky.com/pd-image/${listing.programmeuuid}/16-9/640` : '',
                        });
                    }
                } else {
                    throw SkyEPGExceptions.SKY_API_FAIL_PROGRAMMES();
                }
            } catch (error) {
                responseBuilder.error(error);
            }

        } else {
            responseBuilder.error(SkyEPGExceptions.SKY_API_NO_PROGRAMMES_FOUND());
        }

        return responseBuilder.result;
    }

    /*
     * the main 'run' method.
     *
     * @return {Promise}
     */
    async run() {
        try {
            process.stdout.write(`Getting channel info...`);
            const getChannelsResult = await this.getChannels();
            if (getChannelsResult.status === 1) {
                try {
                    const numberOfChannels = Object.keys(this.channels).length;
                    for (const channel of Array(numberOfChannels).keys()) {
                        const scheduleDate = new Date();
                        scheduleDate.setDate(scheduleDate.getDate() - 1);
                        for (const request of Array(4).keys()) {
                            process.stdout.clearLine();
                            process.stdout.cursorTo(0);
                            process.stdout.write(`Getting programme info... (${channel + 1}/${numberOfChannels})(${request + 1}/4)`);
                            const getProgrammeInfoResult = await this.getProgrammeInfo(channel, scheduleDate);
                            scheduleDate.setDate(scheduleDate.getDate() + 1);
                            // we log the error and carry on...
                            if (getProgrammeInfoResult.status !== 1) {
                                process.stderr.write(JSON.stringify(getProgrammeInfoResult) + os.EOL);
                            }
                        }
                    }
                    process.stdout.clearLine();
                    process.stdout.cursorTo(0);
                } catch (error) {
                    process.stderr.write(`Not quite sure how this could have happened... ${error}` + os.EOL);
                }
            } else {
                process.stderr.write(JSON.stringify(getChannelsResult) + os.EOL);
            }
        } catch (error) {
            process.stderr.write(`Not quite sure how this could have happened... ${error}` + os.EOL);
        }
    }

    /**
     * dateTimeFormatXMLTV - converts js date to XMLTV format date
     *
     * @param {Date} date
     */
    dateTimeFormatXMLTV(date) {
        // maybe momentjs (or something less bloated) instead of this clusterfuck?
        const yearS = date.getFullYear();
        const monthS = (date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1));
        const dateS = (date.getDate() < 10 ? "0" + date.getDate() : date.getDate());
        const hoursS = (date.getHours() < 10 ? "0" + date.getHours() : date.getHours());
        const minutesS = (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes());
        const secondsS = (date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds());
        return `${yearS}${monthS}${dateS}${hoursS}${minutesS}${secondsS} +0000`;
    }

    /*
     * converts stored JS Objects to XMLTV and wites to output.
     */
    async write() {
        for (const channel of Object.entries(this.channels)) {
            const title = channel[1].title
            const channelElement = this.xml.ele('channel', {'id': title || 0});

            const titleSegments = title.split(' ');
            for (const [index, titleSegment] of titleSegments) {
                if (typeof this.channelNameSubstitutions[titleSegment] !== 'undefined') {
                    titleSegments[index] = this.channelNameSubstitutions[titleSegment];
                }
            }

            // adds default display name
            channelElement.ele('display-name', titleSegments.join(' '));

            // always add HD variant - will be filtered out if channel
            // doesn't exist anyway
            if ((titleSegments.slice(-1)[0] || '') !== 'HD') {
                const titleSegmentsHD = [...titleSegments, 'HD'];
                channelElement.ele('display-name', titleSegmentsHD.join(' '));
            }
        }

        for (const channelProgrammes of Object.entries(this.programmeInfo)) {
            for (const programme of channelProgrammes[1]) {
                const programmeElement = this.xml.ele('programme', {
                    start: programme.startTime,
                    stop: programme.endTime,
                    channel: this.channels[channelProgrammes[0]].title,
                });
                programmeElement.ele(
                    'title',
                    {lang: "en"},
                    programme.title
                );
                programme.icon && programmeElement.ele(
                    'icon',
                    {src: programme.icon},
                );
                programmeElement.ele(
                    'desc',
                    {lang: "en"},
                    programme.description
                );
            }
        }

        const xmlFormatted = this.xml.end({pretty: true});

        switch (this.output) {
            case 'gist':
                process.stdout.write(`Saving to gist...` + os.EOL);
                const gist = new Gist();
                gist.setToken(process.env.GIST_TOKEN);

                try {
                    await gist.update(
                        process.env.GIST_ID,
                        {
                            'files': {
                                [process.env.GIST_FILENAME]: {
                                    content: xmlFormatted,
                                },
                            },
                        }
                    );

                    process.stdout.write(`Done! total execution took ${(new Date().getTime() - startDate.getTime()) * 1000} seconds` + os.EOL);
                } catch (error) {
                    process.stderr.write(`Not quite sure how this could have happened... ${error}` + os.EOL);
                }
            case 'file':
                process.stdout.write(`Saving to file...` + os.EOL);
                const outputDirectory = process.env.OUTPUT_DIRECTORY;
                const outputFilename = process.env.OUTPUT_FILENAME;

                // Check if the specified directory exists or create it
                if (!fs.existsSync(outputDirectory)) {
                    fs.mkdirSync(outputDirectory, {recursive: true});
                }

                // Combine the output directory and filename to get the full path
                const outputPath = path.join(outputDirectory, outputFilename);

                // Write the XML content to the specified file
                try {
                    fs.writeFileSync(outputPath, xmlFormatted);
                    process.stdout.write(`Done! XML saved to: ${outputPath}` + os.EOL);
                } catch (error) {
                    process.stderr.write(`Failed to save XML: ${error}` + os.EOL);
                }
                break;
        }
    }
}
