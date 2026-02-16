"use client";

export default function WhatsAppMockup() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#0b141a",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: 375,
          height: 740,
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        {/* Status bar */}
        <div
          style={{
            background: "#1f2c34",
            padding: "8px 16px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            color: "#e9edef",
          }}
        >
          <span>9:41</span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
              <rect x="0" y="8" width="3" height="4" rx="0.5" fill="#e9edef" />
              <rect x="4.5" y="5" width="3" height="7" rx="0.5" fill="#e9edef" />
              <rect x="9" y="2" width="3" height="10" rx="0.5" fill="#e9edef" />
              <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="#e9edef" />
            </svg>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="#e9edef">
              <path d="M8 2C5.2 2 2.7 3.1 1 5l1.4 1.4C3.8 4.8 5.8 4 8 4s4.2.8 5.6 2.4L15 5c-1.7-1.9-4.2-3-7-3zm0 4c-1.7 0-3.2.7-4.2 1.8L5.2 9.2C5.9 8.5 6.9 8 8 8s2.1.5 2.8 1.2l1.4-1.4C11.2 6.7 9.7 6 8 6zm0 4c-.8 0-1.6.3-2.1.9L8 13l2.1-2.1C9.6 10.3 8.8 10 8 10z" />
            </svg>
            <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
              <rect
                x="0.5"
                y="0.5"
                width="21"
                height="11"
                rx="2"
                stroke="#e9edef"
                strokeOpacity="0.4"
              />
              <rect x="2" y="2" width="16" height="8" rx="1" fill="#4ade80" />
              <rect x="23" y="4" width="2" height="4" rx="1" fill="#e9edef" fillOpacity="0.4" />
            </svg>
          </div>
        </div>

        {/* Header */}
        <div
          style={{
            background: "#1f2c34",
            padding: "10px 12px 10px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="#00a884"
          >
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          {/* YourClaw logo */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #34d399, #22d3ee)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 700,
              color: "#18181b",
              flexShrink: 0,
            }}
          >
            Y
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: "#e9edef",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              YourClaw · Meta Ads
            </div>
            <div style={{ color: "#8696a0", fontSize: 12 }}>online</div>
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#aebac1">
              <path d="M15.25 10.01L20 5.01v14l-4.75-5h-3.5c-.83 0-1.5-.67-1.5-1.5v-1c0-.83.67-1.5 1.5-1.5h3.5zM4.5 8.01h5c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1h-5c-.55 0-1-.45-1-1v-6c0-.55.45-1 1-1z" />
            </svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#aebac1">
              <path d="M6.54 5c.06.89.21 1.76.45 2.59l-1.2 1.2c-.41-1.2-.67-2.47-.76-3.79h1.51m9.86 12.02c.85.24 1.72.39 2.6.45v1.49c-1.32-.09-2.59-.35-3.8-.75l1.2-1.19M7.5 3H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.49c0-.55-.45-1-1-1-1.24 0-2.45-.2-3.57-.57-.1-.04-.21-.05-.31-.05-.26 0-.51.1-.71.29l-2.2 2.2c-2.83-1.45-5.15-3.76-6.59-6.59l2.2-2.2c.28-.28.36-.67.25-1.02C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1z" />
            </svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#aebac1">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </div>
        </div>

        {/* Chat area */}
        <div
          style={{
            flex: 1,
            background: "#0b141a",
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            padding: "12px 14px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {/* Date chip */}
          <div
            style={{
              textAlign: "center",
              margin: "4px 0 8px",
            }}
          >
            <span
              style={{
                background: "#182229",
                color: "#8696a0",
                fontSize: 11,
                padding: "4px 12px",
                borderRadius: 6,
              }}
            >
              Today
            </span>
          </div>

          {/* User message 1 */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 2 }}>
            <div
              style={{
                background: "#005c4b",
                color: "#e9edef",
                padding: "6px 10px 4px",
                borderRadius: "8px 0 8px 8px",
                maxWidth: "80%",
                fontSize: 14,
                lineHeight: 1.4,
              }}
            >
              Hey, I need to launch a new campaign for my e-commerce store. Budget $50/day, targeting US women 25-45.
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 4,
                  marginTop: 2,
                }}
              >
                <span style={{ fontSize: 11, color: "#8696a0" }}>9:32</span>
                <svg width="16" height="10" viewBox="0 0 16 11" fill="#53bdeb">
                  <path d="M11.07 0L5.5 5.57 3.93 4l-1.06 1.07L5.5 7.7l6.63-6.63L11.07 0zM8.5 0L2.93 5.57 1.36 4 .3 5.07 2.93 7.7l6.63-6.63L8.5 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Bot message 1 */}
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 2 }}>
            <div
              style={{
                background: "#1f2c34",
                color: "#e9edef",
                padding: "6px 10px 4px",
                borderRadius: "0 8px 8px 8px",
                maxWidth: "80%",
                fontSize: 14,
                lineHeight: 1.4,
              }}
            >
              Got it! Setting up your campaign now 🚀
              <br /><br />
              <div style={{ background: "#182229", borderRadius: 6, padding: "8px 10px", margin: "2px 0" }}>
                <div style={{ fontSize: 11, color: "#00a884", fontWeight: 600, marginBottom: 4 }}>CAMPAIGN SETUP</div>
                <div style={{ fontSize: 13, color: "#8696a0" }}>
                  Objective: <span style={{ color: "#e9edef" }}>Conversions</span><br />
                  Budget: <span style={{ color: "#e9edef" }}>$50/day</span><br />
                  Audience: <span style={{ color: "#e9edef" }}>US · Women · 25-45</span><br />
                  Placements: <span style={{ color: "#e9edef" }}>Auto (Feed + Stories + Reels)</span>
                </div>
              </div>
              <br />
              I need your ad creative. Send me the image or video + your copy and CTA.
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 2 }}>
                <span style={{ fontSize: 11, color: "#8696a0" }}>9:32</span>
              </div>
            </div>
          </div>

          {/* User message 2 */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 2 }}>
            <div
              style={{
                background: "#005c4b",
                color: "#e9edef",
                padding: "6px 10px 4px",
                borderRadius: "8px 0 8px 8px",
                maxWidth: "80%",
                fontSize: 14,
                lineHeight: 1.4,
              }}
            >
              Here&apos;s the creative 📸 Headline: &quot;Summer Sale — 40% Off Everything&quot;. CTA: Shop Now.
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 4,
                  marginTop: 2,
                }}
              >
                <span style={{ fontSize: 11, color: "#8696a0" }}>9:33</span>
                <svg width="16" height="10" viewBox="0 0 16 11" fill="#53bdeb">
                  <path d="M11.07 0L5.5 5.57 3.93 4l-1.06 1.07L5.5 7.7l6.63-6.63L11.07 0zM8.5 0L2.93 5.57 1.36 4 .3 5.07 2.93 7.7l6.63-6.63L8.5 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Bot message 2 */}
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 2 }}>
            <div
              style={{
                background: "#1f2c34",
                color: "#e9edef",
                padding: "6px 10px 4px",
                borderRadius: "0 8px 8px 8px",
                maxWidth: "80%",
                fontSize: 14,
                lineHeight: 1.4,
              }}
            >
              Done ✅ Campaign is live.
              <br /><br />
              <div style={{ background: "#182229", borderRadius: 6, padding: "8px 10px", margin: "2px 0" }}>
                <div style={{ fontSize: 11, color: "#00a884", fontWeight: 600, marginBottom: 4 }}>📊 LIVE STATUS</div>
                <div style={{ fontSize: 13, color: "#8696a0" }}>
                  Campaign: <span style={{ color: "#e9edef" }}>Summer Sale 2026</span><br />
                  Status: <span style={{ color: "#4ade80" }}>● Active</span><br />
                  Creative: <span style={{ color: "#e9edef" }}>Summer Sale 📸</span><br />
                  Est. reach: <span style={{ color: "#e9edef" }}>12K-35K/day</span>
                </div>
              </div>
              <br />
              I&apos;ll send you a performance report tonight at 8pm. Want me to A/B test the headline too?
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 2 }}>
                <span style={{ fontSize: 11, color: "#8696a0" }}>9:33</span>
              </div>
            </div>
          </div>

          {/* User message 3 */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 2 }}>
            <div
              style={{
                background: "#005c4b",
                color: "#e9edef",
                padding: "6px 10px 4px",
                borderRadius: "8px 0 8px 8px",
                maxWidth: "80%",
                fontSize: 14,
                lineHeight: 1.4,
              }}
            >
              Yes do the A/B test. And pause the old campaign from last week.
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 4,
                  marginTop: 2,
                }}
              >
                <span style={{ fontSize: 11, color: "#8696a0" }}>9:34</span>
                <svg width="16" height="10" viewBox="0 0 16 11" fill="#53bdeb">
                  <path d="M11.07 0L5.5 5.57 3.93 4l-1.06 1.07L5.5 7.7l6.63-6.63L11.07 0zM8.5 0L2.93 5.57 1.36 4 .3 5.07 2.93 7.7l6.63-6.63L8.5 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Bot message 3 */}
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 2 }}>
            <div
              style={{
                background: "#1f2c34",
                color: "#e9edef",
                padding: "6px 10px 4px",
                borderRadius: "0 8px 8px 8px",
                maxWidth: "80%",
                fontSize: 14,
                lineHeight: 1.4,
              }}
            >
              On it 👇
              <br /><br />
              ✅ A/B test created — testing &quot;Summer Sale&quot; vs &quot;Last Chance: 40% Off&quot;
              <br />
              ⏸️ Old campaign &quot;Spring Collection&quot; paused
              <br /><br />
              All managed. You&apos;ll get your report at 8pm 📈
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 2 }}>
                <span style={{ fontSize: 11, color: "#8696a0" }}>9:34</span>
              </div>
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div
          style={{
            background: "#1f2c34",
            padding: "6px 8px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#8696a0">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
          </svg>
          <div
            style={{
              flex: 1,
              background: "#2a3942",
              borderRadius: 20,
              padding: "8px 14px",
              color: "#8696a0",
              fontSize: 14,
            }}
          >
            Message
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#8696a0">
            <path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V22h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
