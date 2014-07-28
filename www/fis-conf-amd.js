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

fis.config.set('modules.postprocessor.html', 'amd');
fis.config.set('modules.postprocessor.js', 'amd');
