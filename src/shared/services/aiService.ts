import { config } from '../../config';
import { AppError } from '../utils/apiError';
import { logger } from '../utils/logger';

export interface AiProvider {
  generateMenuPlanContent(options: GenerateMenuPlanOptions): Promise<Record<string, string>>;
  generateShoppingListItems(menuMeals: Record<string, string> | Map<string, string>): Promise<{ name: string, quantity: string, category: string }[]>;
}

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

class MockAiProvider implements AiProvider {
  async generateMenuPlanContent(options: GenerateMenuPlanOptions) {
    const preference = options.preference?.toLowerCase() ?? '';
    const isLowCost = preference.includes('low') || preference.includes('budget') || (options.budget !== undefined && options.budget <= 1000);
    const isHealthy = preference.includes('healthy');
    const isBangla = preference.includes('bangla') || preference.includes('bengali') || !preference;

    const suggestions: Record<string, string[]> = {
      breakfast: isHealthy
        ? ['Oats, banana, boiled egg', 'Ruti, mixed vegetables, tea']
        : isLowCost
          ? ['Ruti, dal, tea', 'Khichuri, egg fry']
          : ['Paratha, omelette, tea', 'Ruti, vegetable bhaji, egg'],
      lunch: isLowCost
        ? ['Rice, dal, mashed potato, vegetables', 'Rice, egg curry, dal']
        : isBangla
          ? ['Rice, chicken curry, dal, salad', 'Rice, fish curry, vegetables']
          : ['Rice bowl with chicken and vegetables', 'Grilled chicken, rice, salad'],
      dinner: isHealthy
        ? ['Rice, fish curry, vegetables', 'Vegetable khichuri, salad']
        : isLowCost
          ? ['Rice, dal, egg bhuna', 'Vegetable noodles']
          : ['Chicken khichuri, salad', 'Polao, roast chicken'],
    };

    const usedMenus = new Set((options.recentMeals ?? []).flatMap((plan) => Object.values(plan.meals).map((meal) => meal.toLowerCase())));

    const result: Record<string, string> = {};
    options.mealCategories.forEach((category, index) => {
      const choices = suggestions[category.toLowerCase()] ?? [
        isLowCost ? 'Rice, dal, vegetables' : isHealthy ? 'Rice, fish, vegetables' : 'Rice, chicken curry',
        isLowCost ? 'Khichuri, egg' : isHealthy ? 'Vegetable soup, rice' : 'Polao, curry',
      ];
      result[category] = choices.find((choice) => !usedMenus.has(choice.toLowerCase())) ?? choices[index % choices.length];
    });

    return result;
  }
  async generateShoppingListItems(menuMeals: Record<string, string> | Map<string, string>) {
    const mealValues = menuMeals instanceof Map ? Array.from(menuMeals.values()) : Object.values(menuMeals);
    const mealText = mealValues.join(' ').toLowerCase();
    const items = [
      { name: 'Rice', quantity: '5 KG', category: 'bazar' },
      { name: 'Dal', quantity: '1 KG', category: 'bazar' },
      { name: 'Mixed vegetables', quantity: '2 KG', category: 'bazar' },
    ];
    if (mealText.includes('chicken')) items.push({ name: 'Chicken', quantity: '2 KG', category: 'bazar' });
    if (mealText.includes('fish')) items.push({ name: 'Fish', quantity: '2 KG', category: 'bazar' });
    if (mealText.includes('egg')) items.push({ name: 'Eggs', quantity: '1 Dozen', category: 'bazar' });

    return [
      ...items,
    ];
  }
}

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
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

const extractResponseText = (response: OpenAiResponse) => {
  if (response.output_text) return response.output_text;

  return response.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter(Boolean)
    .join('\n');
};

const parseJsonObject = (text: string | undefined) => {
  if (!text) throw new AppError(502, 'AI response was empty');
  // Strip markdown code fences (```json ... ```) that some models like Claude add
  const cleaned = text.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    logger.error('Failed to parse AI JSON response', error, { text, cleaned });
    throw new AppError(502, 'AI returned an invalid JSON response');
  }
};

class OpenAiProvider implements AiProvider {
  private readonly apiKey = config.ai.apiKey;
  private readonly model = config.ai.model;
  private readonly maxTokens = config.ai.maxTokens;

