import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const authorization = request.headers.get("Authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return jsonResponse(401, { error: "Authentication is required." });
  }

  let body: { email?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: "A valid JSON body is required." });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse(400, { error: "A valid email address is required." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const appUrl = Deno.env.get("APP_URL")?.replace(/\/+$/, "");
  const fromEmail = Deno.env.get("INVITE_FROM_EMAIL");
  if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !appUrl || !fromEmail) {
    console.error("Invitation service configuration is incomplete.");
    return jsonResponse(500, { error: "Invitation email is not configured. Contact your administrator." });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return jsonResponse(401, { error: "Your session is not valid. Sign in again." });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Could not verify invitation sender:", profileError.message);
    return jsonResponse(500, { error: "Could not verify your permission to send invitations." });
  }
  if (profile?.role !== "Admin") {
    return jsonResponse(403, { error: "Only store admins can send team invitations." });
  }

  const { data: invite, error: inviteError } = await supabase
    .from("invites")
    .select("email, role, invited_by")
    .eq("email", email)
    .eq("invited_by", authData.user.id)
    .maybeSingle();
  if (inviteError) {
    console.error("Could not verify pending invitation:", inviteError.message);
    return jsonResponse(500, { error: "Could not verify the pending invitation." });
  }
  if (!invite) {
    return jsonResponse(404, { error: "This pending invitation no longer exists." });
  }
  if (body.role !== undefined && body.role !== invite.role) {
    return jsonResponse(409, { error: "The invitation role changed. Refresh the team list and try again." });
  }

  let signupUrl: URL;
  try {
    signupUrl = new URL("/login", appUrl);
  } catch {
    console.error("APP_URL is not a valid URL.");
    return jsonResponse(500, { error: "Invitation email is not configured. Contact your administrator." });
  }
  signupUrl.searchParams.set("email", email);
  signupUrl.searchParams.set("invite", "1");
  const safeEmail = escapeHtml(email);
  const safeRole = escapeHtml(invite.role);
  let emailResponse: Response;
  try {
    emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: "You're invited to join StockTrack",
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033"><h1>You're invited to StockTrack</h1><p>You have been invited to join a store team as <strong>${safeRole}</strong>.</p><p>Accept the invitation by creating your account with <strong>${safeEmail}</strong>.</p><p><a href="${signupUrl.toString()}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px">Create your account</a></p></div>`,
      }),
    });
  } catch (error) {
    console.error("Could not connect to Resend:", error);
    return jsonResponse(502, { error: "Could not connect to the email service. Try again later." });
  }
  if (!emailResponse.ok) {
    const responseText = await emailResponse.text();
    console.error("Resend rejected invitation email:", emailResponse.status, responseText.length > 500 ? responseText.slice(0, 500) : responseText);
    return jsonResponse(502, { error: "Resend could not deliver the invitation email. Try again later." });
  }

  return jsonResponse(200, { success: true });
});
