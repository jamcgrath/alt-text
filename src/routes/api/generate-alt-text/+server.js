// src/routes/api/alt-text/+server.js
import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

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

		// Call out to OpenAI
		const altText = await generateAltTextWithOpenAI({ data, context, previousAltText });
		return json({ altText, success: true });
	} catch (error) {
		console.error('Alt text generation error:', error);

		if (error.status === 401) {
			return json({ error: 'Invalid API key' }, { status: 500 });
		} else if (error.status === 429) {
			return json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
		} else if (error.status === 400) {
			return json({ error: 'Invalid request to OpenAI' }, { status: 400 });
		}

		return json({ error: 'Failed to generate alt text' }, { status: 500 });
	}
}

async function generateAltTextWithOpenAI({ data, context, previousAltText }) {
	// 1. Build your instruction prompt (force a single-line answer)
	const promptParts = [
		'Generate a single-line alt text under 125 characters,',
		'avoiding "image of"/"picture of", focusing on essential information.'
	];
	if (context) promptParts.push(`Context: ${context}.`);
	if (previousAltText) promptParts.push(`Previous: "${previousAltText}". Improve it.`);
	promptParts.push('Return only the alt text.');
	const prompt = promptParts.join(' ');

	// 2. Vision-style input payload
	const input = [
		{
			role: 'user',
			content: [
				{ type: 'input_text', text: prompt },
				{ type: 'input_image', image_url: data }
			]
		}
	];

	// 3. Call the Responses API without `stop`
	const response = await openai.responses.create({
		model: 'o4-mini-2025-04-16',
		input,
		reasoning: { effort: 'high' },
		max_output_tokens: 100
	});

	// 4. Return the trimmed content
	const message = response.choices?.[0]?.message?.content;
	return message?.trim() ?? '';
}
