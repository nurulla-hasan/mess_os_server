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
  recentMeals?: Array<{
    date: Date;
    meals: Record<string, string>;
  }>;
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
  try {
    return JSON.parse(text);
  } catch (error) {
    logger.error('Failed to parse AI JSON response', error, { text });
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

    const result = await this.createJsonResponse(
      [
        'Generate a practical Bangladeshi mess meal plan.',
        'Return concise dish names only, no explanation.',
        `Target date: ${options.date.toISOString().slice(0, 10)}`,
        `Meal categories: ${options.mealCategories.join(', ')}`,
        `Preference: ${options.preference || 'balanced Bangladeshi mess food'}`,
        `Budget hint: ${options.budget ?? 'not specified'} BDT`,
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
    ) as { meals?: Record<string, string> };

    const meals = result.meals ?? {};
    const missingCategories = options.mealCategories.filter((category) => !meals[category]?.trim());
    if (missingCategories.length) {
      throw new AppError(502, `AI menu response missed meal categories: ${missingCategories.join(', ')}`);
    }

    return Object.fromEntries(
      options.mealCategories.map((category) => [category, meals[category].trim()])
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

const createAiProvider = (): AiProvider => {
  if (config.ai.provider === 'mock') return new MockAiProvider();
  if (config.ai.provider === 'openai') return new OpenAiProvider();
  throw new AppError(500, `Unsupported AI_PROVIDER: ${config.ai.provider}`);
};

export const aiService: AiProvider = createAiProvider();
