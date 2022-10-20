'use strict'

const jwt = require('../extends/jwt')

let j = new jwt()

j.alg = 'sm3'

let data = {
  id: '123we',
  name: '飞龙在天',
  username: 'long'
}

let token = j.make(data)
let r = j.verify(token)

console.log('SM3: ')
console.log(token)
console.log(r)


j.alg = 'sha512'

token = j.make(data)

r = j.verify(token)

console.log('SHA512: ')
console.log(token)
console.log(r)

