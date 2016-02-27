var gulp = require('gulp');
var traceur = require('gulp-traceur');

gulp.task('traceur', function () {
  gulp.src(['./app.js'])
    .pipe(traceur({ blockBinding: true }))
    .pipe(gulp.dest('./compiled/traceur'));
});

gulp.task('default', ['traceur']);

