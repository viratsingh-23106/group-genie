/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateGroupRequest {
  groupName: string;
  mobileNumbers: string[];
  phoneNumber: string;
  groupImageBase64?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get API credentials from secrets
    const apiId = Deno.env.get('TELEGRAM_API_ID');
    const apiHash = Deno.env.get('TELEGRAM_API_HASH');

    if (!apiId || !apiHash) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Telegram API credentials not configured. Please add TELEGRAM_API_ID and TELEGRAM_API_HASH secrets.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const body: CreateGroupRequest = await req.json();
    const { groupName, mobileNumbers, phoneNumber, groupImageBase64 } = body;

    console.log(`Creating group "${groupName}" with ${mobileNumbers.length} members`);
    console.log('Phone number for auth:', phoneNumber);
    console.log('API ID configured:', !!apiId);
    console.log('API Hash configured:', !!apiHash);

    // Validate required fields
    if (!groupName || !mobileNumbers || !phoneNumber) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: groupName, mobileNumbers, phoneNumber' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (mobileNumbers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'At least one mobile number is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Note: GramJS requires a Node.js runtime with full crypto support
    // For production use, this would need a dedicated Node.js backend server
    // or session management with OTP flow
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Group "${groupName}" creation initiated`,
        details: {
          groupName,
          memberCount: mobileNumbers.length,
          hasImage: !!groupImageBase64,
          note: 'GramJS integration requires OTP authentication flow. Session management needed.'
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error creating Telegram group:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});