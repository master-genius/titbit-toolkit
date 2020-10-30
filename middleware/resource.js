'use strict';

//const fs = require('fs');

const zlib = require('zlib');

/**
 * 处理静态资源的请求，需要把中间件挂载到一个分组下，否则会影响全局，如果一个只做静态分发的服务则可以全局启用。
 */

class staticdata {

  constructor (options = {}) {

    this.cache = new Map();
    this.staticPath = '';

    //最大缓存，单位为字节，0表示不限制。
    this.maxCacheSize = 1000000000;

    this.size = 0;

    //失败缓存统计，当失败缓存计数达到一个阈值，则会清空缓存。
    this.cacheFailed = 0;

    this.failedLimit = 50;

    this.compress = true;

    this.cacheControl = null;

    if (typeof options !== 'object') {
      options = {};
    }

    for (let k in options) {
      switch(k) {
        case 'staticPath':
          this.staticPath = options[k];
          break;

        case 'maxCacheSize':
          this.maxCacheSize = options[k];
          break;

        case 'failedLimit':
          if (options[k] > 0) {
            this.failedLimit = options[k];
          }
          break;

        case 'compress':
          this.compress = options[k];
          break;

        case 'cacheControl':
          this.cacheControl = options[k];
          break;

      }
    }

    if (this.maxCacheSize < 100000) {
      this.maxCacheSize = 100000;
    }

    if (this.staticPath.length > 1 && this.staticPath[ this.staticPath.length-1 ] === '/') {
      this.staticPath = this.staticPath.substring(0, this.staticPath.length-1);
    }

  }

  mid () {
    let self = this;

    return async (c, next) => {

      let real_path = c.param.starPath || c.path;

      if (real_path[0] !== '/') {
        real_path = `/${real_path}`;
      }

      let pathfile = `${self.staticPath}${real_path}`;
  
      if (self.cache.has(real_path)) {

        let r = self.cache.get(real_path);

        c.setHeader('content-type', r.type);
        c.setHeader('content-length', r.data.length);
        
        if (r.gzip) {
          c.setHeader('content-encoding', 'gzip');
        }

        if (self.cacheControl) {
          c.setHeader('cache-control', self.cacheControl);
        }

        c.send(r.data);

        return ;
      }
  
      try {
        let data = await c.helper.readb(pathfile);
  
        let ctype = 'text/plain; charset=utf-8';

        if (real_path.indexOf('.css') > 0) {
          ctype = 'text/css; charset=utf-8';
        } else if (real_path.indexOf('.js') > 0) {
          ctype = 'text/javascript; charset=utf-8';
        } else if (real_path.indexOf('.jpg') > 0 || real_path.indexOf('.jpeg') > 0) {
          ctype = 'image/jpeg';
        } else if (real_path.indexOf('.png') > 0) {
          ctype = 'image/png';
        } else if (real_path.indexOf('.webp') > 0) {
          ctype = 'image/webp';
        } else if (real_path.indexOf('.gif') > 0) {
          ctype = 'image/gif';
        } else if (real_path.indexOf('.ico') > 0) {
          ctype = 'image/x-icon';
        } else if (real_path.indexOf('.mp4') > 0) {
          ctype = 'video/mp4';
        } else if (real_path.indexOf('.mp3') > 0) {
          ctype = 'audio/mp3';
        }

        let zipdata = null;

        if (ctype.indexOf('text/') === 0 && self.compress) {
          zipdata = await new Promise((rv, rj) => {
              zlib.gzip(data, (err, d) => {
                if (err) {
                  rj(err);
                } else {
                  rv(d);
                }
              });
          });

        }

        if (self.cacheFailed >= self.failedLimit) {
          self.cacheFailed = 0;
          self.size = 0;
          self.cache.clear();
        } else if (self.maxCacheSize > 0 && self.size >= self.maxCacheSize) {
          self.cacheFailed += 1;
        } else {
          self.cache.set(real_path, {
            data : zipdata || data,
            type : ctype,
            gzip : zipdata ? true : false,
          });
          self.size += zipdata ? zipdata.length : data.length;
        }

        c.setHeader('content-type', ctype);
        c.setHeader('content-length', zipdata ? zipdata.length : data.length);

        if (zipdata) {
          c.setHeader('content-encoding', 'gzip');
        }

        if (self.cacheControl) {
          c.setHeader('cache-control', self.cacheControl);
        }

        c.send(zipdata || data);

      } catch (err) {
        c.status(404);
      }
  
    }

  }

}

module.exports = staticdata;
