import express from 'express';
import horizon from '@horizon/server';
import path from 'node:path';
import later from '@breejs/later';
import config from './config.js';
import { updateCats } from './tasks/getCats.js';

const app = express();

app.use('/build', express.static(path.join(process.cwd(), '.build')));
app.use('/', express.static(path.join(process.cwd(), 'public')));

const refreshCats = async () => {
  try {
    await updateCats();
  } catch (err) {
    console.error(err);
  }
}

const run = () => {
  console.log('refreshing cats');
  const port = process.env.PORT || config.port;

  const httpServer = app.listen(port, () => {
    console.log(`Express listening at http://localhost:${port}`);
  });

  const horizonServer = horizon(httpServer, {
    auto_create_collection: true,
    auto_create_index: true,
    project_name: 'cathorizon',
    rdb_host: process.env.RETHINKHOST || 'localhost',
    permissions: false,
    auth: {
      allow_anonymous: true,
      allow_unauthenticated: true,
      token_secret: config.token_secret
    }
  });

  refreshCats();

  later.setInterval(() => {
    refreshCats()
  }, later.parse.text('every 45 seconds'));
};

run();
