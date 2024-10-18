const express = require('express');
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');

const app = express();
const port = 3000;
const prisma = new PrismaClient();
const Joi = require('joi');
const { empty } = require('@prisma/client/runtime/library');

app.use(bodyParser.json());

//definisi semua schema validasi
const user_schema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    profile: Joi.object({
      identity_type: Joi.string().required(),
      identity_number: Joi.string().required(),
      address: Joi.string().required(),
    }).optional()
});
  
const account_schema = Joi.object({
    user_id: Joi.number().integer().required(),
    bank_name: Joi.string().required(),
    bank_account_number: Joi.string().required(),
    balance: Joi.number().required(),
});

const transaction_schema = Joi.object({
    source_account_id: Joi.number().integer().required(),
    destination_account_id: Joi.number().integer().required(),
    amount: Joi.number().positive().required(),
});

//POST untuk membuat user baru sekaligus profile user itu
app.post('/api/v1/users', async (req, res) => {
    const { error, value } = user_schema.validate(req.body);
    if (error) {
        return res.status(400).json({
        error: error.details[0].message
        });
    }


        const new_user = await prisma.users.create({
        data: {
            name: value.name,
            email: value.email,
            password: value.password,
            ...(value.profile && {
                profiles: {
                  create: value.profile
                }
              })
        }
        });
        res.status(201).json(new_user);

});

//GET untuk tampilin semua user
app.get('/api/v1/users', async (req, res) => {
    try {
        const users = await prisma.users.findMany({
            include: { profiles: true }
        });

        if(users.length === 0){
            return res.status(404).json({ error: 'There are no users'})
        }

        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error retrieving users.' });
    }
});

//GET untuk tampilin user sesuai user_id
app.get('/api/v1/users/:user_id', async (req, res) => {
const user_id = parseInt(req.params.user_id);
    if (isNaN(user_id)) {
        return res.status(400).json({ error: 'Invalid user ID.' });
    }

    try {
        const users = await prisma.users.findUnique({
            where: { id: user_id },
            include: { profiles: true }
        });

        if (!users) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error retrieving user.' });
    }
});

//POST tambah akun ke existing user
app.post('/api/v1/accounts', async (req, res) => {
    const { error, value } = account_schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const user = await prisma.users.findUnique({ where: { id: value.user_id } });
    if(!user){
        return res.status(404).json({ error: 'User not found' });
    }

    try {
        const new_account = await prisma.bank_accounts.create({
        data: {
            bank_name: value.bank_name,
            bank_account_number: value.bank_account_number,
            balance: value.balance,
            user: { connect: { id: value.user_id } }
        }
        });
        res.status(201).json(new_account);
    } catch (error) {
        res.status(500).json({ error: 'Error creating bank account.' });
    }
});

//GET tampilin semua akun
app.get('/api/v1/accounts', async (req, res) => {
    try {
        const accounts = await prisma.bank_accounts.findMany();

        if(accounts.length === 0){
        return res.status(404).json({ error: 'There are no accounts'})
        }

        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: 'Error retrieving accounts.' });
    }
});

//GET tampilin akun sesuai account_id
app.get('/api/v1/accounts/:account_id', async (req, res) => {
    const account_id = parseInt(req.params.account_id);
    if (isNaN(account_id)) {
        return res.status(400).json({ error: 'Invalid account ID.' });
    }

    try {
        const account = await prisma.bank_accounts.findUnique({
            where: { id: account_id }
        });

        if (!account) {
        return res.status(404).json({ error: 'Account not found.' });
        }

        res.json(account);
    } catch (error) {
        res.status(500).json({ error: 'Error retrieving account.' });
    }
});

//POST kirim uang dari 1 akun ke akun lain
app.post('/api/v1/transactions', async (req, res) => {
    const { error, value } = transaction_schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const sourceAccount = await prisma.bank_accounts.findUnique({ where: { id: value.source_account_id } });
    const destinationAccount = await prisma.bank_accounts.findUnique({ where: { id: value.destination_account_id } });

    if (!sourceAccount || !destinationAccount) {
        return res.status(404).json({ error: 'Source or destination account not found' });
    }

    try {
        const transaction = await prisma.transactions.create({
        data: {
            source_account_id: value.source_account_id,
            destination_account_id: value.destination_account_id,
            amount: value.amount
        }
        });

        await prisma.bank_accounts.update({
        where: { id: value.source_account_id },
        data: {
            balance: {
            decrement: value.amount
            }
        }
        });

        await prisma.bank_accounts.update({
        where: { id: value.destination_account_id },
        data: {
            balance: {
            increment: value.amount
            }
        }
        });

        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ error: 'Error creating transaction.' });
    }
});

//GET tampilin semua transaksi
app.get('/api/v1/transactions', async (req, res) => {
    try {
        const transactions = await prisma.transactions.findMany();

        if(transactions.length === 0){
        return res.status(404).json({ error: 'There are no transactions'})
        }

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Error retrieving transactions.' });
    }
});

//GET tampilin transaksi sesuai id sekaligus data pengirim dan penerima
app.get('/api/v1/transactions/:transaction_id', async (req, res) => {
    const transaction_id = parseInt(req.params.transaction_id);
    if (isNaN(transaction_id)) {
        return res.status(400).json({ error: 'Invalid transaction ID.' });
    }

    try {
        const transaction = await prisma.transactions.findUnique({
        where: { id: transaction_id },
        include: {
            source_account: true,
            destination_account: true
        }
        });

        if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found.' });
        }

        res.json(transaction);
    } catch (error) {
        res.status(500).json({ error: 'Error retrieving transaction.' });
    }
});

