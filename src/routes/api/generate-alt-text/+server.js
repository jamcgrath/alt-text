// src/routes/api/alt-text/+server.js
/**
 * @fileoverview API endpoint for generating alt text using Anthropic's Claude AI
 * Supports both base64 image data and image URLs
 */

import { json } from '@sveltejs/kit';
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';

/**
 * Anthropic client instance for Claude API
 * @type {Anthropic}
 */
const anthropic = new Anthropic({
	apiKey: ANTHROPIC_API_KEY
});

/**
 * @typedef {Object} AltTextRequest
 * @property {'image'|'url'} type - Type of input data
 * @property {string} data - Base64 image data or image URL
 * @property {string} [context] - Additional context for alt text generation
 * @property {string} [previousAltText] - Previous alt text for regeneration
 */

/**
 * @typedef {Object} AltTextResponse
 * @property {string} altText - Generated alt text
 * @property {boolean} success - Success status
 */

/**
 * @typedef {Object} ErrorResponse
 * @property {string} error - Error message
 */

/**
 * POST endpoint for generating alt text from images or URLs.
 * Validates input, fetches image if needed, and calls Claude API.
 *
 * @param {Object} params - Request parameters
 * @param {Request} params.request - The incoming request
 * @returns {Promise<Response>} JSON response with alt text or error
 */
export async function POST({ request }) {
	try {
		/** @type {AltTextRequest} */
		const { type, data, context, previousAltText } = await request.json();

		// Validate required fields
		if (!type || !data) {
			return json(
				{ error: 'Missing required fields: type and data are required' },
				{ status: 400 }
			);
		}

		// Validate input type
		if (!['image', 'url'].includes(type)) {
			return json({ error: 'Invalid type. Must be "image" or "url"' }, { status: 400 });
		}

		// Validate URL format
		if (type === 'url') {
			try {
				new URL(data);
			} catch {
				return json({ error: 'Invalid URL provided' }, { status: 400 });
			}
		}

		// Validate base64 image format
		if (type === 'image' && !data.startsWith('data:image/')) {
			return json({ error: 'Invalid image data format' }, { status: 400 });
		}

		const altText = await generateAltTextWithClaude({ type, data, context, previousAltText });
		return json({ altText, success: true });
	} catch (error) {
		console.error('Alt text generation error:', error);

		// Handle specific Anthropic API errors
		if (error.status === 401) {
			return json({ error: 'Invalid Anthropic API key' }, { status: 500 });
		} else if (error.status === 429) {
			return json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
		} else if (error.status === 400) {
			return json({ error: 'Invalid request to Anthropic' }, { status: 400 });
		}

		return json({ error: 'Failed to generate alt text' }, { status: 500 });
	}
}

/**
 * Generate alt text using Anthropic's Claude AI.
 * Builds a WCAG-compliant prompt and sends image data to Claude.
 *
 * @param {Object} params - Generation parameters
 * @param {'image'|'url'} params.type - Type of input data
 * @param {string} params.data - Base64 image data or image URL
 * @param {string} [params.context] - Additional context for generation
 * @param {string} [params.previousAltText] - Previous alt text for improvement
 * @returns {Promise<string>} Generated alt text
 * @throws {Error} When image fetching or API call fails
 */
async function generateAltTextWithClaude({ type, data, context, previousAltText }) {
	// Build WCAG-compliant prompt
	let prompt = 'Generate concise, descriptive alt text for this image. ';
	prompt +=
		'Follow WCAG guidelines: be under 125 characters, avoid starting with "image of" or "picture of", focus on essential information that conveys the purpose and meaning of the image. ';
	prompt += 'Be specific and descriptive but concise. ';

	if (context) {
		prompt += `Additional context: ${context}. `;
	}

	if (previousAltText) {
		prompt += `Previous version: "${previousAltText}". Please improve this or provide a better alternative. `;
	}

	prompt += 'Return only the alt text, no additional explanation.';

	/** @type {Array<Object>} Content array for Claude API */
	const content = [
		{
			type: 'text',
			text: prompt
		}
	];

	// Process image based on input type
	if (type === 'image') {
		const [header, base64Data] = data.split(',');
		const mediaType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';

		content.push({
			type: 'image',
			source: {
				type: 'base64',
				media_type: mediaType,
				data: base64Data
			}
		});
	} else if (type === 'url') {
		try {
			const response = await fetch(data);
			const arrayBuffer = await response.arrayBuffer();
			const base64Data = Buffer.from(arrayBuffer).toString('base64');
			const contentType = response.headers.get('content-type') || 'image/jpeg';

			content.push({
				type: 'image',
				source: {
					type: 'base64',
					media_type: contentType,
					data: base64Data
				}
			});
		} catch (error) {
			throw new Error('Failed to fetch image from URL');
		}
	}

	// Call Claude API
	const response = await anthropic.messages.create({
		model: 'claude-3-5-sonnet-20241022',
		max_tokens: 150,
		messages: [
			{
				role: 'user',
				content: content
			}
		]
	});

	return response.content[0].text.trim();
}
