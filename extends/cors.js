'use strict';

/**
 * 跨域请求中，在以下情况下，origin不会出现：
 *        https页面请求http接口。
 *        但是在目前的策略中，在https页面中，引入http资源会引入不安全因素。
 *        浏览器会报错：已阻止载入混合活动内容。
 * 
 * 跨域请求中，origin字段是必须的。
 * 
 * 在https跨域测试中，若要使用自签名的证书，必须先通过浏览器访问后端API，并把证书添加信任。
 * 
 * 这之后，fetch才会成功请求。
 * 
 * 这里讨论的跨域和referer问题只有在浏览器环境才会有效，通过命令请求完全不会理会这些处理过程。
 * 
 * 严格的权限控制要通过token以及其他数据检测手段。
 * 
 * 所以为了保证服务既可以适用于跨域也可以同源，必须要针对referer进行检测。
 *
 * 你可以设置在允许的referer内也返回消息头，因为有些应用根本不给你发送这个origin消息头，比如小程序。
 * 
 */

class cors {

  constructor (options = {}) {
    
    this.allow = '*';
    
    this.allowHeaders = 'content-type';

    this.requestHeaders = '*';

    //Access-Control-Expose-Headers 指定哪些消息头可以暴露给请求端。
    this.exposeHeaders = '';

    this.allowEmptyReferer = true;

    this.emptyRefererGroup = null;

    this.referer = '';

    this.methods = [
      'GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'
    ];

    if (typeof options !== 'object') {
      options = {};
    }

    this.optionsCache = null;

    for (let k in options) {
      switch (k) {
        case 'allow':
          if (options[k] === '*' || Array.isArray(options[k])) {
            this.allow = options[k];
          }
          break;

        case 'allowEmptyReferer':
          this.allowEmptyReferer = !!options[k];
          break;
        
        //允许提交空referer的路由分组
        case 'emptyRefererGroup':
          if (typeof options[k] === 'string') options[k] = [ options[k] ];
          if (Array.isArray(options[k])) this.emptyRefererGroup = options[k];
          break;

        case 'referer':
          if (options[k] === '*') {
            this[k] = '*';
          } else {
            if (typeof options[k] === 'string') options[k] = [ options[k] ];
            if (Array.isArray(options[k])) this[k] = options[k];
          }
          break;

        case 'requestHeaders':
          this.requestHeaders = options[k];
          break;

        case 'methods':

          if ((options[k] instanceof Array) || typeof options[k] === 'string') {
            this.methods = options[k];
          }

          break;

        case 'optionsCache':
        case 'maxAge':
          if (!isNaN(options[k]))
            this.optionsCache = options[k];
          break;

        case 'allowHeaders':
          this.allowHeaders = options[k];
          break;

        case 'exposeHeaders':
          this.exposeHeaders = options[k];
          break;

      }
    }

    if (this.methods instanceof Array) {
      this.methodString = this.methods.join(',');
    } else {
      this.methodString = this.methods;
    }

    this.allowTable = {};
    //记录是否用于referer检测。
    this.refererTable = {};

    if (Array.isArray(this.allow)) {
        let lastSlash = 0;
        let midIndex, midChar, host, useForReferer;

        for (let aw of this.allow) {
            useForReferer = true;

            if (!aw) continue;

            if (typeof aw === 'string') host = aw.trim();
            else if (typeof aw === 'object') {
              host = aw.url || '';
              useForReferer = !!aw.referer;
            }

            if (!host) continue;

            lastSlash = host.length - 1;
            while(host[lastSlash] === '/' && lastSlash > 0) lastSlash--;

            //不允许 / 结尾。
            if (lastSlash < host.length - 1) host = host.substring(0, lastSlash+1);
            if (!host.trim()) continue;

            midIndex = parseInt(host.length / 2);
            midChar = host[midIndex];

            this.allowTable[host] = {
              length: host.length,
              last: host[host.length - 1],
              midIndex: midIndex,
              midChar: midChar,
              slashIndex: host.indexOf('/', 8),
              referer: useForReferer
            };

            if (useForReferer) this.refererTable[host] = this.allowTable[host];
        }

        this.allow = Object.keys(this.allowTable);
    }

  }

  checkOrigin (url) {
    return this.allowTable[url] ? true : false;
  }

  checkReferer(url) {
    if (this.allow === '*') return true;

    let aobj
    let ulen = url.length

    for (let u in this.refererTable) {
      aobj = this.refererTable[u];
      //允许的referer长度比真实的值要短，所以超过的必然不是，如果最后一个字符不匹配可以直接跳过。
      if (aobj.length > ulen || url[aobj.length - 1] !== aobj.last) continue;

      if (url[aobj.midIndex] !== aobj.midChar) continue;
      
      if (aobj.slashIndex > 0 && url[aobj.slashIndex] !== '/') continue;

      //substring 之后 判等 比 indexOf 要慢。
      if (url.indexOf(u) === 0) return true;
    }

    return false;
  }

  /**
   * 要区分两种状态：跨域请求和同源请求。
   *    在同源请求：c.headers.referer必然是包含页面路径。
   *    若直接请求此资源则不会返回数据。
   * 
   */

  mid () {
    let self = this;

    return async (c, next) => {
       //使用c.box.corsAllow控制，给中间件处理留出扩展空间。
      //跨域请求，必须存在origin。
      if (c.headers.origin) {
          if (!(self.allow === '*' || self.allowTable[c.headers.origin] || c.box.corsAllow) ) {
            return;
          }
      } else {
        /**
         * 在浏览器里，如果是跨域，则必然会遵循跨域原则，所以origin和referer的规则都会有效。
         * 若不是浏览器，仅凭CORS规范是无法约束非法请求的。
         */
        //有一种情况，直接返回的页面并不具备referer，所以前端页面的请求不能有跨域扩展。
        //直接通过file方式进行，也不会有referer。
        //如果referer前缀就是host说明是本网站访问

        //非跨域请求，或仅仅是没有携带origin
        let referer = c.headers.referer || '';
        
        //处理同源请求。允许提交空的referer或者允许某些路由分组可以提交空referer(针对前端页面)
        //或者是检测到c.box.corsAllow，host和referer都是客户端的控制，检测必须要依赖服务端对host的配置。

        if (!(
              (!referer 
                && (self.allowEmptyReferer || (self.emptyRefererGroup && self.emptyRefererGroup.indexOf(c.group) >= 0) ) 
              )
              || c.box.corsAllow || (referer && self.checkReferer(referer))
            )
        ) {
          return;
        }
       
      }

      c.setHeader('access-control-allow-origin', '*');
      c.setHeader('access-control-allow-methods', self.methodString);
      c.setHeader('access-control-allow-headers', self.allowHeaders);
      //服务端也要包含此消息头。
      c.setHeader('access-control-request-headers', self.requestHeaders);

      if (self.exposeHeaders)
        c.setHeader('access-control-expose-headers', self.exposeHeaders);

      if (c.method === 'OPTIONS') {
        c.status(204);
        self.optionsCache && c.setHeader('access-control-max-age', self.optionsCache);
      } else {
        return await next();
      }
      
    };

  }

}

module.exports = cors;
