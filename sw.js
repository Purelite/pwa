/**
 * 
 * @authors Your Name (you@example.org)
 * @date    2017-03-12 18:00:05
 * @version $Id$
 */

var ver = 'v1.'
    /*
      self 指的是 ServiceWorkerGlobalScope 物件，也就是 service worker
    */
self.addEventListener("install", function(event) {
    console.log('WORKER: install event in progress.')
    event.waitUntil(
        caches
        /* 缓存通过名字进行索引，使用这个名字，我们可以对缓存进行增删改。
         */
        .open(ver + 'cache')
        .then(function(cache) {
            /* 打开缓存之后，指定需要缓存的文件路径，SW 会自动发出 HTTP 请求，并缓存。
              这个过程中如果有任意一个文件 请求或缓存失败，那么 SW 不会被安装成功，不会触发 activate 事件。
            */
            return cache.addAll([
                '/',
                '/css/global.css',
                '/js/global.js'
            ])
        })
        .then(function() {
            console.log('WORKER: install completed.')
        })
    )
})

self.addEventListener("waiting", function(event) {//installed
    //这个时候可以通知应用用户更新到一个新的版本，或者自动更新。
})
self.addEventListener('activate', function(event) {
    console.log('WORKER: activate event in progress.');
    event.waitUntil(
        caches
        .keys()
        .then(function(keys) {
            return Promise.all(
                keys.filter(function(key) {
                    // 过滤过期缓存
                    return !key.startsWith(version);
                }).map(function(key) {
                    /* 删除所有过期缓存
                     */
                    return caches.delete(key);
                })
            );
        })
        .then(function() {
            console.log('WORKER: activate completed.');
        })
    );
});

self.addEventListener('fetch', function(event) {
    // Do stuff with fetch events
    console.log('WORKER: fetch event in progress.');

    // 只缓存 GET 请求，其他请求交给后端
    if (event.request.method !== 'GET') {
        console.log('WORKER: fetch event ignored.', event.request.method, event.request.url);
        return;
    }
    /* 响应
     */
    event.respondWith(
      // 匹配请求
        caches.match(event.request).then(function(cached) {
            var networked = fetch(event.request)
                .then(fetchedFromNetwork, unableToResolve)
                .catch(unableToResolve);

            console.log('WORKER: fetch event', cached ? '(cached)' : '(network)', event.request.url);
            return cached || networked;

            function fetchedFromNetwork(response) {
                //response 只能用一次，clone 一份用于缓存。
                var cacheCopy = response.clone();

                console.log('WORKER: fetch response from network.', event.request.url);

                caches.open(version + 'pages').then(function add(cache) {
                  //再次打开缓存，将本次请求响应缓存起来。
                  cache.put(event.request, cacheCopy);
                }) .then(function() {
                    console.log('WORKER: fetch response stored in cache.', event.request.url);
                });

                return response;
            }

            function unableToResolve() {
                /* 
                  当代码执行到这里，说明请求无论是从缓存还是走网络，都无法得到答复，这个时机，我们可以返回一个相对友好的页面，告诉用户，你可能离线了。
                */

                console.log('WORKER: fetch request failed in both cache and network.');

                return new Response('<h1>Service Unavailable</h1>', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({
                        'Content-Type': 'text/html'
                    })
                });
            }
        })
    );
});

self.addEventListener('message', function(event) {
    // Do stuff with postMessages received from document
});
