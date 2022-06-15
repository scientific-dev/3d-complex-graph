<script>
    import { parse } from 'mathjs';
    import { onMount } from 'svelte';
    import Sidebar from './Sidebar.svelte';
    import Graph from '../utils/Graph';

    let sidebarOpen = true, 
        graphElement = null,
        graph = { range: 9 },
        hoverMarkerPosition = { x: 0, y: graph.range, z: 0 },
        heatMapIndices = [0, 0];

    onMount(() => {
        let eq = parse('z^2').compile();

        graph = new Graph(graphElement);
        graph.onHoverPoint = x => hoverMarkerPosition = x;
        graph.onGraphEnd = () => {
            heatMapIndices = graph.heatMapIndices;
            graph.drawClippingPlanes();
        }

        window.graph = graph;

        graph.plot(eq);
        heatMapIndices = graph.heatMapIndices;
    });
</script>

<svelte:window on:resize={() => graph?.onResize()}/>

{#if sidebarOpen}
    <Sidebar {graph} {hoverMarkerPosition} {heatMapIndices}/>
{/if}

<canvas bind:this={graphElement}/>

<a href="#graph" class="text-shadow" on:click={() => sidebarOpen = !sidebarOpen}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!-- Font Awesome Pro 5.15.4 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) --><path d="M16 132h416c8.837 0 16-7.163 16-16V76c0-8.837-7.163-16-16-16H16C7.163 60 0 67.163 0 76v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16z"/></svg>
</a>

<style>
    a {
        position: fixed;
        bottom: 10px;
        left: 10px;
        z-index: 10;
    }

    a svg {
        width: 25px;
        height: 25px;
    }

    canvas {
        width: 100vw;
        height: 100vh;
        position: absolute;
        top: 0;
    }

    @media (max-width: 1024px) {
        :global(.sidebar) { width: 80vw!important; }
    }
</style>