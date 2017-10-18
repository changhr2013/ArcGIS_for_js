require(["esri/tasks/ProjectParameters", "esri/tasks/GeometryService", "esri/SpatialReference"],
    function (ProjectParameters, GeometryService, SpatialReference) {

        //设置需要转换的Geometry数组
        var geometries = [];
        console.log("===转换前的坐标===");
        console.log(geometries);

        //初始化GeometryService需要的project参数对象
        var params = new ProjectParameters();
        //设置参数：传入Geometry[]数组
        params.geometries = geometries;
        //params.geometries = [queryResult.features[0].geometry];

        //设置参数：坐标转换的目标坐标系
        var sp = new SpatialReference({ wkid: 4326 });
        params.outSR = sp;

        //params.transformation.wkid = 1188;

        //初始化GeometryService
        var geometryService = new GeometryService("http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer");

        //根据传入的参数执行坐标转换
        geometryService.project(params, function (geo) {
            
            //geo的类型与输入的格式一样，也是Geometry[]数组
            console.log("===转换后的坐标===");
            console.log(geo);
        });

    });