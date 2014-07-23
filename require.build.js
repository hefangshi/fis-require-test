{
    baseUrl: './',
    appDir: './www',
    packages:[
        {
            name: 'echarts',
            location: './js/echarts',
            main: 'echarts'
        },
        {
            name: 'zrender',
            location: './js/zrender',
            main: 'zrender'
        },            
    ],
    dir: './www-built',
    modules: [
        {
            //module names are relative to baseUrl/paths config
            name: 'index',
            include: ['echarts', 'zrender'],
        }
    ]
}
