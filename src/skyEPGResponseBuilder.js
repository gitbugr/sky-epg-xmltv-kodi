
class SkyAPIException extends Error {
    name = 'SkyAPIException';
}

export const SkyEPGExceptions = {
    SKY_API_FAIL_CHANNELS: () => new SkyAPIException('Something went wrong with the Sky API when fetching channels.'),
    SKY_API_FAIL_PROGRAMMES: () => new SkyAPIException('Something went wrong with the Sky API when fetching programme info.'),
    SKY_API_NO_PROGRAMMES_FOUND: () => new SkyAPIException('There were no programmes found for this channel, maybe something went wrong?'),
    OUTPUT_TYPE_NOT_SUPPORTED: (outputType) => new Error(`Output type '${outputType}' is not supported`),
}


export default class SkyEPGResponseBuilder
{
    constructor() {
        this.status = 1;
        this.message = 'success';
        this.errors = [];
    }

    /**
     * SkyEPGError
     * @typedef {Object} SkyEPGError
     * @property {Number} code - error code
     * @property {String} message - error message
     */

    /**
     * @param {Error} error
     */
    error(error) {
        this.status = 0;
        this.message = 'error';
        this.errors.push({
            type: error.name,
            message: error.message
        })
    }

    /**
     * SkyEPGReponse
     * @typedef {Object} SkyEPGReponse
     * @property {Number} status - status code (0 = error, 1 = success)
     * @property {String} message - status message ('error', 'success')
     * @property {SkyEPGError[]} errors
     */
    get result() {
        return {
            status: this.status,
            errors: this.errors,
        }
    }
}
