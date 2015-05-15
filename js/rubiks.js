/** a Rubik's cube made with WebGL
 *
 * @link https://github.com/blonkm/rubiks-cube
 * @authors 
 *      Tiffany Wang - https://github.com/tinnywang
 *      Michiel van der Blonk - blonkm@gmail.com
 * @license LGPL
 */
var canvas;
var gl;
var rubiksCube;
var shaderProgram;

var rightMouseDown = false;
var x_init_right;
var y_init_right;
var x_new_right;
var y_new_right;
var leftMouseDown = false;
var init_coordinates;
var new_coordinates;
var isRotating = false;
var isAnimating = false;
var eye = [5, 5, -15];
var center = [0, 0, 0];
var up = [0, 1, 0];

var modelViewMatrix = mat4.create();
var projectionMatrix = mat4.create();
var rotationMatrix = mat4.create();

var DEGREES = 5;
var MARGIN_OF_ERROR = 1e-3;
var X_AXIS = 0;
var Y_AXIS = 1;
var Z_AXIS = 2;
var LEFT_MOUSE = 0;
var RIGHT_MOUSE = 2;
var CANVAS_X_OFFSET = 0;
var CANVAS_Y_OFFSET = 0;

function RubiksCube() {
    this.selectedCube = null; // an instance of Cube
    this.rotatedCubes = null; // an array of Cubes
    this.rotationAxis = null; // a vec3
    this.axisConstant = null; // X_AXIS, Y_AXIS, or Z_AXIS
    this.rotationAngle = 0;
    this.degrees = DEGREES;
    this.cubeVerticesBuffer = null;
    this.cubeNormalsBuffer = null;
    this.cubeFacesBuffer = null;
    this.stickerVerticesBuffer = null;
    this.stickerNormalsBuffer = null;
    this.stickerFacesBuffer = null;
    this.pickingFramebuffer = null;
    this.pickingTexture = null;
    this.pickingRenderBuffer = null;
    this.normalsCube = new NormalsCube();
    this.cubes = new Array(3);

    this.init = function() {
        this.initTextureFramebuffer();
        this.initCubeBuffers();
        this.initStickerBuffers();
        for (var r = 0; r < 3; r++) {
            this.cubes[r] = new Array(3);
            for (var g = 0; g < 3; g++) {
                this.cubes[r][g] = new Array(3);
                for (var b = 0; b < 3; b++) {
                    var coordinates = [r - 1, g - 1, b - 1];
                    var color = [r / 3, g / 3, b / 3, 1.0];
                    this.cubes[r][g][b] = new Cube(this, coordinates, color);
                }
            }
        }
    }

    this.initTextureFramebuffer = function() {
        this.pickingFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickingFramebuffer);

        this.pickingTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.pickingTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        this.pickingRenderBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.pickingRenderBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pickingTexture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.pickingRenderBuffer);
    }

    this.initCubeBuffers = function() {
        // vertices
        this.cubeVerticesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeVerticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeModel.vertices), gl.STATIC_DRAW);
        // normals
        this.cubeNormalsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeNormalsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeModel.normals), gl.STATIC_DRAW);
        // faces
        this.cubeFacesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cubeFacesBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeModel.faces), gl.STATIC_DRAW);
    }

    this.initStickerBuffers = function() {
        // vertices
        this.stickerVerticesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.stickerVerticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(stickerModel.vertices), gl.STATIC_DRAW);
        // normals
        this.stickerNormalsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.stickerNormalsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(stickerModel.normals), gl.STATIC_DRAW);
        // faces
        this.stickerFacesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.stickerFacesBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(stickerModel.faces), gl.STATIC_DRAW);
    }

    this.init();

    this.draw = function() {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            
        mat4.perspective(projectionMatrix, 30, canvas.width / canvas.height, 0.1, 100.0);
        mat4.identity(modelViewMatrix);
        mat4.lookAt(modelViewMatrix, eye, center, up);
        mat4.multiply(modelViewMatrix, modelViewMatrix, rotationMatrix);
        var mvMatrix = mat4.create();
        for (var r = 0; r < 3; r++) {
            for (var g = 0; g < 3; g++) {
                for (var b = 0; b < 3; b++) {
                    var cube = this.cubes[r][g][b];
                    cube.draw(cubeModel.ambient);
                    for (var s in cube.stickers) {
                        cube.stickers[s].draw();
                    }
                }
            }
        }
    }

    this.drawToPickingFramebuffer = function() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, rubiksCube.pickingFramebuffer);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniform1i(shaderProgram.lighting, 0);

        mat4.perspective(projectionMatrix, 30, canvas.width / canvas.height, 0.1, 100.0);
        mat4.identity(modelViewMatrix);
        mat4.lookAt(modelViewMatrix, eye, center, up);
        mat4.multiply(modelViewMatrix, modelViewMatrix, rotationMatrix);
        var mvMatrix = mat4.create();
        for (var r = 0; r < 3; r++) {
            for (var g = 0; g < 3; g++) {
                for (var b = 0; b < 3; b++) {
                    var cube = this.cubes[r][g][b];
                    cube.draw(cube.color);
                }
            }
        }

        gl.uniform1i(shaderProgram.lighting, 1);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    this.drawToNormalsFramebuffer = function() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, rubiksCube.normalsCube.normalsFramebuffer);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        mat4.perspective(projectionMatrix, 30, canvas.width / canvas.height, 0.1, 100.0);
        mat4.identity(modelViewMatrix);
        mat4.lookAt(modelViewMatrix, eye, center, up);
        mat4.multiply(modelViewMatrix, modelViewMatrix, rotationMatrix);
        var mvMatrix = mat4.create();
        mat4.copy(mvMatrix, modelViewMatrix);
        this.normalsCube.draw();

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /*
     * Sets this.rotatedCubes to an array of cubes that share the same AXIS coordinate as this.selectedCube.
     * AXIS is 0, 1, or 2 for the x-, y-, or z-coordinate.
     */
    this.setRotatedCubes = function() {
        if (!this.rotationAxis) {
            return;
        }
        var value = this.selectedCube.coordinates[this.axisConstant];
        var cubes = [];
        for (var r = 0; r < 3; r++) {
            for (var g = 0; g < 3; g++) {
                for (var b = 0; b < 3; b++) {
                    var cube = this.cubes[r][g][b];
                    if (Math.abs(cube.coordinates[this.axisConstant] - value) < MARGIN_OF_ERROR) {
                        cubes.push(cube);
                    }
                }
            }
        }
        if (cubes.length == 9) {
            this.rotatedCubes = cubes;
        }
    }

    /*
     * Rotates this.rotatedCubes around this.rotationAxis by this.degrees.
     */
    this.rotateLayer = function() {
        if (Math.abs(this.rotationAngle) == 90) {
            this.rotationAngle = 0;
            isRotating = false;
            isAnimating = false;
            this.degrees = DEGREES;
            return;
        }

        this.degrees = DEGREES + Math.ceil(this.degrees * Math.sin(degreesToRadians(this.rotationAngle)));
        if (this.rotationAngle+this.degrees > 90) {
            this.degrees = 90 - this.rotationAngle;
            this.rotationAngle = 90;
        }
        else {
            this.rotationAngle += this.degrees;
        }

        var newRotationMatrix = mat4.create();
        mat4.rotate(newRotationMatrix, newRotationMatrix, degreesToRadians(this.degrees), this.rotationAxis);

        for (var c in this.rotatedCubes) {
            var cube = this.rotatedCubes[c];
            vec3.transformMat4(cube.coordinates, cube.coordinates, newRotationMatrix);
            mat4.multiply(cube.rotationMatrix, newRotationMatrix, cube.rotationMatrix);
        }
    }

    this.colorToCube = function(rgba) {
        var r = rgba[0];
        var g = rgba[1];
        var b = rgba[2];
        if (r == 255 && g == 255 && b == 255) { // clicked outside the cube
            return null;
        } else {
            return this.cubes[r % 3][g % 3][b % 3];
        }
    }

    this.selectCube = function(x, y) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickingFramebuffer);
        var pixelValues = new Uint8Array(4);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelValues);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.selectedCube = this.colorToCube(pixelValues);
    }

    this.setRotationAxis = function(x, y, direction) {
        var normal = this.normalsCube.getNormal(x, y);
        if (!normal) {
            return;
        }
        var axis = vec3.create();
        vec3.cross(axis, normal, direction);
        var x = Math.round(axis[0]);
        var y = Math.round(axis[1]);
        var z = Math.round(axis[2]);
        this.rotationAxis = Math.abs(x + y + z) == 1 ? [x, y, z] : null;
        if (!this.rotationAxis) {
            this.axisConstant = null;
            return;
        }
        if (x == 1 || x == -1) {
            this.axisConstant = X_AXIS;
        } else if (y == 1 || y == -1) {
            this.axisConstant = Y_AXIS;
        } else if (z == 1 || z == -1 ) {
            this.axisConstant = Z_AXIS;
        }
    }

    /*
     * For testing the rotation of a layer by matrix instead of layer.
     * Repeatedly called by doTransform to turn layer by this.degrees until 90 degrees is done
     */
    this.transform = function(r,g,b, axis, inverse) {
        var rot = [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ];
        this.selectedCube = this.cubes[r][g][b];
        this.axisConstant = axis;
        this.rotationAxis = rot[axis];
        if (inverse)
            vec3.scale(this.rotationAxis, this.rotationAxis, -1);
        this.setRotatedCubes();
        isRotating = true;
    }

    /*
     * For testing only: timed transform of the cube, rotating a layer
     */
    this.doTransform = function(params) {
        var that = this;
        var delay = 50;
        if (!isRotating) {
            var move = params.shift();
            this.transform(move.r, move.g, move.b, move.axis);
            setTimeout(function() {that.doTransform(params)}, delay);
        }
        else
            if (params.length > 0)
                setTimeout(function() {that.doTransform(params)}, delay);
    }


    this.move = function(layer, inverse) {
        var rot = {
            X: [1, 0, 0],
            Y: [0, 1, 0],
            Z: [0, 0, 1]
        };
        inverse = typeof inverse !== 'undefined' ? inverse : false;
        
        var layers = {
            "L": {cubie:this.cubes[1][1][2], axis:Z_AXIS, rotation:rot.Z, ccw:true},
            "R": {cubie:this.cubes[1][1][0], axis:Z_AXIS, rotation:rot.Z, ccw:false},

            "U": {cubie:this.cubes[1][0][1], axis:Y_AXIS, rotation:rot.Y, ccw:false},
            "D": {cubie:this.cubes[1][2][1], axis:Y_AXIS, rotation:rot.Y, ccw:true},

            "F": {cubie:this.cubes[0][1][1], axis:X_AXIS, rotation:rot.X, ccw:false},
            "B": {cubie:this.cubes[2][1][1], axis:X_AXIS, rotation:rot.X, ccw:true},

            "M": {cubie:this.cubes[0][1][1], axis:Z_AXIS, rotation:rot.Z, ccw:true},
            "E": {cubie:this.cubes[0][1][1], axis:Y_AXIS, rotation:rot.Y, ccw:true},
            "S": {cubie:this.cubes[1][1][0], axis:X_AXIS, rotation:rot.X, ccw:false}
        };
        
        this.selectedCube = layers[layer].cubie;
        this.axisConstant = layers[layer].axis;
        this.rotationAxis = layers[layer].rotation;
        if (layers[layer].ccw) 
            inverse = !inverse;
        if (inverse) {
            vec3.scale(this.rotationAxis, this.rotationAxis, -1);
        }

        this.setRotatedCubes();
        isRotating = true;
    }

    this.perform = function(alg) {
        var that = this;
        var delay = 10;
        if (!isRotating) {
            var clone = alg.slice(0);
            var move = clone.shift();
            this.move(move.face, move.ccw);
            setTimeout(function() {that.perform(clone)}, delay);
        }
        else
            if (alg.length > 0)
                setTimeout(function() {that.perform(alg)}, delay);        
    }
    
    this.moveListToString = function(moveList) {
        return moveList.map(function(move) {
          return move.face + (move.ccw?"'":"");
        }).join(" ");
    }
}

