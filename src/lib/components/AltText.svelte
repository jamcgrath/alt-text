<script>
	let mode = $state('image'); // 'image' or 'url'
	let imageData = $state(null);
	let urlInput = $state('');
	let isDragOver = $state(false);
	let contextExpanded = $state(false);
	let contextText = $state('');
	let wcagExpanded = $state(false);
	let generatedAltText = $state('A colorful bar chart showing quarterly sales data with an upward trend from Q1 to Q4, indicating steady business growth throughout the year.');
	let isEditing = $state(false);
	let copySuccess = $state(false);
	let announceMessage = $state('');
	let submitError = $state('');
	let isLoading = $state(false);

	// Handle file upload
	function handleFileSelect(event) {
		const file = event.target.files[0];
		if (file && file.type.startsWith('image/')) {
			convertToBase64(file);
			announceMessage = `Image ${file.name} uploaded successfully`;
		} else if (file) {
			announceMessage = 'Please select a valid image file';
		}
	}

	// Handle drag and drop
	function handleDrop(event) {
		event.preventDefault();
		isDragOver = false;

		const file = event.dataTransfer.files[0];
		if (file && file.type.startsWith('image/')) {
			convertToBase64(file);
			announceMessage = `Image ${file.name} uploaded via drag and drop`;
		} else if (file) {
			announceMessage = 'Please drop a valid image file';
		}
	}

	function handleDragOver(event) {
		event.preventDefault();
		isDragOver = true;
	}

	function handleDragLeave() {
		isDragOver = false;
	}

	// Convert file to base64
	function convertToBase64(file) {
		const reader = new FileReader();
		reader.onload = (e) => {
			imageData = e.target.result;
		};
		reader.readAsDataURL(file);
	}

	// Sanitize URL input
	function sanitizeUrl(url) {
		try {
			const sanitized = new URL(url.trim());
			return sanitized.href;
		} catch {
			return '';
		}
	}

	// Get sanitized URL
	const sanitizedUrl = $derived(urlInput ? sanitizeUrl(urlInput) : '');
	const isValidUrl = $derived(urlInput && sanitizedUrl);
	const hasUrlError = $derived(urlInput && !sanitizedUrl);

	// Check if we can submit
	const canSubmit = $derived((mode === 'image' && imageData) || (mode === 'url' && isValidUrl));

	// Alt text quality analysis
	const altTextAnalysis = $derived(() => {
		if (!generatedAltText) return null;

		const text = generatedAltText.trim();
		const charCount = text.length;
		const issues = [];
		let score = 100;

		// Check character count
		if (charCount > 125) {
			issues.push(`Too long (${charCount} characters). WCAG recommends under 125 characters.`);
			score -= 20;
		} else if (charCount < 10) {
			issues.push('Very short. Consider adding more descriptive details.');
			score -= 15;
		}

		// Check for redundant phrases
		const redundantPhrases = ['image of', 'picture of', 'photo of', 'graphic of', 'illustration of'];
		const lowerText = text.toLowerCase();
		for (const phrase of redundantPhrases) {
			if (lowerText.startsWith(phrase)) {
				issues.push(`Avoid starting with "${phrase}". Start with the actual description.`);
				score -= 15;
				break;
			}
		}

		// Check for vague descriptions
		const vagueWords = ['something', 'things', 'stuff', 'various', 'some'];
		for (const word of vagueWords) {
			if (lowerText.includes(word)) {
				issues.push('Consider being more specific instead of using vague terms.');
				score -= 10;
				break;
			}
		}

		// Check if it's just a filename or URL
		if (text.includes('.jpg') || text.includes('.png') || text.includes('.gif') || text.includes('http')) {
			issues.push('Appears to contain filename or URL. Describe the image content instead.');
			score -= 25;
		}

		// Positive feedback for good practices
		if (charCount >= 20 && charCount <= 100) {
			score += 5; // Bonus for good length
		}

		// Ensure score doesn't go below 0
		score = Math.max(0, score);

		return {
			charCount,
			isOptimalLength: charCount >= 20 && charCount <= 125,
			issues,
			score,
			quality: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'needs improvement'
		};
	});

	// Determine button text based on state
	const buttonText = $derived(
		isLoading ? 'Generating...' : !generatedAltText ? 'Generate Alt Text' : 'Regenerate Alt Text'
	);

	// Handle submit
	async function handleSubmit() {
		// Prevent multiple submissions
		if (isLoading) return;

		// Clear previous error
		submitError = '';

		if (!canSubmit) {
			if (mode === 'image') {
				submitError = 'Please upload an image to generate alt text';
			} else {
				submitError = 'Please enter a valid URL to generate alt text';
			}
			announceMessage = submitError;
			return;
		}

		// Start loading state
		isLoading = true;
		announceMessage = 'Generating alt text...';

		try {
			// TODO: Implement LLM API call
			const payload =
				mode === 'image'
					? {
							type: 'image',
							data: imageData,
							context: contextText,
							previousAltText: generatedAltText || null
						}
					: {
							type: 'url',
							data: sanitizedUrl,
							context: contextText,
							previousAltText: generatedAltText || null
						};

			console.log('Submitting:', payload);

			// Simulate API delay
			await new Promise(resolve => setTimeout(resolve, 2000));

			// Show dummy alt text
			const isRegeneration = !!generatedAltText;
			generatedAltText = isRegeneration
				? 'An updated colorful bar chart displaying quarterly sales figures with a clear upward trajectory from Q1 to Q4, demonstrating consistent business growth and improved performance throughout the fiscal year.'
				: 'A colorful bar chart showing quarterly sales data with an upward trend from Q1 to Q4, indicating steady business growth throughout the year.';

			isEditing = false;
			announceMessage = isRegeneration
				? 'Alt text has been regenerated successfully'
				: 'Alt text has been generated successfully';
		} catch (error) {
			console.error('Error generating alt text:', error);
			submitError = 'Failed to generate alt text. Please try again.';
			announceMessage = 'Error generating alt text';
		} finally {
			isLoading = false;
		}
	}

	// Handle keyboard events for file upload area
	function handleUploadKeydown(event) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			document.getElementById('file-input')?.click();
		}
	}


	// Handle click to edit
	function handleTextareaClick() {
		if (!isEditing) {
			isEditing = true;
			announceMessage = 'Alt text is now editable';
		}
	}

	// Handle copy to clipboard
	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(generatedAltText);
			copySuccess = true;
			announceMessage = 'Alt text copied to clipboard';
			setTimeout(() => (copySuccess = false), 2000);
		} catch (err) {
			console.error('Failed to copy text: ', err);
			announceMessage = 'Failed to copy text to clipboard';
		}
	}

