import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  unit: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
  price: { type: Number, required: true, min: 0 },
  purchasePrice: { type: Number, required: true },
  unitConversion: { type: Number, default: null },
  isBaseUnit: {
    type: Boolean,
    default: function () {
      return this.unit === 'زجاجة';
    },
  },
  barcode: { type: String, required: true, unique: true },
  expiryDate: { type: Date, required: true },

  // This field will be auto-calculated
  isShortcoming: { type: Boolean, default: false },
});


const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export default Product;
