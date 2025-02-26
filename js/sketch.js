// sketch.js - purpose and description here
// Author: Gio
// Date: Jan 15 20205

function resizeScreen() {
  centerHorz = canvasContainer.width() / 2; // Adjusted for drawing logic
  centerVert = canvasContainer.height() / 2; // Adjusted for drawing logic
  console.log("Resizing...");
  resizeCanvas(canvasContainer.width(), canvasContainer.height());
  // redrawCanvas(); // Redraw everything based on new size
}

// setup() function is called once when the program starts
function setup() {
  // place our canvas, making it fit our container
  canvasContainer = $("#canvas-container");
  let canvas = createCanvas(canvasContainer.width(), canvasContainer.height());
  canvas.parent("canvas-container");
  // resize canvas is the page is resized
  $(window).resize(function() {
    resizeScreen();
  });
  resizeScreen();
}

// draw() function is called repeatedly, it's the main animation loop
function draw() {
  background(255);
  
  for (let i=0; i < 800; i = i + 20){
    for(let j=0; j < 800; j = j + 20){
      dir_x = i - mouseX;
      dir_y = j - mouseY;
      magnitude = sqrt(sq(dir_x)+sq(dir_y));
      u_x = 10 * (dir_x / magnitude);
      u_y = 10 * (dir_y / magnitude);
      new_i = i + u_x;
      new_j = j + u_y;
      line(i, j, new_i, new_j);
    }
  }
}

// mousePressed() function is called once after every time a mouse button is pressed
function mousePressed() {
    // code to run when mouse is pressed
}