function Cube(rubiksCube, coordinates, color) {
    this.rubiksCube = rubiksCube;
    this.coordinates = coordinates;
    this.color = color;
    this.rotationMatrix = mat4.create();
    this.translationVector = vec3.create();
    this.stickers = [];
    this.COLORS = {
        'blue': [0.0, 0.0, 1.0, 1.0],
        'green': [0.0, 1.0, 0.0, 1.0],
        'orange': [1.0, 0.5, 0.0, 1.0],
        'red': [1.0, 0.0, 0.0, 1.0],
        'white': [1.0, 1.0, 1.0, 1.0],
        'yellow': [1.0, 1.0, 0.0, 1.0]
    }
    
    this.init = function() {
        vec3.scale(this.translationVector, this.coordinates, 2);
        this.initStickers();
    }

    this.initStickers = function() {
        var x = this.coordinates[0];
        var y = this.coordinates[1];
        var z = this.coordinates[2];
        if (x == -1) {
            this.stickers.push(new Sticker(this, this.COLORS['red'], function() {
                this.cube.transform();
                mat4.translate(modelViewMatrix, modelViewMatrix, [-1.001, 0, 0]);
                mat4.rotateZ(modelViewMatrix, modelViewMatrix, degreesToRadians(90));
            }));
        } else if (x == 1) {
            this.stickers.push(new Sticker(this, this.COLORS['orange'], function() {
                this.cube.transform();
                mat4.translate(modelViewMatrix, modelViewMatrix, [1.001, 0, 0]);
                mat4.rotateZ(modelViewMatrix, modelViewMatrix, degreesToRadians(-90));
            }));
        }
        if (y == -1) {
            this.stickers.push(new Sticker(this, this.COLORS['yellow'], function() {
                this.cube.transform();
                mat4.translate(modelViewMatrix, modelViewMatrix, [0, -1.001, 0]);
                mat4.rotateX(modelViewMatrix, modelViewMatrix, degreesToRadians(-180));
            }));
        } else if (y == 1) {
            this.stickers.push(new Sticker(this, this.COLORS['white'], function() {
                this.cube.transform();
                mat4.translate(modelViewMatrix, modelViewMatrix, [0, 1.001, 0]);
                setMatrixUniforms();
            }));
        }
        if (z == 1) {
            this.stickers.push(new Sticker(this, this.COLORS['blue'], function() {
                this.cube.transform();
                mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, 1.001]);
                mat4.rotateX(modelViewMatrix, modelViewMatrix, degreesToRadians(90));
            }));
        } else if (z == -1) {
            this.stickers.push(new Sticker(this, this.COLORS['green'], function() {
                this.cube.transform();
                mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -1.001]);
                mat4.rotateX(modelViewMatrix, modelViewMatrix, degreesToRadians(-90));
            }));
        }
    }

    this.init();

    this.transform = function() {
        mat4.multiply(modelViewMatrix, modelViewMatrix, this.rotationMatrix);
        mat4.translate(modelViewMatrix, modelViewMatrix, this.translationVector);
    }

    this.draw = function(color) {
        var mvMatrix = mat4.create();
        mat4.copy(mvMatrix, modelViewMatrix);
        this.transform();
        setMatrixUniforms();

        gl.uniform4fv(shaderProgram.ambient, color);
        gl.uniform4fv(shaderProgram.diffuse, cubeModel.diffuse);
        gl.uniform4fv(shaderProgram.specular, cubeModel.specular);
        gl.uniform1f(shaderProgram.shininess, cubeModel.shininess);
        // vertices
        gl.bindBuffer(gl.ARRAY_BUFFER, rubiksCube.cubeVerticesBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        // normals
        gl.bindBuffer(gl.ARRAY_BUFFER, rubiksCube.cubeNormalsBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormal, 3, gl.FLOAT, false, 0, 0);
        // faces
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, rubiksCube.cubeFacesBuffer);
        gl.drawElements(gl.TRIANGLES, cubeModel.faces.length, gl.UNSIGNED_SHORT, 0);

        mat4.copy(modelViewMatrix, mvMatrix);
    }
}

