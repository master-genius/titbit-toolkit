'use strict';

class timing {

  constructor (options = {}) {

    /**
     * route保存所有路由的最近耗时记录。
     * maxLimit是保存记录上限。
     */

    this.route = {
      'GET'  : new Map(),
      'POST' : new Map(),
      'PUT'  : new Map(),
      'DELETE' : new Map(),
      'OPTIONS' : new Map()
    }

    this.maxLimit = 100

    this.test = false

    if (typeof options !== 'object') {
      options = {}
    }

    for (let k in options) {
      switch (k) {
        case 'test':
          this.test = options[k]
          break
      }
    }

  }

  mid () {

    let self = this

    return async (c, next) => {

      let start_time = Date.now()

      await next()

      let end_time = Date.now()

      let time_consume = end_time - start_time

      if (self.route[c.method] !== undefined) {
        if (!self.route[c.method].has(c.routepath)) {
          self.route[c.method].set(c.routepath, {
            total : 1,
            consume: time_consume
          })
        } else {
          let t = self.route[c.method].get(c.routepath)
          if (t.total > self.maxLimit) {
            t.total = 0
            t.consume = 0
          }

          t.total += 1
          t.consume += time_consume

        }

      }

      if (self.test) {
        
        console.log(c.method, c.path, time_consume, 'ms')

        let last = self.route[c.method].get(c.routepath)
        console.log(c.method, c.path,'\n',
          `  Count: ${last.total}  Total: ${last.consume} ms `,
          `Average: ${(last.consume/last.total).toFixed(2)} ms`
        )
      }

    }

  }

}

module.exports = timing
