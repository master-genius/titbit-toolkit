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

    for (let k in options) {
      switch (k) {
        case 'allow':
          if (options[k] === '*' || (options[k] instanceof Array)) {
            this.allow = options[k];
          }
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

  mid () {
    let self = this;

    //只在titbit 21.5.4以上版本可用
    return async (c, next) => {
      
      let origin = c.headers.origin || 'undefined';

      if (self.allow === '*' || (self.allow.length > 0 && self.allow.indexOf(origin) >= 0) ) {

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
