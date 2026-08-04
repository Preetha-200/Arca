/**
 * Static product catalog for ARCA Interior Design.
 * Structured for easy migration to Firestore:
 *   - Each object maps 1:1 to a Firestore document
 *   - IDs are strings so Firestore doc IDs can replace them without refactoring
 *   - `createdAt` is ISO string so it converts cleanly to Firestore Timestamps
 */
export const products = [
  // ─── LIVING ROOM ───────────────────────────────────────────────────────────
  {
    id: "lr-001",
    category: "living-room",
    roomType: "Living Room",
    title: "Contemporary Living Suite",
    size: "18x16 feet",
    price: 285000,
    material: "Teak Wood",
    description:
      "A spacious contemporary living room design featuring clean lines, neutral tones and premium teak wood furniture. Perfect for families who love open, airy spaces.",
    image: "/livingRoom.png",
    popular: true,
    createdAt: "2024-01-15T00:00:00.000Z",
  },
  {
    id: "lr-002",
    category: "living-room",
    roomType: "Living Room",
    title: "Minimal Lounge Design",
    size: "14x12 feet",
    price: 195000,
    material: "Plywood",
    description:
      "A minimalist lounge design that maximises space without compromising comfort. Neutral palette with carefully selected accent pieces.",
    image: "/livingRoom.png",
    popular: false,
    createdAt: "2024-02-20T00:00:00.000Z",
  },
  {
    id: "lr-003",
    category: "living-room",
    roomType: "Living Room",
    title: "Classic Heritage Parlour",
    size: "20x18 feet",
    price: 420000,
    material: "Sheesham Wood",
    description:
      "A classic heritage-inspired living room with rich Sheesham wood furniture, ornate detailing and warm ambient lighting.",
    image: "/livingRoom.png",
    popular: true,
    createdAt: "2024-03-10T00:00:00.000Z",
  },

  // ─── KITCHEN ───────────────────────────────────────────────────────────────
  {
    id: "kt-001",
    category: "kitchen",
    roomType: "Kitchen",
    title: "Modern Modular Kitchen",
    size: "12x10 feet",
    price: 320000,
    material: "MDF with Laminate",
    description:
      "A fully modular kitchen design with soft-close shutters, pull-out drawers and stainless steel countertops. Optimised for Indian cooking.",
    image: "/kitchen.png",
    popular: true,
    createdAt: "2024-01-25T00:00:00.000Z",
  },
  {
    id: "kt-002",
    category: "kitchen",
    roomType: "Kitchen",
    title: "Open Concept Kitchen",
    size: "14x12 feet",
    price: 275000,
    material: "Plywood with PU Finish",
    description:
      "An open-concept kitchen that flows seamlessly into the dining area. Waterfall island, pendant lighting and warm wood tones.",
    image: "/kitchen.png",
    popular: false,
    createdAt: "2024-04-05T00:00:00.000Z",
  },
  {
    id: "kt-003",
    category: "kitchen",
    roomType: "Kitchen",
    title: "Compact Smart Kitchen",
    size: "10x8 feet",
    price: 165000,
    material: "MDF with Acrylic",
    description:
      "Space-efficient kitchen design for compact apartments. High-gloss acrylic shutters, built-in appliances and clever storage solutions.",
    image: "/kitchen.png",
    popular: false,
    createdAt: "2024-05-12T00:00:00.000Z",
  },

  // ─── DINING ROOM ──────────────────────────────────────────────────────────
  {
    id: "dr-001",
    category: "dining-room",
    roomType: "Dining Room",
    title: "Royal Dining Setup",
    size: "16x14 feet",
    price: 245000,
    material: "Solid Teak",
    description:
      "A regal dining room design centred around a solid teak 8-seater table with upholstered chairs and a statement chandelier.",
    image: "/dining.png",
    popular: true,
    createdAt: "2024-02-14T00:00:00.000Z",
  },
  {
    id: "dr-002",
    category: "dining-room",
    roomType: "Dining Room",
    title: "Scandinavian Dining Area",
    size: "12x10 feet",
    price: 155000,
    material: "Ash Wood",
    description:
      "Clean Scandinavian aesthetics with an ash wood table, cane-back chairs and minimal decor. Light, bright and effortlessly elegant.",
    image: "/dining.png",
    popular: false,
    createdAt: "2024-06-01T00:00:00.000Z",
  },

  // ─── HOME OFFICE ──────────────────────────────────────────────────────────
  {
    id: "ho-001",
    category: "home-office",
    roomType: "Home Office",
    title: "Modern Home Office Design",
    size: "12x10 feet",
    price: 185000,
    material: "Plywood with Veneer",
    description:
      "A productivity-focused home office with a large L-shaped desk, integrated cable management, bookshelf wall and ergonomic layout.",
    image: "/homeOffice.png",
    popular: true,
    createdAt: "2024-01-10T00:00:00.000Z",
  },
  {
    id: "ho-002",
    category: "home-office",
    roomType: "Home Office",
    title: "Minimal Workspace Setup",
    size: "10x8 feet",
    price: 125000,
    material: "MDF",
    description:
      "A minimalist workspace designed to maximise focus. Floating desk, hidden storage and neutral tones to reduce visual clutter.",
    image: "/homeOffice.png",
    popular: false,
    createdAt: "2024-03-22T00:00:00.000Z",
  },
  {
    id: "ho-003",
    category: "home-office",
    roomType: "Home Office",
    title: "Executive Study Room",
    size: "14x12 feet",
    price: 265000,
    material: "Walnut Wood",
    description:
      "A sophisticated executive study with a full-wall bookcase, partner's desk in walnut finish and rich leather seating.",
    image: "/homeOffice.png",
    popular: true,
    createdAt: "2024-04-18T00:00:00.000Z",
  },

  // ─── BEDROOM ──────────────────────────────────────────────────────────────
  {
    id: "br-001",
    category: "bedroom",
    roomType: "Bedroom",
    title: "Luxe Master Bedroom",
    size: "16x14 feet",
    price: 355000,
    material: "Solid Teak",
    description:
      "A luxury master bedroom design with an upholstered king bed, floor-to-ceiling wardrobe, and warm layered lighting.",
    image: "/bedroom.png",
    popular: true,
    createdAt: "2024-01-30T00:00:00.000Z",
  },
  {
    id: "br-002",
    category: "bedroom",
    roomType: "Bedroom",
    title: "Cosy Compact Bedroom",
    size: "10x9 feet",
    price: 145000,
    material: "MDF with Laminate",
    description:
      "A compact bedroom that feels spacious through smart layout, under-bed storage, and a wall-mounted study unit.",
    image: "/bedroom.png",
    popular: false,
    createdAt: "2024-05-08T00:00:00.000Z",
  },
  {
    id: "br-003",
    category: "bedroom",
    roomType: "Bedroom",
    title: "Boho Chic Bedroom",
    size: "14x12 feet",
    price: 215000,
    material: "Mango Wood",
    description:
      "A bohemian-inspired bedroom with mango wood furniture, rattan accents, lush textiles and warm Edison lighting.",
    image: "/bedroom.png",
    popular: false,
    createdAt: "2024-06-15T00:00:00.000Z",
  },

  // ─── BATHROOM ─────────────────────────────────────────────────────────────
  {
    id: "bt-001",
    category: "bathroom",
    roomType: "Bathroom",
    title: "Spa Luxury Bathroom",
    size: "10x8 feet",
    price: 295000,
    material: "Marble",
    description:
      "A spa-inspired bathroom featuring Carrara marble, freestanding bathtub, rain shower and warm brass fixtures.",
    image: "/bathroom.png",
    popular: true,
    createdAt: "2024-02-28T00:00:00.000Z",
  },
  {
    id: "bt-002",
    category: "bathroom",
    roomType: "Bathroom",
    title: "Contemporary Wet Room",
    size: "8x7 feet",
    price: 185000,
    material: "Porcelain Tiles",
    description:
      "A modern wet-room design with large-format porcelain tiles, frameless glass enclosure and floating vanity.",
    image: "/bathroom.png",
    popular: false,
    createdAt: "2024-04-22T00:00:00.000Z",
  },
  {
    id: "bt-003",
    category: "bathroom",
    roomType: "Bathroom",
    title: "Compact Master Bath",
    size: "7x6 feet",
    price: 135000,
    material: "Vitrified Tiles",
    description:
      "Space-optimised master bathroom with wall-hung fixtures, recessed shelving and backlit mirror for a premium feel.",
    image: "/bathroom.png",
    popular: false,
    createdAt: "2024-07-01T00:00:00.000Z",
  },
];

/**
 * Helper to get all unique categories from the product list.
 * Mirrors what a Firestore query on the `category` field would return.
 */
export const getCategories = () => [
  ...new Set(products.map((p) => p.category)),
];

/**
 * Helper to get all unique materials.
 */
export const getMaterials = () => [
  ...new Set(products.map((p) => p.material)),
];

/**
 * Helper to get products by category.
 * Signature matches what a Firestore `where("category", "==", cat)` call would return.
 */
export const getProductsByCategory = (category) =>
  products.filter((p) => p.category === category);

/**
 * Helper to get a single product by id.
 * Signature mirrors a Firestore `getDoc(doc(db, "products", id))`.
 */
export const getProductById = (id) => products.find((p) => p.id === id);