import * as THREE from 'three';
import { Complex } from 'mathjs';
import { hsl } from 'colormath.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

const RADIANS90 = Math.PI * 0.5;
const POINTER_GEOM = new THREE.SphereGeometry(.2);
const POINTER_MAT = new THREE.MeshBasicMaterial({ color: 0x0 });
const LINE_MAT = new THREE.LineBasicMaterial({ vertexColors: true });

export default class Graph {

    compiled = { evaluate: () => {} };
    plotQueue = [];
    hoverPointObject = null;
    hoverPointFixed = false;
    heatMapIndices = [0, 0];
    curves = [];
    labels = [];
    axesHelper = null;
    settings = {};

    minX = -10;
    maxX = 10;
    minY = -10;
    maxY  = 10;
    minZ = -10;
    maxZ = 10;
    intervalY = 1;

    onHoverPoint = () => {};
    onGraphEnd = () => {};

    constructor (element) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xfafafa);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(-this.maxDiffXYZ / 2, this.maxDiffXYZ / 2, -(this.maxDiffXYZ + 20));
        this.scene.add(this.camera);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: element });
        this.renderer.localClippingEnabled = true;
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.labelRenderer = new CSS2DRenderer();
		this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
		this.labelRenderer.domElement.style.position = 'absolute';
		this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.width = '100vw';
        this.labelRenderer.domElement.style.height = '100vh';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
		document.body.appendChild(this.labelRenderer.domElement);
        
        this.controls = new OrbitControls(this.camera, element);
        this.controls.target.set(this.maxX, this.minY, this.maxZ);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;
        this.controls.enableZoom = true;
        this.drawAxes = true;
        this.drawLabels = true;

        this.onResize();
        this.animate();

        element.addEventListener('mousemove', e => this.onHover(e), false);
        element.addEventListener('click', e => this.onHover(e, true));
    }

    get diffX () { return this.maxX - this.minX; }
    get diffY () { return this.maxY - this.minY; }
    get diffZ () { return this.maxZ - this.minZ; }
    get maxDiffXYZ () { return Math.max(this.diffX, this.diffY, this.diffZ); }
    get maxXYZ () { return Math.max(this.maxX, this.maxY, this.maxZ); }
    get drawAxes () { return this.settings.drawAxes; }
    get drawLabels () { return this.settings.drawLabels; }

    set drawAxes (x) {
        if (x && !this.settings.drawAxes) {
            let maxDiff = this.maxDiffXYZ;
    
            this.axesHelper = new THREE.AxesHelper(maxDiff);
            this.axesHelper.position.set(this.maxX, this.minY, this.maxZ);
            this.axesHelper.rotateY(-RADIANS90 * 2);
            this.axesHelper.setColors(0x0, 0x0, 0x0);
            this.axesHelper.geometry.attributes.position.setZ(5, this.diffZ);
            
            this.scene.add(this.axesHelper)
        } else if (!x && this.settings.drawAxes) {
            this.scene.remove(this.axesHelper);
            this.axesHelper.geometry.dispose();
        }

        this.settings.drawAxes = x;
    }

    set drawLabels (x) {
        if (x && !this.settings.drawLabels) {
            let round = a => parseFloat(a.toFixed(2));

            this.camera.layers.enable(1);
            this.drawLabel('Y', this.maxX, this.minY + this.diffY + 2, this.maxZ, 'strong');
            for (let i = 0; i <= this.diffY; i += 10) 
                this.drawLabel(round(this.minY + i), this.maxX + 2, this.minY + i, this.maxZ + 2);

            this.drawLabel('U', this.maxX - (this.diffX + 2), this.minY, this.maxZ, 'strong');
            for (let i = 0; i <= this.diffX; i += 10) 
                this.drawLabel(round(this.minX + i), this.minX + i, this.minY, this.maxZ + 2);

            this.drawLabel('X', this.maxX, this.minY, this.maxZ - (this.diffZ + 2), 'strong');
            for (let i = 0; i <= this.diffZ; i += 10) 
                this.drawLabel(round(this.minZ + i), this.maxX + 2, this.minY, this.minZ + i);
        } else if (!x && this.settings.drawLabels) this.camera.layers.disable(1);

        this.settings.drawLabels = x;
    }

    onResize () {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }

    onHover (event, isClick) {
        event.preventDefault();

        if (this.hoverPointFixed && !isClick) return;
        
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        this.scene.remove(this.hoverPointObject);
        
        let intersects = this.raycaster.intersectObject(this.scene, true);
        let intersected = intersects[0];

        if (intersects.length && intersected.object.name == 'curve') {
            let sphere = new THREE.Mesh(POINTER_GEOM, POINTER_MAT);
            sphere.position.set(intersected.point.x, intersected.point.y, intersected.point.z);
            this.hoverPointObject = sphere;
            this.scene.add(sphere);
            this.onHoverPoint(intersected.point);
            this.hoverPointFixed = isClick;
        } else if (isClick) this.hoverPointFixed = false;
    }

    drawLabel (txt, x, y, z, className) {
        let text = document.createElement('div');
		text.className = 'label ' + className;
		text.textContent = txt;

		let object = new CSS2DObject(text);
        object.position.set(x, y, z);
        object.layers.set(1);
        object.name = 'label';
        
	    this.scene.add(object);
        this.labels.push(object);
    }

    drawClippingPlanes () { 
        this.renderer.clippingPlanes = [
            new THREE.Plane(new THREE.Vector3(-1, 0, 0), this.maxX + .5), 
            new THREE.Plane(new THREE.Vector3(1, 0, 0), -this.minX + .5),
            new THREE.Plane(new THREE.Vector3(0, -1, 0), this.maxY + .5)
        ];
    }

    animate () {
        this.controls.update();
        requestAnimationFrame(this.animate.bind(this));
        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }

    plot (compiled) {
        this.compiled = compiled;

        let imaginaryValues = {},
            interval = this.intervalY,
            f = x => (typeof x == 'object') ? x : { re: x, im: 0 };

        for (let i = this.minY; i <= this.maxY; i += interval) {
            let points = [];
            imaginaryValues[i] = {};

            for (let r = this.minZ; r <= this.maxZ; r++) {
                let x = new Complex({ re: r, im: i });
                let { re: y1, im = 0 } = f(compiled.evaluate({ z: x, y: i, x: r }));
                imaginaryValues[i][r] = im;

                points.push(new THREE.Vector3(isNaN(y1) ? Infinity : y1, r, 0));
            }
        
            this.plotCurve(points, i, imaginaryValues);
        }

        let [min, max] = this.getImColorRange(imaginaryValues);
        let absMin = Math.abs(min);
        let diff = absMin + Math.abs(max);
        let getHeatMapColor = (diff == 0) 
            ? () => [0, 255, 0]
            : x => hsl.toRgb([(1 - x) * 240, 100, 50]);

        for (let j = 0; j < this.plotQueue.length; j++) {
            let { curve, i } = this.plotQueue[j];
            let colors = [];

            for (let r = this.minZ; r <= this.maxZ; r++) {
                let value = imaginaryValues[i][r];
                colors.push(...getHeatMapColor((value + absMin) / diff));
            }

            curve.geometry.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(colors), 3, true));
            this.curves.push(curve);
        }

        this.scene.add(...this.curves);
        this.heatMapIndices = [min, max];
        this.plotQueue = [];
        this.onGraphEnd();
    }

    plotCurve (points, i) {
        // points = new THREE.SplineCurve(points)
        //     .getPoints(30);
            
        let geometry = new THREE.BufferGeometry().setFromPoints(points);
        let curve = new THREE.Line(geometry, LINE_MAT).rotateX(3 * -RADIANS90);

        curve.position.y = i;
        curve.name = 'curve';

        this.plotQueue.push({ curve, i });
    }

    getHeatMapColor (value) {
        return hsl.toRgb([(1 - value) * 240, 100, 50]);
    }

    getImColorRange (imv) {
        let min = 0,
            max = 0;

        for (const values of Object.values(imv)) {
            for (const x of Object.values(values)) {
                if (x < min) min = x;
                else if (x > max) max = x;
            }
        }

        return [min, max];
    }

    zoom (out) {
        let fov = Math.floor((2 * Math.atan(this.camera.getFilmHeight() / 2 / this.camera.getFocalLength()) * 180) / Math.PI);

        if (fov >= 20 && !out) this.camera.fov = fov - 5;
        else if (fov <= 175 && out) this.camera.fov = fov + 5;
        this.camera.updateProjectionMatrix();
    }

    clear () {
        this.drawAxes = this.drawLabels = false;
        this.curves.forEach(x => x.geometry.dispose());
        this.scene.remove(...this.curves, ...this.labels);
        this.curves = [];
        this.drawAxes = this.drawLabels = true;
    }

    resizeGraphSpace () {
        this.clear();
        this.plot(this.compiled);
        this.camera.position.set(-this.maxDiffXYZ / 2, this.maxDiffXYZ / 2, -(this.maxDiffXYZ + 20));
        this.controls.target.set(this.maxX, this.minY, this.maxZ);
        this.drawClippingPlanes();
    }

}