</script>

<div class="mx-auto max-w-2xl p-5">
	<!-- Screen Reader Announcements -->
	<div aria-live="polite" aria-atomic="true" class="sr-only">
		{announceMessage}
	</div>

	<!-- Mode Switch -->
	<fieldset class="mb-5">
		<legend class="sr-only">Choose input method for alt text generation</legend>
		<div
			class="mb-5 flex rounded-lg bg-gray-100 p-1"
			role="tablist"
			aria-label="Input method selection"
		>
			<button
				class="flex-1 rounded-md px-6 py-3 font-medium transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none {mode ===
				'image'
					? 'bg-white text-blue-600 shadow-sm'
					: 'text-gray-600 hover:text-gray-800'}"
				onclick={() => (mode = 'image')}
				role="tab"
				aria-selected={mode === 'image'}
				aria-controls="input-panel"
				id="image-tab"
			>
				Image
			</button>
			<button
				class="flex-1 rounded-md px-6 py-3 font-medium transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none {mode ===
				'url'
					? 'bg-white text-blue-600 shadow-sm'
					: 'text-gray-600 hover:text-gray-800'}"
				onclick={() => (mode = 'url')}
				role="tab"
				aria-selected={mode === 'url'}
				aria-controls="input-panel"
				id="url-tab"
			>
				URL
			</button>
		</div>
	</fieldset>

	<!-- Input Area -->
	<div class="min-h-[200px]" role="tabpanel" id="input-panel" aria-labelledby="{mode}-tab">
		{#if mode === 'image'}
			<!-- File Upload/Drop Area -->
			<div
				class="cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none {isDragOver
					? 'border-blue-500 bg-blue-50'
					: 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'}"
				ondrop={handleDrop}
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				onkeydown={handleUploadKeydown}
				tabindex="0"
				role="button"
				aria-label="Upload image file or drag and drop. Press Enter or Space to select file."
				aria-describedby="upload-instructions"
			>
				<input
					type="file"
					accept="image/*"
					onchange={handleFileSelect}
					id="file-input"
					class="hidden"
					aria-label="Select image file"
				/>

				{#if imageData}
					<div class="space-y-3">
						<img
							src={imageData}
							alt="Uploaded preview"
							class="mx-auto max-h-72 max-w-full rounded-lg"
						/>
						<button
							onclick={() => {
								imageData = null;
								announceMessage = 'Image removed';
							}}
							class="rounded-md bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
							aria-label="Remove uploaded image"
						>
							Remove
						</button>
					</div>
				{:else}
					<label for="file-input" class="block cursor-pointer">
						<div class="space-y-4">
							<svg
								class="mx-auto h-12 w-12 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
								/>
							</svg>
							<div id="upload-instructions">
								<p class="mb-2 text-lg text-gray-700">Drop an image here or click to upload</p>
								<span class="text-sm text-gray-500">Supports: JPG, PNG, GIF, WebP</span>
							</div>
						</div>
					</label>
				{/if}
			</div>
		{:else}
			<!-- URL Input -->
			<div class="space-y-3 py-5">
				<label for="url-input" class="sr-only">Image URL</label>
				<input
					type="url"
					id="url-input"
					placeholder="Enter image URL..."
					bind:value={urlInput}
					class="w-full rounded-lg border-2 border-gray-300 p-4 text-base transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
					aria-describedby={hasUrlError ? 'url-error' : isValidUrl ? 'url-success' : undefined}
					aria-invalid={hasUrlError}
				/>
				{#if hasUrlError}
					<p class="text-sm text-red-500" id="url-error" role="alert">Please enter a valid URL</p>
				{/if}
				{#if isValidUrl}
					<p class="text-sm break-all text-green-600" id="url-success">Valid URL: {sanitizedUrl}</p>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Context Section -->
	<div class="mt-6 rounded-lg border border-gray-200">
		<button
			onclick={() => (contextExpanded = !contextExpanded)}
			class="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:ring-inset"
			aria-expanded={contextExpanded}
			aria-controls="context-content"
			id="context-toggle"
		>
			<span class="font-medium text-gray-700">Additional Context (Optional)</span>
			<svg
				class="h-5 w-5 text-gray-500 transition-transform duration-200 {contextExpanded
					? 'rotate-180'
					: ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>

		{#if contextExpanded}
			<div
				class="border-t border-gray-200 px-4 pb-4"
				id="context-content"
				aria-labelledby="context-toggle"
			>
				<label for="context-textarea" class="sr-only"
					>Additional context for alt text generation</label
				>
				<textarea
					bind:value={contextText}
					id="context-textarea"
					placeholder="Describe the image context, intended audience, or specific details you'd like emphasized in the alt text..."
					class="mt-3 w-full resize-none rounded-md border border-gray-300 p-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
					rows="4"
					aria-describedby="context-help"
				></textarea>
				<p class="mt-2 text-sm text-gray-500" id="context-help">
					Example: "This chart shows quarterly sales data - focus on the upward trend rather than
					specific numbers" or "This decorative image sets the mood but doesn't convey essential
					information."
				</p>
			</div>
		{/if}
	</div>

	<!-- Submit Button -->
	<div class="mt-6 text-center">
		<button
			onclick={handleSubmit}
			disabled={isLoading}
			class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3 font-medium text-white transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none {canSubmit && !isLoading
				? 'cursor-pointer hover:bg-blue-700'
				: 'cursor-not-allowed opacity-50'}"
			aria-describedby={submitError ? 'submit-error' : undefined}
		>
			{#if isLoading}
				<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
			{/if}
			{buttonText}
		</button>
		{#if submitError}
			<p class="mt-2 text-sm text-red-500" id="submit-error" role="alert">
				{submitError}
			</p>
		{/if}
		{#if isLoading}
			<p class="mt-2 text-sm text-gray-600" aria-live="polite">
				Processing your request...
			</p>
		{/if}
	</div>

	<!-- Generated Alt Text Display -->
	{#if generatedAltText}
		<div
			class="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4"
			role="region"
			aria-labelledby="result-heading"
		>
			<div class="mb-3 flex items-center justify-between">
				<h3 class="font-medium text-gray-800" id="result-heading">Generated Alt Text</h3>
				<button
					onclick={copyToClipboard}
					class="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
					aria-label="Copy alt text to clipboard"
				>
					{#if copySuccess}
						<svg
							class="h-4 w-4 text-green-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						Copied!
					{:else}
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
							/>
						</svg>
						Copy
					{/if}
				</button>
			</div>

			<div class="relative">
				<label for="alt-text-result" class="sr-only">Generated alt text (click to edit)</label>
				<div
					bind:textContent={generatedAltText}
					contenteditable="true"
					onclick={handleTextareaClick}
					id="alt-text-result"
					class="w-full rounded-md border border-gray-300 p-3 transition-all duration-200 min-h-[60px] {isEditing
						? 'bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
						: 'cursor-pointer bg-gray-100 hover:bg-gray-200'}"
					aria-describedby="edit-instructions"
					role="textbox"
					aria-multiline="true"
				></div>

				{#if !isEditing}
					<div
						class="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100"
					>
						<div
							class="bg-opacity-75 rounded bg-black px-2 py-1 text-xs text-white"
							id="edit-instructions"
						>
							Click to edit
						</div>
					</div>
				{/if}
			</div>

			<!-- Quality Feedback -->
			{#if altTextAnalysis}
				<div class="mt-3 space-y-2">
					<!-- Character Count and Quality Score -->
					<div class="flex items-center justify-between text-sm">
						<div class="flex items-center gap-2">
							<span class="text-gray-600">
								Characters: 
								<span class="{altTextAnalysis.charCount > 125 ? 'text-red-600 font-medium' : altTextAnalysis.isOptimalLength ? 'text-green-600' : 'text-gray-800'}">
									{altTextAnalysis.charCount}
								</span>
								<span class="text-gray-400">/ 125</span>
							</span>
							{#if altTextAnalysis.charCount > 125}
								<span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Too long</span>
							{:else if altTextAnalysis.isOptimalLength}
								<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Good length</span>
							{/if}
						</div>
						
						<div class="flex items-center gap-2">
							<span class="text-gray-600">Quality:</span>
							<div class="flex items-center gap-1">
								<div class="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
									<div 
										class="h-full transition-all duration-300 {altTextAnalysis.quality === 'excellent' ? 'bg-green-500' : altTextAnalysis.quality === 'good' ? 'bg-blue-500' : altTextAnalysis.quality === 'fair' ? 'bg-yellow-500' : 'bg-red-500'}"
										style="width: {altTextAnalysis.score}%"
									></div>
								</div>
								<span class="text-xs font-medium {altTextAnalysis.quality === 'excellent' ? 'text-green-600' : altTextAnalysis.quality === 'good' ? 'text-blue-600' : altTextAnalysis.quality === 'fair' ? 'text-yellow-600' : 'text-red-600'}">
									{altTextAnalysis.score}%
								</span>
							</div>
						</div>
					</div>

					<!-- Issues and Suggestions -->
					{#if altTextAnalysis.issues && altTextAnalysis.issues.length > 0}
						<div class="bg-yellow-50 border border-yellow-200 rounded-md p-3">
							<h4 class="text-sm font-medium text-yellow-800 mb-2">Suggestions for improvement:</h4>
							<ul class="text-sm text-yellow-700 space-y-1">
								{#each altTextAnalysis.issues as issue}
									<li class="flex items-start gap-2">
										<svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
										</svg>
										{issue}
									</li>
								{/each}
							</ul>
						</div>
					{:else if altTextAnalysis.quality === 'excellent'}
						<div class="bg-green-50 border border-green-200 rounded-md p-3">
							<div class="flex items-center gap-2">
								<svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
								</svg>
								<span class="text-sm font-medium text-green-800">Excellent alt text!</span>
							</div>
							<p class="text-sm text-green-700 mt-1">This alt text follows WCAG guidelines and best practices.</p>
						</div>
					{/if}
				</div>
			{/if}

			{#if isEditing}
				<div class="mt-2 flex justify-end gap-2">
					<button
						onclick={() => {
							isEditing = false;
							announceMessage = 'Finished editing alt text';
						}}
						class="px-3 py-1 text-sm text-gray-600 transition-colors hover:text-gray-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
						aria-label="Finish editing alt text"
					>
						Done
					</button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Visual Separator -->
	<div class="mt-8 border-t border-gray-200"></div>

	<!-- WCAG Guidelines Help -->
	<div class="mt-6 flex justify-start">
		<button
			onclick={() => (wcagExpanded = !wcagExpanded)}
			class="inline-flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
			aria-expanded={wcagExpanded}
			aria-controls="wcag-content"
			aria-label="View WCAG Alt Text Guidelines"
		>
			<div
				class="flex h-4 w-4 items-center justify-center rounded-full border border-gray-400 text-xs font-medium"
				aria-hidden="true"
			>
				?
			</div>
			WCAG Alt Text Guidelines
		</button>
	</div>

	{#if wcagExpanded}
		<div
			class="mt-4 rounded-lg border border-gray-200"
			id="wcag-content"
			role="region"
			aria-label="WCAG Alt Text Guidelines"
		>
			<div class="px-4 py-4">
				<div class="mt-3 space-y-4 text-sm">
					<div>
						<h4 class="mb-2 font-semibold text-gray-800">Key WCAG 2.1 Criteria for Alt Text:</h4>

						<div class="space-y-3">
							<div>
								<strong class="text-gray-700">1.1.1 Non-text Content (Level A)</strong>
								<p class="mt-1 text-gray-600">
									All non-text content must have a text alternative that serves the equivalent
									purpose.
								</p>
							</div>

							<div>
								<strong class="text-gray-700">Best Practices:</strong>
								<ul class="mt-1 list-inside list-disc space-y-1 text-gray-600">
									<li><strong>Be concise:</strong> Usually under 125 characters</li>
									<li><strong>Be descriptive:</strong> Convey the essential information</li>
									<li>
										<strong>Avoid redundancy:</strong> Don't start with "Image of..." or "Picture of..."
									</li>
									<li>
										<strong>Context matters:</strong> Consider the image's purpose in the content
									</li>
									<li>
										<strong>Decorative images:</strong> Use empty alt="" for purely decorative images
									</li>
									<li>
										<strong>Complex images:</strong> Provide detailed description elsewhere and reference
										it
									</li>
								</ul>
							</div>

							<div>
								<strong class="text-gray-700">Types of Images:</strong>
								<ul class="mt-1 list-inside list-disc space-y-1 text-gray-600">
									<li><strong>Informative:</strong> Describe the essential information</li>
									<li><strong>Functional:</strong> Describe the action or destination</li>
									<li><strong>Decorative:</strong> Use empty alt attribute (alt="")</li>
									<li><strong>Complex:</strong> Provide summary in alt, full description nearby</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
