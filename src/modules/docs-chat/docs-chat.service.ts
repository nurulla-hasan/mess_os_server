import { config } from '../../config';
import { AppError } from '../../shared/utils/apiError';
import { logger } from '../../shared/utils/logger';
import { ChatMessage } from './docs-chat.model';
import crypto from 'crypto';

const placeholderApiKeys = new Set(['your_ai_api_key_here', 'your_openai_api_key_here']);
const isPlaceholderApiKey = (apiKey: string) => !apiKey || placeholderApiKeys.has(apiKey);

type ChatCompletionResponse = {
  choices?: Array<{
    finish_reason?: 'stop' | 'length' | 'content_filter' | 'tool_calls';
    message?: {
      content?: string;
      reasoning_content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    completion_tokens_details?: {
      reasoning_tokens?: number;
    };
  };
};

/**
 * System prompt describing Mess OS for the AI assistant.
 * This gives the AI knowledge about the platform without needing external context.
 */
const MESS_OS_SYSTEM_PROMPT = [
  'You are Mess OS AI Assistant — a friendly, knowledgeable guide for a mess management platform. Answer in Bengali+English mix. Be helpful, concise (2-4 sentences), and use step-by-step instructions when explaining features.',
  '',
  '=== ABOUT MESS OS ===',
  'Two roles: Manager (full admin) and Member (personal + read-only). Know which role the user needs and tailor answers accordingly.',
  '',
  '=== MANAGER PANEL (11 features) ===',
  '1. Dashboard: Overview with members count, today meals, pending meal-offs, recent expenses, upcoming schedules, notices.',
  '2. Menu Plan: Create/edit daily menus (bfast/lunch/dinner). AI Generate button for AI-suggested menus by budget/preference.',
  '3. AI Shopping: From menu plan → Generate draft shopping list → Approve (draft→approved) → Convert to Market Schedule → or Reject.',
  '4. Market Schedule: Create manually (date, members, budget, items) or from AI Shopping. Status: pending→completed|reassigned|void.',
  '5. Expenses: Track by category (bazar, utility, maintenance). Add amount, date, description, receipt image. Filter, edit, delete.',
  '6. Members: List all (active/inactive). Add, update role (Manager/Member), remove. Each has name, phone, email, status, join date.',
  '7. Meal Off Requests: Approve/reject member requests. Approved = exempted from meal charges. Auto-adjusts billing.',
  '8. Notices: Post markdown announcements. Edit, delete, pin important ones.',
  '9. Billing: Auto-generate monthly bills from meals + shared expenses. SSLCommerz payment gateway. Track paid/unpaid/overdue.',
  '10. Reports: Expense summary, meal participation, billing report, monthly comparison. Visual charts. Exportable.',
  '11. Utility Bills: Electricity, gas, water, internet bills. Shared among members in billing.',
  '',
  '=== MEMBER PANEL (8 sections) ===',
  '1. Dashboard: Today menu, upcoming schedules, notices, personal expenses, meal-off status.',
  '2. Menu Plan (View): Browse daily meals by date — calendar or list.',
  '3. Market Schedule (View): See all schedules and who is assigned.',
  '4. Meal Off Request: Submit date range + reason. Track pending/approved/rejected status.',
  '5. My Expenses (View): See personal expenses owed.',
  '6. My Bills: View monthly bill + breakdown. Pay via SSLCommerz. Download receipt.',
  '7. Notices (View): Read manager announcements.',
  '8. Profile: Edit name, phone, password, settings.',
  '',
  '=== COMMON WORKFLOWS ===',
  'Daily: Menu plan → AI Shopping → Approve → Market Schedule → Shop → Record expenses. | Meal Off: Member requests → Manager approves → Billing adjusted. | Billing: Auto-calculate → Generate bill → Member pays via gateway.',
  '',
  '=== AUTH & ACCOUNT ===',
  'Register: /auth/register → fill form → OTP verify → Login → Join/Create mess. | Login: /auth/login (email/phone + pass). | Forgot password: /auth/login → Forgot Password → OTP → New password. | Join mess: Use invite code from manager. | Leave mess: Profile → Settings → Leave Mess. | Create mess: User becomes Manager. | Note: Leaving does NOT delete account.',
  '',
  '=== PAYMENT ISSUES (SSLCommerz) ===',
  'Payment failed → retry. Pending but charged → contact manager, DO NOT pay again. Refund → contact manager. Double charge → collect both transaction IDs → contact support. | Billing logic: Monthly bill = (meals eaten × per_meal_rate) + (shared expenses ÷ active members). Meal-off approved = those meals excluded.',
  '',
  '=== TROUBLESHOOTING ===',
  'Blank page: Hard refresh → clear cache → different browser → check maintenance. | No data: Check filters, refresh, check permissions. | Form error: Fill all fields, check image size, retry. | General: Logout/login, clear cache, use Chrome/Firefox, contact manager for role issues.',
  '',
  '=== MOBILE & PWA ===',
  'Fully responsive. PWA: Install from Chrome (Android: Menu→Add to Home Screen) or Safari (iOS: Share→Add). Get push notifications + offline support after install.',
  '',
  '=== NOTIFICATIONS ===',
  'In-app: Bell icon (payment reminders, notices, meal-off updates). Push: via PWA. Email: optional in Profile→Settings. No SMS.',
  '',
  '=== SECURITY ===',
  'Strong password (8+ chars, mix). Session timeout. Data visible only to mess manager + admins. SSLCommerz handles payments — no card storage. Report issues to developer.',
  '',
  '=== MULTI-MESS ===',
  'One account = one mess at a time. Manager can change roles, transfer ownership, or delete mess (permanently removes all data).',
  '',
  '=== BEST PRACTICES ===',
  'Plan menus 1-2 days ahead. Review AI shopping lists before approving. Assign 2+ members per schedule. Submit meal-off before cutoff. Pay bills before due date.',
  '',
  '=== GUIDELINES ===',
  'Friendly tone. Bengali+English mix. Ask clarifying questions if user says something is not working. If unsure, admit it and suggest contacting support. Use page context when available. Be concise.',
  '',
  '=== PERSONALITY ===',
  'Friendly, warm, fun! 😊 Use light Bangla humor ("কি বলেন বাপু!", "বস, আপনার জন্য যা তা!"). Celebrate wins ("দারুণ! 🎉"). Gentle teasing on easy questions. One emoji per response max. Seasonal greetings (Eid, Pohela Boishakh, New Year). If frustrated user → be empathetic ("চিন্তা নেই! 🤝"). Joke only if user asks for fun. Serious topics → professional first.',
  '',
  '=== CREATOR ===',
  'WHEN ASKED "who created you?": Always output the FULL markdown links below. NEVER say "links are on the page". Output them:',
  '[GitHub](https://github.com/nurulla-hasan) | [Portfolio](https://nurulla-hasan-portfolio-pink.vercel.app/) | 📞 +880 17509 74716',
  'Say with pride: "একাই পুরা Mess OS বানাইছে — ফ্রন্টএন্ড, ব্যাকএন্ড, ডিজাইন সব!" Decline personal info about him politely.'
].join('\n');

const MOCK_FALLBACK_RESPONSE = 'দুঃখিত, আমি এখনই উত্তর দিতে পারছি না। AI service বর্তমানে কনফিগার করা নেই। দয়া করে System Admin-এর সাথে যোগাযোগ করুন।';

type ChatResult = {
  answer: string;
  sessionId: string;
};

export const chatWithAssistant = async (
  question: string,
  context?: string,
  sessionId?: string,
  userAgent?: string
): Promise<ChatResult> => {
  const activeSessionId = sessionId || crypto.randomUUID();

  if (isPlaceholderApiKey(config.ai.apiKey)) {
    logger.warn('AI API key not configured — returning mock fallback for docs chat');
    // Save in background
    ChatMessage.create({
      sessionId: activeSessionId,
      question,
      answer: MOCK_FALLBACK_RESPONSE,
      context,
      userAgent,
    }).catch((err) => logger.error('Failed to save chat message', err));
    return { answer: MOCK_FALLBACK_RESPONSE, sessionId: activeSessionId };
  }

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: MESS_OS_SYSTEM_PROMPT },
  ];

  // If page context is provided, add it as a system message for grounding
  if (context) {
    messages.push({
      role: 'system',
      content: `The user is currently viewing the following documentation page. Use this to provide specific, relevant answers:\n\n${context}`,
    });
  }

  messages.push({ role: 'user', content: question });

  const callAiWithTokens = async (maxTokens: number): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(`${config.ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.ai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.ai.model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.3,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Docs chat AI request failed', new Error(errorText), { status: response.status });
      throw new AppError(502, 'AI response failed. Please try again later.');
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const choice = data.choices?.[0];
    const content = choice?.message?.content?.trim();
    const finishReason = choice?.finish_reason;
    const reasoningTokens = data.usage?.completion_tokens_details?.reasoning_tokens ?? 0;
    const totalCompletionTokens = data.usage?.completion_tokens ?? 0;

    if (content) return content;

    // Log detailed info for debugging
    logger.warn('AI returned empty content', {
      finishReason,
      maxTokensRequested: maxTokens,
      totalCompletionTokens,
      reasoningTokens,
      hasReasoningContent: !!choice?.message?.reasoning_content,
    });

    // If finish_reason is 'length', reasoning ate all tokens — retry with more
    if (finishReason === 'length' && maxTokens < 16000) {
      logger.info(`Retrying with more tokens (${maxTokens} → ${maxTokens * 2})`);
      return callAiWithTokens(maxTokens * 2);
    }

    // Last resort: use reasoning_content if available (better than nothing)
    if (choice?.message?.reasoning_content) {
      const rc = choice.message.reasoning_content.trim();
      if (rc) {
        logger.warn('Falling back to reasoning_content as answer');
        return `🤔 *আমার উত্তরটা একটু কাঁচা অবস্থায় আছে, পুরোটা বলতে পারিনি:*\n\n${rc}`;
      }
    }

    throw new AppError(502, 'AI returned an empty response.');
  };

  const content = await callAiWithTokens(8000); // Model supports up to 16000 output tokens

  // Save to DB in background — don't block user response
  ChatMessage.create({
    sessionId: activeSessionId,
    question,
    answer: content,
    context,
    userAgent,
  }).catch((err) => logger.error('Failed to save chat message', err));

  return { answer: content, sessionId: activeSessionId };
};

type HistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
};

export const getChatHistory = async (sessionId: string): Promise<HistoryMessage[]> => {
  const messages = await ChatMessage.find({ sessionId })
    .sort({ createdAt: 1 })
    .lean();

  const history: HistoryMessage[] = [];
  for (const msg of messages) {
    history.push({ role: 'user', content: msg.question, createdAt: msg.createdAt });
    history.push({ role: 'assistant', content: msg.answer, createdAt: msg.createdAt });
  }

  return history;
};

export const deleteChatHistory = async (sessionId: string): Promise<void> => {
  await ChatMessage.deleteMany({ sessionId });
};
