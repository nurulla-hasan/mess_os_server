import { config } from '../../config';
import { AppError } from '../utils/apiError';
import { logger } from '../utils/logger';

export interface AiProvider {
  generateMenuPlanContent(options: GenerateMenuPlanOptions): Promise<Record<string, string>>;
  generateShoppingListItems(menuMeals: Record<string, string> | Map<string, string>, options?: GenerateShoppingListOptions): Promise<{ name: string, quantity: string, category: string }[]>;
}

export type GenerateShoppingListOptions = {
  preference?: string;
  budget?: number;
  personCount?: number;
  shoppingDays?: number;
  targetDate?: Date;
};

export type GenerateMenuPlanOptions = {
  date: Date;
  mealCategories: string[];
  preference?: string;
  budget?: number;
  /** Number of people eating (for quantity planning) */
  personCount?: number;
  /** Number of days the shopping list should cover */
  shoppingDays?: number;
  recentMeals?: Array<{
    date: Date;
    meals: Record<string, string>;
  }>;
  /** Optional custom market prices. Key = ingredient name, Value = price in BDT per KG (or per unit) */
  marketPrices?: Record<string, number>;
};

const placeholderApiKeys = new Set(['your_ai_api_key_here', 'your_openai_api_key_here']);
const isPlaceholderApiKey = (apiKey: string) => !apiKey || placeholderApiKeys.has(apiKey);

/** Default Bangladeshi market prices (BDT per KG/unit) — adjust as market fluctuates */
const DEFAULT_MARKET_PRICES: Record<string, number> = {
  'ব্রয়লার মুরগি (Chicken)': 180,
  'দেশি মুরগি (Local Chicken)': 400,
  'গরুর মাংস (Beef)': 750,
  'খাসির মাংস (Mutton)': 1100,
  'রুই মাছ (Rui Fish)': 350,
  'কাতলা মাছ (Katla Fish)': 380,
  'ইলিশ মাছ (Hilsha Fish)': 1400,
  'পাঙ্গাশ/তেলাপিয়া (Pangas/Tilapia)': 180,
  'ডিম (Egg) - প্রতি ডজন': 140,
  'পেঁয়াজ (Onion)': 60,
  'আলু (Potato)': 40,
  'টমেটো (Tomato)': 80,
  'রসুন (Garlic)': 200,
  'আদা (Ginger)': 180,
  'তেল (Soybean Oil) - প্রতি লিটার': 180,
  'চাল (Rice)': 60,
  'ডাল (Lentil)': 140,
  'বেগুন (Eggplant)': 50,
  'লাউ (Bottle Gourd)': 40,
  'কুমড়া (Pumpkin)': 40,
  'শাক (Leafy Greens - per bunch)': 20,
  'পটল (Pointed Gourd)': 50,
  'শসা (Cucumber)': 40,
  'কাঁচা মরিচ (Green Chili)': 120,
  'লেবু (Lemon) - প্রতি হালি': 20,
};

const buildMarketPriceContext = (customPrices?: Record<string, number>): string => {
  const prices = { ...DEFAULT_MARKET_PRICES, ...customPrices };
  const sortedItems = Object.entries(prices).sort(([, a], [, b]) => a - b);
  const cheap = sortedItems.filter(([, p]) => p < 80).map(([n]) => n).slice(0, 8);
  const medium = sortedItems.filter(([, p]) => p >= 80 && p < 300).map(([n]) => n).slice(0, 10);
  const expensive = sortedItems.filter(([, p]) => p >= 300).map(([n]) => n).slice(0, 10);

  return [
    'Current Bangladeshi market prices (BDT):',
    ...sortedItems.map(([name, price]) => `  ${name}: ${price} BDT`),
    '',
    `💡 Budget-friendly picks (under 80 BDT): ${cheap.join(', ') || 'aloo, shak, begun, potol, lau'}`,
    `⚠️ Mid-range (80-300 BDT): ${medium.join(', ') || 'dim, dal, onion, garlic, oil'}`,
    `💰 Expensive (300+ BDT): ${expensive.join(', ') || 'beef, mutton, hilsha, rui fish, local chicken'}`,
    '',
    'If budget is tight, strictly avoid expensive items. Substitute with cheap vegetables and eggs.',
    'If budget is generous, you can include mid-range or expensive items in moderation.',
  ].join('\n');
};

