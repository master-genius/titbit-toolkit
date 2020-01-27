'use strict';

class cors {

  constructor () {
    this.allow = [];
    this.methods = [
      'GET', 'POST', 'DELETE', 'PUT', 'OPTIONS', 'PATCH', 'TRACE', 'HEAD'
    ];
  }

  /**
   * 只在Node12以上可用 midware = async () => {} 这种语法
   */
  async callback (c, next) {
    if (c.headers['referer'] === undefined) {
      c.headers['referer'] = '';
    }
    var org = '';
    var urlarr = [];
    if (this.allow instanceof Array) {
      urlarr = c.headers['referer'].split('/').filter(p => p.length > 0);
      if (urlarr.length >= 2) {
        org = `${urlarr[0]}//${urlarr[1]}`;
      }
    }
    if (this.allow == '*' || this.allow.indexOf(org) >= 0) {
      c.setHeader('Access-Control-Allow-Origin', '*');
      c.setHeader('Access-Control-Allow-Methods', this.methods);
      c.setHeader('Access-Control-Allow-Headers', 'content-type');
      await next(c);
    } else {
      c.status(404);
    }
  }

}

module.exports = cors;
