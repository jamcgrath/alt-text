<script>
	/**
	 * @fileoverview Alt Text Generator Page
	 * Main page component that renders the alt text generation tool
	 */
	
	import AltText from '$lib/components/AltText.svelte';
</script>

<svelte:head>
	<title>Alt Text Generator - WCAG Compliant Image Descriptions</title>
	<meta name="description" content="Generate WCAG-compliant alt text for images using AI. Upload images or provide URLs to create accessible image descriptions." />
</svelte:head>

<div class="container mx-auto py-8">
	<h1 class="text-3xl font-bold text-center mb-8">Alt Text Generator</h1>
	<AltText />
</div>
