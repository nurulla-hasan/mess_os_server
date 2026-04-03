"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = void 0;
class MockAiProvider {
    async generateMenuPlanContent(date) {
        return { breakfast: 'Eggs & Bread', lunch: 'Chicken & Rice', dinner: 'Fish & Curry' };
    }
    async generateShoppingListItems(menuMeals) {
        return [
            { name: 'Eggs', quantity: '1 Dozen', category: 'bazar' },
            { name: 'Chicken', quantity: '2 KG', category: 'bazar' }
        ];
    }
}
// Ensure the application uses abstractions so replacing the Mock layer with an OpenAI/Claude layer is a clean dependency swap
exports.aiService = new MockAiProvider();
