<script>
	/**
	 * @fileoverview Alt Text Generator Component
	 * A comprehensive tool for generating WCAG-compliant alt text using AI
	 * Supports image uploads, URLs, context, and maintains generation history
	 */

	// ===== STATE VARIABLES =====
	
	/** @type {'image'|'url'} Current input mode */
	let mode = $state('image');
	
	/** @type {string|null} Base64 encoded image data */
	let imageData = $state(null);
	
	/** @type {string} URL input value */
	let urlInput = $state('');
	
	/** @type {boolean} Drag and drop state */
	let isDragOver = $state(false);
	
	/** @type {boolean} Context section expanded state */
	let contextExpanded = $state(false);
	
	/** @type {string} Additional context for alt text generation */
	let contextText = $state('');
	
	/** @type {boolean} WCAG guidelines section expanded state */
	let wcagExpanded = $state(false);
	
	/** @type {string} Generated alt text content */
	let generatedAltText = $state('');
	
	/** @type {boolean} Alt text editing mode */
	let isEditing = $state(false);
	
	/** @type {boolean} Copy to clipboard success state */
	let copySuccess = $state(false);
	
	/** @type {string} Screen reader announcement message */
	let announceMessage = $state('');
	
	/** @type {string} Form submission error message */
	let submitError = $state('');
	
	/** @type {boolean} API request loading state */
	let isLoading = $state(false);
	
	/** @type {boolean} History section expanded state */
	let historyExpanded = $state(true);
	
	/** @type {boolean} Comparison modal visibility */
	let showComparison = $state(false);
	
	/** @type {string} Alt text for comparison */
	let comparisonText = $state('');

	// ===== FILE HANDLING =====

	/**
	 * Handle file selection from input
	 * @param {Event} event - File input change event
	 */
	function handleFileSelect(event) {
		const file = event.target.files[0];
		if (file && file.type.startsWith('image/')) {
			convertToBase64(file);
			generatedAltText = '';
			announceMessage = `Image ${file.name} uploaded successfully`;
		} else if (file) {
			announceMessage = 'Please select a valid image file';
		}
	}

	/**
	 * Handle drag and drop file upload
	 * @param {DragEvent} event - Drop event
	 */
	function handleDrop(event) {
		event.preventDefault();
		isDragOver = false;

		const file = event.dataTransfer.files[0];
		if (file && file.type.startsWith('image/')) {
			convertToBase64(file);
			generatedAltText = '';
			announceMessage = `Image ${file.name} uploaded via drag and drop`;
		} else if (file) {
			announceMessage = 'Please drop a valid image file';
		}
	}

	/**
	 * Handle drag over event for visual feedback
	 * @param {DragEvent} event - Drag over event
	 */
	function handleDragOver(event) {
		event.preventDefault();
		isDragOver = true;
	}

	/**
	 * Handle drag leave event
	 */
	function handleDragLeave() {
		isDragOver = false;
	}

	/**
	 * Convert file to base64 data URL
	 * @param {File} file - Image file to convert
	 */
	function convertToBase64(file) {
		const reader = new FileReader();
		reader.onload = (e) => {
			imageData = e.target.result;
		};
		reader.readAsDataURL(file);
	}

	// ===== URL HANDLING =====

	/**
	 * Sanitize and validate URL input
	 * @param {string} url - Raw URL input
	 * @returns {string} Sanitized URL or empty string if invalid
	 */
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

	// Reset history when URL changes to a valid URL
	$effect(() => {
		if (isValidUrl && urlInput) {
			generatedAltText = '';
		}
	});

	// Check if we can submit
	const canSubmit = $derived((mode === 'image' && imageData) || (mode === 'url' && isValidUrl));

	// History management
	const historyKey = 'altTextHistory';
	const maxHistoryItems = 20;

	function saveToHistory(altText, inputData) {
		if (typeof window === 'undefined') return;

		const historyItem = {
			id: Date.now(),
			altText: altText.trim(),
			timestamp: new Date().toISOString(),
			inputType: mode,
			context: contextText,
			...inputData
		};

		const existingHistory = getHistory();
		const newHistory = [historyItem, ...existingHistory.slice(0, maxHistoryItems - 1)];

		localStorage.setItem(historyKey, JSON.stringify(newHistory));
		
		// Update the reactive history array
		history = newHistory;
	}

	function getHistory() {
		if (typeof window === 'undefined') return [];

		try {
			const stored = localStorage.getItem(historyKey);
			return stored ? JSON.parse(stored) : [];
		} catch {
			return [];
		}
	}

	function clearHistory() {
		if (typeof window === 'undefined') return;

		// Clear localStorage
		localStorage.removeItem(historyKey);

		// Clear reactive history array
		history = [];

		announceMessage = 'History cleared';
	}

	function loadFromHistory(item) {
		generatedAltText = item.altText;
		isEditing = false;
		announceMessage = `Loaded alt text from ${new Date(item.timestamp).toLocaleDateString()}`;
	}

	function compareWithCurrent(historyText) {
		comparisonText = historyText;
		showComparison = true;
	}

	// Get history for display
	let history = $state([]);

	// Load history on component mount
	$effect(() => {
		if (typeof window !== 'undefined') {
			history = getHistory();
		}
	});

	// Character count - simple and independent
	const charCount = $derived(() => {
		if (!generatedAltText) return 0;
		return generatedAltText.trim().length;
	});

	const isOptimalLength = $derived(() => {
		const count = charCount();
		return count >= 20 && count <= 125;
	});

	// Simple quality feedback based on common issues
	const qualityFeedback = $derived(() => {
		if (!generatedAltText) return null;

		const text = generatedAltText.trim();
		const issues = [];

		// Check for redundant phrases
		const redundantPhrases = ['image of', 'picture of', 'photo of', 'graphic of', 'illustration of'];
		const lowerText = text.toLowerCase();
		for (const phrase of redundantPhrases) {
			if (lowerText.startsWith(phrase)) {
				issues.push(`Avoid starting with "${phrase}". Start with the actual description.`);
				break;
			}
		}

		// Check for vague descriptions
		const vagueWords = ['something', 'things', 'stuff', 'various', 'some'];
		for (const word of vagueWords) {
			if (lowerText.includes(word)) {
				issues.push('Consider being more specific instead of using vague terms.');
				break;
			}
		}

		// Check if it's just a filename or URL
		if (text.includes('.jpg') || text.includes('.png') || text.includes('.gif') || text.includes('http')) {
			issues.push('Appears to contain filename or URL. Describe the image content instead.');
		}

		return { issues };
	});

	// Determine button text based on state
	const buttonText = $derived(
		isLoading ? 'Generating...' : !generatedAltText ? 'Generate Alt Text' : 'Regenerate Alt Text'
	);

	// ===== EVENT HANDLERS =====

	/**
	 * Handle form submission for alt text generation
	 */
	async function handleSubmit() {
		if (isLoading) return;

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

		isLoading = true;
		announceMessage = 'Generating alt text...';

		try {
			/** @type {Object} API request payload */
			const payload = mode === 'image'
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

			const response = await fetch('/api/generate-alt-text', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to generate alt text');
			}

			const isRegeneration = !!generatedAltText;
			generatedAltText = result.altText;

			// Save to history with appropriate input data
			const inputData = mode === 'image'
				? { hasImage: true, imageSize: imageData ? 'uploaded' : null, imageData: imageData }
				: { url: sanitizedUrl };

			saveToHistory(result.altText, inputData);

			isEditing = false;
			announceMessage = isRegeneration
				? 'Alt text has been regenerated successfully'
				: 'Alt text has been generated successfully';

		} catch (error) {
			console.error('Error generating alt text:', error);
			submitError = error.message || 'Failed to generate alt text. Please try again.';
			announceMessage = 'Error generating alt text';
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Handle keyboard events for file upload area accessibility
	 * @param {KeyboardEvent} event - Keyboard event
	 */
	function handleUploadKeydown(event) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			document.getElementById('file-input')?.click();
		}
	}

	/**
	 * Handle click to edit generated alt text
	 */
	function handleTextareaClick() {
		if (!isEditing) {
			isEditing = true;
			announceMessage = 'Alt text is now editable';
		}
	}

	/**
	 * Copy generated alt text to clipboard
	 */
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
			class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3 font-medium text-white transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none {canSubmit &&
			!isLoading
				? 'cursor-pointer hover:bg-blue-700'
				: 'cursor-not-allowed opacity-50'}"
			aria-describedby={submitError ? 'submit-error' : undefined}
		>
			{#if isLoading}
				<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
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
			<p class="mt-2 text-sm text-gray-600" aria-live="polite">Processing your request...</p>
		{/if}
	</div>

	<!-- Comparison Modal -->
	{#if showComparison}
		<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
			<div class="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white">
				<div class="flex items-center justify-between border-b border-gray-200 p-4">
					<h3 class="text-lg font-medium text-gray-900">Compare Alt Text</h3>
					<button
						onclick={() => (showComparison = false)}
						class="text-gray-400 hover:text-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
						aria-label="Close comparison"
					>
						<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
				<div class="overflow-y-auto p-4">
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<h4 class="mb-2 font-medium text-gray-900">Current Alt Text</h4>
							<div class="rounded-md border border-blue-200 bg-blue-50 p-3">
								<p class="text-sm text-gray-800">{generatedAltText}</p>
								<div class="mt-2 text-xs text-gray-600">
									Characters: {charCount()}
								</div>
							</div>
						</div>
						<div>
							<h4 class="mb-2 font-medium text-gray-900">Previous Version</h4>
							<div class="rounded-md border border-gray-200 bg-gray-50 p-3">
								<p class="text-sm text-gray-800">{comparisonText}</p>
								<div class="mt-2 text-xs text-gray-600">
									Characters: {comparisonText.length}
								</div>
							</div>
						</div>
					</div>
					<div class="mt-4 flex justify-end gap-2">
						<button
							onclick={() => (showComparison = false)}
							class="px-4 py-2 text-sm text-gray-600 transition-colors hover:text-gray-800 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none"
						>
							Close
						</button>
						<button
							onclick={() => {
								generatedAltText = comparisonText;
								showComparison = false;
								announceMessage = 'Switched to previous version';
							}}
							class="rounded-md bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
						>
							Use Previous Version
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Generated Alt Text Display -->
	{#if generatedAltText}
		<div
			class="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4"
			role="region"
			aria-labelledby="result-heading"
		>
			<div class="mb-3 flex items-center justify-between">
				<h3 class="font-medium text-gray-800" id="result-heading">Generated Alt Text</h3>
				<div class="flex gap-2">
					<button
						onclick={() => {
							generatedAltText = '';
							isEditing = false;
							announceMessage = 'Alt text cleared';
						}}
						class="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
						aria-label="Clear alt text"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16"
							/>
						</svg>
						Clear
					</button>
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
			</div>

			<div class="relative">
				<label for="alt-text-result" class="sr-only">Generated alt text (click to edit)</label>
				<div
					bind:textContent={generatedAltText}
					contenteditable="true"
					onclick={handleTextareaClick}
					oninput={(e) => { generatedAltText = e.target.textContent; }}
					onblur={(e) => { generatedAltText = e.target.textContent; }}
					id="alt-text-result"
					class="min-h-[60px] w-full rounded-md border border-gray-300 p-3 transition-all duration-200 {isEditing
						? 'bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
						: 'cursor-pointer bg-gray-100 hover:bg-gray-200'}"
					aria-describedby="edit-instructions"
					role="textbox"
					aria-multiline="true"
					tabindex="0"
					aria-label="Generated alt text, click to edit"
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

			<!-- Character Count and Simple Quality Feedback -->
			<div class="mt-3 space-y-2">
				<!-- Character Count -->
				<div class="flex items-center gap-2 text-sm">
					<span class="text-gray-600">
						Characters:
						<span
							class={charCount() > 125
								? 'font-medium text-red-600'
								: isOptimalLength()
									? 'text-green-600'
									: 'text-gray-800'}
						>
							{charCount()}
						</span>
						<span class="text-gray-400">/ 125</span>
					</span>
					{#if charCount() > 125}
						<span class="rounded bg-red-100 px-2 py-1 text-xs text-red-700">Too long</span>
					{:else if isOptimalLength()}
						<span class="rounded bg-green-100 px-2 py-1 text-xs text-green-700">Good length</span>
					{/if}
				</div>

				<!-- Quality Issues -->
				{#if qualityFeedback && qualityFeedback.issues && qualityFeedback.issues.length > 0}
					<div class="rounded-md border border-yellow-200 bg-yellow-50 p-3">
						<h4 class="mb-2 text-sm font-medium text-yellow-800">Suggestions for improvement:</h4>
						<ul class="space-y-1 text-sm text-yellow-700">
							{#each qualityFeedback.issues as issue}
								<li class="flex items-start gap-2">
									<svg
										class="mt-0.5 h-4 w-4 flex-shrink-0"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fill-rule="evenodd"
											d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
											clip-rule="evenodd"
										/>
									</svg>
									{issue}
								</li>
							{/each}
						</ul>
					</div>
				{:else if qualityFeedback && qualityFeedback.issues && qualityFeedback.issues.length === 0 && charCount() >= 20 && charCount() <= 125}
					<div class="rounded-md border border-green-200 bg-green-50 p-3">
						<div class="flex items-center gap-2">
							<svg class="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="text-sm font-medium text-green-800">Good alt text!</span>
						</div>
						<p class="mt-1 text-sm text-green-700">
							This alt text follows WCAG guidelines and best practices.
						</p>
					</div>
				{/if}
			</div>

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

	<!-- History Section -->
	<div class="mt-6 rounded-lg border border-gray-200">
		<button
			onclick={() => (historyExpanded = !historyExpanded)}
			class="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:ring-inset"
			aria-expanded={historyExpanded}
			aria-controls="history-content"
			id="history-toggle"
		>
			<span class="font-medium text-gray-700">History ({history.length})</span>
			<svg
				class="h-5 w-5 text-gray-500 transition-transform duration-200 {historyExpanded
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

		{#if historyExpanded}
			<div
				class="border-t border-gray-200 px-4 pb-4"
				id="history-content"
				aria-labelledby="history-toggle"
			>
				{#if history.length > 0}
					<div class="mt-3 space-y-2">
						<div class="mb-3 flex items-center justify-between">
							<span class="text-sm text-gray-600">Recent generations</span>
							<button
								onclick={clearHistory}
								class="text-xs text-red-600 transition-colors hover:text-red-800 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
								aria-label="Clear all history"
							>
								Clear all
							</button>
						</div>
						{#each history as item (item.id)}
							<div class="rounded-md border border-gray-200 bg-white p-3">
								<div class="flex items-start gap-3">
									<!-- Thumbnail -->
									{#if item.inputType === 'image' && item.imageData}
										<div class="flex-shrink-0">
											<img
												src={item.imageData}
												alt="Thumbnail"
												class="h-12 w-12 rounded-md border border-gray-200 object-cover"
											/>
										</div>
									{:else if item.inputType === 'url' && item.url}
										<div class="flex-shrink-0">
											<img
												src={item.url}
												alt="Thumbnail"
												class="h-12 w-12 rounded-md border border-gray-200 object-cover"
												onerror={(e) => {
													e.target.style.display = 'none';
													e.target.nextElementSibling.style.display = 'flex';
												}}
											/>
											<div class="hidden h-12 w-12 items-center justify-center rounded-md border border-gray-200 bg-gray-100">
												<svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m0 0l4-4a4 4 0 105.656-5.656l-4 4a4 4 0 01-5.656 0z" />
												</svg>
											</div>
										</div>
									{:else}
										<div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-100">
											<svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
											</svg>
										</div>
									{/if}

									<!-- Content -->
									<div class="min-w-0 flex-1">
										<p class="line-clamp-2 text-sm text-gray-800">{item.altText}</p>
										<div class="mt-1 flex items-center gap-2 text-xs text-gray-500">
											<span>{new Date(item.timestamp).toLocaleDateString()}</span>
											<span>•</span>
											<span class="capitalize">{item.inputType}</span>
											{#if item.context}
												<span>•</span>
												<span>With context</span>
											{/if}
										</div>
									</div>

									<!-- Actions -->
									<div class="flex flex-shrink-0 gap-1">
										<button
											onclick={() => loadFromHistory(item)}
											class="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 transition-colors hover:bg-blue-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
											aria-label="Load this alt text"
										>
											Load
										</button>
										<button
											onclick={() => compareWithCurrent(item.altText)}
											class="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none"
											aria-label="Compare with current"
										>
											Compare
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="mt-3 text-sm text-gray-500">No previous generations yet.</p>
				{/if}
			</div>
		{/if}
	</div>

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

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
