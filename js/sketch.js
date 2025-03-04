// sketch.js - purpose and description here
// Author: Gio
// Date: Jan 15 20205

let canvasContainer;
let centerHorz;
let centerVert;
let shiftLeftHeld;
let shiftRightHeld;
let gameInstance;

function isShiftHeld() {
  return shiftLeftHeld || shiftRightHeld;
}

function filterInPlace(array, predicate) {
  for (let i = array.length - 1; i >= 0; i--) {
    if (!predicate(array[i])) {
      array.splice(i, 1);
    }
  }
}

function shadeColorByDepth(clr, y) {
  return lerpColor(color("black"), color(clr), y/canvasContainer.height());
}

class Game {
  constructor() {
    this.reset();
  }
  reset() {
    this.horizon = centerVert;
    this.sky = new (Game.Sky)(this);
    this.ground = new (Game.Ground)(this);
    this.trees = [];
    for (let n = 8; n > 0; n--) {
      this.trees.push(new (Game.Tree)(
        this,
        Math.random()*canvasContainer.width(),
        this.horizon + Math.random()*(canvasContainer.height() - this.horizon)
      ));
    }
    this.trees.sort((a, b) => a.y - b.y);
    // initialize other game objects
  }
  draw() {
    this.sky.draw();
    this.ground.draw();
    for (const tree of this.trees) {
      tree.draw();
    }
    // draw other game objects
  }
}

Game.Sky = class {
  constructor(game) {
    this.game = game;
    this.color = "#ddeeff";
  }
  draw() {
    background(this.color);
  }
};

Game.Ground = class {
  constructor(game) {
    this.game = game;
    this.color = "#550000";
  }
  draw() {
    noStroke();
    fill(this.color);
    rect(0, this.game.horizon,
      canvasContainer.width(),
      canvasContainer.height() - this.game.horizon);
  }
};

Game.Tree = class {
  constructor(game, x, y) {
    this.game = game;
    this.lengthLimit = 24;
    this.partLimit = 64;
    this.partCount = 0;
    this.x = x;
    this.y = y;
    this.trunk = new (Game.Tree.Branch)({
      game: this.game,
      tree: this,
      x, y,
      theta: -Math.PI/2
    });
  }
  draw() {
    this.trunk.draw();
  }
};

Game.Tree.Branch = class {
  constrainAngleUpward(theta) {
    // normalize theta into signed zero octave
    while (theta > 0) theta -= 2*Math.PI;
    while (theta < -Math.PI) theta += 2*Math.PI;
    // if theta isn't upward:
    if (theta > 0) {
      // snap it to the nearest flat horizontal angle
      if (theta > Math.PI - theta) {
        theta = -Math.PI;
      } else {
        theta = 0;
      }
    }
    return theta;
  }
  constructor(options) {
    this.game = options.game;
    this.tree = options.tree;
    this.segments = [{
      x: options.x, y: options.y,
      theta: this.constrainAngleUpward(options.theta)
    }];
    this.width = options.width || 16;
    this.alive = true;
    this.branches = [];
    this.growthRate = options.growthRate || 1/3;
    this.turnRadius = options.turnRadius || 12;
    this.branchArc = options.branchArc || Math.PI/2;
    this.parent = options.parent || null;
    this.color = shadeColorByDepth(options.color || "#aa5555", this.tree.y);
    this.branchProbability = options.branchProbability || 0.01;
    this.leafProbability = options.leafProbability || 0.03;
    this.shrinkFactor = options.shrinkFactor || 0.8;
  }
  get head() {
    return this.segments[this.segments.length - 1];
  }
  grow() {
    const head = this.head;
    this.segments.push({
      x: head.x + Math.cos(head.theta)*this.growthRate*deltaTime,
      y: head.y + Math.sin(head.theta)*this.growthRate*deltaTime,
      theta: this.constrainAngleUpward(
        head.theta + (2*Math.random() - 1)/this.turnRadius
      )
    });
  }
  die() {
    for (const branch of this.branches) {
      branch.die();
    }
    this.alive = false;
  }
  shrink() {
    if (this.segment.length > 0) {
      this.segments.pop();
    }
  }
  get gone() {
    return !this.alive && this.segments.length <= 0;
  }
  branch() {
    const numBranches = Math.round(lerp(2, 4, Math.random()));
    for (let n = numBranches; n > 0; n--) {
      if (this.tree.partCount < this.tree.partLimit) {
        const head = this.head;
        this.branches.push(new (Game.Tree.Branch)({
          game: this.game, tree: this.tree,
          x: head.x, y: head.y,
          theta: head.theta + lerp(-1, 1, Math.random())*this.branchArc/2,
          width: this.width*this.shrinkFactor,
          growthRate: this.growthRate*this.shrinkFactor,
          turnRadius: this.turnRadius*this.shrinkFactor,
          branchArc: this.branchArc*this.shrinkFactor,
          parent: this
        }));
        this.tree.partCount++;
      }
    }
  }
  sproutLeaf() {
    const head = this.head;
    this.branches.push(new (Game.Tree.Leaf)({
      game: this.game, tree: this.tree,
      x: head.x, y: head.y,
      theta: head.theta,
      width: 2*this.width,
      growthRate: 8*this.growthRate,
      parent: this
    }));
  }
  draw() {
    this.update();
    this.drawSelf();
    for (const branch of this.branches) {
      branch.draw();
    }
  }
  update() {
    const countBeforePrune = this.branches.length;
    filterInPlace(this.branches, branch => {
      if (branch.gone) {
        if (!(branch instanceof Game.Tree.AbstractLeaf)) {
          this.tree.partCount--;
        }
        return false;
      } else {
        return true;
      }
    });
    if (this.branches.length <= 0) {
      if (this.alive) {
        if (
          this.width >= 2 &&
          Math.random() <= this.branchProbability
        ) {
          this.branch();
        } else if (
          this.width < 8 &&
          Math.random() <= this.leafProbability
        ) {
          this.sproutLeaf();
        } else if (
          this.segments.length < this.tree.lengthLimit
        ) {
          this.grow();
        }
      } else {
        this.shrink();
      }
    } else if (
      this.branches.length < 4 &&
      this.alive &&
      this.width >= 2 &&
      Math.random() <= this.branchProbability
    ) {
      this.branch();
    }
  }
  drawSelf() {
    stroke(this.color);
    strokeWeight(this.width);
    noFill();
    let prev;
    for (const segment of this.segments) {
      if (prev) {
        line(prev.x, prev.y, segment.x, segment.y);
      }
      prev = segment;
    }
  }
};

