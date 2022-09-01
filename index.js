import * as THREE from "./three.module.js";

const canvas = document.getElementById("webgl");
const renderer = new THREE.WebGLRenderer({ canvas: canvas });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

const gl = renderer.getContext();
console.log("Depth buffer bits:", gl.getParameter(gl.DEPTH_BITS));

// set up the normal, visible scene

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera();
camera.fov = 60;
camera.near = 50;
camera.far = 1050;
camera.position.set(0, -50, 50);
camera.rotateX(80 * THREE.MathUtils.DEG2RAD);

const floorGeometry = new THREE.PlaneGeometry(100, 1000, 10, 100);
const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x156289 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.position.set(0, 500, 0);
scene.add(floor);

const floorWireFrameGeometry = new THREE.WireframeGeometry(floorGeometry);
const floorLines = new THREE.LineSegments(floorWireFrameGeometry);
floorLines.material.depthTest = false;
floorLines.material.opacity = 0.25;
floorLines.material.transparent = true;

scene.add(floorLines);

// define a depth texture: it will hold the depth buffer values from the visual scene.
// NOTE: WebGL *does not* support reading values directly out of a depth texture.

const depthTexture = new THREE.DepthTexture(canvas.width, canvas.height);
depthTexture.minFilter = THREE.NearestFilter;
depthTexture.magFilter = THREE.NearestFilter;

// set texture type to float (32 bits) for max precision
// default is unsigned int (32 bits), but a given browser/os may choose to realise that as a 16-bit texture

// NOTE this is only available in WebGL2, so we assume that is available
depthTexture.type = THREE.FloatType;

// define a render target - ie a buffer that we render the visual scene into
// the depth texture that is provided will receive the depth values that the
// renderer calculates in this process
const depthTarget = new THREE.WebGLRenderTarget(
  window.innerWidth,
  window.innerHeight,
  {
    depthTexture,
  }
);

// set up a "fake" / virtual scene, containing a flat plane directly in front of
// an orthographic camera. The plane uses the depth texture as its texture map.
// by reading the pixels rendered in this virtual scene we can then read out
// the actual depth buffer values!

const depthScene = new THREE.Scene();
const planeGeometry = new THREE.PlaneGeometry(2, 2);
const planeMaterial = new THREE.MeshBasicMaterial({ map: depthTexture });
const depthPlane = new THREE.Mesh(planeGeometry, planeMaterial);
depthScene.add(depthPlane);
const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

// set up another render target, this is a buffer to render the virtual scene into.
const planeRenderTarget = new THREE.WebGLRenderTarget(
  window.innerWidth,
  window.innerHeight,
  { type: THREE.FloatType }
);

// all depth values will be written to this array
let depthValues;

window.addEventListener("resize", () => {
  resetViewport();
});

window.addEventListener("mousemove", (e) => {
  mouseMove(e);
});

resetViewport();
drawScene();

function drawScene() {
  requestAnimationFrame(drawScene);

  // render the visual scene into the depth buffer texture
  renderer.setRenderTarget(depthTarget);
  renderer.render(scene, camera);

  // render the virtual scene, using the depth buffer from previous step as a texture
  renderer.setRenderTarget(planeRenderTarget);
  renderer.render(depthScene, orthoCamera);

  // read out rendered pixels (depth values) from the virtual scene and put them into the depthValues array
  renderer.readRenderTargetPixels(
    planeRenderTarget,
    0,
    0,
    window.innerWidth,
    window.innerHeight,
    depthValues
  );

  // render the visible scene to the screen
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
}

function resetViewport() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  // update all buffers that depend on the window size
  depthTarget.setSize(window.innerWidth, window.innerHeight);
  planeRenderTarget.setSize(window.innerWidth, window.innerHeight);
  depthValues = new Float32Array(window.innerWidth * window.innerHeight * 4);
}

function mouseMove(e) {
  const x = e.clientX;
  const y = window.innerHeight - e.clientY;

  const depthZ = depthValues[(y * window.innerWidth + x) * 4];

  console.log(x, y, depthZ);

  // transform screen coordinates and depth to NDC coordinates - all in the (-1, 1) range
  const nx = 2 * (x / window.innerWidth) - 1;
  const ny = 2 * (y / window.innerHeight) - 1;
  const nz = 2 * depthZ - 1;

  const ndcPosition = new THREE.Vector4(nx, ny, nz, 1.0);

  // transform NDC coordinates to view space coordinates (ie 3D coordinates relative to camera)
  const viewSpacePosition = ndcPosition.applyMatrix4(
    camera.projectionMatrixInverse
  );

  // normalize coordinates (convert from homogeneous)
  viewSpacePosition.multiplyScalar(1 / viewSpacePosition.w);

  // transform view space coordinates to world coordinates
  const worldSpacePosition = viewSpacePosition.applyMatrix4(camera.matrixWorld);

  console.log("worldspace", worldSpacePosition);
}
