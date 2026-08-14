require('dotenv').config();
require('mongoose').connect(process.env.MONGO_URI).then(() => {
  const LabOrder = require('./models/LabOrder');
  const Bill = require('./models/Bill');
  Promise.all([LabOrder.find({}), Bill.find({})]).then(([labs, bills]) => {
    console.log('LABS:', JSON.stringify(labs, null, 2));
    console.log('BILLS:', JSON.stringify(bills, null, 2));
    process.exit(0);
  });
});
