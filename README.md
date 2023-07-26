# Sky EPG Tool

For Kodi and other XMLTV supporting systems.

_underwent a full refactor and now it's an [npm package!](https://www.npmjs.com/package/sky-epg-scraper)_

![Licence](https://img.shields.io/github/license/gitbugr/sky-epg-xmltv-kodi)
![Last Commit](https://img.shields.io/github/last-commit/gitbugr/sky-epg-xmltv-kodi)
![Prs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

![Screenshot](screenshot.png)

Example file: https://gist.github.com/gitbugr/e26ed2d8bcd21a6684a2408997b60988

## Installation (as application)

```bash
git clone https://github.com/gitbugr/sky-epg-xmltv-kodi.git
cd sky-epg-xmltv-kodi
```

## Running the Application

There are two ways you can run the application and two forms of export. The program exports both to Gist and to a local directory (as specified in the env file).

### Setting up Environment

First you'll want to set up your environment by editing the .env file in the root
of the project.

To store your XMLTV file as a gist, use the following:


```env
GIST_ID={YOUR_GIST_ID}
GIST_TOKEN={YOUR_GIST_TOKEN}
GIST_FILENAME={ANY_FILENAME}
REPEAT_SECONDS=600
OUTPUT_DIRECTORY=
OUTPUT_FILENAME={ANY_FILENAME}
```

To store your XMLTV file locally, use the following:

```env
OUTPUT_DIRECTORY={SOME_LOCAL_DIRECTORY}
OUTPUT_FILENAME={FILENAME.xml}
REPEAT_SECONDS=600
```


### Option 1: Node

To run this on your host machine using node, you'll first need to install the
required packages.

```bash
npm install
```

Then run the startup script.

```bash
./run.sh
```

### Option 2: Docker

You can run the application in a docker container (requires docker installation)
as follows:

**then run**

```bash
docker-compose up -d --build
```

## Usage as NPM Module

### Installation

```bash
yarn add sky-epg-scraper
# or
npm install sky-epg-scraper
```
