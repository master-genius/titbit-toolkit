'use strict'

const ErrorLog = require('../extends/errorlog.js')

let elog = new ErrorLog({
  debug: true
})

for (let i = 0; i < 10; i++) {
  elog.sendErrorLog(new Error(`${i} test error`, `--ERR-TEST-${i}--`))
}