const parseJsonObject = <T = Record<string, unknown>>(text: string | undefined): T => {
  if (!text) {
    logger.error('AI response was empty', new Error('Empty AI response'));
    throw new AppError(502, 'AI response was empty');
  }
  // Strip markdown code fences (```json ... ```) that some models add
  let cleaned = text.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();

  // If still not valid JSON, try to extract the first {...} or [...] block
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const jsonObjectMatch = cleaned.match(/(\{[\s\S]*\})/);
    const jsonArrayMatch = cleaned.match(/(\[[\s\S]*\])/);
    const extracted = jsonObjectMatch?.[1] ?? jsonArrayMatch?.[1];
    if (extracted) cleaned = extracted.trim();
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    logger.error('Failed to parse AI JSON response', error, { text, cleaned });
    throw new AppError(502, 'AI returned an invalid JSON response');
  }
};

/** Extract text content from various chat completion API response formats */
const extractChatContent = (data: Record<string, unknown>): string | undefined => {
  // Log full response for debugging (without sensitive data)
  const finishReason = (data.choices as Array<Record<string, unknown>> | undefined)?.[0]?.finish_reason as string | undefined;
  logger.info('AI response structure', {
    hasChoices: Array.isArray(data.choices),
    choiceCount: Array.isArray(data.choices) ? data.choices.length : 0,
    hasContent: typeof data.content === 'string',
    finishReason,
    keys: Object.keys(data).join(', '),
  });

  // Standard OpenAI format: choices[0].message.content
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  if (choices?.[0]) {
    const msg = choices[0].message as Record<string, unknown> | undefined;
    if (msg) {
      const content = msg.content as string | undefined;
      // DeepSeek models put actual answer in 'content'. If non-empty, use it directly.
      if (content && typeof content === 'string' && content.trim()) return content;

      // reasoning_content = chain of thought / analysis. The JSON output is usually
      // embedded somewhere in this text. Try to extract it.
      const reasoningContent = msg.reasoning_content as string | undefined;
      if (reasoningContent && typeof reasoningContent === 'string' && reasoningContent.trim()) {
        logger.info('Attempting to extract JSON from reasoning_content', {
          reasoningPreview: reasoningContent.slice(0, 200),
        });
        // Strip markdown code fences first
        const cleaned = reasoningContent.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
        // Find the LAST '{' — the final JSON output is typically at the end
        const lastBrace = cleaned.lastIndexOf('{');
        if (lastBrace >= 0) {
          const candidateJson = cleaned.slice(lastBrace);
          // Quick validation: try to parse it
          try {
            JSON.parse(candidateJson);
            logger.info('Extracted valid JSON from end of reasoning_content');
            return candidateJson;
          } catch {
            // Not valid as-is; fall through to regex extraction
          }
        }
        // Fallback: try greedy regex for any {…} block
        const jsonMatch = cleaned.match(/(\{[\s\S]*\})/);
        if (jsonMatch?.[1]) {
          logger.info('Extracted JSON block via regex from reasoning_content', {
            extracted: jsonMatch[1].slice(0, 150),
          });
          return jsonMatch[1].trim();
        }
      }
    }
    // Streaming delta format
    const delta = choices[0].delta as Record<string, unknown> | undefined;
    if (delta?.content && typeof delta.content === 'string') return delta.content;
  }
  // Some APIs return content at root level (e.g. OpenCode variations)
  if (typeof data.content === 'string' && data.content.trim()) return data.content;
  // Legacy response format
  const rawResponse = data.response as string | undefined;
  if (rawResponse) return rawResponse;
  const output = data.output as string | undefined;
  if (output) return output;

  logger.error('Unknown AI response format', new Error('Unrecognized response structure'), {
    keys: Object.keys(data).join(', '),
    sample: JSON.stringify(data).slice(0, 500),
  });
  return undefined;
};

export class OpenCodeProvider implements AiProvider {
  private readonly apiKey = config.ai.apiKey;
  private readonly model = config.ai.model;
  private readonly maxTokens = config.ai.maxTokens;
  private readonly baseUrl = config.ai.baseUrl;

