const mongoose = require('mongoose');
mongoose.connect('mongodb://klubnikabytes_db_user:ezsCQHeQM65DbAjh@ac-hinltbk-shard-00-00.i19r3cb.mongodb.net:27017,ac-hinltbk-shard-00-01.i19r3cb.mongodb.net:27017,ac-hinltbk-shard-00-02.i19r3cb.mongodb.net:27017/?authSource=admin&replicaSet=atlas-yd62zy-shard-0&ssl=true&appName=Cluster0').then(async () => {
  const Appointment = require('./models/Appointment');
  await Appointment.updateMany({ service: { $in: ['CBC', 'Blood Test'] } }, { $set: { serviceType: 'Lab' } });
  console.log('Updated DB');
  process.exit();
});
