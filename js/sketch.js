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
  /*  Takes an array and a predicate. Iterates the array backward
    and mutatively removes every element which does not match the predicate,
    without creating a new array. */
  for (let i = array.length - 1; i >= 0; i--) {
    if (!predicate(array[i])) {
      array.splice(i, 1);
    }
  }
}

function shadeColorByDepth(clr, y) {
  /*  Fades a color to black the farther a given point is
    from the bottom ("front") of the screen */
  return lerpColor(color("black"), color(clr), y/canvasContainer.height());
}

class Game {
  /*  Represents all game state */
  constructor() {
    this.reset();
  }
  reset() {
    // Create sky and ground objects
    this.horizon = centerVert;
    this.sky = new (Game.Sky)(this);
    this.ground = new (Game.Ground)(this);
    // Create 8 trees in random locations on the ground
    this.trees = [];
    for (let n = 8; n > 0; n--) {
      this.trees.push(new (Game.Tree)(
        this,
        Math.random()*canvasContainer.width(),
        this.horizon + Math.random()*(canvasContainer.height() - this.horizon)
      ));
    }
    // Always draw the trees in farthest-to-nearest order
    // (array will have to be re-sorted every time a tree is planted,
    // once planting trees is implemented)
    this.trees.sort((a, b) => a.y - b.y);
    // initialize other game objects
  }
  draw() {
    // Draw sky, ground, and all trees
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
    // Fixed sky color for now, can make dynamic later if desired
    this.game = game;
    this.color = "#ddeeff";
  }
  draw() {
    background(this.color);
  }
};

Game.Ground = class {
  constructor(game) {
    // Fixed ground color for now, can make dynamic later if desired
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
    this.lengthLimit = 24; // Max segments per branch
    this.partLimit = 64; // Max branches
    this.partCount = 0; // Current number of branches
    this.x = x;
    this.y = y;
    this.trunk = new (Game.Tree.Branch)({ // Root branch
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
    this.segments = [{ // Push initial point into segments
      x: options.x, y: options.y,
      theta: this.constrainAngleUpward(options.theta)
    }];
    // Init state: alive, no child branches
    this.alive = true;
    this.branches = [];
    // Configure properties from options with defaults
    this.width = options.width || 16;
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
    // The head is the most recent segment
    return this.segments[this.segments.length - 1];
  }
  grow() {
    // To grow: add a segment
    const head = this.head;
    this.segments.push({
      // Segment goes off in the current facing direction
      x: head.x + Math.cos(head.theta)*this.growthRate*deltaTime,
      y: head.y + Math.sin(head.theta)*this.growthRate*deltaTime,
      // and turns randomly
      theta: this.constrainAngleUpward(
        head.theta + (2*Math.random() - 1)/this.turnRadius
      )
    });
  }
  die() {
    // To die: set self alive to false and propagate to all child branches
    for (const branch of this.branches) {
      branch.die();
    }
    this.alive = false;
  }
  shrink() {
    // To shrink: remove current head
    if (this.segment.length > 0) {
      this.segments.pop();
    }
  }
  get gone() {
    // A branch is "gone" if it's both dead and out of segments to remove
    return !this.alive && this.segments.length <= 0;
  }
  branch() {
    // To add new child branches:
    // First, decide how many to add
    const numBranches = Math.round(lerp(2, 4, Math.random()));
    // Then, add them like so:
    for (let n = numBranches; n > 0; n--) {
      // If there is room for them in the tree:
      if (this.tree.partCount < this.tree.partLimit) {
        const head = this.head;
        // Add them
        this.branches.push(new (Game.Tree.Branch)({
          game: this.game, tree: this.tree,
          // Start at the same place as the current head
          x: head.x, y: head.y,
          // Branch off in a spread of different directions
          theta: head.theta + lerp(-1, 1, Math.random())*this.branchArc/2,
          // Child branches should be smaller than parent branch
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
    // To sprout a leaf:
    const head = this.head;
    // Push it as a branch
    this.branches.push(new (Game.Tree.Leaf)({
      game: this.game, tree: this.tree,
      // Start at the same place as the current head
      x: head.x, y: head.y,
      // Facing the same direction
      theta: head.theta,
      // But *larger* than the current branch
      width: 2*this.width,
      growthRate: 8*this.growthRate,
      parent: this
    }));
  }
  draw() {
    // to draw: update self, draw self, and then propagate call to children
    this.update();
    this.drawSelf();
    for (const branch of this.branches) {
      branch.draw();
    }
  }
  update() {
    // to update:
    // first, get rid of child branches that are "gone"
    // (see getter method `get gone()`)
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
      // then, if we have no branches:
      if (this.alive) {
        // if we are alive:
        if (
          this.width >= 2 &&
          Math.random() <= this.branchProbability
        ) {
          // if we should branch, branch
          this.branch();
        } else if (
          this.width < 8 &&
          Math.random() <= this.leafProbability
        ) {
          // or, if we should sprout a leaf, sprout a leaf
          this.sproutLeaf();
        } else if (
          this.segments.length < this.tree.lengthLimit
        ) {
          // or, if we can still grow, grow
          this.grow();
        }
      } else {
        // if we have no branches and are not alive, shrink
        // (do not shrink if we are not alive but have branches;
        // that would look dumb)
        this.shrink();
      }
    } else if (
      this.branches.length < 4 &&
      this.alive &&
      this.width >= 2 &&
      Math.random() <= this.branchProbability
    ) {
      // if we are alive and have branches, but can still have more branches,
      // and should grow them, then grow them
      this.branch();
    }
  }
  drawSelf() {
    // to draw self:
    // use own color
    stroke(this.color);
    strokeWeight(this.width);
    noFill();
    // draw lines connecting the segments
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
  // represents a leaf or a leaflike thing (e.g. if we wanted to add flowers)
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
    /*  I don't really know how to explain what I was thinking with this,
      only that it works */
    return this.baseWidth*this.size/(30*this.originalGrowthRate);
  }
  get nextStageProbability() {
    return 0.003;
  }
  sproutNextStage() {
    // intentionally unimplemented (reserved for subclasses)
  }
  grow() {
    this.size += this.growthRate*deltaTime;
    this.growthRate /= 2;
  }
  die() {
    // to die: mark self not alive, propagate to child
    // (an abstractleaf may only have at most one child)
    this.child?.die();
    this.alive = false;
  }
  shrink() {
    this.size /= Math.sqrt(2);
  }
  get gone() {
    // an abstractleaf is "gone" when it is not alive and is very small
    return !this.alive && this.size <= this.originalGrowthRate/2;
  }
  draw() {
    // to draw: update self, draw self, and then propagate call to children
    this.update();
    this.drawSelf();
    this.child?.draw();
  }
  update() {
    // to update:
    if (this.child?.gone) {
      // first, if child exists but is "gone," remove it
      this.child = null;
    }
    if (!this.child) {
      // if we have no child:
      if (!this.alive) {
        // if we are dead: shrink
        this.shrink();
      } else if (Math.random() <= this.nextStageProbability) {
        // if alive and should sprout next stage: sprout next stage
        this.sproutNextStage();
      } else {
        // if alive and shouldn't sprout next stage: grow
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
    // a leaf is just an abstractleaf that looks like a leaf
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
