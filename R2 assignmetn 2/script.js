const navbar = document.getElementById('navbar');
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.getElementById('navLinks');

// Scroll effect
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Mobile menu toggle
mobileToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    const icon = mobileToggle.querySelector('i');
    icon.classList.toggle('fa-bars');
    icon.classList.toggle('fa-times');
});

// Close mobile menu on link click
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        const icon = mobileToggle.querySelector('i');
        icon.classList.add('fa-bars');
        icon.classList.remove('fa-times');
    });
});

// ==================== Text Analyzer ====================
const textInput = document.getElementById('textInput');
const charCount = document.getElementById('charCount');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const sampleBtn = document.getElementById('sampleBtn');
const resultsArea = document.getElementById('resultsArea');

// Character count
textInput.addEventListener('input', () => {
    charCount.textContent = textInput.value.length;
});

// Sample text
const sampleText = `Hi, my name is Ahmed Khan. You can reach me at ahmed.khan@gmail.com or contact my work email ahmed.k@company.org.pk for business inquiries.

My phone number is 0321-1234567 and you can also call me at +92 300 9876543. For emergencies, reach my landline at 042-35761234.

For verification, my CNIC number is 35201-1234567-1. My wife's CNIC is 42101-7654321-2.

Account details: username is ahmed_khan92, password is MyS3cur3P@ss! and the backup password: Khan@2024secure. Please don't share my password with anyone.

Also, my old colleague's email is sara.ahmed@yahoo.com and her number is 0333-4567890.`;

sampleBtn.addEventListener('click', () => {
    textInput.value = sampleText;
    charCount.textContent = sampleText.length;
    textInput.focus();
});

// Clear
clearBtn.addEventListener('click', () => {
    textInput.value = '';
    charCount.textContent = '0';
    resultsArea.style.display = 'none';
    textInput.focus();
});

// ==================== Analysis Engine ====================
const patterns = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    phone: /(?:\+92[\s-]?\d{3}[\s-]?\d{7})|(?:0\d{2,3}[\s-]?\d{7,8})|(?:0\d{3}[\s-]?\d{7})/g,
    cnic: /\d{5}-\d{7}-\d{1}/g,
    password: /(?:password|passwd|pass|pwd|passcode)[\s]*[:\-=is]*\s*[^\s,;.!?\n]{3,}/gi
};

function analyzeText(text) {
    const results = {
        emails: [],
        phones: [],
        cnics: [],
        passwords: []
    };

    // Find emails
    let match;
    const emailRegex = new RegExp(patterns.email.source, 'g');
    while ((match = emailRegex.exec(text)) !== null) {
        if (!results.emails.includes(match[0])) {
            results.emails.push(match[0]);
        }
    }

    // Find phone numbers
    const phoneRegex = new RegExp(patterns.phone.source, 'g');
    while ((match = phoneRegex.exec(text)) !== null) {
        const cleaned = match[0].trim();
        if (!results.phones.includes(cleaned)) {
            results.phones.push(cleaned);
        }
    }

    // Find CNICs
    const cnicRegex = new RegExp(patterns.cnic.source, 'g');
    while ((match = cnicRegex.exec(text)) !== null) {
        if (!results.cnics.includes(match[0])) {
            results.cnics.push(match[0]);
        }
    }

    // Find password keywords and values
    const passwordRegex = new RegExp(patterns.password.source, 'gi');
    while ((match = passwordRegex.exec(text)) !== null) {
        if (!results.passwords.includes(match[0])) {
            results.passwords.push(match[0]);
        }
    }

    return results;
}

function calculateRiskScore(results) {
    let score = 0;
    score += results.emails.length * 15;
    score += results.phones.length * 20;
    score += results.cnics.length * 30;
    score += results.passwords.length * 35;
    return Math.min(score, 100);
}

function getRiskLevel(score) {
    if (score === 0) return { level: 'safe', label: 'Safe', color: '#10b981' };
    if (score <= 20) return { level: 'low', label: 'Low Risk', color: '#059669' };
    if (score <= 50) return { level: 'medium', label: 'Medium Risk', color: '#f59e0b' };
    if (score <= 75) return { level: 'high', label: 'High Risk', color: '#dc2626' };
    return { level: 'critical', label: 'Critical', color: '#991b1b' };
}

