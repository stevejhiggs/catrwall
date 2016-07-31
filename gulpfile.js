const gulp = require('gulp');
const es6Pipeline = require('gulp-webpack-es6-pipeline');

es6Pipeline.registerBuildGulpTasks(
  gulp,
  {
    entryPoints: {
      'client': __dirname + '/src/client.js'
    },
    outputDir: __dirname + '/.build'
  }
);