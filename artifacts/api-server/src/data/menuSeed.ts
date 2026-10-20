import type { MenuOptionGroup } from "@workspace/db";

// The printed menu (attached_assets/PMT_Menu_2026-10.pdf). Seeds an empty database, and is synced
// once into existing databases on startup (see lib/bootstrap.ts — bump MENU_SEED_VERSION when this
// file changes for a new printed menu).

export type SeedMenuItem = {
  name: string;
  price: number;
  desc?: string;
  isNew?: boolean;
  note?: string;
  options?: MenuOptionGroup[];
};

export type SeedMenuSection = {
  category: string;
  callout?: string;
  boost?: string;
  items: SeedMenuItem[];
};

// Items that were on an earlier printed menu and should be removed when syncing.
export const REMOVED_MENU_ITEMS = ["Mexiglow Salad"];

// ── Item options ──

const boost = (withCheese = false): MenuOptionGroup => ({
  id: "boost",
  name: "Boost your meal",
  type: "multiple",
  required: false,
  choices: [
    { id: "fries-drink", name: "Fries + Soft Drink", price: 3.5 },
    { id: "guacamole", name: "Guacamole", price: 1.8 },
    { id: "nacho-chips", name: "Nacho chips", price: 1.65 },
    { id: "chips-guac", name: "Nacho chips N Guac", price: 4 },
    ...(withCheese ? [{ id: "cheese", name: "Shredded cheese", price: 0.5 }] : []),
  ],
});

const freeAddOns: MenuOptionGroup = {
  id: "free",
  name: "Add for free",
  type: "multiple",
  required: false,
  choices: [
    { id: "jalapenos", name: "Jalapeños", price: 0 },
    { id: "corn", name: "Corn", price: 0 },
    { id: "salsa", name: "Salsa", price: 0 },
    { id: "fajita", name: "Fajita veggies (bell peppers & onions)", price: 0 },
  ],
};

const size = (bigName: string, bigPrice: number): MenuOptionGroup => ({
  id: "size",
  name: "Size",
  type: "single",
  required: true,
  choices: [
    { id: "regular", name: "Regular", price: 0 },
    { id: "large", name: bigName, price: bigPrice },
  ],
});

const pick = (id: string, name: string, choices: string[]): MenuOptionGroup => ({
  id,
  name,
  type: "single",
  required: true,
  choices: choices.map((c) => ({ id: c.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: c, price: 0 })),
});

const shell = pick("shell", "Shell", ["Soft shell", "Hard shell"]);

const MIX_AND_MATCH_TACOS = [
  "Beef taco (soft shell)",
  "Beef taco (hard shell)",
  "Chicken taco (soft shell)",
  "Chicken taco (hard shell)",
];

const BOOST_TEXT = "Fries + Soft Drink $3.5 | Guacamole $1.8 | Nacho chips $1.65 | Nacho chips N Guac $4";
const FREE_TEXT = "Free: Jalapeños, Corn, Salsa and Fajita Veggies";

