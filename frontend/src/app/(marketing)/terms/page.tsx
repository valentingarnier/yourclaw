export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <div className="mx-auto max-w-4xl px-6 py-24">
        <h1 className="text-4xl font-bold text-white mb-4">Terms and Conditions</h1>
        <p className="text-zinc-500 mb-12">Last updated: January 2026</p>

        <div className="prose prose-invert prose-zinc max-w-none">
          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">SOFTWARE LICENSE AGREEMENT (SaaS)</h2>
          <p>
            This SOFTWARE LICENSE AGREEMENT (&quot;AGREEMENT&quot;) is entered into between YourClaw and its subsidiaries
            (collectively referred to as &quot;YourClaw,&quot; &quot;we,&quot; &quot;our company&quot;) and the individual or legal entity
            subscribing to the software and/or services under this Agreement and/or an applicable order form
            (&quot;you&quot; or &quot;Client&quot;, and together with YourClaw, the &quot;Parties&quot;), and governs the Client&apos;s access
            to and use of the software and/or services.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">1. Preamble</h2>
          <p>
            YourClaw has developed and owns a software solution called YourClaw, which provides AI assistant
            services via WhatsApp powered by OpenClaw. This solution is provided to clients as Software-as-a-Service (SaaS).
            This Agreement governs the relationship between YourClaw and its clients regarding subscription, access,
            and usage of the services by end users.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">2. Acceptance of Terms of Service</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>By subscribing to YourClaw&apos;s services, the Client accepts these Terms of Service (ToS).</li>
            <li>The Client confirms they are authorized to represent their organization and accept these ToS on its behalf.</li>
            <li>The ToS may be updated, and renewals will be subject to the version in force at the time of renewal.</li>
            <li>This Agreement may be made available through Stripe or another online payment platform, and acceptance of the ToS may occur via a confirmation click during subscription.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">3. Software Access & Restrictions</h2>
          <p>
            YourClaw grants a limited, non-transferable, non-exclusive right to access and use the software via
            WhatsApp and web interfaces. Nothing in this Agreement transfers intellectual property rights.
          </p>
          <p className="mt-4">It is prohibited to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Modify, alter, or create derivative works.</li>
            <li>Resell or commercially exploit the service without written consent.</li>
            <li>Use automated tools to monitor or extract content.</li>
            <li>Host or distribute fraudulent, abusive, or illegal content.</li>
          </ul>
          <p className="mt-4">
            Access to the service is subject to applicable laws, and YourClaw reserves the right to suspend
            accounts for violations.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">4. Data Protection & GDPR / Swiss LPD Compliance</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>YourClaw complies with the GDPR and Swiss LPD.</li>
            <li>A separate Data Processing Agreement (DPA) is provided upon request.</li>
            <li>Clients will be informed in case of a security breach, and corrective actions will be implemented immediately.</li>
            <li>Data transfers outside the EU/EEA follow Standard Contractual Clauses (SCCs).</li>
            <li><strong>Subprocessors:</strong> YourClaw may engage subprocessors to deliver the service. Any changes will be notified to the client, who can object if sensitive data is involved.</li>
            <li>Clients may request access, correction, deletion, or portability of their personal data.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">5. Subscription & Termination Policy</h2>
          <h3 className="text-xl font-medium text-white mt-6 mb-3">Duration & Renewal:</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Monthly subscriptions renew automatically each month.</li>
            <li>Annual subscriptions renew each year.</li>
          </ul>

          <h3 className="text-xl font-medium text-white mt-6 mb-3">Notice Period:</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>1 month before the end of an annual subscription.</li>
            <li>10 days for a monthly subscription.</li>
          </ul>

          <h3 className="text-xl font-medium text-white mt-6 mb-3">Non-payment:</h3>
          <p>Account suspension after 30 days of unpaid dues.</p>

          <h3 className="text-xl font-medium text-white mt-6 mb-3">Termination:</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Clients may cancel subscriptions directly via Stripe or by sending a written request to hello@yourclaw.dev.</li>
            <li>No refunds are provided for early termination of annual subscriptions, except in cases of duly justified force majeure.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">6. Taxes & Billing</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Clients in Switzerland:</strong> Prices include Swiss VAT.</li>
            <li><strong>Clients outside Switzerland:</strong> Prices are exclusive of tax. The client is responsible for any applicable taxes in their jurisdiction.</li>
            <li>Payments are processed via Stripe (credit card, direct debit) and must be completed within 30 days of invoice issuance.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">7. AI Responsibility Disclaimer</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>YourClaw does not guarantee the accuracy of AI-generated analysis or responses.</li>
            <li>The Client is solely responsible for decisions made based on AI-generated insights.</li>
            <li>YourClaw accepts no liability for errors, bias, or AI &quot;hallucinations&quot;.</li>
            <li>It is strongly recommended that each analysis be reviewed before making business decisions.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">8. Client Verification (KYC)</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>YourClaw may require identity verification to prevent fraud.</li>
            <li>This applies especially to clients outside Switzerland/EU or in sensitive jurisdictions.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">9. Service Suspension</h2>
          <p>YourClaw reserves the right to suspend an account in case of:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Non-payment after 30 days.</li>
            <li>Serious violations of the Terms (e.g., fraudulent or illegal content, resource abuse).</li>
            <li>Failure to comply with confidentiality and data protection obligations.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">10. Backups & Data Retrieval</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>YourClaw does not guarantee backups beyond standard security measures.</li>
            <li>Clients are responsible for regular data backups.</li>
            <li>Upon written request within 10 days after termination, YourClaw may provide a copy of stored data.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">11. Limitation of Liability</h2>
          <p>YourClaw is not liable for:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Technical failures or service interruptions.</li>
            <li>AI-generated errors or inaccuracies.</li>
            <li>The Client&apos;s non-compliance with obligations.</li>
            <li>Force majeure (e.g., natural disasters, DDoS attacks).</li>
          </ul>
          <p className="mt-4">
            YourClaw&apos;s financial liability is limited to amounts paid by the Client in the last 12 months.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">12. Arbitration & Jurisdiction</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Any dispute will be settled through arbitration in Geneva, Switzerland.</li>
            <li>The courts of Geneva have exclusive jurisdiction in case of litigation.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">13. Activation & Termination of the Agreement</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>The Agreement is effective upon subscription to the service.</li>
            <li>Termination is subject to the conditions outlined in Section 5.</li>
            <li>Data will be deleted within 10 days after termination, unless legally required otherwise.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">14. Impressum</h2>
          <ul className="list-none space-y-2">
            <li><strong>Company Name:</strong> YourClaw (Incorporation in progress)</li>
            <li><strong>Business Address:</strong> Business address available upon request. YourClaw is currently operating in pre-incorporation phase from Geneva, Switzerland.</li>
            <li><strong>Email:</strong> hello@yourclaw.dev</li>
            <li><strong>Website:</strong> www.yourclaw.dev</li>
            <li><strong>Place of jurisdiction:</strong> Geneva, Switzerland</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">Disclaimer</h2>
          <p>
            Despite careful content control, we assume no liability for the content of external links.
            The operators of linked pages are solely responsible for their content. YourClaw is not responsible
            for the accuracy of AI-generated content and recommends review before making business decisions
            based on the analysis provided.
          </p>
        </div>
      </div>
    </div>
  );
}
