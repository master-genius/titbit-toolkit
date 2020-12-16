# titbit框架工具集

目前所有扩展组件都是中间件形式，初始化后运行mid()返回中间件，所以通用的使用形式如下：

``` JavaScript

let t = new timing()
app.use( t.mid() )

```


## 导出示例

``` JavaScript
const {timing,resource,tofile} = require('titbit-toolkit')
```

一些扩展还会有init接口，这种情况下，只需要运行：

```
//t是初始化的扩展实例，app是titbit实例。
t.init(app)

```

## timing

计时中间件，默认会计算GET、POST、PUT、DELETE请求类型的耗时，并在test选项为true时，输出每个请求的平均耗时和当前时间消耗。主要用于测试和统计。

## cookie和session

这两个扩展是为了测试和教学使用而设计的，cookie组件运行后会在请求上下文中添加cookie属性是一个对象保存了cookie值。session基于cookie实现，利用文件保存数据，**但是这两个扩展不建议用在生产环境**，你应该使用更好的方案来进行会话处理，比如自己生成token或者是利用jwt。

使用：

``` JavaScript

let ck = new cookie()

app.use(ck.mid())

let sess = new session()

app.use(sess.mid())


```

## resource

静态资源处理，主要用于js、css、图片、音频、短视频的处理，最主要的还是用于站点的js、css、图片等数据量不大的静态资源。

对于大视频来说，需要分片处理，会比较麻烦。

使用：

``` JavaScript

let st = new resource({
    //设定静态资源所在目录
    staticPath: './public'
})

//只对分组为static执行中间件。
app.use(st.mid(), {group: 'static'})

//添加静态资源路由
app.get('/static/*', async c => {

    //请求分组为static
}, '@static')

/**
 * 比如目录public存在css/a.css
 * 在之前的示例中，请求/static/css/a.css即可获取资源。
 * /

```

快速示例：

``` JavaScript

let st = new resource({
    
    //设定静态资源所在目录
    staticPath: './public',

    //默认就是/static/*
    routePath : '/static/*'

    routeGroup: '_static'
})

st.init(app)

//添加到_static分组，之后，在public目录中的存在favicon.ico文件，
//通过此请求既可以获取到。
//浏览器会自动发起此请求获取tab标签的图标。
app.get('/favicon.ico', async c => {}, {group: '_static'})

```

## tofile

按照面向对象的风格保存上传的文件：

``` JavaScript

let {tofile} = require('titbit-toolkit')

app.use( (new tofile()).mid() )

app.post('/upload', async c => {
    let f = c.getFile('image')

    if (f === null) {
        c.status(400)
        return
    }

    //把文件移动到images目录，此目录可能需要手动创建。
    //可以使用第二个参数指定文件名，默认会根据时间戳和随机数生成唯一文件名。
    let fname = await f.toFile('./images')

    //返回上传的文件名
    c.res.body = fname

})

```

## cors

跨域支持：

``` JavaScript

let {cors} = require('titbit-toolkit')

let cr = new cors({
    //默认为*表示全部开启跨域，
    //若要指定要支持的域名则需要传递一个数组。
    //注意：这里指定的是用于访问接口的应用页面所在域。
    allow : [
        'https://a.com',
        'https://www.a.com',
        //...
    ],

    //OPTIONS请求缓存60秒，此期间浏览器请求会先去读取缓存。
    optionsCache: 60
})

app.use(cr.mid())

//支持OPTIONS请求，因为浏览器在处理一些POST和PUT请求以及DELETE请求时会先发送OPTIONS预检请求。
//如果没有OPTIONS请求，则跨域支持不完整。
app.options('/*', async c => {

})

```

## realip

在代理模式下，获取真实的客户端IP地址，常见的比如使用nginx作为反向代理，或者使用node自身作为代理，这时候后端的服务是代理服务请求并转发的，获取的IP地址永远都是代理服务的，而不是真实的客户端IP地址。

这时候，代理服务为了能够让后端的服务知道真实的IP地址，会在请求转发时，设置消息头，常见的两个消息头：

```
x-real-ip
x-forwarded-for
```

Nginx通常使用x-real-ip，x-forwarded-for最早在Squid软件中使用，你可以在自己的应用中使用其他消息头，这并不是什么标准，只是使用的多而已。

> 因为使用的多了，x-forwarded-for被写入了RFC7239标准。

realip默认会检测两个消息头，顺序为：x-real-ip，x-forwarded-for。只要有一个消息头被发现，就不再继续检测，而是直接使用发现的值。

如果两个消息头都没有设置则会跳过。

使用：

``` JavaScript

app.use( (new realip()).mid() )

app.get('/*', async c => {
    c.send(c.ip)
})

app.run(1234)

```

多级代理，如果使用了多级代理，这时候根据配置不同，有可能，会从第一层代理开始，每个后续的代理都把自己的看到的客户端IP地址追加到消息头的后面，并使用 , 分隔。

此时，扩展检测到消息头信息中存在 , 则会切分成数组，第一个元素则为最开始用户请求的IP地址，并把此值赋值给请求上下文的ip属性。整个数组会挂载到c.box.realip。

``` JavaScript

app.use( (new realip()).mid() )

app.get('/*', async c => {
    let rip = {
        ip : c.ip,
        realip : c.box.realip || 'null'
    }
    c.send(rip)
})

app.run(1234)

```

## proxy

简单的代理服务，注意这个代理实现的是很简单的工作，不支持负载均衡，可以用在相对简单的场景。


``` JavaScript

'use strict'

const titbit = require('titbit')
const {proxy} = require('titbit-toolkit')

let hostcfg = {

    //会自动转换为数组的形式，默认path为 / 
    'a.com' : 'http://localhost:8001',

    //会自动转换为数组的形式
    'b.com' : {
        path : '/xyz',
        url : 'http://localhost:8002'
    },

    //标准形式
    'c.com' : [
        {
            path : '/name',
            url  : 'http://localhost:8003'
        },

        {
            path : '/',
            url : 'http://localhost:8004'
        }
    ]

};

const app = new titbit({
    debug: true
})

const pxy = new proxy({
    timeout: 10000,
    //如果开启此选项，会把代理路径后面的字符串作为路径转发，否则会转发整个路径
    starPath : true,
    host : hostcfg
})

pxy.init(app)

app.daemon(1234, 2)

```

这个时候，要访问真正运行在8001端口的后端服务，可以按照以下形式：

```
http://a.com:1234/
```

访问运行在8002端口的服务：

```
http://b.com:1234/xyz/
```

### 关于starPath

扩展要添加对应的路由，是 \* 表示的任意路径类型，这时候，后端的路由如何接收请求是一个问题：

- 直接转发整个路径，这样，真正后端服务的每个路径都要加上路径前缀。

- 只转发 ctx.param.starPath 表示的路径，不带有前缀。

默认starPath为false，会转发整个路径。如果设置为ture，则真正后端的服务可以不考虑前缀的问题，比如在8002端口的服务每个路由都不需要加上/xyz。
