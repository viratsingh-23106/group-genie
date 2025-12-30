/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

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

// MTProto requires complex cryptographic operations that are not fully
// supported in edge function environments. For production Telegram group
// creation, you need one of these alternatives:
// 
// 1. Use a dedicated Node.js server with GramJS
// 2. Use Telegram Bot API (limited - bots can't create groups)
// 3. Use a hosted MTProto service/proxy

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiId = Deno.env.get('TELEGRAM_API_ID');
    const apiHash = Deno.env.get('TELEGRAM_API_HASH');

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
    console.log('API ID configured:', !!apiId);
    console.log('API Hash configured:', !!apiHash);

    // Due to MTProto limitations in edge functions, we need to inform the user
    // about the technical constraints
    
    if (body.action === 'send_code') {
      const { phoneNumber } = body;
      console.log('Phone number received:', phoneNumber);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'MTProto-based Telegram authentication requires a dedicated Node.js server. Edge functions do not support the full cryptographic operations needed. Consider deploying a separate backend service for GramJS.',
          suggestion: 'For immediate group creation, use Telegram Desktop or Mobile app. For automated group creation, a dedicated Node.js server with GramJS is required.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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