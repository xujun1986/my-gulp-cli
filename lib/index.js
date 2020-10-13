// 自定义工作流入口
const { src, dest, parallel, series, watch } = require('gulp')

const del = require('del')
const browserSync = require('browser-sync');

let config = {
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**'
    }
  }
}

try {
  const loadConfig = require(`${process.cwd()}/pages.config.js`)
  config = Object.assign({}, config, loadConfig)
} catch (e) {
  
}




// 手动加载插件
// const sass = require('gulp-sass')
// const babel = require('gulp-babel')
// const swig = require('gulp-swig')
// const imagemin = require('gulp-imagemin')


// 自动加载插件
const loadPlugin = require('gulp-load-plugins')
const plugins = loadPlugin({
  rename: {
    'gulp-clean-css': 'css'
  }
})

const bs = browserSync.create()

const clean = () => {
  return del([config.build.dist, config.build.temp])
}

// 样式编译
const style = () =>{
  return src(config.build.paths.styles, {
    base: config.build.src,
    cwd: config.build.src
  })
      .pipe(plugins.sass({
        outputStyle: 'expanded'
      }))
      .pipe(dest(config.build.temp))
      .pipe(bs.reload({ stream: true}))
}

// 脚本ES6编译
const script = () => {
  return src(config.build.paths.scripts,{
    base: config.build.src,
    cwd: config.build.src
  })
      .pipe(plugins.babel({
        presets: [require('@babel/preset-env')]
      }))
      .pipe(dest(config.build.temp))
      .pipe(bs.reload({ stream: true}))
}

// 页面文件处理 模板引擎SWIG
const page = () => {
  return src(config.build.paths.pages, {
    base: config.build.src,
    cwd: config.build.src
  })
      .pipe(plugins.swig({}))
      .pipe(dest(config.build.temp))
      .pipe(bs.reload({ stream: true}))
}

const image = () => {
  return src(config.build.paths.images, {
    base: config.build.src,
    cwd: config.build.src
  })
      .pipe(plugins.imagemin())
      .pipe(dest(config.build.dist))
}

const font = () => {
  return src(config.build.paths.fonts, {
    base: config.build.src,
    cwd: config.build.src
  })
      .pipe(plugins.imagemin())
      .pipe(dest(config.build.dist))
}

const extra = () => {
  return src('**', {
    base: config.build.public,
    cwd: config.build.public
  })
      .pipe(dest(config.build.dist))
}

// 开发服务器
const serve = () => {
  // 源代码热更新
  watch(config.build.paths.styles, {cwd: config.build.src}, style)
  watch(config.build.paths.scripts, {cwd: config.build.src}, script)
  watch(config.build.paths.pages, {cwd: config.build.src}, page)
  // watch('src/assets/images/**', image)
  // watch('src/assets/fonts/**', font)
  // watch('public/**', extra)
  watch([
    config.build.paths.images,
    config.build.paths.fonts,
    'public/**'
  ], {cwd: config.build.src}, bs.reload)
  
  watch('**', {cwd: config.build.public}, bs.reload)
  
  bs.init({
    notify: false,
    port: 2080,
    // open: false,
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public],
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}

// 文件引用处理，压缩/合并代码
const useref = () => {
  return src(config.build.paths.pages, {
    base: config.build.temp,
    cwd: config.build.temp
  })
      .pipe(plugins.useref({
        searchPath: [config.build.temp, '.']
      }))
      // html js css
      // gulp-htmlmin gulp-uglify gulp-clean-css gulp-if
      .pipe(plugins.if(/\.js$/, plugins.uglify()))
      .pipe(plugins.if(/\.css$/, plugins.css()))
      .pipe(plugins.if(/\.html$/, plugins.htmlmin({
        collapseWhitespace: true,
        minifyCSS: true,
        minifyJS: true,
      })))
      .pipe(dest(config.build.dist))
}

// 组合任务
const compile = parallel(style, script, page)
const build = series(
    clean,
    parallel(
        series(compile, useref),
        image,
        font,
        extra
    )
)
const develop = series(compile, serve)

module.exports = {
  clean,
  build,
  develop
}