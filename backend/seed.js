const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Brand = require('./models/Brand');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Order = require('./models/Order');
const User = require('./models/User');

dotenv.config();

const categoriesData = [
  {
    name: 'Fountain Pens',
    description: 'Precision writing instruments crafted with gold and steel nibs.',
    icon: 'create-outline',
  },
  {
    name: 'Inks',
    description: 'Bottled fountain pen inks in archival, shading, and sheen finishes.',
    icon: 'water-outline',
  },
  {
    name: 'Paper',
    description: 'Smooth satin and acid-free fountain pen friendly paper and notebooks.',
    icon: 'book-outline',
  },
];

const brandsData = [
  {
    name: 'Platinum',
    origin: 'Japan',
    description: 'Japanese maker known for 14k gold nibs and airtight Slip & Seal caps.',
  },
  {
    name: 'Visconti',
    origin: 'Italy',
    description: 'Florentine writing instrument studio celebrated for acrylic resins.',
  },
  {
    name: 'Pelikan',
    origin: 'Germany',
    description: 'Historic German manufacturer of piston-fill pens and Edelstein inks.',
  },
  {
    name: 'Lamy',
    origin: 'Germany',
    description: 'Heidelberg studio known for modern industrial fountain pen design.',
  },
  {
    name: 'Ferris Wheel Press',
    origin: 'Canada',
    description: 'Stationery studio making saturated inks in rounded glass bottles.',
  },
  {
    name: 'Montblanc',
    origin: 'Germany',
    description: 'Fine writing maker famous for dark formal inks and flagship pens.',
  },
  {
    name: 'Clairefontaine',
    origin: 'France',
    description: 'French heritage paper mill producing smooth 90gsm brushed vellum paper.',
  },
  {
    name: 'Rhodia',
    origin: 'France',
    description: 'French stationery brand known for crisp ivory notebooks with minimal ghosting.',
  },
  {
    name: 'Midori',
    origin: 'Japan',
    description: 'Minimalist Japanese maker crafting thread-bound MD paper notebooks.',
  },
  {
    name: 'Tomoe',
    origin: 'Japan',
    description: 'Specialty paper mill prized for lightweight coated sheets that highlight sheen.',
  },
];

