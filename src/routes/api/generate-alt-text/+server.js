// src/routes/api/alt-text/+server.js
import { json } from '@sveltejs/kit';
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';

const anthropic = new Anthropic({
	apiKey: ANTHROPIC_API_KEY
});

export async function POST({ request }) {
	try {
		const { type, data, context, previousAltText } = await request.json();

		// 1. Required fields
		if (!type || !data) {
			return json(
				{ error: 'Missing required fields: type and data are required' },
				{ status: 400 }
			);
		}

		// 2. Allowed types
		if (!['image', 'url'].includes(type)) {
			return json({ error: 'Invalid type. Must be "image" or "url"' }, { status: 400 });
		}

		// 3. Validate URL if needed
		if (type === 'url') {
			try {
				new URL(data);
			} catch {
				return json({ error: 'Invalid URL provided' }, { status: 400 });
			}
		}

		// 4. Validate base64 image prefix if needed
		if (type === 'image' && !data.startsWith('data:image/')) {
			return json({ error: 'Invalid image data format' }, { status: 400 });
		}

		// Generate alt text with Claude
		const altText = await generateAltTextWithClaude({ type, data, context, previousAltText });
		return json({ altText, success: true });

	} catch (error) {
		console.error('Alt text generation error:', error);

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

async function generateAltTextWithClaude({ type, data, context, previousAltText }) {
	// Build the prompt
	let prompt = 'Generate concise, descriptive alt text for this image. ';
	prompt += 'Follow WCAG guidelines: be under 125 characters, avoid starting with "image of" or "picture of", focus on essential information that conveys the purpose and meaning of the image. ';
	prompt += 'Be specific and descriptive but concise. ';
	
	if (context) {
		prompt += `Additional context: ${context}. `;
	}
	
	if (previousAltText) {
		prompt += `Previous version: "${previousAltText}". Please improve this or provide a better alternative. `;
	}
	
	prompt += 'Return only the alt text, no additional explanation.';

	// Prepare the content array
	const content = [
		{
			type: "text",
			text: prompt
		}
	];

	// Add image based on type
	if (type === 'image') {
		// Extract the base64 data and media type from data URL
		const [header, base64Data] = data.split(',');
		const mediaType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
		
		content.push({
			type: "image",
			source: {
				type: "base64",
				media_type: mediaType,
				data: base64Data
			}
		});
	} else if (type === 'url') {
		// For URLs, we need to fetch the image and convert to base64
		try {
			const response = await fetch(data);
			const arrayBuffer = await response.arrayBuffer();
			const base64Data = Buffer.from(arrayBuffer).toString('base64');
			const contentType = response.headers.get('content-type') || 'image/jpeg';
			
			content.push({
				type: "image",
				source: {
					type: "base64",
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
		model: "claude-3-5-sonnet-20241022",
		max_tokens: 150,
		messages: [
			{
				role: "user",
				content: content
			}
		]
	});

	return response.content[0].text.trim();
}
