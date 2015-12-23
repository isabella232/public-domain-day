// Dependencies
var d3 = require('d3');
var request = require('d3-request');
require("d3-geo-projection")(d3);
var topojson = require('topojson');
var _ = require('lodash');
var textures = require('textures');

var fm = require('./fm');
var throttle = require('./throttle');
var features = require('./detectFeatures')();

// Globals
var DEFAULT_WIDTH = 940;
var MOBILE_THRESHOLD = 600;

var bordersData = null;
var termsData = null;

var isMobile = false;

function init() {
  request.json('data/borders-topo.json', function(error, data) {
    bordersData = topojson.feature(data, data['objects']['ne_110m_admin_0_countries']);

    request.csv('data/copyright-terms.csv', function(error, data) {
      termsData = data;

      render();
      $(window).resize(throttle(onResize, 250));
    });
  });
}

function onResize() {
  render()
}

function render() {
  var width = $('#map').width();

  if (width <= MOBILE_THRESHOLD) {
      isMobile = true;
  } else {
      isMobile = false;
  }

  renderMap({
    container: '#map',
    width: width,
    borders: bordersData,
    terms: termsData
  });

  // Resize
  fm.resize()
}

/*
 * Render a map.
 */
function renderMap(config) {
    /*
     * Setup
     */
    var aspectRatio = 5 / 1.7;
    var defaultScale = 175;
    var defaultDotSize = 3;

    var margins = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    };

    // Calculate actual chart dimensions
    var width = config['width'];
    var height = width / aspectRatio;

    var chartWidth = width - (margins['left'] + margins['right']);
    var chartHeight = height - (margins['top'] + margins['bottom']);

    var mapCenter = [0, 8];
    var scaleFactor = chartWidth / DEFAULT_WIDTH;
    var mapScale = scaleFactor * defaultScale;

    var projection = d3.geo.cylindricalEqualArea()
      .center(mapCenter)
      .translate([width / 2, height / 2])
      .scale(mapScale);

    var geoPath = d3.geo.path()
      .projection(projection)
      .pointRadius(defaultDotSize * scaleFactor);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
      .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
      .attr('width', chartWidth + margins['left'] + margins['right'])
      .attr('height', chartHeight + margins['top'] + margins['bottom'])
      .append('g')
      .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Textures
     */
    var usTexture = textures.lines()
      .size(15 * scaleFactor)
      .strokeWidth(5 * scaleFactor)
      .stroke('#d190b6')
      .background('#e9c8cb');

    chartElement.call(usTexture);

    /*
     * Create geographic elements.
     */
    var borders = chartElement.append('g')
      .attr('class', 'borders');

    borders.selectAll('path')
      .data(config['borders']['features'])
      .enter().append('path')
        .attr('id', function(d) {
          return d['id'];
        })
        .attr('class', function(d) {
          var term = _.find(config['terms'], function(t) {
            return (t['ccode'] == d['id']);
          });

          if (_.isUndefined(term)) {
            return '';
          }

          var years = parseInt(term['term']);

          if (years < 50) {
            return 'term-less';
          } else if (years == 50) {
            return 'term-50';
          } else if (years < 70){
            return 'term-middle';
          } else if (years == 70) {
            return 'term-70';
          } else if (years > 70) {
            return 'term-more';
          }

          return ''
        })
        .style('fill', function(d) {
          if (d['id'] == 'US1') {
            return usTexture.url();
          }

          return null;
        })
        .attr('d', geoPath);
}

$(document).ready(function () {
  init();
});