app.listen(port, () => {console.log(`API Server running on port ${port}`)});

//CRUD extra selain dari soal
//PUT untuk update user
app.put('/api/v1/users/:user_id', async (req, res) => {
    const { error, value } = user_schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message
      });
    }

    const user_id = parseInt(req.params.user_id);
    if (isNaN(user_id)) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }
  
    try {
      const updated_user = await prisma.users.update({
        where: { id: user_id },
        data: {
          name: value.name,
          email: value.email,
          password: value.password,
          profiles: {
            upsert: {
              update: value.profile,
              create: value.profile
            }
          }
        }
      });
      res.status(200).json(updated_user);
    } catch (error) {
      res.status(500).json({ error: 'Error updating user.' });
    }
});

//DELETE untuk hapus user
app.delete('/api/v1/users/:user_id', async (req, res) => {
    const user_id = parseInt(req.params.user_id);
    if (isNaN(user_id)) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }
  
    try {
      const deleted_user = await prisma.users.delete({
        where: { id: user_id },
      });
      res.status(200).json(deleted_user);
    } catch (error) {
      res.status(500).json({ error: 'Error deleting user.' });
    }
});

//PUT untuk update akun bank
app.put('/api/v1/accounts/:account_id', async (req, res) => {
    const account_id = parseInt(req.params.account_id);
    if (isNaN(account_id)) {
      return res.status(400).json({ error: 'Invalid account ID.' });
    }

    const { error, value } = account_schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
  
    try {
      const updated_account = await prisma.bank_accounts.update({
        where: { id: account_id },
        data: {
          bank_name: value.bank_name,
          bank_account_number: value.bank_account_number,
          balance: value.balance,
        },
      });
      res.status(200).json(updated_account);
    } catch (error) {
      res.status(500).json({ error: 'Error updating bank account.' });
    }
});

//DELETE untuk hapus akun bank
app.delete('/api/v1/accounts/:account_id', async (req, res) => {
    const account_id = parseInt(req.params.account_id);
    if (isNaN(account_id)) {
      return res.status(400).json({ error: 'Invalid account ID.' });
    }
  
    try {
      const deleted_account = await prisma.bank_accounts.delete({
        where: { id: account_id },
      });
      res.status(200).json(deleted_account);
    } catch (error) {
      res.status(500).json({ error: 'Error deleting bank account.' });
    }
});

//PUT untuk update profile user
app.put('/api/v1/profiles/:user_id', async (req, res) => {
    const user_id = parseInt(req.params.user_id);
    if (isNaN(user_id)) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }
  
    const profile_schema = Joi.object({
      identity_type: Joi.string().required(),
      identity_number: Joi.string().required(),
      address: Joi.string().required(),
    });
  
    const { error, value } = profile_schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
  
    try {
      const updated_profile = await prisma.profiles.update({
        where: { user_id },
        data: {
          identity_type: value.identity_type,
          identity_number: value.identity_number,
          address: value.address,
        },
      });
      res.status(200).json(updated_profile);
    } catch (error) {
      res.status(500).json({ error: 'Error updating profile.' });
    }
});

//DELETE untuk hapus profile user
app.delete('/api/v1/profiles/:user_id', async (req, res) => {
    const user_id = parseInt(req.params.user_id);
    if (isNaN(user_id)) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }
  
    try {
      const deleted_profile = await prisma.profiles.delete({
        where: { user_id },
      });
      res.status(200).json(deleted_profile);
    } catch (error) {
      res.status(500).json({ error: 'Error deleting profile.' });
    }
});

//Hilanngin krn hrsny gaboleh update transaksi
// // PUT untuk update transaksi
// app.put('/api/v1/transactions/:transaction_id', async (req, res) => {
//     const transaction_id = parseInt(req.params.transaction_id);
//     if (isNaN(transaction_id)) {
//       return res.status(400).json({ error: 'Invalid transaction ID.' });
//     }
  
//     const { error, value } = transaction_schema.validate(req.body);
//     if (error) {
//       return res.status(400).json({ error: error.details[0].message });
//     }
  
//     try {
//       const updated_transaction = await prisma.transactions.update({
//         where: { id: transaction_id },
//         data: {
//           amount: value.amount,
//           source_account_id: value.source_account_id,
//           destination_account_id: value.destination_account_id,
//         },
//       });
//       res.status(200).json(updated_transaction);
//     } catch (error) {
//       res.status(500).json({ error: 'Error updating transaction.' });
//     }
// });

// // DELETE untuk hapus transaksi
// app.delete('/api/v1/transactions/:transaction_id', async (req, res) => {
//     const transaction_id = parseInt(req.params.transaction_id);
//     if (isNaN(transaction_id)) {
//       return res.status(400).json({ error: 'Invalid transaction ID.' });
//     }
  
//     try {
//       const deleted_transaction = await prisma.transactions.delete({
//         where: { id: transaction_id },
//       });
//       res.status(200).json(deleted_transaction);
//     } catch (error) {
//       res.status(500).json({ error: 'Error deleting transaction.' });
//     }
// });