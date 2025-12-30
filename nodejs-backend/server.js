require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;

// Store active clients for session management
const activeClients = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Step 1: Send verification code
app.post('/api/send-code', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    
    console.log('Sending code to:', cleanPhone);

    const stringSession = new StringSession('');
    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });

    await client.connect();

    const result = await client.invoke(
      new Api.auth.SendCode({
        phoneNumber: cleanPhone,
        apiId: apiId,
        apiHash: apiHash,
        settings: new Api.CodeSettings({
          allowFlashcall: false,
          currentNumber: true,
          allowAppHash: true,
        }),
      })
    );

    // Store client for later use
    const clientId = `${cleanPhone}_${Date.now()}`;
    activeClients.set(clientId, { client, phoneNumber: cleanPhone });

    // Clean up old clients after 10 minutes
    setTimeout(() => {
      if (activeClients.has(clientId)) {
        activeClients.get(clientId).client.disconnect();
        activeClients.delete(clientId);
      }
    }, 10 * 60 * 1000);

    console.log('Code sent successfully');

    res.json({
      success: true,
      phoneCodeHash: result.phoneCodeHash,
      clientId: clientId,
      message: 'Verification code sent to your phone'
    });

  } catch (error) {
    console.error('Error sending code:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send verification code'
    });
  }
});

// Step 2: Verify code and get session
app.post('/api/verify-code', async (req, res) => {
  try {
    const { phoneNumber, phoneCodeHash, code, clientId } = req.body;
    const cleanPhone = phoneNumber.replace(/\s/g, '');

    console.log('Verifying code for:', cleanPhone);

    let client;
    
    // Try to use existing client
    if (clientId && activeClients.has(clientId)) {
      client = activeClients.get(clientId).client;
    } else {
      // Create new client if needed
      const stringSession = new StringSession('');
      client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
      });
      await client.connect();
    }

    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: cleanPhone,
        phoneCodeHash: phoneCodeHash,
        phoneCode: code,
      })
    );

    const sessionString = client.session.save();
    console.log('User authenticated successfully');

    // Clean up client from active clients
    if (clientId && activeClients.has(clientId)) {
      activeClients.delete(clientId);
    }

    res.json({
      success: true,
      sessionString: sessionString,
      message: 'Authentication successful'
    });

  } catch (error) {
    console.error('Error verifying code:', error);
    
    // Handle 2FA password requirement
    if (error.message && error.message.includes('SESSION_PASSWORD_NEEDED')) {
      res.status(400).json({
        success: false,
        error: 'Two-factor authentication is enabled. Please disable 2FA temporarily or provide password.',
        requiresPassword: true
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify code'
    });
  }
});

// Step 3: Create group
app.post('/api/create-group', async (req, res) => {
  try {
    const { sessionString, groupName, mobileNumbers } = req.body;

    console.log('Creating group:', groupName, 'with', mobileNumbers.length, 'members');

    const session = new StringSession(sessionString);
    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
    });

    await client.connect();

    // Resolve users by phone numbers
    const users = [];
    const failedNumbers = [];

    for (const phone of mobileNumbers) {
      const cleanPhone = phone.replace(/\s/g, '');
      try {
        const result = await client.invoke(
          new Api.contacts.ImportContacts({
            contacts: [
              new Api.InputPhoneContact({
                clientId: BigInt(Math.floor(Math.random() * 1000000)),
                phone: cleanPhone,
                firstName: 'User',
                lastName: cleanPhone.slice(-4),
              }),
            ],
          })
        );

        if (result.users && result.users.length > 0) {
          const user = result.users[0];
          if (user.id && user.accessHash) {
            users.push(
              new Api.InputUser({
                userId: user.id,
                accessHash: user.accessHash,
              })
            );
            console.log('Found user for phone:', cleanPhone);
          } else {
            failedNumbers.push(cleanPhone);
          }
        } else {
          failedNumbers.push(cleanPhone);
        }
      } catch (e) {
        console.log('Could not find user for phone:', cleanPhone, e.message);
        failedNumbers.push(cleanPhone);
      }
    }

    if (users.length === 0) {
      await client.disconnect();
      res.status(400).json({
        success: false,
        error: 'No valid Telegram users found for the provided phone numbers',
        failedNumbers: failedNumbers
      });
      return;
    }

    // Create the group
    const createResult = await client.invoke(
      new Api.messages.CreateChat({
        users: users,
        title: groupName,
      })
    );

    console.log('Group created successfully with', users.length, 'members');

    await client.disconnect();

    res.json({
      success: true,
      message: `Group "${groupName}" created successfully!`,
      membersAdded: users.length,
      totalRequested: mobileNumbers.length,
      failedNumbers: failedNumbers.length > 0 ? failedNumbers : undefined
    });

  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create group'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Telegram Group Creator API running on port ${PORT}`);
  console.log(`API ID configured: ${!!apiId}`);
  console.log(`API Hash configured: ${!!apiHash}`);
});