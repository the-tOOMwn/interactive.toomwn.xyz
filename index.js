const sensitivity = 400; // larger is slower

var canvas = document.getElementById("renderCanvas");

var keyboard = {}; // This records what keys were pressed (used for movement and stuff)
var sprint = 0; // used for sprinting
var vy = 0; // Vertical velocity (used for jumping and physics)
var r = {x:0, y:0} // rotation
var typeing = false; // whether movement commands are ignored
var windR = 0; // wind direction
var windS = 0.1; // wind speed
var cdist = 1500; // cloud spread
const mapsize = 500; // Size of the map

// records keypresses
window.onkeyup = function(e) { keyboard[e.key.toLowerCase()] = false; }
window.onkeydown = function(e) { keyboard[e.key.toLowerCase()] = true; }

var isPointerLocked = false; // whether pointer is hidden

// rotation and hiding mouse pointer stuff
canvas.addEventListener("mousemove", e => {
r.x = e.movementX;
r.y = e.movementY;
});

canvas.addEventListener("click", async () => {
if(!isPointerLocked) {
    await canvas.requestPointerLock({
        unadjustedMovement: true,
    });
}
});

document.addEventListener("pointerlockchange", function() {
    isPointerLocked = !isPointerLocked;
});

var startRenderLoop = function (engine, canvas) {
    engine.runRenderLoop(function () {
        if (sceneToRender && sceneToRender.activeCamera) {
            sceneToRender.render();
        }
    });
}

var engine = null;
var scene = null;
var sceneToRender = null;
var createDefaultEngine = function() { return new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true,  disableWebGL2Support: false}); };
var createScene = function () {

// default values

var musicvalue = 1

// This creates a basic Babylon Scene object (non-mesh)
var scene = new BABYLON.Scene(engine);

var camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 5, -10), scene);

// by default all music plays at volume
var musicvalue = 1

camera.speed = 0.2
camera.minZ = 0.01
camera.position.y = 4 // double the height of the ellipsoid for some reason

const assumedFramesPerSecond = 60;
const earthGravity = -9.81;
scene.gravity = new BABYLON.Vector3(0, earthGravity / assumedFramesPerSecond, 0);
camera.applyGravity = true;

camera.ellipsoid = new BABYLON.Vector3(0.7, 2, 0.7);

scene.collisionsEnabled = true;
camera.checkCollisions = true;

// This targets the camera to scene origin
camera.setTarget(BABYLON.Vector3.Zero());

// create a flat ground
var ground = BABYLON.MeshBuilder.CreateGround("ground", {width: mapsize, height: mapsize, subdivisions: mapsize/2}, scene);

// get the vertex data from the ground mesh
var vertexData = BABYLON.VertexData.ExtractFromMesh(ground);

// modify the height of each vertex randomly
var positions = vertexData.positions;
for (var i = 0; i < positions.length; i += 3) {
    positions[i + 1] = Math.random()/3;
}

// apply the modified vertex data to the ground mesh
vertexData.applyToMesh(ground);

const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
groundMaterial.emissiveColor = new BABYLON.Color4(0.8359375, 0.4140625, 0.234375)
ground.material = groundMaterial;
ground.checkCollisions = true;

// This creates a light, aiming 0,1,0 - to the sky (non-mesh)
var light = new BABYLON.HemisphericLight("HemiLight", new BABYLON.Vector3(0, 250, 0), scene)
// const light = new BABYLON.PointLight("pointLight", new BABYLON.Vector3(1, 50, 1), scene)
light.diffuse = new BABYLON.Color3(1, 1, 1);

// Default intensity is 1. Let's dim the light a small amount
light.intensity = 1;

light.setEnabled(true)

light.excludedMeshes.push(ground)

scene.clearColor = new BABYLON.Color3(89/256, 147/256, 255/256) // The colour of the sky

// White clouds
scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
scene.fogColor = new BABYLON.Color3(0.9, 0.9, 0.9);
scene.fogDensity = 0.01;

// just adding a box
const box = BABYLON.SceneLoader.ImportMesh("", "models/", "soundbox.obj", scene, function(newMeshes){
newMeshes[0].scaling = new BABYLON.Vector3(1, 1, 1);
newMeshes[0].position = new BABYLON.Vector3(0, 10, 10);
newMeshes[0].checkCollisions = true;
});

const soundbox = BABYLON.SceneLoader.ImportMesh("", "models/", "soundbox.obj", scene, function(newMeshes){
    newMeshes[0].position = new BABYLON.Vector3(0, 1, 0);
    newMeshes[0].checkCollisions = true;
});

const music1 = new BABYLON.Sound("Music", "music/verslaflamme.mp3"/*"music/e.wav"*/, scene, null, {
    loop: true,
    autoplay: true,
    volume: 0.4 * musicvalue,
    spatialSound: true,
    distanceModel: "exponential",
    rolloffFactor: 1.1,
});

music1.setPosition(new BABYLON.Vector3(0, 1, 0));