const productsData = [
  {
    name: 'Platinum Century 3776 Bourgogne',
    brand: 'Platinum',
    category: 'Fountain Pens',
    price: 10500,
    stock: 14,
    description: 'Translucent wine-red resin fountain pen with a 14k gold nib and Slip & Seal cap mechanism that prevents ink evaporation.',
    images: [
      'https://res.cloudinary.com/dgqsfys8/image/upload/v1794758430/saturation_point_mobile/platinum_century_3776_bourgogne_1.jpg',
      'https://res.cloudinary.com/dgqsfys8/image/upload/v1794758432/saturation_point_mobile/platinum_century_3776_bourgogne_2.jpg',
    ],
  },
  {
    name: 'Visconti Rembrandt-S Dark Forest',
    brand: 'Visconti',
    category: 'Fountain Pens',
    price: 12800,
    stock: 9,
    description: 'Italian writing instrument in swirled dark green acrylic resin with a magnetic cap closure and ruthenium trim.',
    images: [
      'https://res.cloudinary.com/dgqsfys8/image/upload/v1794758433/saturation_point_mobile/visconti_rembrandt_dark_forest_1.jpg',
      'https://res.cloudinary.com/dgqsfys8/image/upload/v1794758434/saturation_point_mobile/visconti_rembrandt_dark_forest_2.jpg',
    ],
  },
  {
    name: 'Pelikan Classic M200 Golden Beryl',
    brand: 'Pelikan',
    category: 'Fountain Pens',
    price: 9800,
    stock: 11,
    description: 'German piston-fill fountain pen with a warm golden quartz barrel and smooth gold-plated steel nib.',
    images: [
      'https://res.cloudinary.com/dgqsfys8/image/upload/v1794758434/saturation_point_mobile/pelikan_m200_golden_beryl_1.jpg',
    ],
  },
  {
    name: 'Lamy Studio Brushed Stainless Steel',
    brand: 'Lamy',
    category: 'Fountain Pens',
    price: 4950,
    stock: 18,
    description: 'Brushed stainless steel barrel paired with a rubberized grip section, interchangeable steel nib, and twisted clip.',
    images: [
      'https://res.cloudinary.com/dgqsfys8/image/upload/v1794758435/saturation_point_mobile/lamy_studio_brushed_steel_1.jpg',
    ],
  },
  {
    name: 'Ferris Wheel Press Buttered Popcorn 38ml',
    brand: 'Ferris Wheel Press',
    category: 'Inks',
    price: 1450,
    stock: 32,
    description: 'Warm golden-amber fountain pen ink with natural shading, bottled in a 38ml glass flacon with a brass cap.',
    images: [
      'https://res.cloudinary.com/dgqsfys8/image/upload/v1794758436/saturation_point_mobile/fwp_buttered_popcorn_bottle_1.jpg',
      'https://res.cloudinary.com/dgqsfys8/image/upload/v1794758437/saturation_point_mobile/fwp_buttered_popcorn_swatch_2.jpg',
    ],
  },
  {
    name: 'Ferris Wheel Press Roaring Patina Black 38ml',
    brand: 'Ferris Wheel Press',
    category: 'Inks',
    price: 1650,
    stock: 24,
    description: 'Deep matte black fountain pen ink with fine gold shimmer, balanced for medium and broad nibs.',
    images: [
      'https://res.cloudinary.com/dgqsfys8/image/upload/v1794758438/saturation_point_mobile/fwp_roaring_patina_black_1.jpg',
    ],
  },
  {
    name: 'Montblanc Mystery Black Ink Bottle 60ml',
    brand: 'Montblanc',
    category: 'Inks',
    price: 2600,
    stock: 16,
    description: 'Rich black daily writing ink in an angled German shoe bottle designed for filling even when ink levels run low.',
    images: [
      'https://res.cloudinary.com/dgqsfys8/image/upload/v1794758439/saturation_point_mobile/montblanc_mystery_black_bottle_1.jpg',
      'https://res.cloudinary.com/dgqsfys8/image/upload/v1794758440/saturation_point_mobile/montblanc_mystery_black_swatch_2.jpg',
    ],
  },
  {
    name: 'Pelikan Edelstein Moonstone 50ml',
    brand: 'Pelikan',
    category: 'Inks',
    price: 2100,
    stock: 20,
    description: 'Cool slate-grey fountain pen ink formulated with gentle lubricants for consistent flow on coated papers.',
    images: [
      'https://res.cloudinary.com/dgqsfys8/image/upload/v1794758441/saturation_point_mobile/pelikan_edelstein_moonstone_bottle_1.jpg',
      'https://res.cloudinary.com/dgqsfys8/image/upload/v1794758442/saturation_point_mobile/pelikan_edelstein_moonstone_swatch_2.jpg',
    ],
  },
  {
    name: 'Clairefontaine Triomphe A5 Writing Pad Blank',
    brand: 'Clairefontaine',
    category: 'Paper',
    price: 680,
    stock: 45,
    description: '50-sheet A5 correspondence pad featuring smooth 90gsm brushed vellum paper with zero feathering or bleedthrough.',
    images: [
      'https://res.cloudinary.com/dgqsfys8/image/upload/v1794756494/saturation_point_mobile/clairefontaine_triomphe_pad.jpg',
    ],
  },
  {
    name: 'Rhodia Heritage Bookcloth Notebook A5',
    brand: 'Rhodia',
    category: 'Paper',
    price: 1250,
    stock: 26,
    description: 'Hardbound bookcloth notebook with 90gsm ivory vellum sheets suited for fountain pens and studio sketches.',
    images: [
      'https://res.cloudinary.com/dgqsfys8/image/upload/v1794756495/saturation_point_mobile/rhodia_heritage_notebook.jpg',
    ],
  },
  {
    name: 'Midori MD Paper Journal Frame A5',
    brand: 'Midori',
    category: 'Paper',
    price: 1100,
    stock: 28,
    description: 'Thread-bound lay-flat notebook made with cream Japanese MD paper for crisp fine-nib feedback.',
    images: [
      'https://res.cloudinary.com/dgqsfys8/image/upload/v1794756497/saturation_point_mobile/midori_md_journal.jpg',
    ],
  },
  {
    name: 'Tomoe River Sanzen 68gsm Loose Leaf 100 Sheets',
    brand: 'Tomoe',
    category: 'Paper',
    price: 850,
    stock: 48,
    description: '100 loose A4 sheets of 68gsm Japanese paper engineered to showcase shading and metallic ink sheen.',
    images: [
      'https://res.cloudinary.com/dgqsfys8/image/upload/v1794756499/saturation_point_mobile/tomoe_river_sheets.jpg',
    ],
  },
];

