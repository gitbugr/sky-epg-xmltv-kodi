import os from 'os'
import Gist from 'gist-client'
import xmlbuilder from 'xmlbuilder'
import axios from 'axios'

import SkyEPGResponseBuilder from './skyEPGResponseBuilder'
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
                'GIST_TOKEN_ID',
                'GIST_FILENAME',
            ],
        },
    },
    /*
     *'file': {
     *    requirements: {
     *        environmentVariables: [
     *            'OUTPUT_FILENAME'
     *        ],
     *    },
     *},
     */
}

/**
 * @const {Object}
 */
const skyHeaders = {
    'User-Agent': 'Super Agent/0.0.1',
    'Content-Type': 'application/x-www-form-urlencoded'
}

const skyUrls = {
    channelIndex: 'http://tv.sky.com/channel/index/4101-1',
    programmeInfo: (channel, requestNumber) => `http://tv.sky.com/programme/channel/${channel}/${startDate.toISOString().split("T")[0]}/${requestNumber}.json`,
}

/**
 * @class SkyEPGScraper
 */
export default class SkyEPGScraper
{
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
            responseBuilder.error('1', outputType);
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
                const channels = response.data.init.channels;
                channels.forEach((channel) => {
                    this.channels[channel.c[0]] = {
                        title: channel.lcn || channel.t
                    };
                });
            } else {
                throw 2;
            }

        } catch (error) {
            if (typeof error === 'number') {
                responseBuilder.error(String(errorCode));
            } else {
                responseBuilder.error('-1', error);
            }
        }
        return responseBuilder.result;
    }

    /*
     * fetches the programme data for specified channel
     *
     * @param {Number} channelNumber
     * @param {Number} requestNumber
     * @return {Promise}
     */
    async getProgrammeInfo(channelNumber, requestNumber){
        const responseBuilder = new SkyEPGResponseBuilder();
        const channelsEntries = Object.entries(this.channels);
        if (channelNumber < channelsEntries.length) {
            const channel = channelsEntries[channelNumber];
            // if first request for channel, initialise key
            if (requestNumber === 0) {
                this.programmeInfo[channel[0]] = [];
            }
            try {
                const response = await axios({
                    url: skyUrls.programmeInfo(channel[0], requestNumber),
                    method: 'GET',
                    headers: skyHeaders
                });

                if (response.status === 200) {
                    const listings = response.data.listings[channel[0]];
                    for (const listing in listings) {
                        const startTime = new Date(listing.s * 1000);
                        const endTime = new Date(startTime.getTime() + (listing.m[1] / 60) * 60000);
                        this.programmeInfo[channel[0]].push({
                            startTime: dateTimeFormatXMLTV(startTime),
                            endTime: dateTimeFormatXMLTV(endTime),
                            runTime: listing.m[1] / 60,
                            title: listing.t,
                            description: listing.d
                        });
                    }
                } else {
                    throw 2;
                }
            } catch (error) {
                if (typeof error === 'number') {
                    responseBuilder.error(String(errorCode));
                } else {
                    responseBuilder.error('-1', error);
                }
            }

        } else {
            responseBuilder.error(3);
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
            const getChannelsResult = await this.getChannels();
            if(getChannelsResult.status === 1) {
                try {
                    for (const channel of Array(this.channels.length).keys()) {
                        for (const request of Array(4).keys()) {
                            const getProgrammeInfoResult = await this.getProgrammeInfo(channel, request);
                            // we log the error and carry on...
                            if (getProgrammeInfoResult.status !== 1) {
                                process.stderr.write(JSON.stringidy(getProgrammeInfoResult) + os.EOL);
                            }
                        }
                    }
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
     * @param {Date}
     */
    dateTimeFormatXMLTV(date) {
        // maybe momentjs (or something less bloated) instead of this clusterfuck?
        const yearS = date.getFullYear().toString();
        const monthS = (date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1));
        const dateS = (date.getDate() < 10 ? "0" + date.getDate() : date.getDate());
        const hoursS = (date.getHours() < 10 ? "0" + date.getHours() : date.getHours());
        const minutesS = (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes());
        const secondsS = (date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds());
        return `${yearS}${monthS}${dateS}${hoursS}${minutesS}${secondsS}+0000`;
    }

    /*
     * converts stored JS Objects to XMLTV and wites to output.
     */
    async write() {
        for (channel in Object.entries(this.channels)) {
            const title = channel[1].title
            const channelElement = this.xml.ele('channel', {'id': title || 0});

            const titleSegments = title.split(' ');
            for (const [index, titleSegment] of titleSegments) {
                if (typeof channelNameSubstitutions[titleSegment] !== 'undefined'){
                    titleSegments[index] = channelNameSubstitutions[titleSegment];
                }
            }

            // adds default display name
            channelElement.ele('display-name', titleSegments.join(' '));

            // always add HD variant - will be filtered out if channel
            // doesn't exist anyway
            if (titleSegments.slice(-1) !== 'HD') {
                const titleSegmentsHD = [...titleSegments, 'HD'];
                channelElement.ele('display-name', titleSegmentsHD.join(' '));
            }
        }

        for (channelProgrammes in Object.entries(this.programmeInfo)) {
            for (programme in channelProgrammes){
                const programmeElement = this.xml.ele('programme', {
                    start: programme.startTime,
                    stop: programme.endTime,
                    channel: this.channels[channelProgramme].title,
                });
                programmeElement.ele(
                    'title',
                    { lang:"en" },
                    programme.title
                );
                programmeElement.ele(
                    'desc',
                    { lang:"en" },
                    programme.description
                );
            }
        }

        const xmlFormatted = this.xml.end({ pretty: true });

        switch (this.output) {
            case 'gist':
                process.stdout.write(`Saving to gist...` + os.EOL);
                const gist = new Gist();

                gist.setToken(process.env.TOKEN_ID);
                try {
                    const gistResult = await gist.update({
                        'files': {
                            [process.env.GIST_FILENAME]: xmlFormatted
                        },
                    });

                    process.stdout.write(`Done! total execution took ${(new Date().getTime() - startDate.getTime()) * 1000} seconds` + os.EOL);
                } catch (error) {
                    process.stderr.write(`Not quite sure how this could have happened... ${error}` + os.EOL);
                }
                break;
            case 'stdout':
                process.stdout.write(xmlFormatted + os.EOL);
                break;
        }
    }
}