// create materials
var sandMaterial = new BABYLON.StandardMaterial("sandMaterial", scene);
sandMaterial.diffuseColor = new BABYLON.Color3(0.82, 0.66, 0.42);

var rockMaterial = new BABYLON.StandardMaterial("rockMaterial", scene);
rockMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);

var cactusMaterial = new BABYLON.StandardMaterial("cactusMaterial", scene);
cactusMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0);

var cloudMaterial = new BABYLON.StandardMaterial("cloudMaterial", scene);
cloudMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
cloudMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);

var rocks = [];
var clouds = [];
var cacti = [];
var buildings = [];

function addRock(cx, cz, r, noRotate=false) {
    var x = (2+Math.random()*2-1)*0.1;
    var y = 0.25;
    var z = (2+Math.random()*2-1)*0.1;
    var rx = noRotate? 0 : Math.random()*Math.PI/24;
    var ry = noRotate? 0 : Math.PI*2*Math.random();
    var rock = BABYLON.MeshBuilder.CreateBox("box", { width: x, height: y, depth: z }, scene);
    rock.material = rockMaterial;
    rock.position = new BABYLON.Vector3(cx+Math.random()*r*2-r, Math.random()/5, cz+Math.random()*r*2-r);
    rock.rotation.x = rx;
    rock.rotation.y = ry;
    rocks.push(rock);
}

function addBoulder(cx, cz, r, noRotate=false) {
    var x = (2+Math.random()*2-1)*0.2;
    var y = 0.4;
    var z = (2+Math.random()*2-1)*0.2;
    var rx = noRotate? 0 : Math.random()*Math.PI/24;
    var ry = noRotate? 0 : Math.PI*2*Math.random();
    var rock = BABYLON.MeshBuilder.CreateBox("box", { width: x, height: y, depth: z }, scene);
    rock.material = rockMaterial;
    rock.position = new BABYLON.Vector3(cx+Math.random()*r*2-r, Math.random()/3, cz+Math.random()*r*2-r);
    rock.rotation.x = rx;
    rock.rotation.y = ry;
    rocks.push(rock);
}

function addCloud(cx, cz, r, h, noRotate=false) {
    var x = (2+Math.random()*2-1)*10;
    var y = 2+Math.random()*4;
    var z = (2+Math.random()*2-1)*10;
    var ry = noRotate? 0 : Math.PI*2*Math.random();
    var cloud = BABYLON.MeshBuilder.CreateBox("box", { width: x, height: y, depth: z }, scene);
    cloud.material = cloudMaterial;
    cloud.position = new BABYLON.Vector3(cx+Math.random()*r*2-r, h, cz+Math.random()*r*2-r);
    cloud.rotation.y = ry;
    clouds.push(cloud);
}

function addLight(x, y, z) { // obsolete
    var light = new BABYLON.HemisphericLight("HemiLight", new BABYLON.Vector3(x,y,z), scene);
    light.position = new BABYLON.Vector3(x, y, z);
    light.direction = new BABYLON.Vector3(0, -1, 0);
    light.diffuse = new BABYLON.Color3(1, 1, 1);
    light.excludedMeshes.push(ground);
    light.intensity = 0.1;
    light.setEnabled(true);
    console.log(light.position.x, light.position.y, light.position.z);
    clouds.push(light);
}

function addCactus(cx, cz, r, noRotate=false) {
    var dim = 0.2+Math.random()*0.1;
    var y = 8;
    var ry = noRotate? 0 : Math.PI*2*Math.random();
    var cactusBody = BABYLON.MeshBuilder.CreateBox("box", { width: dim, height: y, depth: dim }, scene);
    cactusBody.material = cactusMaterial;
    cactusBody.position = new BABYLON.Vector3(cx+Math.random()*r*2-r, Math.random(), cz+Math.random()*r*2-r);
    cactusBody.rotation.y = ry;
    cacti.push(cactusBody);
    var h1 = 0.3+Math.random()*0.75;
    // first arm
    var cactusArm1 = BABYLON.MeshBuilder.CreateBox("box", { width: dim, height: dim, depth: 0.6}, scene);
    cactusArm1.material = cactusMaterial;
    cactusArm1.position = new BABYLON.Vector3(Math.sin(cactusBody.rotation.y)*0.4, 0, Math.cos(cactusBody.rotation.y)*0.4).addInPlace(cactusBody.position);
    cactusArm1.position.y = 1 + Math.random()*2;
    cactusArm1.rotation.y = ry;
    cacti.push(cactusArm1);
    var cactusArm12 = BABYLON.MeshBuilder.CreateBox("box", { width: dim, height: h1, depth: dim}, scene);
    cactusArm12.material = cactusMaterial;
    cactusArm12.position = new BABYLON.Vector3(Math.sin(cactusBody.rotation.y)*0.567, 0, Math.cos(cactusBody.rotation.y)*0.567).addInPlace(cactusBody.position);
    cactusArm12.position.y = 0.1 + h1/2 + cactusArm1.position.y;
    console.log(cactusArm12.position.y);
    cactusArm12.rotation.y = ry;
    cacti.push(cactusArm12);
    // Second arm
    if (Math.random() > 0.75) {
        var cactusArm2 = BABYLON.MeshBuilder.CreateBox("box", { width: dim, height: dim, depth: 0.6}, scene);
        cactusArm2.material = cactusMaterial;
        cactusArm2.position = new BABYLON.Vector3(-Math.sin(cactusBody.rotation.y)*0.4, 0, -Math.cos(cactusBody.rotation.y)*0.4).addInPlace(cactusBody.position);
        cactusArm2.position.y = 1 + Math.random()*2;
        cactusArm2.rotation.y = ry;
        cacti.push(cactusArm2);
        var h2 = h1 + (Math.random()-0.5)/4;
        var cactusArm22 = BABYLON.MeshBuilder.CreateBox("box", { width: dim, height: h2, depth: dim}, scene);
        cactusArm22.material = cactusMaterial;
        cactusArm22.position = new BABYLON.Vector3(-Math.sin(cactusBody.rotation.y)*0.567, 0, -Math.cos(cactusBody.rotation.y)*0.567).addInPlace(cactusBody.position);
        cactusArm22.position.y = 0.1 + h2/2 + cactusArm2.position.y;
        console.log(cactusArm22.position.y);
        cactusArm22.rotation.y = ry;
        cacti.push(cactusArm22);
    }
}

