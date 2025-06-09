# Alt Text Generator

A WCAG-compliant alt text generator powered by AI. Upload images or provide URLs to generate accessible, descriptive alt text that follows web accessibility guidelines.

## Features

- 🖼️ **Image Upload**: Drag and drop or select image files (JPG, PNG, GIF, WebP)
- 🔗 **URL Support**: Generate alt text from image URLs
- 🤖 **AI-Powered**: Uses Anthropic's Claude 3.5 Sonnet for intelligent image analysis
- ♿ **WCAG Compliant**: Follows Web Content Accessibility Guidelines 2.1
- 📝 **Context Aware**: Add additional context to improve alt text quality
- 📚 **History**: Saves generation history with thumbnails for easy reference
- ✏️ **Editable**: Click to edit generated alt text inline
- 📋 **Copy to Clipboard**: One-click copying for easy use
- 🔄 **Compare Versions**: Compare current and previous alt text versions

## Technology Stack

- **Frontend**: SvelteKit 5 with Runes
- **Styling**: Tailwind CSS
- **AI**: Anthropic Claude 3.5 Sonnet
- **Storage**: Browser localStorage for history
- **Accessibility**: Full ARIA support and keyboard navigation

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Anthropic API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd alt-text-generator
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Add your Anthropic API key to `.env`:
```bash
ANTHROPIC_API_KEY=your_actual_anthropic_api_key_here
```

### Development

Start the development server:

```bash
pnpm dev

# or start the server and open the app in a new browser tab
pnpm dev --open
```

The application will be available at `http://localhost:5173`

### Building

To create a production version:

```bash
pnpm build
```

Preview the production build:

```bash
pnpm preview
```

## Usage

1. **Choose Input Method**: Select either "Image" to upload a file or "URL" to use an image URL
2. **Add Image**: 
   - For images: Drag and drop or click to select a file
   - For URLs: Enter a valid image URL
3. **Add Context** (Optional): Provide additional context to improve alt text quality
4. **Generate**: Click "Generate Alt Text" to create WCAG-compliant alt text
5. **Review**: Check the character count and quality feedback
6. **Edit**: Click the generated text to edit if needed
7. **Copy**: Use the copy button to copy alt text to clipboard

## API Endpoints

### POST `/api/generate-alt-text`

Generate alt text for an image.

**Request Body:**
```json
{
  "type": "image" | "url",
  "data": "base64_image_data" | "image_url",
  "context": "optional_context_string",
  "previousAltText": "optional_previous_version"
}
```

**Response:**
```json
{
  "altText": "Generated alt text description",
  "success": true
}
```

## WCAG Guidelines

This tool follows WCAG 2.1 Level A guidelines for alt text:

- **Concise**: Usually under 125 characters
- **Descriptive**: Conveys essential information
- **Context-aware**: Considers the image's purpose
- **No redundancy**: Avoids "image of" or "picture of"
- **Meaningful**: Describes content, not appearance

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Add tests if applicable
5. Commit your changes: `git commit -m 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Anthropic](https://www.anthropic.com/) for Claude AI
- [SvelteKit](https://kit.svelte.dev/) for the framework
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) for accessibility standards
