const requiredOnServer = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
] as const;

export function getOptionalEnv(name: string) {
  return process.env[name];
}

export function getServerEnv() {
  const missing = requiredOnServer.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required server environment variables: ${missing.join(", ")}`,
    );
  }

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID as string,
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET as string,
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    adminAccessKey: process.env.ADMIN_ACCESS_KEY,
  };
}

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
