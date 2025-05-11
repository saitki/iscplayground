import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  date: { type: Date, default: Date.now }
});

export const MongoMessage = mongoose.model('Message', messageSchema);
