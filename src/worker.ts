/**
 * Cloudflare Worker for a Telegram bot that integrates with Cloudflare AI.
 * The bot reads user messages, sends them to Cloudflare AI, and returns the AI's response.
 * Includes a /set-webhook route to configure the Telegram webhook.
 *
 * Environment Variables:
 * - TELEGRAM_BOT_TOKEN: The Telegram bot token from BotFather.
 *
 * Bindings:
 * - AI: Cloudflare AI binding (configured in wrangler.jsonc).
 *
 * Routes:
 * - POST /: Handles incoming Telegram messages.
 * - GET /set-webhook: Sets the Telegram webhook to this worker's URL.
 *
 * Setup:
 * 1. Configure TELEGRAM_BOT_TOKEN in wrangler.jsonc or .env for local development.
 * 2. Run `npm run dev` to test locally.
 * 3. Run `npm run deploy` to deploy to Cloudflare.
 * 4. Access /set-webhook to configure the webhook after deployment.
 */

interface TelegramMessage {
	message: {
		chat: {
			id: number;
		};
		text: string;
	};
}

interface Env {
	AI: any; // Cloudflare AI binding
	TELEGRAM_BOT_TOKEN: string; // Telegram bot token
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Route: Set Telegram webhook
		if (url.pathname === '/set-webhook' && request.method === 'GET') {
			try {
				const botToken = env.TELEGRAM_BOT_TOKEN;
				if (!botToken) {
					return new Response('TELEGRAM_BOT_TOKEN not set in environment', { status: 400 });
				}

				// Construct the webhook URL (worker URL without path)
				const webhookUrl = `${url.origin}`;
				const telegramApiUrl = `https://api.telegram.org/bot${botToken}/setWebhook?url=${webhookUrl}`;

				// Call Telegram API to set webhook
				const response = await fetch(telegramApiUrl);
				const result:any = await response.json();

				if (result.ok) {
					return new Response('Webhook set successfully', { status: 200 });
				} else {
					return new Response(`Failed to set webhook: ${JSON.stringify(result)}`, { status: 500 });
				}
			} catch (error) {
				console.error('Error setting webhook:', error);
				return new Response('Internal server error', { status: 500 });
			}
		}

		// Route: Handle Telegram messages
		if (request.method === 'POST' && url.pathname === '/') {
			try {
				// Parse incoming Telegram message
				const data: TelegramMessage = await request.json();
				const chatId = data.message.chat.id;
				const userMessage = data.message.text;

				if (!userMessage) {
					return new Response('No message provided', { status: 400 });
				}

				// Send user message to Cloudflare AI
				const aiResponse = await env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
					messages: [
						{
							role: 'user',
							content: userMessage,
						},
					],
				});

				// Extract the AI's response text (adjust based on actual response structure)
				const aiMessage = aiResponse.response || 'No response from AI';

				// Send the AI's response back to the user via Telegram
				const telegramApiUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
				await fetch(telegramApiUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						chat_id: chatId,
						text: aiMessage,
					}),
				});

				return new Response('Message processed', { status: 200 });
			} catch (error) {
				console.error('Error:', error);
				return new Response('Internal server error', { status: 500 });
			}
		}

		// Default response for invalid routes/methods
		return new Response('Method or route not allowed', { status: 405 });
	},
} satisfies ExportedHandler<Env>;