function Sticker(cube, color, transform) {
    this.cube = cube;
    this.color = color;
    this.transform = transform;

    this.draw = function() {
        var mvMatrix = mat4.create();
        mat4.copy(mvMatrix, modelViewMatrix)
        this.transform();
        setMatrixUniforms();

        gl.uniform4fv(shaderProgram.ambient, this.color);
        gl.uniform4fv(shaderProgram.diffuse, stickerModel.diffuse);
        gl.uniform4fv(shaderProgram.specular, stickerModel.specular);
        gl.uniform1f(shaderProgram.shininess, stickerModel.shininess);
        // vertices
        gl.bindBuffer(gl.ARRAY_BUFFER, cube.rubiksCube.stickerVerticesBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        // normals
        gl.bindBuffer(gl.ARRAY_BUFFER, cube.rubiksCube.stickerNormalsBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormal, 3, gl.FLOAT, false, 0, 0);
        // faces
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.rubiksCube.stickerFacesBuffer);
        gl.drawElements(gl.TRIANGLES, stickerModel.faces.length, gl.UNSIGNED_SHORT, 0);

        mat4.copy(modelViewMatrix, mvMatrix);
    }
}

function NormalsCube() {
    this.normalsFramebuffer = null;
    this.normalsTexture = null;
    this.normalsRenderbuffer = null;
    this.verticesBuffer = null;
    this.normalsBuffer = null;
    this.facesBuffer = null;
    this.COLORS = {
        'blue': [0.0, 0.0, 1.0, 1.0],
        'green': [0.0, 1.0, 0.0, 1.0],
        'orange': [1.0, 0.5, 0.0, 1.0],
        'red': [1.0, 0.0, 0.0, 1.0],
        'black': [0.0, 0.0, 0.0, 1.0],
        'yellow': [1.0, 1.0, 0.0, 1.0]
    }
    this.NORMALS = {
        'blue': [-1, 0, 0],
        'green': [0, 0, -1],
        'orange': [1, 0, 0],
        'red': [0, 0, 1],
        'black': [0, -1, 0],
        'yellow': [0, 1, 0]
    }

    this.init = function() {
        this.initTextureFramebuffer();
        this.initBuffers();
    }

    this.initTextureFramebuffer = function() {
        this.normalsFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.normalsFramebuffer);

        this.normalsTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.normalsTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
     
        this.normalsRenderBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.normalsRenderBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.normalsTexture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.normalsRenderBuffer);

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    this.initBuffers = function() {
        // vertices
        this.verticesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalsCubeModel.vertices), gl.STATIC_DRAW);
        // normals
        this.normalsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalsCubeModel.normals), gl.STATIC_DRAW);
        // faces
        this.facesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.facesBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(normalsCubeModel.faces), gl.STATIC_DRAW);
    }

    this.init();

    this.draw = function() {
        var mvMatrix = mat4.create();
        mat4.copy(mvMatrix, modelViewMatrix);
        mat4.scale(modelViewMatrix, modelViewMatrix, [3, 3, 3]);
        setMatrixUniforms();

        gl.uniform1i(shaderProgram.lighting, 0);
        // vertices
        gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        // normals
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormal, 3, gl.FLOAT, false, 0, 0);
        // faces
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.facesBuffer);
        var offset = 0;
        for (var c in this.COLORS) {
            var color = this.COLORS[c];
            gl.uniform4fv(shaderProgram.ambient, this.COLORS[c]);
            gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_SHORT, offset);
            gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_SHORT, offset + normalsCubeModel.faces.length)
            offset += 6;
        }

        mat4.copy(modelViewMatrix, mvMatrix);
        gl.uniform1i(shaderProgram.lighting, 1);
    }

    this.colorToNormal = function(rgba) {
        var r = (rgba[0] / 255).toFixed(1);
        var g = (rgba[1] / 255).toFixed(1);
        var b = (rgba[2] / 255).toFixed(1);
        for (var c in this.COLORS) {
            var color = this.COLORS[c];
            if (r == color[0] && g == color[1] && b == color[2]) {
                return this.NORMALS[c];
            }
        }
        return null;
    }

    this.getNormal = function(x, y) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.normalsFramebuffer);
        var pixelValues = new Uint8Array(4);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelValues);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return this.colorToNormal(pixelValues);
    }
}

