'use strict';

class referer {
  constructor (options = {}) {

    this.allow = [];

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

      }
    }

  }

  mid () {
    let self = this;

    return async (c, next) => {
      if (c.headers['referer'] === undefined) {
        c.headers['referer'] = '';
      }

      let stat = false;

      if (self.allow === '*' || self.allow.length === 0 ) {
        stat = true;
      } else {
        for (let i = 0; i < self.allow.length; i++) {
          if (c.headers['referer'].indexOf(self.allow[i]) === 0) {
            stat = true;
            break;
          }
        }
      }
      
      if (stat) {
        await next();
      } else {
        c.status(403);
        c.res.body = 'Forbidden!';
      }

    };

  }


}

module.exports = referer;
