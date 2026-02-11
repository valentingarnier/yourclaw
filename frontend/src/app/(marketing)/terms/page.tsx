export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <div className="mx-auto max-w-4xl px-6 py-24">
        <h1 className="text-4xl font-bold text-white mb-4">Terms and Conditions</h1>
        <p className="text-zinc-500 mb-12">Last updated: February 2026</p>

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
            YourClaw provides a managed hosting and delivery platform for OpenClaw, an open-source AI assistant
            framework. YourClaw enables users to access their own dedicated OpenClaw instance via WhatsApp and
            Telegram messaging channels. This solution is provided to clients as Software-as-a-Service (SaaS).
          </p>
          <p className="mt-4">
            <strong>YourClaw is an infrastructure and delivery platform only.</strong> YourClaw does not develop,
            control, or maintain the underlying OpenClaw software, AI models, or third-party services used by
            the assistant. OpenClaw is an independent open-source project with its own license and terms.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">2. Acceptance of Terms of Service</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>By subscribing to YourClaw&apos;s services, the Client accepts these Terms of Service (ToS) in full.</li>
            <li>The Client confirms they are authorized to represent their organization and accept these ToS on its behalf.</li>
            <li>The ToS may be updated, and renewals will be subject to the version in force at the time of renewal.</li>
            <li>This Agreement may be made available through Stripe or another online payment platform, and acceptance of the ToS may occur via a confirmation click during subscription.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">3. Service Description</h2>
          <p>YourClaw provides the following:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>A dedicated, isolated OpenClaw instance (container) provisioned and managed on the Client&apos;s behalf.</li>
            <li>Connectivity to the Client&apos;s OpenClaw instance via WhatsApp and/or Telegram messaging channels.</li>
            <li>Infrastructure management including provisioning, monitoring, and maintenance of containers.</li>
            <li>Access to AI models from third-party providers (Anthropic, OpenAI, Google) via shared or user-provided API keys.</li>
          </ul>
          <p className="mt-4">
            The OpenClaw assistant has access to a range of tools and capabilities including but not limited to:
            web browsing, web search, code execution, file creation and modification, and third-party integrations
            via MCP (Model Context Protocol) servers. These capabilities are provided by OpenClaw and the underlying
            AI models, not by YourClaw.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">4. Software Access & Restrictions</h2>
          <p>
            YourClaw grants a limited, non-transferable, non-exclusive right to access and use the service via
            WhatsApp, Telegram, and web interfaces. Nothing in this Agreement transfers intellectual property rights.
          </p>
          <p className="mt-4">It is prohibited to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Use the service for any illegal, fraudulent, or harmful purpose.</li>
            <li>Attempt to exploit the assistant to harm third parties, generate malicious code, or facilitate cyberattacks.</li>
            <li>Resell, redistribute, or commercially exploit the service without written consent.</li>
            <li>Use automated tools to extract, scrape, or monitor content from the service.</li>
            <li>Attempt to gain unauthorized access to other users&apos; containers, data, or infrastructure.</li>
            <li>Circumvent rate limits, usage caps, or other technical restrictions.</li>
            <li>Use the service to generate content that violates applicable laws or third-party rights.</li>
          </ul>
          <p className="mt-4">
            Access to the service is subject to applicable laws, and YourClaw reserves the right to suspend
            or terminate accounts for violations without notice or refund.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">5. AI Agent — Disclaimer of Responsibility</h2>
          <p className="font-semibold text-white">
            THIS SECTION IS CRITICAL. THE CLIENT MUST READ AND UNDERSTAND IT BEFORE USING THE SERVICE.
          </p>

          <h3 className="text-xl font-medium text-white mt-6 mb-3">5.1 Nature of the AI Agent</h3>
          <p>
            The OpenClaw assistant is an autonomous AI agent powered by third-party large language models (LLMs).
            It is capable of performing actions including but not limited to: executing code, creating and modifying
            files, browsing the web, making HTTP requests, interacting with external services, and generating text,
            code, and other content. These actions are performed autonomously based on the Client&apos;s instructions
            and the AI model&apos;s interpretation thereof.
          </p>

          <h3 className="text-xl font-medium text-white mt-6 mb-3">5.2 No Control Over AI Outputs and Actions</h3>
          <p>
            YourClaw does not control, monitor, review, verify, or approve the outputs, actions, or decisions
            made by the AI agent. YourClaw does not and cannot guarantee the accuracy, completeness, reliability,
            safety, legality, or appropriateness of any content generated, code executed, files created, websites
            visited, or actions taken by the AI agent.
          </p>

          <h3 className="text-xl font-medium text-white mt-6 mb-3">5.3 Client&apos;s Sole Responsibility</h3>
          <p>The Client acknowledges and agrees that:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>The Client is solely and entirely responsible</strong> for all actions performed by their
              AI assistant, including but not limited to: code execution results, files created or modified,
              web browsing activity, data retrieved or sent, messages generated, and any other outputs or side effects.
            </li>
            <li>
              The Client is responsible for reviewing, verifying, and validating all AI-generated content before
              relying on it or using it for any purpose.
            </li>
            <li>
              The Client assumes all risks associated with the use of AI-generated code, including security
              vulnerabilities, bugs, data loss, or unintended behavior.
            </li>
            <li>
              The Client is responsible for any consequences arising from the AI agent&apos;s interaction with
              third-party services, websites, or APIs, whether initiated by the Client or autonomously by the agent.
            </li>
            <li>
              The Client must not rely on the AI agent for critical decisions without independent verification,
              including but not limited to: financial, legal, medical, or safety-related decisions.
            </li>
          </ul>

          <h3 className="text-xl font-medium text-white mt-6 mb-3">5.4 No Warranty on AI Behavior</h3>
          <p>YourClaw makes no representation or warranty, express or implied, regarding:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>The accuracy, correctness, or reliability of AI-generated content or code.</li>
            <li>The safety or security of code executed by the AI agent.</li>
            <li>The availability, accuracy, or legality of information retrieved from the web by the AI agent.</li>
            <li>The AI agent&apos;s compliance with any specific standards, regulations, or best practices.</li>
            <li>The absence of errors, biases, hallucinations, or harmful outputs in AI-generated content.</li>
            <li>The suitability of the AI agent&apos;s outputs for any particular purpose.</li>
          </ul>

          <h3 className="text-xl font-medium text-white mt-6 mb-3">5.5 Third-Party AI Models and Services</h3>
          <p>
            The AI agent is powered by third-party large language models (including models from Anthropic, OpenAI,
            and Google). YourClaw has no control over these models&apos; behavior, training data, biases, capabilities,
            or limitations. The use of these models is additionally subject to each provider&apos;s own terms of service
            and acceptable use policies. YourClaw accepts no responsibility for the behavior, outputs, or
            availability of these third-party models.
          </p>

          <h3 className="text-xl font-medium text-white mt-6 mb-3">5.6 Indemnification</h3>
          <p>
            The Client agrees to indemnify, defend, and hold harmless YourClaw, its officers, directors, employees,
            and agents from and against any and all claims, damages, losses, liabilities, costs, and expenses
            (including reasonable attorney&apos;s fees) arising from or related to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Any action performed by the Client&apos;s AI assistant.</li>
            <li>Any content generated, code executed, or data processed by the AI agent.</li>
            <li>The Client&apos;s use of AI-generated outputs.</li>
            <li>Any violation of third-party rights resulting from the AI agent&apos;s actions.</li>
            <li>The Client&apos;s violation of these Terms or applicable laws.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">6. API Keys — Bring Your Own Key (BYOK)</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Clients may provide their own API keys for third-party AI model providers. When using BYOK,
              the Client is directly bound by the terms of service of the respective provider.
            </li>
            <li>
              YourClaw encrypts user-provided API keys at rest but accepts no liability for unauthorized access
              resulting from the Client&apos;s own security practices or third-party breaches.
            </li>
            <li>
              Usage of AI models via BYOK keys is billed directly by the respective provider to the Client.
              YourClaw has no visibility into or control over such billing.
            </li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">7. Data Protection & Privacy</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>YourClaw complies with the GDPR and Swiss Federal Act on Data Protection (FADP/nLPD).</li>
            <li>A separate Data Processing Agreement (DPA) is provided upon request.</li>
            <li>
              Messages sent to and from the AI assistant are stored for service delivery purposes
              (conversation history, usage tracking). The Client should not share sensitive personal data,
              credentials, or confidential information via the messaging channels.
            </li>
            <li>
              AI-generated content and files created by the assistant are stored on dedicated infrastructure.
              YourClaw does not access, review, or use this data except for technical maintenance purposes.
            </li>
            <li>
              Third-party AI model providers (Anthropic, OpenAI, Google) may process message content according
              to their own privacy policies. The Client should review these policies before use.
            </li>
            <li>Clients will be informed in case of a security breach, and corrective actions will be implemented immediately.</li>
            <li>Clients may request access, correction, deletion, or portability of their personal data at any time.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">8. Subscription & Termination</h2>
          <h3 className="text-xl font-medium text-white mt-6 mb-3">Duration & Renewal:</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Monthly subscriptions renew automatically each month.</li>
            <li>A free trial period may be offered. The subscription will automatically convert to a paid plan at the end of the trial unless canceled.</li>
          </ul>

          <h3 className="text-xl font-medium text-white mt-6 mb-3">Cancellation:</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Clients may cancel their subscription at any time via their dashboard or by contacting hello@yourclaw.dev.</li>
            <li>Cancellation takes effect at the end of the current billing period. No prorated refunds are provided.</li>
            <li>Upon cancellation, the Client&apos;s AI assistant container will be stopped and data deleted within 10 days.</li>
          </ul>

          <h3 className="text-xl font-medium text-white mt-6 mb-3">Non-payment:</h3>
          <p>Account suspension after 30 days of unpaid dues. The AI assistant container will be stopped during suspension.</p>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">9. Taxes & Billing</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Clients in Switzerland:</strong> Prices include Swiss VAT where applicable.</li>
            <li><strong>Clients outside Switzerland:</strong> Prices are exclusive of tax. The Client is responsible for any applicable taxes in their jurisdiction.</li>
            <li>Payments are processed via Stripe. All billing disputes should be addressed to hello@yourclaw.dev.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">10. Service Availability & Suspension</h2>
          <p>
            YourClaw aims to maintain high service availability but does not guarantee uninterrupted access.
            The service depends on third-party infrastructure and providers.
          </p>
          <p className="mt-4">YourClaw reserves the right to suspend an account without notice in case of:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Non-payment after 30 days.</li>
            <li>Violations of these Terms, including prohibited uses.</li>
            <li>Abusive usage patterns or resource consumption that impacts other users.</li>
            <li>Legal or regulatory requirements.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">11. Backups & Data</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>YourClaw does not guarantee backups of AI-generated content, workspace files, or conversation history beyond standard infrastructure measures.</li>
            <li>Clients are responsible for exporting or backing up any data they wish to retain.</li>
            <li>Upon written request within 10 days after termination, YourClaw may provide a copy of stored data where technically feasible.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">12. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, YOURCLAW SHALL NOT BE LIABLE FOR:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Any actions, outputs, code execution results, or content generated by the AI agent.</li>
            <li>Any damages resulting from the Client&apos;s reliance on AI-generated content or code.</li>
            <li>Any harm caused by the AI agent&apos;s interaction with third-party services or websites.</li>
            <li>Technical failures, service interruptions, or infrastructure outages.</li>
            <li>Third-party AI model behavior, errors, biases, or availability.</li>
            <li>Data loss or corruption in the Client&apos;s workspace or container.</li>
            <li>The Client&apos;s non-compliance with these Terms or applicable laws.</li>
            <li>Force majeure events (natural disasters, cyberattacks, regulatory changes, etc.).</li>
            <li>Any indirect, incidental, special, consequential, or punitive damages.</li>
          </ul>
          <p className="mt-4">
            IN NO EVENT SHALL YOURCLAW&apos;S TOTAL AGGREGATE LIABILITY EXCEED THE AMOUNTS PAID BY THE CLIENT
            IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">13. Intellectual Property</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>YourClaw&apos;s platform, branding, and proprietary technology remain the exclusive property of YourClaw.</li>
            <li>OpenClaw is an independent open-source project and is not owned by or affiliated with YourClaw.</li>
            <li>Content generated by the AI agent belongs to the Client, subject to the terms of the underlying AI model providers.</li>
            <li>The Client grants YourClaw no rights over their data or AI-generated content beyond what is necessary to deliver the service.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">14. Arbitration & Jurisdiction</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Any dispute arising from this Agreement will be settled through arbitration in Geneva, Switzerland.</li>
            <li>The courts of Geneva have exclusive jurisdiction in case of litigation.</li>
            <li>This Agreement is governed by and construed in accordance with Swiss law.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">15. Modifications to These Terms</h2>
          <p>
            YourClaw reserves the right to modify these Terms at any time. Material changes will be communicated
            to the Client via email or dashboard notification at least 30 days before taking effect. Continued use
            of the service after the effective date constitutes acceptance of the updated Terms.
          </p>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">16. Contact & Impressum</h2>
          <ul className="list-none space-y-2">
            <li><strong>Company Name:</strong> YourClaw (Incorporation in progress)</li>
            <li><strong>Business Address:</strong> Geneva, Switzerland (full address available upon request)</li>
            <li><strong>Email:</strong> hello@yourclaw.dev</li>
            <li><strong>Website:</strong> www.yourclaw.dev</li>
            <li><strong>Place of jurisdiction:</strong> Geneva, Switzerland</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-12 mb-4">Disclaimer</h2>
          <p>
            YourClaw is an infrastructure provider that hosts and delivers OpenClaw instances. YourClaw does not
            develop, train, or control the AI models or the OpenClaw software. Despite careful content control,
            we assume no liability for the content of external links, AI-generated outputs, or actions performed
            by the AI agent. The Client is solely responsible for all use of the service and any consequences thereof.
          </p>
        </div>
      </div>
    </div>
  );
}
