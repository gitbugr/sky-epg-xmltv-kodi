import SkyEPGScraper from './skyEPGScraper'

const scraper = new SkyEPGScraper('gist');
scraper.run().then(() => {
    scraper.write();
}).catch((error) => {
    process.stderr.write('howthefuck: ${error}');
});

