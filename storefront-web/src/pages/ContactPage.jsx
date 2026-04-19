import { useState } from 'react';

export default function ContactPage() {
    const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
    const [submitted, setSubmitted] = useState(false);

    const handleField = (field) => (e) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        /* In a real app this would POST to a backend endpoint or email service.
           For now we just show a success message. */
        setSubmitted(true);
    };

    return (
        <div className="contact-page">
            <div className="page-header fade-in-up">
                <h1>Contact Us</h1>
                <p>We'd love to hear from you</p>
            </div>

            <div className="contact-layout">
                {/* Contact info */}
                <div className="contact-info fade-in-up">
                    <div className="contact-info-card">
                        <span className="contact-info-icon">📍</span>
                        <h3>Visit Us</h3>
                        <p>ShoeStore HQ<br />Istanbul, Turkey</p>
                    </div>
                    <div className="contact-info-card">
                        <span className="contact-info-icon">📧</span>
                        <h3>Email</h3>
                        <p>info@shoestore.com<br />support@shoestore.com</p>
                    </div>
                    <div className="contact-info-card">
                        <span className="contact-info-icon">📞</span>
                        <h3>Phone</h3>
                        <p>+90 (212) 555 0123<br />Mon–Sat, 9am–6pm</p>
                    </div>
                    <div className="contact-info-card">
                        <span className="contact-info-icon">💬</span>
                        <h3>Social</h3>
                        <p>@shoestore on Instagram<br />ShoeStore on Facebook</p>
                    </div>
                </div>

                {/* Contact form */}
                <div className="contact-form-card fade-in-up" style={{ animationDelay: '0.1s' }}>
                    {submitted ? (
                        <div className="contact-success">
                            <span style={{ fontSize: '2.5rem' }}>✅</span>
                            <h2>Message sent!</h2>
                            <p>Thank you for reaching out. We'll get back to you as soon as possible.</p>
                            <button className="store-button outline" onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }); }}>
                                Send another message
                            </button>
                        </div>
                    ) : (
                        <>
                            <h2>Send us a message</h2>
                            <form onSubmit={handleSubmit} className="contact-form">
                                <div className="form-row">
                                    <label>
                                        Your name
                                        <input value={form.name} onChange={handleField('name')} required placeholder="John Doe" />
                                    </label>
                                    <label>
                                        Email address
                                        <input type="email" value={form.email} onChange={handleField('email')} required placeholder="john@example.com" />
                                    </label>
                                </div>
                                <label>
                                    Subject
                                    <input value={form.subject} onChange={handleField('subject')} required placeholder="Order inquiry, product question…" />
                                </label>
                                <label>
                                    Message
                                    <textarea
                                        value={form.message}
                                        onChange={handleField('message')}
                                        required
                                        rows={5}
                                        placeholder="Tell us how we can help…"
                                    />
                                </label>
                                <button type="submit" className="store-button" style={{ alignSelf: 'flex-start' }}>
                                    Send message
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