const ensureUser = async ({ email, username, displayName, role, passwordPlain, photoURL }) => {
  let user = await User.findOne({ email });
  if (!user) {
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash(passwordPlain, salt);
    user = await User.create({
      email,
      username,
      displayName,
      password,
      role,
      photoURL: photoURL || '',
      status: 'active',
    });
  }
  return user;
};

const runSeed = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required in backend/.env');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  for (const cat of categoriesData) {
    await Category.updateOne({ name: cat.name }, { $setOnInsert: cat }, { upsert: true });
  }

  for (const brand of brandsData) {
    await Brand.updateOne({ name: brand.name }, { $setOnInsert: brand }, { upsert: true });
  }

  const adminUser = await ensureUser({
    email: process.env.SEED_ADMIN_EMAIL || 'admin@saturationpoint.ph',
    username: 'store_admin',
    displayName: 'Store Admin',
    role: 'admin',
    passwordPlain: process.env.SEED_ADMIN_PASSWORD || 'SatPointAdmin!2026',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  });

  const customerUser = await ensureUser({
    email: process.env.SEED_CUSTOMER_EMAIL || 'customer@saturationpoint.ph',
    username: 'demo_customer',
    displayName: 'Elena Santos',
    role: 'user',
    passwordPlain: process.env.SEED_CUSTOMER_PASSWORD || 'SatPointUser!2026',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  });

  const seededProducts = [];
  for (const item of productsData) {
    let product = await Product.findOne({ name: item.name });
    if (!product) {
      product = await Product.create({
        ...item,
        reviews: [
          {
            user: customerUser._id,
            name: customerUser.displayName,
            rating: 5,
            comment: 'Writes smoothly out of the box with balanced ink flow.',
          },
        ],
        rating: 5,
        numReviews: 1,
      });
    }
    seededProducts.push(product);
  }

  const existingOrder = await Order.findOne({ user: customerUser._id });
  if (!existingOrder && seededProducts.length >= 2) {
    const first = seededProducts[0];
    const second = seededProducts[4];
    await Order.create({
      user: customerUser._id,
      orderItems: [
        {
          product: first._id,
          name: first.name,
          price: first.price,
          quantity: 1,
          image: first.images[0] || '',
        },
        {
          product: second._id,
          name: second.name,
          price: second.price,
          quantity: 1,
          image: second.images[0] || '',
        },
      ],
      totalAmount: first.price + second.price,
      paymentMethod: 'Cash on Delivery',
      shippingAddress: {
        street: '142 Mabini Street',
        city: 'Taguig City',
        postalCode: '1630',
        country: 'Philippines',
      },
      status: 'delivered',
      deliveredAt: new Date(),
    });
  }

  const counts = {
    categories: await Category.countDocuments(),
    brands: await Brand.countDocuments(),
    products: await Product.countDocuments(),
    users: await User.countDocuments(),
    orders: await Order.countDocuments(),
    adminEmail: adminUser.email,
    customerEmail: customerUser.email,
  };

  console.log('SEED_COMPLETE:', JSON.stringify(counts));
  await mongoose.disconnect();
};

runSeed().catch(async (error) => {
  console.error('SEED_ERROR:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