function initWebGL(canvas) {
    if (!window.WebGLRenderingContext) {
        console.log("Your browser doesn't support WebGL.")
            return null;
    }
    gl = canvas.getContext('webgl', {preserveDrawingBuffer: true}) || canvas.getContext('experimental-webgl', {preserveDrawingBuffer: true});
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    if (!gl) {
        console.log("Your browser supports WebGL, but initialization failed.");
        return null;
    }
    return gl;
}

function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }
    var source = '';
    var currentChild = shaderScript.firstChild;
    while (currentChild) {
        if (currentChild.nodeType == currentChild.TEXT_NODE) {
            source += currentChild.textContent;
        }
        currentChild = currentChild.nextSibling;
    }
    var shader;
    if (shaderScript.type == 'x-shader/x-fragment') {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == 'x-shader/x-vertex') {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log('An error occurred while compiling the shader: ' + gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function initShaders() {
    var fragmentShader = getShader(gl, 'fragmentShader');
    var vertexShader = getShader(gl, 'vertexShader');
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, fragmentShader);
    gl.attachShader(shaderProgram, vertexShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log('Unable to initialize the shader program');
    }
    gl.useProgram(shaderProgram);
    shaderProgram.vertexPosition = gl.getAttribLocation(shaderProgram, 'vertexPosition');
    gl.enableVertexAttribArray(shaderProgram.vertexPosition);
    shaderProgram.vertexNormal = gl.getAttribLocation(shaderProgram, 'vertexNormal');
    gl.enableVertexAttribArray(shaderProgram.vertexNormal);
    shaderProgram.eyePosition = gl.getUniformLocation(shaderProgram, 'eyePosition');
    gl.uniform3fv(shaderProgram.eyePosition, eye);
    shaderProgram.lighting = gl.getUniformLocation(shaderProgram, 'lighting');
    shaderProgram.ambient = gl.getUniformLocation(shaderProgram, 'ambient');
    shaderProgram.diffuse = gl.getUniformLocation(shaderProgram, 'diffuse');
    shaderProgram.specular = gl.getUniformLocation(shaderProgram, 'specular');
    shaderProgram.shininess = gl.getUniformLocation(shaderProgram, 'shininess');
}

function drawScene() {
    if (isRotating) {
        rubiksCube.rotateLayer();
    }

    rubiksCube.drawToNormalsFramebuffer();
    rubiksCube.drawToPickingFramebuffer(); 
    rubiksCube.draw();
}

function tick() {
    requestAnimationFrame(tick);
    drawScene();
}

function start() {
    canvas = document.getElementById('glcanvas');
    CANVAS_X_OFFSET = $('#glcanvas').offset()['left'];
    CANVAS_Y_OFFSET = $('#glcanvas').offset()['top'];
    gl = initWebGL(canvas);
    initShaders();
    rubiksCube = new RubiksCube();
    perspectiveView();

    if (gl) {
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        tick();
    }
}

function setMatrixUniforms() {
    var projectionUniform = gl.getUniformLocation(shaderProgram, 'projectionMatrix');
    gl.uniformMatrix4fv(projectionUniform, false, projectionMatrix);
    var modelViewUniform = gl.getUniformLocation(shaderProgram, 'modelViewMatrix');
    gl.uniformMatrix4fv(modelViewUniform, false, modelViewMatrix);
    var _normalMatrix = mat4.create();
    mat4.invert(_normalMatrix, modelViewMatrix);
    mat4.transpose(_normalMatrix, _normalMatrix);
    var normalMatrix = mat3.create();
    mat3.fromMat4(normalMatrix, _normalMatrix);
    var normalMatrixUniform = gl.getUniformLocation(shaderProgram, 'normalMatrix');
    gl.uniformMatrix3fv(normalMatrixUniform, false, normalMatrix);
}

function unproject(dest, vec, view, proj, viewport) {
    var m = mat4.create();
    var v = vec4.create();

    v[0] = (vec[0] - viewport[0]) * 2.0 / viewport[2] - 1.0;
    v[1] = (vec[1] - viewport[1]) * 2.0 / viewport[3] - 1.0;
    v[2] = 2.0 * vec[2] - 1.0;
    v[3] = 1.0;

    mat4.multiply(m, proj, view);
    mat4.invert(m, m);

    vec4.transformMat4(v, v, m);
    if (v[3] == 0.0) {
        return null;
    }

    dest[0] = v[0] / v[3];
    dest[1] = v[1] / v[3];
    dest[2] = v[2] / v[3];

    return dest;
}

function screenToObjectCoordinates(x, y) {
    var objectCoordinates = vec3.create();
    var screenCoordinates = [x, y, 0];
    unproject(objectCoordinates, screenCoordinates, modelViewMatrix, projectionMatrix, [0, 0, canvas.width, canvas.height])
    return objectCoordinates;
}

function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
}

