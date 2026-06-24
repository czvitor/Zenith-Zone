require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const User     = require('../models/User');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB conectado.');

  const exists = await User.findOne({ username: 'czvitor' });

  if (!exists) {
    await User.create({
      firstName: 'Vitor',
      lastName:  'Sousa',
      username:  'czvitor',
      email:     'vitord_sousa@hotmail.com',
      password:  'Vitor@1969',
      role:      'admin',
    });
    console.log('✔ Admin czvitor criado com sucesso.');
  } else {
    console.log('→ Admin czvitor já existe, nada a fazer.');
  }

  await mongoose.disconnect();
  console.log('Conexão encerrada.');
}

seed().catch(err => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
