// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 15, 30);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Create a Texture Loader
const textureLoader = new THREE.TextureLoader();

// Load Texture for grass
const grassTexture = textureLoader.load('./textures/rocky_terrain_02_diff_4k.jpg');

// Create a Grass Plane for the ground
const grassGeometry = new THREE.PlaneGeometry(50, 50, 20, 20);
const grassMaterial = new THREE.MeshStandardMaterial({
    map: grassTexture
});
const grass = new THREE.Mesh(grassGeometry, grassMaterial);
grass.rotation.x = -Math.PI / 2;
grass.position.y = 0;

// Create the noise generator instance
const noise = new Noise(0); // Using a random seed

// positionAttribute = grassGeometry.attributes.position;
// const vertex = new THREE.Vector3();
// for (let i = 0; i < positionAttribute.count; i++) {
//     vertex.fromBufferAttribute(positionAttribute, i);
//     if (vertex.z > -3){
//         let noiseValue = noise.perlin2(vertex.x * 0.1, vertex.y * 0.1) * 5;
//         vertex.z += noiseValue;
//         positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z)
//     }
// }

// positionAttribute.needsUpdate = true;
// scene.add(grass);

// Load Texture For Dirt
const groundTexture = textureLoader.load('./textures/forrest_ground_01_diff_1k.jpg');

// Create a Dirt Box for the ground
const groundGeometry = new THREE.BoxGeometry(50, 10, 50, 20, 20, 20);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    map: grassTexture
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);

let positionAttributeground = groundGeometry.attributes.position;
const ground_vertex = new THREE.Vector3();

ground.position.y = -5;

scene.add(ground);

for (let i=0; i < positionAttributeground.count; i++) {
    ground_vertex.fromBufferAttribute(positionAttributeground, i);
    if (ground_vertex.y >= 4) {
        let noiseValue = noise.perlin2(ground_vertex.x * 0.1, ground_vertex.z * 0.1) * 5;
        ground_vertex.y += noiseValue;
        positionAttributeground.setXYZ(i, ground_vertex.x, ground_vertex.y, ground_vertex.z)
    }

}

positionAttributeground.needsUpdate = true;

// Create trees
const trees = [];
const numTrees = 10;

// HTML elements
const money = document.getElementById("money");
money.textContent = "💸 500";
moneyValue = 500;

// Audio Implementation-----------------------------------------------------------
const listener = new THREE.AudioListener();
camera.add(listener);

// Create a falling sound
const fallSound = new THREE.Audio(listener);
// Create a growing sound
const growSound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
// Use a buffer sound for the falling effect
let fallSoundBuffer = null;
let growSoundBuffer = null;

//Chopping sound
audioLoader.load('../sounds/chop.wav', function(buffer) {
    fallSoundBuffer = buffer;
}, function() {}, function(error) {
    console.error('Error loading sound:', error);
});
//Growing Sound
audioLoader.load('../sounds/growing.mp3', function(buffer) {
    growSoundBuffer = buffer;
}, function() {}, function(error) {
    console.error('Error loading sound:', error);
});
//Looping sounds configuration-------------------------------------------------------------
const ambientSounds = [
    /* --- OLD SOUNDS --- (for now)
    { name: "grasshoppers", threshold: 5, audio: new Audio("sounds/grasshoppers.wav"), volume: 0.1 },
    { name: "birds", threshold: 15, audio: new Audio("sounds/birds.wav"), volume: 0.2 },
    { name: "rumor", threshold: 20, audio: new Audio("sounds/rumor.wav"), volume: 1 },
    { name: "turkey/cayote/idk/choose_guys", threshold: 30, audio: new Audio("sounds/rumor.wav"), volume: 1 }
    */ 

    { name: "chrip1", threshold:10, audio: new Audio("sounds/soundlayers/birdChirp1.wav"), volume: 1},
    { name: "chrip2", threshold:20, audio: new Audio("sounds/soundlayers/birdChirp2.wav"), volume: 1},
    { name: "chrip3", threshold:20, audio: new Audio("sounds/soundlayers/birdChirp3.wav"), volume: 1},
    { name: "chrip4", threshold:15, audio: new Audio("sounds/soundlayers/birdChirp4.wav"), volume: 1},
    { name: "birdloop", threshold: 10, audio: new Audio("sounds/soundlayers/birdsoundLoop.wav"), volume: 1},

    { name: "crickets", threshold: 10, audio: new Audio("sounds/soundlayers/crickets.wav"), volume: 0.5},
    { name: "mosquito", threshold: 5, audio: new Audio("sounds/soundlayers/mosquito.wav"), volume: 0.5},
    { name: "grasshoppers", threshold: 5, audio: new Audio("sounds/grasshoppers.wav"), volume: 0.5 },
    
    { name: "frog", threshold: 3, audio: new Audio("sounds/soundlayers/frogCroak.wav"), volume: 1},
];
ambientSounds.forEach((sound) => {
    sound.audio.loop = true;
    sound.audio.volume = 0;
});

