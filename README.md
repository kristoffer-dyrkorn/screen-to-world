# screen-to-world

The code in this repo shows how you, using a screen coordinate (mouse location) as input, can read out a depth buffer value from a 3d scene rendered in WebGL/three.js and then use the coordinate and depth information to calculate a 3d world coordinate for that point.

# method

To get hold of depth buffer values, we do this:

- render the scene into a render target (a buffer) that stores the depth buffer values
- render a plane, using the depth texture as a color texture on a flat plane, into a buffer
- read out pixel values from that buffer -> this is our depth buffer values

WebGL does not support reading out depth texture values directly. That is the reason for the extra render stages.

To transform from depth buffer values to world coordinate values (essentially: running the 3D pipeline in reverse), we do this:

- convert the screen coordinates and depth buffer values into NDC coordinates
- convert the NDC coordinates into view space coordinates (transforming by inverse projection matrix)
- convert from 4d homogeneous view space cordinates to normal 3d coordinates
- convert the view space coordinates into world coordinates (transforming by inverse view matrix)

The code has been optimized to give high accuracy in the calculations - but the resulting accuracy will depend on the z buffer resolution available for the hardware and the intermediate render buffers.
