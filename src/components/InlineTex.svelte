<script>
    import { onMount } from 'svelte';
    import katex from 'katex';

    let element;

    onMount(() => 
        element.innerHTML = element.innerHTML.replace(/<i>(.*?)<\/i>/g, (_, s) =>
            katex.renderToString(s, { throwOnError: false })
        )
    );
</script>

<p bind:this={element} style="line-height: 1.3">
    <slot></slot>
</p>