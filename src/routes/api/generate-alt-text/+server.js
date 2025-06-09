import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

const openai = new OpenAI({
	apiKey: OPENAI_API_KEY
});

export async function POST({ request }) {
	try {
		const { type, data, context, previousAltText } = await request.json();
		
		// Validate input
		if (!type || !data) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		if (type !== 'image' && type !== 'url') {
			return json({ error: 'Invalid type. Must be "image" or "url"' }, { status: 400 });
		}

		// For URL type, validate URL format
		if (type === 'url') {
			try {
				new URL(data);
			} catch {
				return json({ error: 'Invalid URL provided' }, { status: 400 });
			}
		}

		// For image type, validate base64 format
		if (type === 'image' && !data.startsWith('data:image/')) {
			return json({ error: 'Invalid image data format' }, { status: 400 });
		}

		const altText = await generateAltTextWithOpenAI({
			type,
			data,
			context,
			previousAltText
		});

		return json({ 
			altText,
			success: true 
		});

	} catch (error) {
		console.error('Alt text generation error:', error);
		
		// Handle specific OpenAI errors
		if (error.status === 401) {
			return json({ error: 'Invalid API key' }, { status: 500 });
		} else if (error.status === 429) {
			return json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
		} else if (error.status === 400) {
			return json({ error: 'Invalid request to OpenAI' }, { status: 400 });
		}
		
		return json(
			{ error: 'Failed to generate alt text' }, 
			{ status: 500 }
		);
	}
}

async function generateAltTextWithOpenAI({ type, data, context, previousAltText }) {
	const prompt = buildPrompt(context, previousAltText);
	
	let content = [
		{ type: "text", text: prompt }
	];

	// Add image to content based on type
	if (type === 'image') {
		content.push({
			type: "image_url",
			image_url: {
				url: data
			}
		});
	} else if (type === 'url') {
		content.push({
			type: "image_url", 
			image_url: {
				url: data
			}
		});
	}

	const response = await openai.chat.completions.create({
		model: "o1-mini",
		messages: [
			{
				role: "user",
				content: content
			}
		],
		max_tokens: 300
	});

	return response.choices[0].message.content.trim();
}

function buildPrompt(context, previousAltText) {
	let prompt = "Generate concise, descriptive alt text for this image. ";
	prompt += "Follow WCAG guidelines: be under 125 characters, avoid starting with 'image of' or 'picture of', focus on essential information that conveys the purpose and meaning of the image. ";
	prompt += "Be specific and descriptive but concise. ";
	
	if (context) {
		prompt += `Additional context: ${context}. `;
	}
	
	if (previousAltText) {
		prompt += `Previous version: "${previousAltText}". Please improve this or provide a better alternative. `;
	}
	
	prompt += "Return only the alt text, no additional explanation.";
	
	return prompt;
}