function rotate(event) {
    if (rightMouseDown) {
        x_new_right = event.pageX;
        y_new_right = event.pageY;
        var delta_x = (x_new_right - x_init_right) / 50;
        var delta_y = (y_new_right - y_init_right) / 50;
        var axis = [delta_y, -delta_x, 0];
        var degrees = Math.sqrt(delta_x * delta_x + delta_y * delta_y);
        var newRotationMatrix = mat4.create();
        mat4.rotate(newRotationMatrix, newRotationMatrix, degreesToRadians(degrees), axis);
        mat4.multiply(rotationMatrix, newRotationMatrix, rotationMatrix);
    } else if (leftMouseDown && !isRotating) {
        new_coordinates = screenToObjectCoordinates(event.pageX - CANVAS_X_OFFSET, canvas.height - event.pageY + CANVAS_Y_OFFSET);
        var direction = vec3.create();
        vec3.subtract(direction, new_coordinates, init_coordinates);
        vec3.normalize(direction, direction);
        rubiksCube.setRotationAxis(event.pageX - CANVAS_X_OFFSET, canvas.height - event.pageY + CANVAS_Y_OFFSET, direction);
        rubiksCube.setRotatedCubes();
        isRotating = rubiksCube.rotatedCubes && rubiksCube.rotationAxis;
    }
}

