export type MailAiAction = "summarize" | "draft" | "draft_reply" | "polish";

export interface MailAiRequest {
  action: MailAiAction;
  subject: string;
  body: string;
  senderName: string;
  userName: string;
  language: "en" | "ar";
}

const aiEndpoint = (): string | undefined => {
  const configured = import.meta.env.VITE_MAIL_AI_ENDPOINT;
  return typeof configured === "string" && configured.trim() ? configured.trim() : undefined;
};

export const isMailAiEndpointConfigured = (): boolean => Boolean(aiEndpoint());

const buildLocalDemoResponse = (request: MailAiRequest): string => {
  const normalizedBody = request.body.replace(/\r/g, "").trim();
  if (request.action === "draft_reply") {
    if (request.language === "ar") {
      return `مرحباً ${request.senderName}،\n\nشكراً لرسالتك بخصوص «${request.subject}». اطلعت على التفاصيل وسأتابع الخطوات التالية قريباً.\n\nمع التحية،\n${request.userName}`;
    }
    return `Hi ${request.senderName},\n\nThanks for your email about “${request.subject}”. I’ve reviewed the details and will follow up with the next steps shortly.\n\nBest,\n${request.userName}`;
  }

  if (request.action === "draft") {
    if (request.language === "ar") {
      return `مرحباً ${request.senderName}،\n\nأكتب إليك بخصوص «${request.subject}».\n\nيرجى إخباري إذا كانت لديك أي أسئلة أو تحتاج إلى مزيد من التفاصيل.\n\nمع التحية،\n${request.userName}`;
    }
    return `Hi ${request.senderName},\n\nI’m reaching out regarding “${request.subject}”.\n\nPlease let me know if you have any questions or need more details.\n\nBest,\n${request.userName}`;
  }

  if (request.action === "polish") {
    const cleaned = normalizedBody
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n");
    return request.language === "ar"
      ? `مسودة منسقة للمراجعة — الوضع التجريبي:\n\n${cleaned}`
      : `Polished draft for review — demo mode:\n\n${cleaned}`;
  }

  const lines = normalizedBody
    .split(/\n+/)
    .map((line) => line.replace(/^[•\-*\s]+/, "").trim())
    .filter((line) => line && !/^(hello|hi|dear|regards|best|thanks|مرحباً|مع التحية|شكراً)[\s,!،]*/i.test(line));
  const sentences = lines
    .flatMap((line) => line.match(/[^.!?؟]+[.!?؟]?/g) ?? [line])
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3);
  const clipped = sentences.map((part) => part.length > 220 ? `${part.slice(0, 217)}…` : part);
  if (request.language === "ar") {
    return `ملخص تجريبي للمراجعة:\n${clipped.length ? clipped.map((line) => `• ${line}`).join("\n") : "• راجع محتوى الرسالة وحدد الإجراء المطلوب."}`;
  }
  return `Demo summary for review:\n${clipped.length ? clipped.map((line) => `• ${line}`).join("\n") : "• Review the message and identify the requested next step."}`;
};

/**
 * Uses a same-origin/approved backend endpoint when VITE_MAIL_AI_ENDPOINT is configured.
 * Without that endpoint the UI uses a deterministic demo helper; no provider key is shipped
 * to the browser and no email content is sent to a third party by this fallback.
 */
export const runMailAi = async (request: MailAiRequest): Promise<string> => {
  const endpoint = aiEndpoint();
  if (!endpoint) return buildLocalDemoResponse(request);

  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });
  if (!response.ok) throw new Error(`Mail AI endpoint returned ${response.status}`);
  const payload = await response.json() as { result?: unknown };
  if (typeof payload.result !== "string" || !payload.result.trim()) {
    throw new Error("Mail AI endpoint returned an invalid result");
  }
  return payload.result;
};
