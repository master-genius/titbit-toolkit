'use strict';

class cors {

  constructor (options = {}) {
    
    this.allow = '*';
    
    this.allowHeaders = 'content-type';

    this.methods = [
      'GET', 'POST', 'DELETE', 'PUT', 'OPTIONS', 'PATCH', 'TRACE', 'HEAD'
    ];

    if (typeof options !== 'object') {
      options = {};
    }

    this.optionsCache = 60;

    this.useOrigin = true;

    for (let k in options) {
      switch (k) {
        case 'allow':
          if (options[k] === '*' || (options[k] instanceof Array)) {
            this.allow = options[k];
          }
          break;

        case 'useOrigin':
          this.useOrigin = options[k];
          break;

        case 'methods':
          if (typeof options[k] === 'string') {
            options[k] = options[k].split(',').filter(p => p.length > 0);
          }
          if (options[k] instanceof Array) {
            this.methods = options[k];
          }

          break;

        case 'optionsCache':
          if (!isNaN(options[k])) {
            this.optionsCache = options[k];
          }
          break;

        case 'allowHeaders':
          this.allowHeaders = options[k];
          break;

      }
    }

  }

  checkOrigin (url) {
    if (this.useOrigin) {
      return this.allow.indexOf(url) >= 0 ? true : false;
    }

    for (let i = 0; i < this.allow.length; i++) {
      if (url.indexOf(this.allow[i]) === 0) {
        return true;
      }
    }

    return false;

  }

  mid () {
    let self = this;

    return async (c, next) => {
      
      let origin = c.headers.origin || c.headers['referer'] || 'undefined';

      if (self.allow === '*' || origin.indexOf(`${c.protocol}://${c.host}`) === 0 ||  self.checkOrigin(origin) )
      {

        c.setHeader('access-control-allow-origin', '*');
        c.setHeader('access-control-allow-methods', self.methods);
        c.setHeader('access-control-allow-headers', self.allowHeaders);

        if (c.method === 'OPTIONS' && self.optionsCache > 0) {
          c.setHeader('cache-control', `public,max-age=${self.optionsCache}`);
        }

        await next();

      } else {
        c.status(403);
        c.res.body = '';
      }
    };

  }

}

module.exports = cors;

