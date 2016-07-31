const rethinkdbdash = require('rethinkdbdash');

const config = {
    db: 'cathorizon',
    servers: [
    {
      host: '127.0.0.1',
      port: 28015
    }
  ]
};

const config_internal = Object.assign({}, config);
config_internal.db = config.db + '_internal';

const r = rethinkdbdash(config);
const r_internal = rethinkdbdash(config_internal);

module.exports = {
    r: r, 
    r_internal: r_internal
};