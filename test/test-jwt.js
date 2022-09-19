'use strict'

const jwt = require('../extends/jwt')

let j = new jwt()

j.alg = 'hs512'

let token = j.make({
  id: '123we',
  name: '飞龙在天',
  username: 'long'
})

console.log(token)

let r = j.verify(token)

console.log(r)
