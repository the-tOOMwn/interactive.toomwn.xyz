const sensitivity = 400; // larger is slower

var canvas = document.getElementById("renderCanvas");

var keyboard = {}; // This records what keys were pressed (used for movement and stuff)
var sprint = 0; // used for sprinting
var vy = 0; // Vertical velocity (used for jumping and physics)
var r = {x:0, y:0} // rotation
var typeing = false; // whether movement commands are ignored
var windR = 0; // wind direction
var windS = 1; // wind speed
var cdist = 1500; // cloud area

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
camera.position.y = 1.8 // double the height of the ellipsoid for some reason

const assumedFramesPerSecond = 60;
const earthGravity = -9.81;
scene.gravity = new BABYLON.Vector3(0, earthGravity / assumedFramesPerSecond, 0);
camera.applyGravity = true;

camera.ellipsoid = new BABYLON.Vector3(0.7, 0.9, 0.7);

scene.collisionsEnabled = true;
camera.checkCollisions = true;

// This targets the camera to scene origin
camera.setTarget(BABYLON.Vector3.Zero());

// create a flat ground
var ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 200, height: 200, subdivisions: 50}, scene);

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

function addRock(cx, cz, r, noRotate=false) {
    var x = (2+Math.random()*2-1)*0.1;
    var y = 0.25;
    var z = (2+Math.random()*2-1)*0.1;
    var rx = noRotate? 0 : Math.random()*Math.PI/24;
    var ry = noRotate? 0 : Math.PI*2*Math.random();
    var rock = BABYLON.MeshBuilder.CreateBox("box", { width: x, height: y, depth: z }, scene);
    rock.material = rockMaterial;
    rock.position = new BABYLON.Vector3(cx+Math.random()*r*2-r, Math.random()/10, cz+Math.random()*r*2-r);
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
    if (Math.random() > 0.25) {
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
    }
    if (Math.random() > 0.5) {
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

for (var i = 0; i < 300; i += 1) { // add rocks to the map
    addRock(0,0,100);
}

for (var i = 0; i < 25; i += 1) { // add cacti to the map
    addCactus(0,0,50);
}

var maxx = cdist;
var maxz = cdist;
for (var i = 0; i < 100; i += 1) { // add clouds to the map (1 cloud is a group of small rectangles)
    var x = Math.random()*maxx*2-maxx;
    var z = Math.random()*maxz*2-maxz;
    var h = 150 + Math.random()*50;
    for (var j = 0; j < 15; j += 1) {
        addCloud(x,z,15,h,true);
    }
    //addLight(x,h-1,z);
}

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

var particleSystem = new BABYLON.ParticleSystem("sandstorm", 10000, scene);
particleSystem.particleTexture = new BABYLON.Texture("textures/sand3.png", scene);
particleSystem.emitter = new BABYLON.Vector3(0, 10, 0);
particleSystem.minEmitBox = new BABYLON.Vector3(-100, -10, -100);
particleSystem.maxEmitBox = new BABYLON.Vector3(100, 20, 100);
particleSystem.color1 = new BABYLON.Color4(1, 1, 1, 1);
particleSystem.color2 = new BABYLON.Color4(1, 1, 1, 1);
particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
particleSystem.minSize = 0.05;
particleSystem.maxSize = 0.05;
particleSystem.minLifeTime = 0.3;
particleSystem.maxLifeTime = 1.5;
particleSystem.emitRate = 5000;
particleSystem.direction1 = new BABYLON.Vector3(-1, -1, -1);
particleSystem.direction2 = new BABYLON.Vector3(1, 1, 1);
particleSystem.minAngularSpeed = 0;
particleSystem.maxAngularSpeed = Math.PI;
particleSystem.minEmitPower = 15;
particleSystem.maxEmitPower = 30;
particleSystem.updateSpeed = 0.005;
particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
particleSystem.start();

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
        }, 1);*/
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
        if (clouds[i].position.x > cdist) {
            clouds[i].position.x = -cdist;
        }
        if (clouds[i].position.x < -cdist) {
            clouds[i].position.x = cdist;
        }
        if (clouds[i].position.y > cdist) {
            clouds[i].position.y = -cdist;
        }
        if (clouds[i].position.y < -cdist) {
            clouds[i].position.y = cdist;
        }
    }
    if (Math.random() > 0.9) {
        windR += Math.random()*Math.PI/16-Math.PI/32;
        windS += Math.random()/100-0.005;
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
    if ((keyboard[' '] && camera.position.y <= 1) && typeing == false) {
        vy += 0.15; // change this to change the jump power
    } 

    if (camera.position.y > 1) { 
        vy -= 0.01;
    }
    if (camera.position.y < 1) { // The earth is flat (literally)
        camera.position.y = 1;
        vy=0;
    }
    var vertivalMovement = new BABYLON.Vector3(0, vy, 0);
    moveDirection.addInPlace(vertivalMovement);
    // Sneaking
    var shift = new BABYLON.Vector3(0, -0.2, 0);
    if (keyboard['shift'] && typeing == false) {
        moveDirection.addInPlace(shift);
    }

    camera.position.addInPlace(moveDirection);
    //console.log(camera.position.x,camera.position.y,camera.position.z);
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
