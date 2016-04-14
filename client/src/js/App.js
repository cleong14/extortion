var React = require('react');
var ReactDOM = require('react-dom');
// require our Map React component
var Map = require('./Map');
var Filter = require('./Filter');
var Summary = require('./Summary');
var Dashboard = require('./Dashboard');
// where in the actual DOM to mount our App
var mountNode = document.getElementById('app');
// App component
var App = React.createClass({
  getInitialState: function () {//we set it to state because its subject to change
    return {
      crimes: [],
      types: ['THEFT/LARCENY', 'VEHICLE BREAK-IN/THEFT', 'VANDALISM', 'MOTOR VEHICLE THEFT', 'BURGLARY', ],
      filter: ['BURGLARY', 'VANDALISM'],
      chamber: 'senate',
      districtNumber: 23,
      senateCrimes: [],
      houseCrimes: []
    };
  },
  loadSenateCrimes: function () {//added
    $.ajax({
      url: 'http://localhost:3000/senatecrimequery',
      method: "GET",
      dataType: "json",
      success: (data) => {
        this.setState({senateCrimes: data[0]});
      },
      failure: function (err) {
        // console.log(err);
      }
    });
  },
  loadHouseCrimes: function () {//added
    $.ajax({
      url: 'http://localhost:3000/housecrimequery',
      method: "GET",
      dataType: "json",
      success: (data) => {
        this.setState({houseCrimes: data[0]});
      },
      failure: function (err) {
        // console.log(err);
      }
    });
  },
  loadFile: function (fileName, label) {
    var newState = {};
    $.ajax({
      url: 'http://localhost:3000/file/'+fileName,
      method: "GET",
      dataType: "json",
      success: (data) => {
        newState[label] = data;
        this.setState(newState);//setting state of app to have crimes as data

      },
      failure: function (err) {
        // console.log(err);
      }
    });
  },
  componentDidMount: function () {//added
    this.loadFile('hssd.geo.json', 'senate');
    this.loadFile('district-data.json', 'districtData');
    this.loadSenateCrimes();
    this.loadHouseCrimes();
    this.loadFile('hshd.geo.json', 'house');
  },

  componentWillReceiveProps: function() {
    // this.filterCrimes(this.state.senateCrimes);
  },

  componentWillUpdate: function () {
    // this.filterCrimes(this.state.senateCrimes);
  },

  componentDidUpdate: function () {
    // this.filterCrimes(this.state.senateCrimes);
  },

  filterCrimes: function (crimeData) {
    if (this.state.senateCrimes) {
      var _this = this;
      var filteredCrimes = crimeData
        .filter(function (crime) {
          var types = _this.state.filter;
          return types.indexOf(crime.type) > -1;
        });
      this.setState({filteredSenateCrimes: filteredCrimes});
      console.log(this.state);

    }
  },

  toggleFilter: function (type) {
    if (this.state.filter.indexOf(type) === -1) {
      this.setState({filter: this.state.filter.concat(type)});//concat state filter with types
    } else {
      var newArr = this.state.filter.slice();//copy array
      for (var i = 0; i < newArr.length; i++) {
        if (newArr[i] == type) {
          newArr.splice(i, 1);
        }
      }
      this.setState({filter: newArr});//update state
    }
    this.filterCrimes(this.state.senateCrimes);
  },
  updateChamber: function (val) {
    this.setState({
      chamber: val
    });
  },
  updateDistrictNumber: function (number) {
    this.setState({
      districtNumber: number
    });
  },
  render: function() {
    return (
      <div>
        <div className="topLevel">
          <Filter
            crimes={this.state.crimes}
            types={this.state.types}
            onChange={this.toggleFilter}
            updateChamber={this.updateChamber}
            filter={this.state.filter}
            filterCrimes={this.filterCrimes}
          />
          <Map
            chamber={this.state.chamber}
            house={this.state.house}
            senate={this.state.senate}
            districtData={this.state.districtData}
            updateDistrictNumber={this.updateDistrictNumber}
            senateCrimes={this.state.senateCrimes}
            houseCrimes={this.state.houseCrimes}
          />
        </div>
        <Summary
          chamber={this.state.chamber}
          districtData={this.state.districtData}
          districtNumber={this.state.districtNumber}
          senateCrimes={this.state.senateCrimes}
          houseCrimes={this.state.houseCrimes}
        />
      </div>
    );
  }
});
// render the app using ReactDOM! url="http://localhost:3000/api"
ReactDOM.render(
  <App url="http://localhost:3000/api" />,
  mountNode
);