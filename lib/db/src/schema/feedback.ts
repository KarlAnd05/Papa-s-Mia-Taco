import { pgTable, serial, text, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";

export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),

  // Client info
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  visitDate: text("visit_date"),
  itemsOrdered: text("items_ordered"),

  // Ratings (1–5)
  ratingFood: integer("rating_food").notNull(),
  ratingService: integer("rating_service").notNull(),
  ratingAtmosphere: integer("rating_atmosphere").notNull(),
  ratingValue: integer("rating_value").notNull(),
  ratingOverall: integer("rating_overall").notNull(),

  // Qualitative
  wouldRecommend: boolean("would_recommend"),
  comments: text("comments"),
  improvements: text("improvements"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
