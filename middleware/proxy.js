'use strict';

const urlparse = require('url');
const http = require('http');
const https = require('https');

/**
 * 或者使用路径前缀，不同的路径前缀转发到不同的服务。
 */

/**
 * {
 *    host : {}
 * }
 * {
 *    host : ''
 * }
 * 
 * {
 *    host : [
 *      {}
 *    ]
 * }
 * 
 */

class proxy {

  constructor (options = {}) {

    this.methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH', 'TRACE'];

    this.hostProxy = {};

    this.urlpreg = /(unix|http|https):\/\/[a-zA-Z0-9\-\_]+/;
    this.withPath = false;
    this.maxBody = 50000000;
    this.full = false;

    this.pathTable = {};

    this.error = {
      '502' : `<!DOCTYPE html><html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Error 502</title>
          </head>
          <body>
            <div style="width:100%;font-size:105%;color:#737373;padding:0.8rem;">
              <h2>502 Bad Gateway</h2><br>
              <p>代理请求不可达。</p>
            </div>
          </body>
      </html>`,

      '503' :`<!DOCTYPE html><html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Error 503</title>
          </head>
          <body>
            <div style="width:100%;font-size:105%;color:#737373;padding:0.8rem;">
              <h2>503 Service Unavailable</h2><br>
              <p>此服务暂时不可用。</p>
            </div>
          </body>
      </html>` 
    };

    if (typeof options !== 'object') {
      options = {};
    }

    for (let k in options) {
      switch (k) {
        case 'host':
          this.setHostProxy(options[k]); break;

        case 'maxBody':
          if (typeof options[k] == 'number' && parseInt(options[k]) >= 0) {
            this.maxBody = parseInt(options[k]);
          }
          break;
        
        /* case 'withPath':
          this.withPath = options[k] ? true : false;
          break; */

        case 'full':
          this.full = options[k] ? true : false;
          break;

        default:;
      }
    }

  }

  fmtpath (path) {
    path = path.trim();
    if (path.length == 0) {
      return '/*';
    }

    if (path[0] !== '/') {
      path = `/${path}`;
    }

    if (path.length > 1 && path[path.length - 1] !== '/') {
      path = `${path}/`;
    }

    if (path.indexOf('/:') >= 0) {
      return path.substring(0, path.length-1);
    }

    return `${path}*`;
  }

  setHostProxy (cfg) {
    if (typeof cfg !== 'object') {
      return;
    }

    let pt = '';
    let tmp = '';

    for (let k in cfg) {

      if (typeof cfg[k] === 'string') {
        cfg[k] = [ { path : '/', url : cfg[k] } ];

      } else if (!(cfg[k] instanceof Array) && typeof cfg[k] === 'object') {
        cfg[k] = [ cfg[k] ];

      } else if ( !(cfg[k] instanceof Array) ) {
        continue;
      }
      /**
       * {
       *    path : '',
       *    url : '',
       *    headers : {}
       * }
       */
      for (let i = 0; i < cfg[k].length; i++) {
        tmp = cfg[k][i];

        if (typeof tmp !== 'object' || (tmp instanceof Array) ) {
          console.error(`${k} ${JSON.stringify(tmp)} 错误的配置格式`);
          continue;
        }

        if (tmp.path === undefined) {
          tmp.path = '/';
        }

        if (tmp.url === undefined) {
          console.error(`${k} ${tmp.path}：没有指定要代理转发的url。`);
          continue;
        }

        if (this.urlpreg.test(tmp.url) === false) {
          console.error(`${tmp.url} : 错误的url，请检查。`);
          continue;
        }

        pt = this.fmtpath(tmp.path);
  
        if (tmp.url[ tmp.url.length - 1 ] == '/') {
          tmp.url = tmp.url.substring(0, tmp.url.length - 1);
        }
  
        if (tmp.headers !== undefined) {
          if (typeof tmp.headers !== 'object') {
            console.error(`${k} ${tmp.url} ${tmp.path}：headers属性要求是object类型，使用key-value形式提供。`);
            continue;
          }
        }

        if (this.hostProxy[k] === undefined) {
          this.hostProxy[k] = {};
        }
  
        tmp.urlobj = this.parseUrl(tmp.url);

        this.hostProxy[k][pt] = {
          url : tmp.url,
          urlobj : tmp.urlobj,
          headers : {},
          path : tmp.path
        };

        if (tmp.headers !== undefined) {
          for (let h in tmp.headers) {
            this.hostProxy[k][pt].headers[h] = tmp.headers[h];
          }
        }

        this.pathTable[pt] = 1;

      }
    }
  }