function startRotate(event) {
    if (event.button == LEFT_MOUSE) { // left mouse
        rubiksCube.selectCube(event.pageX - CANVAS_X_OFFSET, canvas.height - event.pageY + CANVAS_Y_OFFSET);
        if (rubiksCube.selectedCube) {
            init_coordinates = screenToObjectCoordinates(event.pageX - CANVAS_X_OFFSET, canvas.height - event.pageY + CANVAS_Y_OFFSET);
            setTimeout(function() {
                leftMouseDown = true;
            }, 50);
        }
    } else if (event.button == RIGHT_MOUSE) { // right mouse
        rightMouseDown = true;
        x_init_right = event.pageX;
        y_init_right = event.pageY;
    }
}

function endRotate(event) {
    if (event.button == LEFT_MOUSE && leftMouseDown) { // left mouse
        leftMouseDown = false;
    } else if (event.button == RIGHT_MOUSE) { // right mouse
        rightMouseDown = false;
    }
}

function topView() {
    mat4.identity(rotationMatrix);
    mat4.rotateX(rotationMatrix, rotationMatrix, degreesToRadians(90));
}

function bottomView() {
    mat4.identity(rotationMatrix);
    mat4.rotateX(rotationMatrix, rotationMatrix, degreesToRadians(-90));
}

