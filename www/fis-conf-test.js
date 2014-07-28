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


/**
 * 模拟fis-preprocessor-amd
 */
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
    content = transform(file, content);
    return content;
}

fis.config.set('modules.preprocessor.js', function(content, file, opt){
    return extJs(content, file, opt);
});

fis.config.set('modules.preprocessor.html', function(content, file, opt){
    return extHtml(content, file, opt);
});

/*
模拟fis-postpackager-autoload
 */
fis.config.set('modules.postpackager', function(ret, conf, settings, opt){
    function injectSiteAsync(content) {
        var siteAsync = genAsyncMap('pkg/map.js');
        return injectAsyncWithMap(content, siteAsync);
    }

    function genAsyncMap(subpath) {
        //生成async加载需要使用的resourceMap
        var map = {
        };
        fis.util.map(ret.map.res, function (id, file) {
            var url = file.url;
            if (file.pkg)
                url = ret.map.pkg[file.pkg].url;
            map[id] = url.replace(".js","");
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

