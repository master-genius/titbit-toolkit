'use strict'

const fs = require('fs')

class pipe {

  constructor () {

  }

  async filePipe (filename) {
    let fread = fs.createReadStream(filename)
    
    return new Promise((rv, rj) => {
      fread.pipe(c.reply)

      fread.on('error', err => {
        rj(err)
      })

      fread.on('end', () => {
        rv()
      })
      
    })
    
  }


  mid () {
    let self = this

    return async (c, next) => {
      c.box.pipe = self.filePipe
      await next()
    }
  }

}

module.exports = pipe