  parseUrl (url) {
    var u = new urlparse.URL(url);
    var urlobj = {
      hash :    u.hash,
      hostname :  u.hostname,
      protocol :  u.protocol,
      path :    u.pathname,
      method :  'GET',
      headers : {},
    };
    if (u.search.length > 0) {
      urlobj.path += u.search;
    }
    
    if (u.protocol  === 'unix:') {
      urlobj.protocol = 'http:';
      let sockarr = u.pathname.split('.sock');
      urlobj.socketPath = `${sockarr[0]}.sock`;
      urlobj.path = sockarr[1];
    } else {
      urlobj.host = u.host;
      urlobj.port = u.port;
    }
  
    if (u.protocol === 'https:') {
      urlobj.requestCert = false;
      urlobj.rejectUnauthorized = false;
    }
  
    return urlobj;
  }

  copyUrlobj (uobj) {
    let u = {
      hash: uobj.hash,
      hostname :  uobj.hostname,
      protocol :  uobj.protocol,
      path :    uobj.path,
      method :  'GET',
      headers : {},
    };
    if (uobj.host) {
      u.host = uobj.host;
      u.port = uobj.port;
    } else {
      u.socketPath = uobj.socketPath;
    }

    if (uobj.protocol === 'https:') {
      u.requestCert = false;
      u.rejectUnauthorized = false;
    }

    return u;
  }

  midhost () {
    let self = this;
    return async (c, next) => {

      let host = c.host || c.headers['host'];
      
      if (self.hostProxy[host]===undefined || self.hostProxy[host][c.routepath]===undefined) {
        if (self.full) {
          c.status(502);
          c.send(self.error['502']);
          return;
        }
        return await next();
      }

      let pr = self.hostProxy[host][c.routepath];

      let urlobj = self.copyUrlobj(pr.urlobj);
      //urlobj.path = c.path;
      urlobj.path = c.request.url;
      urlobj.headers = c.headers;
      urlobj.method = c.method;
      urlobj.headers['x-real-ip'] = c.ip;
      urlobj.headers['x-real-host'] = c.host;
      
      /* if (Object.keys(c.query).length > 0) {
        urlobj.path += `?${querystring.stringify(c.query)}`;
      } */

      let hci = urlobj.protocol == 'https:' ? https : http;

      let h = hci.request(urlobj);

      return await new Promise((rv, rj) => {
        h.on('response', res => {
          
          c.status(res.statusCode);

          for (let k in res.headers) {
            c.setHeader(k, res.headers[k]);
          }
    
          res.on('data', chunk => {
            c.response.write(chunk);
          });
      
          res.on('end', () => {
            c.response.end();
            rv();
          });
      
          res.on('error', err => {
            rj(err);
          });
        });

        h.on('error', (err) => {
          rj(err);
        });
    
        c.request.on('data', chunk => {
          h.write(chunk);
        });
    
        c.request.on('end', () => {
          h.end();
        });
    
      }).catch(err => {
        c.status(503);
        c.send(self.error['503']);
      });

    };

  }

  init (app) {
    for (let p in this.pathTable) {
      app.router.map(this.methods, p, async c => {}, '@_proxy_host');
    }
    app.use(this.midhost(), {pre: true, group: `_proxy_host`});

  }

}

module.exports = proxy;
