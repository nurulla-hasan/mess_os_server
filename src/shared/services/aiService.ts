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

// Ensure the application uses abstractions so replacing the Mock layer with an OpenAI/Claude layer is a clean dependency swap
export const aiService: AiProvider = new MockAiProvider();
