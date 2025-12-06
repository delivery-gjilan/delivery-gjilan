import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
  pgEnum,
  doublePrecision,
  jsonb,
  integer,
  uuid,
} from "drizzle-orm/pg-core";

export const businessType = pgEnum("business_type", ["MARKET", "PHARMACY", "RESTAURANT"]);

export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),

  name: varchar("name", { length: 255 }).notNull(),
  imageUrl: varchar("image_url", { length: 500 }),

  businessType: businessType("business_type").notNull(),

  isActive: boolean("is_active").default(true),

  locationLat: doublePrecision("location_lat").notNull(),
  locationLng: doublePrecision("location_lng").notNull(),
  locationAddress: varchar("location_address", { length: 500 }).notNull(),
    // open and close tell the time in minutes from midnight: Ex: 60 means 01:00
  open: integer("open").notNull(),
  close: integer("close").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
});
