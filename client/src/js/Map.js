// this is the Map component for React!
// import some dependencies
var React = require('react');
var ReactDOM = require('react-dom');
var Modal = require('react-modal');
var L = require('leaflet');

var NoDataModal = require('./NoDataModal');

// a local variable to store our instance of L.map
var map;
var legend;
var info;
var geojsonLayer;
var theZoom;

// here's the actual component
var Map = React.createClass({

  getInitialState: function() {
    // TODO: if we wanted an initial "state" for our map component we could add it here
    return {
      modalIsOpen: false,
      allCrimes: [],
      senateCrimes: [],
      houseCrimes: []
    };
  },

  componentDidMount: function() {
    // code to run just after adding the map to the DOM
    // instantiate the Leaflet map object
    this.createMap(this.getID());
  },

  // After App loads jsons, they are passed to Map as props; then we can run functions based upon those loaded props
  componentWillReceiveProps: function(newProps) {
    this.totalCrimesPerDistrict(newProps);
  },

  componentWillUnmount: function() {
    // code to run just before removing the map
  },

  componentDidUpdate: function() {
    this.addGeoJSON(this.props.chamber);
    this.addInfoToMap();
    this.addLegendToMap(this.props.chamber);
    this.addZoomToMap();
  },

  // Adds a geojson overlay to map; default is Senate
  addGeoJSON: function(chamber) {

    // remove layers without using states
    if (geojsonLayer) {
      geojsonLayer.clearLayers();
    }

    //return map to center
    this.zoomToCenter();

    //pick new layer
    var data;
    switch (chamber) {
      case 'house':
        data = this.props.house;
        break;
      case 'senate':
        data = this.props.senate;
        break;
    }

    // add new layer
    geojsonLayer = L
      .geoJson(data, {
        onEachFeature: this.onEachFeature,
        style: this.style.bind(null, chamber)
      })
      .addTo(map);
  },

  // style object for Leaflet map
  style: function (chamber, feature) {
    if (!this.state.allCrimes["district"+feature.properties.objectid]) {
      feature.isEmpty = true;
      return {
        "fillColor": "#707070",
        "color": "#ffffff",
        "opacity": 1,
        "weight": 1,
        "fillOpacity": 0.7
      };
    }
    var districtCrimes = this.state.allCrimes["district"+feature.properties.objectid].total;
    feature.isEmpty = false;
    return {
      "fillColor": this.getColor(chamber, districtCrimes),
      "color": "#ffffff",
      "opacity": 1,
      "weight": 1,
      "fillOpacity": 0.7
    };
  },

  getColor: function (chamber, districtCrimes) {
    return  districtCrimes > this.props.config.crimeLevels[chamber].level6  ? this.props.config.colors[chamber].level6 :
            districtCrimes > this.props.config.crimeLevels[chamber].level5  ? this.props.config.colors[chamber].level5 :
            districtCrimes > this.props.config.crimeLevels[chamber].level4   ? this.props.config.colors[chamber].level4 :
            districtCrimes > this.props.config.crimeLevels[chamber].level3   ? this.props.config.colors[chamber].level3 :
            districtCrimes > this.props.config.crimeLevels[chamber].level2   ? this.props.config.colors[chamber].level2 :
            districtCrimes > this.props.config.crimeLevels[chamber].level1     ? this.props.config.colors[chamber].level1 :
                                                          '#707070';
  },

  totalCrimesPerDistrict: function (newProps) {

    var allCrimes;
    switch (newProps.chamber) {
      case 'house':
        allCrimes = newProps.houseCrimes;
        break;
      case 'senate':
        allCrimes = newProps.senateCrimes;
        break;
    }
    var initialValue = {};

    var reducer = function(newObj, crimeGlob) {
      // total crimes
      if (!newObj["district"+crimeGlob.district]) {
        newObj["district"+crimeGlob.district] = {
          total: parseInt(crimeGlob.count)
        };
      } else {
        newObj["district"+crimeGlob.district].total += parseInt(crimeGlob.count);
      }
      return newObj;
    };
    var result = allCrimes.reduce(reducer, initialValue);


    this.setState({
      allCrimes: result
    });
  },

  // Leaflet Control object - District Information
  addInfoToMap: function () {
    if (this.props.districtData){
      // remove the data from the geojson layer
      if (info){
        map.removeControl(info);
      }

      var districtInfo = this.getDistrictInfo(this.props.districtNumber);
      var _this = this;
      // Top right info panel
      info = this.info = L.control();
      info.onAdd = function (map) {
          this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
          this.update();
          return this._div;
      };
      // method that we will use to update the control based on feature properties passed
      info.update = function (props) {
          this._div.innerHTML = '<h4>Hawaii '+ districtInfo.politician_officetype +' Districts</h4>' +  (props ?
              '<p>'+ districtInfo.politician_officetype + ' District ' + props.objectid + '</p><br>' +
              // '<b>' + _this.getLegislator(props.objectid) + '</b>' +
              '<p>Neighborhoods: ' + _this.getNeighborhoods(props.objectid) + '</p>'
              : '<p>Hover over a district!</p>');
      };
      info.addTo(map);

    }

  },

  // Leaflet Control object - Map legend
  addLegendToMap: function (chamber) {
    // bottom right legend panel
    if (legend) {
      map.removeControl(legend);
    }
    var _this = this;
    legend = L.control({position: 'bottomright'});
    legend.onAdd = function (map) {
      var div = L.DomUtil.create('div', 'legend'),
        grades = [
          0,
          _this.props.config.crimeLevels[chamber].level1,
          _this.props.config.crimeLevels[chamber].level2,
          _this.props.config.crimeLevels[chamber].level3,
          _this.props.config.crimeLevels[chamber].level4,
          _this.props.config.crimeLevels[chamber].level5,
          _this.props.config.crimeLevels[chamber].level6
        ];
      // loop through our density intervals and generate a label with a colored square for each interval
      for (var i = 0; i < grades.length; i++) {
        div.innerHTML +=
          '<i style="background:' + _this.getColor(chamber, grades[i] + 1) + '"></i> ' +
          grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
      }
      return div;
    };
    legend.addTo(map);
  },

  addZoomToMap: function () {
    // debugger;
    if (theZoom) {
      map.removeControl(theZoom);
    }

    var _this = this;
    theZoom = L.control({position: 'topleft'});

    theZoom.onAdd = function (map) {
      var div = L.DomUtil.create('div', 'zoom');
      div.innerHTML = "<h4>Center Map</h4>" ;
      L.DomEvent.on(div, "click", this._click );
      return div;
    };

    theZoom._click = function () {
      _this.zoomToCenter();
    };

    theZoom.addTo(map);
  },

  // refactor this to get all district info, not just neighborhoods
  getNeighborhoods: function (districtNumber) {
    for (var i in this.props.districtData[this.props.chamber]) {
      if (this.props.districtData[this.props.chamber][i].district_name === districtNumber) {
        return this.normalizeNeighborhoods(this.props.districtData[this.props.chamber][i].district_area);
      }
    }
  },

  normalizeNeighborhoods: function (neighborhoodList) {
    var str = "";
    for (var i = 0; i < neighborhoodList.length-1; i++) {
      str+= neighborhoodList[i] + ", ";
    }
    str+= neighborhoodList[neighborhoodList.length-1] +".";
    return str;
  },

  getDistrictInfo: function (districtNumber) {
    if (this.props.districtData) {
      var districtInfo;
      for (var i in this.props.districtData[this.props.chamber]) {
        if (this.props.districtData[this.props.chamber][i].district_name === districtNumber) {
          return this.props.districtData[this.props.chamber][i];
        }
      }
    }
  },

  getLegislator: function (districtNumber) {
    var politician = "";
    for (var i in this.props.districtData[this.props.chamber]) {
      if (this.props.districtData[this.props.chamber][i].district_name === districtNumber) {
        politician += this.props.districtData[this.props.chamber][i].politician_firstname + " " + this.props.districtData[this.props.chamber][i].politician_lastname;
        break;
      }
    }
    return politician;
  },

  highlightFeature: function (e) {
    var layer = e.target;

    layer.setStyle({
        weight: 5,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7
    });

    if (!L.Browser.ie && !L.Browser.opera) {
        layer.bringToFront();
    }

    this.info.update(layer.feature.properties);
  },

  resetHighlight: function (e) {
    geojsonLayer.resetStyle(e.target);
    this.info.update();
  },

  zoomToFeature: function (e) {
    map.fitBounds(e.target.getBounds());
    var districtNumber = e.target.feature.properties.objectid;
    this.props.updateDistrictNumber(districtNumber);
    this.props.updateDistrictInfo(districtNumber);
    if (e.target.feature.isEmpty === true) {
      this.refs['child'].openModal();
    }
  },

  toggleModal: function () {

  },

  zoomToCenter: function (e) {
    // this.props.updateDistrictNumber(0);
    map.setView([21.477351, -157.962799], 10);
  },

  onEachFeature: function (feature, layer) {
    layer.on({
      mouseover: this.highlightFeature,
      mouseout: this.resetHighlight,
      click: this.zoomToFeature
    });
  },

  capitalizeFirstLetter: function (str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  getID: function() {
    // get the "id" attribute of our component's DOM node
    return ReactDOM.findDOMNode(this).querySelectorAll('#map')[0];
  },

  createMap: function(mapElement) {
    var _this = this;
    // this function creates the Leaflet map object and is called after the Map component mounts
    map = L.map(mapElement, this.props.config.params);

    // set our state to include the tile layer
    this.state.tileLayer = L.tileLayer(this.props.config.tileLayer.url, this.props.config.tileLayer.params).addTo(map);
  },

  render : function() {
    return (
      <div id="mapUI">
        <NoDataModal
          districtInfo={this.props.districtInfo}
          ref="child"
        ></NoDataModal>
        <div id="map"></div>
      </div>
    );

  }
});

// export our Map component so that Browserify can include it with other components that require it
module.exports = Map;