function leftView() {
    mat4.identity(rotationMatrix);
    mat4.rotateY(rotationMatrix, rotationMatrix, degreesToRadians(-90));
}

function rightView() {
    mat4.identity(rotationMatrix);
    mat4.rotateY(rotationMatrix, rotationMatrix, degreesToRadians(90));
}

function frontView() {
    mat4.identity(rotationMatrix);
}

function backView() {
    mat4.identity(rotationMatrix);
    mat4.rotateY(rotationMatrix, rotationMatrix, degreesToRadians(180));
}

function perspectiveView() {
    mat4.identity(rotationMatrix);
    mat4.rotateX(rotationMatrix, rotationMatrix, degreesToRadians(45));
    mat4.rotateY(rotationMatrix, rotationMatrix, degreesToRadians(-45));
}

function togglePerspective(event) {
    switch(event.which) {
        case 32: // space
            perspectiveView();
            break;
        case 97: // a, left
            leftView();
            break;
        case 100: // d, right
            rightView();
            break;
        case 101: // e, top
            topView();
            break;
        case 113: // q, bottom
            bottomView();
            break;
        case 115: // s, back
            backView();
            break;
        case 119: // w, front
            frontView();
            break;
    }
}

function testLayerMoves() {
    if (!isAnimating) {
        isAnimating = true;
        rubiksCube.perform([
            {face:"R", ccw:false},
            {face:"R", ccw:true},
            {face:"L", ccw:false},
            {face:"L", ccw:true},
            {face:"U", ccw:false},
            {face:"U", ccw:true},
            {face:"D", ccw:false},
            {face:"D", ccw:true},
            {face:"F", ccw:false},
            {face:"F", ccw:true},
            {face:"B", ccw:false},
            {face:"B", ccw:true},
            {face:"M", ccw:false},
            {face:"M", ccw:true},
            {face:"E", ccw:false},
            {face:"E", ccw:true},
            {face:"S", ccw:false},
            {face:"S", ccw:true} 
            ]);
        return;
    }
}