export const menuData: SeedMenuSection[] = [
  {
    category: "Appetizers",
    items: [
      { name: "Skin-On Fries", desc: "Served with ketchup or sriracha mayo on the side.", price: 4.5, options: [pick("sauce", "Served with", ["Ketchup", "Sriracha mayo"])] },
      { name: "Bestia Fries", desc: "Skin-On fries topped with freshly melted cheese, beef bacon, onions, sriracha mayo sauce and jalapeños served with sour cream on the side.", price: 10.75 },
      { name: "Texas Chicken Strips", desc: "4 pcs · Breaded chicken strips served with your choice of sriracha mayo or ranch dip on the side.", price: 10.5, isNew: true, options: [pick("dip", "Dip", ["Sriracha mayo", "Ranch"])] },
      { name: "Nachos N Guac", desc: "Freshly made guacamole (220g) served with homemade tortilla chips on the side.", price: 9.75 },
      { name: "Mama's Nachos", desc: "Homemade tortilla chips with freshly melted cheese and jalapeños served with sour cream or salsa on the side.", price: 9.5, options: [pick("side", "Served with", ["Sour cream", "Salsa"])] },
      { name: "Macho Nachos", desc: "Homemade tortilla chips with freshly melted cheese, topped with your choice of beef or chicken with tomatoes, lettuce, onions, coriander and jalapeños served with sour cream on the side.", price: 12, options: [pick("protein", "Choose your protein", ["Beef", "Chicken"])] },
      { name: "Corn on the Cob", desc: "Freshly boiled corn on the cob, topped with melted butter, salt, and a touch of paprika.", price: 4.5 },
    ]
  },
  {
    category: "Tacos",
    callout: "MIX & MATCH: Any 2 Beef or Chicken Tacos for $10",
    boost: `Taco Boost: ${BOOST_TEXT} | Shredded Cheese $0.5`,
    items: [
      { name: "Beef Taco", desc: "Your choice of soft or hard shell 15cm tortilla bread, ground beef, lettuce, tomatoes, onions, coriander, nacho crisp and jalapeños served with sour cream on the side.", price: 5.5, options: [shell, boost(true)] },
      { name: "Chicken Taco", desc: "Your choice of soft or hard shell 15cm tortilla bread, marinated grilled chicken, lettuce, tomatoes, onions, coriander, nacho crisp, and jalapeños served with sour cream on the side.", price: 5.5, options: [shell, boost(true)] },
      { name: "Breaded Chicken Taco", desc: "Soft shell 15cm tortilla bread, two pieces of breaded chicken, lettuce, sriracha mayo sauce, served with sour cream on the side.", price: 7, note: "Spicy", options: [boost(true)] },
      { name: "Shrimp Taco", desc: "Your choice of soft or hard shell 15cm tortilla bread, marinated grilled shrimps, lettuce, onions, corn and black beans topped with sriracha mayo sauce.", price: 7, options: [shell, boost(true)] },
      {
        name: "Mix & Match — Any 2 Tacos",
        desc: "Any two of our Beef or Chicken tacos for $10.",
        price: 10,
        options: [
          pick("taco-1", "First taco", MIX_AND_MATCH_TACOS),
          pick("taco-2", "Second taco", MIX_AND_MATCH_TACOS),
          boost(true),
        ],
      },
    ]
  },
  {
    category: "Birria Pulled Beef",
    boost: `Birria Boost: ${BOOST_TEXT} | ${FREE_TEXT}`,
    items: [
      { name: "Birria Pulled Beef Tacos", desc: "2 pcs · Two soft shell tacos dipped in consommé, filled with 5-hour slow-cooked pulled beef birria brisket and melted cheese, topped with coriander and onions. Served with consommé and lemon on the side.", price: 13, isNew: true, note: "Add 1 extra birria taco: +$6", options: [{ id: "extra", name: "Extra taco", type: "multiple", required: false, choices: [{ id: "extra-taco", name: "1 extra birria taco", price: 6 }] }, boost(), freeAddOns] },
      { name: "Birria Pulled Beef Quesadillas", desc: "4 pcs · Tortilla bread filled with 5-hour slow-cooked pulled beef birria brisket and melted cheese, with green bell pepper, coriander and onions. Served with consommé and lemon on the side.", price: 14, isNew: true, options: [boost(), freeAddOns] },
    ]
  },
  {
    category: "Burritos",
    boost: `Burrito Boost: ${BOOST_TEXT} | ${FREE_TEXT}`,
    items: [
      { name: "Beef Burrito", desc: "Large tortilla bread, ground beef, black beans, Mexican rice, sriracha mayo sauce, cheese mix, fresh lettuce, and sour cream.", price: 13, note: "El Macho Size: +$8", options: [size("El Macho", 8), boost(), freeAddOns] },
      { name: "Chicken Burrito", desc: "Large tortilla bread, marinated grilled chicken, black beans, Mexican rice, sriracha mayo sauce, cheese mix, fresh lettuce, and sour cream.", price: 11, note: "El Macho Size: +$8", options: [size("El Macho", 8), boost(), freeAddOns] },
      { name: "Shrimp Burrito", desc: "Large tortilla bread, marinated grilled shrimps, black beans, Mexican rice, sriracha mayo sauce, cheese mix, fresh lettuce and sour cream.", price: 14, note: "El Macho Size: +$8", options: [size("El Macho", 8), boost(), freeAddOns] },
    ]
  },
  {
    category: "Burrito Bowls",
    boost: `Burrito Bowl Boost: ${BOOST_TEXT} | ${FREE_TEXT}`,
    items: [
      { name: "Beef Burrito Bowl", desc: "76g Protein · 87g Carbs — Ground beef, Mexican rice, black beans, cheese mix, fresh lettuce, with sriracha mayo sauce and sour cream.", price: 13, options: [boost(), freeAddOns] },
      { name: "Chicken Burrito Bowl", desc: "85g Protein · 87g Carbs — Marinated grilled chicken, Mexican rice, black beans, cheese mix, fresh lettuce, with sriracha mayo sauce and sour cream.", price: 11, options: [boost(), freeAddOns] },
      { name: "Shrimp Burrito Bowl", desc: "37g Protein · 87g Carbs — Marinated grilled shrimps, black beans, Mexican rice, cheese mix, fresh lettuce served with sour cream and sriracha mayo on the side.", price: 14, options: [boost(), freeAddOns] },
    ]
  },
  {
    category: "Salads & Shakers",
    items: [
      { name: "Fiesta Salad", desc: "Romaine lettuce, black beans, onions, corn and mixed shredded cheese topped with marinated grilled chicken and homemade nacho chips. Served with coriander cumin or ranch balsamic dressing.", price: 12, isNew: true, options: [pick("dressing", "Dressing", ["Coriander cumin", "Ranch balsamic"])] },
      { name: "Beef Shaker", desc: "Your typical taco flavor with a shaker twist. Lettuce, tomatoes, onions, coriander, beef, black beans, topped with nacho crisp, jalapeños, and your choice of sour cream or coriander cumin dressing.", price: 9.5, options: [pick("dressing", "Dressing", ["Sour cream", "Coriander & cumin"])] },
      { name: "Chicken Shaker", desc: "Your typical taco flavor with a shaker twist. Lettuce, tomatoes, onions, coriander, chicken, black beans, topped with nacho crisp, jalapeños and your choice of sour cream or coriander cumin dressing.", price: 9.5, options: [pick("dressing", "Dressing", ["Sour cream", "Coriander & cumin"])] },
    ]
  },
  {
    category: "Quesadillas",
    items: [
      { name: "Beef Quesadillas", desc: "4 pcs · Tortilla bread, ground beef, cheese mix, caramelized onions, green and red pepper served with sour cream and guacamole on the side.", price: 11, note: "Large: $13", options: [size("Large", 2)] },
      { name: "Chicken Quesadillas", desc: "4 pcs · Tortilla bread, marinated grilled chicken, cheese mix, caramelized onions, green and red pepper served with sour cream and guacamole on the side.", price: 11, note: "Large: $13", options: [size("Large", 2)] },
    ]
  },
  {
    category: "The Taco Bar",
    items: [
      { name: "Build Your Tacos Your Way", desc: "Beef, Chicken and Shrimp, in addition to all the toppings and sauces you know and love. Serves 15 tacos.", price: 60, note: "Delivery across all Lebanon" },
    ]
  },
  {
    category: "Dessert",
    items: [
      { name: "Churros", desc: "4 pcs of homemade churros with your choice of dark or milk premium Belgian chocolate.", price: 8.5, options: [pick("sauce", "Chocolate", ["Dark Belgian chocolate", "Milk Belgian chocolate"])] },
    ]
  },
  {
    category: "Dips & Sides",
    items: [
      { name: "Nacho chips", price: 1.65 },
      { name: "Nacho chips and guacamole", price: 4 },
      { name: "Sour cream", price: 1 },
      { name: "Ranch", price: 1 },
      { name: "Salsa (not spicy)", price: 1 },
      { name: "Sriracha mayo", price: 1 },
      { name: "Guacamole", price: 1.8 },
      { name: "Large Guacamole (220g)", price: 7 },
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
