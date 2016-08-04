const express = require('express');
const horizon = require('@horizon/server');
const path = require('path');
const later = require('later');
const config = require('./config');
const cats = require('./tasks/getCats');

const app = express();

app.use('/build', express.static(path.join(process.cwd(), '.build')));
app.use('/', express.static(path.join(process.cwd(), 'public')));

const run = () => {
  console.log('refreshing cats');
  const port = process.env.PORT || config.port;

  const httpServer = app.listen(port, (err) => {
    if (err) {
      console.log(err); // eslint-disable-line
      return;
    }

    console.log(`Express listening at http://localhost:${port}`); // eslint-disable-line
  });

  // @TODO make this configurable
  const horizonServer = horizon(httpServer, {
    auto_create_collection: true,
    auto_create_index: true,
    project_name: 'cathorizon',
    permissions: false, // waiting for additions to permission system atm
    auth: {
      allow_anonymous: true,
      allow_unauthenticated: true,
      token_secret: config.token_secret
    }
  });

  later.setInterval(() => {
    cats.updateCats().catch(ex => {
      console.log(ex);
    });
  }, later.parse.text('every 30 seconds'));

  
};

run();

