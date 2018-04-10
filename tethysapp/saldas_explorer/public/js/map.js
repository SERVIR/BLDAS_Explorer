/*****************************************************************************
 * FILE:    MAP JS
 * DATE:    5 APRIL 2018
 * AUTHOR: Sarva Pulla
 * COPYRIGHT: (c) ICIMOD 2018
 * LICENSE: BSD 2-Clause
 *****************************************************************************/

/*****************************************************************************
 *                      LIBRARY WRAPPER
 *****************************************************************************/

var LIBRARY_OBJECT = (function() {
    // Wrap the library in a package function
    "use strict"; // And enable strict mode for this library

    /************************************************************************
     *                      MODULE LEVEL / GLOBAL VARIABLES
     *************************************************************************/
    var current_layer,
        dekad_options,
        element,
        $interactionModal,
        layers,
        map,
        month_options,
        popup,
        $plotModal,
        public_interface,			// Object returned by the module
        variable_data,
        $tsplotModal,
        wms_workspace,
        wms_url,
        wms_layer,
        wms_source;



    /************************************************************************
     *                    PRIVATE FUNCTION DECLARATIONS
     *************************************************************************/
    var add_wms,
        clear_coords,
        get_plot,
        get_styling,
        gen_color_bar,
        gen_slider,
        init_events,
        init_jquery_vars,
        init_dropdown,
        init_all,
        init_map;


    /************************************************************************
     *                    PRIVATE FUNCTION IMPLEMENTATIONS
     *************************************************************************/

    clear_coords = function(){
        $("#poly-lat-lon").val('');
        $("#point-lat-lon").val('');
    };

    init_jquery_vars = function(){
        var $meta_element = $("#metadata");
        dekad_options = $meta_element.attr('data-dekad-options');
        dekad_options = JSON.parse(dekad_options);
        month_options = $meta_element.attr('data-month-options');
        month_options = JSON.parse(month_options);
        $plotModal = $("#plot-modal");
        $tsplotModal = $("#ts-plot-modal");
    };

    init_dropdown = function () {
        $(".var_table").select2();
        $(".year_table").select2();
        $(".interval_table").select2();
        $(".date_table").select2();
        $(".variable_table_plot").select2();
    };

    init_map = function() {
        var projection = ol.proj.get('EPSG:3857');
        var baseLayer = new ol.layer.Tile({
            source: new ol.source.BingMaps({
                key: '5TC0yID7CYaqv3nVQLKe~xWVt4aXWMJq2Ed72cO4xsA~ApdeyQwHyH_btMjQS1NJ7OHKY8BK-W-EMQMrIavoQUMYXeZIQOUURnKGBOC7UCt4',
                imagerySet: 'AerialWithLabels' // Options 'Aerial', 'AerialWithLabels', 'Road'
            })
        });
        var fullScreenControl = new ol.control.FullScreen();
        var view = new ol.View({
            center: ol.proj.transform([90.3,23.6], 'EPSG:4326','EPSG:3857'),
            projection: projection,
            zoom: 7
        });
        wms_source = new ol.source.ImageWMS();

        wms_layer = new ol.layer.Image({
            source: wms_source
        });

        var vector_source = new ol.source.Vector({
            wrapX: false
        });

        var vector_layer = new ol.layer.Vector({
            name: 'my_vectorlayer',
            source: vector_source,
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 255, 0.2)'
                }),
                stroke: new ol.style.Stroke({
                    color: '#ffcc33',
                    width: 2
                }),
                image: new ol.style.Circle({
                    radius: 7,
                    fill: new ol.style.Fill({
                        color: '#ffcc33'
                    })
                })
            })
        });


        layers = [baseLayer,wms_layer,vector_layer];

        map = new ol.Map({
            target: document.getElementById("map"),
            layers: layers,
            view: view
        });


        map.crossOrigin = 'anonymous';
        element = document.getElementById('popup');

        popup = new ol.Overlay({
            element: element,
            positioning: 'bottom-center',
            stopEvent: true
        });

        map.addOverlay(popup);

        //Code for adding interaction for drawing on the map
        var lastFeature, draw, featureType;

        //Clear the last feature before adding a new feature to the map
        var removeLastFeature = function () {
            if (lastFeature) vector_source.removeFeature(lastFeature);
        };

        //Add interaction to the map based on the selected interaction type
        var addInteraction = function (geomtype) {
            var typeSelect = document.getElementById('interaction-type');
            var value = typeSelect.value;
            $('#data').val('');
            if (value !== 'None') {
                if (draw)
                    map.removeInteraction(draw);

                draw = new ol.interaction.Draw({
                    source: vector_source,
                    type: geomtype
                });


                map.addInteraction(draw);
            }
            if (featureType === 'Point' || featureType === 'Polygon') {

                draw.on('drawend', function (e) {
                    lastFeature = e.feature;

                });

                draw.on('drawstart', function (e) {
                    vector_source.clear();
                });

            }

        };

        vector_layer.getSource().on('addfeature', function(event){
            //Extracting the point/polygon values from the drawn feature
            var feature_json = saveData();
            var parsed_feature = JSON.parse(feature_json);
            var feature_type = parsed_feature["features"][0]["geometry"]["type"];
            if (feature_type == 'Point'){
                $plotModal.find('.info').html('');
                var coords = parsed_feature["features"][0]["geometry"]["coordinates"];
                var proj_coords = ol.proj.transform(coords, 'EPSG:3857','EPSG:4326');
                $("#point-lat-lon").val(proj_coords);
                $plotModal.find('.info').html('<b>You have selected a point at '+proj_coords[1].toFixed(2)+','+proj_coords[0].toFixed(2)+'. Click on Show plot to view the Time series.</b>');
                $plotModal.modal('show');
            } else if (feature_type == 'Polygon'){
                $plotModal.find('.info').html('');
                var coords = parsed_feature["features"][0]["geometry"]["coordinates"][0];
                proj_coords = [];
                coords.forEach(function (coord) {
                    var transformed = ol.proj.transform(coord,'EPSG:3857','EPSG:4326');
                    proj_coords.push('['+transformed+']');
                });
                var json_object = '{"type":"Polygon","coordinates":[['+proj_coords+']]}';
                $("#poly-lat-lon").val(json_object);
                $plotModal.find('.info').html('<b>You have selected the following polygon object '+proj_coords+'. Click on Show plot to view the Time series.</b>');
                $plotModal.modal('show');
            }
        });

        function saveData() {
            // get the format the user has chosen
            var data_type = 'GeoJSON',
                // define a format the data shall be converted to
                format = new ol.format[data_type](),
                // this will be the data in the chosen format
                data;
            try {
                // convert the data of the vector_layer into the chosen format
                data = format.writeFeatures(vector_layer.getSource().getFeatures());
            } catch (e) {
                // at time of creation there is an error in the GPX format (18.7.2014)
                $('#data').val(e.name + ": " + e.message);
                return;
            }
            // $('#data').val(JSON.stringify(data, null, 4));
            return data;

        }


        $('#interaction-type').change(function (e) {
            featureType = $(this).find('option:selected').val();
            if(featureType == 'None'){
                $('#data').val('');
                clear_coords();
                map.removeInteraction(draw);
                vector_layer.getSource().clear();
            }else if(featureType == 'Point')
            {
                clear_coords();
                addInteraction(featureType);
            }else if(featureType == 'Polygon'){
                clear_coords();
                addInteraction(featureType);
            }
        }).change();

    };

    init_events = function(){
        (function () {
            var target, observer, config;
            // select the target node
            target = $('#app-content-wrapper')[0];

            observer = new MutationObserver(function () {
                window.setTimeout(function () {
                    map.updateSize();
                }, 350);
            });
            $(window).on('resize', function () {
                map.updateSize();
            });

            config = {attributes: true};

            observer.observe(target, config);
        }());

        map.on("singleclick",function(evt){
             $(element).popover('destroy');


            if ($("#interaction-type").find('option:selected').val()=="None") {
                var clickCoord = evt.coordinate;
                popup.setPosition(clickCoord);
                var view = map.getView();
                var viewResolution = view.getResolution();

                var wms_url = current_layer.getSource().getGetFeatureInfoUrl(evt.coordinate, viewResolution, view.getProjection(), {'INFO_FORMAT': 'application/json'}); //Get the wms url for the clicked point

                if (wms_url) {
                    //Retrieving the details for clicked point via the url
                    $.ajax({
                        type: "GET",
                        url: wms_url,
                        dataType: 'json',
                        success: function (result) {
                            var value = parseFloat(result["features"][0]["properties"]["GRAY_INDEX"]);
                            value = value.toFixed(2);
                            $(element).popover({
                                'placement': 'top',
                                'html': true,
                                //Dynamically Generating the popup content
                                'content':'Value: '+value
                            });

                            $(element).popover('show');
                            $(element).next().css('cursor', 'text');


                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
                            console.log(Error);
                        }
                    });
                }
                }
        });

        map.on('pointermove', function(evt) {
            if (evt.dragging) {
                return;
            }
            var pixel = map.getEventPixel(evt.originalEvent);
            var hit = map.forEachLayerAtPixel(pixel, function(layer) {
                if (layer != layers[0] && layer != layers[2]){
                    current_layer = layer;
                    return true;}
            });
            map.getTargetElement().style.cursor = hit ? 'pointer' : '';
        });


    };

    init_all = function(){
        init_jquery_vars();
        init_dropdown();
        init_map();
        init_events();
    };

    gen_color_bar = function(colors,scale){
        var cv  = document.getElementById('cv'),
            ctx = cv.getContext('2d');
        ctx.clearRect(0,0,cv.width,cv.height);
        colors.forEach(function(color,i){
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.fillRect(i*15,0,15,20);
            ctx.fillText(scale[i].toFixed(),i*15,30);
        });

    };

    get_styling = function(variable,min,max,scale){

        //var index = variable_data.findIndex(function(x){return variable.includes(x["id"])});
        var index = find_var_index(variable,variable_data);
        var start = variable_data[index]["start"];
        var end = variable_data[index]["end"];

        var sld_color_string = '';
        if(scale[scale.length-1] == 0){
            var colors = chroma.scale([start,start]).mode('lab').correctLightness().colors(20);
            gen_color_bar(colors,scale);
            var color_map_entry = '<ColorMapEntry color="'+colors[0]+'" quantity="'+scale[0]+'" label="label1" opacity="0.7"/>';
            sld_color_string += color_map_entry;
        }else{
            var colors = chroma.scale([start,end]).mode('lab').correctLightness().colors(20);
            gen_color_bar(colors,scale);
            colors.forEach(function(color,i){
                var color_map_entry = '<ColorMapEntry color="'+color+'" quantity="'+scale[i]+'" label="label'+i+'" opacity="0.7"/>';
                sld_color_string += color_map_entry;
            });
        }

        return sld_color_string
    };


    add_wms = function(workspace,variable,year,date_type,interval_type){

        map.removeLayer(wms_layer);
        var layer_name = workspace+":"+variable+"_"+year+date_type;
        //var layer_name = 'graceglobal:2015_07_15'
        console.log(layer_name);
        //var styling = get_styling(data.variable,data.min,data.max,data.scale);
        // var sld_string = '<StyledLayerDescriptor version="1.0.0"><NamedLayer><Name>'+layer_name+'</Name><UserStyle><FeatureTypeStyle><Rule>\
          //  <RasterSymbolizer> \
            //<ColorMap> \
            //<ColorMapEntry color="#2471a3" quantity="-9999" label="nodata" opacity="0.7" />\
             //   <ColorMapEntry color="#2471a3" quantity="-40" label="1" opacity="0.7" />\
             //   <ColorMapEntry color="#2e86c1" quantity="-30" label="1" opacity="0.7" />\
              //  <ColorMapEntry color="#3498db" quantity="-20" label="1" opacity="0.7" />\
               // <ColorMapEntry color="#5dade2" quantity="-10" label="1" opacity="0.7" />\
                //<ColorMapEntry color="#85c1e9" quantity="-5" label="1" opacity="0.7" />\
                //<ColorMapEntry color="#a3e4d7" quantity="0" label="1" opacity="0.7" />\
                //<ColorMapEntry color="#d5f5e3" quantity="5" label="1" opacity="0.7" />\
                //<ColorMapEntry color="#f9e79f" quantity="10" label="1" opacity="0.7" />\
                //<ColorMapEntry color="#f4d03f" quantity="15" label="1" opacity="0.7" />\
                //<ColorMapEntry color="#f5b041" quantity="20" label="1" opacity="0.7" />\
                //<ColorMapEntry color="#eb984e" quantity="25" label="1" opacity="0.7" />\
                //<ColorMapEntry color="#e57e22" quantity="30" label="1" opacity="0.7" /></ColorMap>\
            //</RasterSymbolizer>\
            //</Rule>\
            //</FeatureTypeStyle>\
            //</UserStyle>\
            //</NamedLayer>\
            //</StyledLayerDescriptor>';
        //'SLD_BODY':sld_string
        wms_source = new ol.source.ImageWMS({
            url: 'http://192.168.10.75:8181/geoserver/wms',
            params: {'LAYERS':layer_name},
            serverType: 'geoserver',
            crossOrigin: 'Anonymous'
        });

        wms_layer = new ol.layer.Image({
            source: wms_source
        });

        map.addLayer(wms_layer);

        //var layer_extent = [11.3,-26.75,58.9,14.0];
        //var transformed_extent = ol.proj.transformExtent(layer_extent,'EPSG:4326','EPSG:3857');
        //map.getView().fit(transformed_extent,map.getSize());
        map.updateSize();

    };

    gen_slider = function(interval){
        if(interval == 'DD'){

        $("#slider").slider({
            value:1,
            min: 0,
            max: dekad_options.length - 1,
            step: 1, //Assigning the slider step based on the depths that were retrieved in the controller
            animate:"fast",
            slide: function( event, ui ) {
            }

        });

        }else if(interval == 'MM'){

            $( "#slider").slider({
            value:1,
            min: 0,
            max: month_options.length - 1,
            step: 1, //Assigning the slider step based on the depths that were retrieved in the controller
            animate:"fast",
            slide: function( event, ui ) {
            }

            });
        }
    };

    get_plot = function(){
    $plotModal.modal('hide');
    $tsplotModal.modal('show');
        var variable = $("#variable_table_plot option:selected").val();
        var point = $("#point-lat-lon").val();
        var polygon = $("#poly-lat-lon").val();
        var xhr = ajax_update_database("get-plot",{"variable":variable,"point":point,"polygon":polygon});
         xhr.done(function(data) {
                if("success" in data) {
                console.log(data.time_series);

                    if(data.interaction == "point" || data.interaction == "polygon"){

                    $("#plotter").highcharts({
                        chart: {
                            type:'area',
                            zoomType: 'x'
                        },
                        title: {
                            text:'Test'
                            // style: {
                            //     fontSize: '13px',
                            //     fontWeight: 'bold'
                            // }
                        },
                        xAxis: {
                            type: 'datetime',
                            labels: {
                                format: '{value:%d %b %Y}'
                                // rotation: 90,
                                // align: 'left'
                            },
                            title: {
                                text: 'Date'
                            }
                        },
                        yAxis: {
                            title: {
                                text: 'Units'
                            }

                        },
                        exporting: {
                            enabled: true
                        },
                        series: [{
                            data:data.time_series,
                            name: 'Test'
                        }]
                    });

                }
                }
        });
    };

    $("#btn-get-plot").click(get_plot);

    /************************************************************************
     *                        DEFINE PUBLIC INTERFACE
     *************************************************************************/

    public_interface = {

    };

    /************************************************************************
     *                  INITIALIZATION / CONSTRUCTOR
     *************************************************************************/

    // Initialization: jQuery function that gets called when
    // the DOM tree finishes loading
    $(function() {
        init_all();

        $("#var_table").change(function(){

        });

        $("#interval_table").change(function(){
            var interval_type = ($("#interval_table option:selected").val());
            gen_slider(interval_type);
            $("#date_table").html('');

            if(interval_type == 'DD'){

                dekad_options.forEach(function(date,i){
                        var new_option = new Option(date[1],date[0]);
                        if(i==0){
                            $("#date_table").append(new_option).trigger('change');
                        }else{
                            $("#date_table").append(new_option);
                        }
                    });
            }else if(interval_type == 'MM'){

            month_options.forEach(function(date,i){
                        var new_option = new Option(date[1],date[0]);
                        if(i==0){
                            $("#date_table").append(new_option).trigger('change');
                        }else{
                            $("#date_table").append(new_option);
                        }
                    });
            }
        }).change();

        $("#date_table").change(function(){
            var interval_type = ($("#interval_table option:selected").val());
            var date_type = ($("#date_table option:selected").val());
            var year = ($("#year_table option:selected").val());
            var variable = ($("#var_table option:selected").val());
            console.log(variable,year,date_type,interval_type);
            var workspace = "saldas"+interval_type;
            add_wms(workspace,variable,year,date_type,interval_type);

        }).change();

    });

    return public_interface;

}()); // End of package wrapper
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper
// function immediately after being parsed.