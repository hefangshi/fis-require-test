fis.config.set('roadmap.domain', 'http://127.0.0.1:8080');
fis.config.set('roadmap.path', [
    {
        reg: "/js/lib/jquery.js",
        id: 'jquery'
    },
    {
        reg:"**.html",
        useMap:true
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

fis.config.set('settings.preprocessor.requirejs', {
    baseUrl: './js',
    paths: {
        'jquery' : 'lib/jquery'
    },
    packages: [
        {
            name: 'zrender',
            location: 'zrender',
            main: 'zrender'
        },
        {
            name: 'echarts',
            location: 'echarts',
            main: 'echarts'
        }
    ]
});


fis.config.set('modules.postpackager', 'autoload');

fis.config.set('settings.postpackager.autoload', {
    type:'requirejs',
    useInlineMap:true
});

