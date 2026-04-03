export interface AiProvider {
  generateMenuPlanContent(date: Date): Promise<{ breakfast?: string, lunch?: string, dinner?: string }>;
  generateShoppingListItems(menuMeals: any): Promise<{ name: string, quantity: string, category: string }[]>;
}

class MockAiProvider implements AiProvider {
  async generateMenuPlanContent(date: Date) {
    return { breakfast: 'Eggs & Bread', lunch: 'Chicken & Rice', dinner: 'Fish & Curry' };
  }
  async generateShoppingListItems(menuMeals: any) {
    return [
      { name: 'Eggs', quantity: '1 Dozen', category: 'bazar' },
      { name: 'Chicken', quantity: '2 KG', category: 'bazar' }
    ];
  }
}

// Ensure the application uses abstractions so replacing the Mock layer with an OpenAI/Claude layer is a clean dependency swap
export const aiService: AiProvider = new MockAiProvider();
