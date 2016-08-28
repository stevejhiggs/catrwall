# catrwall
real time collaborative cat voting with horizon io

## a quick example

This shows how to get a real-time web app up and running using horizon.io and rethink db.

## running locally

easiest way to do this is to use docker and then run: 

`docker-compose up --build` 

This will start everything up and give you a web interface on localhost:4000

### running without docker

you will need to be running a local rethink db database then just `npm start` in the root directory.

## Stuff you would fix in a real production app

This was done as fast as possible for demo purpose and as such 
it takes a number of shortcuts you would fix in a real app. These include:

* horizon is currently in a dev mode without authentication
* client scripts are built on run rather than build
* docker image contains the full build tooling.
