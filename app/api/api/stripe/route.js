import verifyIdToken from "@/lib/server-auth";
import { createError, errorResponse } from "@/lib/server-error";
import Loved from "@/models/loved";
import connectDB from "@/mongodb.config";
import { headers } from "next/headers"; // Import headers from Next.js
import Stripe from "stripe";

// Initialize Stripe with secret key from environment variables
const stripe = new Stripe(process.env.NEXT_STRIPE_SECRET_KEY);

// Connect to MongoDB
connectDB();

// Define GET request handler
export async function POST(req) {
  // Extract IP address from headers
  const ip = (headers().get("x-forwarded-for") ?? "127.0.0.1").split(",")[0];
  // Extract user agent from headers
  const user_agent = headers().get("user-agent");

  try {
    // Verify user token
    const user = await verifyIdToken(req);
    // Parse request payload
    const payload = await req.json();
    // Destructure payload
    const { pageId, date_of_birth, city, address, state, postal_code, phone } =
      payload;

    // Array to store missing parameters
    const missing_params = [];
    // Check if all required parameters are present
    const isPayloads =
      Object.keys(payload).every((param) => {
        if (!payload[param]) {
          missing_params.push(param);
          return false; // Indicate that at least one required parameter is missing
        }
        return true;
      }) && Object.keys(payload).length === 7;

    // If any required parameter is missing, throw an error
    !isPayloads &&
      createError(`Missing required params: ${missing_params.join(", ")}`, 400);

    // Find the Loved page
    const page = await Loved.findOne({ uid: user.uid, _id: pageId });
    // If page is not found, throw an error
    !page && createError("Page not found", 404);

    // Create account details object for Stripe
    const accountDetails = {
      type: "custom",
      country: "AU",
      business_type: "individual",
      business_profile: {
        mcc: "5734",
        name: page.email,
        url: process.env.NEXTAUTH_URL,
      },
      individual: {
        email: page.email,
        phone: "+61" + phone,
        first_name: page.first_name,
        last_name: page.last_name,
        dob: {
          day: date_of_birth.split("-")[2],
          month: date_of_birth.split("-")[1],
          year: date_of_birth.split("-")[0],
        },
        registered_address: {
          city: city,
          state: state,
          country: "AU",
          line1: address,
          postal_code: postal_code,
        },
        address: {
          city,
          state,
          country: "AU",
          line1: address,
          postal_code,
        },
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      tos_acceptance: {
        date: Date.now(),
        ip: ip,
        user_agent: user_agent,
      },
    };

    // Create account with Stripe
    const account = await stripe.accounts.create(accountDetails);

    // Insert Stripe account ID to Loved page model
    page.stripe_acc_id = account.id;

    // Save page data
    await page.save();
  } catch (error) {
    // Return error response
    return errorResponse(error);
  }
}
