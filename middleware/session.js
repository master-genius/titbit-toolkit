'use strict';

const fs = require('fs');
const crypto = require('crypto');
const os = require('os');

/*
  这个模块用于awy、motoboat、awix、titbit框架的登录会话，
  中间件调用一定要在awy-cookie中间件之后。
  整体的过程就是在基于cookie中间件的解析结果，如果检测到cookie中有会话ID
  则寻找文件并读取数据，解析成JSON对象添加到c.session；如果cookie中
  没有会话ID或者读取文件失败则创建会话文件并发送Set-Cookie头部信息保存会话ID。
*/

class session {
  constructor () {
    this.expires = false;
    this.domain  = false;
    this.path  = '/';
    this.sessionDir = '/tmp';

    this.ds = '/';

    if (os.platform().indexOf('win') === 0) {
      this.ds = '\\';
      this.sessionDir = 'C:\\Users\\Public\\sess';
      try {
        fs.accessSync(this.sessionDir);
      } catch (err) {
        fs.mkdirSync(this.sessionDir);
      }
    }

    this.prefix = 'titbit_sess_';

    this.sessionKey = 'TITBIT_SESSID';

  }

  mid () {
    let self = this;

    return async (c, next) => {
      
      c.session = {};

      let sess_file = '';
      let sessid = c.cookies[self.sessionKey];
      if (sessid) {
        sess_file = `${self.sessionDir}${self.ds}${self.prefix}${sessid}`;
      }

      

    };

  }

  

}

module.exports = function () {
  var sess = {

  };

  sess.callback = async function (rr, next) {
    var sess_file = '';
    var sessid = c.cookies[`${sess.sessionKey}`];
    var sess_state = false;
    if (sessid) {
      sess_file = `${sess.sessionDir}/${sess.prefix}${sessid}`;

      await new Promise((rv, rj) => {
        fs.readFile(sess_file, (err, data) => {
          if (err) {
            rj(err);
          } else {
            sess_state = true;
            rv(data);
          }
        });
      }).then(data => {
        c.sessionText = data;
        c.session = JSON.parse(data);
      }, err => {
        sess_state = false;
      }).catch(err => {});
    }

    if (sessid === undefined || sess_state === false) {
      c.session = {};
      var org_name = `${c.url.host}_${Date.now()}__${Math.random()}`;
      var hash = crypto.createHash('sha1');
      hash.update(org_name);
      var sessid = hash.digest('hex');

      sess_file = sess.prefix + sessid;

      var set_cookie = `${sess.sessionKey}=${sessid};`;
      if (sess.expires) {
        var t = new Date(Date.now() + sess.expires *1000);
        set_cookie += `Expires=${t.toString()};`;
      }

      set_cookie += `Path=${sess.path};`;

      if (sess.domain) {
        set_cookie += `Domain=${sess.domain}`;
      }

      var session_path_file = `${sess.sessionDir}/${sess_file}`;
      await new Promise((rv, rj) => {
        fs.writeFile(session_path_file, '{}', err => {
          if (err) {
            rj(err);
          } else {
            rv(true);
          }
        });
      }).then(data => {
        c.setHeader('Set-Cookie', set_cookie);
      }, err => {
      });
    }

    await next(rr);

    //如果session状态改变则保存session到文件中，如果session为null，则表示删除文件。
    if (c.session !== null) {
      var tmpText = JSON.stringify(c.session);
      if (c.sessionText !== tmpText) {
        fs.writeFile(session_path_file, tmpText, (err) => {});
      }
    } else {
      fs.unlink(session_path_file, err => {});
    }
  };
  return sess;
};
