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
const userSchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    profile: Joi.object({
      identityType: Joi.string().required(),
      identityNumber: Joi.string().required(),
      address: Joi.string().required(),
    }).required()
  });
  
  const accountSchema = Joi.object({
    userId: Joi.number().integer().required(),
    bankName: Joi.string().required(),
    bankAccountNumber: Joi.string().required(),
    balance: Joi.number().required(),
  });
  
  const transactionSchema = Joi.object({
    sourceAccountId: Joi.number().integer().required(),
    destinationAccountId: Joi.number().integer().required(),
    amount: Joi.number().positive().required(),
  });
  
  //POST untuk membuat user baru sekaligus profile user itu
  app.post('/api/v1/users', async (req, res) => {
    const { error, value } = userSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details[0].message
     });
    }
  
    try {
      const newUser = await prisma.user.create({
        data: {
          name: value.name,
          email: value.email,
          password: value.password,
          profile: {
            create: value.profile
          }
        }
      });
      res.status(201).json(newUser);
    } catch (error) {
      res.status(500).json({ error: 'Error creating user.' });
    }
  });
  
  //GET untuk tampilin semua user
  app.get('/api/v1/users', async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        include: { profile: true }
      });

      if(users.length === 0){
        return res.status(404).json({ error: 'There are no users'})
      }

      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Error retrieving users.' });
    }
  });
  
  //GET untuk tampilin user sesuai userId
  app.get('/api/v1/users/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }
  
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true }
      });
  
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
  
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Error retrieving user.' });
    }
  });
  
  //POST tambah akun ke existing user
  app.post('/api/v1/accounts', async (req, res) => {
    const { error, value } = accountSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
  
    try {
      const newAccount = await prisma.bankAccount.create({
        data: {
          bankName: value.bankName,
          bankAccountNumber: value.bankAccountNumber,
          balance: value.balance,
          user: { connect: { id: value.userId } }
        }
      });
      res.status(201).json(newAccount);
    } catch (error) {
      res.status(500).json({ error: 'Error creating bank account.' });
    }
  });
  
  //GET tampilin semua akun
  app.get('/api/v1/accounts', async (req, res) => {
    try {
      const accounts = await prisma.bankAccount.findMany();

      if(accounts.length === 0){
        return res.status(404).json({ error: 'There are no accounts'})
      }

      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: 'Error retrieving accounts.' });
    }
  });
  
  //GET tampilin akun sesuai accountId
  app.get('/api/v1/accounts/:accountId', async (req, res) => {
    const accountId = parseInt(req.params.accountId);
    if (isNaN(accountId)) {
      return res.status(400).json({ error: 'Invalid account ID.' });
    }
  
    try {
      const account = await prisma.bankAccount.findUnique({
        where: { id: accountId }
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
    const { error, value } = transactionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
  
    try {
      const transaction = await prisma.transaction.create({
        data: {
          sourceAccountId: value.sourceAccountId,
          destinationAccountId: value.destinationAccountId,
          amount: value.amount
        }
      });
  
      await prisma.bankAccount.update({
        where: { id: value.sourceAccountId },
        data: {
          balance: {
            decrement: value.amount
          }
        }
      });
  
      await prisma.bankAccount.update({
        where: { id: value.destinationAccountId },
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
      const transactions = await prisma.transaction.findMany();

      if(transactions.length === 0){
        return res.status(404).json({ error: 'There are no transactions'})
      }

      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: 'Error retrieving transactions.' });
    }
  });
  
  //GET tampilin transaksi sesuai id sekaligus data pengirim dan penerima
  app.get('/api/v1/transactions/:transactionId', async (req, res) => {
    const transactionId = parseInt(req.params.transactionId);
    if (isNaN(transactionId)) {
      return res.status(400).json({ error: 'Invalid transaction ID.' });
    }
  
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
          sourceAccount: true,
          destinationAccount: true
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