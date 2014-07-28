fis.config.set('roadmap.domain', 'http://127.0.0.1:8080');
fis.config.set('namespace', 'common');
// fis.config.set('namespaceConnector', '|');
fis.config.set('roadmap.path', [
    {
        reg: /\/js\/zrender\/zrender\.js/i,
        id: "zrender"
    },
    {
        reg: /\/js\/zrender\/(.*)\.js/i,
        id: "zrender/$1"
    },
    {
        reg: /\/js\/echarts\/echarts\.js/i,
        id: "echarts"
    },
    {
        reg: /\/js\/echarts\/(.*)\.js/i,
        id: "echarts/$1"
    },
    {
        reg: "**.html",
        useMap: true
    }
]);

fis.config.set('pack',{
    'pkg/zrender.js' : [
        '/js/zrender/**'
    ],
    'pkg/echarts.js' : [
        '/js/echarts/**'
    ]
});

var transform = require('../ast/lib/transform.js');

function extHtml(content, file, opt){
    var reg = /(<script(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/script\s*>|$)|<!--(?!\[)([\s\S]*?)(-->|$)/ig;
    var replace = function(m, $1, $2, $3, $4, $5, $6, $7, $8){
        if($1){//<script>
            if (/(\ssrc\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig.test($1) === false){
                if(!/\s+type\s*=/i.test($1) || /\s+type\s*=\s*(['"]?)text\/javascript\1/i.test($1)) {
                    //without attrubite [type] or must be [text/javascript]
                    m = $1 + extJs($2, file, opt);
                }
            }
        }
        return m;
    };
    return content.replace(reg, replace);
}

function extJs(content, file, opt){
    var reg = /"(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|(\/\/[^\r\n\f]+|\/\*[\s\S]*?(?:\*\/|$))|\b(require)\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*')\s*\)/g;
    var replace =  function(m, comment, require, value){
        if(require){
            var info = fis.util.stringQuote(value);
            if (value.indexOf('.') !== -1){
                var id = fis.file.wrap(file.dirname + '/' + info.rest + '.js').getId();
                m = 'require(' + info.quote + id + info.quote + ')';
            }else{
                var namespace = fis.config.get('namespace');
                var connector = fis.config.get('namespaceConnector', ':');
                if (namespace && info.rest.split(connector).shift() !== namespace){
                    m = 'require(' + info.quote + namespace + connector + info.rest + info.quote + ')';
                }
            }
        }
        return m;
    };
    content = content.replace(reg, replace);
    content = transform(file.getId() , null, content);
    return content;
}

fis.config.set('modules.preprocessor.js', function(content, file, opt){
    return extJs(content, file, opt);
});

fis.config.set('modules.preprocessor.html', function(content, file, opt){
    return extHtml(content, file, opt);
});

// fis.config.set('modules.postpackager', 'autoload');

fis.config.set('modules.postpackager', function(ret, conf, settings, opt){
    function injectSiteAsync(content) {
        function genSiteAsyncMap() {
            var asyncList = [];
            fis.util.map(ret.map.res, function (id) {
                asyncList.push(ret.ids[id]);
            });
            var subpath = (settings.subpath || 'pkg/map.js').replace(/^\//, '');
            return genAsyncMap(asyncList, subpath);
        }
        var siteAsync = genSiteAsyncMap();
        return injectAsyncWithMap(content, siteAsync);
    }

    function genAsyncMap(asyncList, subpath, usedSync) {
        usedSync = usedSync || {};
        //生成async加载需要使用的resourceMap
        var map = {
        };
        fis.util.map(ret.map.res, function (id, file) {
            var uri = file.uri;
            if (file.pkg)
                uri = ret.map.pkg[file.pkg].uri;
            map[id] = uri.replace(".js","");
        });

        var code = 'require.config({"paths":' + JSON.stringify(map, null, opt.optimize ? null : 4) + '});';
        //构造map.js配置文件
        var file = fis.file(fis.project.getProjectPath(), subpath);
        file.setContent(code);
        ret.pkg[subpath] = file;
        ret.ids[file.getId()] = file;
        ret.map.res[file.getId()] = {
            uri: file.getUrl(opt.hash, opt.domain),
            type: "js"
        };
        return file;
    }

    function injectAsyncWithMap(content, resourceMapFile){
        var mapScript;
        settings.useInlineMap = true;
        if (settings.useInlineMap){
            mapScript = '<script type="text/javascript" >\r\n' + resourceMapFile.getContent() + '\r\n</script>';
        }else{
            mapScript = '<script type="text/javascript" data-single="true" src="' + resourceMapFile.getUrl(opt.hash, opt.domain) + '"></script>';
        }
        if (content.indexOf(settings.resourceMapTag) !== -1){
            content = content.replace(settings.resourceMapTag, mapScript);
        }else{
            content = content.replace(/<\/head>/, mapScript + '\n$&');
        }
        return content;
    }

    fis.util.map(ret.src, function(subpath, file){
        if (file.isHtmlLike){
            var content = injectSiteAsync(file.getContent());
            file.setContent(content);
        }
    });
});

