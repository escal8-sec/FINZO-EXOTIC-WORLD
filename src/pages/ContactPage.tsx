import React, { useState } from 'react';
import { CheckCircle2, Instagram, Mail, MapPin, MessageCircle, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { useCatalog } from '../context/CatalogContext';
import { buildWhatsAppDirectUrl } from '../lib/whatsapp';
import { Reveal } from '../components/Reveal';

export function ContactPage() {
  const { storeSettings } = useCatalog();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('Exotic Fish Stocking');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const igSlug = storeSettings.instagramHandle.replace(/^@/, '') || 'finzo.exotic_world';
  const waDirectUrl = buildWhatsAppDirectUrl(
    storeSettings.whatsappNumber,
    `Hello ${storeSettings.storeName}, I would like to request a consultation about ${topic}.`
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
      <Reveal className="max-w-3xl space-y-3 mb-12">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-cyan-300">
          Private Aquatic Concierge
        </p>
        <h1 className="font-display text-4xl sm:text-6xl font-semibold text-white">
          Connect With {storeSettings.storeName}
        </h1>
        <p className="text-slate-300/85 text-base leading-relaxed">
          Reach us directly on Instagram or WhatsApp for live specimen videos, custom rimless aquarium quotes, and species compatibility consultations.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Direct Channels Left */}
        <Reveal variant="slide-right" className="lg:col-span-5 space-y-5">
          <a
            href={waDirectUrl}
            target="_blank"
            rel="noreferrer"
            className="glass-panel glass-panel-hover rounded-2xl p-6 flex items-start gap-4 block group"
          >
            <div className="p-3 rounded-xl bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 shrink-0 transition-transform duration-200 group-hover:scale-105">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white font-sans group-hover:text-cyan-200 transition-colors">
                WhatsApp Direct Line ({storeSettings.whatsappNumber})
              </h2>
              <p className="text-sm text-slate-300/85">
                Instant video previews of quarantined fish and rapid custom tank setup assistance.
              </p>
              <span className="text-xs font-medium text-cyan-300 inline-block pt-1">
                Start WhatsApp Chat →
              </span>
            </div>
          </a>

          <a
            href={`https://instagram.com/${igSlug}`}
            target="_blank"
            rel="noreferrer"
            className="glass-panel glass-panel-hover rounded-2xl p-6 flex items-start gap-4 block group"
          >
            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-300/25 text-amber-300 shrink-0 transition-transform duration-200 group-hover:scale-105">
              <Instagram className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white font-sans group-hover:text-amber-200 transition-colors">
                Instagram · {storeSettings.instagramHandle}
              </h2>
              <p className="text-sm text-slate-300/85">
                Daily specimen reels, aquascape timelapses, and collector tank features.
              </p>
              <span className="text-xs font-medium text-amber-200 inline-block pt-1">
                Follow {storeSettings.instagramHandle} →
              </span>
            </div>
          </a>

          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Mail className="w-4 h-4 text-cyan-300 shrink-0" />
              <span>{storeSettings.contactEmail}</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-slate-300">
              <MapPin className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
              <span>{storeSettings.businessAddress}</span>
            </div>
          </div>
        </Reveal>

        {/* Concierge Inquiry Form Right */}
        <Reveal variant="slide-left" delay={0.08} className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-10">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="py-10 text-center space-y-4"
            >
              <CheckCircle2 className="w-12 h-12 text-cyan-300 mx-auto" />
              <h2 className="font-display text-3xl font-semibold text-white">
                Consultation Brief Ready
              </h2>
              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Thank you, {name}. Send this brief directly to our specialist aquarists on WhatsApp for an immediate response.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <a
                  href={buildWhatsAppDirectUrl(
                    storeSettings.whatsappNumber,
                    `FINZO CONSULTATION BRIEF\nName: ${name}\nEmail: ${email}\nTopic: ${topic}\nDetails: ${message}`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] text-xs font-semibold inline-flex items-center gap-2 btn-tactile"
                >
                  <MessageCircle className="w-4 h-4" />
                  Send via WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setName('');
                    setEmail('');
                    setMessage('');
                  }}
                  className="px-5 py-3 rounded-xl border border-white/15 text-white text-xs font-semibold cursor-pointer btn-tactile"
                >
                  Reset Form
                </button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <h2 className="font-display text-3xl font-semibold text-white">
                  Request a Private Consultation
                </h2>
                <p className="text-xs text-slate-400">
                  Compose your aquarium inquiry and connect directly with our specialists.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-slate-300">Your Name</span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aarav Krishnan"
                    className="w-full px-4 py-3 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-slate-300">Email Address</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="collector@domain.com"
                    className="w-full px-4 py-3 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-300">Inquiry Focus</span>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-400 cursor-pointer transition-colors"
                >
                  <option>Exotic Fish Stocking</option>
                  <option>OptiClear Rimless Aquarium System</option>
                  <option>Custom Architectural Installation</option>
                  <option>Water Chemistry &amp; Care Advice</option>
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-300">Tell Us About Your Tank</span>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share tank volume, dimensions, or specific species you are looking for..."
                  className="w-full px-4 py-3 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </label>

              <motion.button
                type="submit"
                whileHover={{ y: -1.5 }}
                whileTap={{ scale: 0.97 }}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Prepare Consultation Brief
              </motion.button>
            </form>
          )}
        </Reveal>
      </div>
    </div>
  );
}
