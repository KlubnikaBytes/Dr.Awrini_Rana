const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/healthplis')
  .then(async () => {
    try {
      await mongoose.connection.collection('staffs').dropIndex('email_1');
      console.log('Dropped email_1 index');
    } catch (e) {
      console.log('Index might not exist', e.message);
    }
    process.exit(0);
  });
