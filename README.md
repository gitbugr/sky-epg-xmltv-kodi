# Sky EPG Scraper / XMLTV Generator

For Kodi and other XMLTV supporting systems.

_underwent a full refactor and now it's an [](npm package!)_

### Installation (as application)

```bash
git clone https://github.com/gitbugr/sky-epg-scraper.git
cd sky-epg-scraper
```

### Running the Application

There are two ways you can run the application;

#### Docker (recomended)

You can run the application in a docker container (requires docker installation)
as follows:

**edit the .env file**

```env
GIST_ID={YOUR_GIST_ID}
GIST_TOKEN={YOUR_GIST_TOKEN}
GIST_FILENAME={ANY_FILENAME}
```

**then run**

```bash
docker-compose up -d --build
```

#### Node

if you don't wan't to use docker, you can run it on your host machine using node.

*note: this only runs once, so setting up a cronjob is essential for up-to-date epg**

```bash
GIST_ID="{YOUR_GIST_ID}" GIST_TOKEN="{YOUR_GIST_TOKEN}" GIST_FILENAME="{ANY_FILENAME} node src/cli.js -t gist";
```

## Usage as NPM Module

### Installation

```bash
yarn add sky-epg-scraper
# or
npm install sky-epg-scraper
```
