const sensitivity = 200; // larger is slower

var canvas = document.getElementById("renderCanvas");
// lock the mouse pointer
canvas.style.cursor = 'none';
//canvas.style.pointerEvents = 'none';

var keyboard = {};
var vy = 0;
var r = {x:0, y:0}
var typeing = false;
window.onkeyup = function(e) { keyboard[e.key.toLowerCase()] = false; }
window.onkeydown = function(e) { keyboard[e.key.toLowerCase()] = true; }

window.addEventListener('pointermove', function(event) {
    // Get the horizontal and vertical mouse movement
    r.x = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    r.y = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
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
    var scene = new BABYLON.Scene(engine);
    /*
    const music = new BABYLON.Sound("Music", "https://eddietheed.github.io/obsidiannotes-v.3/verslaflamme.mp3", scene, null, {
        loop: true,
        autoplay: true,
    });*/
    
    var camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 5, -10), scene);
    var scene = new BABYLON.Scene(engine);

    var camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 5, -10), scene);

    // by default all music plays at volume
    var musicvalue = 1

    camera.speed = 0.2
    camera.minZ = 0.01
    camera.position.y = 1.8 // double the height of the ellipsoid for some reason

    camera.ellipsoid = new BABYLON.Vector3(0.7, 0.7, 0.7);

    scene.collisionsEnabled = true;
    camera.checkCollisions = true;

    camera.setTarget(BABYLON.Vector3.Zero());
    
    var ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 150, height: 150}, scene);

    const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
    groundMaterial.emissiveColor = new BABYLON.Color4(0.8359375, 0.4140625, 0.234375)
    ground.material = groundMaterial;
    ground.checkCollisions = true;
    
    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    var light = new BABYLON.HemisphericLight("HemiLight", new BABYLON.Vector3(10, 50, 10), scene)
    // const light = new BABYLON.PointLight("pointLight", new BABYLON.Vector3(1, 50, 1), scene)
    light.diffuse = new BABYLON.Color3(1, 1, 1);
    
    // Default intensity is 1. Let's dim the light a small amount
    light.intensity = 1;
    
    light.setEnabled(true)

    light.excludedMeshes.push(ground)
    
    
    scene.clearColor = new BABYLON.Color3(89/256, 147/256, 255/256) // The colour of the sky

    
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP
    scene.fogDensity = 0.02
        
    // just adding a box
    const box = BABYLON.SceneLoader.ImportMesh("", "models/", "soundbox.obj", scene, function(newMeshes){
    newMeshes[0].scaling = new BABYLON.Vector3(1, 1, 1);
    newMeshes[0].position = new BABYLON.Vector3(0, 10, 10)
    newMeshes[0].checkCollisions = true;
    });

    const soundbox = BABYLON.SceneLoader.ImportMesh("", "models/", "soundbox.obj", scene, function(newMeshes){
        newMeshes[0].position = new BABYLON.Vector3(0, 1, 0)
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

    scene.onBeforeRenderObservable.add(() => {
        // Rotate the camera based on the mouse movement
        camera.rotation.y += r.x / sensitivity;
        camera.rotation.x += r.y / sensitivity;

        // Movement vectors in horizontal plane
        var forward = new BABYLON.Vector3(
            Math.sin(camera.rotation.y) * (keyboard['shift'] == 1 ? 0.1 : 1),
            0,
            Math.cos(camera.rotation.y) * (keyboard['shift'] == 1 ? 0.1 : 1)
        );
        var right = new BABYLON.Vector3(
            Math.sin(camera.rotation.y + Math.PI / 2) * (keyboard['shift'] == 1 ? 0.1 : 1),
            0,
            Math.cos(camera.rotation.y + Math.PI / 2) * (keyboard['shift'] == 1 ? 0.1 : 1)
        );
        
        // basic movement in the horizontal plane
        var moveDirection = BABYLON.Vector3.Zero();
        if ((keyboard['arrowup'] || keyboard['w']) && typeing == false) {
            //console.log('w');
            moveDirection.addInPlace(forward);
        }
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
        if ((keyboard[' '] && camera.position.y < 1.2) && typeing == false) {
            vy += 2; // change this to change the jump power
        }
        console.log(keyboard);
        //console.log(camera.position);
        if (camera.position.y > 1) { 
            vy -= 0.4;
        }
        if (camera.position.y < 1) { // The earth is flat (literally)
            camera.position.y = 1;
            vy=0;
        }
        var vertivalMovement = new BABYLON.Vector3(0, vy, 0);
        moveDirection.addInPlace(vertivalMovement);

        // Sneaking
        var shift = new BABYLON.Vector3(0, -0.5, 0);
        if (keyboard['shift'] && typeing == false) {
            moveDirection.addInPlace(shift);
        }

        moveDirection.normalize();
        moveDirection.scaleInPlace(0.1);
        
        camera.position.addInPlace(moveDirection);
    });

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
initFunction().then(() => {sceneToRender = scene });

window.addEventListener("resize", function () {
    engine.resize();
});

