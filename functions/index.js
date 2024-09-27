const dotenv = require("dotenv");
dotenv.config({path: "./config.env"});

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

const {Timestamp} = require("firebase-admin/firestore");

const stripe = require("stripe")(process.env.stripe_secret_key);
initializeApp();
const db = getFirestore();

exports.createStripeCustomer = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const userId = request.auth.uid;

    const customer = await stripe.customers.create({
      metadata: {
        uid: userId,
      },
    });

    await db.collection("Users").doc(userId).set(
        {
          stripeCustomerId: customer.id,
          customerCreated: true,
          customerCreationDate: Timestamp.now(),
        },
        {merge: true},
    );

    return {success: true, customerId: customer.id};
  } catch (error) {
    throw new HttpsError("internal", error);
  }
});

exports.addCardToCustomer = onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const {customerId, cardToken} = data;

    const updatedCustomer = await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: cardToken,
      },
    });

    return {success: true, updatedCustomer};
  } catch (error) {
    console.error("Error", error);
    throw new HttpsError("internal", error);
  }
});
