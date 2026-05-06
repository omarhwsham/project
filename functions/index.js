const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

exports.createOutlookEvent = functions.https.onCall(async (data, context) => {
    // 1. Authenticate Request
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "You must be logged in to sync to Outlook."
        );
    }
    const userId = context.auth.uid;
    const { eventId, reminderDays, accessToken } = data;

    if (!eventId || reminderDays === undefined || !accessToken) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Missing required parameters."
        );
    }

    if (reminderDays < 0 || reminderDays > 7) {
        throw new functions.https.HttpsError(
            "out-of-range",
            "Reminder days must be between 0 and 7."
        );
    }

    try {
        // 2. Fetch event data from Firestore
        const eventRef = db.collection("events").doc(eventId);
        const eventSnap = await eventRef.get();

        if (!eventSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Event not found.");
        }

        const eventData = eventSnap.data();

        // 3. Check for Duplicate Registration
        const registrationId = `${userId}_${eventId}`;
        const registrationRef = db.collection("eventRegistrations").doc(registrationId);
        const registrationSnap = await registrationRef.get();

        if (registrationSnap.exists) {
            throw new functions.https.HttpsError("already-exists", "User is already registered for this event.");
        }

        // 4. Construct Microsoft Graph API Payload
        const reminderMinutes = reminderDays * 1440;
        
        // Ensure dates are valid ISO strings
        const startIso = new Date(eventData.startDate || eventData.date).toISOString();
        const endIso = new Date(eventData.endDate || eventData.date).toISOString();

        const outlookPayload = {
            subject: eventData.title || eventData.name,
            body: {
                contentType: "HTML",
                content: eventData.description || eventData.tagline || "Event registration from Eduvibe",
            },
            start: {
                dateTime: startIso,
                timeZone: "UTC",
            },
            end: {
                dateTime: endIso,
                timeZone: "UTC",
            },
            isReminderOn: true,
            reminderMinutesBeforeStart: reminderMinutes,
        };

        // 5. Call Microsoft Graph API
        let outlookEventId = null;
        try {
            const msResponse = await axios.post(
                "https://graph.microsoft.com/v1.0/me/events",
                outlookPayload,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                }
            );
            outlookEventId = msResponse.data.id;
        } catch (error) {
            console.error("Graph API Error:", error.response ? error.response.data : error.message);
            throw new functions.https.HttpsError("internal", "Failed to sync with Outlook Calendar.");
        }

        // 6. Save Registration to Firestore
        await registrationRef.set({
            userId: userId,
            eventId: eventId,
            reminderDays: reminderDays,
            outlookEventId: outlookEventId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, outlookEventId: outlookEventId, message: "Added to your Outlook Calendar ✅" };

    } catch (error) {
        console.error("Function Error:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", "An unexpected error occurred.", error.message);
    }
});

exports.registerEventWithoutSync = functions.https.onCall(async (data, context) => {
    // Fallback if the user cancels Microsoft Login
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
    
    const userId = context.auth.uid;
    const { eventId, reminderDays } = data;

    const registrationId = `${userId}_${eventId}`;
    const registrationRef = db.collection("eventRegistrations").doc(registrationId);
    
    const snap = await registrationRef.get();
    if (snap.exists) {
        throw new functions.https.HttpsError("already-exists", "User is already registered.");
    }

    await registrationRef.set({
        userId: userId,
        eventId: eventId,
        reminderDays: reminderDays || 0,
        outlookEventId: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: "Registered without Calendar sync." };
});
