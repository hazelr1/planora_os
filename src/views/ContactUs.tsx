import { Mail, Github, MessageCircleQuestion } from 'lucide-react';

const CHANNELS = [
  {
    icon: Mail,
    title: 'Email us',
    description: 'General questions, feedback, or anything else on your mind.',
    action: 'hello@planora.app',
    href: 'mailto:hello@planora.app',
  },
  {
    icon: Github,
    title: 'Report a bug',
    description: "Found something broken? Open an issue and we'll take a look.",
    action: 'Open an issue on GitHub',
    href: 'https://github.com/hazelr1/planora_os/issues',
  },
];

const FAQS = [
  {
    q: 'Is Planora free to use?',
    a: 'Yes — you can generate itineraries, edit every detail, and use the AI copilot without a paid plan. Try Demo on the landing page lets you explore a full trip with no sign-up at all.',
  },
  {
    q: 'Are the prices and times shown accurate?',
    a: "Everything Planora estimates — costs, durations, availability — is AI-generated guidance, not a live quote. Always verify important details (opening hours, reservations, prices) before booking.",
  },
  {
    q: 'Can I delete my account and data?',
    a: 'Yes, any time — go to Settings → Account info → Delete account. This permanently removes your account and every trip you\'ve created.',
  },
];

export default function ContactUs() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-800 text-ink-900">Contact us</h1>
        <p className="text-ink-600 mt-1 text-sm">Have a question, found a bug, or just want to say hi? Here's how to reach us.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {CHANNELS.map(({ icon: Icon, title, description, action, href }) => (
          <a
            key={title}
            href={href}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="card card-interactive p-5"
          >
            <div className="h-10 w-10 rounded-xl bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center mb-3.5">
              <Icon size={18} />
            </div>
            <h2 className="font-display text-sm font-700 text-ink-900">{title}</h2>
            <p className="text-xs text-ink-600 mt-1 leading-relaxed">{description}</p>
            <p className="text-sm font-600 text-brand-700 dark:text-brand-300 mt-3">{action}</p>
          </a>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <MessageCircleQuestion size={16} className="text-ink-500" />
        <h2 className="font-display text-base font-700 text-ink-900">Frequently asked</h2>
      </div>

      <div className="space-y-3">
        {FAQS.map(({ q, a }) => (
          <div key={q} className="card p-5">
            <h3 className="text-sm font-700 text-ink-900">{q}</h3>
            <p className="text-sm text-ink-600 mt-1.5 leading-relaxed">{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
