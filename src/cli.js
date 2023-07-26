import SkyEPGScraper from './skyEPGScraper';
import os from 'os';

let outputType;

if (process.env.GIST_TOKEN && process.env.GIST_ID && process.env.GIST_FILENAME) {
    outputType = 'gist';
} else if (process.env.OUTPUT_DIRECTORY && process.env.OUTPUT_FILENAME) {
    outputType = 'file';
} else {
    process.stderr.write('You\'re missing some environment variables. Please define either GIST_* or OUTPUT_*.' + os.EOL);
}

if (outputType) {
    const scraper = new SkyEPGScraper(outputType);
    scraper.run().then(() => {
        scraper.write();
    }).catch((error) => {
        process.stderr.write(`howthefuck: ${error}`);
    });
}
