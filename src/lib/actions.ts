"use server";

import ContactFormEmail from "@/components/email/ContactFormEmail";
import { Resend } from "resend";
import { z } from "zod";
import { ContactFormSchema } from "./schemas";

const resend = new Resend(process.env.RESEND_API_KEY);

type ContactFormInputs = z.infer<typeof ContactFormSchema>;

export async function sendEmail(data: ContactFormInputs) {
  const result = ContactFormSchema.safeParse(data);

  if (result.error) {
    return { error: result.error.format() };
  }

  try {
    const { name, email, message } = result.data;
    // Send main email to site owner
    const { data, error } = await resend.emails.send({
      from: `Vansh <noreply@connect.vanshraja.me>`,
      to: "vanshraja32@gmail.com",
      replyTo: [email],
      subject: `New message from ${name}!`,
      text: `Name:\n${name}\n\nEmail:\n${email}\n\nMessage:\n${message}`,
      // react: ContactFormEmail({ name, email, message }),
    });

    if (!data || error) {
      console.error(error?.message);
      return { error: error?.message || "Failed to send email!" };
    }

    // Send confirmation email to sender
    await resend.emails.send({
      from: `Vansh <noreply@connect.vanshraja.me>`,
      to: email,
      subject: "Thank you for contacting Vansh!",
      text: `Hi ${name},\n\nThank you for reaching out! I appreciate your message and will get back to you as soon as possible.\n\nHere's a copy of your message for your reference:\n\n---\n${message}\n---\n\nBest Regards,\nVansh :)`,
    });

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
