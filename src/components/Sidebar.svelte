<script>
    import { Complex, parse as parseExpr } from 'mathjs';
    import katex from 'katex';
    import InlineTex from './InlineTex.svelte';

    export let hoverMarkerPosition, heatMapIndices, graph;

    const DIMENSION_MAP = { X: 'U', Y: 'Y', Z: 'X' }

    let round = a => parseFloat(a?.toFixed(2));
    let y = 0, x = 0, z = 0, v = 0;
    let eqnInput = 'z ^ 2', tex = '';
    let input, output = '';
    let graphError = false, readMore = false;

    function texToStr (string) {
        return katex.renderToString(string,  { displayMode: true, throwOnError: false });
    }

    function drawGraph () {
        try {
            let compiled = parseExpr(eqnInput).compile();
            compiled.evaluate({ z: Complex({ re: 0, im: 1 }), x: 0, y: 0 }); // tes

            graph.clear();
            graph.plot(compiled);
            graphError = false;
        } catch (e) {
            graphError = true;
        }
    }

    function updateInputAndOutput () {
        let l = graph.compiled.evaluate({ z: Complex({ re: z, im: y }), x: z, y });
            v = round((typeof l == 'object') ? l.im : 0);
            x = round((typeof l == 'object') ? l.re : 0);

        input = `${z} ${y < 0 ? '-' : ' +'} ${Math.abs(y)}i`;
        output = (typeof l == 'object') ? l.format({ precision: 4 }) : l;
    }

    function updateXYZ () {
        y = round(hoverMarkerPosition.y);
        x = round(hoverMarkerPosition.x);
        z = round(hoverMarkerPosition.z);
        if (graph.compiled) updateInputAndOutput();
    }

    $: updateXYZ(hoverMarkerPosition);
    $: try { tex = parseExpr(eqnInput).toTex() } catch (e) { tex = 'undefined' }
    // Y = z axis = y
    // X = y axis = u
    // Z = x axis = x
</script>

<svelte:head>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.12.0/dist/katex.min.css" integrity="sha384-AfEj0r4/OFrOo5t7NnNe46zW/tFgW6x/bCJG8FqQCEo3+Aro6EYUG4+cU+KJWu/X" crossorigin="anonymous">
</svelte:head>