Game.Tree.AbstractLeaf = class {
  constructor(options) {
    this.game = options.game;
    this.tree = options.tree;
    this.x = options.x;
    this.y = options.y;
    this.theta = options.theta;
    this.baseWidth = options.width;
    this.alive = true;
    this.size = 0;
    this.originalGrowthRate = options.growthRate;
    this.growthRate = options.growthRate;
    this.parent = options.parent;
    this.child = null;
    this.color = shadeColorByDepth(options.color || "#55ffaa", this.tree.y);
  }
  get width() {
    return this.baseWidth*this.size/(30*this.originalGrowthRate);
  }
  get nextStageProbability() {
    return 0.003;
  }
  sproutNextStage() {}
  grow() {
    this.size += this.growthRate*deltaTime;
    this.growthRate /= 2;
  }
  die() {
    this.child?.die();
    this.alive = false;
  }
  shrink() {
    this.size /= Math.sqrt(2);
  }
  get gone() {
    return !this.alive && this.size <= this.originalGrowthRate/2;
  }
  draw() {
    this.update();
    this.drawSelf();
    this.child?.draw();
  }
  update() {
    if (this.child?.gone) {
      this.child = null;
    }
    if (!this.child) {
      if (!this.alive) {
        this.shrink();
      } else if (Math.random() <= this.nextStageProbability) {
        this.sproutNextStage();
      } else {
        this.grow();
      }
    }
  }
};

Game.Tree.Leaf = class extends Game.Tree.AbstractLeaf {
  constructor(options) {
    super(options);
  }
  drawSelf() {
    stroke(this.color);
    strokeWeight(this.width);
    noFill();
    line(
      this.x, this.y,
      this.x + this.size*Math.cos(this.theta),
      this.y + this.size*Math.sin(this.theta)
    );
  }
};

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
  // Monitor state of shift key
  document.body.addEventListener("keydown", ev => {
    if (ev.code == "ShiftLeft") {
      shiftLeftHeld = true;
    } else if (ev.code == "ShiftRight") {
      shiftRightHeld = true;
    }
  });
  document.body.addEventListener("keyup", ev => {
    if (ev.code == "ShiftLeft") {
      shiftLeftHeld = false;
    } else if (ev.code == "ShiftRight") {
      shiftRightHeld = false;
    }
  });
  // Initialize game
  gameInstance = new Game();
}

// draw() function is called repeatedly, it's the main animation loop
function draw() {
  background(255);
  rect(0,0,100,100);
  gameInstance.draw();
}

// mousePressed() function is called once after every time a mouse button is pressed
function mousePressed() {
    // code to run when mouse is pressed
}