// Chat gpt made this trashy spaceship
function addSpaceship() {
    // Create Spaceship (if I don't comment this now, i'll forget what it is supposed to be)
    var body = new BABYLON.MeshBuilder.CreateBox("body", { width: 4, height: 1.5, depth: 2 }, scene);
    var cockpit = new BABYLON.MeshBuilder.CreateBox("cockpit", { width: 1, height: 0.8, depth: 1.2 }, scene);
    var engine1 = new BABYLON.MeshBuilder.CreateBox("engine1", { width: 1, height: 0.6, depth: 1 }, scene);
    var engine2 = new BABYLON.MeshBuilder.CreateBox("engine2", { width: 1, height: 0.6, depth: 1 }, scene);
    var wing1 = new BABYLON.MeshBuilder.CreateBox("wing1", { width: 0.5, height: 0.1, depth: 3 }, scene);
    var wing2 = new BABYLON.MeshBuilder.CreateBox("wing2", { width: 0.5, height: 0.1, depth: 3 }, scene);
    var fin = new BABYLON.MeshBuilder.CreateBox("fin", { width: 0.1, height: 1, depth: 2 }, scene);

    body.position.y = 0.75;
    cockpit.position.x = -1.5;
    cockpit.position.y = 0.5;
    cockpit.position.z = 0.2;

    engine1.position.x = 1.5;
    engine1.position.y = -0.3;

    engine2.position.x = 1.5;
    engine2.position.y = 0.3;

    wing1.position.x = 2;
    wing1.position.y = 0.5;
    wing1.position.z = 0.5;

    wing2.position.x = 2;
    wing2.position.y = 0.5;
    wing2.position.z = -0.5;

    fin.position.y = 0.75;
    fin.position.z = -1;

    // Set Materials
    var bodyMaterial = new BABYLON.StandardMaterial("bodyMaterial", scene);
    bodyMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.2, 0.2);
    body.material = bodyMaterial;

    var cockpitMaterial = new BABYLON.StandardMaterial("cockpitMaterial", scene);
    cockpitMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);
    cockpit.material = cockpitMaterial;

    var engineMaterial = new BABYLON.StandardMaterial("engineMaterial", scene);
    engineMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
    engine1.material = engineMaterial;
    engine2.material = engineMaterial;

    var wingMaterial = new BABYLON.StandardMaterial("wingMaterial", scene);
    wingMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
    wing1.material = wingMaterial;
    wing2.material = wingMaterial;

    var finMaterial = new BABYLON.StandardMaterial("finMaterial", scene);
    finMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    fin.material = finMaterial;

    // Move Spaceship
    body.position.addInPlace(new BABYLON.Vector3(10, 1, 10));
    cockpit.position.addInPlace(new BABYLON.Vector3(10, 1, 10));
    engine1.position.addInPlace(new BABYLON.Vector3(10, 1, 10));
    engine2.position.addInPlace(new BABYLON.Vector3(10, 1, 10));
    wing1.position.addInPlace(new BABYLON.Vector3(10, 1, 10));
    wing2.position.addInPlace(new BABYLON.Vector3(10, 1, 10));
    fin.position.addInPlace(new BABYLON.Vector3(10, 1, 10));
}

for (var i = 0; i < mapsize**2/100; i += 1) { // add rocks to the map
    addRock(0,0,mapsize/2);
}

for (var i = 0; i < mapsize**2/1000; i += 1) { // add cacti to the map
    addCactus(0,0,mapsize/2);
}

