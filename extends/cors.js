'use strict';

class cors {

  constructor (options = {}) {
    
    this.allow = '*';
    
    this.allowHeaders = 'content-type';

    this.headers = null;

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

        case 'headers':
          if (typeof options[k] === 'object') {
            this.headers = options[k];
          }
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
        if (self.headers) {
          for (let k in self.headers) {
            c.setHeader(k, self.headers[k]);
          }
        }

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

  init(app, routerGroup = null) {
    if (routerGroup === null) {      
      app.options('/*', async c => {});
      app.pre(this.mid());

    } else if (typeof routerGroup === 'object') {
      let grouplog = {};

      for (let k in routerGroup) {  
        app.options(k, async c => {}, {group: routerGroup[k]});

        if (grouplog[ routerGroup[k] ] === undefined) {
          app.pre(this.mid(), {group: routerGroup[k]});
        }

        grouplog[ routerGroup[k] ] = 1;

      }

    } else if (routerGroup instanceof Array) {
      for (let i = 0; i < routerGroup.length; i++) {
        app.options(routerGroup[i], async c => {});
      }
      app.pre(this.mid());
    }

  }

}

module.exports = cors;

