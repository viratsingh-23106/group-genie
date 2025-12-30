/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

// @ts-nocheck - GramJS types are complex, using runtime validation
import { Api, TelegramClient } from "https://esm.sh/telegram@2.22.2";
import { StringSession } from "https://esm.sh/telegram@2.22.2/sessions";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendCodeRequest {
  action: 'send_code';
  phoneNumber: string;
}

interface VerifyCodeRequest {
  action: 'verify_code';
  phoneNumber: string;
  phoneCodeHash: string;
  code: string;
}

interface CreateGroupRequest {
  action: 'create_group';
  sessionString: string;
  groupName: string;
  mobileNumbers: string[];
  groupImageBase64?: string;
}

type RequestBody = SendCodeRequest | VerifyCodeRequest | CreateGroupRequest;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiId = parseInt(Deno.env.get('TELEGRAM_API_ID') || '0');
    const apiHash = Deno.env.get('TELEGRAM_API_HASH') || '';

    if (!apiId || !apiHash) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Telegram API credentials not configured' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RequestBody = await req.json();
    console.log('Request action:', body.action);

    // Step 1: Send verification code
    if (body.action === 'send_code') {
      const { phoneNumber } = body;
      console.log('Sending code to:', phoneNumber);

      const stringSession = new StringSession('');
      const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
      });

      await client.connect();

      const result = await client.invoke(
        new Api.auth.SendCode({
          phoneNumber: phoneNumber,
          apiId: apiId,
          apiHash: apiHash,
          settings: new Api.CodeSettings({
            allowFlashcall: false,
            currentNumber: true,
            allowAppHash: true,
          }),
        })
      );

      console.log('Code sent successfully');
      await client.disconnect();

      return new Response(
        JSON.stringify({ 
          success: true, 
          phoneCodeHash: (result as any).phoneCodeHash,
          message: 'Verification code sent to your phone'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Verify code and get session
    if (body.action === 'verify_code') {
      const { phoneNumber, phoneCodeHash, code } = body;
      console.log('Verifying code for:', phoneNumber);

      const stringSession = new StringSession('');
      const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
      });

      await client.connect();

      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: phoneNumber,
          phoneCodeHash: phoneCodeHash,
          phoneCode: code,
        })
      );

      const sessionString = (client.session as any).save();
      console.log('User authenticated successfully');
      await client.disconnect();

      return new Response(
        JSON.stringify({ 
          success: true, 
          sessionString: sessionString,
          message: 'Authentication successful'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Create group
    if (body.action === 'create_group') {
      const { sessionString, groupName, mobileNumbers } = body;
      console.log('Creating group:', groupName, 'with', mobileNumbers.length, 'members');

      const session = new StringSession(sessionString);
      const client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 5,
      });

      await client.connect();

      // Resolve users by phone numbers
      const users: any[] = [];
      for (const phone of mobileNumbers) {
        try {
          const result = await client.invoke(
            new Api.contacts.ImportContacts({
              contacts: [
                new Api.InputPhoneContact({
                  clientId: BigInt(Math.floor(Math.random() * 1000000)) as any,
                  phone: phone,
                  firstName: 'User',
                  lastName: phone.slice(-4),
                }),
              ],
            })
          );

          if (result.users && result.users.length > 0) {
            const user = result.users[0] as any;
            users.push(
              new Api.InputUser({
                userId: user.id,
                accessHash: user.accessHash || BigInt(0) as any,
              })
            );
            console.log('Found user for phone:', phone);
          }
        } catch (e) {
          console.log('Could not find user for phone:', phone);
        }
      }

      if (users.length === 0) {
        await client.disconnect();
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No valid Telegram users found for the provided phone numbers'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create the group
      await client.invoke(
        new Api.messages.CreateChat({
          users: users,
          title: groupName,
        })
      );

      console.log('Group created successfully');
      await client.disconnect();

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Group "${groupName}" created with ${users.length} members!`,
          membersAdded: users.length,
          totalRequested: mobileNumbers.length
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});