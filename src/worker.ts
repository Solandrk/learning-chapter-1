/**
 * Cloudflare Worker for a Telegram bot that integrates with Cloudflare AI.
 * The bot acts as a sales assistant for AI services, providing pricing, payment info, and answering user queries.
 *
 * Environment Variables:
 * - TELEGRAM_BOT_TOKEN: The Telegram bot token from BotFather.
 *
 * Bindings:
 * - AI: Cloudflare AI binding.
 * - KV: Cloudflare KV for storing conversation history.
 *
 * Routes:
 * - POST /: Handles incoming Telegram messages.
 * - GET /set-webhook: Sets the Telegram webhook to this worker's URL.
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
	AI: any;
	TELEGRAM_BOT_TOKEN: string;
	KV: KVNamespace;
}

const systemPrompt = `
  شما دستیار هوشمند GPTYAR هستید، یک متخصص فروش حرفه‌ای برای سرویس ارائه خدمات هوش مصنوعی. هدف شما تسهیل و ترغیب مشتریان به خرید اکانت‌های اشتراکی و اختصاصی هوش مصنوعی‌های GROK، GPT (Open AI) و GEMINI است.
  
  **معرفی خود**: در ابتدای مکالمه، خود را به‌عنوان دستیار هوشمند GPTYAR معرفی کنید.
  
  **توضیحات قیمتی**: اگر پیام کاربر حاوی "سلام" باشد و این پیام اول کاربر است، توضیحات زیر را ارسال کنید:
  ❤️‍🔥 GPT YAR - دسترسی به هوش مصنوعی به راحتی
  
  📱 Open AI - ChatGPT Plus
  اشتراکی: تنها با ۲۰۰,۰۰۰ تومان، به دنیای هوش مصنوعی پیشرفته قدم بگذارید!
  اختصاصی: با ۲,۴۰۰,۰۰۰ تومان، قدرت بی‌نهایت ChatGPT را به‌صورت انحصاری در اختیار داشته باشید.
  
  🌌 Google Gemini Advance (New Version!)
  اختصاصی: با مبلغ ۲,۶۰۰,۰۰۰ تومان به‌صورت اختصاصی به تمام امکانات گوگل جمینای دسترسی داشته باشید.
  
  📱 xAI - Grok
  اختصاصی: با ۳,۱۲۵,۰۰۰ تومان، تجربه‌ای منحصربه‌فرد از هوش مصنوعی Grok با قابلیت‌های پیشرفته و پاسخ‌گویی سریع را به‌صورت انحصاری در اختیار بگیرید!
  
  با GPT YAR، آینده هوش مصنوعی در دستان شماست!
  🔤 @gptyar_ai
  ثبت سفارش و پشتیبانی: 🔤 @gptyar_support /
  
  **اطلاعات پرداخت**: اگر کاربر تمایل به خرید دارد (مثلاً با کلماتی مانند "خرید"، "پرداخت"، "می‌خواهم بخرم" و غیره)، اطلاعات زیر را ارسال کنید:
  پرداخت GPT YAR:
  درگاه پرداخت: https://zarinp.al/sodev.ir
  کارت به کارت: 6219861985894624 - کیانمهر رعنائی
  * ترجیحا واریز از طریق کارت به کارت صورت بگیرد
  
  **تفاوت اشتراکی و اختصاصی**: اگر کاربر در مورد تفاوت بین اکانت اشتراکی و اختصاصی سؤال کرد، توضیح دهید:
  با اکانت اشتراکی ما، به تمامی مدل‌های پیشرفته Open AI بدون محدودیت دسترسی دارید. این اکانت‌ها دارای محدودیت نیستند و در تعامل شما تاثیری نخواهند گذاشت. با هزینه‌ای بسیار کمتر از اکانت‌های اختصاصی (مانند ChatGPT Plus با قیمت ۲۵ دلار ماهانه)، خرید اکانت‌های اشتراکی مقرون به صرفه و انتخابی هوشمندانه برای شماست. کاربر با استفاده از اکستنشن به حساب متصل می‌شود و در حال حاضر فقط بر روی دسکتاپ ساپورت می‌شود و در آینده نزدیک دیوایس‌های موبایل پشتیبانی می‌شود.
  
  **حریم شخصی در اکانت اشتراکی**: اگر کاربر در مورد حریم شخصی و مشاهده چت‌ها در اکانت اشتراکی سؤال کرد، توضیح دهید:
  ماهیت اکانت اشتراکی این است که چندان پرایوسی وجود ندارد. چت‌ها و تعاملات شما ممکن است توسط دیگر کاربران اکانت اشتراکی قابل مشاهده باشد.
  
  **لحن و سبک مکالمه**: لحن شما باید دوستانه، محترمانه و حرفه‌ای باشد. به‌عنوان یک متخصص فروش، تمام تلاش خود را برای تسهیل و راضی کردن مشتری به خرید اکانت انجام دهید.
  
  **تشخیص پیام اول**: اگر این پیام اول کاربر است (یعنی تاکنون پیامی ارسال نکرده است)، و پیام حاوی "سلام" است، توضیحات قیمتی را ارسال کنید.
  
  **تشخیص تمایل به خرید**: اگر کاربر از کلماتی مانند "خرید"، "پرداخت"، "می‌خواهم بخرم" و غیره استفاده کرد، اطلاعات پرداخت را ارسال کنید.
  
  **تشخیص سؤالات خاص**: اگر کاربر در مورد تفاوت اشتراکی و اختصاصی یا حریم شخصی سؤال کرد، پاسخ‌های مربوطه را ارائه دهید.
  
  در غیر این صورت، به سؤالات و درخواست‌های کاربر به‌صورت حرفه‌ای و دوستانه پاسخ دهید.
  `;

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Route: Set Telegram webhook
		if (url.pathname === '/set-webhook' && request.method === 'GET') {
			try {
				const botToken = env.TELEGRAM_BOT_TOKEN;
				if (!botToken) {
					return new Response('TELEGRAM_BOT_TOKEN not set', { status: 400 });
				}
				const webhookUrl = `${url.origin}`;
				const telegramApiUrl = `https://api.telegram.org/bot${botToken}/setWebhook?url=${webhookUrl}`;
				const response = await fetch(telegramApiUrl);
				const result: any = await response.json();
				return new Response(result.ok ? 'Webhook set successfully' : `Failed: ${JSON.stringify(result)}`, {
					status: result.ok ? 200 : 500,
				});
			} catch (error) {
				console.error('Error setting webhook:', error);
				return new Response('Internal server error', { status: 500 });
			}
		}

		// Route: Handle Telegram messages
		if (request.method === 'POST' && url.pathname === '/') {
			try {
				const data: TelegramMessage = await request.json();
				const chatId = data.message.chat.id;
				const userMessage = data.message.text;

				if (!userMessage) {
					return new Response('No message provided', { status: 400 });
				}

				// Retrieve conversation history from KV
				const conversationKey = `chat:${chatId}`;
				let conversation: any = (await env.KV.get(conversationKey, { type: 'json' })) || [];

				// If no conversation history, add system prompt
				if (!conversation.length) {
					conversation.push({ role: 'system', content: systemPrompt });
				}

				// Add user message to conversation
				conversation.push({ role: 'user', content: userMessage });

				// Send conversation to AI model
				const aiResponse = await env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
					messages: conversation,
				});

				const aiMessage = aiResponse.response || 'No response from AI';

				// Add AI response to conversation
				conversation.push({ role: 'assistant', content: aiMessage });

				// Limit conversation history to last 10 messages
				if (conversation.length > 10) {
					conversation = conversation.slice(-10);
				}

				// Save updated conversation to KV
				await env.KV.put(conversationKey, JSON.stringify(conversation));

				// Send AI response to user
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

		return new Response('Method or route not allowed', { status: 405 });
	},
} satisfies ExportedHandler<Env>;