  private async createJsonResponse(input: string, schema: Record<string, unknown>, schemaName: string) {
    if (isPlaceholderApiKey(this.apiKey)) {
      throw new AppError(503, 'OpenAI API key is not configured. Set AI_API_KEY or use AI_PROVIDER=mock for local mock generation.');
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input,
        max_output_tokens: this.maxTokens,
        text: {
          format: {
            type: 'json_schema',
            name: schemaName,
            strict: true,
            schema,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OpenAI request failed', new Error(errorText), { status: response.status });
      throw new AppError(502, 'OpenAI generation failed');
    }

    return parseJsonObject(extractResponseText(await response.json() as OpenAiResponse));
  }

  async generateMenuPlanContent(options: GenerateMenuPlanOptions) {
    const recentContext = (options.recentMeals ?? [])
      .map((plan) => `${plan.date.toISOString().slice(0, 10)}: ${JSON.stringify(plan.meals)}`)
      .join('\n') || 'No recent menu context.';

    const marketContext = buildMarketPriceContext(options.marketPrices);

    const peopleText = options.personCount ? `${options.personCount} people will eat. Plan quantities accordingly.` : '';
    const daysText = options.shoppingDays ? `Shopping is for ${options.shoppingDays} days.` : '';

    const result = await this.createJsonResponse(
      [
        'Generate a practical Bangladeshi mess meal plan.',
        'Return concise dish names only, no explanation.',
        `Target date: ${options.date.toISOString().slice(0, 10)}`,
        `Meal categories: ${options.mealCategories.join(', ')}`,
        `Preference: ${options.preference || 'balanced Bangladeshi mess food'}`,
        `STRICT BUDGET: ${options.budget ?? 'not specified'} BDT per person per meal.`,
        peopleText,
        daysText,
        '',
        '=== CURRENT MARKET PRICES ===',
        marketContext,
        '',
        '=== BUDGET GUIDELINES ===',
        '50-80 BDT → Only cheap items (potato, leafy greens, eggplant, lentils, eggs). NO chicken, fish or beef.',
        '100-150 BDT → Egg curry, dal, simple vegetables. Still NO chicken/fish.',
        '200+ BDT → Maybe chicken or cheap fish once a day. Keep other meals vegetarian.',
        'When chicken/beef/fish prices are high, substitute with eggs, dal, or soyabean.',
        'When vegetables are cheap, use more of them.',
        '',
        'Avoid repeating recent meals when possible.',
        `Recent meals:\n${recentContext}`,
      ].join('\n'),
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          meals: {
            type: 'object',
            additionalProperties: false,
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

  async generateShoppingListItems(menuMeals: Record<string, string> | Map<string, string>) {
    const meals = menuMeals instanceof Map ? Object.fromEntries(menuMeals) : menuMeals;
    const result = await this.createJsonResponse(
      [
        'Create a grocery shopping list for a Bangladeshi mess based on this menu.',
        'Use practical quantities for a small shared mess and keep item names concise.',
        `Menu: ${JSON.stringify(meals)}`,
      ].join('\n'),
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              additionalProperties: false,
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

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export class BynaraProvider implements AiProvider {
  private readonly apiKey = config.ai.apiKey;
  private readonly model = config.ai.model;
  private readonly maxTokens = config.ai.maxTokens;
  private readonly baseUrl = config.ai.baseUrl;

  private async createJsonResponse(input: string, schema: Record<string, unknown>, schemaName: string) {
    if (isPlaceholderApiKey(this.apiKey)) {
      throw new AppError(503, 'NaraRouter API key is not configured. Set AI_API_KEY or use AI_PROVIDER=mock for local mock generation.');
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
              'You are a JSON generator. Respond with valid JSON only.',
              `Schema for "${schemaName}":\n${JSON.stringify(schema, null, 2)}`,
              'Output ONLY the JSON object. No markdown, no explanation.',
              'Use Bangla/Bengali language for all food names, dish names, and item names.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: input,
          },
        ],
        max_tokens: this.maxTokens,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('NaraRouter request failed', new Error(errorText), { status: response.status });
      throw new AppError(502, 'AI generation failed');
    }

    const data = await response.json() as ChatCompletionResponse;
    return parseJsonObject(data.choices?.[0]?.message?.content);
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

  async generateShoppingListItems(menuMeals: Record<string, string> | Map<string, string>) {
    const meals = menuMeals instanceof Map ? Object.fromEntries(menuMeals) : menuMeals;
    const result = await this.createJsonResponse(
      [
        'Create a grocery shopping list for a Bangladeshi mess based on this menu.',
        'Use Bangla names for all items. Use practical quantities for a small shared mess.',
        `Menu: ${JSON.stringify(meals)}`,
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
              'You are a JSON generator. Respond with valid JSON only.',
              `Schema for "${schemaName}":\n${JSON.stringify(schema, null, 2)}`,
              'Output ONLY the JSON object. No markdown, no explanation.',
              'Use Bangla/Bengali language for all food names, dish names, and item names.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: input,
          },
        ],
        max_tokens: this.maxTokens,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OpenCode AI request failed', new Error(errorText), { status: response.status });
      throw new AppError(502, 'AI generation failed');
    }

    const data = await response.json() as ChatCompletionResponse;
    return parseJsonObject(data.choices?.[0]?.message?.content);
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

  async generateShoppingListItems(menuMeals: Record<string, string> | Map<string, string>) {
    const meals = menuMeals instanceof Map ? Object.fromEntries(menuMeals) : menuMeals;
    const result = await this.createJsonResponse(
      [
        'Create a grocery shopping list for a Bangladeshi mess based on this menu.',
        'Use Bangla names for all items. Use practical quantities for a small shared mess.',
        `Menu: ${JSON.stringify(meals)}`,
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
  if (config.ai.provider === 'mock') return new MockAiProvider();
  if (config.ai.provider === 'openai') return new OpenAiProvider();
  if (config.ai.provider === 'bynara') return new BynaraProvider();
  if (config.ai.provider === 'opencode') return new OpenCodeProvider();
  throw new AppError(500, `Unsupported AI_PROVIDER: ${config.ai.provider}`);
};

export const aiService: AiProvider = createAiProvider();
