/**
 * util for BMap
 */
import {addEvent} from './Util.js'

let BPt = BMap.Point

const DEFAULT_FEATURE_NAME = 'tmp'

let featureOption = {
    name: DEFAULT_FEATURE_NAME,
    prop: {},
    styleMap: {},
    renderer: 'svg'
}

/**
 * 静态方法，数组 to Point
 * @param  {Array}  [lon,lat]    
 * @return {Marker} 
 */
BMap.Point.fromArray = function(lonlat) {
    return new BMap.Point(...lonlat)
}

BMap.Map.prototype.setCenter2 = function(lonlat, zoom) {
    let point
    if (Array.isArray(lonlat)) {
        point = new BMap.Point(...lonlat)
    } else {
        point = lonlat
    }
    if (!zoom) {
        zoom = this.getZoom()
    }
    this.setCenter(point, zoom)
}
/**
 * 在地图上绘制一个点(market)
 * @param  {Array}  [lon,lat]    
 * @return {Marker} 
 */
BMap.Map.prototype.addPoint = function(lonlat) {
    let point = new BMap.Point(...lonlat);
    let mark = new BMap.Marker(point)
    this.addOverlay(mark)
    let self = this
    mark.addEventListener('dblclick', function (e) {
        self.removeOverlay(this)
    });
    return mark
};
/**
 * 在地图上绘制一个临时点(market)
 * @param  {Array}  [lon,lat]    
 * @return {Marker} 
 */
BMap.Map.prototype.addTmpPoint = function(lonlat) {
    let point = new BMap.Point(...lonlat);
    if (this.tmpMk) {
        this.tmpMk.setPosition(point);
    } else {
        this.tmpMk = this.addPoint(lonlat);
    }
    return this.tmpMk
};

BMap.Map.prototype.layers = {};

let styleMap = {
    polyline: {
        strokeColor: "red",
        strokeWeight: 4, 
        strokeOpacity: 0.5
    },
    polygon: {
        strokeColor: "blue",
        fillColor: "blue",
        strokeWeight: 2, 
        fillOpacity: 0.8
    },
    point: {},
}

/**
 * add polygon feature
 * @param  {array} coordinates [[[lon,lat],[lon,lat]]]
 * @param  {object} option
 * @return {BMap.Polygon}             
 */
BMap.Map.prototype.polygon = function(coordinates, option = featureOption) {
    let points = coordinates[0].map(k => {
        return new BMap.Point(...k) 
    });
    let optionStyle = option.styleMap;
    if (option.styleMap.polygon) {
        optionStyle = option.styleMap.polygon
    }
    let style = {
        ...styleMap.polygon,
        ...optionStyle
    }
    let polygon = new BMap.Polygon(points, style);
    this.addOverlay(polygon);
    let {name, prop} = option;
    polygon.prop = prop;
    polygon.addToLayer(option);
    addEvent(polygon, option)

    return polygon;
}

/**
 * add polyline feature
 * @param  {array} coordinates [[lon,lat], [lon,lat]]
 * @param  {object} option
 * @return {BMap.Polyline}             
 */
BMap.Map.prototype.polyline = function(coordinates, option = featureOption) {
    let points = coordinates.map(k => {
        return new BMap.Point(...k) 
    })
    let optionStyle = option.styleMap;
    if (option.styleMap.polyline) {
        optionStyle = option.styleMap.polyline
    }
    let style = {
        ...styleMap.polyline,
        ...optionStyle
    }
    let polyline = new BMap.Polyline(points, style);
    this.addOverlay(polyline);

    let {name, prop} = option;
    polyline.prop = prop;
    polyline.addToLayer(option);
    addEvent(polyline, option);

    return polyline;
}

/**
 * add point feature
 * @param  {array} coordinates [lon,lat]
 * @param  {object} option
 * @return {BMap.Marker}             
 */
BMap.Map.prototype.point = function(coordinates, option = featureOption) {
    let point = new BMap.Point(...coordinates);
    let optionStyle = option.styleMap;
    if (option.styleMap.point) {
        optionStyle = option.styleMap.point
    }
    let style = {
        ...styleMap.point,
        ...optionStyle
    }
    let marker = new BMap.Marker(point, style);
    this.addOverlay(marker);

    let {name, alias, prop} = option;
    marker.prop = prop;
    marker.addToLayer(option);
    addEvent(marker, option);

    return marker;
}

/**
 * add circle feature
 * @param  {array} coordinates [lon,lat]
 * @param  {object} option
 * @return {BMap.Overlay}             
 */
BMap.Map.prototype.circle = function(coordinates, option = featureOption) {
    let point = new BMap.Point(...coordinates);
    let optionStyle = option.styleMap;
    if (option.styleMap.circle) {
        optionStyle = option.styleMap.circle
    }
    let style = {
        ...styleMap.polygon,
        ...optionStyle,
    }
    let {name, prop, radius} = option;

    var overlay = new BMap.Circle(point, radius, style);
    this.addOverlay(overlay);

    overlay.prop = prop;
    overlay.addToLayer(option);
    addEvent(overlay, option);

    return overlay;
}

/**
 * add point feature
 * @param  {object} coordinates geojson.feature
 * @param  {object} option
 * @return {BMap.Overlay}             
 */
BMap.Map.prototype.addFeature = function(feature, option = featureOption) {
    let geom = feature.geometry;
    let type = geom.type;
    let {name} = option;
    let coordinates = geom.coordinates;
    let overlay;
    if (type === 'Polygon') {
        overlay = this.polygon(coordinates, option)
    }
    if (type === 'LineString') {
        overlay = this.polyline(coordinates, option)
    }
    if (type === 'Point') {
        overlay = this.point(coordinates, option)
    }
    return overlay;
}

/**
 * add geojson feature
 * @param  {FeatureCollection|Feature|Geometry|[Feature]} geojson 
 * @param  {object} option
 * @return {BMap.Overlay}             
 */
BMap.Map.prototype.geoJSON = function(geojson, option = featureOption) {
    try {
        let {name, render} = option;
        if (render === 'mapv') {
            
            let layer = this.layers[name];
            let renderer;
            
            if (layer) {
                renderer = layer.render;
                renderer.update(geojson);
            } else {
                renderer = new BMap.RenderMapV(this, geojson, option);
            }
            
            return renderer.overlays;
        } else {
            let features = (typeof(geojson) !== 'object') 
                ? JSON.parse(geojson) : geojson;
            let overlay;
            if (features.type === 'FeatureCollection') {
                overlay = [];
                features.features.forEach(k => {
                    overlay.push(this.addFeature(k, option))
                })
            }
            if (Array.isArray(features)) {
                overlay = [];
                features.forEach(k => {
                    overlay.push(this.addFeature(k, option))
                })
            }

            if (features.type === 'Feature') {
                overlay = this.addFeature(features, option)    
            }
            if (features.type === 'Polygon') {
                overlay = this.polygon(features.coordinates, option)
            }
            if (features.type === 'LineString') {
                overlay = this.polyline(features.coordinates, option)
            }
            if (features.type === 'Point') {
                overlay = this.point(features.coordinates, option)
            }
            return overlay
        }


    } catch (error) {
        console.log(error);
        return null;
    }
}


/**
 * get map bound min and max lonlat
 * @return {object}
 */
BMap.Map.prototype.getMbr = function() {
    let bound = this.getBounds()
    let {lng: xmin, lat: ymin} = bound.getSouthWest();
    let {lng: xmax, lat: ymax} = bound.getNorthEast();

    return {
        xmin,
        xmax,
        ymin,
        ymax,
    }
}

export default {};