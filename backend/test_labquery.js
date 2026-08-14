require('dotenv').config();
require('mongoose').connect(process.env.MONGO_URI).then(() => {
  const LabOrder = require('./models/LabOrder');
  const start = new Date('2026-08-14');
  start.setHours(0, 0, 0, 0);
  const end = new Date('2026-08-14');
  end.setHours(23, 59, 59, 999);
  
  const labQuery = {
    billStatus: { $in: ['Partial', 'Paid'] },
    $or: [
      { billDate: { $gte: start, $lte: end } },
      { orderedDate: { $gte: start, $lte: end } }
    ]
  };
  console.log("start:", start.toISOString());
  console.log("end:", end.toISOString());
  console.log(JSON.stringify(labQuery, null, 2));
  LabOrder.find(labQuery).then(labs => {
    console.log('LABS:', JSON.stringify(labs, null, 2));
    process.exit(0);
  });
});