function updateSounds(tree_num) {
    ambientSounds.forEach((sound,index) => {
        sound.audio.play();
        const shouldPlay = (tree_num >= sound.threshold);
        const targetVolume = shouldPlay ? sound.volume : 0; 
        sound.audio.volume = targetVolume;

    })
};

function lerp(a, b, w) {
    return a + (b - a)*w;
};

//Tree creation------------------------------------------------------------------------
function initializeTree(group, x, z, withAnimation = false) {
    // Set tree position
    let y = noise.perlin2(x * 0.1, z * 0.1) * 5;
    group.position.set(x, y-0.1, z);

    const targetScale = lerp(2/3, 4/3, Math.random());

    //update money value
    moneyValue -= 50;
    money.textContent = "💸 " + moneyValue;

    // If animation requested, start with zero scale
    if (withAnimation) {
        group.scale.set(0, 0, 0);

        // Play grow sound
        if (growSoundBuffer) {
            growSound.setBuffer(growSoundBuffer);
            growSound.setVolume(0.3);
            growSound.setPlaybackRate(1.5); // Higher pitch for growth
            growSound.play();
        }
    } else {
        group.scale.set(targetScale, targetScale, targetScale)
    }

    scene.add(group);

    // Add to trees array with additional properties
    const treeObj = {
        group: group,
        isFalling: false,
        isGrowing: withAnimation,
        growthProgress: 0,
        targetScale: targetScale,
        fallAngle: 0,
        fallDirection: Math.random() * Math.PI * 2, // Random direction to fall
        removed: false
    };

    trees.push(treeObj);
    return treeObj;
}

// load TreeTop Material
const treeTopTexture = textureLoader.load("./textures/Cartoon_Grass_Texture.jpg");

function createSimpleTreeModel() {
    const group = new THREE.Group();
    
    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.4, 2, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1; // Half height of trunk
    group.add(trunk);
    
    // Tree top (cone)
    const topGeometry = new THREE.ConeGeometry(1, 3, 8);
    const topMaterial = new THREE.MeshStandardMaterial({ map: treeTopTexture });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 3.5; // Height of trunk (2) + half height of cone (1.5)
    group.add(top);

    return group;
}

const gltfLoader = new THREE.GLTFLoader();
const loadedModels = {};

async function loadTreeModel(src, x, z, withAnimation = false) {
    let model = loadedModels[src];
    if (!model) {
        model =
            await new Promise((resolve, reject) =>
                gltfLoader.load(src, resolve, () => {}, reject));
        loadedModels[src] = model;
    }
    const group = new THREE.Group();
    group.add(model.scene.clone());
    return group;
}

const treeCreators = [
    createSimpleTreeModel,
    loadTreeModel.bind(null, "./models/tree1.glb"),
    loadTreeModel.bind(null, "./models/tree2.glb"),
    loadTreeModel.bind(null, "./models/tree3.glb")
];

async function createTree(...args) {
    return initializeTree(await treeCreators[
        Math.floor(Math.random()*treeCreators.length)%treeCreators.length
    ](), ...args);
}

// Place trees randomly
for (let i = 0; i < numTrees; i++) {
    const x = Math.random() * 40 - 20;
    const z = Math.random() * 40 - 20;
    createTree(x, z);
}

// Set up raycaster for clicking
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Mode tracking
let isPlantMode = false;
const plantTreeBtn = document.getElementById('plant-tree-btn');

plantTreeBtn.addEventListener('click', function() {
    isPlantMode = !isPlantMode;
    if (isPlantMode) {
        plantTreeBtn.classList.add('active');
    } else {
        plantTreeBtn.classList.remove('active');
    }
});

//Raycasting handling----------------------------------------------------------------------
function onMouseClick(event) {
    // Normalize mouse coords
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update the raycaster
    raycaster.setFromCamera(mouse, camera);
    
    if (isPlantMode) {
        // In plant mode, we want to intersect with the ground
        const intersects = raycaster.intersectObject(ground);
        
        if (intersects.length > 0) {
            // Get the point of intersection in world coordinates
            const point = intersects[0].point;
            
            // Create a new tree at that position with growth animation
            createTree(point.x, point.z, true);
        }
    } else {
        // Create a flat array of all meshes from the tree groups
        const treeMeshes = [];
        const treeIndices = [];
        
        trees.forEach((tree, index) => {
            if (!tree.removed && !tree.isGrowing) {
                tree.group.traverse(function(child) {
                    if (child instanceof THREE.Mesh) {
                        treeMeshes.push(child);
                        treeIndices.push(index);
                    }
                });
            }
        });
        
        // Check for intersections
        const intersects = raycaster.intersectObjects(treeMeshes);
        
        if (intersects.length > 0) {
            const treeIndex = treeIndices[treeMeshes.indexOf(intersects[0].object)];
            
            // Start the falling animation if not already falling
            if (!trees[treeIndex].isFalling && !trees[treeIndex].removed) {
                trees[treeIndex].isFalling = true;
                moneyValue += 100;
                money.textContent = "💸 " + moneyValue;
                // Play the sound
                if (fallSoundBuffer) {
                    fallSound.setBuffer(fallSoundBuffer);
                    fallSound.setVolume(0.5);
                    fallSound.play();
                }
            }

            //Removing trees 
            trees.forEach((tree, index) => {
                if (tree.removed) {
                    trees.splice(index,1);
                }
            });
        }
    }

    updateSounds(trees.length);
}

