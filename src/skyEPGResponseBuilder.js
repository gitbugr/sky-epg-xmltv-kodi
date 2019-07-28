
export default class SkyEPGResponseBuilder
{
    constructor() {
        this.status = 1;
        this.message = 'success';
        this.errors = [];

        this.errorCodes = {
            '-1': {
                message: () => `Unknown error: "${arguments[0]}"`,
            },
            '1': {
                message: () => `Output type "${arguments[0]}" is not supported`,
            },
        }

    }

    /**
     * SkyEPGError
     * @typedef {Object} SkyEPGError
     * @property {Number} code - error code
     * @property {String} message - error message
     */

    /**
     * error
     *
     * @param {Number} code - error code
     */
    error(code) {
        this.status = 0;
        this.message = 'error';
        this.errors.push({
            code,
            message: this.errorCodes[code].message([...arguments].slice(1))
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
