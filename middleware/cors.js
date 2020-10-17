'use strict';

class cors {

  constructor (options = {}) {
    this.allow = [];
    this.methods = [
      'GET', 'POST', 'DELETE', 'PUT', 'OPTIONS', 'PATCH', 'TRACE', 'HEAD'
    ];

    if (typeof options !== 'object') {
      options = {};
    }

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

      }
    }

  }

  /**
   * 只在Node12以上可用 midware = async () => {} 这种语法
   */
  mid () {
    let self = this;

    //只在titbit 21.5.4以上版本可用
    return async (c, next) => {

      let origin = `${c.protocol}://${c.host}`;

      if (self.allow === '*' || (self.allow.length > 0 && self.allow.indexOf(origin) >= 0) ) {
        c.setHeader('Access-Control-Allow-Origin', '*');
        c.setHeader('Access-Control-Allow-Methods', self.methods);
        c.setHeader('Access-Control-Allow-Headers', 'content-type');

        await next();

      } else {
        c.status(403);
        c.res.body = '';
      }
    };

  }

}

module.exports = cors;
