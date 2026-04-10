// Maps a product name (and optional raw Flipp category) to a canonical category.
// Used because the /flipp/flyers/{id} endpoint returns no category data.

interface CategoryRule {
  category: string;
  subcategory: string;
  keywords: string[];
}

const RULES: CategoryRule[] = [
  {
    category: 'Produce',
    subcategory: 'Fruits',
    keywords: ['apple', 'banana', 'orange', 'mango', 'strawberr', 'blueberr', 'raspberr', 'blackberr', 'grape', 'peach', 'pear', 'plum', 'pineapple', 'watermelon', 'melon', 'kiwi', 'lemon', 'lime', 'avocado', 'cherry', 'nectarine', 'tangerine', 'clementine', 'grapefruit'],
  },
  {
    category: 'Produce',
    subcategory: 'Vegetables',
    keywords: ['broccoli', 'spinach', 'tomato', 'pepper', 'onion', 'garlic', 'lettuce', 'cucumber', 'carrot', 'celery', 'zucchini', 'cauliflower', 'kale', 'asparagus', 'corn', 'potato', 'sweet potato', 'mushroom', 'cabbage', 'beet', 'radish', 'leek', 'arugula', 'romaine', 'eggplant', 'squash', 'pumpkin', 'brussel sprout', 'green bean', 'snap pea', 'edamame'],
  },
  {
    category: 'Meat & Seafood',
    subcategory: 'Poultry',
    keywords: ['chicken', 'turkey', 'duck', 'poultry', 'wing', 'drumstick', 'breast fillet', 'whole bird'],
  },
  {
    category: 'Meat & Seafood',
    subcategory: 'Beef & Pork',
    keywords: ['beef', 'steak', 'ground beef', 'pork', 'bacon', 'ham', 'sausage', 'ribs', 'brisket', 'sirloin', 'tenderloin', 'roast', 'lamb', 'veal', 'pepperoni', 'salami', 'prosciutto', 'chorizo'],
  },
  {
    category: 'Meat & Seafood',
    subcategory: 'Seafood',
    keywords: ['salmon', 'shrimp', 'tuna', 'tilapia', 'cod', 'halibut', 'crab', 'lobster', 'scallop', 'mussel', 'clam', 'oyster', 'fish fillet', 'seafood', 'prawn'],
  },
  {
    category: 'Meat & Seafood',
    subcategory: 'Deli',
    keywords: ['deli', 'cold cut', 'lunch meat', 'turkey breast', 'chicken breast slice'],
  },
  {
    category: 'Dairy & Eggs',
    subcategory: 'Milk & Cream',
    keywords: ['milk', 'cream', 'half and half', 'oat milk', 'almond milk', 'soy milk', 'lactose free milk'],
  },
  {
    category: 'Dairy & Eggs',
    subcategory: 'Cheese',
    keywords: ['cheese', 'cheddar', 'mozzarella', 'parmesan', 'brie', 'gouda', 'feta', 'ricotta', 'cottage cheese', 'cream cheese'],
  },
  {
    category: 'Dairy & Eggs',
    subcategory: 'Yogurt & Butter',
    keywords: ['yogurt', 'yoghurt', 'kefir', 'butter', 'margarine', 'ghee', 'sour cream'],
  },
  {
    category: 'Dairy & Eggs',
    subcategory: 'Eggs',
    keywords: [' egg', 'eggs', 'large egg', 'free range egg'],
  },
  {
    category: 'Bakery & Bread',
    subcategory: 'Bread & Rolls',
    keywords: ['bread', 'loaf', 'bun', 'roll', 'bagel', 'pita', 'naan', 'tortilla', 'wrap', 'english muffin'],
  },
  {
    category: 'Bakery & Bread',
    subcategory: 'Pastries & Cakes',
    keywords: ['croissant', 'muffin', 'cake', 'cupcake', 'donut', 'doughnut', 'danish', 'scone', 'brownie', 'pastry'],
  },
  {
    category: 'Frozen Foods',
    subcategory: 'Frozen Meals',
    keywords: ['frozen', 'pizza pocket', 'hot pocket', 'lean cuisine', 'stouffer', 'marie callender', 'tv dinner'],
  },
  {
    category: 'Frozen Foods',
    subcategory: 'Ice Cream',
    keywords: ['ice cream', 'gelato', 'sorbet', 'frozen yogurt', 'popsicle', 'ice bar', 'frozen treat'],
  },
  {
    category: 'Frozen Foods',
    subcategory: 'Frozen Breakfast',
    keywords: ['waffle', 'pancake', 'french toast stick', 'breakfast sandwich'],
  },
  {
    category: 'Beverages',
    subcategory: 'Juice',
    keywords: ['juice', 'lemonade', 'cocktail drink', 'fruit drink', 'fruit punch'],
  },
  {
    category: 'Beverages',
    subcategory: 'Water & Sparkling',
    keywords: ['water', 'sparkling', 'perrier', 'san pellegrino', 'club soda', 'tonic'],
  },
  {
    category: 'Beverages',
    subcategory: 'Coffee & Tea',
    keywords: ['coffee', 'espresso', 'latte', 'tea', 'herbal tea', 'green tea', 'k-cup', 'pod'],
  },
  {
    category: 'Beverages',
    subcategory: 'Soft Drinks',
    keywords: ['pop ', 'soda', 'cola', 'sprite', 'pepsi', 'ginger ale', 'root beer', 'energy drink', 'red bull', 'monster'],
  },
  {
    category: 'Snacks & Candy',
    subcategory: 'Chips & Crackers',
    keywords: ['chip', 'cracker', 'pretzel', 'popcorn', 'rice cake', 'tortilla chip', 'pita chip', 'nacho'],
  },
  {
    category: 'Snacks & Candy',
    subcategory: 'Chocolate & Candy',
    keywords: ['chocolate', 'candy', 'gummy', 'licorice', 'lollipop', 'caramel', 'toffee', 'marshmallow', 'jelly bean'],
  },
  {
    category: 'Snacks & Candy',
    subcategory: 'Bars & Nuts',
    keywords: ['granola bar', 'protein bar', 'nut bar', 'trail mix', 'almond', 'cashew', 'peanut', 'mixed nut', 'pistachio', 'walnut'],
  },
  {
    category: 'Pantry & Dry Goods',
    subcategory: 'Pasta & Rice',
    keywords: ['pasta', 'spaghetti', 'penne', 'noodle', 'rice ', 'risotto', 'couscous', 'quinoa', 'barley', 'oat', 'oatmeal'],
  },
  {
    category: 'Pantry & Dry Goods',
    subcategory: 'Cereal',
    keywords: ['cereal', 'granola', 'corn flake', 'cheerio', 'special k'],
  },
  {
    category: 'Pantry & Dry Goods',
    subcategory: 'Canned & Jarred',
    keywords: ['canned', 'can of', 'soup', 'broth', 'stock', 'tomato sauce', 'salsa', 'beans', 'lentil', 'chickpea', 'tuna can', 'sardine'],
  },
  {
    category: 'Pantry & Dry Goods',
    subcategory: 'Condiments & Oils',
    keywords: ['oil', 'olive oil', 'canola', 'vinegar', 'ketchup', 'mustard', 'mayonnaise', 'hot sauce', 'soy sauce', 'dressing', 'marinade', 'syrup', 'honey', 'jam', 'jelly', 'peanut butter', 'almond butter'],
  },
  {
    category: 'Pantry & Dry Goods',
    subcategory: 'Baking',
    keywords: ['flour', 'sugar', 'baking soda', 'baking powder', 'yeast', 'vanilla', 'cocoa', 'chocolate chip', 'icing'],
  },
  {
    category: 'Household & Cleaning',
    subcategory: 'Laundry',
    keywords: ['detergent', 'fabric softener', 'dryer sheet', 'bleach', 'stain remover', 'laundry'],
  },
  {
    category: 'Household & Cleaning',
    subcategory: 'Cleaning Supplies',
    keywords: ['cleaner', 'disinfect', 'windex', 'lysol', 'scrub', 'sponge', 'mop', 'broom', 'vacuum bag'],
  },
  {
    category: 'Household & Cleaning',
    subcategory: 'Paper Products',
    keywords: ['paper towel', 'toilet paper', 'tissue', 'napkin', 'paper plate', 'garbage bag', 'trash bag', 'plastic wrap', 'aluminum foil', 'parchment'],
  },
  {
    category: 'Health & Beauty',
    subcategory: 'Hair Care',
    keywords: ['shampoo', 'conditioner', 'hair dye', 'hair color', 'hair mask', 'dry shampoo'],
  },
  {
    category: 'Health & Beauty',
    subcategory: 'Skin & Body',
    keywords: ['lotion', 'moisturizer', 'sunscreen', 'spf', 'body wash', 'soap bar', 'face wash', 'cleanser', 'deodorant', 'antiperspirant', 'razor', 'shaving'],
  },
  {
    category: 'Health & Beauty',
    subcategory: 'Oral Care',
    keywords: ['toothpaste', 'toothbrush', 'mouthwash', 'floss', 'whitening'],
  },
  {
    category: 'Health & Beauty',
    subcategory: 'Vitamins & Medicine',
    keywords: ['vitamin', 'supplement', 'probiotic', 'omega', 'melatonin', 'advil', 'tylenol', 'ibuprofen', 'acetaminophen', 'allergy', 'antacid', 'bandage', 'first aid'],
  },
  {
    category: 'Baby & Kids',
    subcategory: 'Baby Care',
    keywords: ['diaper', 'wipe', 'formula', 'baby food', 'baby wash', 'baby lotion', 'baby powder', 'pacifier'],
  },
  {
    category: 'Pet Supplies',
    subcategory: 'Pet Food',
    keywords: ['dog food', 'cat food', 'kibble', 'pet treat', 'bird seed', 'fish food', 'cat treat', 'dog treat'],
  },
  {
    category: 'Pet Supplies',
    subcategory: 'Pet Accessories',
    keywords: ['cat litter', 'litter box', 'pet bed', 'dog leash', 'pet toy', 'aquarium', 'fish tank'],
  },
];

export function normalizeCategory(name: string, rawL1?: string | null, rawL2?: string | null): { category: string; subcategory: string } {
  const lower = name.toLowerCase();

  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) {
        return { category: rule.category, subcategory: rule.subcategory };
      }
    }
  }

  // Fall back to Flipp's raw category (title-cased) if available
  if (rawL1) {
    const cat = rawL1.trim();
    const sub = rawL2?.trim() ?? cat;
    return { category: cat, subcategory: sub };
  }

  return { category: 'Other', subcategory: 'General' };
}
