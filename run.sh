#!/bin/bash

if [ -f .env ]
then
  export $(cat .env | sed 's/#.*//g' | xargs)
fi

while true; do
    npm run start;
    sleep $REPEAT_SECONDS;
done