var maxx = cdist;
var maxz = cdist;
for (var i = 0; i < 75+Math.random()*75; i += 1) { // add clouds to the map (1 cloud is a group of small subclouds)
    var x = Math.random()*maxx*2-maxx;
    var z = Math.random()*maxz*2-maxz;
    var h = 150 + Math.random()*50;
    var size = 10+Math.random()*30
    for (var j = 0; j < size; j += 1) {
        addCloud(x,z,size,h,true);
    }
    //addLight(x,h-1,z);
}

maxx = 250;
maxz = 250;
for (var i = 0; i < 20+Math.random()*5; i += 1) { // add boulders (more complex rocks that will eventually have collision)
    var x = Math.random()*maxx*2-maxx;
    var z = Math.random()*maxz*2-maxz;
    var size = 24+Math.random()*18;
    for (var j = 0; j < size; j += 1) {
        addBoulder(x,z,size/64);
    }
    for (var j = 0; j < size*2; j += 1) {
        addRock(x,z,size/48);
    }
}

// Construct all the member's houses


function rect(w, h, d, x, y, z, rx, ry, material, x2, y2, z2, rx2, ry2,) {
    var block = BABYLON.MeshBuilder.CreateBox("box", { width: w, height: h, depth: d}, scene);
    switch (material) {
        case 0:
            var a = new BABYLON.StandardMaterial("0Material", scene);
            a.diffuseColor = new BABYLON.Color3(0.8, 0.9, 1);
            cloudMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
            block.material = a;
            break;
        case 1:
            var a = new BABYLON.StandardMaterial("1Material", scene);
            a.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
            block.material = a;
            break;
        case 2:
            var a = new BABYLON.StandardMaterial("2Material", scene);
            a.diffuseColor = new BABYLON.Color3(0.8, 0.8, 1);
            block.material = a;
            break;
        case 3:
            var a = new BABYLON.StandardMaterial("3Material", scene);
            a.diffuseColor = new BABYLON.Color3(1, 1, 1);
            block.material = a;
            break;
        case 4:
            var a = new BABYLON.StandardMaterial("4Material", scene);
            a.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);
            block.material = a;
            break;
        case 5:
            var a = new BABYLON.StandardMaterial("5Material", scene);
            a.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.3);
            block.material = a;
            break;
        default:
            var a = new BABYLON.StandardMaterial("-1Material", scene);
            a.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.5);
            block.material = a;
            break;
    }
    block.position = new BABYLON.Vector3(x + x2, y + y2, z + z2);
    block.rotation.x = rx + rx2;
    block.rotation.y = ry + ry2;
    buildings.push(block);
    return;
}

function basicDoor(x, y, z, rx, ry) {
    rect(1.75, 3, 0.25, 0, 2, 0.01, 0, 0, 1, x, y, z , rx, ry);
    rect(1.75, 0.25, 0.25, 0, 0.625, 0.125, 0, 0, 4, x, y, z , rx, ry);
    rect(1.75, 0.25, 0.25, 0, 3.375, 0.125, 0, 0, 4, x, y, z , rx, ry);
    rect(0.25, 3, 0.25, 0.75, 2, 0.125, 0, 0, 4, x, y, z , rx, ry);
    rect(0.25, 3, 0.25, -0.75, 2, 0.125, 0, 0, 4, x, y, z , rx, ry);
    rect(0.25, 3, 0.25, 0, 2, 0.125, 0, 0, 4, x, y, z , rx, ry);
    rect(1.75, 0.25, 0.25, 0, 2, 0.125, 0, 0, 4, x, y, z , rx, ry);
    rect(0.1, 0.1, 0.1, -0.72, 2, 0.35, 0, 0, 5, x, y, z , rx, ry);
    rect(0.05, 0.05, 0.15, -0.72, 2, 0.275, 0, 0, 5, x, y, z , rx, ry);
    return;
}

function basicWindow(x, y, z, rx, ry) {
    rect(1.75, 1.75, 0.25, 0, 1.5, 0.01, 0, 0, 0, x, y, z , rx, ry);
    rect(1.75, 0.25, 0.25, 0, 0.75, 0.125, 0, 0, 4, x, y, z , rx, ry);
    rect(1.75, 0.25, 0.25, 0, 2.25, 0.125, 0, 0, 4, x, y, z , rx, ry);
    rect(0.25, 1.75, 0.25, 0.75, 1.5, 0.125, 0, 0, 4, x, y, z , rx, ry);
    rect(0.25, 1.75, 0.25, -0.75, 1.5, 0.125, 0, 0, 4, x, y, z , rx, ry);
    return;
}