// Set up orbit controls for rotation
let isDragging = false;
let previousMousePosition = {
    x: 0,
    y: 0
};

function onMouseDown(event) {
    isDragging = true;
    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
    event.preventDefault();
}

function setCameraDistance(dist) {
    camera.position.set(0, 0, 0);
    const direction = new THREE.Vector3();
    camera.position.add(camera.getWorldDirection(direction));
    camera.position.multiplyScalar(-dist);
    camera.lookAt(0, 0, 0);
}

function onMouseMove(event) {
    if (isDragging) {
        const deltaMove = {
            x: event.clientX - previousMousePosition.x,
            y: event.clientY - previousMousePosition.y
        };

        // Rotate camera instead of scene (attempt to fix raycast problem)
        const dist = camera.position.length();
        camera.rotateY(-deltaMove.x*0.005);
        const quat = camera.quaternion.clone();
        camera.rotateX(-deltaMove.y*0.005);
        setCameraDistance(dist);
        // weird behavior when i try to constrain camera's rotation by camera.rotation,
        // doing it by position instead
        if (camera.position.y > dist*3/4 || camera.position.y < dist/8) {
            camera.quaternion.copy(quat);
            setCameraDistance(dist);
        }
        
        previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    }
}

function onMouseUp(event) {
    isDragging = false;
}

// Add event listeners
window.addEventListener('mousedown', onMouseDown, false);
window.addEventListener('mousemove', onMouseMove, false);
window.addEventListener('mouseup', onMouseUp, false);
window.addEventListener('click', onMouseClick, false);

// Handle window resize
window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

// Handle creating birds after tree is destroyed
function createBirds(position) {
    const birdCount = Math.floor(Math.random() * 3) + 1; // Random between 1 and 3 birds
    const birds = [];

    for (let i = 0; i < birdCount; i++) {
        const birdGeometry = new THREE.ConeGeometry(0.2, 0.5, 4);
        const birdMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const bird = new THREE.Mesh(birdGeometry, birdMaterial);
        
        bird.position.set(
            position.x + (Math.random() - 0.5) * 1.5, // birds placed randomly
            position.y + 1, // Bird start above tree slightly
            position.z + (Math.random() - 0.5) * 1.5
        );

        scene.add(bird);
        birds.push(bird);
    }

    function animateBirds() {
        let frame = 0;
        function move() {
            frame++;

            birds.forEach((bird, index) => {
                bird.position.y += 0.05; 
                bird.position.x += (Math.random() - 0.5) * 0.02; 
                bird.position.z += (Math.random() - 0.5) * 0.02;

                if (frame > 100) { 
                    scene.remove(bird);
                    birds.splice(index, 1);
                }
            });

            if (birds.length > 0) {
                requestAnimationFrame(move);
            }
        }

        move();
    }

    animateBirds();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Handle falling trees
    trees.forEach((tree, index) => {
        if (tree.isFalling) {
            if (tree.fallAngle < Math.PI / 2) {
                // Continue falling animation
                tree.fallAngle += 0.05;
                
                // Apply rotation based on fall direction
                tree.group.rotation.set(
                    Math.sin(tree.fallDirection) * tree.fallAngle,
                    0,
                    Math.cos(tree.fallDirection) * tree.fallAngle
                );
                
                // Move the tree down slightly as it falls
                const fallProgress = Math.sin(tree.fallAngle);
                tree.group.position.y = -fallProgress * 1.5;
            } else {
                // Complete fall and remove tree
                setTimeout(() => {
                    scene.remove(tree.group);
                    tree.removed = true;
                }, 500);
            }
            if (!tree.birdsSpawned) { // Makes birds spawn once each time a tree falls
                createBirds(tree.group.position);
                tree.birdsSpawned = true; // Mark as triggered so birds spawn once
            }
        }
        
        // Handle growing trees
        if (tree.isGrowing) {
            if (tree.growthProgress < 1) {
                // Continue growth animation
                tree.growthProgress += 0.02;
                
                // Ease function for smoother animation
                const easeOutQuad = function(t) { return t * (2 - t); };
                const scaleFactor = easeOutQuad(tree.growthProgress)*tree.targetScale;
                
                // Scale the tree
                tree.group.scale.set(scaleFactor, scaleFactor, scaleFactor);
                
                // Small random movement to simulate growth spurts
                const wiggle = Math.sin(tree.growthProgress * 10) * 0.05;
                tree.group.rotation.x = wiggle;
                tree.group.rotation.z = wiggle;
            } else {
                // Growth complete
                tree.isGrowing = false;
                tree.group.scale.set(
                    tree.targetScale,
                    tree.targetScale,
                    tree.targetScale
                );
                tree.group.rotation.set(0, 0, 0);
            }
        }
    });
    
    renderer.render(scene, camera);
}

animate();