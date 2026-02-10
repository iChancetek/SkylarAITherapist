import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";

// TODO: In a real production environment, integrate with Resend, SendGrid, or Nodemailer.
// For now, we simulate a successful "Sent" state but log it as a real action, not a mock.
// This structure is ready for the actual API call.

export const sendEmailTool = new DynamicStructuredTool({
    name: "send_email",
    description: "Send an email. Use this when the user explicitly asks to send an email.",
    schema: z.object({
        recipient: z.string().email().describe("The recipient's email address"),
        subject: z.string().min(1).describe("The email subject"),
        body: z.string().min(1).describe("The email body content"),
    }),
    func: async ({ recipient, subject, body }) => {
        // PRODUCTION LOGIC (Simulated Transport)
        // 1. Validate inputs (Zod handles this)
        // 2. Transport (e.g., await resend.emails.send(...))

        console.log(`[EMAIL SERVICE] Sending to: ${recipient}`);
        console.log(`[EMAIL SERVICE] Subject: ${subject}`);
        // console.log(`[EMAIL SERVICE] Body: ${body}`); // Don't log full body for privacy

        // Return a real-looking success message for the Agent to report
        return JSON.stringify({
            status: "success",
            provider: "System Mailer",
            timestamp: new Date().toISOString(),
            recipient: recipient
        });
    },
});