<div class="sidebar shadow">
    <h2>3D Complex Graph</h2>

    <p>
        A simple three dimensional graph system to visualize 3D complex functions.
    </p>

    {#if readMore}
        <InlineTex>
            Complex numbers are in the form of <i>a + ib</i>. Here, <i>i</i> is the <i>\sqrt{-1}</i> and <i>a</i> is a real number and <i>b</i> is the real part of the imaginary number.<br/><br/>
            
            A complex function is a function from a complex number to a complex number.
            Here <i>f(z) = w</i> is a function, where <i>z</i> and <i>w</i> is a complex number and can be expressed as <i>z = x + yi</i> and <i>w = u + iv</i> respectively. (i.e. <i>f(x + iy) = u + iv</i>).<br/><br/>

            To plot a complex function in a graph, you would need four dimensions for <i>x</i>, <i>y</i>, <i>u</i> and <i>v</i>. 
            Here, <i>x</i>, <i>y</i> and <i>u</i> are represented with <strong>Z</strong>, <strong>Y</strong> and <strong>X</strong> axes. 
            We still have the <i>v</i> variable and since, we ran out of dimensions, we will be using colours to represent the <i>v</i> variable with a heatmap shown below.
            <br/><br/>

            This graph system is similar to <a href="https://en.wikipedia.org/wiki/Riemann_surface" style="color: black;">Reimann surface</a> but uses a set of lines instead of a surface.
        </InlineTex>
    {/if}

    <a href="#more" class="author" on:click={() => readMore = !readMore}>Read {readMore ? 'less...' : 'more...'}</a>

    <h3>Equation: </h3>
    <div class="contain">
        <input type="text" bind:value={eqnInput}/>
        <a 
            href="#graph" 
            class="btn" 
            style="background-color: {graphError ? 'red' : 'black'}; width: calc(100% - 18px); margin-left: 0; text-align: center"
            on:click={drawGraph}
        >{graphError ? 'Error!' : 'Graph'}</a>

        {@html texToStr(`f(z) = ${tex}`)}
    </div>

    <h3>Values: </h3>
    <div class="contain">
        <p class="value-expr">
            {@html texToStr('z = x + yi')}
            {@html texToStr('f(z) = w = u + vi')}
        </p>

        <strong>X</strong>: {z}<br/>
        <strong>Y</strong>: {isNaN(y) ? 0 : y}<br/>
        <strong>U</strong>: {x}<br/>
        <strong>V</strong>: {v}

        <div class="heatmap">V</div>
        <span class="flex flex-nowrap hmi">
            <p>{heatMapIndices[0].toFixed(2)}</p>
            <p style="text-align: right;">{heatMapIndices[1].toFixed(2)}</p>
        </span>

        <h4>Range:</h4>
        {#each ['Z', 'X', 'Y'] as x}
            <input 
                type="number" 
                value=-10
                id="min-{x}"
                on:change={e => {
                    let value = parseFloat(e.target.value);
                    let max = graph[`max${x}`];
                    value = max >= value ? value : max - 1;
    
                    graph[`min${x}`] = value;
                    e.target.value = value;
                    graph.resizeGraphSpace();
                }}
            /> ≤ 

            <strong>{DIMENSION_MAP[x]}</strong> ≤ 
            <input 
                type="number" 
                value=10
                id="max-{x}"
                on:change={e => {
                    let value = parseFloat(e.target.value);
                    let min = graph[`min${x}`];
                    value = min <= value ? value : min + 1;
    
                    graph[`max${x}`] = value;
                    e.target.value = value;
                    graph.resizeGraphSpace();
                }}
            />

            <div style="margin-top: 4px;"/>
        {/each}

        <strong>Interval (Y): </strong>
        <input 
            type="number" 
            value=1
            on:change={e => {
                let value = parseFloat(e.target.value);
                if (value <= 0) return;
                graph.intervalY = value;
                graph.resizeGraphSpace();
            }}
        />

        <h4>Input:</h4>
        <input 
            type="text" 
            bind:value={input}
            on:change={() => {
                try {
                    let { re, im } = Complex(input);
                    z = re;
                    y = im;

                    document.getElementById('min-Y').value = graph.minY = y - 5;
                    document.getElementById('max-Y').value = graph.maxY = y + 5;
                    document.getElementById('min-Z').value = graph.minZ = z - 5;
                    document.getElementById('max-Z').value = graph.maxZ = z + 5;

                    graph.resizeGraphSpace();
                    updateInputAndOutput();
                } catch (e) {}
            }}
        />

        <h4>Output:</h4>
        <input readonly type="text" value={output}/>
    </div>

    <h3>Settings: </h3>

    <a class="btn" href="#graph" on:click={() => graph.zoom()}>Zoom In</a>
    <a class="btn" href="#graph" on:click={() => graph.zoom(true)}>Zoom Out</a><br/>

    <div class="contain" style="margin-top: 5px;">
        <input type="checkbox" name="axes" bind:checked={graph.drawAxes}/>
        <label for="axes">Axes</label><br/>

        <input type="checkbox" name="labels" bind:checked={graph.drawLabels}/>
        <label for="axes">Labels</label><br/>
    </div><br/>

    <hr/>

    Made by <a href="https://github.com/scientific-dev" class="author">TheSudarsanDev</a><br/>
    TheSudarsanDev © {new Date().getFullYear()}
</div>

<style>
    .sidebar {
        position: fixed;
        height: calc(100% - 60px);
        border-right: 1px solid black;
        padding: 30px;
        z-index: 10;
        width: calc(30vw - 60px);
        background-color: white;
        overflow-y: auto;
    }

    .btn {
        text-decoration: none;
        display: inline-block;
        margin-left: 2px;
        margin-top: 2px;
        border-radius: 3px;
        padding: 3px 10px;
        background-color: var(--fg);
        color: var(--bg);
    }

    .contain {
        margin-left: 2px;
    }

    .value-expr :global(.katex-display) {
        margin: 0!important;
    }

    .value-expr {
        margin: 1em 0;
    }

    .heatmap {
        background: linear-gradient(to right, #00f, cyan, #0f0, yellow, red);
        color: white;
        border-radius: 3px;
        width: calc(100% - 6px);
        height: 15px;
        margin-top: 4px;
        padding: 3px;
        padding-bottom: 5px;
        font-weight: bold;
    }

    .hmi {
        margin-top: -10px;
    }

    .hmi p {
        min-width: 50%;
        display: block;
    }

    .author {
        text-decoration: underline;
        font-weight: bold;
        color: black;
    }

    h3 {
        margin-top: 10px;
        margin-bottom: 5px;
    }

    h4 {
        margin: 0;
        margin-top: 6px;
        margin-bottom: 2px;
    }

    input[type=text], input[type=number] {
        outline: none;
        padding: 5px;
        border-radius: 3px;
        border: 1px solid black;
    }

    input[type=text] {
        width: calc(100% - 10px);
    }

    input[type=number] {
        width: 40px;
    }

    input[type=checkbox] {
        display: inline-block;
        margin-top: 6px;
        cursor: pointer;
    }
</style>