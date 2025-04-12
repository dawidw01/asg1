// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform float u_Size;
void main() {
    gl_Position = a_Position;
    // gl_PointSize = 20.0;
    gl_PointSize = u_Size;
}`;

// Fragment shader program
var FSHADER_SOURCE = `
precision mediump float;
uniform vec4 u_FragColor;
void main() {
    gl_FragColor = u_FragColor;
}`;

// Global Variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  // gl = getWebGLContext(canvas);

  // prevent lag and improve performance
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });

  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
}

function connectVariablesToGSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_Size
  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return;
  }

}

// constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

// Global Variables related to UI
// let g_selectedColor = [1.0, 1.0, 1.0, 1.0]
let g_selectedColor = [0.0, 0.0, 0.0, 1.0]
let g_selectedSize = 5;
let g_selectedType = POINT;
let g_segmentCount = 10;
let undoStack = [];
let redoStack = [];

// setup actions for HTML UI elements
function addActionsForHtmlUI() {

  // Button Events
  // document.getElementById('green').onclick = function () { g_selectedColor = [0.0, 1.0, 0.0, 1.0]; };
  // document.getElementById('red').onclick = function () { g_selectedColor = [1.0, 0.0, 0.0, 1.0]; };
  document.getElementById('clearButton').onclick = function () { g_shapesList = []; undoStack = []; redoStack = []; renderAllShapes(); };

  // select shape
  document.getElementById('pointButton').onclick = function () { g_selectedType = POINT; };
  document.getElementById('triButton').onclick = function () { g_selectedType = TRIANGLE; };
  document.getElementById('circleButton').onclick = function () { g_selectedType = CIRCLE; };

  // slider Events
  document.getElementById('redSlide').addEventListener('mouseup', function () { g_selectedColor[0] = this.value / 100; });
  document.getElementById('greenSlide').addEventListener('mouseup', function () { g_selectedColor[1] = this.value / 100; });
  document.getElementById('blueSlide').addEventListener('mouseup', function () { g_selectedColor[2] = this.value / 100; });

  // Size Slider Events
  document.getElementById('sizeSlide').addEventListener('mouseup', function () { g_selectedSize = this.value; });

  // Number of Segments
  document.getElementById('segmentSlide').addEventListener('mouseup', function () { g_segmentCount = this.value; });

  document.getElementById('pictureButton').onclick = drawPicture;

  // awesomeness
  document.getElementById('undoButton').onclick = function () {
    if (undoStack.length > 0) {
      let lastShape = undoStack.pop();
      redoStack.push(lastShape);
      g_shapesList.pop();
      renderAllShapes();
    }
  };

  document.getElementById('redoButton').onclick = function () {
    if (redoStack.length > 0) {
      let shape = redoStack.pop();
      g_shapesList.push(shape);
      undoStack.push(shape);
      renderAllShapes();
    }
  };
}


function main() {

  // setup canvas and gl variables
  setupWebGL();

  // setup gsl shader programs and connect variables
  connectVariablesToGSL();

  // setup actions for HTML UI elements
  addActionsForHtmlUI();

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = click;

  canvas.onmousemove = function (ev) {
    if (ev.buttons == 1) {
      click(ev);
    }
  };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
}

var g_shapesList = [];

// var g_points = [];  // The array for the position of a mouse press
// var g_colors = [];  // The array to store the color of a point
// var g_sizes = []; // The array to store the size of a point

function click(ev) {

  // convert event click into WebGL coordinates
  let [x, y] = convertCoordinatesEventToGL(ev);

  // Create and store the new point
  let point;

  if (g_selectedType == POINT) {
    point = new Point();
  } else if (g_selectedType == TRIANGLE) {
    point = new Triangle();
  } else {
    point = new Circle();

    // set segments count for circle only
    point.segments = g_segmentCount;
  }

  point.position = [x, y];
  point.color = g_selectedColor.slice();
  point.size = g_selectedSize;
  g_shapesList.push(point);

  // awesomeness
  undoStack.push(point);
  redoStack = [];  // clear redoStack when new action is performed

  // // Store the coordinates to g_points array
  // g_points.push([x, y]);

  // // Store the color to g_colors array
  // g_colors.push(g_selectedColor.slice());

  // // Store the size to g_sizes array
  // g_sizes.push(g_selectedSize);

  // // Store the coordinates to g_points array
  // if (x >= 0.0 && y >= 0.0) {      // First quadrant
  //   g_colors.push([1.0, 0.0, 0.0, 1.0]);  // Red
  // } else if (x < 0.0 && y < 0.0) { // Third quadrant
  //   g_colors.push([0.0, 1.0, 0.0, 1.0]);  // Green
  // } else {                         // Others
  //   g_colors.push([1.0, 1.0, 1.0, 1.0]);  // White
  // }

  // draw all shapes on canvas
  renderAllShapes();
}

function convertCoordinatesEventToGL(ev) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  return ([x, y]);
}

function renderAllShapes() {

  // Check the time at the start of this function
  var startTime = performance.now();


  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  // var len = g_points.length;
  var len = g_shapesList.length;

  for (var i = 0; i < len; i++) {
    g_shapesList[i].render();
  }

  // Check the time at the end of the function, and show on web page
  var duration = performance.now() - startTime;
  sendTextToHTML("numdot: " + len + " ms: " + Math.floor(duration) + " fps: " + Math.floor(10000 / duration) / 10, "numdot");

}

// Set the text of a HTML element
function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}

function drawPicture() {
  g_shapesList = [];

  // colors
  const red = [1, 0, 0, 1];
  const blue = [0.2, 0.4, 1, 1];
  const yellow = [1, 1, 0, 1];
  const orange = [1, 0.5, 0, 1];
  const purple = [0.6, 0.3, 1, 1];
  const gray = [0.7, 0.7, 0.7, 1];

  // rocket parts

  // nose cone
  g_shapesList.push(customTriangle(0, 0.7, -0.15, 0.4, 0.15, 0.4, red));

  // main rocket body as two big side triangles to mimic a rectangle
  g_shapesList.push(customTriangle(-0.15, 0.4, -0.15, -0.3, 0.15, 0.4, blue));
  g_shapesList.push(customTriangle(0.15, 0.4, -0.15, -0.3, 0.15, -0.3, blue));

  let windowCircle = new Circle();
  windowCircle.position = [0.0, 0.1]; // center of the rocket
  windowCircle.color = [0.6, 0.85, 1.0, 1.0]; // soft bluish glass
  windowCircle.size = 15;
  windowCircle.segments = 20;

  let windowFrame = new Circle();
  windowFrame.position = [0.0, 0.1];
  windowFrame.color = [0.3, 0.3, 0.3, 1.0]; // dark gray
  windowFrame.size = 18; // slightly larger than the glass
  windowFrame.segments = 20;
  g_shapesList.push(windowFrame);

  g_shapesList.push(windowCircle);


  // left booster
  g_shapesList.push(customTriangle(-0.45, -0.3, -0.2, -0.2, -0.2, 0.2, purple));

  // right booster
  g_shapesList.push(customTriangle(0.45, -0.3, 0.2, -0.2, 0.2, 0.2, purple));

  // exhaust box
  g_shapesList.push(customTriangle(-0.1, -0.3, -0.1, -0.4, 0.1, -0.3, gray));
  g_shapesList.push(customTriangle(0.1, -0.3, -0.1, -0.4, 0.1, -0.4, gray));

  // flames
  g_shapesList.push(customTriangle(-0.15, -0.45, -0.05, -0.55, -0.1, -0.6, orange));
  g_shapesList.push(customTriangle(0, -0.45, 0.05, -0.55, 0, -0.6, yellow));
  g_shapesList.push(customTriangle(0.15, -0.45, 0.1, -0.55, 0.2, -0.6, orange));

  // stars
  const starCenters = [
    [-0.75, 0.6], [-0.65, -0.2], [0.6, -0.3]
  ];

  for (const [cx, cy] of starCenters) {
    const radiusOuter = 0.05;
    const radiusInner = 0.02;
    const numPoints = 5;
    const starColor = [1.0, 1.0, 0.6, 1.0]; // yellow gold color

    // outline a star with triangles
    for (let i = 0; i < numPoints; i++) {
      const angle1 = (2 * Math.PI / numPoints) * i;
      const angle2 = (2 * Math.PI / numPoints) * (i + 1);
      const midAngle = (angle1 + angle2) / 2;

      // Outer points
      const x1 = cx + radiusOuter * Math.cos(angle1);
      const y1 = cy + radiusOuter * Math.sin(angle1);
      const x2 = cx + radiusOuter * Math.cos(angle2);
      const y2 = cy + radiusOuter * Math.sin(angle2);

      // Inner points
      const mx = cx + radiusInner * Math.cos(midAngle);
      const my = cy + radiusInner * Math.sin(midAngle);

      g_shapesList.push(customTriangle(x1, y1, mx, my, x2, y2, starColor));
    }
  }

  undoStack = [];

  // add all shapes to the undo stack
  g_shapesList.forEach(element => {
    undoStack.push(element);
  });

  redoStack = [];


  renderAllShapes();
}

// helper function to make triangle from 3 points and a color
// note: this function is needed as our default render for triangle makes 
// only one type of triangle with same vertices
function customTriangle(x1, y1, x2, y2, x3, y3, color) {
  const tri = new Triangle();
  tri.color = color;
  tri.render = function () {
    gl.uniform4f(u_FragColor, ...color);
    drawTriangle([x1, y1, x2, y2, x3, y3]);
  };
  return tri;
}