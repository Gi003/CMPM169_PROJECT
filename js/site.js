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

// Create a Grass Plane for the ground
const grassGeometry = new THREE.PlaneGeometry(50, 50);
const grassMaterial = new THREE.MeshStandardMaterial({
    color: 0x7CFC00,
    side: THREE.DoubleSide
});
const grass = new THREE.Mesh(grassGeometry, grassMaterial);
grass.rotation.x = -Math.PI / 2;
grass.position.y = 0.001;
scene.add(grass);

// Create a Dirt Box for the ground
const groundGeometry = new THREE.BoxGeometry(50, 50, 5);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x725d4c,
    side: THREE.DoubleSide
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -2.5; // Box origin offset from top face
scene.add(ground);

// Create trees
const trees = [];
const numTrees = 20;

// Create an AudioListener and add it to the camera
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
audioLoader.load('https://cdnjs.cloudflare.com/mock-audio.mp3', function(buffer) {
    fallSoundBuffer = buffer;
    growSoundBuffer = buffer; // Using the same buffer for simplicity
}, function() {}, function(error) {
    console.error('Error loading sound:', error);
    // Create a fallback audio context for sound simulation
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    fallSoundBuffer = audioContext.createBuffer(1, 44100, 44100);
    const bufferData = fallSoundBuffer.getChannelData(0);
    for (let i = 0; i < bufferData.length; i++) {
        bufferData[i] = Math.random() * 2 - 1;
    }
    
    growSoundBuffer = audioContext.createBuffer(1, 44100, 44100);
    const growBufferData = growSoundBuffer.getChannelData(0);
    for (let i = 0; i < growBufferData.length; i++) {
        growBufferData[i] = Math.sin(i * 0.01) * Math.random() * 0.5;
    }
});

function createSimpleTree(x, z, withAnimation = false) {
    const group = new THREE.Group();
    
    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.4, 2, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1; // Half height of trunk
    group.add(trunk);
    
    // Tree top (cone)
    const topGeometry = new THREE.ConeGeometry(1, 3, 8);
    const topMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 3.5; // Height of trunk (2) + half height of cone (1.5)
    group.add(top);
    
    // Set tree position
    group.position.set(x, 0, z);
    
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
    }
    
    scene.add(group);
    
    // Add to trees array with additional properties
    const treeObj = {
        group: group,
        isFalling: false,
        isGrowing: withAnimation,
        growthProgress: 0,
        fallAngle: 0,
        fallDirection: Math.random() * Math.PI * 2, // Random direction to fall
        removed: false
    };
    
    trees.push(treeObj);
    return treeObj;
}

const gltfLoader = new THREE.GLTFLoader();

async function createTreeFromModel(src, x, z, withAnimation = false) {
    const model =
        await new Promise((resolve, reject) =>
            gltfLoader.load(src, resolve, () => {}, reject));
    const group = new THREE.Group();
    group.add(model.scene);
    group.position.set(x, 0, z);
    if (withAnimation) {
        group.scale.set(0, 0, 0);
        if (growSoundBuffer) {
            growSound.setBuffer(growSoundBuffer);
            growSound.setVolume(0.3);
            growSound.setPlaybackRate(1.5); // Higher pitch for growth
            growSound.play();
        }
    }
    scene.add(group);
    const treeObj = {
        group: group,
        isFalling: false,
        isGrowing: withAnimation,
        growthProgress: 0,
        fallAngle: 0,
        fallDirection: Math.random() * Math.PI * 2, // Random direction to fall
        removed: false
    };
    trees.push(treeObj);
    return treeObj;
}

const treeCreators = [
    (...args) =>
        createSimpleTree(...args),
    (...args) =>
        createTreeFromModel("./models/tree1.glb", ...args),
    (...args) =>
        createTreeFromModel("./models/tree2.glb", ...args),
    (...args) =>
        createTreeFromModel("./models/tree3.glb", ...args)
];

function createTree(...args) {
    treeCreators[
        Math.floor(Math.random()*treeCreators.length)%treeCreators.length
    ](...args);
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

function onMouseClick(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
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
                
                // Play the sound
                if (fallSoundBuffer) {
                    fallSound.setBuffer(fallSoundBuffer);
                    fallSound.setVolume(0.5);
                    fallSound.play();
                }
            }
        }
    }
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

function onMouseMove(event) {
    if (isDragging) {
        const deltaMove = {
            x: event.clientX - previousMousePosition.x,
            y: event.clientY - previousMousePosition.y
        };
        
        // Rotate scene based on mouse movement
        scene.rotation.y += deltaMove.x * 0.01;
        
        // Limit vertical rotation to prevent flipping
        const potentialRotation = scene.rotation.x + deltaMove.y * 0.01;
        if (potentialRotation < Math.PI/4 && potentialRotation > -Math.PI/4) {
            scene.rotation.x = potentialRotation;
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
        }
        
        // Handle growing trees
        if (tree.isGrowing) {
            if (tree.growthProgress < 1) {
                // Continue growth animation
                tree.growthProgress += 0.02;
                
                // Ease function for smoother animation
                const easeOutQuad = function(t) { return t * (2 - t); };
                const scaleFactor = easeOutQuad(tree.growthProgress);
                
                // Scale the tree
                tree.group.scale.set(scaleFactor, scaleFactor, scaleFactor);
                
                // Small random movement to simulate growth spurts
                const wiggle = Math.sin(tree.growthProgress * 10) * 0.05;
                tree.group.rotation.x = wiggle;
                tree.group.rotation.z = wiggle;
            } else {
                // Growth complete
                tree.isGrowing = false;
                tree.group.scale.set(1, 1, 1);
                tree.group.rotation.set(0, 0, 0);
            }
        }
    });
    
    renderer.render(scene, camera);
}

animate();