function scramble(count) {
    var count;
    if (!isAnimating) {
        isAnimating = true;
        
        if ($('#scramble-length'))
            count = $('#scramble-length').val();
        else
            count = Math.floor(Math.random() * 10) + 10;
        var moves = ['R','L','U','D','F','B'];
        var movesWithSlices = ['R','L','U','D','F','B','M','E','S'];
        var moveList = [];
        var moveIndex = 0;
        var prevIndex = 0;
        var randomMove;
        var inverse;
        for (i = 0; i < count; i++) {
            moveIndex = Math.floor(Math.random() * moves.length);
            while (moveIndex/2 == prevIndex/2) {
                moveIndex = Math.floor(Math.random() * moves.length);
            }
            randomMove = moves[moveIndex];
            prevIndex = moveIndex;
            inverse = Math.random() < 0.5;
            moveList.push({face:randomMove, ccw:inverse});            
        }
        rubiksCube.perform(moveList);
    }
    var ret = rubiksCube.moveListToString(moveList);
    document.getElementById('moveList').innerHTML = ret;
    return ret;
}

function initControls() {
    $('#controls .btn').click(function() {
        var arrControls = [
            "R","L","U","D","F","B",
            "R-prime","L-prime","U-prime","D-prime","F-prime","B-prime",
            "R2","L2","U2","D2","F2","B2"
            ];
        var control = this.id.replace('move-','');        
        var prime = false;
        var doubleMove = false;
        if (control.match('prime'))
            prime = true;
        if (control.match('2'))
            doubleMove = true;
        var layer = control.charAt(0);
        var moveList = [];
        moveList.push({face:layer, ccw:prime});            
        if (doubleMove) {
            moveList.push({face:layer, ccw:prime});            
        }
        rubiksCube.perform(moveList);
    });
}

$(document).ready(function() {
    start();
    $('#glcanvas').bind('contextmenu', function(e) { return false; });
    $('#glcanvas').mousedown(startRotate);
    $('#glcanvas').mousemove(rotate);
    $('#glcanvas').mouseup(endRotate);
    $('body').keypress(togglePerspective);
    $(window).resize(function() {
        CANVAS_X_OFFSET = $('#glcanvas').offset()['left'];
        CANVAS_Y_OFFSET = $('#glcanvas').offset()['top'];
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    });
    initControls();
    $('#reset-cube').click(function() {rubiksCube.init()});
    $('#scramble-cube').click(scramble);
});
