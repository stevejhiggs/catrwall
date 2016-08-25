const gulp = require('gulp');
const nodemon = require('gulp-nodemon');
const es6Pipeline = require('gulp-webpack-es6-pipeline');

es6Pipeline.registerBuildGulpTasks(
  gulp,
  {
    entryPoints: {
      'client': __dirname + '/src/client.jsx'
    },
    outputDir: __dirname + '/.build'
  }
);

gulp.task('runSite', (done) => {
  nodemon({
    script: 'src/server.js',
    ext: 'js html',
    env: {
      NODE_ENV: 'development'
    }
  });

  setTimeout(() => {
    done();
  }, 500);
});

gulp.task('default', ['es6Pipeline:build:dev', 'runSite']);
gulp.task('dev', ['es6Pipeline:watch', 'runSite']);
