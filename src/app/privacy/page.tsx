import Link from "next/link";

const lastUpdated = "3 July 2025";

export default function page() {
  return (
    <article className="prose mt-8 pb-16 dark:prose-invert">
      <div className="space-y-4">
        <h1 className="title text-5xl">privacy policy.</h1>
        <p>Last Updated: {lastUpdated}</p>
      </div>
      <div className="space-y-4">
        <h2 className="title text-3xl">Hey, Welcome!</h2>
        <p>
          Glad you're here! This <b>Privacy Policy</b> is just my way of being upfront about how things work around here. This site is mostly about showing off my projects, and I take your privacy seriously.
        </p>
        <h2 className="title">What Info Do I Collect? (Spoiler: Not Much)</h2>
        <p>
          Honestly, this is just a static portfolio. No accounts, no tracking cookies, no secret data ninjas. I&apos;m not here to snoop.
        </p>
        <h3>1. Chatbot Chats</h3>
        <p>
          If you chat with the bot, your messages might get saved for a bit to help make it smarter. Please don&apos;t drop any top-secret stuff in there—just in case.
        </p>
        <h3>2. Contact Stuff</h3>
        <p>
          If you email me or use the contact form, you&apos;re in control of what you share. I&apos;ll only use your info to reply and keep the convo going—no funny business.
        </p>
        <h2 className="title">How I Use Your Info</h2>
        <p>Here&apos;s what might happen with anything you send my way:</p>
        <ul>
          <li>Keep the site running smoothly (no one likes a broken site).</li>
          <li>Make tweaks based on your feedback (I love feedback!).</li>
          <li>Reply to your questions or just say hi back.</li>
        </ul>
        <h2 className="title">Sharing Your Info (Nope!)</h2>
        <p>
          I don&apos;t sell, trade, or rent your info. If you ever send something sensitive by accident, just let me know and I&apos;ll help you out.
        </p>
        <h2 className="title">Security (The Internet Isn&apos;t Perfect)</h2>
        <p>
          I strive to protect any information you share, but please understand that no online system is 100% secure. While I take reasonable measures, absolute security cannot be guaranteed.
        </p>
        <h2 className="title">Policy Updates (No Surprises)</h2>
        <p>
          This policy is current as of <b>{lastUpdated}</b>. If I ever change anything, I&apos;ll update it here. Feel free to check back, but don&apos;t worry—I&apos;m not planning any wild surprises.
        </p>
        <h2 className="title">Got Questions?</h2>
        <p>
          If you have questions, want to chat, or just want to say hi, email me at <Link href="mailto:vanshraja32@gmail.com">vanshraja32@gmail.com</Link> or use the <Link href="/contact">contact form</Link>. I&apos;d love to hear from you!
        </p>
      </div>
    </article>
  );
}