function basicHouse(x, y, z, rx, ry) {
    // Main Structure
    rect(16, 1, 36, 0, 0, 0, 0, 0, 1, x, y, z , rx, ry);
    rect(14, 5, 0.25, 0, 3, -17, 0, 0, 2, x, y, z , rx, ry);
    rect(14, 5, 0.25, 0, 3, 17, 0, 0, 2, x, y, z , rx, ry);
    rect(0.25, 5, 34, -7, 3, 0, 0, 0, 2, x, y, z , rx, ry);
    rect(0.25, 5, 34, 7, 3, 0, 0, 0, 2, x, y, z , rx, ry);
    rect(0.5, 5, 0.5, 7.25, 3, 17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 5, 0.5, 7.25, 3, -17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 5, 0.5, -7.25, 3, 17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 5, 0.5, -7.25, 3, -17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 5, 0.5, -7.25, 3, -17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 0.5, 34, -7.25, 5.25, 0, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 0.5, 34, 7.25, 5.25, 0, 0, 0, 3, x, y, z , rx, ry);
    rect(14, 0.5, 0.5, 0, 5.25, 17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(14, 0.5, 0.5, 0, 5.25, -17.25, 0, 0, 3, x, y, z , rx, ry);
    basicDoor(x, y, z+17, rx, ry)
    basicWindow(x+3, y+0.5, z+17, rx, ry);
    basicWindow(x+3, y+2, z+17, rx, ry);
    basicWindow(x+4.5, y+0.5, z+17, rx, ry);
    basicWindow(x+4.5, y+2, z+17, rx, ry);
    basicWindow(x-3, y+0.5, z+17, rx, ry);
    basicWindow(x-3, y+2, z+17, rx, ry);
    basicWindow(x-4.5, y+0.5, z+17, rx, ry);
    basicWindow(x-4.5, y+2, z+17, rx, ry);
    rect(3.5, 0.25, 0.5, -3.75, 1.225, 17.375, 0, 0, 3, x, y, z , rx, ry);
    rect(3.5, 0.25, 0.5, 3.75, 1.225, 17.375, 0, 0, 3, x, y, z , rx, ry);
    return;
}

function house1(x, y, z, rx, ry) {
    // Main Structure
    rect(16, 1, 36, 0, 0, 0, 0, 0, 1, x, y, z , rx, ry);
    rect(14, 5, 0.25, 0, 3, -17, 0, 0, 2, x, y, z , rx, ry);
    rect(14, 5, 0.25, 0, 3, 17, 0, 0, 2, x, y, z , rx, ry);
    rect(0.25, 5, 34, -7, 3, 0, 0, 0, 2, x, y, z , rx, ry);
    rect(0.25, 5, 34, 7, 3, 0, 0, 0, 2, x, y, z , rx, ry);
    rect(0.5, 5, 0.5, 7.25, 3, 17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 5, 0.5, 7.25, 3, -17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 5, 0.5, -7.25, 3, 17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 5, 0.5, -7.25, 3, -17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 5, 0.5, -7.25, 3, -17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 0.5, 34, -7.25, 5.25, 0, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 0.5, 34, 7.25, 5.25, 0, 0, 0, 3, x, y, z , rx, ry);
    rect(14, 0.5, 0.5, 0, 5.25, 17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(14, 0.5, 0.5, 0, 5.25, -17.25, 0, 0, 3, x, y, z , rx, ry);
    basicDoor(x, y, z+17, rx, ry)
    basicWindow(x+3, y+0.5, z+17, rx, ry);
    basicWindow(x+3, y+2, z+17, rx, ry);
    basicWindow(x+4.5, y+0.5, z+17, rx, ry);
    basicWindow(x+4.5, y+2, z+17, rx, ry);
    basicWindow(x-3, y+0.5, z+17, rx, ry);
    basicWindow(x-3, y+2, z+17, rx, ry);
    basicWindow(x-4.5, y+0.5, z+17, rx, ry);
    basicWindow(x-4.5, y+2, z+17, rx, ry);
    rect(3.5, 0.25, 0.5, -3.75, 1.225, 17.375, 0, 0, 3, x, y, z , rx, ry);
    rect(3.5, 0.25, 0.5, 3.75, 1.225, 17.375, 0, 0, 3, x, y, z , rx, ry);
    return;
}

function house2(x, y, z, rx, ry) {
    // Main Structure
    rect(16, 1, 36, 0, 0, 0, 0, 0, 1, x, y, z , rx, ry);
    rect(14, 5, 0.25, 0, 3, -17, 0, 0, 2, x, y, z , rx, ry);
    rect(14, 5, 0.25, 0, 3, 17, 0, 0, 2, x, y, z , rx, ry);
    rect(0.25, 5, 34, -7, 3, 0, 0, 0, 2, x, y, z , rx, ry);
    rect(0.25, 5, 34, 7, 3, 0, 0, 0, 2, x, y, z , rx, ry);
    rect(0.5, 5, 0.5, 7.25, 3, 17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 5, 0.5, 7.25, 3, -17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 5, 0.5, -7.25, 3, 17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 5, 0.5, -7.25, 3, -17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 5, 0.5, -7.25, 3, -17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 0.5, 34, -7.25, 5.25, 0, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 0.5, 34, 7.25, 5.25, 0, 0, 0, 3, x, y, z , rx, ry);
    rect(14, 0.5, 0.5, 0, 5.25, 17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(14, 0.5, 0.5, 0, 5.25, -17.25, 0, 0, 3, x, y, z , rx, ry);
    basicDoor(x, y, z+17, rx, ry)
    basicWindow(x+3, y+0.5, z+17, rx, ry);
    basicWindow(x+3, y+2, z+17, rx, ry);
    basicWindow(x+4.5, y+0.5, z+17, rx, ry);
    basicWindow(x+4.5, y+2, z+17, rx, ry);
    basicWindow(x-3, y+0.5, z+17, rx, ry);
    basicWindow(x-3, y+2, z+17, rx, ry);
    basicWindow(x-4.5, y+0.5, z+17, rx, ry);
    basicWindow(x-4.5, y+2, z+17, rx, ry);
    rect(3.5, 0.25, 0.5, -3.75, 1.225, 17.375, 0, 0, 3, x, y, z , rx, ry);
    rect(3.5, 0.25, 0.5, 3.75, 1.225, 17.375, 0, 0, 3, x, y, z , rx, ry);
    return;
}

function house3(x, y, z, rx, ry) {
    // Main Structure
    rect(16, 1, 36, 0, 0, 0, 0, 0, 1, x, y, z , rx, ry);
    rect(14, 5, 0.25, 0, 3, -17, 0, 0, 2, x, y, z , rx, ry);
    rect(14, 5, 0.25, 0, 3, 17, 0, 0, 2, x, y, z , rx, ry);
    rect(0.25, 5, 34, -7, 3, 0, 0, 0, 2, x, y, z , rx, ry);
    rect(0.25, 5, 34, 7, 3, 0, 0, 0, 2, x, y, z , rx, ry);
    rect(0.5, 5, 0.5, 7.25, 3, 17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 5, 0.5, 7.25, 3, -17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 5, 0.5, -7.25, 3, 17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 5, 0.5, -7.25, 3, -17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 5, 0.5, -7.25, 3, -17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 0.5, 34, -7.25, 5.25, 0, 0, 0, 3, x, y, z , rx, ry);
    rect(0.5, 0.5, 34, 7.25, 5.25, 0, 0, 0, 3, x, y, z , rx, ry);
    rect(14, 0.5, 0.5, 0, 5.25, 17.25, 0, 0, 3, x, y, z , rx, ry);
    rect(14, 0.5, 0.5, 0, 5.25, -17.25, 0, 0, 3, x, y, z , rx, ry);
    basicDoor(x, y, z+17, rx, ry);
    basicWindow(x+3, y+0.5, z+17, rx, ry);
    basicWindow(x+3, y+2, z+17, rx, ry);
    basicWindow(x+4.5, y+0.5, z+17, rx, ry);
    basicWindow(x+4.5, y+2, z+17, rx, ry);
    basicWindow(x-3, y+0.5, z+17, rx, ry);
    basicWindow(x-3, y+2, z+17, rx, ry);
    basicWindow(x-4.5, y+0.5, z+17, rx, ry);
    basicWindow(x-4.5, y+2, z+17, rx, ry);
    rect(3.5, 0.25, 0.5, -3.75, 1.225, 17.375, 0, 0, 3, x, y, z , rx, ry);
    rect(3.5, 0.25, 0.5, 3.75, 1.225, 17.375, 0, 0, 3, x, y, z , rx, ry);
    return;
}

basicHouse(-25, 0, -50, 0, 0);

house1(25, 0, -50, 0, 0);

house2(-75, 0, -50, 0, 0);

house3(75, 0, -50, 0, 0);

// GUI, includes settings button
var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
const button = BABYLON.GUI.Button.CreateImageOnlyButton("settings", "images/settings.png");
button.left = "-900px";
button.top = "-450px";
button.width = "40px";
button.height = "40px";
advancedTexture.addControl(button); 

/* intermediate terminal code

window.addEventListener("keydown", function (evt) {
if (evt.keyCode === 8) {

    var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    var input = new BABYLON.GUI.InputText();
    input.width = 0.2;
    input.maxWidth = 0.2;
    input.height = "40px";
    input.text = "";
    input.color = "white";
    input.background = "black";
    advancedTexture.addControl(input); 
}

});*/

function sandstorm() {
    var particleSystem = new BABYLON.ParticleSystem("sandstorm", 10000, scene);
    particleSystem.particleTexture = new BABYLON.Texture("textures/sand3.png", scene);
    particleSystem.emitter = new BABYLON.Vector3(0, 10, 0);
    particleSystem.minEmitBox = new BABYLON.Vector3(-100, -10, -100);
    particleSystem.maxEmitBox = new BABYLON.Vector3(100, 20, 100);
    particleSystem.color1 = new BABYLON.Color4(1, 1, 1, 1);
    particleSystem.color2 = new BABYLON.Color4(1, 1, 1, 1);
    particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    particleSystem.minSize = 0.05;
    particleSystem.maxSize = 0.1;
    particleSystem.minLifeTime = 0.3;
    particleSystem.maxLifeTime = 1.5;
    particleSystem.emitRate = 5000;
    particleSystem.direction1 = new BABYLON.Vector3(2, -0.5, -0.25);
    particleSystem.direction2 = new BABYLON.Vector3(10, 0.5, 0.25);
    particleSystem.minAngularSpeed = 0;
    particleSystem.maxAngularSpeed = Math.PI;
    particleSystem.minEmitPower = 15;
    particleSystem.maxEmitPower = 30;
    particleSystem.updateSpeed = 0.005;
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
    particleSystem.start();
    return;
}

console.log(`Clouds:`, clouds.length);
console.log(`Cacti:`, cacti.length);
console.log(`Rocks:`, rocks.length);
console.log(`Buildings:`, buildings.length);
console.log(`Total entities:`, clouds.length+cacti.length+rocks.length+buildings.length);

addSpaceship(); // add a SPACESHIP to the scene. It is NOT a deformed blob.
sandstorm();

// create heart shape mesh
var cone = BABYLON.MeshBuilder.CreateCylinder("cone", {diameterTop: 0.5, height: 2, tessellation: 32}, scene);
cone.position = new BABYLON.Vector3(-20, 1, 10);
var coneMat = new BABYLON.StandardMaterial("coneMat", scene);
coneMat.diffuseColor = new BABYLON.Color3.FromHexString("#FF69B4");
cone.material = coneMat;


// Links (add more)
var links = [
    {
        name: 'Spaceship', // What is displayed (press [f] to open Testing)
        link: `https://github.com/GrimReaper2654/Spaceship-Game`, // The link
        pos: {x: 10, y: 1, z: 10}, // position of the link's hitbox
        radius: 5, // size of the link's hitbox
        active: true, // whether the link is enabled or not
    },
    {
        name: 'Shan-Mei Lore', 
        link: `https://grimreaper2654.github.io/Notes/notes/cringe/`, 
        pos: {x: 0, y: 1, z: 0}, 
        radius: 2, 
        active: true, 
    },
    {
        name: 'Shan-Mei Dating Sim', 
        link: `https://github.com/GrimReaper2654/Huynh-Dating-Simulator-EXTREME`, 
        pos: {x: -20, y: 1, z: 10}, 
        radius: 3, 
        active: true, 
    },
    {
        name: 'Edward\'s Door', 
        link: `https://edsobsidiannotes.netlify.app/`, 
        pos: {x: -25, y: 2, z: -33}, 
        radius: 5, 
        active: true, 
    },
];

//window.open(linkToOpen, "_blank");
var t=0;
scene.onBeforeRenderObservable.add(() => {
    // Rotate the camera based on the mouse movement
    if (isPointerLocked) {
        if (r.x != 0) {
            camera.rotation.y += r.x / sensitivity;
            r.x = 0;
        }
        if (r.y) {
            camera.rotation.x += r.y / sensitivity;
            r.y = 0;
        }
        console.log(`Pointer lock: Enabled`);
    } else {
        console.log(`Pointer lock: Disabled`);
        /*
        if (t%15 == 0) {
            console.log('update visuals');
            
            // create a new 2D GUI element
            var guiTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
            // create a text block and add it to the GUI
            var textBlock = new BABYLON.GUI.TextBlock();
            textBlock.text = "Click to enter the non-game game!";
            textBlock.color = "white";
            textBlock.fontSize = 72;
            guiTexture.addControl(textBlock);
            setTimeout(function() {
                guiTexture.removeControl(textBlock);
            }, 300); 
        }*/
    }
    // Links 

    for (var i = 0; i < links.length; i+=1) {
        if (Math.sqrt((camera.position.x-links[i].pos.x)**2+(camera.position.y-links[i].pos.y)**2+(camera.position.z-links[i].pos.z)**2) < links[i].radius && links[i].active == true) {
            console.log('in range');
            if (t%15 == 0) {
                var guiTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
                // create a text block and add it to the GUI
                var textBlock = new BABYLON.GUI.TextBlock();
                textBlock.text = `Press [f] to open ${links[i].name}!`;
                textBlock.color = "white";
                textBlock.fontSize = 72;
                guiTexture.addControl(textBlock);
                setTimeout(function() {
                    guiTexture.removeControl(textBlock);
                }, 500);
            }
            if (keyboard['f']) {
                window.open(links[i].link, "_blank");
                keyboard['f'] = false;
            }
        }
    }

    // move clouds
    var wind = new BABYLON.Vector3(
        Math.sin(windR) * windS,
        0,
        Math.cos(windR) * windS
    );
    wind.scaleInPlace(0.1);
    for (var i = 0; i < clouds.length; i+=1) {
        clouds[i].position.addInPlace(wind);
        if (clouds[i].position.x > camera.position.x+cdist) {
            clouds[i].position.x = camera.position.x-cdist;
        }
        if (clouds[i].position.x < camera.position.x-cdist) {
            clouds[i].position.x = camera.position.x+cdist;
        }
        if (clouds[i].position.y > camera.position.y+cdist) {
            clouds[i].position.y = camera.position.y-cdist;
        }
        if (clouds[i].position.y < camera.position.y-cdist) {
            clouds[i].position.y = camera.position.y+cdist;
        }
    }
    if (Math.random() > 0.9) {
        windR += Math.random()*Math.PI/16-Math.PI/32;
        windS += Math.random()/100-0.005;
        if (windS > 1) {
            windS = 1;
        } if (windS < 0) {
            windS = 0;
        }
    }

    // Movement vectors in horizontal plane
    var forward = new BABYLON.Vector3(
        Math.sin(camera.rotation.y) * (keyboard['shift'] == 1 ? 0.02 : 0.1),
        0,
        Math.cos(camera.rotation.y) * (keyboard['shift'] == 1 ? 0.02 : 0.1)
    );
    var right = new BABYLON.Vector3(
        Math.sin(camera.rotation.y + Math.PI / 2) * (keyboard['shift'] == 1 ? 0.02 : 0.1),
        0,
        Math.cos(camera.rotation.y + Math.PI / 2) * (keyboard['shift'] == 1 ? 0.02 : 0.1)
    );
    var forwardSprint = new BABYLON.Vector3(
        Math.sin(camera.rotation.y)*0.25,
        0,
        Math.cos(camera.rotation.y)*0.25
    );

    // basic movement in the horizontal plane
    var moveDirection = BABYLON.Vector3.Zero();
    sprint -= 1;
    if ((keyboard['arrowup'] || keyboard['w']) && typeing == false) {
        //console.log('w');
        if (sprint > 0 && sprint < 23 && keyboard['shift'] != true) {
            moveDirection.addInPlace(camera.position.y > 1 ? forwardSprint.scaleInPlace(1.2) : forwardSprint);
            sprint = 5;
        } else {
            moveDirection.addInPlace(camera.position.y > 1 ? forward.scaleInPlace(1.1) : forward);
            sprint = 25;
        }
    }
    //console.log(sprint);

    if ((keyboard['arrowdown'] || keyboard['s']) && typeing == false) {
        //console.log('s');
        moveDirection.subtractInPlace(forward);
    }
    if ((keyboard['arrowright'] || keyboard['d']) && typeing == false) {
        //console.log('d');
        moveDirection.addInPlace(right);
    }
    if ((keyboard['arrowleft'] || keyboard['a']) && typeing == false) {
        //console.log('a');
        moveDirection.subtractInPlace(right);
    }

    // Jumping
    const groundHeight = 2;
    if ((keyboard[' '] && camera.position.y <= groundHeight) && typeing == false) {
        vy += 0.2; // change this to change the jump power
    }

    if (camera.position.y > groundHeight) { 
        vy -= 0.01;
    }
    if (camera.position.y < groundHeight) { // The earth is flat (literally)
        camera.position.y = groundHeight;
        vy=0;
    }
    var vertivalMovement = new BABYLON.Vector3(0, vy, 0);
    moveDirection.addInPlace(vertivalMovement);
    // Sneaking
    var shift = new BABYLON.Vector3(0, -0.2, 0);
    if (keyboard['shift'] && typeing == false) {
        moveDirection.addInPlace(shift);
    }
    if (Math.random() > 0.1 || true) {
        camera.position.addInPlace(moveDirection);
    }
    
    //console.log(camera.position.x,camera.position.y,camera.position.z);
    t += 1; // Keep track of the current time
});

//});

/*
window.addEventListener("keydown", function (evt) {
if (evt.keyCode === 32) {
    // add jump :)
}
});
*/

/* Skybox
var skybox = BABYLON.MeshBuilder.CreateBox("skyBox", {size:100.0}, scene);
var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
skyboxMaterial.backFaceCulling = false;
skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("textures/skybox", scene);
skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
skyboxMaterial.disableLighting = true;
skybox.material = skyboxMaterial;
*/

/* monkey code

const monkeyMaterial = new BABYLON.StandardMaterial("monkeyMaterial", scene);
monkeyMaterial.emissiveColor = new BABYLON.Color4.FromHexString("#5c3004");

for(let k = 1; k<10; k++){

    for(let i = -2; i<3; i++){

        for(let j = -1; j < 3; j++) {

            BABYLON.SceneLoader.ImportMesh("", "models/", "suzanne.obj", scene, function(newMeshes){
            newMeshes[0].scaling = new BABYLON.Vector3(1, 1, 1);
            newMeshes[0].position = new BABYLON.Vector3(2.1*i, 1.1*k, 2.1*j);
            newMeshes[0].material = monkeyMaterial;
            });
        }
    }

}

*/

// this stuff is async stuff, DONT TOUCHY!!!
return scene;
};
window.initFunction = async function() {
var asyncEngineCreation = async function() {
    try {
    return createDefaultEngine();
    } 
    catch(e) {
    console.log("the available createEngine function failed. Creating the default engine instead");
    return createDefaultEngine();
    }
}

window.engine = await asyncEngineCreation();
if (!engine) throw 'engine should not be null.';
startRenderLoop(engine, canvas);
window.scene = createScene();};
initFunction().then(() => {sceneToRender = scene                    
});

// Resize
window.addEventListener("resize", function () {
    engine.resize();
});
