export interface EmailTemplateCatalogItem {
    id: string;
    name: string;
    trigger: string;
    summary: string;
    audience: string;
    variables: string[];
    accentClass: string;
}

export const emailTemplateCatalog: EmailTemplateCatalogItem[] = [
    {
        id: "register-success",
        name: "Welcome Email",
        trigger: "Successful account registration",
        summary: "Greets the player, highlights core actions, and drives them back into the product.",
        audience: "All newly registered users",
        variables: ["platformName", "username", "siteUrl"],
        accentClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    },
    {
        id: "deposit-success",
        name: "Deposit Confirmation",
        trigger: "Approved deposit transaction",
        summary: "Confirms wallet credit, amount, and timestamp with a strong play-again CTA.",
        audience: "Users with successful fiat or crypto deposits",
        variables: ["platformName", "username", "amount", "currency", "siteUrl"],
        accentClass: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    },
    {
        id: "withdrawal-success",
        name: "Withdrawal Processed",
        trigger: "Approved and dispatched withdrawal",
        summary: "Communicates the processed payout, expected arrival window, and support guidance.",
        audience: "Users with completed withdrawals",
        variables: ["platformName", "username", "amount", "currency", "siteUrl"],
        accentClass: "border-violet-500/20 bg-violet-500/10 text-violet-300",
    },
    {
        id: "forgot-password",
        name: "Password Reset",
        trigger: "Forgot password request",
        summary: "Sends the secure reset link with expiry guidance and fallback URL text.",
        audience: "Users requesting a password reset",
        variables: ["platformName", "resetLink", "username"],
        accentClass: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    },
];

export const emailLaunchChecklist = [
    "Configure SMTP host, port, sender name, and sender email in Site Config.",
    "Send a test email from Site Config before enabling live campaigns.",
    "Review transactional templates so copy and CTA links match the active brand.",
    "Use WhatsApp broadcasts for outbound bulk messaging until email broadcast automation is added.",
];
