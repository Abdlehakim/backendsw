if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

import Product from './models/stock/Product';
import '@/db';

const updateProductsWithReviews = async () => {
  try {
    const result = await Product.updateMany({}, { $set: { reviews: [] } });
    console.log(`Updated ${result.modifiedCount} products with the new 'reviews' field.`);
  } catch (error) {
    console.error('Error updating products:', error);
  }
};

updateProductsWithReviews();
