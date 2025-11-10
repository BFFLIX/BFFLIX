export const PrivacyPolicyContent = () => {
  return (
    <div className="space-y-6 text-white/80">
      <p className="text-sm text-white/50">Last updated: [Date]</p>

      <section>
        <h3 className="mb-2">1. Introduction</h3>
        <p className="text-sm leading-relaxed mb-3">
          Welcome to BFFlix ("we", "us", or "our"). We value your privacy and are committed to protecting your personal information.
        </p>
        <p className="text-sm leading-relaxed mb-3">
          This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the BFFlix web or mobile application (collectively, the "Service").
        </p>
        <p className="text-sm leading-relaxed">
          By using BFFlix, you agree to the terms of this Privacy Policy.
        </p>
      </section>

      <section>
        <h3 className="mb-2">2. Information We Collect</h3>
        <p className="text-sm leading-relaxed mb-3">
          We collect information that helps us provide, improve, and personalize the Service.
        </p>
        
        <div className="ml-4 space-y-4">
          <div>
            <h4 className="mb-2 text-white/90">A. Information You Provide Directly</h4>
            <ul className="text-sm leading-relaxed space-y-2 list-disc ml-5">
              <li><strong>Account Information:</strong> Name, email address, password (hashed and encrypted), and selected streaming services (Netflix, Hulu, Max, Prime Video, Disney+, Peacock).</li>
              <li><strong>Profile Details:</strong> Display name, profile picture (if uploaded), and service preferences.</li>
              <li><strong>Content:</strong> Posts, ratings, comments, or discussions you share within your Circles.</li>
              <li><strong>Communications:</strong> Feedback, support requests, or emails sent to us.</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-2 text-white/90">B. Information We Collect Automatically</h4>
            <ul className="text-sm leading-relaxed space-y-2 list-disc ml-5">
              <li><strong>Usage Data:</strong> Pages or screens you visit, actions taken, and timestamps.</li>
              <li><strong>Device Data:</strong> Device type, operating system, browser, IP address, and app version.</li>
              <li><strong>Cookies and Analytics:</strong> We use analytics tools (such as Google Analytics or Vercel Analytics) to understand how users interact with our platform. Cookies help remember preferences and login states.</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-2 text-white/90">C. Information From Third Parties</h4>
            <ul className="text-sm leading-relaxed space-y-2 list-disc ml-5">
              <li><strong>Streaming Availability APIs:</strong> We pull public availability data from services like TMDb or JustWatch to show what's playable on your selected platforms.</li>
              <li><strong>AI Agent Providers:</strong> If you use our AI recommendations, we securely transmit anonymized context to AI services (e.g., OpenAI or Google Gemini) to generate viewing suggestions.</li>
              <li><strong>Authentication Providers (if applicable):</strong> If you sign in via Google, Apple, or other third-party services, we receive only your verified email and basic profile info (no passwords).</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-2">3. How We Use Your Information</h3>
        <p className="text-sm leading-relaxed mb-3">We use your information to:</p>
        <ul className="text-sm leading-relaxed space-y-2 list-disc ml-5">
          <li>Provide, maintain, and improve the BFFlix Service.</li>
          <li>Personalize recommendations and Circle activity feeds.</li>
          <li>Enable AI-driven movie and show suggestions.</li>
          <li>Manage authentication, password resets, and account security.</li>
          <li>Monitor and detect fraudulent or abusive behavior.</li>
          <li>Communicate updates, service announcements, or security notices.</li>
          <li>Comply with legal requirements and enforce our Terms & Conditions.</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-2">4. AI Features and Data Handling</h3>
        <p className="text-sm leading-relaxed mb-3">
          Our AI features (powered by OpenAI or Google Gemini) analyze:
        </p>
        <ul className="text-sm leading-relaxed space-y-2 list-disc ml-5">
          <li>Your previously watched titles and ratings (from your viewing log).</li>
          <li>Publicly available metadata (title, genre, rating, etc.).</li>
        </ul>
        <p className="text-sm leading-relaxed mt-3 mb-3">
          We never send personally identifiable information (like your email, name, or private messages) to AI APIs. Only minimal anonymized context—such as preferred genres or services—is shared to generate personalized suggestions.
        </p>
        <p className="text-sm leading-relaxed">
          All AI-generated output is processed in compliance with respective provider terms, and we retain no conversational data beyond the immediate session unless you explicitly save it.
        </p>
      </section>

      <section>
        <h3 className="mb-2">5. Sharing of Information</h3>
        <p className="text-sm leading-relaxed mb-3">
          We do not sell your personal data.
          We may share information only under these limited circumstances:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-white/10">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-3 bg-white/5">Purpose</th>
                <th className="text-left p-3 bg-white/5">Shared With</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/10">
                <td className="p-3">Hosting and storage</td>
                <td className="p-3">MongoDB Atlas (database), Vercel / Render / Railway (API hosting)</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="p-3">Analytics</td>
                <td className="p-3">Google Analytics, Vercel Analytics</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="p-3">AI recommendations</td>
                <td className="p-3">OpenAI API or Google Gemini (anonymized content only)</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="p-3">Email services</td>
                <td className="p-3">SMTP or AWS SES (for password resets and notifications)</td>
              </tr>
              <tr>
                <td className="p-3">Legal requirements</td>
                <td className="p-3">Law enforcement or government entities if required by law</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm leading-relaxed mt-3">
          All third-party partners are contractually bound to handle your data securely and only for authorized purposes.
        </p>
      </section>

      <section>
        <h3 className="mb-2">6. Circles and Shared Content</h3>
        <p className="text-sm leading-relaxed mb-3">
          When you post content inside a Circle, that content is visible only to members of that Circle (or Circles, if cross-posted).
          If you choose to post to multiple Circles, the same post may appear once in shared feeds (deduped automatically).
        </p>
        <p className="text-sm leading-relaxed">
          You control what you share. We are not responsible for how other users choose to share or use content once it's visible to them.
        </p>
      </section>

      <section>
        <h3 className="mb-2">7. Data Retention</h3>
        <p className="text-sm leading-relaxed mb-3">
          We retain account information for as long as your account is active.
          If you delete your account:
        </p>
        <ul className="text-sm leading-relaxed space-y-2 list-disc ml-5">
          <li>All personally identifiable data (name, email, and password hash) will be deleted within 30 days.</li>
          <li>Circle posts and comments may remain visible to other users as anonymized content ("Deleted User").</li>
          <li>Logs and backups are retained securely for up to 90 days before permanent deletion.</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-2">8. Security</h3>
        <p className="text-sm leading-relaxed mb-3">
          We use industry-standard safeguards to protect your information, including:
        </p>
        <ul className="text-sm leading-relaxed space-y-2 list-disc ml-5">
          <li>HTTPS encryption for all traffic.</li>
          <li>Hashed passwords using bcrypt.</li>
          <li>Limited-access environment variables for sensitive keys.</li>
          <li>Role-based access controls for developers and admins.</li>
        </ul>
        <p className="text-sm leading-relaxed mt-3">
          However, no system is 100% secure. By using the Service, you acknowledge that transmission over the internet carries inherent risks.
        </p>
      </section>

      <section>
        <h3 className="mb-2">9. Your Rights</h3>
        <p className="text-sm leading-relaxed mb-3">
          Depending on your region, you may have rights to:
        </p>
        <ul className="text-sm leading-relaxed space-y-2 list-disc ml-5">
          <li>Access or request a copy of your data.</li>
          <li>Correct or delete inaccurate information.</li>
          <li>Request deletion of your account ("Right to be forgotten").</li>
          <li>Withdraw consent to AI recommendation features.</li>
          <li>Request information on how we share data with third parties.</li>
        </ul>
        <p className="text-sm leading-relaxed mt-3">
          To exercise these rights, contact us at [Your Contact Email] with the subject line "Privacy Request."
        </p>
      </section>

      <section>
        <h3 className="mb-2">10. Children's Privacy</h3>
        <p className="text-sm leading-relaxed mb-3">
          BFFlix is intended for users aged 13 and older.
          We do not knowingly collect information from children under 13.
          If you believe your child has created an account, please contact us immediately to delete their data.
        </p>
      </section>

      <section>
        <h3 className="mb-2">11. International Data Transfers</h3>
        <p className="text-sm leading-relaxed mb-3">
          Your information may be transferred and processed outside your country, including in the United States, where our servers and third-party providers operate.
          By using the Service, you consent to this transfer.
        </p>
      </section>

      <section>
        <h3 className="mb-2">12. Changes to This Policy</h3>
        <p className="text-sm leading-relaxed mb-3">
          We may update this Privacy Policy periodically.
          When we do, we'll update the "Last Updated" date and post the new version on the Service.
          Your continued use of BFFlix after updates indicates your acceptance of the revised policy.
        </p>
      </section>

      <section>
        <h3 className="mb-2">13. Contact Us</h3>
        <p className="text-sm leading-relaxed mb-3">
          If you have any questions, concerns, or data requests, contact us at:
        </p>
        <div className="text-sm leading-relaxed ml-5">
          <p>BFFlix Privacy Team</p>
          <p>[Your Company or Team Name]</p>
          <p>[Your Contact Email]</p>
          <p>[Your Mailing Address]</p>
        </div>
      </section>
    </div>
  );
};
