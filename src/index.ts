/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// import OpenAI from 'openai';
// const client = new OpenAI({apiKey:''});

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
			messages: [
				{
					role: 'user',
					content: 'Hello, how are you?',
				},
			],
		});
		console.log(response);

		return new Response();
	},
} satisfies ExportedHandler<Env>;
