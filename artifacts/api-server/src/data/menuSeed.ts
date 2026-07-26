export type SeedMenuItem = {
  name: string;
  price: number;
  desc?: string;
  isNew?: boolean;
  note?: string;
};

export type SeedMenuSection = {
  category: string;
  callout?: string;
  boost?: string;
  items: SeedMenuItem[];
};

export const menuData: SeedMenuSection[] = [
  {
    category: "Appetizers",
    items: [
      { name: "Skin-On Fries", desc: "Served with ketchup or sriracha mayo on the side.", price: 4.5 },
      { name: "Bestia Fries", desc: "Skin-On fries topped with freshly melted cheese, beef bacon, onions, sriracha mayo sauce and jalapeños served with sour cream.", price: 10.75 },
      { name: "Corn on the Cob", desc: "Freshly boiled corn cob, topped with melted butter, salt, and a touch of paprika.", price: 4, isNew: true },
      { name: "Nachos N Guac", desc: "Freshly made guacamole (220g) served with homemade tortilla chips.", price: 9.75 },
      { name: "Mama's Nachos", desc: "Homemade tortilla chips with freshly melted cheese and jalapeños served with sour cream.", price: 8.5, note: "Double cheese: +$2" },
      { name: "Macho Nachos", desc: "Homemade tortilla chips with freshly melted cheese, topped with your choice of beef or chicken with tomatoes, lettuce, onions, coriander and jalapeños served with sour cream.", price: 11, note: "Double cheese: +$2" },
    ]
  },
  {
    category: "Tacos",
    callout: "MIX & MATCH: Any 2 of Beef, Chicken, or Breaded Chicken Tacos for $10",
    boost: "Taco Boost: Fries + Soft Drink $3 | Guacamole $1.8 | Nacho chips $1.65 | Nacho chips N Guac $4 | Shredded Cheese $0.5",
    items: [
      { name: "Beef Taco", desc: "15cm tortilla bread, ground beef, lettuce, tomatoes, onions, coriander, nacho crisp and jalapeños served with sour cream.", price: 5.5 },
      { name: "Chicken Taco", desc: "15cm tortilla bread, marinated grilled chicken, lettuce, tomatoes, onions, coriander, nacho crisp, and jalapeños served with sour cream.", price: 5.5 },
      { name: "Breaded Chicken Taco", desc: "15cm tortilla bread, two pieces of breaded chicken, lettuce, sriracha mayo sauce, served with sour cream.", price: 5.5 },
      { name: "Shrimp Taco", desc: "15cm tortilla bread, marinated grilled shrimps, lettuce, onions, corn and black beans topped with sriracha mayo sauce.", price: 6 },
    ]
  },
  {
    category: "Burritos",
    boost: "Burrito Boost: Fries + Soft Drink $3 | Guacamole $1.8 | Nacho chips $1.65 | Nacho chips N Guac $4 | Free: Jalapeños, Corn, Salsa and Fajita Veggies",
    items: [
      { name: "Beef Burrito", desc: "Large tortilla bread, ground beef, black beans, Mexican rice, sriracha mayo sauce, cheese mix, fresh lettuce, and sour cream.", price: 13 },
      { name: "Chicken Burrito", desc: "Large tortilla bread, marinated grilled chicken, black beans, Mexican rice, sriracha mayo sauce, cheese mix, fresh lettuce, and sour cream.", price: 10.75 },
      { name: "Shrimp Burrito", desc: "Large tortilla bread, marinated grilled shrimps, black beans, Mexican rice, sriracha mayo sauce, cheese mix, fresh lettuce and sour cream.", price: 13, note: "El Macho Size: +$8" },
    ]
  },
  {
    category: "Burrito Bowls",
    boost: "Burrito Bowl Boost: Fries + Soft Drink $3 | Guacamole $1.8 | Nacho chips $1.65 | Nacho chips N Guac $4 | Free: Jalapeños, Corn, Salsa and Fajita Veggies",
    items: [
      { name: "Beef Burrito Bowl", desc: "76g Protein · 87g Carbs — Ground beef, Mexican rice, black beans, cheese mix, fresh lettuce, with sriracha mayo sauce and sour cream.", price: 13 },
      { name: "Chicken Burrito Bowl", desc: "85g Protein · 87g Carbs — Marinated grilled chicken, Mexican rice, black beans, cheese mix, fresh lettuce, with sriracha mayo sauce and sour cream.", price: 11 },
      { name: "Shrimp Burrito Bowl", desc: "37g Protein · 87g Carbs — Marinated grilled shrimps, black beans, Mexican rice, cheese mix, fresh lettuce served with sour cream and sriracha mayo.", price: 13 },
    ]
  },
  {
    category: "Salads & Shakers",
    items: [
      { name: "Mexiglow Salad", desc: "Fresh blend of romaine lettuce, mixed bell peppers, onions, coriander, black beans, cheese mix, homemade nacho chips and freshly made guacamole with a coriander cumin dressing.", price: 11, note: "Add grilled chicken breast +$4, Add marinated grilled shrimps +$4" },
      { name: "Beef Shaker", desc: "Lettuce, tomatoes, onions, coriander, beef, black beans, topped with nacho crisp, jalapeños, and your choice of sour cream or coriander cumin dressing.", price: 9.5 },
      { name: "Chicken Shaker", desc: "Lettuce, tomatoes, onions, coriander, chicken, black beans, topped with nacho crisp, jalapeños and your choice of sour cream or coriander cumin dressing.", price: 9.5 },
    ]
  },
  {
    category: "Quesadillas",
    items: [
      { name: "Beef Quesadillas", desc: "Tortilla bread, ground beef, cheese mix, caramelized onions, green and red pepper served with sour cream and guacamole.", price: 11, note: "Large: $13" },
      { name: "Chicken Quesadillas", desc: "Tortilla bread, marinated grilled chicken, cheese mix, caramelized onions, green and red pepper served with sour cream and guacamole.", price: 11, note: "Large: $13" },
    ]
  },
  {
    category: "The Taco Bar",
    items: [
      { name: "Build Your Tacos Your Way", desc: "Beef, Chicken and Shrimp, in addition to all the toppings and sauces you know and love. Serves 15 Tacos.", price: 50 },
    ]
  },
  {
    category: "Dessert",
    items: [
      { name: "Churros", desc: "4 pcs of homemade churros with your choice of dark, milk premium Belgian chocolate or caramel sauce.", price: 8.5 },
    ]
  },
  {
    category: "Dips & Sides",
    items: [
      { name: "Nacho chips", price: 1.65 },
      { name: "Nacho chips and guacamole", price: 4 },
      { name: "Sour cream", price: 1 },
      { name: "Salsa (not spicy)", price: 1 },
      { name: "Sriracha mayo", price: 1 },
      { name: "Guacamole", price: 1.8 },
    ]
  },
  {
    category: "Drinks",
    items: [
      { name: "Soft drinks", price: 1.8 },
      { name: "Rim sparkling water", price: 1.8 },
      { name: "Ice tea peach", price: 2.2 },
      { name: "Water", price: 1 },
      { name: "Almaza beer", price: 3 },
    ]
  }
];
