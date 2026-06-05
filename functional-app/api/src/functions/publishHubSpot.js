import { app } from "@azure/functions";
import { isAuthError, requireAuthenticatedUser } from "../shared/auth.js";

app.http("publishHubSpot", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "publish-hubspot",
  handler: async (request, context) => {
    const user = requireAuthenticatedUser(request);
    if (isAuthError(user)) return user;

    const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
    if (!token) {
      return { status: 500, jsonBody: { error: "HUBSPOT_PRIVATE_APP_TOKEN is not configured" } };
    }

    try {
      const payload = await request.json();
      const companyId = String(payload.companyId || "").trim();
      const html = String(payload.html || "").trim();

      if (!companyId) return { status: 400, jsonBody: { error: "HubSpot company ID is required" } };
      if (!html) return { status: 400, jsonBody: { error: "Note HTML is required" } };

      const noteBody = {
        properties: {
          hs_timestamp: new Date(payload.visitDate || Date.now()).toISOString(),
          hs_note_body: appendPublishMetadata(html, user, payload),
        },
        associations: [
          {
            to: { id: companyId },
            types: [
              {
                associationCategory: "HUBSPOT_DEFINED",
                associationTypeId: Number(process.env.HUBSPOT_NOTE_TO_COMPANY_ASSOCIATION_TYPE_ID || 190),
              },
            ],
          },
        ],
      };

      const response = await fetch("https://api.hubapi.com/crm/v3/objects/notes", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(noteBody),
      });

      const result = await response.json();
      if (!response.ok) {
        context.error("HubSpot publish failed", result);
        return {
          status: response.status,
          jsonBody: { error: result.message || "HubSpot publish failed" },
        };
      }

      return {
        jsonBody: {
          noteId: result.id,
          companyId,
          publishedBy: user.userDetails,
        },
      };
    } catch (error) {
      context.error(error);
      return { status: 500, jsonBody: { error: "Unable to publish HubSpot note" } };
    }
  },
});

function appendPublishMetadata(html, user, payload) {
  const author = escapeHtml(payload.authorName || user.userDetails || "Unknown");
  const facility = escapeHtml(payload.facilityName || "Unknown facility");
  return `${html}<hr><p><strong>Published by:</strong> ${author}<br><strong>Authenticated user:</strong> ${escapeHtml(
    user.userDetails || ""
  )}<br><strong>Facility:</strong> ${facility}</p>`;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
