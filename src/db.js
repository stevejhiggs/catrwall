const rethinkdbdash = require('rethinkdbdash');

const config = {
    db: 'cathorizon',
    servers: [
    {
      host: process.env.RETHINKHOST || 'localhost',
      port: 28015
    }
  ]
};

module.exports = rethinkdbdash(config);
