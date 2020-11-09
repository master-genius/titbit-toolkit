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
})

st.init(app)

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