  private async createJsonResponse(input: string, schema: Record<string, unknown>, schemaName: string) {
    if (isPlaceholderApiKey(this.apiKey)) {
      throw new AppError(503, 'OpenCode AI API key is not configured. Set AI_API_KEY or use AI_PROVIDER=mock for local mock generation.');
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: [
              'You are a JSON generator. You MUST respond with valid JSON only.',
              `Schema for "${schemaName}":\n${JSON.stringify(schema, null, 2)}`,
              '',
              'ABSOLUTE RULES:',
              '- Output ONLY the raw JSON object. Absolutely nothing else.',
              '- NEVER include reasoning, analysis, thinking, or notes of any kind.',
              '- NEVER use markdown, code fences, or backticks.',
              '- Do not think aloud. Do not explain. Do not narrate.',
              '- Your entire response must be a single valid JSON object.',
              '- If you write anything other than JSON, the application will crash.',
              '- Use Bangla/Bengali language for all food names, dish names, and item names.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: input,
          },
        ],
        max_tokens: this.maxTokens,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OpenCode AI request failed', new Error(errorText), { status: response.status });
      throw new AppError(502, 'AI generation failed');
    }

    const data = await response.json();
    const content = extractChatContent(data);
    return parseJsonObject(content);
  }

  async generateMenuPlanContent(options: GenerateMenuPlanOptions) {
    const recentContext = (options.recentMeals ?? [])
      .map((plan) => `${plan.date.toISOString().slice(0, 10)}: ${JSON.stringify(plan.meals)}`)
      .join('\n') || 'No recent menu context.';

    const marketContext = buildMarketPriceContext(options.marketPrices);

    const peopleText = options.personCount ? `${options.personCount} জন লোক খাবে। পরিমাণ সেই অনুযায়ী প্ল্যান করো।` : '';
    const daysText = options.shoppingDays ? `${options.shoppingDays} দিনের বাজার করতে হবে।` : '';

    const result = await this.createJsonResponse(
      [
        'Generate a practical Bangladeshi mess meal plan in Bangla language.',
        'Return concise dish names in Bangla only, no explanation.',
        `Target date: ${options.date.toISOString().slice(0, 10)}`,
        `Meal categories: ${options.mealCategories.join(', ')}`,
        `Preference: ${options.preference || 'balanced Bangladeshi mess food'}`,
        `STRICT BUDGET: ${options.budget ?? 'not specified'} BDT per person per meal. This is the MAXIMUM cost for ONE person for ONE meal.`,
        peopleText,
        daysText,
        '',
        '=== CURRENT MARKET PRICES ===',
        marketContext,
        '',
        '=== BUDGET GUIDELINES ===',
        '50-80 BDT → Only cheap items (aloo, shak, begun, dal, dim). NO chicken, fish or beef at all.',
        '100-150 BDT → Dim curry, dal, simple vegetables. Still NO chicken/fish - too expensive.',
        '200+ BDT → Maybe chicken or pangas fish, but only once a day. Keep other meals vegetarian.',
        'If marketPrices shows chicken/beef/fish price has increased, substitute with cheaper protein (eggs, dal, soya).',
        'If marketPrices shows vegetables are cheap, use more vegetables.',
        'Always respect the actual market prices to stay within budget.',
        '',
        'Avoid repeating recent meals when possible.',
        `Recent meals:\n${recentContext}`,
      ].join('\n'),
      {
        type: 'object',
        properties: {
          meals: {
            type: 'object',
            properties: Object.fromEntries(
              options.mealCategories.map((category) => [category, { type: 'string' }])
            ),
            required: options.mealCategories,
          },
        },
        required: ['meals'],
      },
      'menu_plan'
    ) as { meals?: Record<string, unknown> };

    const meals = result.meals ?? {};
    const toString = (val: unknown): string =>
      typeof val === 'string' ? val : Array.isArray(val) ? val.join(', ') : typeof val === 'object' && val !== null ? Object.values(val as Record<string, unknown>).join(', ') : String(val ?? '');

    const missingCategories = options.mealCategories.filter((category) => !toString(meals[category]).trim());
    if (missingCategories.length) {
      throw new AppError(502, `AI menu response missed meal categories: ${missingCategories.join(', ')}`);
    }

    return Object.fromEntries(
      options.mealCategories.map((category) => [category, toString(meals[category]).trim()])
    );
  }

  async generateShoppingListItems(menuMeals: Record<string, string> | Map<string, string>, options?: GenerateShoppingListOptions) {
    const meals = menuMeals instanceof Map ? Object.fromEntries(menuMeals) : menuMeals;
    const mealDescriptions = Object.entries(meals)
      .map(([cat, dish]) => `  ${cat}: ${dish}`)
      .join('\n');

    const personText = options?.personCount ? `Quantities for ${options.personCount} people.` : 'Quantities for a small mess (5-10 people).';
    const prefText = options?.preference ? `\nUser preference/constraints: ${options.preference}` : '';
    const budgetText = options?.budget ? `\nBudget: ${options.budget} BDT per person.` : '';

    const result = await this.createJsonResponse(
      [
        'IMPORTANT: Do NOT think or reason aloud. Output ONLY the JSON object. Start with { and end with }.',
        '',
        'You are a Bangladeshi mess grocery planner. Based on the menu below, create a shopping list.',
        '',
        '=== MENU ===',
        mealDescriptions,
        '',
        '=== RULES ===',
        '1. Item names MUST be in Bangla/Bengali (e.g., "চাল", "ডাল", "মুরগির মাংস").',
        '2. Quantities must be practical.',
        '3. Each item must have a category: "bazar" for dry goods/grains, "meat" for meat/fish, "vegetables" for veggies, "dairy" for milk/eggs, "spices" for masala.',
        '4. Be specific: not just "মাছ" but "রুই মাছ ২ কেজি".',
        '5. Return ONLY the JSON. No explanation, no notes.',
        '',
        '=== INGREDIENT LOGIC (CRITICAL) ===',
        'Analyze EACH dish name and determine its specific ingredients.',
        'ONLY include ingredients that the dishes actually need — nothing more, nothing less.',
        'Examples:',
        '  "আলু ভাজি" → আলু, তেল, লবণ, হলুদ',
        '  "ডিম ভাজি" → ডিম, তেল, লবণ, হলুদ',
        '  "লাউ শাক" → লাউ, রসুন, তেল, লবণ',
        '  "ভাত" → চাল',
        '  "ডাল" → ডাল, লবণ, হলুদ, তেল',
        '  "মুরগির কারি" → মুরগি, পেঁয়াজ, রসুন, আদা, হলুদ, মরিচ, তেল',
        'If menu has NO rice dishes → DO NOT add চাল',
        'If menu has NO dal dishes → DO NOT add ডাল',
        'If menu has NO meat/fish dishes → DO NOT add meat/fish',
        'If menu has NO egg dishes → DO NOT add ডিম',
        'Base your list STRICTLY on what the dishes dictate.',
        personText,
        prefText,
        budgetText,
      ].join('\n'),
      {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quantity: { type: 'string' },
                category: { type: 'string' },
              },
              required: ['name', 'quantity', 'category'],
            },
          },
        },
        required: ['items'],
      },
      'shopping_list'
    ) as { items?: { name: string; quantity: string; category: string }[] };

    logger.info('Raw AI shopping result', {
      hasItems: Array.isArray(result?.items),
      itemsCount: Array.isArray(result?.items) ? result.items.length : 0,
      keys: result ? Object.keys(result).join(', ') : 'null',
    });

    const items = (result.items ?? [])
      .map((item) => ({
        name: item.name?.trim(),
        quantity: item.quantity?.trim(),
        category: item.category?.trim() || 'bazar',
      }))
      .filter((item) => item.name && item.quantity && item.category);

    if (!items.length) throw new AppError(502, 'AI shopping response did not include any valid items');
    return items;
  }
}

const createAiProvider = (): AiProvider => {
  if (config.ai.provider === 'opencode') return new OpenCodeProvider();
  throw new AppError(500, `Unsupported AI_PROVIDER: ${config.ai.provider}`);
};

export const aiService: AiProvider = createAiProvider();
