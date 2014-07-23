fis.config.set('roadmap.domain', 'http://127.0.0.1:8080');
fis.config.set('roadmap.path', [
    {
        reg: /\/js\/zrender\/(.*)\.js/i,
        id: "zrender/$1"
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
    content = transform(file.getUrl(opt.hash, opt.domain) , null, content);
    var reg = /"(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|(\/\/[^\r\n\f]+|\/\*[\s\S]*?(?:\*\/|$))|\b(require)\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*')\s*\)/g;
    var replace =  function(m, comment, require, value){
        if(require && value.indexOf('.') !== -1){
            var info = fis.util.stringQuote(value);
            m = 'require(' + info.quote + info.rest + '.js' + info.quote + ')';
        }
        return m;
    };
    return content.replace(reg, replace);
}

function replaceJs(content, map){
    var reg = /"(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|(\/\/[^\r\n\f]+|\/\*[\s\S]*?(?:\*\/|$))|\b(require)\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*')\s*\)/g;
    var replace =  function(m, comment, require, value){
        if(require){
            var info = fis.util.stringQuote(value);
            if (map[info.rest]){
                m = 'require(' + info.quote + map[info.rest].uri + info.quote + ')';
            }
        }
        return m;
    };
    return content.replace(reg, replace);
}

fis.config.set('modules.preprocessor.js', function(content, file, opt){
    return extJs(content, file, opt);
});

fis.config.set('modules.preprocessor.html', function(content, file, opt){
    return extHtml(content, file, opt);
});

fis.config.set('modules.prepackager', function(ret){
    fis.util.map(ret.src, function(subpath, file){
        if (file.isJsLike){
            var content = file.getContent();
            content = replaceJs(content, ret.map.res);
            file.setContent(content);
        }
    });
});