import { app } from "@azure/functions";
import { isAuthError, requireAuthenticatedUser } from "../shared/auth.js";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

app.http("transcribe", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "transcribe",
  handler: async (request, context) => {
    const user = requireAuthenticatedUser(request);
    if (isAuthError(user)) return user;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { status: 500, jsonBody: { error: "OPENAI_API_KEY is not configured" } };
    }

    try {
      const body = await request.formData();
      const audio = body.get("audio");
      if (!audio || typeof audio.arrayBuffer !== "function") {
        return { status: 400, jsonBody: { error: "Audio file is required" } };
      }

      if (audio.size > MAX_AUDIO_BYTES) {
        return { status: 413, jsonBody: { error: "Audio file exceeds the 25 MB transcription limit" } };
      }

      const form = new FormData();
      form.append("model", process.env.OPENAI_TRANSCRIPTION_MODEL || "whisper-1");
      form.append("file", audio, audio.name || "visit-recording.webm");
      form.append("response_format", "json");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: form,
      });

      const result = await response.json();
      if (!response.ok) {
        context.error("OpenAI transcription failed", result);
        return {
          status: response.status,
          jsonBody: { error: result.error?.message || "OpenAI transcription failed" },
        };
      }

      return {
        jsonBody: {
          text: result.text || "",
          model: process.env.OPENAI_TRANSCRIPTION_MODEL || "whisper-1",
          transcribedBy: user.userDetails,
        },
      };
    } catch (error) {
      context.error(error);
      return { status: 500, jsonBody: { error: "Unable to transcribe audio" } };
    }
  },
});
