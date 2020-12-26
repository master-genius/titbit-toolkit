'use strict';

/**
 * 
 * 通过挂载方法到files上，可以快速写入数据到文件
 * 
 */

class tofile {

  constructor () {

  }

  mid () {
    let self = this

    return async (c, next) => {
      if (!c.isUpload) {
        await next()
        return
      }

      c.getFile = (name, ind = 0) => {
        if (c.files[name] === undefined) {
          return null
        }

        if (ind >= c.files[name].length) {
          return null
        }

        if (ind < 0) {
          for (let i = 0; i < c.files[name].length; i++) {
            if (c.files[name][i].toFile === undefined) {
              c.files[name][i].toFile = async (target, filename = null) => {
                if (filename === null) {
                  filename = c.helper.makeName(c.files[name][i].filename)
                }
                await c.moveFile(c.files[name][i], `${target}/${filename}`)
                return filename
              }
            }
          }
          return c.files[name]
        }

        if (c.files[name][ind].toFile === undefined) {
          c.files[name][ind].toFile = async (target, filename = null) => {

            if (filename === null) {
              filename = c.helper.makeName(c.files[name][ind].filename)
            }

            await c.moveFile(c.files[name][ind], `${target}/${filename}`)

            return filename
          }
        }

        return c.files[name][ind]

      }

      await next()

    }

  }

}

module.exports = tofile
