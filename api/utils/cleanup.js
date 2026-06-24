require('dotenv').config();
const mongoose = require('mongoose');

async function cleanup() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB conectado.');

  const result = await mongoose.connection.collection('users').updateMany(
    {},
    { $unset: { address: '', birthDate: '' } }
  );

  console.log(`✔ ${result.modifiedCount} documento(s) limpos (address e birthDate removidos).`);
  await mongoose.disconnect();
  console.log('Conexão encerrada.');
}

cleanup().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
