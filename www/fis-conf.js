fis.config.set('roadmap.domain', 'http://127.0.0.1:8080');
// fis.config.set('namespace', 'common');
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
        useMap: true,
        extras: {
            requirejs: {
                // syncLoad : true
            }
        }
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

fis.config.set('modules.preprocessor.js', 'requirejs');

fis.config.set('modules.preprocessor.html', 'requirejs');

fis.config.set('modules.postpackager', 'autoload');

fis.config.set('settings.postpackager.autoload', {
    type:'requirejs',
    useInlineMap:true
});

