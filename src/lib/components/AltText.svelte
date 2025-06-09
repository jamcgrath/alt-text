<script>
  let mode = $state('image'); // 'image' or 'url'
  let imageData = $state(null);
  let urlInput = $state('');
  let isDragOver = $state(false);
  let contextExpanded = $state(false);
  let contextText = $state('');
  let wcagExpanded = $state(false);

  // Handle file upload
  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      convertToBase64(file);
    }
  }

  // Handle drag and drop
  function handleDrop(event) {
    event.preventDefault();
    isDragOver = false;
    
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      convertToBase64(file);
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

  // Handle submit
  function handleSubmit() {
    if (!canSubmit) return;
    
    // TODO: Implement LLM API call
    const payload = mode === 'image' 
      ? { type: 'image', data: imageData, context: contextText }
      : { type: 'url', data: sanitizedUrl, context: contextText };
    
    console.log('Submitting:', payload);
  }
</script>

<div class="max-w-2xl mx-auto p-5">
  <!-- Mode Switch -->
  <div class="flex bg-gray-100 rounded-lg p-1 mb-5">
    <button 
      class="flex-1 py-3 px-6 rounded-md font-medium transition-all duration-200 {mode === 'image' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'}"
      onclick={() => mode = 'image'}
    >
      Image
    </button>
    <button 
      class="flex-1 py-3 px-6 rounded-md font-medium transition-all duration-200 {mode === 'url' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'}"
      onclick={() => mode = 'url'}
    >
      URL
    </button>
  </div>

  <!-- Input Area -->
  <div class="min-h-[200px]">
    {#if mode === 'image'}
      <!-- File Upload/Drop Area -->
      <div 
        class="border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer {isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'}"
        ondrop={handleDrop}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
      >
        <input 
          type="file" 
          accept="image/*" 
          onchange={handleFileSelect}
          id="file-input"
          class="hidden"
        />
        
        {#if imageData}
          <div class="space-y-3">
            <img src={imageData} alt="Uploaded preview" class="max-w-full max-h-72 rounded-lg mx-auto" />
            <button 
              onclick={() => imageData = null}
              class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors"
            >
              Remove
            </button>
          </div>
        {:else}
          <label for="file-input" class="block cursor-pointer">
            <div class="space-y-4">
              <svg class="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
              <div>
                <p class="text-lg text-gray-700 mb-2">Drop an image here or click to upload</p>
                <span class="text-sm text-gray-500">Supports: JPG, PNG, GIF, WebP</span>
              </div>
            </div>
          </label>
        {/if}
      </div>
    {:else}
      <!-- URL Input -->
      <div class="py-5 space-y-3">
        <input 
          type="url" 
          placeholder="Enter image URL..."
          bind:value={urlInput}
          class="w-full p-4 border-2 border-gray-300 rounded-lg text-base transition-colors focus:outline-none focus:border-blue-500"
        />
        {#if hasUrlError}
          <p class="text-red-500 text-sm">Please enter a valid URL</p>
        {/if}
        {#if isValidUrl}
          <p class="text-green-600 text-sm break-all">Valid URL: {sanitizedUrl}</p>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Context Section -->
  <div class="mt-6 border border-gray-200 rounded-lg">
    <button 
      onclick={() => contextExpanded = !contextExpanded}
      class="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
    >
      <span class="font-medium text-gray-700">Additional Context (Optional)</span>
      <svg 
        class="w-5 h-5 text-gray-500 transition-transform duration-200 {contextExpanded ? 'rotate-180' : ''}"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>
    
    {#if contextExpanded}
      <div class="px-4 pb-4 border-t border-gray-200">
        <textarea 
          bind:value={contextText}
          placeholder="Describe the image context, intended audience, or specific details you'd like emphasized in the alt text..."
          class="w-full mt-3 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:border-blue-500 transition-colors"
          rows="4"
        ></textarea>
        <p class="text-sm text-gray-500 mt-2">
          Example: "This chart shows quarterly sales data - focus on the upward trend rather than specific numbers" or "This decorative image sets the mood but doesn't convey essential information."
        </p>
      </div>
    {/if}
  </div>

  <!-- Submit Button -->
  <div class="mt-6 text-center">
    <button 
      onclick={handleSubmit}
      disabled={!canSubmit}
      class="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg transition-all duration-200 {canSubmit ? 'hover:bg-blue-700 cursor-pointer' : 'opacity-50 cursor-not-allowed'}"
    >
      Generate Alt Text
    </button>
  </div>

  <!-- Visual Separator -->
  <div class="mt-8 border-t border-gray-200"></div>

  <!-- WCAG Guidelines Help -->
  <div class="mt-6 flex justify-center">
    <button 
      onclick={() => wcagExpanded = !wcagExpanded}
      class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
      title="View WCAG Alt Text Guidelines"
    >
      <svg 
        class="w-4 h-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      WCAG Alt Text Guidelines
    </button>
  </div>

  {#if wcagExpanded}
    <div class="mt-4 border border-gray-200 rounded-lg">
      <div class="px-4 py-4">
        <div class="mt-3 space-y-4 text-sm">
          <div>
            <h4 class="font-semibold text-gray-800 mb-2">Key WCAG 2.1 Criteria for Alt Text:</h4>
            
            <div class="space-y-3">
              <div>
                <strong class="text-gray-700">1.1.1 Non-text Content (Level A)</strong>
                <p class="text-gray-600 mt-1">All non-text content must have a text alternative that serves the equivalent purpose.</p>
              </div>
              
              <div>
                <strong class="text-gray-700">Best Practices:</strong>
                <ul class="list-disc list-inside text-gray-600 mt-1 space-y-1">
                  <li><strong>Be concise:</strong> Usually under 125 characters</li>
                  <li><strong>Be descriptive:</strong> Convey the essential information</li>
                  <li><strong>Avoid redundancy:</strong> Don't start with "Image of..." or "Picture of..."</li>
                  <li><strong>Context matters:</strong> Consider the image's purpose in the content</li>
                  <li><strong>Decorative images:</strong> Use empty alt="" for purely decorative images</li>
                  <li><strong>Complex images:</strong> Provide detailed description elsewhere and reference it</li>
                </ul>
              </div>
              
              <div>
                <strong class="text-gray-700">Types of Images:</strong>
                <ul class="list-disc list-inside text-gray-600 mt-1 space-y-1">
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
