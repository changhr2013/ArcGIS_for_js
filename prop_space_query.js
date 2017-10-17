require(["esri/map",
	"dojo/on",
	"dojo/dom",
	"esri/toolbars/edit",
	"esri/geometry/Polygon",
	"esri/geometry/Extent",
	"esri/graphic", "dojo/colors",
	"esri/symbols/SimpleMarkerSymbol", "esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleFillSymbol",
	"esri/layers/ArcGISDynamicMapServiceLayer",
	"esri/layers/GraphicsLayer",
	"dojo/query", "esri/tasks/QueryTask",
	"esri/tasks/query",
	"esri/tasks/IdentifyTask",
	"esri/tasks/IdentifyParameters",
	"esri/tasks/FindTask",
	"esri/tasks/FindParameters",
	"esri/toolbars/navigation",
	"esri/toolbars/draw",
	"esri/tasks/GeometryService",
	"esri/geometry/Point",
	"esri/tasks/LengthsParameters",
	"esri/tasks/AreasAndLengthsParameters",
	"esri/tasks/PrintTask",
	"esri/tasks/PrintTemplate",
	"esri/tasks/PrintParameters",
	"esri/tasks/LegendLayer",
	"esri/symbols/Font",
	"esri/symbols/TextSymbol",
	"esri/layers/FeatureLayer",
	"esri/tasks/ProjectParameters",
	"dojo/domReady!"],
	function (Map, on, dom, Edit, Polygon, Extent, Graphic, Color, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol,
		ArcGISDynamicMapServiceLayer, GraphicsLayer, query, QueryTask, Query, IdentifyTask, IdentifyParameters,
		FindTask, FindParameters, Navigation, Draw, GeometryService, Point, LengthsParameters, AreasAndLengthsParameters,
		PrintTask, PrintTemplate, PrintParameters, LegendLayer, Font, TextSymbol, FeatureLayer, ProjectParameters) {

		//新建查询结果的填充符号样式
		var tdsyqSearchSymbol = new SimpleFillSymbol(
			SimpleFillSymbol.STYLE_SOLID,
			new SimpleLineSymbol(
				SimpleLineSymbol.STYLE_SOLID,
				new Color([255, 0, 0, 0.65]), 2
			),
			new Color([0, 0, 255, 0.15])
		);

		//新建土地使用权属性查询的高亮图层
		var tdsyqSearchLayer = new GraphicsLayer({ id: 'tdsyqSearchLayer' });

		//新建地图对象
		var map = new Map("mapDiv", {
			logo: false
		});

		//定义MapServer地址和需要查询的图层号
		var mapServiceData = "http://19.130.211.148:6080/arcgis/rest/services/nh_shiyqzd/MapServer";
		var mapServiceLayer = 0;

		//定义基础图层的MapServer地址
		var basemapServiceData = "http://192.168.172.74:6080/arcgis/rest/services/nanhai/MapServer";

		//新建动态地图服务图层
		var layer = new ArcGISDynamicMapServiceLayer(basemapServiceData);

		//设置哪些图层可见:14楼栋，15构筑物，16自然幢，19交通道路，20水系，21宗地基本信息，23行政区，24地籍子区，25地籍区
		layer.setVisibleLayers([14, 15, 16, 19, 20, 21, 23, 24, 25]);

		//新建动态地图服务图层
		var addlayer = new ArcGISDynamicMapServiceLayer(mapServiceData);

		//设置哪些图层可见
		addlayer.setVisibleLayers([mapServiceLayer]);

		//在Map中添加动态地图服务图层

		map.addLayer(layer);
		map.addLayer(addlayer);

		//============================================属性查询-土地使用权-start============================================
		//属性查询查询按钮事件绑定
		$("#tdsyqAttrSearchBtn").bind("click", function () {
			//获取土地使用权属性查询用户输入的查询参数
			var param = $(this).parent().prev().serializeArray();
			var searchData = {};
			$.each(param, function () {
				if (this.value != null && this.value.length > 0) {
					searchData[this.name.trim()] = this.value;
				}
			});

			//将参数传入查询方法执行查询
			QueryByProperty(searchData);

		});

		function QueryByProperty(searchData) {

			//新建QueryTask属性查询任务
			QueryTask = new esri.tasks.QueryTask(mapServiceData + "/" + mapServiceLayer);

			//建立支持绘制几何体的功能的工具栏
			ToolBar = new esri.toolbars.Draw(Map)

			//新建QueryTask查询任务的输入类
			query = new esri.tasks.Query();

			//拼接查询语句的方法
			var whereStr = "";
			var whereArr = [];
			for (var key in searchData) {
				whereArr.push(key + " LIKE %'" + searchData[key] + "%'");
			}
			whereArr.push("1=1")
			whereStr = whereArr.join(" AND ");
			//console.log(whereStr);

			//设置query的具体属性
			query.where = whereStr;
			query.outFields = ["*"];
			query.returnGeometry = true;

			//设置查询输出的坐标系
			query.outSpatialReference = map.spatialReference;

			//执行属性查询任务
			QueryTask.execute(query, ShowQueryResult);

			//清空显示图层
			map.graphics.clear();
			tdsyqSearchLayer.clear();
		}

		function ShowQueryResult(queryResult) {
			if (queryResult.features.length >= 1) {

				//设置前端显示数据的数组
				var gridData = new Array();

				//遍历查询的位置结果
				for (var i = 0; i < queryResult.features.length; i++) {

					//得到graphic
					var graphic = queryResult.features[i];

					//给图形赋予符号
					graphic.setSymbol(tdsyqSearchSymbol);

					//添加到地图从而实现高亮效果
					map.graphics.add(graphic);

					tdsyqSearchLayer.add(graphic);

					//获得行政区的名称信息，此处应和所查询的图层的属性表对应
					var OBJECTID = graphic.attributes["OBJECTID"];
					var ZONGDBM = graphic.attributes["ZONGDBM"];
					var TUDZL = graphic.attributes["TUDZL"];


					//需要的数据整理成数组压入前端显示的Array中
					var param = {};
					param['OBJECTID'] = OBJECTID;
					param['ZONGDBM'] = ZONGDBM;
					param['TUDZL'] = TUDZL;

					gridData.push(param);
				}
				try {
					$('#dg').datagrid("load", gridData.slice(0, 20));
					var pager = $("#dg").datagrid("getPager");
					pager.pagination('refresh', {
						total: gridData.length,
						pageNumber: pageNo
					});
					$("body").layout('expand', 'east');
				} catch (err) {
					$('#dg').datagrid({
						rownumbers: true,
						//striped:true,
						fitColumns: true,
						resizable: true,
						//modal:true,
						singleSelect: true,
						pagination: true,
						data: gridData.slice(0, 20),
						fit: true,
						//pageNumber:1,
						pageSize: 20,
						pageList: [10, 20, 30, 40, 50],
						//showFooter:true,
						columns: [[
							{ field: 'ZONGDBM', title: '地籍号', width: 100, resizable: true },
							{ field: 'TUDZL', title: '土地坐落', width: 100, resizable: true },
							{
								field: 'OBJECTID', title: '操作', width: 130,
								formatter: function (value, row, index) {
									return '<div style="height:auto;" class="datagrid-cell datagrid-cell-c1-opt">' +
										'<a href="#" class="ace_button tdsyqDetail" value="' + value + '">  <i class=" fa fa-cog">详情</i></a>&nbsp' +
										'<a href="#" class="ace_button tdsyqLocation" value="' + value + '" style="background-color:#1a7bb9;">  <i class=" fa fa-cog">定位</i></a>' +
										'</div>';
								}

							}
						]],
						//data数据分页无法显示问题
						onLoadSuccess: function (data) {
							$(".datagrid-pager").css("top", "auto");

							//判断按钮是否已经绑定点击事件，如果没有绑定   则绑定点击事件
							//处理的问题为：  高亮显示对应的地图信息在require里面，通过html中的click事件无法访问require中定义的方法
							$("#attrSearchResult").find("a").filter(".tdsyqLocation").bind("click", function () {
								var value = $(this).attr("value");
								tdsyqLocation(value);
							});
							$("#attrSearchResult").find("a").filter(".tdsyqDetail").bind("click", function () {
								var value = $(this).attr("value");
								attrDetail(value);
							});
						}
					});

					//显示土地使用权查询结果grid
					//隐藏所有属性查询结果页
					$("#attrSearchResult").children().hide();

					//显示序号为0的结果页
					$("#attrSearchResult").children().eq(0).show();

					$("body .easyui-layout").layout('expand', 'east');
				}
				var pager = $("#dg").datagrid("getPager");
				pager.pagination({
					total: gridData.length,
					onSelectPage: function (pageNo, pageSize) {
						var start = (pageNo - 1) * pageSize;
						var end = start + pageSize;
						$("#dg").datagrid("loadData", gridData.slice(start, end));
						pager.pagination('refresh', {
							total: gridData.length,
							pageNumber: pageNo
						});
					}
				});

			}
		}
		//============================================属性查询-土地使用权-end============================================
		//============================================空间查询-土地使用权-start============================================
		//空间查询绘图按钮事件绑定
		var tb = new Draw(map);
		tb.on("draw-complete", doQuery);

		$('.searchOp').each(function () {
			$(this).on("click", activateTool);
		});

		// 实例化查询任务类
		queryTask = new esri.tasks.QueryTask(mapServiceData + "/" + mapServiceLayer);

		// 实例化查询参数类
		query = new esri.tasks.Query();
		query.returnGeometry = true;

		// 实例化符号类
		var redColor = new Color([255, 0, 0]);
		var halfFillYellow = new Color([255, 255, 0, 0.5]);
		pointSym = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_DIAMOND, 10,
			new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, redColor, 1),
			halfFillYellow);
		lineSym = new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, redColor, 2);
		polygonSym = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
			new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, redColor, 2),
			halfFillYellow);

		//根据用户点击加载绘图工具的方法
		function activateTool() {
			$(this).addClass("cbangeBg").siblings().removeClass("cbangeBg");
			var tool = null;
			if ($(this).text() == "取消查询") {
				tb.deactivate();
			} else {
				switch ($(this).text()) {
					case "点查询":
						tool = "POINT";
						break;
					case "圆形查询":
						tool = "CIRCLE";
						break;
					case "矩形查询":
						tool = "RECTANGLE";
						break;
					case "多边形查询":
						tool = "POLYGON";
						break;
				}
				tb.activate(Draw[tool]);
				map.hideZoomSlider();
			}
		}

		//执行查询的方法
		function doQuery(evt) {
			query.geometry = evt.geometry;

			query.outFields = ["*"];

			queryTask.execute(query, showResults);

			//查询完成之后取消当前绘图工具的选择
			tb.deactivate();
		}

		function showResults(queryResult) {
			// 清除上一次的高亮显示
			map.graphics.clear();
			tdsyqSearchLayer.clear();

			if (queryResult.features.length >= 1) {

				//设置前端显示数据的数组
				var gridData = new Array();

				//遍历查询的位置结果
				for (var i = 0; i < queryResult.features.length; i++) {

					//得到graphic
					var graphic = queryResult.features[i];

					//给图形赋予符号
					graphic.setSymbol(tdsyqSearchSymbol);

					//添加到地图从而实现高亮效果
					map.graphics.add(graphic);

					tdsyqSearchLayer.add(graphic);

					//获得行政区的名称信息，此处应和所查询的图层的属性表对应
					var OBJECTID = graphic.attributes["OBJECTID"];
					var ZONGDBM = graphic.attributes["ZONGDBM"];
					var TUDZL = graphic.attributes["TUDZL"];

					//需要的数据整理成数组压入前端显示的Array中
					var param = {};
					param['OBJECTID'] = OBJECTID;
					param['ZONGDBM'] = ZONGDBM;
					param['TUDZL'] = TUDZL;

					gridData.push(param);
				}
				try {
					$('#dg').datagrid("load", gridData.slice(0, 20));
					var pager = $("#dg").datagrid("getPager");
					pager.pagination('refresh', {
						total: gridData.length,
						pageNumber: pageNo
					});
					$("body").layout('expand', 'east');
				} catch (err) {
					$('#dg').datagrid({
						rownumbers: true,
						//striped:true,
						fitColumns: true,
						resizable: true,
						singleSelect: true,
						//modal:true,
						pagination: true,
						data: gridData.slice(0, 20),
						fit: true,
						//pageNumber:1,
						pageSize: 20,
						pageList: [10, 20, 30, 40, 50],
						//showFooter:true,
						columns: [[
							{ field: 'ZONGDBM', title: '宗地编码', width: 100, resizable: true },
							{ field: 'TUDZL', title: '土地坐落', width: 100, resizable: true },
							{
								field: 'OBJECTID', title: '操作', width: 130,
								formatter: function (value, row, index) {
									return '<div style="height:auto;" class="datagrid-cell datagrid-cell-c1-opt">' +
										'<a href="#" class="ace_button tdsyqDetail" value="' + value + '">  <i class=" fa fa-cog">详情</i></a>&nbsp' +
										'<a href="#" class="ace_button tdsyqLocation" value="' + value + '" style="background-color:#1a7bb9;">  <i class=" fa fa-cog">定位</i></a>' +
										'</div>';
								}

							}
						]],
						//data数据分页无法显示问题
						onLoadSuccess: function (data) {
							$(".datagrid-pager").css("top", "auto");

							//判断按钮是否已经绑定点击事件，如果没有绑定   则绑定点击事件
							//处理的问题为：  高亮显示对应的地图信息在require里面，通过html中的click事件无法访问require中定义的方法
							$("#attrSearchResult").find("a").filter(".tdsyqLocation").bind("click", function () {
								var value = $(this).attr("value");
								tdsyqLocation(value);
							});
							$("#attrSearchResult").find("a").filter(".tdsyqDetail").bind("click", function () {
								var value = $(this).attr("value");
								attrDetail(value);
							});
						}
					});

					//显示土地使用权查询结果grid
					//隐藏所有属性查询结果页
					$("#attrSearchResult").children().hide();

					//显示序号为0的结果页
					$("#attrSearchResult").children().eq(0).show();

					$("body .easyui-layout").layout('expand', 'east');
				}
				var pager = $("#dg").datagrid("getPager");
				pager.pagination({
					total: gridData.length,
					onSelectPage: function (pageNo, pageSize) {
						var start = (pageNo - 1) * pageSize;
						var end = start + pageSize;
						$("#dg").datagrid("loadData", gridData.slice(start, end));
						pager.pagination('refresh', {
							total: gridData.length,
							pageNumber: pageNo
						});
					}
				});

			}
		}
		//============================================空间查询-土地使用权-end============================================

		//============================================公共查询方法-土地使用权-start============================================
		//展示查询结果单条记录的详情
		function attrDetail(objectid) {

			//设置查询参数
			var findParams = new FindParameters();

			findParams.returnGeometry = true;
			findParams.layerIds = [mapServiceLayer];
			findParams.searchFields = ["OBJECTID"];
			findParams.searchText = objectid;

			//设置查询结果的输出坐标系
			findParams.outSpatialReference = map.spatialReference;

			//实例化查询对象
			var findTask = new FindTask(mapServiceData);

			//进行查询
			findTask.execute(findParams, showZjdFindAttr);
		}

		function showZjdFindAttr(queryResult) {
			//console.log(queryResult);
			for (var i = 0; i < queryResult.length; i++) {
				//获得该图形的属性信息
				var attributes = queryResult[i].feature.attributes;
				//console.log(attributes);

				//将需要展示的参数写入attributesMap中，key表示显示的字段名称，value表示显示的字段内容
				var attributesMap = createjsMap();
				attributesMap.set("要素代码", attributes.要素代码);
				attributesMap.set("区县名称", attributes.区县名称);
				attributesMap.set("宗地编码", attributes.宗地编码);
				attributesMap.set("地籍号", attributes.地籍号);
				attributesMap.set("土地座落", attributes.土地座落);
				attributesMap.set("地类编码比率", attributes.地类编码比率);
				attributesMap.set("上界高程", attributes.上界高程);
				attributesMap.set("下界高程", attributes.下界高程);
				attributesMap.set("不动产单元号", attributes.不动产单元号);
				attributesMap.set("发证面积", attributes.发证面积);
				attributesMap.set("权利性质", attributes.权利性质);
				attributesMap.set("权属性质", attributes.权属性质);
				attributesMap.set("使用权人", attributes.使用权人);
				attributesMap.set("使用权类型", attributes.使用权类型);
				attributesMap.set("采集人员", attributes.采集人员);
				attributesMap.set("采集时间", attributes.采集时间);
				attributesMap.set("更新方式", attributes.更新方式);
				attributesMap.set("发证情况", attributes.发证情况);
				attributesMap.set("出租情况", attributes.出租情况);
				attributesMap.set("抵押情况", attributes.抵押情况);
				attributesMap.set("查封情况", attributes.查封情况);
				attributesMap.set("异议情况", attributes.异议情况);
				attributesMap.set("其他情况", attributes.其他情况);
				attributesMap.set("变化情况", attributes.变化情况);
				attributesMap.set("预告情况", attributes.预告情况);
				attributesMap.set("建筑总面积", attributes.建筑总面积);
				attributesMap.set("建基面积", attributes.建基面积);
				attributesMap.set("规划建基面积", attributes.规划建基面积);
				attributesMap.set("规划建筑面积", attributes.规划建筑面积);
				attributesMap.set("面积单位", attributes.面积单位);
				attributesMap.set("建筑密度", attributes.建筑密度);
				attributesMap.set("案卷编号", attributes.案卷编号);
				attributesMap.set("宗地号", attributes.宗地号);
				attributesMap.set("宗地性质", attributes.宗地性质);
				attributesMap.set("宗地特征码", attributes.宗地特征码);
				attributesMap.set("宗地价格", attributes.宗地价格);
				attributesMap.set("宗地状态", attributes.宗地状态);
				attributesMap.set("更新时间", attributes.更新时间);
				attributesMap.set("土地等级", attributes.土地等级);
				attributesMap.set("土地用途", attributes.土地用途);
				attributesMap.set("规划用途", attributes.规划用途);
				attributesMap.set("权利类型", attributes.权利类型);
				attributesMap.set("权利设定方式", attributes.权利设定方式);
				attributesMap.set("区域标志", attributes.区域标志);
				attributesMap.set("地类终止日期", attributes.地类终止日期);
				attributesMap.set("容积率", attributes.容积率);
				attributesMap.set("建筑限高", attributes.建筑限高);

				//索引计数器
				var mapindex = 0;

				var htmlsbody = '';

				//遍历Map拼装显示格式
				attributesMap.forEach(function (value, key) {

					if (mapindex % 2 === 0 && mapindex != attributesMap.size - 1) {
						htmlsbody += '<tr><td align="right" style="width:105px;background:#f2f7fe;"><label class="Validform_label">' + key + '<label></td><td class="value">' + value + '</td>'
					} else if (mapindex % 2 === 1) {
						htmlsbody += '<td align="right" style="width:105px;background:#f2f7fe;"><label class="Validform_label">' + key + '<label></td><td class="value">' + value + '</td></tr>';
					} else if (attributesMap.size % 2 === 1 && mapindex === attributesMap.size - 1) {
						htmlsbody += '<tr><td align="right" style="width:105px;background:#f2f7fe;"><label class="Validform_label">' + key + '<label></td><td class="value">' + value + '</td></tr>';
					}
					mapindex++;
				});

				var htmlshead = '<table style="width: 100%;table-layout: fixed;word-wrap:break-word; word-break:break-all;" cellpadding="4" cellspacing="0" bordercolor="#95b8e7" border="1" class="formtable">';
				var htmlsend = '</table>';

				//拼装首尾table标签
				var htmls = htmlshead + htmlsbody + htmlsend;
				//console.log(htmls);

				$("#attrDia").window({
					title: '土地使用权详细信息',
					width: 900,
					height: 470,
					content: htmls
				});
			}
		}


		//根据标识码查询位置并居中显示
		function tdsyqLocation(objectid) {
			//空间查询条件
			var findParams = new FindParameters();

			findParams.returnGeometry = true;
			findParams.layerIds = [mapServiceLayer];
			findParams.searchFields = ["OBJECTID"];
			findParams.searchText = objectid;

			//设置查询结果的输出坐标系
			findParams.outSpatialReference = map.spatialReference;

			//实例化查询对象
			var findTask = new FindTask(mapServiceData);

			//进行查询
			findTask.execute(findParams, showZjdFindResult);
		}

		//对查询结果进行处理以进行位置的定位
		function showZjdFindResult(queryResult) {

			//如果当前map没有高亮图层，就添加土地使用权的高亮图层
			if (!map.getLayer("tdsyqSearchLayer")) {
				map.addLayer(tdsyqSearchLayer);
			}

			//在绘制高亮图层前先清空当前的土地使用权高亮图层
			tdsyqSearchLayer.clear();

			//如果查询结果为空，就提示并return结束当前函数
			if (queryResult.length == 0) {
				tip("没有该元素");
				return;
			}

			//map.graphics.removeAll();
			var features = new Array();
			for (var i = 0; i < queryResult.length; i++) {
				//获得该图形的形状
				var feature = queryResult[i].feature;
				features.push(feature);
				var geometry = feature.geometry;

				//创建客户端图形
				var graphic = new Graphic(geometry, tdsyqSearchSymbol);
				tdsyqSearchLayer.add(graphic);
			}
			//居中
			getFeatureSetExtent(features);
		}

		//将查询结果居中的方法
		function getFeatureSetExtent(features) {
			var resultUnionExtent;
			var multipoint = new esri.geometry.Multipoint();
			if (features.length == 1) {
				centerShowGraphic(features[0]);
			} else {
				for (var i = 1; i < features.length; i++) {
					var graphic = features[i];
					if (graphic.geometry.type == "point") {
						multipoint.addPoint(graphic.geometry);
					} else {
						if (resultUnionExtent == null) {
							resultUnionExtent = graphic.geometry.getExtent();
						} else {
							resultUnionExtent = resultUnionExtent.union(graphic.geometry.getExtent());
						}
					}
				}
				if (multipoint.points.length > 0) {
					if (resultUnionExtent == null) {
						resultUnionExtent = multipoint.getExtent();
					} else {
						resultUnionExtent = resultUnionExtent
							.union(multipoint.getExtent());
					}
				}
			}
		}

		//单个图形居中的方法
		function centerShowGraphic(graphic) {
			switch (graphic.geometry.type) {
				case "point":
					map.centerAndZoom(graphic.geometry, map.getLevel() + 1);
					break;
				case "polyline":
					var line = graphic.geometry.getExtent();
					map.setExtent(line.expand(1.5));
					break;
				case "polygon":
					var ext = graphic.geometry.getExtent();
					map.setExtent(ext.expand(1.5));
					break;
			}
		}

		//============================================公共查询方法-土地使用权-end============================================

	});


//===============================================公共js方法-土地使用权-start===============================================
//清空属性查询输入框
function clearForm(obj) {
	$(obj).parent().prev().find("input").val("");
}

//创建一个js中的Map对象
function createjsMap() {
	var mymap = new Map();
	return mymap;
}
//===============================================公共js方法-土地使用权-end===============================================