function highlightText(text, results) {
    let highlighted = escapeHtml(text);

    // Sort all matches by length (longest first) to avoid partial replacements
    const replacements = [];

    results.passwords.forEach(p => {
        replacements.push({ text: p, type: 'password' });
    });
    results.emails.forEach(e => {
        replacements.push({ text: e, type: 'email' });
    });
    results.cnics.forEach(c => {
        replacements.push({ text: c, type: 'cnic' });
    });
    results.phones.forEach(ph => {
        replacements.push({ text: ph, type: 'phone' });
    });

    // Sort by text length descending
    replacements.sort((a, b) => b.text.length - a.text.length);

    replacements.forEach(rep => {
        const escaped = escapeHtml(rep.text);
        const regex = new RegExp(escapeRegex(escaped), 'g');
        highlighted = highlighted.replace(regex, `<span class="highlight-${rep.type}">${escaped}</span>`);
    });

    // Preserve line breaks
    highlighted = highlighted.replace(/\n/g, '<br>');

    return highlighted;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function generateRecommendations(results) {
    const recommendations = [];

    if (results.emails.length > 0) {
        recommendations.push({
            type: 'warning',
            icon: 'fas fa-envelope',
            title: 'Email Addresses Detected',
            text: `Found ${results.emails.length} email address(es). Avoid sharing email addresses in public posts. Use contact forms or masked emails (e.g., user***@domain.com) instead.`
        });
    }

    if (results.phones.length > 0) {
        recommendations.push({
            type: 'warning',
            icon: 'fas fa-phone',
            title: 'Phone Numbers Exposed',
            text: `Found ${results.phones.length} phone number(s). Phone numbers can be used for phishing and spam calls. Consider using a virtual number for public communications.`
        });
    }

    if (results.cnics.length > 0) {
        recommendations.push({
            type: 'danger',
            icon: 'fas fa-id-card',
            title: 'CNIC Numbers — High Risk!',
            text: `Found ${results.cnics.length} CNIC number(s). CNIC numbers are highly sensitive identity documents. Never share them online. This can lead to identity theft and fraud.`
        });
    }

    if (results.passwords.length > 0) {
        recommendations.push({
            type: 'danger',
            icon: 'fas fa-key',
            title: 'Password Information Detected!',
            text: `Found ${results.passwords.length} password reference(s). Never include passwords in plain text messages, emails, or documents. Use a password manager to share credentials securely.`
        });
    }

    if (results.emails.length === 0 && results.phones.length === 0 &&
        results.cnics.length === 0 && results.passwords.length === 0) {
        recommendations.push({
            type: 'success',
            icon: 'fas fa-check-circle',
            title: 'No Sensitive Data Detected',
            text: 'Great news! No sensitive information patterns were detected in your text. Always double-check before sharing content publicly.'
        });
    }

    // General recommendations
    recommendations.push({
        type: 'info',
        icon: 'fas fa-shield-halved',
        title: 'General Privacy Tips',
        text: 'Always review content before posting online. Use two-factor authentication, unique passwords for each account, and be cautious with personal information in public forums.'
    });

    return recommendations;
}

// ==================== Analyze Button Handler ====================
analyzeBtn.addEventListener('click', () => {
    const text = textInput.value.trim();

    if (!text) {
        shakeElement(textInput);
        textInput.focus();
        return;
    }

    const results = analyzeText(text);
    const riskScore = calculateRiskScore(results);
    const riskLevel = getRiskLevel(riskScore);

    // Show results
    resultsArea.style.display = 'block';

    // Scroll to results
    setTimeout(() => {
        resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    // Update risk score
    const riskFill = document.getElementById('riskFill');
    const riskBadge = document.getElementById('riskBadge');
    const riskDescription = document.getElementById('riskDescription');

    riskFill.style.width = riskScore + '%';
    riskFill.style.background = `linear-gradient(90deg, ${riskLevel.color}, ${riskLevel.color})`;
    riskBadge.textContent = riskLevel.label;
    riskBadge.className = 'risk-badge ' + riskLevel.level;

    const descriptions = {
        safe: 'Your text appears clean with no detectable sensitive information. Still, always review content before sharing publicly.',
        low: 'Minor sensitive information detected. Review the highlighted items and consider removing or masking them before sharing.',
        medium: 'Several pieces of sensitive information found. It is recommended to remove or redact personal data before sharing this text.',
        high: 'Significant amount of sensitive data detected! Strongly consider removing personal information before this text is shared anywhere.',
        critical: 'Critical privacy risk! Multiple types of highly sensitive data detected. Do NOT share this text publicly without thorough redaction.'
    };
    riskDescription.textContent = descriptions[riskLevel.level];

    // Update highlighted text
    document.getElementById('highlightedText').innerHTML = highlightText(text, results);

    // Update detection cards
    updateDetectionCard('email', results.emails);
    updateDetectionCard('phone', results.phones);
    updateDetectionCard('cnic', results.cnics);
    updateDetectionCard('password', results.passwords);

    // Update recommendations
    const recommendations = generateRecommendations(results);
    const recList = document.getElementById('recommendationsList');
    recList.innerHTML = recommendations.map(rec => `
        <div class="recommendation-item ${rec.type}">
            <div class="rec-icon"><i class="${rec.icon}"></i></div>
            <div class="rec-content">
                <h4>${rec.title}</h4>
                <p>${rec.text}</p>
            </div>
        </div>
    `).join('');
});

function updateDetectionCard(type, items) {
    const countEl = document.getElementById(type + 'Count');
    const itemsEl = document.getElementById(type + 'Items');
    const cardEl = document.getElementById(type + 'Detection');

    countEl.textContent = items.length;
    cardEl.classList.toggle('has-items', items.length > 0);

    if (items.length > 0) {
        itemsEl.innerHTML = items.map(item =>
            `<span class="detection-item-tag">${escapeHtml(item)}</span>`
        ).join('');
    } else {
        itemsEl.innerHTML = '<span style="font-size:0.8rem;color:var(--text-muted)">None detected</span>';
    }
}

function shakeElement(el) {
    el.style.animation = 'none';
    el.offsetHeight; // trigger reflow
    el.style.animation = 'shake 0.5s ease';
    el.style.borderColor = '#ef4444';
    setTimeout(() => {
        el.style.borderColor = '';
        el.style.animation = '';
    }, 1000);
}

// Add shake animation
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
    }
`;
document.head.appendChild(shakeStyle);

// ==================== Report Functions ====================
document.getElementById('downloadReport').addEventListener('click', () => {
    const text = textInput.value.trim();
    if (!text) return;

    const results = analyzeText(text);
    const riskScore = calculateRiskScore(results);
    const riskLevel = getRiskLevel(riskScore);

    let report = `
╔══════════════════════════════════════════════╗
║        PRIVATE ID - PRIVACY REPORT           ║
╚══════════════════════════════════════════════╝

Generated: ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RISK ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Risk Score: ${riskScore}/100
Risk Level: ${riskLevel.label}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DETECTION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📧 Emails Found (${results.emails.length}):
${results.emails.length ? results.emails.map(e => '   • ' + e).join('\n') : '   None detected'}

📱 Phone Numbers (${results.phones.length}):
${results.phones.length ? results.phones.map(p => '   • ' + p).join('\n') : '   None detected'}

🪪 CNIC Numbers (${results.cnics.length}):
${results.cnics.length ? results.cnics.map(c => '   • ' + c).join('\n') : '   None detected'}

🔑 Password References (${results.passwords.length}):
${results.passwords.length ? results.passwords.map(p => '   • ' + p).join('\n') : '   None detected'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${generateRecommendations(results).map(r => `⚡ ${r.title}\n   ${r.text}`).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANALYZED TEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Report generated by PrivateID - privateid.com
Your data stays in your browser. Nothing was uploaded.
`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PrivateID_Report_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('copyReport').addEventListener('click', () => {
    const text = textInput.value.trim();
    if (!text) return;

    const results = analyzeText(text);
    const riskScore = calculateRiskScore(results);
    const riskLevel = getRiskLevel(riskScore);

    const summary = `PrivateID Privacy Report
Risk: ${riskLevel.label} (${riskScore}/100)
Emails: ${results.emails.length} | Phones: ${results.phones.length} | CNICs: ${results.cnics.length} | Passwords: ${results.passwords.length}`;

    navigator.clipboard.writeText(summary).then(() => {
        const btn = document.getElementById('copyReport');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        btn.style.borderColor = 'var(--success)';
        btn.style.color = 'var(--success)';
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.borderColor = '';
            btn.style.color = '';
        }, 2000);
    });
});

// ==================== AI Privacy Chatbot ====================
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatSuggestions = document.getElementById('chatSuggestions');

const knowledgeBase = {
    email: {
        keywords: ['email', 'e-mail', 'mail', 'inbox', 'gmail', 'yahoo', 'outlook', 'spam', 'phishing email'],
        response: `📧 **Email Privacy Protection Tips:**

• Use separate emails for personal and professional use
• Never share your primary email on public forums
• Use email aliases or masked emails (e.g., SimpleLogin, Firefox Relay)
• Enable two-factor authentication (2FA) on all email accounts
• Be cautious of phishing emails — verify sender addresses
• Don't click suspicious links in emails
• Regularly check "Have I Been Pwned" to see if your email was in a data breach
• Use encrypted email services like ProtonMail for sensitive communications`
    },
    password: {
        keywords: ['password', 'passwd', 'pass', 'credential', 'login', 'strong password', 'password manager', 'secure password'],
        response: `🔑 **Password Security Best Practices:**

• Use a minimum of 12 characters with uppercase, lowercase, numbers, and symbols
• Never reuse passwords across different accounts
• Use a reputable password manager (e.g., Bitwarden, 1Password, LastPass)
• Enable two-factor authentication wherever possible
• Never share passwords via plain text messages or emails
• Change passwords immediately if you suspect a breach
• Avoid using personal info (birthdays, names) in passwords
• Consider using passphrases: "Correct-Horse-Battery-Staple" is stronger than "P@ss1"`
    },
    phone: {
        keywords: ['phone', 'number', 'call', 'mobile', 'cell', 'sms', 'text message', 'sim', 'whatsapp'],
        response: `📱 **Phone Number Safety:**

• Don't publicly share your phone number on social media
• Use a secondary/virtual number for online registrations (e.g., Google Voice)
• Be aware of SIM swapping attacks — contact your carrier to add a PIN
• Don't respond to unknown numbers or suspicious texts
• Enable spam call filters on your phone
• Be cautious when asked for OTPs — never share them with anyone
• Review app permissions — not all apps need access to your contacts
• Consider using Signal or WhatsApp (with disappearing messages) for private communication`
    },
    cnic: {
        keywords: ['cnic', 'national id', 'identity card', 'nadra', 'identity', 'id card', 'nic', 'citizenship'],
        response: `🪪 **CNIC Protection Advice:**

• NEVER share your CNIC number online or in unsecured channels
• CNIC numbers can be used for identity theft, fraudulent SIM registrations, and bank fraud
• Only provide CNIC to verified government agencies and trusted institutions
• If sharing a copy, watermark it with the purpose (e.g., "For bank verification only")
• Report lost CNICs to NADRA immediately
• Regularly verify your CNIC-linked SIMs via PTA's DIRBS system
• Be cautious of services requesting CNIC photos — ask why they need it
• Store physical CNIC copies in a secure location`
    },
    privacy: {
        keywords: ['privacy', 'private', 'data', 'secure', 'security', 'protect', 'safety', 'safe', 'digital', 'online safety', 'tips'],
        response: `🛡️ **General Digital Privacy Tips:**

• Regularly review privacy settings on social media accounts
• Use a VPN when connecting to public Wi-Fi networks
• Keep your devices and software updated with security patches
• Be mindful of what you share online — it's hard to take back
• Use end-to-end encrypted messaging apps
• Review and revoke unused app permissions
• Use different usernames across platforms
• Enable login notifications on important accounts
• Regularly back up your data securely
• Educate family members about online safety`
    },
    breach: {
        keywords: ['breach', 'hack', 'hacked', 'leaked', 'compromised', 'stolen', 'data breach'],
        response: `🚨 **What To Do After a Data Breach:**

• Change passwords immediately for affected accounts
• Enable 2FA on all critical accounts
• Check haveibeenpwned.com to see what data was exposed
• Monitor bank statements and credit reports for suspicious activity
• Report identity theft to relevant authorities (FIA Cyber Crime in Pakistan)
• Be extra cautious of phishing attempts after a breach
• Consider freezing your credit if financial data was exposed
• Update security questions on important accounts
• Alert your contacts if your email/social media was compromised`
    },
    vpn: {
        keywords: ['vpn', 'proxy', 'tor', 'anonymous', 'browsing', 'tracking', 'cookies'],
        response: `🌐 **VPN & Anonymous Browsing:**

• Use a reputable VPN service to encrypt your internet traffic
• VPNs are essential when using public Wi-Fi
• Consider using Tor Browser for maximum anonymity
• Clear cookies and browsing data regularly
• Use browser extensions like uBlock Origin and Privacy Badger
• Be aware that free VPNs may sell your data
• Use private/incognito browsing for sensitive searches
• Consider using DNS-over-HTTPS for additional privacy`
    },
    social: {
        keywords: ['social media', 'facebook', 'instagram', 'twitter', 'tiktok', 'linkedin', 'posting', 'profile'],
        response: `📱 **Social Media Privacy:**

• Review and restrict your privacy settings on all platforms
• Limit who can see your posts, friends list, and personal info
• Be cautious about sharing location data in posts
• Don't accept friend requests from strangers
• Avoid sharing personal details like birthdate, address, or workplace
• Regularly audit third-party app connections
• Use strong, unique passwords for each social account
• Think twice before posting — once online, always online`
    },
    greeting: {
        keywords: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'help', 'assist'],
        response: `Hello! 👋 Welcome to PrivateID's AI Privacy Assistant!

I'm here to help you with digital privacy and security questions. Here are some topics I can help with:

• 📧 Email protection
• 🔑 Password security
• 📱 Phone number safety
• 🪪 CNIC protection
• 🛡️ General digital privacy
• 🚨 Data breach response
• 🌐 VPN & anonymous browsing
• 📱 Social media privacy

What would you like to know about?`
    },
    thanks: {
        keywords: ['thank', 'thanks', 'thank you', 'appreciate', 'helpful', 'great'],
        response: `You're welcome! 😊 I'm glad I could help!

Remember, digital privacy is an ongoing practice. Stay vigilant and always think before sharing personal information online.

Feel free to ask me anything else about privacy and security! 🛡️`
    }
};

function findBestResponse(query) {
    const lowerQuery = query.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const [topic, data] of Object.entries(knowledgeBase)) {
        let score = 0;
        for (const keyword of data.keywords) {
            if (lowerQuery.includes(keyword)) {
                score += keyword.length; // Longer keyword matches score higher
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = data.response;
        }
    }

    if (!bestMatch) {
        bestMatch = `🤔 I don't have a specific answer for that, but here are some general tips:

• Never share personal information on untrusted platforms
• Use strong, unique passwords with a password manager
• Enable two-factor authentication everywhere
• Stay updated on the latest security threats
• Use our Text Analyzer tool to scan for sensitive data before sharing

Try asking about specific topics like "email security", "password tips", "CNIC protection", or "VPN usage"!`;
    }

    return bestMatch;
}

function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

    const content = document.createElement('div');
    content.className = 'message-content';

    // Convert markdown-like formatting to HTML
    let formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
        .replace(/• /g, '&bull; ');

    content.innerHTML = `<p>${formattedText}</p>`;

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    chatMessages.appendChild(messageDiv);

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleChatSend() {
    const query = chatInput.value.trim();
    if (!query) return;

    // Add user message
    addMessage(query, true);
    chatInput.value = '';

    // Hide suggestions after first message
    chatSuggestions.style.display = 'none';

    // Simulate typing delay
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message';
    typingDiv.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content"><p><em>Typing...</em></p></div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    setTimeout(() => {
        chatMessages.removeChild(typingDiv);
        const response = findBestResponse(query);
        addMessage(response, false);
    }, 800 + Math.random() * 700);
}

chatSendBtn.addEventListener('click', handleChatSend);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatSend();
});

// Suggestion buttons
document.querySelectorAll('.suggestion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        chatInput.value = btn.dataset.query;
        handleChatSend();
    });
});

// Floating chat button
document.getElementById('floatingChatBtn').addEventListener('click', () => {
    document.getElementById('chatbot-section').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => chatInput.focus(), 500);
});

// ==================== Smooth Scroll & Animations ====================
// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.feature-card, .step-card, .detection-card, .trust-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Staggered animation for feature cards
document.querySelectorAll('.feature-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.1}s`;
});

document.querySelectorAll('.step-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.15}s`;
});


