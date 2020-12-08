'use strict'

class realip {

  constructor (options = {}) {
    
    this.realIpHeader = [
      'x-real-ip',
      'x-forwarded-for'
    ]

    if (typeof options !== 'object') {
      options = {}
    }

    for (let k in options) {

      switch (k) {
        case 'fields':
          if (typeof options[k] === 'string') {
            this.realIpHeader = [ options[k] ]
          } else if (options[k] instanceof Array) {
            if (options[k].length > 0) {
              this.realIpHeader = options[k]
              for (let i = 0; i < this.realIpHeader.length; i++) {
                this.realIpHeader[i] = this.realIpHeader[i].toLowerCase()
              }
            }
          }
          
          break

      }

    }

  }

  mid () {

    let self = this

    return async (c, next) => {

      let realipstr = ''

      for (let i = 0; i < self.realIpHeader.length; i++) {
        
        if (c.headers[ self.realIpHeader[i] ] !== undefined) {
          realipstr = c.headers[ self.realIpHeader[i] ]
          break
        }

      }

      if (realipstr !== '') {
        if (realipstr.indexOf(',') > 0) {
          
          c.box.realip = realipstr.split(',').filter(p => p.length > 0)

          if (c.box.realip.length > 0) {
            c.ip = c.box.realip[0].trim()
          }
        } else {
          c.ip = realipstr
        }
      }

      await next()

    }

  }

}

module.exports = realip
